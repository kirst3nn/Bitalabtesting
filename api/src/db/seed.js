import { query } from './pool.js';

export async function seedDatabase() {
  try {
    // Clear existing data
    await query('DELETE FROM menu_items');

    // Insert sample menu items
    const menuItems = [
      {
        name: 'Chicken Biryani',
        description: 'Fragrant basmati rice with spiced chicken',
        price: 350,
        category: 'Rice',
        imageUrl: '/images/biryani.jpg',
      },
      {
        name: 'Beef Samosa',
        description: 'Crispy fried pastry with spiced beef filling',
        price: 50,
        category: 'Appetizers',
        imageUrl: '/images/samosa.jpg',
      },
      {
        name: 'Naan Bread',
        description: 'Soft Indian bread baked in tandoor',
        price: 80,
        category: 'Bread',
        imageUrl: '/images/naan.jpg',
      },
      {
        name: 'Grilled Tilapia',
        description: 'Fresh tilapia fish grilled with lemon and herbs',
        price: 450,
        category: 'Main Course',
        imageUrl: '/images/tilapia.jpg',
      },
      {
        name: 'Ugali & Sukuma Wiki',
        description: 'Traditional maize meal with sautéed leafy greens',
        price: 200,
        category: 'Main Course',
        imageUrl: '/images/ugali.jpg',
      },
      {
        name: 'Beef Stew & Rice',
        description: 'Tender beef in rich tomato gravy with white rice',
        price: 300,
        category: 'Main Course',
        imageUrl: '/images/beefstew.jpg',
      },
      {
        name: 'Chapati',
        description: 'Flaky Indian flatbread, freshly made',
        price: 40,
        category: 'Bread',
        imageUrl: '/images/chapati.jpg',
      },
      {
        name: 'Nyama Choma (Grilled Meat)',
        description: 'Tender grilled meat served with ugali and salad',
        price: 400,
        category: 'Main Course',
        imageUrl: '/images/nyama.jpg',
      },
      {
        name: 'Mango Juice',
        description: 'Fresh pressed mango juice',
        price: 100,
        category: 'Beverages',
        imageUrl: '/images/mango.jpg',
      },
      {
        name: 'Chocolate Cake',
        description: 'Rich and moist chocolate cake slice',
        price: 120,
        category: 'Dessert',
        imageUrl: '/images/cake.jpg',
      },
    ];

    for (const item of menuItems) {
      await query(
        `INSERT INTO menu_items (name, description, price_kes, category, image_url, available)
         VALUES ($1, $2, $3, $4, $5, true)`,
        [item.name, item.description, item.price, item.category, item.imageUrl]
      );
    }

    console.log(`✅ Seeded ${menuItems.length} menu items`);
  } catch (error) {
    console.error('Failed to seed database:', error);
    throw error;
  }
}

// Run seed if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase().then(() => process.exit(0)).catch(() => process.exit(1));
}
