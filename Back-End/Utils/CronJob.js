const cron = require("node-cron");
const mongoose = require("mongoose");
const Schedule = require("../Models/TypesOfMaintenace");
const Message = require("../Models/Message");
const socketIO = require("socket.io-client");

const socket = socketIO("http://localhost:3000");

socket.on("connect", () => console.log("[socket] connected:", socket.id));
socket.on("disconnect", () => console.log("[socket] disconnected"));
socket.on("connect_error", (err) =>
  console.error("[socket] connect error:", err.message)
);

// ============================================================
// HELPERS
// ============================================================
function calculateNextMaintenanceDate(lastDate, scheduleType, today = new Date()) {
  const next = new Date(lastDate);

  switch (scheduleType) {
    case "weekly":        next.setDate(next.getDate() + 7); break;
    case "monthly":       next.setMonth(next.getMonth() + 1); break;
    case "semi-annually": next.setMonth(next.getMonth() + 6); break;
    case "annually":      next.setFullYear(next.getFullYear() + 1); break;
    default:              next.setDate(next.getDate() + 7);
  }

  if (next <= today) {
    const fallback = new Date(today);
    fallback.setDate(fallback.getDate() + 1);
    return fallback;
  }
  return next;
}

// ============================================================
// FIND DUE SCHEDULES
// Chain: Schedule.equipmentType → Assign._id
//        Assign.Equipment       → Equipment._id
//        Equipment.SerialNumber → output
// ============================================================
async function findDueSchedules(today) {
  const endOfToday = new Date(today);
  endOfToday.setUTCHours(23, 59, 59, 999);

  const results = await Schedule.aggregate([
    // 1) Due na (kahit anong oras ngayong araw o mas maaga)
    {
      $match: {
        nextMaintenanceDate: { $lte: endOfToday, $ne: null },
      },
    },

    // 2) ✅ NOTIFY ONCE — skip kung na-notify na ang EXACT na date na ito
    {
      $addFields: {
        _alreadyNotified: {
          $and: [
            { $ne: ["$lastNotifiedFor", null] },
            { $eq: ["$lastNotifiedFor", "$nextMaintenanceDate"] },
          ],
        },
      },
    },
    { $match: { _alreadyNotified: false } },

    // 3) $lookup Laboratory
    {
      $lookup: {
        from: "laboratories",
        localField: "Laboratory",
        foreignField: "_id",
        as: "Laboratory",
      },
    },
    { $unwind: { path: "$Laboratory", preserveNullAndEmptyArrays: true } },

    // 4) $lookup Department
    {
      $lookup: {
        from: "departments",
        localField: "Department",
        foreignField: "_id",
        as: "Department",
      },
    },
    { $unwind: { path: "$Department", preserveNullAndEmptyArrays: true } },

    // ============================================================
    // 5) $lookup Assign — Schedule.equipmentType → Assign._id
    // ============================================================
    {
      $lookup: {
        from: "assigns",
        localField: "equipmentType",
        foreignField: "_id",
        as: "assignDoc",
      },
    },
    { $unwind: { path: "$assignDoc", preserveNullAndEmptyArrays: true } },

    // ============================================================
    // 6) ✅ Kunin ang Equipment ID mula sa Assign.Equipment
    //    (humawak sa array O scalar, at sa iba't ibang field name)
    // ============================================================
    {
      $addFields: {
        _assignEquipmentId: {
          $let: {
            vars: {
              raw: {
                $ifNull: [
                  "$assignDoc.Equipment",
                  {
                    $ifNull: [
                      "$assignDoc.equipment",
                      "$assignDoc.EquipmentId",
                    ],
                  },
                ],
              },
            },
            in: {
              $cond: [
                { $isArray: "$$raw" },
                { $arrayElemAt: ["$$raw", 0] }, // kunin ang una kung array
                "$$raw",
              ],
            },
          },
        },
      },
    },

    // ============================================================
    // 7) ✅ $lookup Equipment — gamit ang Assign.Equipment
    // ============================================================
    {
      $lookup: {
        from: "equipments",
        localField: "_assignEquipmentId",
        foreignField: "_id",
        as: "equipment",
      },
    },
    { $unwind: { path: "$equipment", preserveNullAndEmptyArrays: true } },

    // 8) $lookup assignedTechnician (User)
    {
      $lookup: {
        from: "users",
        localField: "assignedTechnician",
        foreignField: "_id",
        as: "technician",
        pipeline: [{ $project: { _id: 1 } }],
      },
    },
    { $unwind: { path: "$technician", preserveNullAndEmptyArrays: true } },

    // 9) Fallback technicians kung walang assignedTechnician
    {
      $lookup: {
        from: "users",
        let: {
          labId: "$Laboratory._id",
          hasTech: { $ifNull: ["$technician._id", null] },
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$Laboratory", "$$labId"] },
                  { $eq: ["$role", "Technician"] },
                  { $eq: ["$$hasTech", null] },
                ],
              },
            },
          },
          { $project: { _id: 1 } },
        ],
        as: "fallbackTechnicians",
      },
    },

    // 10) ✅ DEBUG — i-keep ang raw objects
    {
      $addFields: {
        _debug: {
          scheduleEquipmentType: "$equipmentType",
          assignDoc: "$assignDoc",
          assignEquipmentId: "$_assignEquipmentId",
          equipment: "$equipment",
          Laboratory: "$Laboratory",
          Department: "$Department",
          technician: "$technician",
          fallbackTechnicians: "$fallbackTechnicians",
        },
      },
    },

    // 11) Project — linisin ang output
    {
      $project: {
        _id: 1,
        scheduleType: 1,
        nextMaintenanceDate: 1,
        lastMaintenanceDate: 1,
        lastNotifiedFor: 1,
        assignedTechnician: 1,
        laboratoryId: "$Laboratory._id",
        laboratoryName: { $ifNull: ["$Laboratory.LaboratoryName", "N/A"] },
        departmentName: { $ifNull: ["$Department.DepartmentName", "N/A"] },
        serialNumber: {
          $ifNull: [
            "$equipment.SerialNumber",
            { $ifNull: ["$equipment.serialNumber", "N/A"] },
          ],
        },
        equipmentId: { $ifNull: ["$equipment._id", null] },
        technicianId: { $ifNull: ["$technician._id", null] },
        fallbackTechnicianIds: "$fallbackTechnicians._id",
        _debug: 1,
      },
    },
  ]);

  // ========================================================
  // ✅ DEBUG — i-log ang populated payloads
  // ========================================================
  console.log(`\n[cron][debug] ===== findDueSchedules =====`);
  console.log(`[cron][debug] Total due: ${results.length}`);

  results.forEach((r, i) => {
    console.log(`\n[cron][debug] --- Schedule ${i + 1} ---`);
    console.log(
      JSON.stringify(
        {
          _id: String(r._id),
          scheduleType: r.scheduleType,
          nextMaintenanceDate: r.nextMaintenanceDate,
          lastMaintenanceDate: r.lastMaintenanceDate,
          lastNotifiedFor: r.lastNotifiedFor,
          laboratoryId: r.laboratoryId ? String(r.laboratoryId) : null,
          laboratoryName: r.laboratoryName,
          departmentName: r.departmentName,
          serialNumber: r.serialNumber,
          equipmentId: r.equipmentId ? String(r.equipmentId) : null,
          technicianId: r.technicianId ? String(r.technicianId) : null,
          fallbackTechnicianIds: (r.fallbackTechnicianIds || []).map(String),
        },
        null,
        2
      )
    );

    if (r._debug) {
      console.log(`[cron][debug] RAW lookup result:`);
      console.log(
        JSON.stringify(
          {
            scheduleEquipmentType: r._debug.scheduleEquipmentType
              ? String(r._debug.scheduleEquipmentType)
              : null,
            assignDoc: r._debug.assignDoc
              ? {
                  _id: String(r._debug.assignDoc._id),
                  Equipment:
                    r._debug.assignDoc.Equipment ||
                    r._debug.assignDoc.equipment ||
                    r._debug.assignDoc.EquipmentId ||
                    null,
                }
              : null,
            assignEquipmentId: r._debug.assignEquipmentId
              ? String(r._debug.assignEquipmentId)
              : null,
            equipment: r._debug.equipment
              ? {
                  _id: String(r._debug.equipment._id),
                  SerialNumber:
                    r._debug.equipment.SerialNumber ||
                    r._debug.equipment.serialNumber ||
                    null,
                }
              : null,
            Laboratory: r._debug.Laboratory
              ? {
                  _id: String(r._debug.Laboratory._id),
                  LaboratoryName: r._debug.Laboratory.LaboratoryName,
                }
              : null,
            Department: r._debug.Department
              ? {
                  _id: String(r._debug.Department._id),
                  DepartmentName: r._debug.Department.DepartmentName,
                }
              : null,
            technician: r._debug.technician
              ? { _id: String(r._debug.technician._id) }
              : null,
            fallbackTechnicians: (r._debug.fallbackTechnicians || []).map(
              (t) => String(t._id)
            ),
          },
          null,
          2
        )
      );
    }
  });
  console.log(`[cron][debug] ===== end =====\n`);

  // ✅ Tanggalin ang _debug bago i-return
  return results.map(({ _debug, ...rest }) => rest);
}

