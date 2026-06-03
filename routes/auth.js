var express = require('express')
var router = express.Router()
var authCtrl = require('../controllers/authController')
var auth = require('../middleware/authMiddleware')

router.post('/register', authCtrl.register)
router.post('/login', authCtrl.login)

module.exports = router
