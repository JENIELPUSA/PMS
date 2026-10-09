const express = require('express');
const router = express.Router();//express router
const PMScontroller = require('../Controller/PMSstatisticalController')
const authController = require('../Controller/authController')

router.route('/')
    .get(authController.protect, PMScontroller.FindStatistical)

module.exports = router