const AsyncErrorHandler = require("../Utils/AsyncErrorHandler");
const assign = require("./../Models/AssigningEquipment");
const TypesMaintenances = require("../Models/TypesOfMaintenace");
const CustomError = require("./../Utils/CustomError");
const Apifeatures = require("./../Utils/ApiFeatures");
const mongoose = require("mongoose");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const Laboratory = require("../Models/Laboratory")

exports.AssignEquipment = AsyncErrorHandler(async (req, res) => {
  // Create the AssignEquipment document
  const Assign = await assign.create(req.body); // Use 'Assign' model with the pre-save hook

  // Send a success response after the document is created and saved
  res.status(201).json({
    status: "success",
    data: Assign,
  });
});

exports.displayAssign = AsyncErrorHandler(async (req, res) => {
  const userID = req.user._id;
  const role = req.user.role;

  // ============================================================
  // STEP 1: Base filter — walang filter (para sa Admin/other roles)
  // ============================================================
  let matchStage = {};

  // ============================================================
  // STEP 2: Kung role === "User", i-filter base sa Laboratory ng Encharge
  // ============================================================
  if (role === "User") {
    const laboratory = await Laboratory.findOne({ Encharge: userID });

    console.log("laboratory", laboratory);

    if (!laboratory) {
      return res.status(404).json({
        status: "fail",
        message: "You are not assigned as Encharge to any laboratory.",
      });
    }

    // ✅ I-match ang assign.Laboratory sa laboratory._id
    matchStage.Laboratory = laboratory._id;
  }

  console.log("role", role);

  // ============================================================
  // STEP 3: Apifeatures — dito papasok ang matchStage
  // ============================================================
  const features = new Apifeatures(assign.find(matchStage), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const filterAssign = await features.query;

  // ============================================================
  // STEP 4: Aggregation
  // ============================================================
  let assigns = await assign.aggregate([
    { $match: { _id: { $in: filterAssign.map((tool) => tool._id) } } },

    // ---------------- Join Laboratories ----------------
    {
      $lookup: {
        from: "laboratories",
        localField: "Laboratory",
        foreignField: "_id",
        as: "LaboratoryInfo",
      },
    },
    { $unwind: { path: "$LaboratoryInfo", preserveNullAndEmptyArrays: true } },

    // ---------------- Join Encharge Users ----------------
    {
      $lookup: {
        from: "users",
        localField: "LaboratoryInfo.Encharge",
        foreignField: "_id",
        as: "EnchargeInfo",
      },
    },
    { $unwind: { path: "$EnchargeInfo", preserveNullAndEmptyArrays: true } },

    // ---------------- Join Departments ----------------
    {
      $lookup: {
        from: "departments",
        localField: "LaboratoryInfo.department",
        foreignField: "_id",
        as: "DepartmentInfo",
      },
    },
    { $unwind: { path: "$DepartmentInfo", preserveNullAndEmptyArrays: true } },

    // ---------------- Join Equipments ----------------
    {
      $lookup: {
        from: "equipment",
        localField: "Equipments",
        foreignField: "_id",
        as: "EquipmentsInfo",
      },
    },
    { $unwind: { path: "$EquipmentsInfo", preserveNullAndEmptyArrays: true } },

    // ---------------- Join Categories ----------------
    {
      $lookup: {
        from: "categories",
        localField: "EquipmentsInfo.Category",
        foreignField: "_id",
        as: "CategoryInfo",
      },
    },
    { $unwind: { path: "$CategoryInfo", preserveNullAndEmptyArrays: true } },

    // ---------------- Join Maintenance Schedule ----------------
    {
      $lookup: {
        from: "maintenanceschedules",
        let: { eqId: "$EquipmentsInfo._id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$equipmentType", "$$eqId"] } } },
          { $sort: { lastMaintenanceDate: -1 } },
          { $limit: 1 },
        ],
        as: "MaintenanceInfo",
      },
    },
    {
      $addFields: {
        "EquipmentsInfo.hasMaintenance": {
          $cond: [{ $gt: [{ $size: "$MaintenanceInfo" }, 0] }, true, false],
        },
        "EquipmentsInfo.lastMaintenanceDate": {
          $ifNull: [
            { $arrayElemAt: ["$MaintenanceInfo.lastMaintenanceDate", 0] },
            null,
          ],
        },
        "EquipmentsInfo.nextMaintenanceDate": {
          $ifNull: [
            { $arrayElemAt: ["$MaintenanceInfo.nextMaintenanceDate", 0] },
            null,
          ],
        },
      },
    },

    {
      $group: {
        _id: "$LaboratoryInfo.LaboratoryName",
        assignCount: { $sum: 1 },
        assignLabId: { $first: "$_id" },
        laboratoryId: { $first: "$LaboratoryInfo._id" },
        departmentId: { $first: "$DepartmentInfo._id" },
        enchargeId: { $first: "$EnchargeInfo._id" },
        encharge: { $first: "$EnchargeInfo" },
        departmentName: { $first: "$DepartmentInfo.DepartmentName" },
        equipments: {
          $addToSet: {
            $mergeObjects: [
              "$EquipmentsInfo",
              { categoryName: "$CategoryInfo.CategoryName" },
            ],
          },
        },
        categories: { $addToSet: "$CategoryInfo.CategoryName" },
      },
    },

    {
      $project: {
        _id: 1,
        assignCount: 1,
        assignLabId: 1,
        laboratoryId: 1,
        departmentId: 1,
        laboratoryName: "$_id",
        encharge: {
          $concat: [
            "$encharge.FirstName",
            " ",
            { $ifNull: ["$encharge.Middle", ""] },
            " ",
            "$encharge.LastName",
          ],
        },
        departmentName: 1,
        equipments: 1,
        enchargeId: 1,
        equipmentsCount: { $size: { $ifNull: ["$equipments", []] } },
      },
    },
  ]);

  res.status(200).json({
    status: "success",
    role: role,
    data: assigns,
  });
});

