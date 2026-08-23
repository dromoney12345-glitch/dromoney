const BusinessIdea = require('../models/BusinessIdea');
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');

/** Only this idea's paid unlock (or free/non-premium). Support chat / hub plan must NOT open every idea. */
function isIdeaUnlockedForUser(idea, user) {
    if (!idea) return false;
    if (idea.isPremium === false) return true;
    if (!user) return false;
    const ideaId = idea._id.toString();
    return (user.unlockedIdeas || []).some((id) => id && id.toString() === ideaId);
}

// @desc    Get all business ideas for users
// @route   GET /api/public/business-ideas
// @access  Public (Partial) / Private (User)
exports.getBusinessIdeas = async (req, res, next) => {
    try {
        const ideas = await BusinessIdea.find({ isActive: true }).sort('createdAt');

        let user = null;
        if (req.user) {
            user = await User.findById(req.user.id).select('unlockedIdeas');
        }

        const data = ideas.map(idea => {
            const isUnlocked = isIdeaUnlockedForUser(idea, user);
            
            return {
                _id: idea._id,
                title: idea.title,
                hindiTitle: idea.hindiTitle,
                subtitle: idea.subtitle,
                desc: idea.desc,
                bannerImage: idea.bannerImage,
                potentialEarnings: idea.potentialEarnings,
                badges: idea.badges || [],
                videoUrl: idea.videoUrl, // Public for marketing/info
                meetingLink: isUnlocked ? idea.meetingLink : '',
                ecosystemCards: (idea.ecosystemCards || []).map(card => ({
                    id: card.id,
                    title: card.title,
                    description: isUnlocked ? card.description : ''
                })),
                isPremium: idea.isPremium,
                price: idea.price || 199,
                isLocked: !isUnlocked,
                howItWorks: isUnlocked ? (idea.howItWorks || '') : '',
                investmentDetails: isUnlocked ? (idea.investmentDetails || '') : '',
                profitDetails: isUnlocked ? (idea.profitDetails || '') : ''
            };
        });

        res.status(200).json({
            success: true,
            data
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Unlock a premium business idea
// @route   POST /api/user/business-ideas/unlock
// @access  Private
exports.unlockIdea = async (req, res, next) => {
    try {
        const { ideaId } = req.body;
        const idea = await BusinessIdea.findById(ideaId);

        if (!idea) {
            return next(new ErrorResponse('Idea not found', 404));
        }

        const user = await User.findById(req.user.id);
        
        if (!user.unlockedIdeas) user.unlockedIdeas = [];
        
        if (user.unlockedIdeas.includes(ideaId)) {
            return next(new ErrorResponse('Idea already unlocked', 400));
        }

        return next(new ErrorResponse('Please complete payment to unlock this idea.', 400));
    } catch (err) {
        next(err);
    }
};

// --- ADMIN CONTROLLERS ---

// @desc    Get all business ideas for Admin
// @route   GET /api/admin/business-ideas
// @access  Private/Admin
exports.adminGetBusinessIdeas = async (req, res, next) => {
    try {
        const ideas = await BusinessIdea.find().sort('-createdAt');
        res.status(200).json({
            success: true,
            data: ideas
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Create new business idea
// @route   POST /api/admin/business-ideas
// @access  Private/Admin
exports.createBusinessIdea = async (req, res, next) => {
    try {
        const idea = await BusinessIdea.create(req.body);
        res.status(201).json({
            success: true,
            data: idea
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Update business idea
// @route   PUT /api/admin/business-ideas/:id
// @access  Private/Admin
exports.updateBusinessIdea = async (req, res, next) => {
    try {
        const idea = await BusinessIdea.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        if (!idea) {
            return next(new ErrorResponse('Idea not found', 404));
        }

        res.status(200).json({
            success: true,
            data: idea
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Get single business idea by ID
// @route   GET /api/public/business-ideas/:id
// @access  Public (Partial) / Private (User)
exports.getBusinessIdeaById = async (req, res, next) => {
    try {
        const idea = await BusinessIdea.findById(req.params.id);
        if (!idea) {
            return next(new ErrorResponse('Idea not found', 404));
        }

        let user = null;
        if (req.user) {
            user = await User.findById(req.user.id).select('unlockedIdeas');
        }
        const isUnlocked = isIdeaUnlockedForUser(idea, user);

        const data = {
            _id: idea._id,
            title: idea.title,
            hindiTitle: idea.hindiTitle,
            subtitle: idea.subtitle,
            desc: idea.desc,
            bannerImage: idea.bannerImage,
            potentialEarnings: idea.potentialEarnings,
            badges: idea.badges || [],
            videoUrl: idea.videoUrl,
            meetingLink: isUnlocked ? idea.meetingLink : '',
            ecosystemCards: (idea.ecosystemCards || []).map(card => ({
                id: card.id,
                title: card.title,
                description: isUnlocked ? card.description : ''
            })),
            isPremium: idea.isPremium,
            price: idea.price || 199,
            isLocked: !isUnlocked,
            howItWorks: isUnlocked ? (idea.howItWorks || '') : '',
            investmentDetails: isUnlocked ? (idea.investmentDetails || '') : '',
            profitDetails: isUnlocked ? (idea.profitDetails || '') : ''
        };

        res.status(200).json({
            success: true,
            data
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Delete business idea
// @route   DELETE /api/admin/business-ideas/:id
// @access  Private/Admin
exports.deleteBusinessIdea = async (req, res, next) => {
    try {
        const idea = await BusinessIdea.findById(req.params.id);

        if (!idea) {
            return next(new ErrorResponse('Idea not found', 404));
        }

        await idea.deleteOne();

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (err) {
        next(err);
    }
};
