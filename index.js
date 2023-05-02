const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const ObjectId = mongoose.Schema.Types.ObjectId

require('dotenv').config()

app.use(bodyParser.urlencoded({extended: false}))
app.use(cors())
app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


const UserSchema = new mongoose.Schema({
  username: String,
}, {
   virtuals: {
    
    count: {
      get() {
        return this.log.length
      }
    }
  }
})

UserSchema.virtual('log',{
      ref: 'Execise',
      localField: '_id',
      foreignField: 'user'
    })

const ExeciseSchema = new mongoose.Schema({
  duration: Number,
  description: String,
  date: {
    type: Date,
    transform: d => d.toDateString()
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
})

const UserModel = mongoose.model('User', UserSchema)
const ExeciseModel = mongoose.model('Execise', ExeciseSchema)


async function main() {
  //connect db
  await mongoose.connect(process.env.MONGO_URI, { dbName: 'fcc_execise_db'})

  app.get('/api/users', async (req, res) => {
    const users = await UserModel.find()
    res.json(users)
  })

  app.post('/api/users', async (req, res) => {
    const {username} = req.body
    if (!username) return res.status(404).send('')

    let user = await UserModel.findOne({username})
    if (!user) {
      user = new UserModel({username})
      await user.save()
    }
    res.json(user)
  })

  app.get('/api/users/:id/logs', (req, res, next) => {
    req.query.from = typeof req.query.from === 'string' ? new Date(req.query.from) : new Date('1900-01-01')
    req.query.to = typeof req.query.to === 'string' ? new Date(req.query.to) : new Date('3000-01-01')
    
    req.query.limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit) : 0
    next()
    console.log({query: req.query})
  }, async (req, res) => {
    let { from, to, limit } = req.query
    const { id } = req.params
    let user = await UserModel.findById(id).populate({
      path: 'log',
      match: {date: {$lte: to, $gte: from}},
      options: {
        limit: limit,
      }
    })
    res.json(user.toObject({virtuals: true}))
  })

  app.post('/api/users/:id/exercises', async (req, res) => {
    const { id } = req.params
    let { duration, description, date = new Date() } = req.body 
    date = typeof date === 'string' ? new Date(date) : date
    duration = parseInt(duration)
    
    const user = await UserModel.findById(id)
    
    const execise = new ExeciseModel({
      duration,
      description,
      date,
      user,
    })
    await execise.save()

    res.json({_id: id, username: user.username, duration, date: date.toDateString(), description})
  })


  const listener = app.listen(process.env.PORT || 3000, () => {
    console.log('Your app is listening on port ' + listener.address().port)
  })
}

main()