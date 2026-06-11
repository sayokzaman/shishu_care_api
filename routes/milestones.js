var express = require('express')
var router = express.Router()
var requireAuth = require('../middleware/auth')
var milestoneCtrl = require('../controllers/milestoneController')

router.use(requireAuth)

router.get('/', milestoneCtrl.listForBracket)
router.patch('/:milestoneId/toggle', milestoneCtrl.toggle)
router.patch('/:milestoneId/flag', milestoneCtrl.flag)

module.exports = router
