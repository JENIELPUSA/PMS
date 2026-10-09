const express = require('express');
const router = express.Router();//express router
const PMScontroller = require('../Controller/PMS006controller')
const authController = require('../Controller/authController')

router.route('/')
    .post(authController.protect, PMScontroller.createPMS006)
    .get(authController.protect, PMScontroller.getAllPMS006)

router.route('/DisplayAllPMS006')
    .get(authController.protect, PMScontroller.DisplayAllPMS006)

router
    .route("/FindByEquipment")
    .get(authController.protect, PMScontroller.FindByEquipment);

router.route('/:id')
    .patch(authController.protect, PMScontroller.updatePMS006)
    .delete(authController.protect, PMScontroller.deletePMS006)

module.exports = router