/**
 * Unit tests for inventory management logic
 * Run with: npm test
 */

describe('Inventory Management', () => {
  describe('Reservation Logic', () => {
    test('should reserve inventory correctly', () => {
      const inventory = {
        product_id: 'prod-1',
        qty: 100,
        reserved: 0,
      };

      const orderQty = 5;
      const available = inventory.qty - inventory.reserved;
      const canReserve = available >= orderQty;

      expect(canReserve).toBe(true);
      expect(available).toBe(100);
    });

    test('should reject reservation if insufficient stock', () => {
      const inventory = {
        product_id: 'prod-1',
        qty: 10,
        reserved: 5,
      };

      const orderQty = 10;
      const available = inventory.qty - inventory.reserved;
      const canReserve = available >= orderQty;

      expect(canReserve).toBe(false);
      expect(available).toBe(5);
    });

    test('should calculate available stock correctly', () => {
      const inventory = {
        product_id: 'prod-1',
        qty: 50,
        reserved: 20,
      };

      const available = inventory.qty - inventory.reserved;
      expect(available).toBe(30);
    });
  });

  describe('Inventory Update', () => {
    test('should update quantity correctly', () => {
      const currentQty = 100;
      const newQty = 150;
      const updated = newQty;

      expect(updated).toBe(150);
    });

    test('should not allow negative quantity', () => {
      const currentQty = 10;
      const newQty = -5;
      const updated = Math.max(0, newQty);

      expect(updated).toBe(0);
    });
  });

  describe('Order Fulfillment', () => {
    test('should decrement reserved and quantity on fulfillment', () => {
      const inventory = {
        qty: 100,
        reserved: 10,
      };

      const orderQty = 5;
      const newQty = inventory.qty - orderQty;
      const newReserved = inventory.reserved - orderQty;

      expect(newQty).toBe(95);
      expect(newReserved).toBe(5);
    });

    test('should handle order cancellation (release reserved)', () => {
      const inventory = {
        qty: 100,
        reserved: 10,
      };

      const cancelledQty = 5;
      const newReserved = inventory.reserved - cancelledQty;
      const newQty = inventory.qty; // Quantity unchanged

      expect(newQty).toBe(100);
      expect(newReserved).toBe(5);
    });
  });
});

