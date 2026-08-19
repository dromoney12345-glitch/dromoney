const mongoose = require('mongoose');
const Event = require('../models/Event');
const EventParticipant = require('../models/EventParticipant');
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const {
    parseMoneyAmount,
    resolveEventCashPool,
    computeEventDistribution,
} = require('../utils/eventPrizes');

async function getSupportPrizeFactor(user, event) {
    if (!event?.isBoosterEnabled || !user?.isSupportBoosterActive) return 1;
    const Booster = mongoose.models.Booster || require('../models/Booster');
    const supportBooster = await Booster.findOne({ type: 'support' });
    if (!supportBooster?.benefits) return 1;
    for (const b of supportBooster.benefits) {
        const match = String(b).match(/(\d+)x/i);
        if (match) return parseInt(match[1], 10);
    }
    return 1;
}

function creditWalletInr(user, amount) {
    if (!user.wallet) user.wallet = { balance: 0, lifetimeEarnings: 0 };
    user.wallet.balance = (user.wallet.balance || 0) + amount;
    user.wallet.lifetimeEarnings = (user.wallet.lifetimeEarnings || 0) + amount;
}

// @desc    Get all events
// @route   GET /api/public/events or /api/admin/events
// @access  Public/Admin
exports.getEvents = asyncHandler(async (req, res, next) => {
    // Admins can see all events (including drafts), public sees non-drafts
    const query = (req.baseUrl && req.baseUrl.includes('admin')) ? {} : { status: { $ne: 'Draft' } };
    const events = await Event.find(query);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate dynamic counts for each event for today
    const eventsWithStats = await Promise.all(events.map(async (event) => {
        const totalParticipants = await EventParticipant.countDocuments({ 
            event: event._id,
            createdAt: { $gte: today }
        });
        const awardedCount = await EventParticipant.countDocuments({ 
            event: event._id, 
            prizeStatus: 'Awarded',
            createdAt: { $gte: today }
        });
        
        return {
            ...event.toObject(),
            participantsCount: totalParticipants,
            awardedCount: awardedCount
        };
    }));

    // If user is logged in, mark which events they've joined today
    let joinedEventIds = [];
    if (req.user) {
        const participations = await EventParticipant.find({ 
            user: req.user.id,
            createdAt: { $gte: today }
        });
        joinedEventIds = participations.map(p => p.event.toString());
    }

    res.status(200).json({
        success: true,
        count: eventsWithStats.length,
        joinedEvents: joinedEventIds,
        data: eventsWithStats
    });
});

// @desc    Join an event
// @route   POST /api/user/data/events/:id/join
// @access  Private
exports.joinEvent = asyncHandler(async (req, res, next) => {
    const event = await Event.findById(req.params.id);
    if (!event) return next(new ErrorResponse('Event not found', 404));

    const user = await User.findById(req.user.id);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already joined today
    const existing = await EventParticipant.findOne({ 
        event: event._id, 
        user: user._id,
        createdAt: { $gte: today }
    });
    
    if (existing) {
        return res.status(200).json({
            success: true,
            message: `Successfully joined ${event.title}`
        });
    }

    // Check wallet balance for entry fee
    const entryFee = event.fee || 0;
    if (entryFee > 0) {
        const userBalance = user.wallet?.balance || 0;
        if (userBalance < entryFee) {
            return next(new ErrorResponse('Insufficient wallet balance to join', 400));
        }
        user.wallet.balance -= entryFee;
        user.wallet.virtualBalance = Math.max(0, (user.wallet.virtualBalance || 0) - entryFee);
    }
    await user.save();

    // Create participant record
    await EventParticipant.create({
        event: event._id,
        user: user._id
    });

    const Transaction = require('../models/Transaction');
    if (event.fee > 0) {
        await Transaction.create({
            user: user._id,
            type: 'debit',
            currency: 'COIN',
            amount: event.fee,
            source: `Joined Event: ${event.title}`,
        });
    }

    res.status(200).json({
        success: true,
        message: `Successfully joined ${event.title}`,
        newCoinBalance: user.coins.balance
    });
});

// @desc    Submit event result
// @route   POST /api/user/data/events/:id/submit
// @access  Private
exports.submitResult = asyncHandler(async (req, res, next) => {
    const { score, result, prize, timeTaken } = req.body;
    
    const participant = await EventParticipant.findOne({ 
        event: req.params.id, 
        user: req.user.id 
    });

    if (!participant) {
        return next(new ErrorResponse('You must join the event first', 400));
    }

    // Update result
    if (score !== undefined) participant.score = score;
    if (result !== undefined) participant.result = result;
    if (prize !== undefined) participant.prize = prize;
    if (timeTaken !== undefined) participant.timeTaken = timeTaken;
    await participant.save();

    // ₹21 Support Booster is single-use per event — consume after this event finishes
    const user = await User.findById(req.user.id);
    let supportConsumed = false;
    if (user && user.isSupportBoosterActive) {
        user.isSupportBoosterActive = false;
        user.supportBoosterExpiry = new Date();
        user.isBoosterActive = !!(user.isTaskBoosterActive);
        await user.save({ validateBeforeSave: false });
        supportConsumed = true;
    }

    res.status(200).json({
        success: true,
        message: 'Result submitted successfully',
        supportBoosterConsumed: supportConsumed
    });
});

