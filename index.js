const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose')
const ObjectId = mongoose.Types.ObjectId;
let bodyParser = require('body-parser');
const {parse} = require("dotenv");

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

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
      date: Date
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
    User.find().select('username _id').exec((err, data) => { // lean turns the results into a js object
        done(err, data);
    });
}

// -- exercise --
// Create exercise appended in user log and increment count of user
const appendExercise = (userId, form, done) => {
    const appendingData = {
        // TODO: remove count and change it to be a calculated value
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
const findUserLogs = (userId, done) => {
    // TODO: Change find to aggregate and project log.date into new Date(date).toDateString()?
    // TODO: Calculate count based off the amount of logs being shown
    User.find({ _id: userId })
        .select('-__v')
        .exec((err, data) => {
            done(err, data);
    });
}

const findUserLogsFiltered = (userId, filter, done) => {
    // TODO: Calculate count based off the amount of logs being shown
    const limitItems = filter.limit ? parseInt(filter.limit) : 2147483647; // Maximum 32 bit int.
    const pipeline = [
            { $match: { _id: ObjectId(`${userId}`) }},
            {
                $project: {
                    username: 1,
                    count: 1,
                    log: {
                        $slice: [{
                            $filter: {
                                input: "$log",
                                as: "logEntry",
                                cond: {
                                    $and: [
                                        {$gte: ["$$logEntry.date", new Date(filter.from)]},
                                        {$lte: ["$$logEntry.date", new Date(filter.to)]}
                                    ]
                                }
                            }
                        },
                            limitItems
                        ],
                    }
                }
            },
        ]

    User.aggregate(
        pipeline,
        (err, data) => {
        if (err) {
            console.error("Aggregation error:", err);
            return done(err, null);
        }
        done(null, data);
        })
    // User.find({
    //         _id: userId,
    //         date: {
    //             $gte: filter.from ? new Date(filter.from) : null,
    //             $lte: filter.to ? new Date(filter.to) : null
    //         }
    //     },
    //     {
    //         'log': {
    //             $slice: limitCount ,
    //         },
    //     }).select('-__v').exec((err, data) => {
    //    done(err, data);
    // });
}

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
    let date;
    if (req.body.date) {
        date = new Date(req.body.date);
    } else {
        date = new Date();
    }
   let form = {
       "description": req.body.description,
       "duration": req.body.duration,
       "date": date,
   }
   console.log(form);
   appendExercise(req.params.id, form, (err, data) => {
       res.send({
           username: data.username,
           description: form.description,
           duration: parseInt(form.duration),
           date: new Date(form.date).toDateString(),
           _id: data._id,
       });
   });
});
// GET '/api/users/:id/logs'
app.get('/api/users/:id/logs', (req, res) => {
    if (Object.keys(req.query).length === 0) {
        // Show the full object json
        findUserLogs(req.params.id, (err, data) => {
            res.json(data[0]);
        });
    } else {
        // GET /api/users/:_id/logs?[from][&to][&limit]
        // from, to = dates (yyyy-mm-dd); limit = number
        // build into object and send to db query? Can it handle ignoring a change in an empty from, to, limit?
        const query = {
            from: req.query.from,
            to: req.query.to,
            limit: req.query.limit
        }
        findUserLogsFiltered(req.params.id, query, (err, data) => {
            if (err) { console.log(err); }
            res.json(data[0]);
        })
    }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
