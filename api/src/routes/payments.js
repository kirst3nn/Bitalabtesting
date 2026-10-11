import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import Intasend from 'intasend-node';
import { query, getClient } from '../db/pool.js';
import { asyncHandler } from '../middleware/auth.js';
import { AppError } from '../middleware/errors.js';

const router = express.Router();

// Initialize IntaSend
const intasend = new Intasend({
  publishableKey: process.env.INTASEND_PUBLIC_KEY,
  secretKey: process.env.INTASEND_SECRET_KEY,
});

// POST /api/payments/checkout - Initiate payment
router.post('/checkout', asyncHandler(async (req, res) => {
  const { orderId, paymentMethod } = req.body;

  if (!orderId) {
    throw new AppError('Order ID is required', 400, 'ValidationError');
  }

  if (!['mpesa', 'card'].includes(paymentMethod)) {
    throw new AppError('Payment method must be "mpesa" or "card"', 400, 'ValidationError');
  }

  // Get order details
  const orderResult = await query(
    'SELECT * FROM orders WHERE id = $1',
    [orderId]
  );

  if (orderResult.rows.length === 0) {
    throw new AppError('Order not found', 404);
  }

  const order = orderResult.rows[0];

  if (order.payment_status !== 'pending') {
    throw new AppError('Order has already been paid or is processing', 400, 'InvalidState');
  }

  try {
    const invoiceId = uuidv4();
    const reference = `BITE-${order.id.substring(0, 8).toUpperCase()}`;

    // Create payment record
    const paymentId = uuidv4();
    await query(
      `INSERT INTO payments (id, order_id, intasend_invoice_id, amount_kes, payment_method, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')`,
      [paymentId, orderId, invoiceId, order.total_amount_kes, paymentMethod]
    );

    // Update order with invoice ID
    await query(
      'UPDATE orders SET intasend_invoice_id = $1 WHERE id = $2',
      [invoiceId, orderId]
    );

    let checkoutUrl;

    if (paymentMethod === 'card') {
      // Card payment via IntaSend
      const chargeResponse = await intasend.collection.charge({
        invoice: invoiceId,
        amount: Math.round(order.total_amount_kes * 100), // Convert to cents
        currency: 'KES',
        api_ref: reference,
        phone_number: order.customer_phone,
        email: order.customer_email,
        first_name: order.customer_name.split(' ')[0],
        last_name: order.customer_name.split(' ').slice(1).join(' '),
        callback_url: `${process.env.FRONTEND_ORIGIN}/api/payments/callback?order_id=${orderId}`,
        redirect_url: `${process.env.FRONTEND_ORIGIN}/order/${orderId}?status=processing`,
      });

      if (!chargeResponse || !chargeResponse.checkout_url) {
        throw new Error('Failed to get checkout URL from IntaSend');
      }

      checkoutUrl = chargeResponse.checkout_url;
    } else {
      // M-Pesa STK push
      const stkResponse = await intasend.collection.mpesaStkPush({
        phone_number: order.customer_phone,
        amount: Math.round(order.total_amount_kes),
        invoice: invoiceId,
        api_ref: reference,
        callback_url: `${process.env.FRONTEND_ORIGIN}/api/payments/callback?order_id=${orderId}`,
      });

      if (!stkResponse || !stkResponse.status_code || stkResponse.status_code !== 'success') {
        throw new Error('Failed to initiate M-Pesa STK push');
      }

      checkoutUrl = null; // STK push shows prompt on phone
    }

    res.json({
      paymentId,
      invoiceId,
      checkoutUrl,
      paymentMethod,
      amount: order.total_amount_kes,
      currency: 'KES',
      status: 'initiated',
    });
  } catch (error) {
    console.error('Payment checkout error:', error);
    throw new AppError(error.message || 'Failed to initiate payment', 500);
  }
}));

// GET /api/payments/status/:invoiceId - Check payment status
router.get('/status/:invoiceId', asyncHandler(async (req, res) => {
  const { invoiceId } = req.params;

  try {
    // Check local payment status
    const paymentResult = await query(
      'SELECT * FROM payments WHERE intasend_invoice_id = $1',
      [invoiceId]
    );

    if (paymentResult.rows.length === 0) {
      throw new AppError('Payment not found', 404);
    }

    const payment = paymentResult.rows[0];

    // Query IntaSend for current status
    const statusResponse = await intasend.collection.status({
      invoice: invoiceId,
    });

    let intasendStatus = payment.status;
    if (statusResponse && statusResponse.status) {
      intasendStatus = statusResponse.status.toLowerCase();
    }

    // Update local payment status if changed
    if (intasendStatus !== payment.status) {
      await query(
        'UPDATE payments SET status = $1, updated_at = NOW() WHERE intasend_invoice_id = $2',
        [intasendStatus, invoiceId]
      );

      // If successful, update order
      if (intasendStatus === 'completed') {
        await query(
          'UPDATE orders SET payment_status = $1, status = $2, updated_at = NOW() WHERE id = $3',
          ['paid', 'confirmed', payment.order_id]
        );
      }
    }

    res.json({
      invoiceId,
      status: intasendStatus,
      amount: payment.amount_kes,
      paymentMethod: payment.payment_method,
      updatedAt: payment.updated_at,
    });
  } catch (error) {
    console.error('Payment status error:', error);
    throw new AppError(error.message || 'Failed to check payment status', 500);
  }
}));

// POST /api/payments/webhook - Handle IntaSend webhooks
router.post('/webhook', asyncHandler(async (req, res) => {
  const { body, query: queryParams } = req;

  // Verify webhook (basic implementation; IntaSend webhook docs may require more)
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    console.warn('WEBHOOK_SECRET not configured');
  }

  try {
    const { invoice, status, phone_number, amount } = body;

    if (!invoice || !status) {
      res.status(400).json({ error: 'Missing invoice or status' });
      return;
    }

    const paymentResult = await query(
      'SELECT * FROM payments WHERE intasend_invoice_id = $1',
      [invoice]
    );

    if (paymentResult.rows.length === 0) {
      res.status(404).json({ error: 'Payment not found' });
      return;
    }

    const payment = paymentResult.rows[0];
    const newStatus = status.toLowerCase();

    await query(
      'UPDATE payments SET status = $1, updated_at = NOW() WHERE intasend_invoice_id = $2',
      [newStatus, invoice]
    );

    if (newStatus === 'completed') {
      await query(
        'UPDATE orders SET payment_status = $1, status = $2, updated_at = NOW() WHERE id = $3',
        ['paid', 'confirmed', payment.order_id]
      );

      console.log(`✅ Payment confirmed for order ${payment.order_id}`);
    } else if (newStatus === 'failed' || newStatus === 'cancelled') {
      await query(
        'UPDATE orders SET payment_status = $1, status = $2, updated_at = NOW() WHERE id = $3',
        ['failed', 'cancelled', payment.order_id]
      );

      console.log(`❌ Payment failed for order ${payment.order_id}`);
    }

    res.json({ status: 'ok', invoice });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
}));

export default router;
