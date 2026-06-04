const express = require('express')
const router = express.Router()
const authCtrl = require('../controllers/authController')

router.post('/phone-login', authCtrl.phoneLogin)
router.post('/admin-login', authCtrl.adminLogin)
router.post('/admin-register', authCtrl.adminRegister)

module.exports = router
