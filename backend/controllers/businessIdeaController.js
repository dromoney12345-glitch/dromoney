const BusinessIdea = require('../models/BusinessIdea');
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');

function ideaPrice(idea) {
    return Math.max(0, Number(idea?.price) || 0);
}

/** Idea content is free unless admin marks premium AND sets price > 0. */
function isIdeaFree(idea) {
    if (!idea) return false;
    if (idea.isPremium !== true) return true;
    return ideaPrice(idea) <= 0;
}

/**
 * Free ideas: always open.
 * Premium paid ideas: only if in user.unlockedIdeas (after payment).
 * Support plan / chat must NOT unlock every idea.
 */
function isIdeaUnlockedForUser(idea, user) {
    if (!idea) return false;
    if (isIdeaFree(idea)) return true;
    if (!user) return false;
    const ideaId = idea._id.toString();
    return (user.unlockedIdeas || []).some((id) => id && id.toString() === ideaId);
}

/** One-shot DB migrate: older seeds used isPremium:true + ₹199. */
let freeIdeasMigrated = false;
async function migrateBusinessIdeasToFreeStart() {
    if (freeIdeasMigrated) return;
    try {
        const Settings = require('../models/Settings');
        const FLAG = 'businessIdeasFreeStartMigratedV3';
        const settings = await Settings.findOne().select(`${FLAG} businessIdeasFreeStartMigratedV2`);
        if (settings?.[FLAG]) {
            freeIdeasMigrated = true;
            return;
        }
        // Clear legacy locks (₹199 seeds) and any leftover premium flags from older builds
        await BusinessIdea.updateMany(
            {},
            { $set: { isPremium: false, price: 0 } }
        );
        await Settings.updateOne(
            {},
            { $set: { [FLAG]: true, businessIdeasFreeStartMigratedV2: true, businessIdeasFreeStartMigrated: true } },
            { upsert: true }
        );
        freeIdeasMigrated = true;
        console.log('[BusinessIdeas] Migrated all ideas to free start (V3)');
    } catch (err) {
        console.error('[BusinessIdeas] free-start migrate failed:', err.message);
    }
}

// @desc    Get all business ideas for users
// @route   GET /api/public/business-ideas
// @access  Public (Partial) / Private (User)
exports.getBusinessIdeas = async (req, res, next) => {
    try {
        await migrateBusinessIdeasToFreeStart();
        const ideas = await BusinessIdea.find({ isActive: true }).sort('createdAt');

        let user = null;
        if (req.user) {
            user = await User.findById(req.user.id).select('unlockedIdeas');
        }

        const data = ideas.map(idea => {
            const isUnlocked = isIdeaUnlockedForUser(idea, user);
            const free = isIdeaFree(idea);
            
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
                isPremium: !!idea.isPremium && !free,
                price: free ? 0 : ideaPrice(idea),
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
        await migrateBusinessIdeasToFreeStart();
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
        await migrateBusinessIdeasToFreeStart();
        const idea = await BusinessIdea.findById(req.params.id);
        if (!idea) {
            return next(new ErrorResponse('Idea not found', 404));
        }

        let user = null;
        if (req.user) {
            user = await User.findById(req.user.id).select('unlockedIdeas');
        }
        const isUnlocked = isIdeaUnlockedForUser(idea, user);
        const free = isIdeaFree(idea);

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
            isPremium: !!idea.isPremium && !free,
            price: free ? 0 : ideaPrice(idea),
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
