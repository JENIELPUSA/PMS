const AsyncErrorHandler = require("../Utils/AsyncErrorHandler");
const message = require("../Models/Message");
const Apifeatures = require("./../Utils/ApiFeatures");
const sendEmail = require("../Utils/email");
const mongoose = require('mongoose');

exports.AddMessage = AsyncErrorHandler(async (req, res) => {
  // Create the AssignEquipment document
  const MessageInfo = await message.create(req.body); // Use 'Assign' model with the pre-save hook

  // Send a success response after the document is created and saved
  res.status(201).json({
    status: "success",
    data: MessageInfo,
  });
});


exports.DisplayMessage = AsyncErrorHandler(async (req, res) => {
  // I-convert ang userId sa ObjectId
  const userId = new mongoose.Types.ObjectId(req.user._id);
  const role = req.user.role;

  // Apply Apifeatures methods on the query
  const features = new Apifeatures(message.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const filteredMessage = await features.query;

  // I-extract ang message IDs
  const messageIds = filteredMessage.map((msg) => msg._id);

  if (messageIds.length === 0) {
    return res.status(200).json({
      status: "success",
      totalMessages: 0,
      totalMessagePending: 0,
      data: [],
    });
  }

  // ==========================================
  // BASE MATCH CONDITION
  // ==========================================
  const matchCondition = {
    _id: { $in: messageIds },
    "viewers.user": userId,
  };

  // ==========================================
  // TECHNICIAN FILTER
  // HUWAG IPakita ang MaintenanceRequest
  // ==========================================
  if (role === "Technician") {
    matchCondition.typesNotification = {
      $ne: "MaintenanceRequest",
    };
  }


  // ==========================================
  // AGGREGATION
  // ==========================================
  const Messages = await message.aggregate([
    {
      $match: matchCondition,
    },

    // Lookup for Laboratory
    {
      $lookup: {
        from: "laboratories",
        localField: "Laboratory",
        foreignField: "_id",
        as: "LaboratoryInfo",
      },
    },

    // Lookup for Department from Laboratory
    {
      $lookup: {
        from: "departments",
        localField: "LaboratoryInfo.department",
        foreignField: "_id",
        as: "DepartmentInfo",
      },
    },

    // Lookup for Equipment
    {
      $lookup: {
        from: "equipment",
        localField: "equipmentId",
        foreignField: "_id",
        as: "EquipmentInfo",
      },
    },

    {
      $unwind: {
        path: "$EquipmentInfo",
        preserveNullAndEmptyArrays: true,
      },
    },

    // Lookup for RequestMaintenance
    {
      $lookup: {
        from: "requestmaintenances",
        localField: "RequestID",
        foreignField: "_id",
        as: "RequestMaintenanceInfo",
      },
    },

    {
      $unwind: {
        path: "$RequestMaintenanceInfo",
        preserveNullAndEmptyArrays: true,
      },
    },

    // Lookup for Encharge / Technician
    {
      $lookup: {
        from: "users",
        localField: "Encharge",
        foreignField: "_id",
        as: "EnchargeInfo",
      },
    },

    {
      $unwind: {
        path: "$EnchargeInfo",
        preserveNullAndEmptyArrays: true,
      },
    },

    // Lookup for Category
    {
      $lookup: {
        from: "categories",
        localField: "EquipmentInfo.Category",
        foreignField: "_id",
        as: "CategoryInfo",
      },
    },

    {
      $unwind: {
        path: "$CategoryInfo",
        preserveNullAndEmptyArrays: true,
      },
    },

    // Lookup for Laboratory Encharge Users
    {
      $lookup: {
        from: "users",
        localField: "LaboratoryInfo.Encharge",
        foreignField: "_id",
        as: "LaboratoryEnchargeInfo",
      },
    },

    // ==========================================
    // PROJECT
    // ==========================================
    {
      $project: {
        _id: 1,
        id: 1,
        message: 1,
        Status: 1,
        read: 1,
        isReassign:1,
        role: 1,
        DateTime: 1,
        readonUser: 1,
        types: 1,
        typesNotification: 1,
        To: 1,
        RequestID: 1,
        equipmentId: 1,

        departmentName: {
          $cond: {
            if: { $eq: [{ $size: "$DepartmentInfo" }, 0] },
            then: "N/A",
            else: {
              $arrayElemAt: ["$DepartmentInfo.DepartmentName", 0],
            },
          },
        },

        departmentId: {
          $cond: {
            if: { $eq: [{ $size: "$DepartmentInfo" }, 0] },
            then: "N/A",
            else: {
              $arrayElemAt: ["$DepartmentInfo._id", 0],
            },
          },
        },

        laboratoryNames: {
          $cond: {
            if: { $eq: [{ $size: "$LaboratoryInfo" }, 0] },
            then: "N/A",
            else: {
              $reduce: {
                input: "$LaboratoryInfo",
                initialValue: "",
                in: {
                  $concat: [
                    "$$value",
                    {
                      $cond: {
                        if: { $eq: ["$$value", ""] },
                        then: "",
                        else: ", ",
                      },
                    },
                    "$$this.LaboratoryName",
                  ],
                },
              },
            },
          },
        },

        EquipmentId: {
          $ifNull: ["$EquipmentInfo._id", "N/A"],
        },

        EquipmentBrand: {
          $ifNull: ["$EquipmentInfo.Brand", "N/A"],
        },

        EquipmentSerial: {
          $ifNull: ["$EquipmentInfo.SerialNumber", "N/A"],
        },

        EquipmentSpecification: {
          $ifNull: ["$EquipmentInfo.Specification", "N/A"],
        },

        EquipmentStatus: {
          $ifNull: ["$EquipmentInfo.Status", "N/A"],
        },

        EquipmentDateTime: {
          $ifNull: ["$EquipmentInfo.DateTime", "N/A"],
        },

        EquipmentRemarks: {
          $ifNull: ["$EquipmentInfo.Remarks", "N/A"],
        },

        CategoryId: {
          $ifNull: ["$EquipmentInfo.Category", "N/A"],
        },

        CategoryName: {
          $ifNull: ["$CategoryInfo.CategoryName", "N/A"],
        },

        RequestRef: {
          $ifNull: ["$RequestMaintenanceInfo.Ref", "N/A"],
        },

        RequestStatus: {
          $ifNull: ["$RequestMaintenanceInfo.Status", "N/A"],
        },

        RequestDescription: {
          $ifNull: ["$RequestMaintenanceInfo.Description", "N/A"],
        },

        RequestDateTime: {
          $ifNull: ["$RequestMaintenanceInfo.DateTime", "N/A"],
        },

        EnchargeId: {
          $ifNull: ["$EnchargeInfo._id", "N/A"],
        },

        EnchargeName: {
          $cond: {
            if: { $eq: ["$EnchargeInfo", null] },
            then: "N/A",
            else: {
              $concat: [
                { $ifNull: ["$EnchargeInfo.FirstName", ""] },
                " ",
                { $ifNull: ["$EnchargeInfo.MiddleName", ""] },
                " ",
                { $ifNull: ["$EnchargeInfo.LastName", ""] },
              ],
            },
          },
        },

        EnchargeEmail: {
          $ifNull: ["$EnchargeInfo.Email", "N/A"],
        },

        TechnicianId: {
          $ifNull: ["$EnchargeInfo._id", "N/A"],
        },

        TechnicianName: {
          $cond: {
            if: { $eq: ["$EnchargeInfo", null] },
            then: "N/A",
            else: {
              $concat: [
                { $ifNull: ["$EnchargeInfo.FirstName", ""] },
                " ",
                { $ifNull: ["$EnchargeInfo.MiddleName", ""] },
                " ",
                { $ifNull: ["$EnchargeInfo.LastName", ""] },
              ],
            },
          },
        },

        LaboratoryEnchargeId: {
          $cond: {
            if: { $eq: [{ $size: "$LaboratoryInfo" }, 0] },
            then: [],
            else: "$LaboratoryInfo.Encharge",
          },
        },

        LaboratoryEnchargeDetails: {
          $map: {
            input: "$LaboratoryEnchargeInfo",
            as: "labEncharge",
            in: {
              _id: "$$labEncharge._id",
              FirstName: "$$labEncharge.FirstName",
              MiddleName: "$$labEncharge.MiddleName",
              LastName: "$$labEncharge.LastName",
              Email: "$$labEncharge.Email",

              fullName: {
                $concat: [
                  { $ifNull: ["$$labEncharge.FirstName", ""] },
                  " ",
                  { $ifNull: ["$$labEncharge.MiddleName", ""] },
                  " ",
                  { $ifNull: ["$$labEncharge.LastName", ""] },
                ],
              },
            },
          },
        },
      },
    },

    // ==========================================
    // SORT - Pinakahuling message ang mauuna
    // ==========================================
    {
      $sort: { DateTime: -1 },
    },
  ]);

  console.log("Messages found:", Messages.length);

  res.status(200).json({
    status: "success",
    totalMessages: Messages.length,

    totalMessagePending: Messages.filter(
      (msg) =>
        msg.RequestStatus === "Pending" ||
        msg.Status === "Pending"
    ).length,

    data: Messages,
  });
});


exports.UpdateSendMSG = AsyncErrorHandler(async (req, res, next) => {
  const updatedata = await message.findByIdAndUpdate(
    req.params.id,
    { ...req.body }, // Ensure read is updated to true
    { new: true },
  );

  res.status(200).json({
    status: "success",
    data: updatedata,
  });
});

exports.UpdateAllStatus = AsyncErrorHandler(async (req, res, next) => {
  try {
    const { laboratoryIds, readonUpdate } = req.body;

    // Hanapin muna kung may unread messages
    const unreadMessages = await message.countDocuments({
      _id: { $in: laboratoryIds },
      readonUser: false,
    });

    if (unreadMessages === 0) {
      return res.status(200).json({
        status: "info",
      });
    }

    // Update only unread messages
    const updatedMessages = await message.updateMany(
      { _id: { $in: laboratoryIds }, readonUser: false },
      { $set: { readonUser: readonUpdate } },
    );

    res.status(200).json({
      status: "success",
      updatedCount: updatedMessages.modifiedCount,
      message: "Unread messages updated successfully!",
    });
  } catch (error) {
    console.error("Error updating messages:", error);
    res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
});

exports.EmailNotification = AsyncErrorHandler(async (req, res, next) => {
  const { emails, message } = req.body;

  try {
    // Ipadala ang email gamit ang message mula sa database
    await sendEmail({
      email: emails,
      subject: "New Notification",
      text: message, // Gamitin ang message content mula sa database
    });

    res.status(200).json({ message: "Email sent successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to send email", error });
  }
});
