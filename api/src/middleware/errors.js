export function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    timestamp: new Date().toISOString(),
  });
}

export function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  console.error(`[ERROR] ${status} - ${message}`, err);

  res.status(status).json({
    error: err.type || 'Error',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    timestamp: new Date().toISOString(),
  });
}

export class AppError extends Error {
  constructor(message, status = 500, type = 'Error') {
    super(message);
    this.status = status;
    this.type = type;
  }
}
