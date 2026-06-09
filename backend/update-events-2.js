require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const Event = require('./models/Event');
    const updateResult = await Event.updateMany({}, {
        $set: {
            date: new Date('2026-07-11T00:00:00Z'),
            endDate: new Date('2026-07-11T18:00:00Z') // ensure it's still same day in IST
        }
    });
    console.log('Updated events:', updateResult);
    process.exit(0);
}).catch(console.error);
