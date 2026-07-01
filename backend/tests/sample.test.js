const request = require('supertest');
const express = require('express');

// We create a dummy app for the test to verify supertest works
const app = express();
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

describe('Backend Health Check', () => {
  it('should return 200 on /api/health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'ok');
  });
});
