var express = require('express')
var router = express.Router()
var authCtrl = require('../controllers/authController')
var validate = require('../middleware/validate')
var { registerSchema, loginSchema } = require('../validators/authValidator')

router.post('/register', validate(registerSchema), authCtrl.register)
router.post('/login', validate(loginSchema), authCtrl.login)

module.exports = router