exports.UpdateEquipments = AsyncErrorHandler(async (req, res, next) => {
  const { id } = req.params;

  // Validate the ID
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res
      .status(400)
      .json({ status: "fail", message: "Invalid ID format" });
  }

  // Find the existing assignment to check its status
  const existingAssignment = await assign.findById(id);
  if (!existingAssignment) {
    return res.status(404).json({
      status: "fail",
      message: "Laboratory not found",
    });
  }

  // Check if the status is "Available" and update to "Not Available"
  if (existingAssignment.Status === "Available") {
    req.body.Status = "Not Available"; // Force update the status to "Not Available"
  } else if (existingAssignment.Status === "Not Available") {
    req.body.Status = "Available"; // Force update the status to "Not Available"
  }

  // Update the assignment
  const updateResult = await assign.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!updateResult) {
    return res.status(404).json({
      status: "fail",
      message: "Laboratory not found after update",
    });
  }

  // Use an aggregation pipeline to perform the lookups
  const AssignEquipment = await assign.aggregate([
    {
      $match: { _id: new mongoose.Types.ObjectId(id) },
    },
    // Lookup for Laboratory -> Encharge -> department
    {
      $lookup: {
        from: "laboratories",
        localField: "Laboratory",
        foreignField: "_id",
        as: "LaboratoryData",
      },
    },
    { $unwind: { path: "$LaboratoryData", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "encharges",
        localField: "LaboratoryData.Encharge",
        foreignField: "_id",
        as: "LaboratoryData.Encharge",
      },
    },
    {
      $unwind: {
        path: "$LaboratoryData.Encharge",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "departments",
        localField: "LaboratoryData.Encharge.department",
        foreignField: "_id",
        as: "LaboratoryData.Encharge.department",
      },
    },
    {
      $unwind: {
        path: "$LaboratoryData.Encharge.department",
        preserveNullAndEmptyArrays: true,
      },
    },

    // Lookup for Equipments -> Category
    {
      $lookup: {
        from: "equipments",
        localField: "Equipments",
        foreignField: "_id",
        as: "EquipmentsData",
      },
    },
    {
      $unwind: { path: "$EquipmentsData", preserveNullAndEmptyArrays: true },
    },
    {
      $lookup: {
        from: "categories",
        localField: "EquipmentsData.Category",
        foreignField: "_id",
        as: "EquipmentsData.Category",
      },
    },
    {
      $unwind: {
        path: "$EquipmentsData.Category",
        preserveNullAndEmptyArrays: true,
      },
    },

    // Group back Equipments with categories (if needed)
    {
      $group: {
        _id: "$_id",
        Laboratory: { $first: "$LaboratoryData" },
        Equipments: { $push: "$EquipmentsData" },
        otherFields: { $first: "$$ROOT" }, // Preserve other fields
      },
    },
    // Add the rest of the fields back to the root object
    {
      $addFields: {
        Laboratory: "$Laboratory",
        Equipments: "$Equipments",
      },
    },
    { $unset: ["otherFields._id"] }, // Optional: Remove unnecessary fields
  ]);

  if (!AssignEquipment || AssignEquipment.length === 0) {
    return res.status(404).json({
      status: "fail",
      message: "Laboratory not found after update.",
    });
  }

  // Return the first matched document
  res.status(200).json({
    status: "success",
    totalLaboratory: AssignEquipment.length,
    data: AssignEquipment[0],
  });
});