// @desc    Get single event
// @route   GET /api/public/events/:id
// @access  Public
exports.getEvent = asyncHandler(async (req, res, next) => {
    const event = await Event.findById(req.params.id);

    if (!event) {
        return next(new ErrorResponse(`Event not found with id of ${req.params.id}`, 404));
    }

    res.status(200).json({
        success: true,
        data: event
    });
});

// @desc    Create new event
// @route   POST /api/admin/events
// @access  Private/Admin
exports.createEvent = asyncHandler(async (req, res, next) => {
    const event = await Event.create(req.body);

    if (event.status === 'Active') {
        try {
            const { sendBroadcastNotification } = require('./fcmController');
            await sendBroadcastNotification({
                title: 'नया चैलेंज लाइव है! 🏆',
                body: 'नया चैलेंज लाइव है! अभी भाग लें और इनाम जीतें।',
                data: {
                    type: 'event',
                    link: '/user/events'
                }
            });
        } catch (pushErr) {
            console.error('Push broadcast failed:', pushErr.message);
        }
    }

    res.status(201).json({
        success: true,
        data: event
    });
});

// @desc    Update event
// @route   PUT /api/admin/events/:id
// @access  Private/Admin
exports.updateEvent = asyncHandler(async (req, res, next) => {
    let event = await Event.findById(req.params.id);

    if (!event) {
        return next(new ErrorResponse(`Event not found with id of ${req.params.id}`, 404));
    }

    const oldStatus = event.status;

    event = await Event.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    if (req.body.status === 'Active' && oldStatus !== 'Active') {
        try {
            const { sendBroadcastNotification } = require('./fcmController');
            await sendBroadcastNotification({
                title: 'नया चैलेंज लाइव है! 🏆',
                body: 'नया चैलेंज लाइव है! अभी भाग लें और इनाम जीतें।',
                data: {
                    type: 'event',
                    link: '/user/events'
                }
            });
        } catch (pushErr) {
            console.error('Push broadcast failed on update:', pushErr.message);
        }
    }

    res.status(200).json({
        success: true,
        data: event
    });
});

// @desc    Delete event
// @route   DELETE /api/admin/events/:id
// @access  Private/Admin
exports.deleteEvent = asyncHandler(async (req, res, next) => {
    const event = await Event.findById(req.params.id);

    if (!event) {
        return next(new ErrorResponse(`Event not found with id of ${req.params.id}`, 404));
    }

    await event.deleteOne();

    res.status(200).json({
        success: true,
        data: {}
    });
});

// @desc    Get all participants for an event
// @route   GET /api/admin/events/:id/participants
// @access  Private/Admin
exports.getEventParticipants = asyncHandler(async (req, res, next) => {
    const participants = await EventParticipant.find({ event: req.params.id })
        .populate('user', 'name email phone')
        .sort('-createdAt');

    res.status(200).json({
        success: true,
        count: participants.length,
        data: participants
    });
});

// @desc    Update participant prize status (Award prize)
// @route   PUT /api/admin/events/participants/:id
// @access  Private/Admin
exports.updateParticipantStatus = asyncHandler(async (req, res, next) => {
    const { prizeStatus, prizeNote } = req.body;

    let participant = await EventParticipant.findById(req.params.id).populate('user event');
    if (!participant) {
        return next(new ErrorResponse('Participant record not found', 404));
    }

    if (prizeStatus === 'Awarded' && participant.prizeStatus !== 'Awarded') {
        const user = participant.user;
        const event = participant.event;
        const prizeStr = (prizeNote || participant.prize || event?.prize || '').toString();

        let cashToAdd = 0;

        cashToAdd = parseMoneyAmount(prizeNote);
        if (cashToAdd <= 0) cashToAdd = parseMoneyAmount(prizeStr);

        if (cashToAdd <= 0 && event) {
            const Settings = require('../models/Settings');
            const settings = await Settings.findOne();
            const count = await EventParticipant.countDocuments({ event: event._id });
            const totalPool = resolveEventCashPool(event, count, 1);
            const dist = computeEventDistribution(totalPool, 1, Math.max(0, count - 1));
            cashToAdd = dist.winnerAmounts[0] || 0;
        }

        if (cashToAdd > 0) {
            const factor = await getSupportPrizeFactor(user, event);
            const Transaction = require('../models/Transaction');

            cashToAdd = Math.round(cashToAdd * factor * 100) / 100;
            creditWalletInr(user, cashToAdd);
            await Transaction.create({
                user: user._id,
                type: 'credit',
                currency: 'INR',
                amount: cashToAdd,
                source: factor > 1
                    ? `Event Reward (Booster ${factor}x): ${event.title}`
                    : `Event Reward: ${event.title}`,
            });
            await user.save();

            try {
                const { sendNotificationToUser } = require('./fcmController');
                await sendNotificationToUser(user._id, {
                    title: '🎉 You Won!',
                    body: `Congratulations! You won ${awardLabel} in ${event.title}.`,
                    data: { type: 'reward', link: '/user/wallet' },
                });
            } catch (e) {
                console.error('Failed to send win notification:', e.message);
            }
        }
    }

    participant.prizeStatus = prizeStatus;
    if (prizeNote) participant.prizeNote = prizeNote;
    await participant.save();

    res.status(200).json({
        success: true,
        data: participant,
    });
});

