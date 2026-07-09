const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });
const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/dromoney_db';

const Content = require('./models/Content');

async function fix() {
    await mongoose.connect(uri);
    const fund = await Content.findOne({ key: 'menu_layout_fund' });
    console.log("Current fund:", JSON.stringify(fund, null, 2));
    
    if (fund && fund.data && fund.data.steps && fund.data.steps.length < 3) {
        fund.data.steps.push({
            title: "LONG TERM GROWTH",
            desc: "Jaise-jaise platform grow karega, aapki passive income badhti jayegi."
        });
        fund.markModified('data');
        await fund.save();
        console.log("Fixed menu_layout_fund");
    }
    
    process.exit(0);
}
fix();
