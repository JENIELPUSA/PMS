const AsyncErrorHandler = require("../Utils/AsyncErrorHandler");
const tools = require("./../Models/Equipment");
const mongoose = require("mongoose");
const Apifeatures = require("./../Utils/ApiFeatures");
const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");
const CustomError = require("../Utils/CustomError");
const Equipment = require("../Models/Equipment");
const Laboratory = require("../Models/Laboratory");
const Assign = require("../Models/AssigningEquipment");
const PMSMaintenanceController=require("../Models/PMS001")

// Mapping of collections and their corresponding field names
const collectionFieldMapping = {
  RequestMaintenance: "Equipments", // 'Equipments' is the field that references the Equipment model
  Assign: "Equipments",
  IncomingMaintenance: "Equipments",
};
const TypesMaintenances = require("../Models/TypesOfMaintenace");

exports.Displaytool = AsyncErrorHandler(async (req, res) => {
  // Apply Apifeatures methods on the query
  const features = new Apifeatures(tools.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  // Fetch filtered and paginated data first
  const filteredTools = await features.query;

  // Apply aggregation only on the filteredTools
  const Equipment = await tools.aggregate([
    {
      $match: {
        _id: { $in: filteredTools.map((tool) => tool._id) },
      },
    },

    // ---------------- CATEGORY ----------------
    {
      $lookup: {
        from: "categories",
        localField: "Category",
        foreignField: "_id",
        as: "CategoryData",
      },
    },
    { $unwind: { path: "$CategoryData", preserveNullAndEmptyArrays: true } },

    // ---------------- ASSIGN ----------------
    {
      $lookup: {
        from: "assigns",
        localField: "_id",
        foreignField: "Equipments",
        as: "AssignData",
      },
    },
    { $unwind: { path: "$AssignData", preserveNullAndEmptyArrays: true } },

    // ---------------- LABORATORY ----------------
    {
      $lookup: {
        from: "laboratories",
        localField: "AssignData.Laboratory",
        foreignField: "_id",
        as: "LaboratoryData",
      },
    },
    { $unwind: { path: "$LaboratoryData", preserveNullAndEmptyArrays: true } },

    // ---------------- DEPARTMENT ----------------
    {
      $lookup: {
        from: "departments",
        localField: "LaboratoryData.department",
        foreignField: "_id",
        as: "DepartmentData",
      },
    },
    { $unwind: { path: "$DepartmentData", preserveNullAndEmptyArrays: true } },

    // ---------------- MAINTENANCE ----------------
    {
      $lookup: {
        from: "maintenanceschedules",
        let: { equipmentId: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$equipmentType", "$$equipmentId"] } } },
          { $sort: { lastMaintenanceDate: -1 } },
          { $limit: 1 },
          {
            $project: {
              _id: 1,
              nextMaintenanceDate: 1,
              lastMaintenanceDate: 1,
              scheduleType: 1,
              assignedTechnician: 1,
            },
          },
        ],
        as: "MaintenanceData",
      },
    },
    {
      $addFields: {
        hasMaintenance: { $gt: [{ $size: "$MaintenanceData" }, 0] },
        nextMaintenanceDate: {
          $cond: [
            { $gt: [{ $size: "$MaintenanceData" }, 0] },
            { $arrayElemAt: ["$MaintenanceData.nextMaintenanceDate", 0] },
            null,
          ],
        },
        lastMaintenanceDate: {
          $cond: [
            { $gt: [{ $size: "$MaintenanceData" }, 0] },
            { $arrayElemAt: ["$MaintenanceData.lastMaintenanceDate", 0] },
            null,
          ],
        },
        scheduleType: {
          $cond: [
            { $gt: [{ $size: "$MaintenanceData" }, 0] },
            { $arrayElemAt: ["$MaintenanceData.scheduleType", 0] },
            null,
          ],
        },
        assignedTechnician: {
          $cond: [
            { $gt: [{ $size: "$MaintenanceData" }, 0] },
            { $arrayElemAt: ["$MaintenanceData.assignedTechnician", 0] },
            null,
          ],
        },
      },
    },

    // ---------------- FINAL OUTPUT ----------------
    {
      $project: {
        code: 1,
        Brand: 1,
        SerialNumber: 1,
        Specification: 1,
        status: 1,
        remarks: 1,
        DateAcquired: 1,
        createdAt: 1,
        CategoryName: { $ifNull: ["$CategoryData.CategoryName", "N/A"] },
        LaboratoryName: { $ifNull: ["$LaboratoryData.LaboratoryName", null] },
        DepartmentName: { $ifNull: ["$DepartmentData.DepartmentName", null] },
        hasMaintenance: 1,
        lastMaintenanceDate: 1,
        nextMaintenanceDate: 1,
        scheduleType: 1,
        assignedTechnician: 1,
        _id: 1,
      },
    },

    //  SORT BY NEWEST FIRST (Last In, First Out)
    {
      $sort: { createdAt: -1 }, // -1 = pinakabago sa taas
    },
  ]);

  res.status(200).json({
    status: "success",
    totalEquipment: Equipment.length,
    data: Equipment,
  });
});

// Purpose ang code na ito ay para once may ma remove na Equipment ay lahat na releted ay ma remove
// pero naka base siya collectionMapping
exports.deleteEquipmentAndRelated = async (req, res, next) => {
  const { equipmentID } = req.params;

  try {
    // Mag-loop sa collectionFieldMapping at tanggalin ang mga dokumento mula sa bawat koleksyon
    for (const [collectionName, fieldName] of Object.entries(
      collectionFieldMapping,
    )) {
      const collection = mongoose.model(collectionName); // kinukuha yung model sa collection

      // Query upang hanapin ang mga dokumento na tumutugma sa equipmentID sa kaukulang field
      const relatedDocs = await collection.find({ [fieldName]: equipmentID });

      if (relatedDocs.length > 0) {
        // Tanggalin ang lahat ng dokumento na tumutugma sa equipmentID sa koleksyong ito

        await collection.deleteMany({ [fieldName]: equipmentID });
        console.log(
          `Deleted ${relatedDocs.length} documents from ${collectionName}`,
        );
      }
    }

    // Finally, delete the equipment document from the Equipment collection
    await Equipment.deleteOne({ _id: equipmentID });
    console.log("Equipment document deleted successfully.");

    res.status(200).json({
      status: "success",
      message: "Equipment and related documents deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting related documents:", error);
    res.status(500).json({
      status: "fail",
      message: "Error occurred while deleting equipment and related documents.",
    });
  }
};

// Purpose ang code na ito ay para once may ma remove na Equipment ay lahat na releted ay ma remove
// pero naka base siya collectionMapping
exports.RemoverelatedData = async (req, res, next) => {
  const { equipmentID } = req.params; // Assuming equipmentID is passed as a parameter

  try {
    // Mag-loop sa collectionFieldMapping at tanggalin ang mga dokumento mula sa bawat koleksyon
    for (const [collectionName, fieldName] of Object.entries(
      collectionFieldMapping,
    )) {
      const collection = mongoose.model(collectionName); // Kunin ang modelo para sa koleksyon

      // Query upang hanapin ang mga dokumento na tumutugma sa equipmentID sa kaukulang field
      const relatedDocs = await collection.find({ [fieldName]: equipmentID });

      if (relatedDocs.length > 0) {
        // Tanggalin ang lahat ng dokumento na tumutugma sa equipmentID sa koleksyong ito

        await collection.deleteMany({ [fieldName]: equipmentID });
        console.log(
          `Deleted ${relatedDocs.length} documents from ${collectionName}`,
        );
      }
    }
    res.status(200).json({
      status: "success",
      message: "Equipment and related documents deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting related documents:", error);
    res.status(500).json({
      status: "fail",
      message: "Error occurred while deleting equipment and related documents.",
    });
  }
};

exports.createtool = AsyncErrorHandler(async (req, res) => {
  // Validate Category if it's provided
  if (
    req.body.Category &&
    !mongoose.Types.ObjectId.isValid(req.body.Category)
  ) {
    return res.status(400).json({
      status: "fail",
      message: "Invalid Category ID format",
    });
  }

  // Validate required fields (Brand, SerialNumber, and Specification)
  const { Brand, SerialNumber, Specification } = req.body;
  if (!Brand || !SerialNumber || !Specification) {
    return res.status(400).json({
      status: "fail",
      message: "Please fill in all required fields.",
    });
  }

  // Create the new tool
  const newTool = await tools.create(req.body);

  // Check if tool creation was successful
  if (!newTool) {
    return res.status(400).json({
      status: "fail",
      message: "Tool creation failed.",
    });
  }

  // Use aggregation to fetch the newly created tool with joined category details
  const toolWithCategory = await tools.aggregate([
    {
      $match: { _id: newTool._id }, // Match the newly created tool by its ID
    },
    {
      $lookup: {
        from: "categories", // The collection to join
        localField: "Category", // Field in tools that references category ID
        foreignField: "_id", // Field in categories to join on
        as: "CategoryData", // Alias for the joined data
      },
    },
    {
      $unwind: {
        path: "$CategoryData",
        preserveNullAndEmptyArrays: true, // Allow null if no matching category
      },
    },
    {
      $project: {
        code: 1,
        Brand: 1,
        SerialNumber: 1,
        Specification: 1,
        status: 1,
        remarks: 1,
        DateAcquired: 1,
        CategoryName: {
          $ifNull: ["$CategoryData.CategoryName", "N/A"], // Use 'N/A' if CategoryName is missing
        },
        CategoryId: "$CategoryData._id", // Include the Category ID from the joined data
        _id: 1,
      },
    },
  ]);

  // Respond with the tool including category details
  res.status(201).json({
    status: "success",
    data: toolWithCategory[0], // Send the first item in the aggregation result
  });
});

exports.Updatetool = AsyncErrorHandler(async (req, res, next) => {
  // Check if ID is valid
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res
      .status(400)
      .json({ status: "fail", message: "Invalid ID format" });
  }

  //  Filter out empty values - huwag i-update ang fields na walang value
  const filteredBody = {};
  Object.keys(req.body).forEach((key) => {
    const value = req.body[key];
    // Isama lang kung may value (hindi empty string, hindi null, hindi undefined)
    if (value !== "" && value !== null && value !== undefined) {
      filteredBody[key] = value;
    }
  });

  // Update the tool (gamit ang filtered body)
  const updateTool = await tools.findByIdAndUpdate(
    req.params.id,
    filteredBody,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!updateTool) {
    return res.status(404).json({
      status: "fail",
      message: "Tool not found",
    });
  }

  // Use aggregation to retrieve the updated tool with category details
  const toolWithCategory = await tools.aggregate([
    {
      $match: { _id: new mongoose.Types.ObjectId(req.params.id) }, // Ensure `new` is used with ObjectId
    },
    {
      $lookup: {
        from: "categories",
        localField: "Category",
        foreignField: "_id",
        as: "CategoryData",
      },
    },
    {
      $unwind: {
        path: "$CategoryData",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        code: 1,
        Brand: 1,
        SerialNumber: 1,
        Specification: 1,
        status: 1,
        remarks: 1,
        DateAcquired: 1,
        CategoryName: {
          $ifNull: ["$CategoryData.CategoryName", "N/A"],
        },
        CategoryId: "$CategoryData._id",
        _id: 1,
      },
    },
  ]);

  // Return the updated tool data along with category details
  res.status(200).json({
    status: "success",
    totalEquipment: toolWithCategory.length,
    data: toolWithCategory[0], // Return the first (and only) result
  });
});

exports.deletetool = AsyncErrorHandler(async (req, res, next) => {
  await tools.findByIdAndDelete(req.params.id);

  res.status(200).json({
    status: "success",
    data: null,
  });
});

exports.Getidequip = AsyncErrorHandler(async (req, res, next) => {
  const tool = await tools.findById(req.params.id);
  if (!tool) {
    const error = new CustomError("User with the ID is not found", 404);
    return next(error);
  }
  res.status(200).json({
    status: "Success",
    data: tool,
  });
});

exports.getSpecificEquipment = AsyncErrorHandler(async (req, res, next) => {
  const fromDate = req.query.from;
  const toDate = req.query.to;
  const status = req.query.status;

  if (!fromDate || !toDate) {
    return next(new CustomError("Missing required date range", 400));
  }

  let startDate = new Date(fromDate);
  let endDate = new Date(toDate);

  if (isNaN(startDate) || isNaN(endDate)) {
    return next(new CustomError("Invalid date format", 400));
  }

  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  const matchQuery = {
    DateTime: { $gte: startDate, $lte: endDate },
  };
  if (status && status !== "All") {
    matchQuery.status = status;
  }

  const Equipment = await tools.aggregate([
    { $match: matchQuery },

    {
      $lookup: {
        from: "assigns",
        localField: "_id",
        foreignField: "Equipments",
        as: "Assignments",
      },
    },
    {
      $unwind: {
        path: "$Assignments",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "laboratories",
        localField: "Assignments.Laboratory",
        foreignField: "_id",
        as: "LaboratoryData",
      },
    },
    {
      $unwind: {
        path: "$LaboratoryData",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "departments",
        localField: "LaboratoryData.department",
        foreignField: "_id",
        as: "DepartmentData",
      },
    },
    {
      $unwind: {
        path: "$DepartmentData",
        preserveNullAndEmptyArrays: true,
      },
    },

    {
      $group: {
        _id: "$_id",
        DateTime: { $first: "$DateTime" },
        code: { $first: "$code" },
        EquipmentName: { $first: "$EquipmentName" },
        Specification: { $first: "$Specification" },
        Brand: { $first: "$Brand" },
        status: { $first: "$status" },
        Category: { $first: "$Category" },
        remarks: { $first: "$remarks" },
        DateAcquired: { $first: "$DateAcquired" },
        LaboratoryName: {
          $first: { $ifNull: ["$LaboratoryData.LaboratoryName", "N/A"] },
        },
        Department: {
          $first: { $ifNull: ["$DepartmentData.DepartmentName", "N/A"] },
        },
      },
    },
  ]);

  if (!Equipment || Equipment.length === 0) {
    return next(
      new CustomError("No equipment found for the given filters", 404),
    );
  }

  // PDF Generation
  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 60 });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=Equipment_Report_${Date.now()}.pdf`,
  );
  doc.pipe(res);

  // Logo
  const logoPath = path.join(__dirname, "../public/image/logo.jpg");
  if (fs.existsSync(logoPath)) {
    const logoWidth = 70;
    const centerX = (doc.page.width - logoWidth) / 2;
    doc.image(logoPath, centerX, 30, { width: logoWidth });
  }

  doc.moveDown(3);
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .text("Republic of the Philippines", { align: "center" })
    .text("BILIRAN PROVINCE STATE UNIVERSITY", { align: "center" })
    .text("6560 Naval, Biliran Province", { align: "center" })
    .moveDown(2);

  const generatedDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "2-digit",
  });

  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .text("Equipment Inventory Report", { align: "center" })
    .moveDown()
    .text(`Total Equipments: ${Equipment.length}`)
    .text(`Date: ${generatedDate}`)
    .moveDown(2);

  // Table Setup
  const tableHeaders = [
    "Date",
    "Code",
    "Brand",
    "Specification",
    "Status",
    "Date Acquired",
    "Remarks",
    "Laboratory",
    "Department",
  ];
  const columnWidths = [65, 55, 55, 75, 55, 65, 65, 65, 65];
  const tableWidth = columnWidths.reduce((a, b) => a + b, 0);
  const pageWidth =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const startXTable = doc.page.margins.left + (pageWidth - tableWidth) / 2;
  const rowHeight = 25;
  const pageHeight =
    doc.page.height - doc.page.margins.top - doc.page.margins.bottom;
  let currentY = doc.y;

  // Table Headers
  doc.font("Helvetica-Bold").fontSize(10);
  tableHeaders.forEach((header, i) => {
    doc.text(
      header,
      startXTable + columnWidths.slice(0, i).reduce((a, b) => a + b, 0),
      currentY,
      { width: columnWidths[i], align: "left" },
    );
  });

  currentY += rowHeight;
  doc
    .moveTo(startXTable, currentY)
    .lineTo(startXTable + tableWidth, currentY)
    .stroke();
  currentY += 5;
  doc.font("Helvetica").fontSize(9);

  // Data Rows
  Equipment.forEach((eq) => {
    if (currentY + rowHeight > pageHeight) {
      doc.addPage();
      currentY = 50;
      doc.font("Helvetica-Bold").fontSize(10);
      tableHeaders.forEach((header, i) => {
        doc.text(
          header,
          startXTable + columnWidths.slice(0, i).reduce((a, b) => a + b, 0),
          currentY,
          { width: columnWidths[i], align: "left" },
        );
      });
      currentY += rowHeight;
      doc
        .moveTo(startXTable, currentY)
        .lineTo(startXTable + tableWidth, currentY)
        .stroke();
      currentY += 5;
      doc.font("Helvetica").fontSize(9);
    }

    const formattedDate = eq.DateTime
      ? new Date(eq.DateTime).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
      : "N/A";

    const formattedAcquired = eq.DateAcquired
      ? new Date(eq.DateAcquired).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
      : "N/A";

    const rowData = [
      formattedDate,
      eq.code || "N/A",
      eq.Brand || "N/A",
      eq.Specification || "N/A",
      eq.status || "N/A",
      formattedAcquired,
      eq.remarks || "N/A",
      eq.LaboratoryName || "N/A",
      eq.Department || "N/A",
    ];

    rowData.forEach((text, i) => {
      doc.text(
        text,
        startXTable + columnWidths.slice(0, i).reduce((a, b) => a + b, 0),
        currentY,
        { width: columnWidths[i], align: "left" },
      );
    });

    currentY += rowHeight;
  });

  doc
    .moveTo(startXTable, currentY)
    .lineTo(startXTable + tableWidth, currentY)
    .stroke();
  doc.moveDown(1);

  // Footer
  doc
    .fontSize(10)
    .text("Generated by EPDO", doc.page.margins.left, currentY + 10);

  doc.end();
});

exports.FindByCode = AsyncErrorHandler(async (req, res) => {
  const { code } = req.params;
  const userId = req.user?._id;

  if (!userId) {
    return res.status(400).json({
      status: "fail",
      message: "User ID not found in request.",
    });
  }

  if (!code) {
    return res.status(400).json({
      status: "fail",
      message: "Please provide a code",
    });
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);

  const result = await Assign.aggregate([
    // 1) Laboratory — Encharge = user
    {
      $lookup: {
        from: "laboratories",
        let: { labId: "$Laboratory" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$_id", "$$labId"] },
                  { $eq: ["$Encharge", userObjectId] },
                ],
              },
            },
          },
          { $project: { _id: 1 } },
        ],
        as: "LaboratoryData",
      },
    },
    { $unwind: "$LaboratoryData" }, // kung hindi Encharge → tanggal agad

    // 2) Equipment lookup
    {
      $lookup: {
        from: "equipment",
        localField: "Equipments",
        foreignField: "_id",
        as: "EquipmentData",
      },
    },
    { $unwind: "$EquipmentData" },

    // 3) Match sa code
    {
      $match: { "EquipmentData.code": code },
    },

    // 4) FINAL OUTPUT — dating flat shape
    {
      $project: {
        _id: "$EquipmentData._id",
        code: "$EquipmentData.code",
        Brand: "$EquipmentData.Brand",
        DateAcquired: "$EquipmentData.DateAcquired",
        Category: "$EquipmentData.Category",
        SerialNumber:"$EquipmentData.SerialNumber"
      },
    },

    { $limit: 1 },
  ]);

  if (!result || result.length === 0) {
    return res.status(404).json({
      status: "fail",
      message: `No equipment found with code: ${code} in your assigned laboratory.`,
    });
  }

  res.status(200).json({
    status: "success",
    data: result[0],
  });
});

// src/Controllers/PMS002Controller.js

exports.FindByEquipment = AsyncErrorHandler(async (req, res) => {
    const userId = req.user?._id;

    if (!userId) {
        return res.status(400).json({
            status: "fail",
            message: "User ID not found in request.",
        });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    // ============================================================
    // 1️⃣ Hanapin ang Laboratory ng user
    // ============================================================
    const laboratory = await Laboratory.aggregate([
        {
            $match: { Encharge: userObjectId },
        },
        {
            $project: {
                _id: 1,
                LaboratoryName: { $ifNull: ["$LaboratoryName", "N/A"] },
            },
        },
        { $limit: 1 },
    ]);

    if (!laboratory || laboratory.length === 0) {
        return res.status(404).json({
            status: "fail",
            message: "No laboratory found for this user.",
        });
    }

    const laboratoryId = laboratory[0]._id;

    // ============================================================
    // 2️⃣ Query flags
    // ============================================================
    const { from, to, all } = req.query;

    const showAll = all === "true" || all === "1";

    // ✅ Kung walang from, walang to, at hindi 'all' → empty
    if (!showAll && !from && !to) {
        return res.status(200).json({
            status: "success",
            pmsRecord: [], // ✅ empty array
            data: {
                _id: laboratoryId,
                LaboratoryName: laboratory[0].LaboratoryName,
            },
        });
    }

    // ============================================================
    // 3️⃣ Buuin ang date filter (kung may from/to)
    // ============================================================
    const dateFilter = {};

    if (!showAll && (from || to)) {
        dateFilter.createdAt = {};

        if (from) {
            const fromDate = new Date(from);
            if (isNaN(fromDate.getTime())) {
                return res.status(400).json({
                    status: "fail",
                    message: "Invalid 'from' date format. Use YYYY-MM-DD.",
                });
            }
            fromDate.setHours(0, 0, 0, 0);
            dateFilter.createdAt.$gte = fromDate;
        }

        if (to) {
            const toDate = new Date(to);
            if (isNaN(toDate.getTime())) {
                return res.status(400).json({
                    status: "fail",
                    message: "Invalid 'to' date format. Use YYYY-MM-DD.",
                });
            }
            toDate.setHours(23, 59, 59, 999);
            dateFilter.createdAt.$lte = toDate;
        }
    }

    // ============================================================
    // 4️⃣ Kunin ang PMS records
    //    - Kapag showAll → walang date filter (lahat)
    //    - Kapag may from/to → filtered
    // ============================================================
    const pmsRecord = await PMSMaintenanceController.find({
        laboratoryId,
        ...dateFilter,
    })
        .populate("equipmentId")
        .sort({ createdAt: -1 });

    // ============================================================
    // 5️⃣ Response
    // ============================================================
    res.status(200).json({
        status: "success",
        pmsRecord,
        data: {
            _id: laboratoryId,
            LaboratoryName: laboratory[0].LaboratoryName,
        },
    });
});