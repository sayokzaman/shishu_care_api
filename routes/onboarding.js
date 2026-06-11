var express = require('express')
var router = express.Router()

var requireAuth = require('../middleware/auth')
var validate = require('../middleware/validate')
var { prenatalSchema, postnatalSchema } = require('../validators/onboardingValidator')
var onboardingCtrl = require('../controllers/onboardingController')

// Screen: Onboarding - Prenatal  →  EDD, duration, weight, conditions, nickname, gender
router.post('/prenatal', requireAuth, validate(prenatalSchema), onboardingCtrl.completePrenatal)

// Screen: Onboarding - Postnatal  →  child name, DOB, sex, weight, height, conditions, guardian
router.post('/postnatal', requireAuth, validate(postnatalSchema), onboardingCtrl.completePostnatal)

module.exports = router
