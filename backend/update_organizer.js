const mongoose = require('mongoose');
const Event = require('./models/Event');

mongoose.connect('mongodb://127.0.0.1/iri_apex')
  .then(() => {
    return Event.updateMany({}, { $set: { organizer: '6a227e9c0ea3185c3c4456a3' } });
  })
  .then((res) => {
    console.log('DB Updated Events Organizer:', res);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
