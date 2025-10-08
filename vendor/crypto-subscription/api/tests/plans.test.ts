import request from 'supertest';
import app from '../src/index';

describe('Plans API', () => {
  describe('GET /api/plans/merchant/:address', () => {
    it('should return plans for a valid merchant address', async () => {
      const merchantAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
      
      const response = await request(app)
        .get(`/api/plans/merchant/${merchantAddress}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return 400 for invalid address', async () => {
      const invalidAddress = 'invalid-address';
      
      const response = await request(app)
        .get(`/api/plans/merchant/${invalidAddress}`)
        .expect(400);
      
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/plans/:id', () => {
    it('should return plan for valid ID', async () => {
      const planId = '1';
      
      const response = await request(app)
        .get(`/api/plans/${planId}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
    });

    it('should return 400 for invalid ID', async () => {
      const invalidId = 'invalid';
      
      const response = await request(app)
        .get(`/api/plans/${invalidId}`)
        .expect(400);
      
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/plans', () => {
    it('should create plan with valid data', async () => {
      const planData = {
        name: 'Test Plan',
        priceInCents: 1000,
        currency: 'USD',
        billingIntervalSeconds: 2592000,
        allowedTokens: ['0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6']
      };
      
      const response = await request(app)
        .post('/api/plans')
        .send(planData)
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('planId');
    });

    it('should return 400 for invalid data', async () => {
      const invalidData = {
        name: '',
        priceInCents: -100,
        currency: '',
        billingIntervalSeconds: 0,
        allowedTokens: []
      };
      
      const response = await request(app)
        .post('/api/plans')
        .send(invalidData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
    });
  });
});
