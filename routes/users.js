var express = require('express')
var router = express.Router()

router.get('/', function (req, res, next) {
    res.json({
        users: []
    })
})

router.post('/', function (req, res) {
    res.status(201).json({
        message: 'User payload received',
        user: req.body
    })
})

module.exports = router
