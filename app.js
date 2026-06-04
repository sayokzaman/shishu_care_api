var createError = require('http-errors')
var express = require('express')
var path = require('path')
var cors = require('cors')
var cookieParser = require('cookie-parser')
var logger = require('morgan')

var indexRouter = require('./routes/index')
var usersRouter = require('./routes/users')
var authRouter = require('./routes/auth')
var childRouter = require('./routes/child')
var triageRouter = require('./routes/triage')
var vaccinationRouter = require('./routes/vaccination')
var facilityRouter = require('./routes/facility')
var communityRouter = require('./routes/community')
var growthRouter = require('./routes/growth')
var milestoneRouter = require('./routes/milestone')
var smsRemindersRouter = require('./routes/sms-reminders')

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
app.use('/api/child', childRouter)
app.use('/api/child', growthRouter)
app.use('/api/child', milestoneRouter)
app.use('/api/triage', triageRouter)
app.use('/api/vaccination', vaccinationRouter)
app.use('/api/facility', facilityRouter)
app.use('/api/community', communityRouter)
app.use('/api/sms-reminders', smsRemindersRouter)

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