exports.deleteAssign = AsyncErrorHandler(async (req, res) => {
  await assign.findByIdAndDelete(req.params.id);
  res.status(201).json({
    status: "success",
    data: {
      message: `This Data successfully Deleted!`,
    },
  });
});

exports.getAssignmentsByLaboratoryName = AsyncErrorHandler(async (req, res) => {
  const laboratoryName = req.params.LaboratoryName; // Get laboratory name from the request parameters

  // Use Apifeatures to filter, sort, limit, and paginate the data
  const features = new Apifeatures(assign.find(), req.query)
    .filter() // Apply filters
    .sort() // Apply sorting
    .limitFields() // Limit fields in response
    .paginate(); // Apply pagination

  let displayuser = await features.query; // Execute the query after applying all features

  const AssignEquipment = await assign.aggregate([
    // First lookup: Join 'laboratories' collection
    {
      $lookup: {
        from: "laboratories", // The collection you are joining
        localField: "Laboratory", // Field in assign collection
        foreignField: "_id", // Field in laboratories collection
        as: "LaboratoryInfo", // The alias to store the joined data
      },
    },
    {
      $unwind: {
        path: "$LaboratoryInfo",
        preserveNullAndEmptyArrays: true, // In case there are no laboratory matches
      },
    },
    // Filter by Laboratory name (case-insensitive)
    {
      $match: {
        "LaboratoryInfo.LaboratoryName": {
          $regex: new RegExp(laboratoryName, "i"),
        },
      },
    },
    // Second lookup: Join 'users' collection (Encharge)
    {
      $lookup: {
        from: "users", // The users collection
        localField: "LaboratoryInfo.Encharge", // Field in laboratories collection (foreign key)
        foreignField: "_id", // Field in users collection
        as: "EnchargeInfo", // The alias to store the joined data
      },
    },
    {
      $unwind: {
        path: "$EnchargeInfo",
        preserveNullAndEmptyArrays: true, // If no encharge, preserve the record
      },
    },
    // Third lookup: Join 'departments' collection
    {
      $lookup: {
        from: "departments", // The department collection
        localField: "LaboratoryInfo.department", // Field in laboratories collection
        foreignField: "_id", // Field in departments collection
        as: "DepartmentInfo", // The alias to store the joined data
      },
    },
    {
      $unwind: {
        path: "$DepartmentInfo",
        preserveNullAndEmptyArrays: true,
      },
    },
    // Fourth lookup: Join 'equipment' collection
    {
      $lookup: {
        from: "equipment", // The equipment collection
        localField: "Equipments", // Field in assign collection (array)
        foreignField: "_id", // Field in equipment collection
        as: "EquipmentsInfo", // The alias to store the joined data
      },
    },
    {
      $unwind: {
        path: "$EquipmentsInfo",
        preserveNullAndEmptyArrays: true,
      },
    },
    // Fifth lookup: Join 'categories' collection
    {
      $lookup: {
        from: "categories", // The category collection
        localField: "EquipmentsInfo.Category", // Field in equipment collection
        foreignField: "_id", // Field in category collection
        as: "CategoryInfo", // The alias to store the joined data
      },
    },
    {
      $unwind: {
        path: "$CategoryInfo",
        preserveNullAndEmptyArrays: true,
      },
    },
    // Project only the fields you want to return
    {
      $project: {
        _id: 1,
        RefNo: 1,
        "LaboratoryInfo.LaboratoryName": 1,
        "EnchargeInfo.EnchargeName": {
          $concat: [
            "$EnchargeInfo.FirstName",
            " ", // First Name
            { $ifNull: ["$EnchargeInfo.Middle", ""] },
            " ", // Optional Middle Name
            "$EnchargeInfo.LastName", // Last Name
          ],
        },
        "DepartmentInfo.DepartmentName": 1,
        "EquipmentsInfo.Brand": 1,
        "EquipmentsInfo.SerialNumber": 1,
        "EquipmentsInfo.Specification": 1,
        "CategoryInfo.CategoryName": 1,
      },
    },
  ]);

  // Check if no assignments are found
  if (!AssignEquipment.length) {
    return res
      .status(404)
      .json({ message: "No assignments found for the specified laboratory." });
  }

  // Return the filtered assignments with related information
  createSendResponse(AssignEquipment, 200, res);
});

