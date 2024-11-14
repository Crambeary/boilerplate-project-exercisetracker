const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose')

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

mongoose.connect(
    process.env.MONGO_URI,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      dbName: process.env.MONGO_DB_NAME
    });

const userSchema = new mongoose.Schema({
  username: String,
  count: Number,
  log: [{
    description: String,
    duration: Number,
    date: String
  }]
});

let User = mongoose.model('User', userSchema);

// ----- DB Interface -----
// Per endpoint?
// -- users --
// Create Username
// Find users

// -- exercise --
// Find exercise from user

// -- logs --
// Find logs from user

// ------ API Endpoints -----
// Post '/api/users'
    // Return object with `username` and `_id`
// Get '/api/users' returns list of all users in an array of objects containing `username` and `_id`
// Post '/api/users/:id/exercises'
// GET '/api/users/:id/logs'

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
