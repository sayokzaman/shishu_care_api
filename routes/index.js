var express = require('express')
var router = express.Router()

router.get('/', function (req, res, next) {
    res.json({
        message: 'Welcome to the Shishu Care API',
        routes: {
            health: '/api/health',
            users: '/api/users'
        }
    })
})

module.exports = router
