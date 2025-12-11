// Seed script for Supabase ecommerce demo
// Run with: node supabase/seed/seed_data.js
// Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL');
  console.error('  SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const cosmeticsProducts = [
  {
    sku: 'SOYL-001',
    name: 'Hydrating Face Serum',
    slug: 'hydrating-face-serum',
    description: 'A lightweight, fast-absorbing serum with hyaluronic acid and vitamin C for deep hydration and brightening.',
    price_cents: 1299,
    attributes: {
      ingredients: ['Hyaluronic Acid', 'Vitamin C', 'Aloe Vera', 'Glycerin'],
      skin_type: 'All',
      volume: '30ml',
    },
  },
  {
    sku: 'SOYL-002',
    name: 'Gentle Cleansing Foam',
    slug: 'gentle-cleansing-foam',
    description: 'A pH-balanced, sulfate-free cleanser that removes impurities without stripping natural oils.',
    price_cents: 599,
    attributes: {
      ingredients: ['Glycerin', 'Chamomile Extract', 'Aloe Vera'],
      skin_type: 'Sensitive',
      volume: '150ml',
    },
  },
  {
    sku: 'SOYL-003',
    name: 'Anti-Aging Night Cream',
    slug: 'anti-aging-night-cream',
    description: 'Rich, nourishing cream with retinol and peptides to reduce fine lines and improve skin texture overnight.',
    price_cents: 1999,
    attributes: {
      ingredients: ['Retinol', 'Peptides', 'Niacinamide', 'Shea Butter'],
      skin_type: 'Mature',
      volume: '50ml',
    },
  },
  {
    sku: 'SOYL-004',
    name: 'Vitamin C Brightening Mask',
    slug: 'vitamin-c-brightening-mask',
    description: 'Weekly treatment mask with vitamin C and fruit enzymes to brighten and even skin tone.',
    price_cents: 899,
    attributes: {
      ingredients: ['Vitamin C', 'Papaya Enzyme', 'Honey', 'Clay'],
      skin_type: 'All',
      volume: '100ml',
    },
  },
  {
    sku: 'SOYL-005',
    name: 'SPF 50 Sunscreen Lotion',
    slug: 'spf-50-sunscreen-lotion',
    description: 'Broad-spectrum UVA/UVB protection with zinc oxide. Non-greasy, suitable for daily use.',
    price_cents: 799,
    attributes: {
      ingredients: ['Zinc Oxide', 'Titanium Dioxide', 'Aloe Vera'],
      skin_type: 'All',
      volume: '100ml',
      spf: 50,
    },
  },
  {
    sku: 'SOYL-006',
    name: 'Exfoliating Toner',
    slug: 'exfoliating-toner',
    description: 'Gentle AHA/BHA toner to unclog pores and smooth skin texture. Use 2-3 times per week.',
    price_cents: 699,
    attributes: {
      ingredients: ['Glycolic Acid', 'Salicylic Acid', 'Witch Hazel', 'Rose Water'],
      skin_type: 'Oily, Combination',
      volume: '200ml',
    },
  },
  {
    sku: 'SOYL-007',
    name: 'Moisturizing Body Lotion',
    slug: 'moisturizing-body-lotion',
    description: 'Intensive hydration for dry skin with shea butter and coconut oil. Absorbs quickly without residue.',
    price_cents: 499,
    attributes: {
      ingredients: ['Shea Butter', 'Coconut Oil', 'Glycerin', 'Vitamin E'],
      skin_type: 'All',
      volume: '400ml',
    },
  },
  {
    sku: 'SOYL-008',
    name: 'Eye Cream with Caffeine',
    slug: 'eye-cream-caffeine',
    description: 'Targeted treatment for dark circles and puffiness. Contains caffeine and peptides.',
    price_cents: 1099,
    attributes: {
      ingredients: ['Caffeine', 'Peptides', 'Hyaluronic Acid', 'Vitamin K'],
      skin_type: 'All',
      volume: '15ml',
    },
  },
  {
    sku: 'SOYL-009',
    name: 'Clay Detox Mask',
    slug: 'clay-detox-mask',
    description: 'Deep cleansing mask with bentonite clay and charcoal to draw out impurities and minimize pores.',
    price_cents: 799,
    attributes: {
      ingredients: ['Bentonite Clay', 'Activated Charcoal', 'Tea Tree Oil', 'Menthol'],
      skin_type: 'Oily, Combination',
      volume: '100ml',
    },
  },
  {
    sku: 'SOYL-010',
    name: 'Lip Balm Set (3 Pack)',
    slug: 'lip-balm-set',
    description: 'Nourishing lip balms in three flavors: vanilla, mint, and berry. Made with natural beeswax.',
    price_cents: 399,
    attributes: {
      ingredients: ['Beeswax', 'Coconut Oil', 'Shea Butter', 'Vitamin E'],
      skin_type: 'All',
      volume: '3 x 4g',
    },
  },
];

