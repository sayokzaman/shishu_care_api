var createError = require('http-errors')
var express = require('express')
var path = require('path')
var cors = require('cors')
var cookieParser = require('cookie-parser')
var logger = require('morgan')

var indexRouter = require('./routes/index')
var usersRouter = require('./routes/users')
var authRouter = require('./routes/auth')
var chatbotRouter = require('./routes/chatbot')
var nurtureRouter = require('./routes/nurture')
var locationsRouter = require('./routes/locations')
var onboardingRouter = require('./routes/onboarding')
var feedingRouter = require('./routes/feeding')
var vaccinationsRouter = require('./routes/vaccinations')
var sleepRouter = require('./routes/sleep')
var activitiesRouter = require('./routes/activities')
var growthRouter = require('./routes/growth')
var milestonesRouter = require('./routes/milestones')

var app = express()

app.use(logger('dev'))
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')))

app.get('/', function (req, res) {
    res.json({
        message: 'Shishu Care API is running',
        status: 'ok'
    })
})

app.use('/api', indexRouter)
app.use('/api/users', usersRouter)
app.use('/api/auth', authRouter)
app.use('/api/chatbot', chatbotRouter)
app.use('/api/nurture', nurtureRouter)
app.use('/api/locations', locationsRouter)
app.use('/api/onboarding', onboardingRouter)
app.use('/api/feeding', feedingRouter)
app.use('/api/vaccinations', vaccinationsRouter)
app.use('/api/sleep', sleepRouter)
app.use('/api/activities', activitiesRouter)
app.use('/api/growth', growthRouter)
app.use('/api/milestones', milestonesRouter)

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404))
})

// error handler
app.use(function (err, req, res, next) {
    res.status(err.status || 500)
    res.json({
        message: err.message,
        error: req.app.get('env') === 'development' ? err : {}
    })
})

module.exports = app
