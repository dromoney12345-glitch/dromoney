const ReferralTransaction = require('../models/ReferralTransaction');
const User = require('../models/User');
const Settings = require('../models/Settings');

// @desc    Get all affiliate/referral stats and logs
// @route   GET /api/admin/affiliates
// @access  Private/Admin
exports.getAffiliateStats = async (req, res) => {
    try {
        // 1. Total Referrals Count
        const totalReferrals = await ReferralTransaction.countDocuments();

        // 2. Total Payouts Amount
        const totalPayouts = await ReferralTransaction.aggregate([
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        // 3. Top Referrers (Top 5)
        const topReferrers = await User.find({ referralCount: { $gt: 0 } })
            .sort({ referralCount: -1 })
            .limit(5)
            .select('name referralCount');

        // 4. Referral Logs
        const logs = await ReferralTransaction.find()
            .populate('referrer', 'name email')
            .populate('referredUser', 'name email createdAt')
            .sort({ createdAt: -1 });

        // 5. Current Commission Rate
        const settings = await Settings.findOne().select('referralCommission referralLinkBaseUrl');

        res.status(200).json({
            success: true,
            data: {
                stats: {
                    totalReferrals,
                    totalPayouts: totalPayouts[0] ? totalPayouts[0].total : 0,
                    activeReferrersCount: topReferrers.length,
                    topReferrer: topReferrers[0]?.name || 'None',
                    currentCommission: settings?.referralCommission || 200,
                    referralLinkBaseUrl: require('../utils/referralCode').normalizeReferralLinkBaseUrl(
                        settings?.referralLinkBaseUrl
                    ),
                },
                logs: logs.map(log => {
                    const regDate = log.referredUser?.createdAt || log.createdAt;
                    return {
                        id: log._id,
                        referrer: log.referrer?.name || 'Deleted User',
                        referredTo: log.referredUser?.name || 'Deleted User',
                        date: new Date(regDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
                        joinTime: new Date(regDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                        reward: `₹${log.amount}`,
                        status: log.status === 'Completed' ? 'Credited' : log.status,
                        txnId: log._id.toString().substring(0, 8).toUpperCase(),
                        ip: 'Verified' // IP tracking not implemented in transaction model
                    };
                })
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
