const Chat = require('../models/Chat');
const User = require('../models/User');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get chat history for a user
// @route   GET /api/chat
// @access  Private
exports.getMessages = asyncHandler(async (req, res, next) => {
    const messages = await Chat.find({ user: req.user.id }).sort({ createdAt: 1 });

    res.status(200).json({
        success: true,
        data: messages
    });
});

// @desc    Send a message (User)
// @route   POST /api/chat
// @access  Private
exports.sendMessage = asyncHandler(async (req, res, next) => {
    const { message } = req.body;
    const user = await User.findById(req.user.id);

    const hasActiveSupport = user.supportExpiry && new Date(user.supportExpiry) > new Date();
    if (!hasActiveSupport) {
        return next(new ErrorResponse('Support plan expired. Please renew to continue chatting.', 403));
    }

    // If first time accessing Business Hub, set the date
    if (!user.businessHubFirstAccessedAt) {
        user.businessHubFirstAccessedAt = new Date();
        await user.save();
    }

    const chat = await Chat.create({
        user: req.user.id,
        message,
        sender: 'user',
        userName: user.name
    });

    res.status(201).json({
        success: true,
        data: chat
    });
});

// @desc    Get all users who have chat history (Admin)
// @route   GET /api/chat/admin/users
// @access  Private/Admin
exports.getAdminChatUsers = asyncHandler(async (req, res, next) => {
    const chats = await Chat.aggregate([
        { $sort: { createdAt: -1 } },
        {
            $group: {
                _id: '$user',
                lastMessage: { $first: '$message' },
                lastMessageAt: { $first: '$createdAt' },
                unreadCount: {
                    $sum: { $cond: [{ $and: [{ $eq: ['$sender', 'user'] }, { $eq: ['$isRead', false] }] }, 1, 0] }
                }
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: '_id',
                as: 'userInfo'
            }
        },
        {
            $addFields: {
                userName: { $arrayElemAt: ['$userInfo.name', 0] }
            }
        },
        { $sort: { lastMessageAt: -1 } }
    ]);

    res.status(200).json({
        success: true,
        data: chats
    });
});

// @desc    Get chat history for a specific user (Admin)
// @route   GET /api/chat/admin/:userId
// @access  Private/Admin
exports.getAdminUserMessages = asyncHandler(async (req, res, next) => {
    const messages = await Chat.find({ user: req.params.userId }).sort({ createdAt: 1 });

    // Mark as read
    await Chat.updateMany(
        { user: req.params.userId, sender: 'user', isRead: false },
        { isRead: true }
    );

    res.status(200).json({
        success: true,
        data: messages
    });
});

// @desc    Send a message to a user (Admin)
// @route   POST /api/chat/admin/:userId
// @access  Private/Admin
exports.adminSendMessage = asyncHandler(async (req, res, next) => {
    const { message } = req.body;

    const chat = await Chat.create({
        user: req.params.userId,
        message,
        sender: 'admin'
    });

    res.status(201).json({
        success: true,
        data: chat
    });
});

// @desc    Renew Support Plan
// @route   POST /api/chat/renew
// @access  Private
exports.renewSupport = asyncHandler(async (req, res, next) => {
    return next(new ErrorResponse('Please complete payment to renew support chat.', 400));
});
