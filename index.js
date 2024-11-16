const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose')
const ObjectId = mongoose.Types.ObjectId;
let bodyParser = require('body-parser');

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


// Helper functions
const appendCount = (data) => {
    // input is json format
    // read as object
    data["count"] = data.log.length;
    return data; // json
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
  log: [{
      _id: false,
      description: String,
      duration: Number,
      date: Date
  }]
});

userSchema.set('toJSON', {
    transform: (doc, ret) => {
        if (ret.log) {
            ret.log = ret.log.map((entry) => ({
                ...entry,
                date: entry.date.toDateString()
            }));
        }
        return ret;
    }
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
            "log": []
        },
        function (err, data) {
            done(err, data.toJSON());
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
        "$push": { "log": form }
    }
    User.findByIdAndUpdate({ "_id": userId }, appendingData, { new: true }, (err, data) => {
        console.log(err);
        done(err, data.toJSON());
    })
}

// -- logs --
// Find logs from user and return the full object
const findUserLogs = (userId, done) => {
    User.find({ _id: userId })
        .select('-__v')
        .exec((err, data) => {
            if (err) {
                console.log("Mongo error:", err);
                return done(err, null);
            }
            const hydratedData = User.hydrate(data);
            const json = hydratedData.toJSON();
            done(err, json);
    });
}

const findUserLogsFiltered = (userId, filter, done) => {
    const limitItems = filter.limit ? parseInt(filter.limit) : 2147483647; // Maximum 32 bit int.
    // Setting defaults to extremely high values that shouldn't be used
    const dateFrom = filter.from ? new Date(filter.from) : new Date('1970-01-02').toDateString();
    const dateTo = filter.to ? new Date(filter.to) : new Date('3000-01-02');
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
                                        {$gte: ["$$logEntry.date", dateFrom]},
                                        {$lte: ["$$logEntry.date", dateTo]}
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
        pipeline)
        .exec(
        (err, data) => {
            if (err) {
                console.error("Aggregation error:", err);
                return done(err, null);
            }
            const hydratedData = User.hydrate(data[0]);
            const json = hydratedData.toJSON();
            done(err, json);
        });
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
            res.json(appendCount(data[0]));
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
            res.json(appendCount(data));
        })
    }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
