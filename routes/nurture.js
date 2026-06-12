var express = require('express')
var router = express.Router()
var nurtureCtrl = require('../controllers/nurtureController')

router.post('/chat', nurtureCtrl.chat)

module.exports = router
