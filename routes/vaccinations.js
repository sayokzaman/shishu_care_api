var express = require('express')
var router = express.Router()
var requireAuth = require('../middleware/auth')
var vaccinationCtrl = require('../controllers/vaccinationController')

router.use(requireAuth)

router.get('/', vaccinationCtrl.listVaccinations)
router.patch('/:id', vaccinationCtrl.recordVaccination)

module.exports = router
