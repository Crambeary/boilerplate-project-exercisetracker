const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose')
let bodyParser = require('body-parser');

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
// Per endpoint
// -- users --
// Create Username
const createUser = (username, done) => {
    User.create(
        {
            "username": username,
            "count": 0,
            "log": []
        },
        function (err, data) {
            done(err, data);
        }
    );
}
// Find users
const findUsers = (done) => {
    User.find((err, data) => {
        console.log('data', data);
        let filteredUsers = data.map(({count, log, ...rest}) => rest);
        done(err, filteredUsers);
    });
}

// -- exercise --
// Find exercise from user
// Create exercise appended in user log and increment count of user

// -- logs --
// Find logs from user and return the full object



// ------ API Endpoints -----
app.use(bodyParser.urlencoded({extended: false}));
app.route('/api/users/')
    // Get '/api/users' returns list of all users in an array of objects containing `username` and `_id`
    .get((req, res) => {
        findUsers((err, data) => {
            res.json(data);
        })
    })
    // Post '/api/users'
        // Return object with `username` and `_id`
    .post((req, res) => {
    console.log(req.body);
    createUser(req.body.username, (err, data) => {
       console.log(err, data);
       res.json({"username": data.username, "_id": data._id});
    });
});

// Post '/api/users/:id/exercises'
// GET '/api/users/:id/logs'
    // Show the full object json
    // 16. You can add from, to and limit parameters
    // TODO: Research GET parameters
    // GET /api/users/:_id/logs?[from][&to][&limit]

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
