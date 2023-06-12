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
  "userId": String,
  "descsription": String,
  "duration": Number,
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
  const { date, duration, description } = req.body;
  const id = req.params._id;

  User.findOne({ _id: id }, (err, data) => {
    if (err) console.error(err);
    else {
      if (data != null) {
        Exercise.find({ date: date, description: description, userId: id, duration: parseInt(duration) }, (err, log) => {
          if (log != null && log.length > 0) {
            console.log(data, log);
            res.json({ _id: data._id, username: data.username, date: log.date, duration: log.duration, description: log.description });
          } else {
            const exercise = new Exercise({ userId: id, description: description, duration: parseInt(duration), date: new Date(date).toDateString("yyyy-mm-dd") });
            console.log(data, exercise);
            exercise.save().then((exe) => {
              res.json({ _id: exe.userId, username: data.username, date: exe.date, duration: exe.duration, description: exe.description })
            })
          }
        });
      } else
        res.json("no user found");
    }
  })
})

app.get('/api/users', (req, res) => {
  User.find().then((data) => {
    if (data)
      res.json(data.map(({ username, _id }) => { return { "_id": _id, "username": username } }));
    else
      res.json("no data registered");
  })
})

app.get('/api/users/:id/logs', (req, res) => {
  const { from, to, limit } = req.query;
  User.findOne({ _id: req.params.id }, (err, user) => {
    if (err) console.error(err);
    else {
      if (user != null) {
        if (limit != null) {
          Exercise.find({ userId: user._id })
            .limit(parseInt(limit))
            .exec((err, logs) => {
              if (err) console.error(err);
              if (logs != null && logs.length > 0) {
                let filteredLogs = (from != null && to != null) ? logs.filter(x => x.date >= Date.parse(from) && x.date <= Date.parse(to)) : logs;
                res.json({ _id: user._id, username: user.username, count: logs.length, log: filteredLogs.map(({ description, duration, date }) => { return { "description": description, "duration": duration, "date": date.toDateString("yyyy-mm-dd") } }) });
              }
              else
                res.json({ _id: user._id, username: user.username, count: 0, log: [] });
            });
        }
        else
          Exercise.find({ userId: user._id }, (err, logs) => {
            if (err) console.error(err);
            if (logs != null && logs.length > 0) {
              let filteredLogs = (from != null && to != null) ? logs.filter(x => x.date >= Date.parse(from) && x.date <= Date.parse(to)) : logs;
              res.json({ _id: user._id, username: user.username, count: logs.length, log: filteredLogs.map(({ description, duration, date }) => { return { "description": description, "duration": duration, "date": date.toDateString("yyyy-mm-dd") } }) });
            }
            else
              res.json({ _id: user._id, username: user.username, count: 0, log: [] });
          });
      }
      else
        res.json("no user matched!");
    }
  })
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