// @desc    Auto-Approve and Distribute Prizes
// @route   POST /api/admin/events/:id/approve-winners
// @access  Private/Admin
exports.approveWinners = asyncHandler(async (req, res, next) => {
    const event = await Event.findById(req.params.id);
    if (!event) {
        return next(new ErrorResponse(`Event not found`, 404));
    }

    if (event.isApproved) {
        return next(new ErrorResponse('Prizes for this event have already been distributed', 400));
    }

    const participants = await EventParticipant.find({ event: event._id }).populate('user');

    if (participants.length === 0) {
        event.isApproved = true;
        await event.save();
        return res.status(200).json({ success: true, message: 'No participants to reward.' });
    }

    // Sort: higher score, then faster time
    participants.sort((a, b) => {
        if (b.score !== a.score) return (b.score || 0) - (a.score || 0);
        return (a.timeTaken || Infinity) - (b.timeTaken || Infinity);
    });

    const top3 = participants.slice(0, 3);
    const rest = participants.slice(3);

    const totalPool = resolveEventCashPool(event, participants.length, 1);
    const {
        prizePool,
        adminProfit,
        cashbackPool,
        winnerAmounts,
        cashbackPerUser,
    } = computeEventDistribution(totalPool, top3.length, rest.length);

    const Transaction = require('../models/Transaction');
    const { sendNotificationToUser } = require('./fcmController');

    for (let i = 0; i < top3.length; i++) {
        const p = top3[i];
        const user = p.user;
        if (!user) continue;

        let rewardCash = winnerAmounts[i] || 0;
        const factor = await getSupportPrizeFactor(user, event);
        if (factor > 1) rewardCash = Math.round(rewardCash * factor * 100) / 100;

        creditWalletInr(user, rewardCash);
        await user.save();

        p.prizeStatus = 'Awarded';
        p.prizeNote = `Top ${i + 1} Winner Prize: ₹${rewardCash.toFixed(2)}`;
        await p.save();

        await Transaction.create({
            user: user._id,
            type: 'credit',
            currency: 'INR',
            amount: rewardCash,
            source: `Event Winner (${i + 1} Place): ${event.title}`,
        });

        try {
            await sendNotificationToUser(user._id, {
                title: '🏆 You Won the Event!',
                body: `Congratulations! You placed ${i + 1} in ${event.title} and won ₹${rewardCash.toFixed(2)}`,
                data: { type: 'reward', link: '/user/wallet' },
            });
        } catch (e) {}
    }

    if (rest.length > 0 && cashbackPerUser > 0) {
        for (const p of rest) {
            const user = p.user;
            if (!user) continue;

            let finalCashback = cashbackPerUser;
            const factor = await getSupportPrizeFactor(user, event);
            if (factor > 1) finalCashback = Math.round(finalCashback * factor * 100) / 100;

            creditWalletInr(user, finalCashback);
            await user.save();

            p.prizeStatus = 'Awarded';
            p.prizeNote =
                factor > 1
                    ? `Participation Cashback (Booster ${factor}x): ₹${finalCashback.toFixed(2)}`
                    : `Participation Cashback: ₹${finalCashback.toFixed(2)}`;
            await p.save();

            await Transaction.create({
                user: user._id,
                type: 'credit',
                currency: 'INR',
                amount: finalCashback,
                source:
                    factor > 1
                        ? `Event Cashback (Booster ${factor}x): ${event.title}`
                        : `Event Cashback: ${event.title}`,
            });

            try {
                await sendNotificationToUser(user._id, {
                    title: '🎁 Event Cashback',
                    body: `You received ₹${finalCashback.toFixed(2)} as participation cashback for ${event.title}.`,
                    data: { type: 'reward', link: '/user/wallet' },
                });
            } catch (e) {}
        }
    }

    const AdminProfit = require('../models/AdminProfit');
    await AdminProfit.create({
        event: event._id,
        amount: adminProfit,
        source: `Prize Distribution: ${event.title}`,
    });

    event.isApproved = true;
    await event.save();

    res.status(200).json({
        success: true,
        message: 'Prizes and cashback distributed successfully',
        data: {
            totalCashPool: totalPool,
            adminProfit,
            prizePool,
            cashbackPool,
            winnerAmounts,
            cashbackPerUser,
        },
    });
});

