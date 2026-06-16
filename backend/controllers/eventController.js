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

    // Check coins
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

    event = await Event.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

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

    let participant = await EventParticipant.findById(req.params.id);
    if (!participant) {
        return next(new ErrorResponse('Participant record not found', 404));
    }

    participant.prizeStatus = prizeStatus;
    if (prizeNote) participant.prizeNote = prizeNote;
    await participant.save();

    res.status(200).json({
        success: true,
        data: participant
    });
});
