const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose')
const bodyParser = require("body-parser")
const shortid = require('shortid');

const uri = process.env['MONGO_URI'];
mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: false }));

const userSchema = new mongoose.Schema({
  "username": { type: String, required: true },
})
const User = mongoose.model('User', userSchema);

const exeSchema = new mongoose.Schema({
  "userId": { type: String, required: true },
  "description": { type: String, required: true },
  "duration": { type: Number, required: true },
  "date": Date
})
const Exercise = mongoose.model('Exercise', exeSchema);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users', (req, res) => {
  var { username } = req.body;

  User.findOne({ username: username }, (err, data) => {
    if (err) console.error(err);
    else {
      if (data != null)
        res.json({ "username": data.username, "_id": data._id });
      else {
        // const id = shortid.generate();
        const user = new User({ username: username });

        user.save((err, data) => {
          if (err) res.status(201).json(err);
          res.json({ "username": data.username, "_id": data._id });
        })
      }
    }
  })
});

app.post('/api/users/:_id/exercises', (req, res) => {
  const { duration, description } = req.body;
  const id = req.params._id;
  let date = req.body.date !== undefined && req.body.date != null ? new Date(req.body.date) : new Date();

  User.findOne({ _id: id }, (err, data) => {
    if (err) console.error(err);
    else {
      if (data != null) {
        // Exercise.find({
        //   date: date, description: description, userId: id,
        //   duration: parseInt(duration)
        // }, (err, log) => {
        //   if (err) res.status(201).json(err);
        //   if (log !== null) {
        //     res.json({
        //       _id: data._id,
        //       username: data.username,
        //       date: log.date.toDateString("yyyy-mm-dd"),
        //       duration: parseInt(log.duration),
        //       description: log.description
        //     });
        //   } else {
        const exercise = new Exercise({
          userId: id,
          description: description,
          duration: parseInt(duration),
          date: date
        });
        exercise.save((err2, exe) => {
          if (err2) res.status(201).json(err2);
          res.json({
            _id: exe.userId,
            username: data.username,
            date: new Date(exe.date).toDateString("yyyy-mm-dd"),
            duration: parseInt(exe.duration),
            description: exe.description
          })
        })
        // }
        // });
      } else
        res.json("no user found");
    }
  })
})

app.get('/api/users', (req, res) => {
  User.find().then((data) => {
    if (data)
      res.json(data.map(({ username, _id }) => {
        return { "_id": _id, "username": username }
      }));
    else
      res.json("no data registered");
  })
})

app.get('/api/users/:id/logs', (req, res) => {
  let findConditions = { userId: req.params.id };

  if (
    (req.query.from !== undefined && req.query.from !== '')
    ||
    (req.query.to !== undefined && req.query.to !== '')
  ) {
    findConditions.date = {};

    if (req.query.from !== undefined && req.query.from !== '') {
      findConditions.date.$gte = new Date(req.query.from);
    }

    if (findConditions.date.$gte == 'Invalid Date') {
      return res.json({ error: 'from date is invalid' });
    }

    if (req.query.to !== undefined && req.query.to !== '') {
      findConditions.date.$lte = new Date(req.query.to);
    }

    if (findConditions.date.$lte == 'Invalid Date') {
      return res.json({ error: 'to date is invalid' });
    }
  }

  let limit = (req.query.limit !== undefined ? parseInt(req.query.limit) : 0);

  if (isNaN(limit)) {
    return res.json({ error: 'limit is not a number' });
  }

  User.findOne({ _id: req.params.id }, (err, user) => {
    if (err) console.error(err);
    else {
      if (user != null) {
        Exercise.find(findConditions)
          .sort({ date: 'asc' })
          .limit(limit)
          .exec((err2, logs) => {
            if (err2) console.error(err2);
            if (logs != null) {
              res.json({
                _id: user._id,
                username: user.username,
                count: logs.length,
                log: logs.map((l) => {
                  return {
                    "description": l.description,
                    "duration": l.duration,
                    "date": new Date(l.date).toDateString("yyyy-mm-dd")
                  }
                })
              });
            }
            // else
            //   res.json({
            //     _id: user._id,
            //     username: user.username,
            //     count: 0,
            //     log: []
            //   });
          });

      }
      else
        res.json("user not found!");
    }
  })
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