exports.GetidAssign = AsyncErrorHandler(async (req, res, next) => {
  const Assigk = await assign.findById(req.params.id);
  if (!Assigk) {
    const error = new CustomError("User with the ID is not found", 404);
    return next(error);
  }
  res.status(200).json({
    status: "Success",
    data: Assigk,
  });
});

exports.AssignRemove = AsyncErrorHandler(async (req, res) => {
  // 1st Validation: Check if assignId and equipmentId are provided and valid ObjectIds
  const { assignId, equipmentId } = req.query;

  if (!assignId || !equipmentId) {
    return res.status(400).json({
      status: "fail",
      message: "AssignId and EquipmentId must be provided.",
    });
  }

  // Validate if assignId and equipmentId are valid MongoDB ObjectIds
  if (
    !mongoose.Types.ObjectId.isValid(assignId) ||
    !mongoose.Types.ObjectId.isValid(equipmentId)
  ) {
    return res.status(400).json({
      status: "fail",
      message: "Invalid AssignId or EquipmentId format.",
    });
  }

  // Convert assignId and equipmentId to ObjectId
  const assignObjectId = mongoose.Types.ObjectId(assignId);
  const equipmentObjectId = mongoose.Types.ObjectId(equipmentId);

  // 2nd Validation: Check if the assignId exists in the database and contains the equipmentId
  const assignment = await assign.findById(assignObjectId);

  if (!assignment) {
    return res.status(404).json({
      status: "fail",
      message: "Assignment with the provided assignId not found.",
    });
  }

  // Check if the equipmentId is part of the assignment's Equipments array
  const equipmentExists = assignment.Equipments.some(
    (equipment) => equipment.toString() === equipmentObjectId.toString(),
  );

  if (!equipmentExists) {
    return res.status(404).json({
      status: "fail",
      message:
        "Equipment with the provided equipmentId not found in this assignment.",
    });
  }

  // Remove the equipment from the Equipments array
  assignment.Equipments = assignment.Equipments.filter(
    (equipment) => equipment.toString() !== equipmentObjectId.toString(),
  );

  // Save the updated assignment back to the database
  await assignment.save();

  res.status(200).json({
    status: "success",
    message: "Equipment removed successfully from the assignment.",
  });
});


