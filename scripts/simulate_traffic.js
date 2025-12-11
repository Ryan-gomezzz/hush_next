// Simulate traffic and analytics events
// Run with: node scripts/simulate_traffic.js
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

// Generate events for the last N days
const DAYS_BACK = 30;
const EVENTS_PER_DAY = 50;

async function getProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('id, slug')
    .eq('active', true)
    .limit(10);

  if (error) throw error;
  return data || [];
}

async function generateEvents() {
  console.log('Generating simulated traffic events...\n');

  const products = await getProducts();
  if (products.length === 0) {
    console.error('No products found. Run seed_data.js first.');
    process.exit(1);
  }

  const events = [];
  const now = new Date();

  for (let day = 0; day < DAYS_BACK; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() - day);
    date.setHours(Math.floor(Math.random() * 24));
    date.setMinutes(Math.floor(Math.random() * 60));

    // Generate events for this day
    for (let i = 0; i < EVENTS_PER_DAY; i++) {
      const eventTime = new Date(date);
      eventTime.setMinutes(eventTime.getMinutes() + Math.floor(Math.random() * 1440));

      const product = products[Math.floor(Math.random() * products.length)];
      const eventType = getRandomEventType();

      events.push({
        event_type: eventType,
        payload: {
          product_id: product.id,
          product_slug: product.slug,
          timestamp: eventTime.toISOString(),
        },
        created_at: eventTime.toISOString(),
      });
    }
  }

  // Batch insert events
  const batchSize = 100;
  let inserted = 0;

  for (let i = 0; i < events.length; i += batchSize) {
    const batch = events.slice(i, i + batchSize);
    const { error } = await supabase.from('events').insert(batch);

    if (error) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
    } else {
      inserted += batch.length;
      process.stdout.write(`\rInserted ${inserted} / ${events.length} events...`);
    }
  }

  console.log(`\n\n✓ Generated ${inserted} events across ${DAYS_BACK} days`);
  console.log('\nEvent distribution:');
  
  const distribution = {};
  events.forEach(e => {
    distribution[e.event_type] = (distribution[e.event_type] || 0) + 1;
  });
  
  Object.entries(distribution).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });

  console.log('\nNote: Refresh materialized view for conversion metrics:');
  console.log('  REFRESH MATERIALIZED VIEW daily_conversion;');
}

function getRandomEventType() {
  const rand = Math.random();
  if (rand < 0.6) return 'page_view';
  if (rand < 0.8) return 'add_to_cart';
  if (rand < 0.9) return 'checkout_started';
  return 'order_completed';
}

async function main() {
  try {
    await generateEvents();
  } catch (error) {
    console.error('\n✗ Error generating traffic:', error);
    process.exit(1);
  }
}

main();

