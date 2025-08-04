const connectionURL = 'mongodb://kpajhimu:1234@localhost:27017/?authSource=admin'

var mongoose = require('mongoose');
mongoose.connect(connectionURL, {useNewUrlParser: true, useUnifiedTopology: true});

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log('We are connected!')
});
