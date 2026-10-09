const express = require('express');
const router = express.Router();//express router
const PMScontroller = require('./../Controller/PMS002controller')
const authController = require('./../Controller/authController')

router.route('/')
    .post(authController.protect, PMScontroller.createPMS002)
    .get(authController.protect, PMScontroller.getAllPMS002)

router.route('/DisplayAllPMS002')
    .get(authController.protect, PMScontroller.DisplayAllPMS002)
    
router
    .route("/FindByEquipment")
    .get(authController.protect, PMScontroller.FindByEquipment);


router.route('/:id')
    .patch(authController.protect, PMScontroller.updatePMS002)
    .delete(authController.protect, PMScontroller.deletePMS002)

module.exports = router