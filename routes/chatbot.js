var express = require('express')
var router = express.Router()
var chatbotCtrl = require('../controllers/chatbotController')

router.post('/chat', chatbotCtrl.chat)

module.exports = router
