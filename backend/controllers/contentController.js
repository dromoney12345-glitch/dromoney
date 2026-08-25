const Content = require('../models/Content');
const asyncHandler = require('../middleware/async');
const axios = require('axios');

const Banner = require('../models/Banner'); // Added Banner model

// @desc    Get dynamic content by key
// @route   GET /api/public/content/:key
// @access  Public
exports.getContent = asyncHandler(async (req, res, next) => {
    const content = await Content.findOne({ key: req.params.key });

    if (!content) {
        return res.status(200).json({
            success: true,
            data: { title: 'Default Title', description: 'Content pending admin setup.' }
        });
    }

    const payload = content.toObject ? content.toObject() : content;
    if (payload.key === 'guide_invite' && payload.data && typeof payload.data.content === 'string') {
        payload.data.content = payload.data.content
            .replace(
                /The amount is transferred to your Virtual Wallet in a minimum of 14 days and a maximum of 28 days\.?/gi,
                'That ₹200 stays in Pending until they create a Virtual Account, then it moves to your Virtual Account.'
            );
    }

    res.status(200).json({
        success: true,
        data: payload
    });
});

// @desc    Get dynamic content by multiple keys
// @route   GET /api/public/content/bulk?keys=key1,key2
// @access  Public
exports.getBulkContent = asyncHandler(async (req, res, next) => {
    const keysStr = req.query.keys;
    if (!keysStr) {
        return res.status(200).json({ success: true, data: {} });
    }
    const keys = keysStr.split(',');
    const contents = await Content.find({ key: { $in: keys } });
    
    // Map array to object for easy frontend access
    const results = {};
    contents.forEach(c => {
        results[c.key] = c;
    });

    res.status(200).json({
        success: true,
        data: results
    });
});

// @desc    Get all active marketing banners for users
// @route   GET /api/public/banners
// @access  Public
exports.getActiveBanners = asyncHandler(async (req, res, next) => {
    // Only return banners where isActive is true
    const banners = await Banner.find({ isActive: true }).sort({ createdAt: -1 });
    
    res.status(200).json({
        success: true,
        data: banners
    });
});

// @desc    Set content (For Admin - simulation)
// @route   POST /api/content
// @access  Private/Admin
exports.updateContent = asyncHandler(async (req, res, next) => {
    const { key, title, description, data } = req.body;

    let content = await Content.findOne({ key });

    if (content) {
        content.title = title;
        content.description = description;
        content.data = data;
        content.lastUpdated = Date.now();
        await content.save();
    } else {
        content = await Content.create({ key, title, description, data });
    }

    res.status(200).json({
        success: true,
        data: content
    });
});

// @desc    Download/proxy brand logo with proper attachment headers
// @route   GET /api/public/content/download-logo
// @access  Public
exports.downloadLogo = asyncHandler(async (req, res, next) => {
    // Fetch onboarding_course content to get current logoUrl
    const content = await Content.findOne({ key: 'onboarding_course' });
    let logoUrl = '';
    if (content && content.data && content.data.page2 && content.data.page2.logoUrl) {
        logoUrl = content.data.page2.logoUrl;
    }
    
    // If empty, use our fallback (cloudinary uploaded logo)
    if (!logoUrl) {
        logoUrl = 'https://res.cloudinary.com/dncw1hfix/image/upload/v1776323215/dromoney/WhatsApp_Image_2026-04-28_at_10.52.49_PM-removebg-preview.png';
    }

    try {
        const filename = 'dromoney_logo.png';
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Access-Control-Allow-Origin', '*');

        if (logoUrl.startsWith('http')) {
            const response = await axios({
                method: 'get',
                url: logoUrl,
                responseType: 'stream',
                timeout: 10000
            });
            response.data.pipe(res);
        } else {
            res.redirect(logoUrl);
        }
    } catch (err) {
        console.error("Error downloading logo:", err);
        res.status(500).json({ 
            success: false, 
            message: "Error fetching logo image for download",
            error: err.message 
        });
    }
});

