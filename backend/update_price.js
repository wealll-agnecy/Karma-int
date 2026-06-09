const mongoose = require('mongoose');
const Event = require('./models/Event');

mongoose.connect('mongodb://127.0.0.1/iri_apex')
  .then(() => {
    return Event.updateMany({}, { $set: { 'ticketTypes.$[elem].price': 3000 } }, { arrayFilters: [{ 'elem.name': 'Regular' }] });
  })
  .then((res) => {
    console.log('DB Updated', res);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
