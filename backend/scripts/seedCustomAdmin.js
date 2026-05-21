const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Admin = require('../models/Admin');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const seedCustomAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected...');

        // Delete any existing admin with the email 'admin@gmail.com'
        await Admin.deleteOne({ email: 'admin@gmail.com' });

        // Create the new admin
        await Admin.create({
            name: 'Super Admin',
            email: 'admin@gmail.com',
            password: '12345',
            role: 'Super Admin'
        });

        console.log('✅ Admin Seeded Successfully!');
        console.log('Email:', 'admin@gmail.com');
        console.log('Password:', '12345');
        
        process.exit();
    } catch (err) {
        console.error('❌ Error Seeding Admin:', err.message);
        process.exit(1);
    }
};

seedCustomAdmin();
