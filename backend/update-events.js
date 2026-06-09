require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const Event = require('./models/Event');
    const updateResult = await Event.updateMany({}, {
        $set: {
            title: 'MAKEUP CONCLAVE 1.0',
            venue: 'Siliguri Montana Vista',
            date: new Date('2026-07-11T09:00:00Z'),
            endDate: new Date('2026-07-11T19:00:00Z'),
            time: '9:00 AM to 7:00 PM',
            duration: '1 Day'
        }
    });
    console.log('Updated events:', updateResult);
    process.exit(0);
}).catch(console.error);
