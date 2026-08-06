const Payment = require('../models/Payment');
const ErrorResponse = require('./errorResponse');

/**
 * Block duplicate platform-unlock / same-type pending payments.
 */
async function assertNoDuplicatePayment(userId, paymentType, { utrNumber } = {}) {
    const pType = paymentType || 'PLATFORM_UNLOCK';

    if (pType === 'PLATFORM_UNLOCK') {
        const User = require('../models/User');
        const user = await User.findById(userId).select('isPaid name');
        if (user?.isPaid) {
            throw new ErrorResponse('Platform already unlocked. Payment not required.', 400);
        }

        const existingSuccess = await Payment.findOne({
            user: userId,
            paymentType: 'PLATFORM_UNLOCK',
            status: 'Success',
        }).select('_id');
        if (existingSuccess) {
            throw new ErrorResponse('Platform unlock payment already completed.', 400);
        }
    }

    const pending = await Payment.findOne({
        user: userId,
        paymentType: pType,
        status: 'Pending',
    }).sort({ createdAt: -1 });

    if (pending) {
        throw new ErrorResponse(
            'You already have a pending payment for this plan. Please wait for approval.',
            400
        );
    }

    if (utrNumber) {
        const utrTaken = await Payment.findOne({
            utrNumber: String(utrNumber).trim(),
            status: { $in: ['Pending', 'Success'] },
        }).select('_id');
        if (utrTaken) {
            throw new ErrorResponse('This UTR number was already submitted.', 400);
        }
    }
}

/**
 * Create payment once — catches unique-index races and returns a clear 400.
 */
async function createPaymentOnce(payload) {
    try {
        return await Payment.create(payload);
    } catch (err) {
        if (err && err.code === 11000) {
            const key = Object.keys(err.keyPattern || {})[0] || 'payment';
            if (key === 'utrNumber') {
                throw new ErrorResponse('This UTR number was already submitted.', 400);
            }
            if (String(key).includes('razorpay')) {
                throw new ErrorResponse('This payment order already exists.', 400);
            }
            throw new ErrorResponse(
                'A payment for this plan is already recorded. Please wait or contact support.',
                400
            );
        }
        throw err;
    }
}

/** After a successful PLATFORM_UNLOCK, close leftover pending/failed/duplicate success for same user. */
async function closeSiblingPlatformPayments(userId, keepPaymentId) {
    await Payment.updateMany(
        {
            user: userId,
            paymentType: 'PLATFORM_UNLOCK',
            _id: { $ne: keepPaymentId },
            status: { $in: ['Pending', 'Failed', 'Success'] },
        },
        {
            $set: {
                status: 'Failed',
                remarks: 'Superseded by successful unlock payment',
                processedAt: new Date(),
            },
        }
    );
}

/**
 * Revenue-safe total: PLATFORM_UNLOCK counted once per user (newest Success).
 * Other payment types counted normally (each Success is a real purchase).
 */
async function aggregateUniqueRevenue() {
    const rows = await Payment.aggregate([
        { $match: { status: { $in: ['Success', 'success'] } } },
        {
            $addFields: {
                _type: {
                    $ifNull: ['$paymentType', 'PLATFORM_UNLOCK'],
                },
            },
        },
        { $sort: { createdAt: -1 } },
        {
            $group: {
                _id: {
                    type: '$_type',
                    // One platform unlock per user; other types keep every payment id
                    key: {
                        $cond: [
                            { $eq: ['$_type', 'PLATFORM_UNLOCK'] },
                            { $ifNull: ['$user', '$_id'] },
                            '$_id',
                        ],
                    },
                },
                amount: { $first: '$amount' },
                paymentType: { $first: '$_type' },
            },
        },
        {
            $group: {
                _id: '$paymentType',
                total: { $sum: '$amount' },
                count: { $sum: 1 },
            },
        },
    ]);

    let platformSubGross = 0;
    let businessPlanRevenue = 0;
    let boosterRevenue = 0;
    let otherRevenue = 0;
    let successCount = 0;

    rows.forEach((item) => {
        const type = item._id;
        const amount = item.total || 0;
        successCount += item.count || 0;
        if (type === 'PLATFORM_UNLOCK') platformSubGross += amount;
        else if (type === 'BUSINESS_HUB_PLAN') businessPlanRevenue += amount;
        else if (type === 'TASK_BOOSTER' || type === 'SUPPORT_BOOSTER') boosterRevenue += amount;
        else otherRevenue += amount;
    });

    const totalGrossRevenue =
        platformSubGross + businessPlanRevenue + boosterRevenue + otherRevenue;

    return {
        platformSubGross,
        businessPlanRevenue,
        boosterRevenue,
        otherRevenue,
        totalGrossRevenue,
        successCount,
    };
}

/**
 * Collapse existing duplicates so unique indexes can be created safely.
 * Keeps newest Pending per user+type; newest Success PLATFORM_UNLOCK per user.
 */
