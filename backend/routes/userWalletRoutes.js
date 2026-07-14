const express = require('express');
const { getBalance, addCoins, requestWithdrawal, getTransactions } = require('../controllers/walletController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Public Webhook (Must be before protect)
router.post('/payout-webhook', (req, res) => {
    console.log('Payout webhook test received:', req.body);
    res.status(200).send('Payout webhook OK');
});

router.use(protect); // All other wallet routes are protected

router.get('/balance', getBalance);
router.post('/add-coins', addCoins);
router.post('/withdraw', requestWithdrawal);
router.get('/transactions', getTransactions);

module.exports = router;
