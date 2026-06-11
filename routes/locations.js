var express = require('express')
var router = express.Router()
var locationCtrl = require('../controllers/locationController')
var validate = require('../middleware/validate')
var {
    createDivisionSchema,
    updateDivisionSchema,
    createDistrictSchema,
    updateDistrictSchema,
    createUpazillaSchema,
    updateUpazillaSchema
} = require('../validators/locationValidator')
const requireAuth = require('../middleware/auth')

// Divisions
router.get('/divisions', locationCtrl.getDivisions)
router.get('/divisions/:id', locationCtrl.getDivision)
router.post('/divisions', requireAuth, validate(createDivisionSchema), locationCtrl.createDivision)
router.patch('/divisions/:id', requireAuth, validate(updateDivisionSchema), locationCtrl.updateDivision)
router.delete('/divisions/:id', requireAuth, locationCtrl.deleteDivision)

// Districts
router.get('/districts', locationCtrl.getDistricts)
router.get('/districts/:id', locationCtrl.getDistrict)
router.post('/districts', requireAuth, validate(createDistrictSchema), locationCtrl.createDistrict)
router.patch('/districts/:id', requireAuth, validate(updateDistrictSchema), locationCtrl.updateDistrict)
router.delete('/districts/:id', requireAuth, locationCtrl.deleteDistrict)

// Upazilas
router.get('/upazilas', locationCtrl.getUpazilas)
router.get('/upazilas/:id', locationCtrl.getUpazilla)
router.post('/upazilas', requireAuth, validate(createUpazillaSchema), locationCtrl.createUpazilla)
router.patch('/upazilas/:id', requireAuth, validate(updateUpazillaSchema), locationCtrl.updateUpazilla)
router.delete('/upazilas/:id', requireAuth, locationCtrl.deleteUpazilla)

module.exports = router