exports.displayAssignHistory = AsyncErrorHandler(async (req, res, next) => {
    // 1. DYNAMIC SEARCH ID
    const searchID = req.query.laboratory || req.query.department;

    let matchStage = {};
    if (searchID) {
        const objectId = new mongoose.Types.ObjectId(searchID);
        matchStage = {
            $or: [
                { Laboratory: objectId },
                { "LaboratoryInfo.department": objectId },
            ],
        };
    }

    // 2. AUTO-GENERATE DOCUMENT NUMBER & EFFECTIVE DATE
    const totalCount = await assign.countDocuments();
    const formattedNumber = String(totalCount + 1).padStart(3, '0');
    const dynamicDocNo = `BIPSU-QAA-PMS-${formattedNumber}`;

    const today = new Date();
    const effectiveDate = today.toLocaleDateString('en-US', {
        month: 'long',
        day: '2-digit',
        year: 'numeric'
    });

    // 3. AGGREGATION PIPELINE
    const assigns = await assign.aggregate([
        {
            $lookup: {
                from: "laboratories",
                localField: "Laboratory",
                foreignField: "_id",
                as: "LaboratoryInfo",
            },
        },
        { $unwind: { path: "$LaboratoryInfo", preserveNullAndEmptyArrays: true } },
        ...(searchID ? [{ $match: matchStage }] : []),
        {
            $lookup: {
                from: "users",
                localField: "LaboratoryInfo.Encharge",
                foreignField: "_id",
                as: "EnchargeInfo",
            },
        },
        { $unwind: { path: "$EnchargeInfo", preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: "departments",
                localField: "LaboratoryInfo.department",
                foreignField: "_id",
                as: "DepartmentInfo",
            },
        },
        { $unwind: { path: "$DepartmentInfo", preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: "equipment",
                localField: "Equipments",
                foreignField: "_id",
                as: "EquipmentsInfo",
            },
        },
        { $unwind: { path: "$EquipmentsInfo", preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: "categories",
                localField: "EquipmentsInfo.Category",
                foreignField: "_id",
                as: "CategoryInfo",
            },
        },
        { $unwind: { path: "$CategoryInfo", preserveNullAndEmptyArrays: true } },
        {
            $group: {
                _id: "$LaboratoryInfo.LaboratoryName",
                encharge: { $first: "$EnchargeInfo" },
                departmentName: { $first: "$DepartmentInfo.DepartmentName" },
                equipments: {
                    $addToSet: {
                        $mergeObjects: [
                            "$EquipmentsInfo",
                            { categoryName: "$CategoryInfo.CategoryName" },
                        ],
                    },
                },
            },
        },
        {
            $project: {
                laboratoryName: "$_id",
                encharge: {
                    $concat: [
                        "$encharge.FirstName", " ",
                        { $ifNull: ["$encharge.Middle", ""] }, " ",
                        "$encharge.LastName",
                    ],
                },
                departmentName: 1,
                equipments: 1,
            },
        },
    ]);

    if (!assigns || assigns.length === 0) {
        return next(new CustomError("No records found.", 404));
    }

    // 4. PDF CONFIG
    const doc = new PDFDocument({ size: "A4", layout: "portrait", margin: 30 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=History_Report_${formattedNumber}.pdf`);
    doc.pipe(res);

    const margin = 30;
    const tableWidth = doc.page.width - margin * 2;
    let currentY = margin;

    const col = {
        code: 40, name: 110, date: 50, status: 80, type: 70, breakdown: 70, avail: 60, remarks: 55 
    };

    const drawHeader = (labName, deptName) => {
        doc.rect(margin, currentY, tableWidth, 80).stroke();
        const logoPath = path.join(__dirname, "../public/image/logo.jpg");
        if (fs.existsSync(logoPath)) doc.image(logoPath, margin + 5, currentY + 5, { width: 70 });
        doc.moveTo(margin + 80, currentY).lineTo(margin + 80, currentY + 80).stroke();

        const infoWidth = 130;
        const infoX = margin + tableWidth - infoWidth;
        doc.moveTo(infoX, currentY).lineTo(infoX, currentY + 80).stroke();

        doc.fontSize(7).font("Helvetica");
        const rowH = 20;
        for(let i=1; i<=3; i++) {
            doc.moveTo(infoX, currentY + (rowH * i)).lineTo(margin + tableWidth, currentY + (rowH * i)).stroke();
        }

        doc.text("Document No:", infoX + 5, currentY + 5);
        doc.font("Helvetica-Bold").text(dynamicDocNo, infoX + 5, currentY + 12);
        doc.font("Helvetica").text("Page: 1 of 1", infoX + 5, currentY + rowH + 8);
        doc.text("Effective Date:", infoX + 5, currentY + (rowH * 2) + 5);
        doc.font("Helvetica-Bold").text(effectiveDate, infoX + 5, currentY + (rowH * 2) + 12);
        doc.font("Helvetica").text("Issuance/Revision: 02/01", infoX + 5, currentY + (rowH * 3) + 8);

        const centerWidth = tableWidth - 80 - infoWidth;
        const centerX = margin + 80;
        doc.font("Helvetica-Bold").fontSize(9).text("QUALITY MANAGEMENT SYSTEM", centerX, currentY + 15, { align: 'center', width: centerWidth });
        doc.text("PERIODIC MAINTENANCE SYSTEM - FORM", centerX, currentY + 25, { align: 'center', width: centerWidth });
        doc.moveTo(centerX, currentY + 40).lineTo(infoX, currentY + 40).stroke();
        doc.fontSize(10).text("EQUIPMENT/TOOL HISTORY FILE", centerX, currentY + 55, { align: 'center', width: centerWidth });

        currentY += 95;
        doc.font("Helvetica-Bold").fontSize(10).text("SCHOOL/OFFICE OF:", margin, currentY);
        doc.font("Helvetica").text(`${deptName || ""} / ${labName || ""}`, margin + 110, currentY);
        doc.moveTo(margin + 108, currentY + 11).lineTo(margin + tableWidth, currentY + 11).stroke();

        currentY += 25;

        // TABLE GRID HEADER
        doc.rect(margin, currentY, tableWidth, 50).stroke();
        let curX = margin;
        doc.fontSize(7).font("Helvetica-Bold");
        
        doc.text("Code No.", curX, currentY + 15, { width: col.code, align: 'center' }); curX += col.code;
        doc.moveTo(curX, currentY).lineTo(curX, currentY + 50).stroke();
        doc.text("Name of Equipment/Tools", curX, currentY + 10, { width: col.name, align: 'center' }); curX += col.name;
        doc.moveTo(curX, currentY).lineTo(curX, currentY + 50).stroke();
        doc.text("Date Acquired", curX, currentY + 15, { width: col.date, align: 'center' }); curX += col.date;
        doc.moveTo(curX, currentY).lineTo(curX, currentY + 50).stroke();

        doc.text("Status", curX, currentY + 5, { width: col.status, align: 'center' });
        doc.moveTo(curX, currentY + 15).lineTo(curX + col.status, currentY + 15).stroke();
        doc.fontSize(5.5).text("Serviceable", curX, currentY + 25, { width: 40, align: 'center' });
        doc.moveTo(curX + 40, currentY + 15).lineTo(curX + 40, currentY + 50).stroke();
        doc.text("Non-Serviceable", curX + 40, currentY + 25, { width: 40, align: 'center' }); curX += col.status;
        doc.moveTo(curX, currentY).lineTo(curX, currentY + 50).stroke();

        doc.fontSize(7).text("Type/Category", curX, currentY + 15, { width: col.type, align: 'center' }); curX += col.type;
        doc.moveTo(curX, currentY).lineTo(curX, currentY + 50).stroke();

        doc.text("Breakdown", curX, currentY + 5, { width: col.breakdown, align: 'center' });
        doc.moveTo(curX, currentY + 15).lineTo(curX + col.breakdown, currentY + 15).stroke();
        doc.text("No.", curX, currentY + 25, { width: 35, align: 'center' });
        doc.moveTo(curX + 35, currentY + 15).lineTo(curX + 35, currentY + 50).stroke();
        doc.text("Duration", curX + 35, currentY + 25, { width: 35, align: 'center' }); curX += col.breakdown;
        doc.moveTo(curX, currentY).lineTo(curX, currentY + 50).stroke();

        doc.fontSize(6).text("Availability & Utilization", curX, currentY + 2, { width: col.avail, align: 'center' });
        doc.moveTo(curX, currentY + 15).lineTo(curX + col.avail, currentY + 15).stroke();
        doc.fontSize(7).text("Yes", curX, currentY + 25, { width: 30, align: 'center' });
        doc.moveTo(curX + 30, currentY + 15).lineTo(curX + 30, currentY + 50).stroke();
        doc.text("No", curX + 30, currentY + 25, { width: 30, align: 'center' }); curX += col.avail;
        doc.moveTo(curX, currentY).lineTo(curX, currentY + 50).stroke();

        doc.text("Remarks", curX, currentY + 15, { width: col.remarks, align: 'center' });
        currentY += 50;
    };

    assigns.forEach((lab, idx) => {
        if (idx > 0) { doc.addPage({ layout: "portrait" }); currentY = margin; }
        drawHeader(lab.laboratoryName, lab.departmentName);

        lab.equipments.forEach((eq) => {
            const equipmentFullName = `${eq.Brand || ""} - ${eq.Specification || ""}`;
            const rowHeight = Math.max(doc.heightOfString(equipmentFullName, { width: 100 }) + 10, 25);

            // LOGIC FOR REMARKS AND CHECKMARKS
            const statusStr = eq.remarks ? eq.remarks.toString().toLowerCase().trim() : "";
            const isActive = (statusStr === "active" || statusStr === "functional" || statusStr === "available");
            
            const remarksValue = isActive ? "Functional" : "NotFunctional";
            
            // X positions for checkmarks
            const statusCheckX = margin + col.code + col.name + col.date; // Base ng Serviceable
            const availCheckX = statusCheckX + col.status + col.type + col.breakdown; // Base ng Avail/Util

            if (currentY + rowHeight > 750) {
                doc.addPage({ layout: "portrait" }); currentY = margin;
                drawHeader(lab.laboratoryName, lab.departmentName);
            }

            // Draw Row Rect and Vertical Lines
            doc.rect(margin, currentY, tableWidth, rowHeight).stroke();
            let xPos = margin;
            [40, 110, 50, 40, 40, 70, 35, 35, 30, 30].forEach(w => {
                xPos += w;
                doc.moveTo(xPos, currentY).lineTo(xPos, currentY + rowHeight).stroke();
            });

            doc.font("Helvetica").fontSize(7);
            doc.text(eq.SerialNumber || "", margin, currentY + 8, { width: 40, align: 'center' });
            doc.text(equipmentFullName, margin + 45, currentY + 8, { width: 100 });
            
            const dateStr = eq.DateTime ? new Date(eq.DateTime).toLocaleDateString() : "N/A";
            doc.text(dateStr, margin + 150, currentY + 8, { width: 50, align: 'center' });

            // --- CHECKMARK LOGIC (ZapfDingbats "4" is Checkmark) ---
            doc.font("ZapfDingbats").fontSize(10);
            if (isActive) {
                // Serviceable Check
                doc.text("4", statusCheckX, currentY + 8, { width: 40, align: 'center' });
                // Availability (Yes) Check
                doc.text("4", availCheckX, currentY + 8, { width: 30, align: 'center' });
            } else {
                // Non-Serviceable Check
                doc.text("4", statusCheckX + 40, currentY + 8, { width: 40, align: 'center' });
                // Utilization (No) Check
                doc.text("4", availCheckX + 30, currentY + 8, { width: 30, align: 'center' });
            }

            doc.font("Helvetica").fontSize(7);
            doc.text(eq.categoryName || "", margin + 280, currentY + 8, { width: 70, align: 'center' });
            
            // --- UPDATED REMARKS ---
            doc.text(remarksValue, margin + tableWidth - 55, currentY + 8, { width: 55, align: 'center' });

            currentY += rowHeight;
        });

        currentY += 40;
        doc.font("Helvetica").fontSize(9);
        doc.text("Prepared:", margin, currentY);
        doc.font("Helvetica-Bold").text(lab.encharge || "", margin + 50, currentY);

        doc.font("Helvetica").text("Attested: ________________", margin + 210, currentY);
        doc.text("Approved: ________________", margin + 410, currentY);
    });

    doc.end();
});
