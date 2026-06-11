var express = require('express')
var router = express.Router()
var requireAuth = require('../middleware/auth')
var validate = require('../middleware/validate')
var { createSessionSchema } = require('../validators/sleepValidator')
var sleepCtrl = require('../controllers/sleepController')

router.use(requireAuth)

router.get('/sessions', sleepCtrl.listSessions)
router.post('/sessions', validate(createSessionSchema), sleepCtrl.createSession)

module.exports = router
