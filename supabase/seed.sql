-- Canonical Supabase seed entrypoint for Hush Gentle Ecommerce.
-- Mirrors `db/seed.sql` so Supabase dashboard setup can point here.

begin;

insert into public.categories (name, slug, description)
values
  ('Cleansers', 'cleansers', 'Gentle cleansing for everyday calm.'),
  ('Moisturizers', 'moisturizers', 'Soft hydration for sensitive skin.'),
  ('Serums', 'serums', 'Targeted care with a soothing touch.'),
  ('Body Care', 'body-care', 'Nourishing care from neck to toe.')
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    updated_at = now();

insert into public.products (
  category_id, name, slug, description, price_cents, currency, image_url,
  is_active, inventory_count, ingredients, usage
)
select
  c.id,
  p.name,
  p.slug,
  p.description,
  p.price_cents,
  'INR',
  p.image_url,
  true,
  p.inventory_count,
  p.ingredients,
  p.usage
from (
  values
    ('cleansers', 'Hush Gentle Milk Cleanser', 'hush-gentle-milk-cleanser',
      'A creamy, low-foam cleanser designed to leave skin feeling clean, soft, and comfortable.',
      89900, 50,
      'Water, Glycerin, Mild Surfactants, Oat Extract, Panthenol',
      'Massage onto damp skin, rinse with lukewarm water. Use morning and night.',
      null),
    ('moisturizers', 'Hush Gentle Cloud Cream', 'hush-gentle-cloud-cream',
      'Lightweight moisture with a calm finish—ideal for everyday use.',
      109900, 60,
      'Water, Glycerin, Squalane, Ceramide Complex, Allantoin',
      'Apply a small amount to face and neck after cleansing.',
      null),
    ('serums', 'Hush Gentle Barrier Serum', 'hush-gentle-barrier-serum',
      'A simple serum to support a smooth, resilient-feeling skin barrier.',
      129900, 40,
      'Water, Niacinamide, Panthenol, Beta-Glucan, Sodium Hyaluronate',
      'Apply 2-3 drops after cleansing, then moisturize.',
      null),
    ('body-care', 'Hush Gentle Body Lotion', 'hush-gentle-body-lotion',
      'Daily body hydration that absorbs fast and feels comforting.',
      79900, 80,
      'Water, Glycerin, Shea Butter, Oat Extract, Vitamin E',
      'Apply to towel-dried skin after showering for best results.',
      null)
) as p(category_slug, name, slug, description, price_cents, inventory_count, ingredients, usage, image_url)
join public.categories c on c.slug = p.category_slug
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    price_cents = excluded.price_cents,
    currency = excluded.currency,
    image_url = excluded.image_url,
    is_active = excluded.is_active,
    inventory_count = excluded.inventory_count,
    ingredients = excluded.ingredients,
    usage = excluded.usage,
    updated_at = now();

insert into public.testimonials (name, content, rating, is_approved)
values
  ('Aarohi', 'The textures feel calm and simple—my routine finally feels lightweight.', 5, true),
  ('Neel', 'No fuss, just comfortable hydration. Great under sunscreen.', 5, true),
  ('Sana', 'Cleanses without that tight feeling. Really enjoying it.', 4, true)
on conflict do nothing;

insert into public.amazon_reviews (asin, author, rating, title, content, review_date)
values
  ('B0HUSHGENT1', 'Verified Buyer', 5, 'Soft finish', 'Feels gentle and leaves skin comfortable.', current_date - interval '10 days'),
  ('B0HUSHGENT1', 'Verified Buyer', 4, 'Nice cleanser', 'Foams lightly and rinses clean.', current_date - interval '20 days'),
  ('B0HUSHGENT2', 'Verified Buyer', 5, 'Great moisturizer', 'Absorbs quickly and looks natural on skin.', current_date - interval '5 days')
on conflict do nothing;

commit;


