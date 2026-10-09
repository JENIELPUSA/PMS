const express = require('express');
const router = express.Router();//express router
const pmsMaintenanceRoute = require('./../Controller/PMSMaintenanceRecordController')
const authController = require('./../Controller/authController')

router.route('/')
    .post(authController.protect,pmsMaintenanceRoute.AddMaintenanceRecord)
    .get(authController.protect,pmsMaintenanceRoute.DisplayMaintenanceRecords)



router.route('/DisplayEquipmentMaintenance/:equipmentId')
    .get(authController.protect,pmsMaintenanceRoute.DisplayByEquipmentRecord)

router.route('/:id')
    .patch(authController.protect,pmsMaintenanceRoute.UpdateMaintenanceRecord)
    .delete(authController.protect,pmsMaintenanceRoute.DeleteMaintenanceRecord)

module.exports=router