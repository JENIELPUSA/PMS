import React, { useState, useContext, useEffect } from "react";
import { useLocation } from "react-router-dom";
import MaintenanceDisplayModal from "../MaintenanceRequest/MaintenanceModalDisplay";
import TypesofMaintenceForm from "../TypesOfMaintenance/TypesofMaintenceForm";
import MaintenanceRecord from "../PMSForm/MaintenanceRecord";
import { motion } from "framer-motion";
import { TypeofMaintenanceContext } from "../../contexts/TypesofMainten/TypeofMaintenanceContext";
import { AuthContext } from "../../contexts/AuthContext";

// Lucide React Icons
import {
  ClipboardList,
  Eye,
  RefreshCw,
  Calendar,
  AlertCircle
} from "lucide-react";

/* ============================================================
   EQUIPMENT TABLE COLUMNS (Last & Next Maint. removed)
   ============================================================ */
const EQUIPMENT_COLUMNS = [
  { key: "codeNo", label: "Code No.", width: "22%" },
  { key: "serialNumber", label: "Serial No.", width: "28%" },
  { key: "brand", label: "Brand", width: "25%" },
  { key: "category", label: "Category", width: "25%" },
];

/* ============================================================
   EQUIPMENT TABLE
   ============================================================ */
function EquipmentTable({
  pageItems = [],
  emptyRowCount = 0,
  columns = EQUIPMENT_COLUMNS,
}) {
  return (
    <div className="w-full overflow-hidden rounded-lg border border-slate-200">
      <table className="w-full border-collapse table-fixed">
        <thead>
          <tr className="bg-slate-100">
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200"
                style={{ width: col.width }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {pageItems.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-10 text-center text-sm text-slate-400 italic"
              >
                No equipment found.
              </td>
            </tr>
          ) : (
            pageItems.map((equipment, idx) => (
              <tr
                key={equipment._id || `row-${idx}`}
                className="text-[12px] text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <td className="px-4 py-3 border-b border-slate-100 font-semibold text-blue-700 truncate">
                  {equipment.code || "—"}
                </td>
                <td className="px-4 py-3 border-b border-slate-100 font-medium text-slate-900 truncate">
                  {equipment.SerialNumber || "—"}
                </td>
                <td className="px-4 py-3 border-b border-slate-100 truncate">
                  {equipment.Brand || "—"}
                </td>
                <td className="px-4 py-3 border-b border-slate-100 truncate">
                  {equipment.categoryName || "—"}
                </td>
              </tr>
            ))
          )}

          {Array.from({ length: emptyRowCount }).map((_, index) => (
            <tr key={`empty-${index}`}>
              {columns.map((_, i) => (
                <td
                  key={i}
                  className="px-4 py-3 border-b border-slate-100 h-[45px]"
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MaintenanceDisplay() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isOpenMaintenanceModal, setOpenMaintenanceModal] = useState(false);
  const [isTypesofMaintenanceModal, setTypesofMaintenanceModal] = useState(false);
  const [isMaintenanceRecordModal, setMaintenanceRecordModal] = useState(false);
  const { role } = useContext(AuthContext);

  const canEdit = role !== "Supply";

  const [isPMSModalOpen, setPMSModalOpen] = useState(false);
  const [SendDataLab, setSendDataLab] = useState(null);
  const [SendDataEquip, setSendDataEquip] = useState(null);
  const location = useLocation();
  const { displayData, DeleteType } = useContext(TypeofMaintenanceContext);
  const [equipmentsPerPage] = useState(6);
  const laboratoryData = location.state?.selectedAssignEquipment;

  console.log("displayData",displayData)

  const [assignEquipments, setAssignEquipments] = useState(() => {
    const saved = localStorage.getItem("assignedEquipments");
    return saved ? JSON.parse(saved) : [];
  });

  const [laboratory, setlaboartory] = useState(() => {
    const saved = localStorage.getItem("selectedLabsData");
    return saved ? JSON.parse(saved) : laboratoryData || "";
  });

  useEffect(() => {
    if (laboratoryData) {
      localStorage.setItem("selectedLabsData", JSON.stringify(laboratoryData));
      setlaboartory(laboratoryData);
    }
  }, [laboratoryData]);

  useEffect(() => {
    const equipments = location.state?.selectedAssignEquipment?.equipments;
    if (equipments && equipments.length > 0) {
      localStorage.setItem("assignedEquipments", JSON.stringify(equipments));
      setAssignEquipments(equipments);
    }
  }, [location.state]);

  const handleSelectEquipment = (equipment, laboratory) => {
    setSendDataEquip(equipment);
    setSendDataLab(laboratory);
    setOpenMaintenanceModal(true);
  };

  const handleMaintenanceRecord = (equipment, laboratory) => {
    setSendDataEquip(equipment);
    setSendDataLab(laboratory);
    setMaintenanceRecordModal(true);
  };

  const handleSendData = (equipment, laboratory) => {
    setTypesofMaintenanceModal(true);
    setSendDataEquip(equipment);
    setSendDataLab(laboratory);
  };

  const handlePMSClick = (equipment, laboratory) => {
    setSendDataEquip(equipment);
    setSendDataLab(laboratory);
    setPMSModalOpen(true);
  };

  const handleCloseModal = () => {
    setOpenMaintenanceModal(false);
    setTypesofMaintenanceModal(false);
    setMaintenanceRecordModal(false);
    setPMSModalOpen(false);
  };

  const handleRetrieve = (equipment) => {
    DeleteType(equipment);
  };

  const pageVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
  };

  const uniqueEquipments = Array.from(
    new Map(assignEquipments.map((equip) => [equip._id, equip])).values()
  );

  const filteredEquipment = uniqueEquipments.filter((equip) =>
    (equip.SerialNumber?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredEquipment.length / equipmentsPerPage);
  const paginatedEquipment = filteredEquipment.slice(
    (currentPage - 1) * equipmentsPerPage,
    currentPage * equipmentsPerPage
  );

  const paginate = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) setCurrentPage(pageNumber);
  };

  const equipmentTypes = [...new Set(displayData?.map((item) => item.equipmentType))];

  const emptyRowCount = Math.max(0, equipmentsPerPage - paginatedEquipment.length);

  if (isMaintenanceRecordModal && canEdit) {
    return (
      <motion.div
        className="w-full"
        initial="hidden"
        animate="visible"
        variants={pageVariants}
      >
        <MaintenanceRecord
          isOpen={isMaintenanceRecordModal}
          toLab={SendDataLab}
          toEquip={SendDataEquip}
          laboratory={SendDataLab}
          equipment={SendDataEquip}
          onClose={handleCloseModal}
        />
      </motion.div>
    );
  }

  return (
    <motion.div className="space-y-4" initial="hidden" animate="visible" variants={pageVariants}>
      {!canEdit && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">View Only Mode</span>
          </div>
          <span className="text-xs font-bold text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
            {role || "Supply"} Role
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div variants={pageVariants} className="border rounded-lg p-4 shadow-sm bg-white">
          <h2 className="text-sm font-medium text-gray-500 mb-1 uppercase tracking-wider">In-charge</h2>
          <p className="text-gray-900 font-bold text-lg">{laboratory.encharge || "No Encharge Info"}</p>
        </motion.div>

        <motion.div variants={pageVariants} className="border rounded-lg p-4 shadow-sm bg-white">
          <h2 className="text-sm font-medium text-gray-500 mb-1 uppercase tracking-wider">Department ID</h2>
          <p className="text-gray-900 font-bold text-lg">{laboratory._id || "No Department Info"}</p>
        </motion.div>
      </div>

      <div className="border rounded-lg p-6 shadow-sm bg-white w-full">
        <h2 className="text-xl md:text-2xl font-black mb-4 text-blue-900">Equipment Inventory</h2>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Search Serial Number..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>

        {/* 👇 Table with Last & Next Maintenance removed */}
        <EquipmentTable
          pageItems={paginatedEquipment}
          emptyRowCount={emptyRowCount}
          columns={EQUIPMENT_COLUMNS}
        />

        {/* Pagination Controls */}
        <div className="flex items-center justify-between mt-6">
          <p className="text-xs text-gray-500">
            Page {currentPage} of {totalPages || 1}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => paginate(currentPage - 1)}
              className="px-4 py-2 bg-gray-100 text-sm font-bold rounded-lg disabled:opacity-30 hover:bg-gray-200 transition-colors"
              disabled={currentPage === 1}
            >
              Prev
            </button>
            <button
              onClick={() => paginate(currentPage + 1)}
              className="px-4 py-2 bg-gray-100 text-sm font-bold rounded-lg disabled:opacity-30 hover:bg-gray-200 transition-colors"
              disabled={currentPage === totalPages || totalPages === 0}
            >
              Next
            </button>
          </div>
        </div>

        {/* Modals Container */}
        {isOpenMaintenanceModal && canEdit && (
          <MaintenanceDisplayModal
            isOpen={isOpenMaintenanceModal}
            Lab={SendDataLab}
            Equip={SendDataEquip}
            onClose={handleCloseModal}
          />
        )}
        {isTypesofMaintenanceModal && canEdit && (
          <TypesofMaintenceForm
            isOpen={isTypesofMaintenanceModal}
            toLab={SendDataLab}
            toEquip={SendDataEquip}
            onClose={handleCloseModal}
          />
        )}

        {isPMSModalOpen && canEdit && (
          <TypeMaintenanceModal
            isOpen={isPMSModalOpen}
            onClose={handleCloseModal}
            equipmentId={SendDataEquip?._id}
            equipment={SendDataEquip}
            laboratory={SendDataLab}
          />
        )}
      </div>
    </motion.div>
  );
}

export default MaintenanceDisplay;