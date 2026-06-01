const mongoose = require('mongoose');
const User = require('../models/User');
const TaskSubmission = require('../models/TaskSubmission');
const Transaction = require('../models/Transaction');
const Task = require('../models/Task');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const fixApprovedSubmissions = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB...');

        const approvedSubmissions = await TaskSubmission.find({ status: 'Approved' });
        console.log(`Found ${approvedSubmissions.length} Approved task submissions in DB.`);

        for (const sub of approvedSubmissions) {
            console.log(`\nProcessing Submission ID: ${sub._id}`);
            const user = await User.findById(sub.user);
            if (!user) {
                console.log(`User ${sub.user} not found, skipping.`);
                continue;
            }

            const task = await Task.findById(sub.task);
            if (!task) {
                console.log(`Task ${sub.task} not found, skipping.`);
                continue;
            }

            // Check if transaction log already exists for this task approval
            const coinTxExists = await Transaction.findOne({
                user: user._id,
                currency: 'COIN',
                source: new RegExp(task.title, 'i')
            });

            if (coinTxExists) {
                console.log(`Transaction log already exists for task "${task.title}", skipping retroactive credit.`);
            } else {
                console.log(`No transaction log found for task "${task.title}". Retroactively crediting...`);

                // Calculate coins (3x booster check)
                const factor = user.isBoosterActive || user.isTaskBoosterActive ? 3 : 1;
                const baseCoins = sub.coinsReward || task.coinsReward || 1;
                const coinsToAdd = baseCoins * factor;

                // 1 Coin = ₹0.1
                const conversionRate = 0.1;
                const earningsInRupee = parseFloat((coinsToAdd * conversionRate).toFixed(2));

                console.log(`Calculated: baseCoins=${baseCoins}, factor=${factor}, coinsToAdd=${coinsToAdd}, earningsInRupee=₹${earningsInRupee}`);

                // Update balances
                user.coins.balance = (user.coins.balance || 0) + coinsToAdd;
                user.coins.lifetimeCoins = (user.coins.lifetimeCoins || 0) + coinsToAdd;
                user.wallet.balance = (user.wallet.balance || 0) + earningsInRupee;
                user.wallet.lifetimeEarnings = (user.wallet.lifetimeEarnings || 0) + earningsInRupee;
                user.wallet.todayEarnings = (user.wallet.todayEarnings || 0) + earningsInRupee;

                // Create Transaction Logs
                await Transaction.create({
                    user: user._id,
                    type: 'credit',
                    currency: 'COIN',
                    amount: coinsToAdd,
                    source: `Task Approved: ${task.title}`,
                    status: 'Success'
                });

                await Transaction.create({
                    user: user._id,
                    type: 'credit',
                    currency: 'INR',
                    amount: earningsInRupee,
                    source: `Task Approved (Conversion): ${task.title}`,
                    status: 'Success'
                });

                console.log(`Transactions logged successfully.`);
            }

            // Verify task is tracked in user completed lists
            let userUpdated = false;
            if (task.isDaily) {
                const today = new Date().setHours(0, 0, 0, 0);
                const isDailyTracked = user.dailyTaskCompletions?.some(c => 
                    String(c.taskId) === String(task._id) && 
                    new Date(c.completedAt).setHours(0, 0, 0, 0) === today
                );
                if (!isDailyTracked) {
                    user.dailyTaskCompletions.push({
                        taskId: task._id,
                        completedAt: new Date()
                    });
                    userUpdated = true;
                    console.log(`Added task to user.dailyTaskCompletions list.`);
                }
            } else {
                const isOneTimeTracked = user.completedTasks?.includes(task._id);
                if (!isOneTimeTracked) {
                    user.completedTasks.push(task._id);
                    userUpdated = true;
                    console.log(`Added task to user.completedTasks list.`);
                }
            }

            await user.save();
            console.log(`User ${user.name} saved successfully.`);
        }

        console.log('\nAll retro-active approved task submissions fixed successfully!');
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

fixApprovedSubmissions();
