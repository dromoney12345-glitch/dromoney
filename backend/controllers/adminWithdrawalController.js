const Withdrawal = require('../models/Withdrawal');
const User = require('../models/User');

// @desc    Get all withdrawal requests
// @route   GET /api/admin/withdrawals
// @access  Private/Admin
exports.getWithdrawals = async (req, res) => {
    try {
        const { status } = req.query;
        let query = {};
        if (status && status !== 'All') {
            query.status = status;
        }

        const withdrawals = await Withdrawal.find(query)
            .populate('user', 'name phone email wallet')
            .sort({ createdAt: -1 });

        const statsRows = await Withdrawal.aggregate([
            { $group: { _id: '$status', total: { $sum: '$amount' } } },
        ]);
        const stats = { total: 0, approved: 0, pending: 0, rejected: 0 };
        statsRows.forEach((row) => {
            const key = String(row._id || '').toLowerCase();
            if (key === 'approved') stats.approved = row.total;
            else if (key === 'pending') stats.pending = row.total;
            else if (key === 'rejected') stats.rejected = row.total;
            stats.total += row.total;
        });

        res.json({
            success: true,
            data: withdrawals,
            stats,
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Update withdrawal status (Approve/Reject)
// @route   PUT /api/admin/withdrawals/:id
// @access  Private/Admin
exports.updateWithdrawalStatus = async (req, res) => {
    try {
        const { status, remarks } = req.body;
        const withdrawal = await Withdrawal.findById(req.params.id);

        if (!withdrawal) {
            return res.status(404).json({ success: false, message: "Withdrawal not found" });
        }

        if (!['Pending', 'Processing'].includes(withdrawal.status)) {
            return res.status(400).json({ success: false, message: "Only pending or processing requests can be updated" });
        }

        if (status === 'Processing') {
            if (withdrawal.status !== 'Pending') {
                return res.status(400).json({ success: false, message: "Only pending requests can move to processing" });
            }
            withdrawal.status = 'Processing';
            if (remarks) withdrawal.remarks = remarks;
            await withdrawal.save();
            try {
                const { notifyJourney } = require('../utils/userJourneyPush');
                await notifyJourney(withdrawal.user, 'withdraw_processing', {
                    notificationId: `${withdrawal.user}_withdraw_processing_${withdrawal._id}`,
                });
            } catch (pushErr) {
                console.error('Withdrawal processing push failed:', pushErr.message);
            }
            if (global.io) {
                global.io.emit(`withdrawal_update_${withdrawal.user}`, { status: 'Processing' });
            }
            return res.json({ success: true, message: 'Withdrawal moved to processing' });
        }

        const user = await User.findById(withdrawal.user);
        if (!user) {
            return res.status(404).json({ success: false, message: "User associated with this withdrawal not found" });
        }

        const { WITHDRAWAL_FEE } = require('../utils/moneyQuotes');
        const totalDeduction = Number(withdrawal.amount) + WITHDRAWAL_FEE;

        // Balance Check & Deduction first if Approved
        if (status === 'Approved') {
            if (user.wallet.balance < totalDeduction) {
                return res.status(400).json({ success: false, message: `User has insufficient balance (₹${user.wallet.balance}) for this withdrawal of ₹${withdrawal.amount} with ₹5 transaction fee.` });
            }
            user.wallet.balance -= totalDeduction;
            
            // Add in-app notification
            user.notifications = user.notifications || [];
            user.notifications.push({
                title: "Withdrawal Approved",
                message: `Your withdrawal of ₹${withdrawal.amount} has been approved. ₹${totalDeduction} deducted from wallet.`,
                type: "success",
                date: new Date()
            });
            await user.save();
        }

        // Handle Rejected notifications
        if (status === 'Rejected') {
            user.notifications = user.notifications || [];
            user.notifications.push({
                title: "Withdrawal Rejected",
                message: `Your withdrawal request for ₹${withdrawal.amount} was rejected.`,
                type: "error",
                date: new Date()
            });
            await user.save();
        }

        // Save withdrawal status
        withdrawal.status = status;
        withdrawal.remarks = remarks;
        withdrawal.processedAt = Date.now();
        await withdrawal.save();

        // Update corresponding Transaction status
        const Transaction = require('../models/Transaction');
        if (withdrawal.transaction) {
            const tx = await Transaction.findById(withdrawal.transaction);
            if (tx) {
                tx.status = status === 'Approved' ? 'Success' : status === 'Rejected' ? 'Failed' : 'Pending';
                await tx.save();
            }
        }

        // Update corresponding Fee Transaction status
        if (withdrawal.feeTransaction) {
            const feeTx = await Transaction.findById(withdrawal.feeTransaction);
            if (feeTx) {
                feeTx.status = status === 'Approved' ? 'Success' : status === 'Rejected' ? 'Failed' : 'Pending';
                await feeTx.save();
            }
        } else {
            // Fallback for old withdrawal requests that didn't have feeTransaction saved
            const feeTx = await Transaction.findOne({
                user: withdrawal.user,
                type: 'withdrawal',
                amount: 5,
                source: 'Withdrawal Transaction Fee',
                status: 'Pending'
            });
            if (feeTx) {
                feeTx.status = status === 'Approved' ? 'Success' : status === 'Rejected' ? 'Failed' : 'Pending';
                await feeTx.save();
            }
        }

        // Send Push Notification
        if (status === 'Approved' || status === 'Rejected') {
            const { notifyJourney } = require('../utils/userJourneyPush');
            await notifyJourney(
                withdrawal.user,
                status === 'Approved' ? 'withdraw_approved' : 'withdraw_rejected',
                { notificationId: `${withdrawal.user}_withdraw_${status}_${withdrawal._id}` }
            );
        }

        // Emit real-time Socket event to notify user's frontend
        if (global.io) {
            global.io.emit(`withdrawal_update_${withdrawal.user}`, {
                status: status
            });
        }

        res.json({
            success: true,
            message: `Withdrawal ${status} successfully`
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Export pending withdrawals to CSV
// @route   GET /api/admin/withdrawals/export
// @access  Private/Admin
exports.exportWithdrawalsCSV = async (req, res) => {
    try {
        const withdrawals = await Withdrawal.find({ status: 'Pending' })
            .populate('user', 'name phone email')
            .sort({ createdAt: -1 });

        // CSV Header
        let csv = 'User_Name,Phone,Payment_Method,User_UPI_ID,Bank_Account,IFSC,Holder_Name,Amount,TDS,Admin_Charges,Final_Amount,Request_Date,Request_ID\n';
        
        withdrawals.forEach(w => {
            const name = w.user?.name || 'Unknown';
            const phone = w.user?.phone || '';
            const method = w.paymentMethod || 'UPI';
            const upiId = w.bankDetails?.upiId || '';
            const account = w.bankDetails?.accountNumber || '';
            const ifsc = w.bankDetails?.ifscCode || '';
            const holder = w.bankDetails?.holderName || '';
            
            const amount = w.amount;
            const tds = 0; // Currently no TDS is deducted in the system
            const adminCharges = 5; // Flat ₹5 fee
            const finalAmount = amount; // User receives the full amount, ₹5 is deducted extra from wallet
            
            const requestDate = new Date(w.createdAt).toLocaleDateString('en-GB');
            const requestId = w._id.toString();
            
            csv += `"${name}","${phone}","${method}","${upiId}","${account}","${ifsc}","${holder}","${amount}","${tds}","${adminCharges}","${finalAmount}","${requestDate}","${requestId}"\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=pending_withdrawals.csv');
        res.status(200).send(csv);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Bulk approve withdrawal requests
// @route   POST /api/admin/withdrawals/bulk-approve
// @access  Private/Admin
exports.bulkApproveWithdrawals = async (req, res) => {
    try {
        const { withdrawalIds } = req.body;
        
        if (!withdrawalIds || !Array.isArray(withdrawalIds) || withdrawalIds.length === 0) {
            return res.status(400).json({ success: false, message: "Please provide an array of withdrawal IDs" });
        }

        const withdrawals = await Withdrawal.find({ _id: { $in: withdrawalIds }, status: 'Pending' });
        
        if (withdrawals.length === 0) {
            return res.status(404).json({ success: false, message: "No pending withdrawals found for the provided IDs" });
        }

        let processedCount = 0;
        let failedCount = 0;
        let errors = [];

        // Import Transaction model once
        const Transaction = require('../models/Transaction');

        for (const withdrawal of withdrawals) {
            try {
                const user = await User.findById(withdrawal.user);
                if (!user) {
                    failedCount++;
                    errors.push(`User not found for withdrawal ${withdrawal._id}`);
                    continue;
                }

                const { WITHDRAWAL_FEE } = require('../utils/moneyQuotes');
        const totalDeduction = Number(withdrawal.amount) + WITHDRAWAL_FEE;

                // Balance Check & Deduction
                if (user.wallet.balance < totalDeduction) {
                    failedCount++;
                    errors.push(`Insufficient balance for user ${user.name} (Withdrawal ID: ${withdrawal._id})`);
                    continue;
                }
                
                user.wallet.balance -= totalDeduction;
                
                // Add in-app notification
                user.notifications = user.notifications || [];
                user.notifications.push({
                    title: "Withdrawal Approved",
                    message: `Your withdrawal of ₹${withdrawal.amount} has been approved. ₹${totalDeduction} deducted from wallet.`,
                    type: "success",
                    date: new Date()
                });
                await user.save();

                // Save withdrawal status
                withdrawal.status = 'Approved';
                withdrawal.remarks = 'Bulk approved via admin panel';
                withdrawal.processedAt = Date.now();
                await withdrawal.save();

                // Update corresponding Transaction status
                if (withdrawal.transaction) {
                    const tx = await Transaction.findById(withdrawal.transaction);
                    if (tx) {
                        tx.status = 'Success';
                        await tx.save();
                    }
                }

                // Update corresponding Fee Transaction status
                if (withdrawal.feeTransaction) {
                    const feeTx = await Transaction.findById(withdrawal.feeTransaction);
                    if (feeTx) {
                        feeTx.status = 'Success';
                        await feeTx.save();
                    }
                } else {
                    // Fallback for old withdrawal requests
                    const feeTx = await Transaction.findOne({
                        user: withdrawal.user,
                        type: 'withdrawal',
                        amount: 5,
                        source: 'Withdrawal Transaction Fee',
                        status: 'Pending'
                    });
                    if (feeTx) {
                        feeTx.status = 'Success';
                        await feeTx.save();
                    }
                }

                // Send Push Notification
                const { notifyJourney } = require('../utils/userJourneyPush');
                await notifyJourney(withdrawal.user, 'withdraw_approved', {
                    title: 'Withdrawal Approved! 🎉',
                    body: `Your withdrawal request of ₹${withdrawal.amount} has been successfully approved & transferred.`,
                });

                // Emit real-time Socket event
                if (global.io) {
                    global.io.emit(`withdrawal_update_${withdrawal.user}`, {
                        status: 'Approved'
                    });
                }

                processedCount++;
            } catch (innerErr) {
                failedCount++;
                errors.push(`Error processing withdrawal ${withdrawal._id}: ${innerErr.message}`);
            }
        }

        res.json({
            success: true,
            message: `Bulk approval complete. Processed: ${processedCount}, Failed: ${failedCount}`,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
