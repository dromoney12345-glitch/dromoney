const express = require('express');
const { getBalance, getWithdrawQuote, addEarning, addCoins, requestWithdrawal, getTransactions } = require('../controllers/walletController');
const { protect } = require('../middleware/authMiddleware');
const { walletLimiter } = require('../middleware/rateLimiter');
const idempotency = require('../middleware/idempotency');

const router = express.Router();

// Public Webhook (Must be before protect)
router.post('/payout-webhook', (req, res) => {
    console.log('Payout webhook test received:', req.body);
    res.status(200).send('Payout webhook OK');
});

router.use(protect); // All other wallet routes are protected

router.get('/balance', getBalance);
router.get('/withdraw-quote', getWithdrawQuote);
router.post('/add-earning', walletLimiter, idempotency(), addEarning);
router.post('/add-coins', walletLimiter, idempotency(), addCoins);
router.post('/withdraw', walletLimiter, idempotency(), requestWithdrawal);
router.get('/transactions', getTransactions);

module.exports = router;
