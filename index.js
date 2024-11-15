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

// Helper functions
const omitKeys = (arr, keysToOmit) => {
    return arr.map(obj => // map out so the array gets each entry processed in the CB
    Object.fromEntries( // fromEntries takes a 2D array and creates an Object
        // Being in the arr.map will result in an array
        Object.entries(obj) // Takes an object and creates the 2D array
            .filter( // CB that returns bool on what to keep
                ([k]) => // key to compare
                    !keysToOmit.includes(k)) // array matches what we want to remove 'false' in the filter
        )
    );
}

const selectKeys = (arr, keysToOmit) => {
    return arr.map(obj => // map out so the array gets each entry processed in the CB
        Object.fromEntries( // fromEntries takes a 2D array and creates an Object
            // Being in the arr.map will result in an array
            Object.entries(obj) // Takes an object and creates the 2D array
                .filter( // CB that returns bool on what to keep
                    ([k]) => {// key to compare
                        return keysToOmit.includes(k); // array matches what we want to keep 'true' in the filter
                    })
        )
    );
}

// MongoDB - Mongoose
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
      _id: false,
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
    User.find().lean().exec((err, data) => { // lean turns the results into a js object
        console.log('data', data);
        const filteredUsers = selectKeys(data,['username', '_id']);
        done(err, filteredUsers);
    });
}

// -- exercise --
// Create exercise appended in user log and increment count of user
const appendExercise = (userId, form, done) => {
    const appendingData = {
        "$inc": { "count": 1 } ,
        "$push": { "log": form }
    }
    User.findByIdAndUpdate({ "_id": userId }, appendingData, { new: true }, (err, data) => {
        console.log(err);
        done(err, data);
    })
}

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
app.post('/api/users/:id/exercises', (req, res) => {
   let form = {
       "description": req.body.description,
       "duration": req.body.duration,
       "date": new Date(req.body.date).toDateString() || new Date().toDateString(),
   }
   console.log(form);
   appendExercise(req.params.id, form, (err, data) => {
       res.json(data);
   });
});
// GET '/api/users/:id/logs'
    // Show the full object json
    // 16. You can add from, to and limit parameters
    // TODO: Research GET parameters
    // GET /api/users/:_id/logs?[from][&to][&limit]

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
