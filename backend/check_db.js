const mongoose = require('mongoose');
const AdminBooster = require('./models/Booster');
require('dotenv').config({path: './.env'});

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const all = await AdminBooster.find();
    console.log(JSON.stringify(all, null, 2));
    process.exit(0);
}).catch(console.error);
