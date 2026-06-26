require('dotenv').config();
const mongoose = require('mongoose');
const Settings = require('./models/Settings');

async function updateDummyQr() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        
        console.log('MongoDB Connected...');
        
        let settings = await Settings.findOne();
        if (!settings) {
            settings = new Settings();
        }
        
        // Dummy QR Code URL (Wikipedia dummy QR)
        settings.qrScannerImage = 'https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg';
        await settings.save();
        
        console.log('Successfully added dummy QR scanner image!');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

updateDummyQr();
