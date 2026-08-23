const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../models/User');
const Settings = require('../models/Settings');
const Transaction = require('../models/Transaction');
const OfferwallConversion = require('../models/OfferwallConversion');
const asyncHandler = require('../middleware/async');
const {
    creditEarning,
    migrateWalletSplits,
    deductOfferwallCredit,
} = require('../utils/walletLedger');

const OPTIONAL_CALLBACK_TYPES = new Set(['installation', 'optional', 'iap', 'iaa']);

function ok(res) {
    return res.status(200).type('text/plain').send('OK');
}

function clientIp(req) {
    return String(req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim();
}

function canonicalQueryString(query) {
    const keys = Object.keys(query || {}).sort();
    return keys
        .map((key) => `${key}=${query[key] == null ? '' : String(query[key])}`)
        .join('&');
}

function verifyAyetHmac(req) {
    const secret = String(process.env.AYET_API_KEY || '').trim();
    if (!secret) {
        if (process.env.NODE_ENV === 'production') {
            return { ok: false, reason: 'missing_api_key' };
        }
        console.warn('[OFFERWALL] AYET_API_KEY empty — skipping HMAC in non-production');
        return { ok: true, skipped: true };
    }

    const header = String(req.headers['x-ayetstudios-security-hash'] || '').trim().toLowerCase();
    if (!header) {
        return { ok: false, reason: 'missing_hash_header' };
    }

    const payload = canonicalQueryString(req.query);
    const digest = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const a = Buffer.from(digest, 'utf8');
    const b = Buffer.from(header, 'utf8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return { ok: false, reason: 'hash_mismatch' };
    }
    return { ok: true };
}

function originalTxnId(raw) {
    const id = String(raw || '').trim();
    if (!id) return '';
    return id.replace(/^r-/i, '');
}

function isChargebackCallback(query) {
    const type = String(query.callback_type || '').toLowerCase();
    const flag = String(query.is_chargeback || '0');
    return type === 'chargeback' || flag === '1' || String(query.transaction_id || '').toLowerCase().startsWith('r-');
}

function isOptionalCallback(query) {
    const type = String(query.callback_type || '').toLowerCase();
    return OPTIONAL_CALLBACK_TYPES.has(type);
}

function parseSharePercent(settings) {
    const pct = Number(settings?.offerwallUserSharePercent);
    if (!Number.isFinite(pct)) return 100;
    return Math.min(100, Math.max(0, pct));
}

async function applyChargeback(original, query, req) {
    const user = await User.findById(original.user);
    if (!user) {
        original.status = 'reversed';
        original.isChargeback = true;
        await original.save();
        return;
    }

    migrateWalletSplits(user);
    const amount = Number(original.creditedInr) || 0;
    const deducted = deductOfferwallCredit(user, amount);
    user.notifications = user.notifications || [];
    user.notifications.push({
        title: 'Offer reversed',
        message: `An offer reward of ₹${amount.toFixed(2)} was reversed by the partner.`,
        type: 'warning',
        isRead: false,
    });
    await user.save({ validateBeforeSave: false });

    if (deducted > 0) {
        await Transaction.create({
            user: user._id,
            type: 'debit',
            currency: 'INR',
            amount: deducted,
            source: `Offerwall chargeback: ${original.offerName || original.txnId}`,
            status: 'Success',
        }).catch(() => {});
    }

    original.status = 'reversed';
    original.isChargeback = true;
    original.rawQuery = { ...(original.rawQuery || {}), chargeback: query };
    original.ip = clientIp(req);
    await original.save();

    try {
        const { sendNotificationToUser } = require('./fcmController');
        await sendNotificationToUser(user._id, {
            title: 'Offer reversed',
            body: `₹${amount.toFixed(2)} was removed after a partner chargeback.`,
            data: { type: 'offerwall', link: '/user/wallet' },
        });
    } catch (err) {
        console.error('[OFFERWALL] Chargeback push failed:', err.message);
    }
}

// @desc    AyeT S2S conversion callback
// @route   GET /api/public/offerwall/ayet
// @access  Public (AyeT servers)
exports.ayetCallback = async (req, res) => {
    try {
        const query = req.query || {};
        const hmac = verifyAyetHmac(req);
        if (!hmac.ok) {
            console.warn('[OFFERWALL] HMAC rejected:', hmac.reason);
            return ok(res);
        }

        const rawTxn = String(query.transaction_id || query.txn_id || '').trim();
        const txnId = originalTxnId(rawTxn);
        const uid = String(query.uid || query.external_identifier || query.externalIdentifier || '').trim();

        if (isOptionalCallback(query)) {
            console.log('[OFFERWALL] Ignoring optional callback type:', query.callback_type, txnId);
            return ok(res);
        }

        if (!txnId) {
            console.warn('[OFFERWALL] Missing transaction_id');
            return ok(res);
        }

        if (isChargebackCallback(query)) {
            const original = await OfferwallConversion.findOne({ provider: 'ayet', txnId });
            if (!original) {
                console.warn('[OFFERWALL] Chargeback with no original conversion:', txnId);
                return ok(res);
            }
            if (original.status === 'reversed') {
                return ok(res);
            }
            await applyChargeback(original, query, req);
            console.log('[OFFERWALL] Chargeback applied:', txnId);
            return ok(res);
        }

        if (!mongoose.Types.ObjectId.isValid(uid)) {
            console.warn('[OFFERWALL] Invalid uid:', uid);
            return ok(res);
        }

        const user = await User.findById(uid);
        if (!user) {
            console.warn('[OFFERWALL] Unknown user:', uid);
            return ok(res);
        }

        const existing = await OfferwallConversion.findOne({ provider: 'ayet', txnId });
        if (existing) {
            return ok(res);
        }

        const currencyAmount = Number(query.currency_amount);
        const settings = (await Settings.findOne().select('offerwallUserSharePercent')) || {};
        const share = parseSharePercent(settings);
        const creditedInr = Math.round((Number.isFinite(currencyAmount) ? currencyAmount : 0) * share) / 100;
        const offerName = String(query.offer_name || 'Offer').slice(0, 120);

        if (creditedInr <= 0) {
            await OfferwallConversion.create({
                provider: 'ayet',
                user: user._id,
                txnId,
                offerId: String(query.offer_id || ''),
                offerName,
                adslotId: String(query.adslot_id || ''),
                payoutUsd: Number(query.payout_usd) || 0,
                currencyAmount: Number.isFinite(currencyAmount) ? currencyAmount : 0,
                creditedInr: 0,
                status: 'ignored',
                isChargeback: false,
                rawQuery: query,
                ip: clientIp(req),
            }).catch((err) => {
                if (err.code !== 11000) console.error('[OFFERWALL] Ignore insert failed:', err.message);
            });
            return ok(res);
        }

        try {
            await OfferwallConversion.create({
                provider: 'ayet',
                user: user._id,
                txnId,
                offerId: String(query.offer_id || ''),
                offerName,
                adslotId: String(query.adslot_id || ''),
                payoutUsd: Number(query.payout_usd) || 0,
                currencyAmount: Number.isFinite(currencyAmount) ? currencyAmount : 0,
                creditedInr,
                status: 'credited',
                isChargeback: false,
                rawQuery: query,
                ip: clientIp(req),
            });
        } catch (err) {
            if (err.code === 11000) return ok(res);
            throw err;
        }

        try {
            await creditEarning(user, creditedInr, {
                source: `Offerwall: ${offerName}`,
                createTx: true,
            });
            user.notifications = user.notifications || [];
            user.notifications.push({
                title: 'Offer completed',
                message: `₹${creditedInr.toFixed(2)} added to your wallet for ${offerName}.`,
                type: 'success',
                isRead: false,
            });
            await user.save({ validateBeforeSave: false });
        } catch (creditErr) {
            await OfferwallConversion.deleteOne({ provider: 'ayet', txnId }).catch(() => {});
            throw creditErr;
        }

        try {
            const { sendNotificationToUser } = require('./fcmController');
            await sendNotificationToUser(user._id, {
                title: 'Offer completed',
                body: `₹${creditedInr.toFixed(2)} is in your wallet.`,
                data: { type: 'offerwall', link: '/user/wallet' },
            });
        } catch (err) {
            console.error('[OFFERWALL] Credit push failed:', err.message);
        }

        console.log(`[OFFERWALL] Credited ₹${creditedInr} to ${user._id} txn ${txnId}`);
        return ok(res);
    } catch (err) {
        console.error('[OFFERWALL] Callback error:', err.message);
        return ok(res);
    }
};

// @desc    Authenticated offerwall session URL
// @route   GET /api/user/data/offerwall
// @access  Private
exports.getOfferwallSession = asyncHandler(async (req, res) => {
    const settings = await Settings.findOne().select('offerwallEnabled');
    const adslot = String(process.env.AYET_ADSLOT_ID || '').trim();
    const base = String(process.env.AYET_WALL_BASE || 'https://offerwall.ayet.io/offers').trim();
    const enabled = !!(settings?.offerwallEnabled) && !!adslot;
    const userId = String(req.user._id || req.user.id || '').toLowerCase();

    let wallUrl = '';
    if (enabled && userId.length >= 3) {
        try {
            const url = new URL(base);
            url.searchParams.set('adSlot', adslot);
            url.searchParams.set('externalIdentifier', userId);
            wallUrl = url.toString();
        } catch (err) {
            console.error('[OFFERWALL] Invalid AYET_WALL_BASE:', err.message);
        }
    }

    res.status(200).json({
        success: true,
        data: {
            enabled,
            wallUrl,
        },
    });
});