async function collapseDuplicatePayments() {
    // Pending duplicates: user + paymentType
    const pendingGroups = await Payment.aggregate([
        { $match: { status: 'Pending', user: { $ne: null } } },
        {
            $group: {
                _id: { user: '$user', paymentType: '$paymentType' },
                ids: { $push: '$_id' },
                count: { $sum: 1 },
            },
        },
        { $match: { count: { $gt: 1 } } },
    ]);

    for (const g of pendingGroups) {
        const docs = await Payment.find({ _id: { $in: g.ids } }).sort({ createdAt: -1 });
        const [, ...extras] = docs;
        if (extras.length) {
            await Payment.updateMany(
                { _id: { $in: extras.map((d) => d._id) } },
                {
                    $set: {
                        status: 'Failed',
                        remarks: 'Duplicate pending collapsed — only one entry kept',
                        processedAt: new Date(),
                    },
                }
            );
        }
    }

    // Success PLATFORM_UNLOCK duplicates per user (incl. legacy missing paymentType)
    const successGroups = await Payment.aggregate([
        {
            $match: {
                status: 'Success',
                user: { $ne: null },
                $or: [
                    { paymentType: 'PLATFORM_UNLOCK' },
                    { paymentType: { $exists: false } },
                    { paymentType: null },
                ],
            },
        },
        {
            $group: {
                _id: '$user',
                ids: { $push: '$_id' },
                count: { $sum: 1 },
            },
        },
        { $match: { count: { $gt: 1 } } },
    ]);

    for (const g of successGroups) {
        const docs = await Payment.find({ _id: { $in: g.ids } }).sort({ createdAt: -1 });
        const [, ...extras] = docs;
        if (extras.length) {
            await Payment.updateMany(
                { _id: { $in: extras.map((d) => d._id) } },
                {
                    $set: {
                        status: 'Failed',
                        remarks: 'Duplicate success collapsed — only one unlock kept',
                        processedAt: new Date(),
                    },
                }
            );
        }
    }

    // Blank UTRs / razorpay ids → unset so sparse unique indexes work
    await Payment.updateMany(
        { $or: [{ utrNumber: '' }, { utrNumber: null }] },
        { $unset: { utrNumber: 1 } }
    );
    await Payment.updateMany(
        { $or: [{ razorpayOrderId: '' }, { razorpayOrderId: null }] },
        { $unset: { razorpayOrderId: 1 } }
    );
    await Payment.updateMany(
        { $or: [{ razorpayPaymentId: '' }, { razorpayPaymentId: null }] },
        { $unset: { razorpayPaymentId: 1 } }
    );

    // Duplicate UTR / Razorpay IDs — keep newest, unset key on extras
    for (const field of ['utrNumber', 'razorpayOrderId', 'razorpayPaymentId']) {
        const groups = await Payment.aggregate([
            { $match: { [field]: { $exists: true, $nin: [null, ''] } } },
            {
                $group: {
                    _id: `$${field}`,
                    ids: { $push: '$_id' },
                    count: { $sum: 1 },
                },
            },
            { $match: { count: { $gt: 1 } } },
        ]);

        for (const g of groups) {
            const docs = await Payment.find({ _id: { $in: g.ids } }).sort({ createdAt: -1 });
            const [, ...extras] = docs;
            if (extras.length) {
                await Payment.updateMany(
                    { _id: { $in: extras.map((d) => d._id) } },
                    {
                        $unset: { [field]: 1 },
                        $set: {
                            remarks: `Duplicate ${field} collapsed — only one entry kept`,
                            processedAt: new Date(),
                        },
                    }
                );
            }
        }
    }
}

/**
 * Admin list cleanup:
 * - One PLATFORM_UNLOCK Success per user
 * - Hide Failed/Pending unlock clutter once user already has Success
 *   (abandoned Razorpay retries / auto-collapsed duplicates)
 * - Without Success: keep newest Pending; at most one Failed unlock row
 */
function dedupePaymentsForAdmin(payments) {
    const platformSuccessUser = new Set();
    for (const p of payments) {
        const type = p.paymentType || 'PLATFORM_UNLOCK';
        if (p.status !== 'Success' || type !== 'PLATFORM_UNLOCK') continue;
        const userKey = p.user?._id
            ? String(p.user._id)
            : String(p.user || p.userEmail || p._id);
        platformSuccessUser.add(userKey);
    }

    const seenPending = new Set();
    const seenFailedUnlock = new Set();
    const seenSuccessUnlock = new Set();
    const result = [];

    for (const p of payments) {
        const type = p.paymentType || 'PLATFORM_UNLOCK';
        const userKey = p.user?._id
            ? String(p.user._id)
            : String(p.user || p.userEmail || p._id);

        // Boosters / other types — show as-is
        if (type !== 'PLATFORM_UNLOCK') {
            result.push(p);
            continue;
        }

        if (p.status === 'Success') {
            if (seenSuccessUnlock.has(userKey)) continue;
            seenSuccessUnlock.add(userKey);
            result.push(p);
            continue;
        }

        // Already unlocked → hide leftover Failed/Pending noise
        if (platformSuccessUser.has(userKey)) {
            continue;
        }

        if (p.status === 'Pending') {
            if (seenPending.has(userKey)) continue;
            seenPending.add(userKey);
            result.push(p);
            continue;
        }

        if (p.status === 'Failed') {
            // One failed attempt visible (newest first — list is already sorted desc)
            if (seenFailedUnlock.has(userKey)) continue;
            seenFailedUnlock.add(userKey);
            result.push(p);
        }
    }

    return result;
}

module.exports = {
    assertNoDuplicatePayment,
    createPaymentOnce,
    closeSiblingPlatformPayments,
    collapseDuplicatePayments,
    dedupePaymentsForAdmin,
    aggregateUniqueRevenue,
};
