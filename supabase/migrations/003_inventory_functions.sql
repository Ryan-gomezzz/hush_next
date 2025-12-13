-- Helper functions for inventory management
-- These functions are used by Next.js API routes for atomic operations

-- Function to increment reserved inventory
CREATE OR REPLACE FUNCTION increment_reserved(
  product_id uuid,
  qty integer
) RETURNS void AS $$
BEGIN
  UPDATE inventory
  SET reserved = reserved + qty,
      updated_at = now()
  WHERE inventory.product_id = increment_reserved.product_id;
END;
$$ LANGUAGE plpgsql;

-- Function to increment coupon usage
CREATE OR REPLACE FUNCTION increment_coupon_uses(
  coupon_id uuid
) RETURNS void AS $$
BEGIN
  UPDATE coupons
  SET uses = uses + 1
  WHERE coupons.id = increment_coupon_uses.coupon_id;
END;
$$ LANGUAGE plpgsql;

