const mongoose = require('mongoose');
const EventParticipant = require('../models/EventParticipant');
const User = require('../models/User');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    const parts = await EventParticipant.find();
    console.log("Total Participations:", parts.length);
    console.log(parts);
    process.exit(0);
}
run();