// ============================================================
// BUILD MESSAGE PAYLOAD
// ============================================================
function buildMessagePayload(s) {
  const schedLabel = (s.scheduleType || "unscheduled").toUpperCase();

  const messageText = [
    `${schedLabel} MAINTENANCE`,
    "",
    `Laboratory: ${s.laboratoryName}`,
    `Department: ${s.departmentName}`,
    `Serial Number: ${s.serialNumber}`,
  ].join("\n");

  let recipients = s.technicianId
    ? [s.technicianId]
    : s.fallbackTechnicianIds || [];

  return {
    message: messageText,
    Status: "Pending",
    Laboratory: s.laboratoryId ? [s.laboratoryId] : [],
    Equipments: s.equipmentId || null,
    To: "Technician",
    Encharge: s.assignedTechnician || null,
    role: "Technician",
    types: "maintenanceSched",
    RequestID: null,
    viewers: recipients.map((user) => ({ user, isRead: false })),
  };
}

// ============================================================
// PROCESS ONE SCHEDULE — notify once
// ============================================================
async function processSchedule(s, today) {
  const claimed = await Schedule.findOneAndUpdate(
    {
      _id: s._id,
      $or: [
        { lastNotifiedFor: null },
        { lastNotifiedFor: { $ne: s.nextMaintenanceDate } },
      ],
    },
    {
      $set: {
        lastNotifiedFor: s.nextMaintenanceDate,
        notified: true,
      },
    },
    { new: true }
  );

  if (!claimed) {
    console.log(
      `[cron] Schedule ${s._id} already notified for ${s.nextMaintenanceDate.toISOString()} — skip.`
    );
    return;
  }

  try {
    const messageData = buildMessagePayload(s);

    console.log(
      `\n[cron][debug] ===== Message payload for schedule ${s._id} =====`
    );
    console.log(
      JSON.stringify(
        {
          message: messageData.message,
          Status: messageData.Status,
          Laboratory: (messageData.Laboratory || []).map(String),
          Equipments: messageData.Equipments
            ? String(messageData.Equipments)
            : null,
          To: messageData.To,
          Encharge: messageData.Encharge ? String(messageData.Encharge) : null,
          role: messageData.role,
          types: messageData.types,
          RequestID: messageData.RequestID,
          viewers: (messageData.viewers || []).map((v) => ({
            user: String(v.user),
            isRead: v.isRead,
          })),
        },
        null,
        2
      )
    );
    console.log(`[cron][debug] ===== end =====\n`);

    const saved = await Message.create(messageData);
    console.log(`[cron] Message ${saved._id} for schedule ${s._id}`);

    if (socket.connected) {
      socket.emit("send-notifications", saved.toObject());
      console.log(`[cron] Notification emitted for schedule ${s._id}`);
    } else {
      console.warn(
        `[cron] Socket not connected — NOT emitted for schedule ${s._id}`
      );
    }

    const newNextDate = calculateNextMaintenanceDate(
      claimed.nextMaintenanceDate,
      claimed.scheduleType,
      today
    );

    await Schedule.updateOne(
      { _id: claimed._id },
      {
        $set: {
          lastMaintenanceDate: claimed.nextMaintenanceDate,
          nextMaintenanceDate: newNextDate,
          notified: false,
        },
      }
    );

    console.log(
      `[cron] Schedule ${s._id} updated. Next: ${newNextDate.toISOString()}`
    );
  } catch (err) {
    console.error(`[cron] Failed processing ${s._id}:`, err);
    try {
      await Schedule.updateOne(
        { _id: s._id },
        { $set: { lastNotifiedFor: null, notified: false } }
      );
    } catch (resetErr) {
      console.error(`[cron] Failed to reset notified for ${s._id}:`, resetErr);
    }
  }
}

// ============================================================
// MAIN CRON
// ============================================================
let isRunning = false;

cron.schedule("*/1 * * * *", async () => {
  if (isRunning) {
    console.log("[cron] Previous run still active — skipping.");
    return;
  }
  isRunning = true;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  console.log(
    `[cron] Running at ${new Date().toISOString()} (today=${today.toISOString()})`
  );

  try {
    const dueSchedules = await findDueSchedules(today);
    console.log(`[cron] Found ${dueSchedules.length} due schedule(s).`);

    for (const s of dueSchedules) {
      await processSchedule(s, today);
    }
  } catch (err) {
    console.error("[cron] Fatal error:", err);
  } finally {
    isRunning = false;
  }
});