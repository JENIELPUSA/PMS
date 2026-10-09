const express = require('express');
const router = express.Router();//express router
const PMScontroller = require('./../Controller/PMS001controller')
const authController = require('./../Controller/authController')

router.route('/')
    .post(authController.protect,PMScontroller.createPMS001)
    .get(authController.protect,PMScontroller.getAllPMS001)

router.route('/DisplayAllPMS001')
    .get(authController.protect,PMScontroller.DisplayAllPMS001)



router.route('/:id')
    .patch(authController.protect,PMScontroller.updatePMS001)
    .delete(authController.protect,PMScontroller.deletePMS001)

module.exports=router