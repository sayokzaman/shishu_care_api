var express = require('express')
var router = express.Router()
var requireAuth = require('../middleware/auth')
var validate = require('../middleware/validate')
var { createMeasurementSchema } = require('../validators/growthValidator')
var growthCtrl = require('../controllers/growthController')

router.use(requireAuth)

router.get('/latest', growthCtrl.getLatest)
router.get('/measurements', growthCtrl.listMeasurements)
router.post('/measurements', validate(createMeasurementSchema), growthCtrl.createMeasurement)

module.exports = router
