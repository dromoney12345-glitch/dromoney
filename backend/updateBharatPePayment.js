require('dotenv').config();
const mongoose = require('mongoose');
const Settings = require('./models/Settings');

const BHARATPE_UPI = 'BHARATPE2R0P0Z7W3H84355@unitype';
const QR_IMAGE = '/payment-qr.png';

async function updateBharatPePayment() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        console.log('MongoDB Connected...');

        let settings = await Settings.findOne();
        if (!settings) {
            settings = new Settings();
        }

        settings.adminUpiId = BHARATPE_UPI;
        settings.qrScannerImage = QR_IMAGE;
        await settings.save();

        console.log('Updated payment settings:');
        console.log('  adminUpiId:', settings.adminUpiId);
        console.log('  qrScannerImage:', settings.qrScannerImage);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

updateBharatPePayment();
