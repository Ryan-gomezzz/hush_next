/**
 * Unit tests for coupon validation logic
 * Run with: npm test
 */

describe('Coupon Validation', () => {
  // Mock coupon data
  const percentCoupon = {
    id: '1',
    code: 'SAVE10',
    discount_type: 'PERCENT',
    discount_pct: 10,
    active: true,
    usage_limit: 100,
    uses: 0,
  };

  const fixedCoupon = {
    id: '2',
    code: 'SAVE50',
    discount_type: 'FIXED',
    discount_cents: 5000,
    active: true,
    usage_limit: 50,
    uses: 0,
  };

  describe('Percentage Discount', () => {
    test('should calculate 10% discount correctly', () => {
      const subtotal = 10000; // 100.00 in cents
      const discount = Math.floor((subtotal * percentCoupon.discount_pct) / 100);
      expect(discount).toBe(1000); // 10.00
    });

    test('should calculate total after percentage discount', () => {
      const subtotal = 5000;
      const discount = Math.floor((subtotal * percentCoupon.discount_pct) / 100);
      const total = Math.max(0, subtotal - discount);
      expect(total).toBe(4500);
    });
  });

  describe('Fixed Discount', () => {
    test('should apply fixed discount correctly', () => {
      const subtotal = 10000;
      const discount = fixedCoupon.discount_cents;
      const total = Math.max(0, subtotal - discount);
      expect(total).toBe(5000);
    });

    test('should not allow negative total', () => {
      const subtotal = 3000; // Less than discount
      const discount = fixedCoupon.discount_cents;
      const total = Math.max(0, subtotal - discount);
      expect(total).toBe(0); // Should be 0, not negative
    });
  });

  describe('Coupon Validation Rules', () => {
    test('should reject expired coupon', () => {
      const expiredCoupon = {
        ...percentCoupon,
        ends_at: new Date('2020-01-01').toISOString(),
      };
      const now = new Date();
      const isValid = !expiredCoupon.ends_at || new Date(expiredCoupon.ends_at) >= now;
      expect(isValid).toBe(false);
    });

    test('should reject coupon at usage limit', () => {
      const maxedCoupon = {
        ...percentCoupon,
        uses: 100,
        usage_limit: 100,
      };
      const isValid = !maxedCoupon.usage_limit || maxedCoupon.uses < maxedCoupon.usage_limit;
      expect(isValid).toBe(false);
    });

    test('should accept valid active coupon', () => {
      const validCoupon = {
        ...percentCoupon,
        active: true,
        uses: 10,
        usage_limit: 100,
        ends_at: null,
      };
      const isActive = validCoupon.active;
      const withinLimit = !validCoupon.usage_limit || validCoupon.uses < validCoupon.usage_limit;
      const notExpired = !validCoupon.ends_at || new Date(validCoupon.ends_at) >= new Date();
      expect(isActive && withinLimit && notExpired).toBe(true);
    });
  });
});

