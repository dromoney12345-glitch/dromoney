const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

(async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const user = await User.findById('6a633be037a31eaa94365e84');
        console.log("User:", user);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
})();
