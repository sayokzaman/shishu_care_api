var express = require('express')
var router = express.Router()
var userController = require('../controllers/userController')
const requireAuth = require('../middleware/auth')

router.get('/', requireAuth, userController.getUsers)
router.post('/', requireAuth, userController.createUser)

module.exports = router
