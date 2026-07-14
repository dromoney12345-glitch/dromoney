const Event = require('../models/Event');
const EventParticipant = require('../models/EventParticipant');
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

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

    // Check Mega Event eligibility
    if (event.isMega && user.coins.balance < 500) {
        return next(new ErrorResponse('You need at least 500 coins to unlock the Mega Event', 400));
    }

    // Check coins for entry fee
    if (user.coins.balance < event.fee) {
        return next(new ErrorResponse('Not enough coins to join', 400));
    }

    // Deduct coins
    user.coins.balance -= event.fee;
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

    res.status(200).json({
        success: true,
        message: 'Result submitted successfully'
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
        const prizeStr = participant.prize || prizeNote || participant.event.prize || '';
        
        let coinsToAdd = 0;
        let cashToAdd = 0;
        
        // Basic parser: "50 Coins", "₹50", "100"
        const numMatch = prizeStr.match(/\d+/);
        const amount = numMatch ? parseInt(numMatch[0]) : 0;
        
        if (amount > 0) {
            if (prizeStr.toLowerCase().includes('coin')) {
                coinsToAdd = amount;
            } else {
                // Default to cash if it's ₹ or unspecified
                cashToAdd = amount;
            }

            const Transaction = require('../models/Transaction');

            if (coinsToAdd > 0) {
                user.coins.balance += coinsToAdd;
                user.coins.total += coinsToAdd;
                await Transaction.create({
                    user: user._id,
                    type: 'credit',
                    currency: 'COIN',
                    amount: coinsToAdd,
                    source: `Event Reward: ${participant.event.title}`
                });
            }
            if (cashToAdd > 0) {
                user.wallet.balance += cashToAdd;
                user.wallet.totalEarned += cashToAdd;
                await Transaction.create({
                    user: user._id,
                    type: 'credit',
                    currency: 'INR',
                    amount: cashToAdd,
                    source: `Event Reward: ${participant.event.title}`
                });
            }
            await user.save();

            // Send Push Notification
            try {
                const { sendNotificationToUser } = require('./fcmController');
                await sendNotificationToUser(user._id, {
                    title: '🎉 You Won!',
                    body: `Congratulations! You won ${prizeStr} in ${participant.event.title}.`,
                    data: { type: 'reward', link: '/user/wallet' }
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
        data: participant
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

    const Settings = require('../models/Settings');
    let settings = await Settings.findOne();
    const coinRate = settings?.coinRate || 0.10;

    const totalCoinsPool = participants.length * event.fee;
    const totalCashPoolFallback = totalCoinsPool * coinRate;
    
    // Admin configured single total pool amount, fallback to coin-based pool conversion
    const totalPool = event.totalCashPoolINR > 0 ? event.totalCashPoolINR : totalCashPoolFallback;

    const prizePool = totalPool * 0.50; // 50% Prize for Top 3 winners
    const adminProfit = totalPool * 0.20; // 20% for Admin
    const cashbackPool = totalPool * 0.30; // 30% for Remaining participants (Cashback)

    // Sort participants by score (descending) and timeTaken (ascending)
    participants.sort((a, b) => {
        if (b.score !== a.score) return (b.score || 0) - (a.score || 0);
        return (a.timeTaken || Infinity) - (b.timeTaken || Infinity);
    });

    const top3 = participants.slice(0, 3);
    const rest = participants.slice(3);

    const Transaction = require('../models/Transaction');
    const { sendNotificationToUser } = require('./fcmController');

    // 1st gets 50%, 2nd gets 30%, 3rd gets 20% of the prize pool
    const prizeSplits = [0.50, 0.30, 0.20];
    
    for (let i = 0; i < top3.length; i++) {
        const p = top3[i];
        const user = p.user;
        if (!user) continue;

        const rewardCash = prizePool * prizeSplits[i];
        
        user.wallet.balance += rewardCash;
        user.wallet.totalEarned += rewardCash;
        await user.save();

        p.prizeStatus = 'Awarded';
        p.prizeNote = `Top ${i + 1} Winner Prize: ₹${rewardCash.toFixed(2)}`;
        await p.save();

        await Transaction.create({
            user: user._id,
            type: 'credit',
            currency: 'INR',
            amount: rewardCash,
            source: `Event Winner (${i + 1} Place): ${event.title}`
        });

        try {
            await sendNotificationToUser(user._id, {
                title: '🏆 You Won the Event!',
                body: `Congratulations! You placed ${i + 1} in ${event.title} and won ₹${rewardCash.toFixed(2)}`,
                data: { type: 'reward', link: '/user/wallet' }
            });
        } catch(e) {}
    }

    // Cashback distribution
    let cashbackPerUser = 0;
    if (rest.length > 0) {
        cashbackPerUser = cashbackPool / rest.length;
        
        for (const p of rest) {
            const user = p.user;
            if (!user) continue;

            user.wallet.balance += cashbackPerUser;
            user.wallet.totalEarned += cashbackPerUser;
            await user.save();

            p.prizeStatus = 'Awarded';
            p.prizeNote = `Participation Cashback: ₹${cashbackPerUser.toFixed(2)}`;
            await p.save();

            await Transaction.create({
                user: user._id,
                type: 'credit',
                currency: 'INR',
                amount: cashbackPerUser,
                source: `Event Cashback: ${event.title}`
            });

            try {
                await sendNotificationToUser(user._id, {
                    title: '🎁 Event Cashback',
                    body: `You received ₹${cashbackPerUser.toFixed(2)} as participation cashback for ${event.title}.`,
                    data: { type: 'reward', link: '/user/wallet' }
                });
            } catch(e) {}
        }
    }

    const AdminProfit = require('../models/AdminProfit');
    await AdminProfit.create({
        event: event._id,
        amount: adminProfit,
        source: `Prize Distribution: ${event.title}`
    });

    event.isApproved = true;
    await event.save();

    res.status(200).json({
        success: true,
        message: 'Prizes and cashback distributed successfully',
        data: {
            totalCashPool,
            adminProfit,
            prizePool,
            cashbackPool
        }
    });
});

