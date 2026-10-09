const express = require('express');
const router = express.Router();//express router
const PMScontroller = require('./../Controller/PMS005controller')
const authController = require('./../Controller/authController')

router.route('/')
    .post(authController.protect, PMScontroller.createPMS005)
    .get(authController.protect, PMScontroller.getAllPMS005)

router.route('/DisplayAllPMS005')
    .get(authController.protect, PMScontroller.DisplayAllPMS005)

router
    .route("/FindByEquipment")
    .get(authController.protect, PMScontroller.FindByEquipment);

router.route('/:id')
    .patch(authController.protect, PMScontroller.updatePMS005)
    .delete(authController.protect, PMScontroller.deletePMS005)

module.exports = router