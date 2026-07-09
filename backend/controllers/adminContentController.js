const Task = require('../models/Task');
const Ad = require('../models/Ad');
const BusinessIdea = require('../models/BusinessIdea');
const Promotion = require('../models/Promotion');
const ErrorResponse = require('../utils/errorResponse');

// --- TASKS ---
exports.createTask = async (req, res, next) => {
    try {
        const task = await Task.create(req.body);
        res.status(201).json({ success: true, data: task });
    } catch (err) { next(err); }
};

const defaultTasks = [
    {
        title: 'Visit Website Page',
        description: 'Stay for 15s to earn coins.',
        coinsReward: 1,
        type: 'Web',
        category: 'Other',
        link: 'https://google.com',
        icon: 'Monitor',
        status: 'Active',
        isDaily: true,
        config: { timer: '15' }
    },
    {
        title: 'Watch Video Task',
        description: 'Watch this short video to gain coins.',
        coinsReward: 1,
        type: 'Video',
        category: 'YouTube',
        link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        icon: 'Youtube',
        status: 'Active',
        isDaily: true,
        config: {
            url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            timer: '30'
        }
    },
    {
        title: 'Simple Quiz Task',
        description: 'Answer 1 question correctly.',
        coinsReward: 1,
        type: 'Quiz',
        category: 'Other',
        link: 'https://dromoney.app/quiz',
        icon: 'Lightbulb',
        status: 'Active',
        isDaily: true,
        config: {
            question: 'What is the color of the sky?',
            optA: 'Red',
            optB: 'Blue',
            optC: 'Green',
            optD: 'Yellow',
            answer: 'B'
        }
    },
    {
        title: 'Spin Wheel Task',
        description: 'Try your luck and win coins!',
        coinsReward: 1,
        type: 'Spin',
        category: 'Other',
        link: 'https://dromoney.com/lucky-draw',
        icon: 'Disc',
        status: 'Active',
        isDaily: true
    },
    {
        title: 'Memory Master',
        description: 'Match emoji pairs in a grid.',
        coinsReward: 1,
        type: 'Memory',
        category: 'Other',
        link: 'https://dromoney.com/memory',
        icon: 'Zap',
        status: 'Active',
        isDaily: true
    },
    {
        title: 'Treasure Chest',
        description: 'Pick the right box!',
        coinsReward: 1,
        type: 'Treasure',
        category: 'Other',
        link: 'https://dromoney.com/treasure',
        icon: 'Rocket',
        status: 'Active',
        isDaily: true
    },
    {
        title: 'Speed Tapper',
        description: 'Tap 25 times fast!',
        coinsReward: 1,
        type: 'Tapper',
        category: 'Other',
        link: 'https://dromoney.com/tapper',
        icon: 'Zap',
        status: 'Active',
        isDaily: true
    },
    {
        title: 'Magic Scratch Card',
        description: 'Rub to reveal hidden coins.',
        coinsReward: 1,
        type: 'Scratch',
        category: 'Other',
        link: 'https://dromoney.com/scratch',
        icon: 'Monitor',
        status: 'Active',
        isDaily: true
    },
    {
        title: 'Share Platform Task',
        description: 'Share on WhatsApp / Social.',
        coinsReward: 1,
        type: 'Social',
        category: 'WhatsApp',
        link: 'https://dromoney.com',
        icon: 'MessageCircle',
        status: 'Active',
        isDaily: true
    },
    {
        title: 'Like & Follow Task',
        description: 'Daily Story & Comment: Post a story, add a comment and upload proof.',
        coinsReward: 1,
        type: 'Sponsored',
        category: 'Instagram',
        link: 'https://instagram.com/dromoney',
        icon: 'Camera',
        status: 'Active',
        isDaily: true
    },
    {
        title: 'Watch and Earn Video',
        description: 'Watch the full short video to earn extra coins instantly!',
        coinsReward: 1,
        type: 'Video',
        category: 'YouTube',
        link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        icon: 'Youtube',
        status: 'Active',
        config: {
            url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            timer: '30'
        }
    },
    {
        title: 'Sponsored Task',
        description: 'Download this app daily and upload proof of install/comment.',
        coinsReward: 1,
        type: 'Sponsored',
        category: 'Other',
        link: 'https://whatsapp.com/channel/0029Va9P1725bV8j2g1u4p3u',
        icon: 'Monitor',
        status: 'Active',
        isDaily: true
    }
];

exports.getTasks = async (req, res, next) => {
    try {
        // Check if DB is empty, only seed if empty to avoid slow queries on every GET
        const count = await Task.countDocuments();
        if (count === 0) {
            const bulkOps = defaultTasks.map(dt => ({
                updateOne: {
                    filter: { title: dt.title },
                    update: { $set: { isDaily: true }, $setOnInsert: dt },
                    upsert: true
                }
            }));
            await Task.bulkWrite(bulkOps);
        }
        
        const tasks = await Task.find();

        const topTitles = [
            "Sponsored Task",
            "Watch and Earn Video",
            "Like & Follow Task"
        ];

        const sortedTasks = [...tasks].sort((a, b) => {
            const indexA = topTitles.indexOf(a.title);
            const indexB = topTitles.indexOf(b.title);

            if (indexA !== -1 && indexB !== -1) {
                return indexA - indexB;
            }
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;

            return 0;
        });

        res.status(200).json({ success: true, data: sortedTasks });
    } catch (err) { next(err); }
};

exports.updateTask = async (req, res, next) => {
    try {
        const task = await Task.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });
        if (!task) return next(new ErrorResponse('Task not found', 404));
        res.status(200).json({ success: true, data: task });
    } catch (err) { next(err); }
};

// --- ADS ---
exports.createAd = async (req, res, next) => {
    try {
        const ad = await Ad.create(req.body);
        res.status(201).json({ success: true, data: ad });
    } catch (err) { next(err); }
};

exports.getAds = async (req, res, next) => {
    try {
        const ads = await Ad.find().sort('-createdAt');
        res.status(200).json({ success: true, data: ads });
    } catch (err) { next(err); }
};

exports.updateAd = async (req, res, next) => {
    try {
        const ad = await Ad.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!ad) return next(new ErrorResponse('Ad not found', 404));
        res.status(200).json({ success: true, data: ad });
    } catch (err) { next(err); }
};

// --- BUSINESS IDEAS ---
exports.createBusinessIdea = async (req, res, next) => {
    try {
        const idea = await BusinessIdea.create(req.body);
        res.status(201).json({ success: true, data: idea });
    } catch (err) { next(err); }
};

exports.getBusinessIdeas = async (req, res, next) => {
    try {
        const ideas = await BusinessIdea.find().sort('-createdAt');
        res.status(200).json({ success: true, data: ideas });
    } catch (err) { next(err); }
};

// Generic Delete
exports.deleteContent = async (req, res, next) => {
    try {
        const { type, id } = req.params;
        let model;
        if (type === 'task') model = Task;
        else if (type === 'ad') model = Ad;
        else if (type === 'business') model = BusinessIdea;
        else if (type === 'promotion') model = Promotion;

        if (!model) return next(new ErrorResponse('Invalid content type', 400));
        
        await model.findByIdAndDelete(id);
        res.status(200).json({ success: true, message: 'Deleted successfully' });
    } catch (err) { next(err); }
};
