const mongoose = require('mongoose');
require('dotenv').config();

const addTestUser = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected.');

        const User = require('./models/User');

        const testUser = await User.create({
            name: 'Test Account',
            email: 'testaccount@gmail.com',
            phone: '9999999999',
            password: 'password123',
            isPaid: true
        });

        console.log('✅ Test user created successfully:', testUser.phone);
        process.exit(0);
    } catch (err) {
        console.error('Failed to create test user:', err);
        process.exit(1);
    }
};

addTestUser();
