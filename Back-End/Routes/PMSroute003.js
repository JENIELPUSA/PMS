const express = require('express');
const router = express.Router();//express router
const PMScontroller = require('./../Controller/PMS003controller')
const authController = require('./../Controller/authController')

router.route('/')
    .post(authController.protect, PMScontroller.createPMS002)
    .get(authController.protect, PMScontroller.getAllPMS002)

router
    .route("/DisplayAllPMS003")
    .get(authController.protect, PMScontroller.DisplayAllPMS003);


router
    .route("/FindByEquipment")
    .get(authController.protect, PMScontroller.FindByEquipment);

router
    .route("/FindByCode/:code")
    .get(authController.protect, PMScontroller.FindByCode);


router.route('/:id')
    .patch(authController.protect, PMScontroller.updatePMS002)
    .delete(authController.protect, PMScontroller.deletePMS002)

module.exports = router