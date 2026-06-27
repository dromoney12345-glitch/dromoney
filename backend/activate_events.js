const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const db = mongoose.connection.db;
    const result = await db.collection('events').updateMany({}, { $set: { status: 'Active' } });
    console.log(`Updated ${result.modifiedCount} events to Active`);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