async function seedProducts() {
  console.log('Seeding products...');
  
  for (const product of cosmeticsProducts) {
    const { data, error } = await supabase
      .from('products')
      .upsert(product, { onConflict: 'sku' })
      .select()
      .single();

    if (error) {
      console.error(`Error seeding product ${product.sku}:`, error);
      continue;
    }

    console.log(`✓ Created product: ${product.name} (${product.sku})`);

    // Create inventory entry
    const qty = Math.floor(Math.random() * 180) + 20; // 20-200
    await supabase
      .from('inventory')
      .upsert(
        {
          product_id: data.id,
          qty,
          reserved: 0,
        },
        { onConflict: 'product_id' }
      );

    // Create placeholder image
    await supabase.from('product_images').upsert({
      product_id: data.id,
      url: `https://via.placeholder.com/600x600?text=${encodeURIComponent(product.name)}`,
      alt: product.name,
      position: 0,
    }, { onConflict: 'id' });

    console.log(`  → Inventory: ${qty} units`);
  }
}

async function seedAdmin() {
  console.log('\nCreating admin user...');
  
  const adminEmail = 'admin@soyl.test';
  const adminPassword = 'Admin@123!'; // In production, use a secure random password
  
  // Check if admin already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingAdmin = existingUsers?.users?.find(u => u.email === adminEmail);

  if (existingAdmin) {
    console.log(`✓ Admin user already exists: ${adminEmail}`);
    
    // Ensure profile exists and is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', existingAdmin.id)
      .single();

    if (!profile) {
      await supabase.from('profiles').upsert({
        id: existingAdmin.id,
        email: adminEmail,
        full_name: 'Admin User',
        role: 'admin',
      });
    } else if (profile.role !== 'admin') {
      await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', existingAdmin.id);
    }

    console.log(`  Password: ${adminPassword}`);
    return;
  }

  // Create new admin user
  const { data: newUser, error } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
  });

  if (error) {
    console.error('Error creating admin user:', error);
    return;
  }

  // Create profile with admin role
  await supabase.from('profiles').upsert({
    id: newUser.user.id,
    email: adminEmail,
    full_name: 'Admin User',
    role: 'admin',
  });

  console.log(`✓ Created admin user: ${adminEmail}`);
  console.log(`  Password: ${adminPassword}`);
  console.log(`  ⚠️  IMPORTANT: Change this password after first login!`);
}

async function seedCoupons() {
  console.log('\nSeeding sample coupons...');
  
  const coupons = [
    {
      code: 'WELCOME10',
      description: 'Welcome discount for new customers',
      discount_type: 'PERCENT',
      discount_pct: 10,
      active: true,
      usage_limit: 100,
    },
    {
      code: 'SAVE50',
      description: 'Save 50 rupees on orders over 500',
      discount_type: 'FIXED',
      discount_cents: 5000,
      active: true,
      usage_limit: 50,
    },
  ];

  for (const coupon of coupons) {
    const { error } = await supabase
      .from('coupons')
      .upsert(coupon, { onConflict: 'code' });

    if (error) {
      console.error(`Error seeding coupon ${coupon.code}:`, error);
    } else {
      console.log(`✓ Created coupon: ${coupon.code}`);
    }
  }
}

async function main() {
  console.log('Starting seed process...\n');
  
  try {
    await seedProducts();
    await seedAdmin();
    await seedCoupons();
    
    console.log('\n✓ Seed process completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Log in to admin panel at /admin/login');
    console.log('2. Use the credentials printed above');
    console.log('3. Upload product images via admin panel');
    console.log('4. Run simulate_traffic.js to generate analytics data');
  } catch (error) {
    console.error('\n✗ Seed process failed:', error);
    process.exit(1);
  }
}

main();

