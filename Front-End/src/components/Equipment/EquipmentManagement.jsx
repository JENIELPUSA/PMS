import React, { useState, useContext, useEffect } from "react";
import { EquipmentDataContext } from "../../contexts/EquipmentContext/EquipmentContext";
import {
  Plus, ChevronLeft, ChevronRight, Edit,
  Trash2, RefreshCw, PlusCircle, Search,
  Package, Tag, Barcode, Info, ClipboardList,
  Hash, Calendar
} from "lucide-react";
import EquipmentformModal from "./Equipment";
import RetrieveForm from "./Retrieve";
import PopupModal from "./popupModal";
import { MaintenanceRequestContext } from "../../contexts/MaintenanceRequestContext/MaintenanceRequestContext";

const EquipmentForm = () => {
  const {
    equipment,
    setEquipment,
    currentPage,
    setCurrentPage,
    equipmentsPerPage,
    DeleteDatas,
    fetchEquipmentData,
  } = useContext(EquipmentDataContext);

  const { view } = useContext(MaintenanceRequestContext)

  console.log("equipment", equipment)

  const [searchTerm, setSearchTerm] = useState("");
  const [isFormModalOpen, setFormModalOpen] = useState(false);
  const [isRetrieveModalOpen, setIsRetrieveModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(null);

  // ==========================================
  // FETCH EQUIPMENT DATA ON MOUNT
  // ==========================================
  useEffect(() => {
    fetchEquipmentData();
  }, []); // Empty dependency array - runs once on mount

  // ==========================================
  // OPTIONAL: REFETCH WHEN VIEW CHANGES
  // ==========================================
  useEffect(() => {
    if (view) {
      fetchEquipmentData();
    }
  }, [view]); // Refetch when view changes

  // --- PAGINATION & FILTER LOGIC ---
  const filteredEquipment = equipment?.filter((equip) =>
    (equip.SerialNumber?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (equip.Brand?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (equip.code?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (equip.DepartmentName?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  ) || [];

  const totalPages = Math.ceil(filteredEquipment.length / equipmentsPerPage);

  // Reset to page 1 when searching
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, setCurrentPage]);

  // Safety check para sa Pagination
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    } else if (totalPages === 0 && currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage, setCurrentPage]);

  const paginatedEquipment = filteredEquipment.slice(
    (currentPage - 1) * equipmentsPerPage,
    currentPage * equipmentsPerPage
  );

  const paginate = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  // --- HANDLERS ---
  const handleAssignClick = (item) => {
    if (item.status === "Not Available") {
      setSelectedEquipment(item._id);
      setIsRetrieveModalOpen(true);
    } else {
      setSelectedEquipment(item);
      setIsAssignModalOpen(true);
    }
  };

  const handleCloseSubModals = () => {
    setFormModalOpen(false);
    setIsRetrieveModalOpen(false);
    setIsAssignModalOpen(false);
    setSelectedEquipment(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this equipment?")) {
      await DeleteDatas(id);
      setEquipment(prev => prev.filter(e => e._id !== id));
    }
  };

  // ==========================================
  // HANDLE REFRESH
  // ==========================================
  const handleRefresh = () => {
    fetchEquipmentData();
  };

  // ✅ Helper: i-format ang DateAcquired
  const formatDate = (dateValue) => {
    if (!dateValue) return "N/A";
    try {
      return new Date(dateValue).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col">
      {/* HEADER */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
            <Package size={18} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">Equipment Inventory</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Manage your equipment and assets</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            title="Refresh equipment list"
          >
            <RefreshCw size={16} />
          </button>
          <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            Total Items: <span className="font-bold text-blue-600 dark:text-blue-400">{equipment?.length || 0}</span>
          </div>
        </div>
      </div>

      {/* SEARCH & ADD BAR */}
      <div className="p-4 flex flex-col sm:flex-row gap-3 bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={16} />
          <input
            type="text"
            placeholder="Search equipment by serial, brand, code, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
          />
        </div>
        <button
          onClick={() => setFormModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors text-sm font-semibold shadow-sm whitespace-nowrap"
        >
          <Plus size={16} strokeWidth={2} />
          <span>Add Equipment</span>
        </button>
      </div>

      {/* TABLE SECTION */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 text-xs uppercase tracking-wider font-semibold border-b border-gray-200 dark:border-gray-700">
              {/* ✅ NEW: Code Column */}
              <th className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Hash size={12} />
                  Code
                </div>
              </th>
              <th className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Barcode size={12} />
                  Serial Number
                </div>
              </th>
              <th className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Tag size={12} />
                  Brand & Specs
                </div>
              </th>
              <th className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <ClipboardList size={12} />
                  Location
                </div>
              </th>
              {/* ✅ NEW: Date Acquired Column */}
              <th className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Calendar size={12} />
                  Date Acquired
                </div>
              </th>
              <th className="px-4 py-3 text-center">
                <div className="flex items-center justify-center gap-2">
                  <Info size={12} />
                  Status
                </div>
              </th>
              <th className="px-4 py-3">Remarks</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-900">
            {paginatedEquipment.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-gray-400 dark:text-gray-500 italic">
                  {searchTerm ? 'No matching equipment found.' : 'No equipment found. Click "Add Equipment" to get started.'}
                </td>
              </tr>
            ) : (
              paginatedEquipment.map((item, index) => (
                <tr
                  key={`${item._id}-${item.SerialNumber || index}-${index}`}
                  className="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  {/* ✅ NEW: Code Cell */}
                  <td className="px-4 py-4">
                    <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-md">
                      {item.code || 'N/A'}
                    </span>
                  </td>

                  <td className="px-4 py-4 font-mono text-xs text-gray-600 dark:text-gray-400">
                    {item.SerialNumber || 'N/A'}
                  </td>

                  <td className="px-4 py-4">
                    <div className="font-medium text-gray-900 dark:text-white">{item.Brand || 'N/A'}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[150px]" title={item.Specification}>
                      {item.Specification || 'N/A'}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-700 dark:text-gray-300">{item.DepartmentName || "N/A"}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">{item.LaboratoryName || "No Lab"}</div>
                  </td>

                  {/* ✅ NEW: Date Acquired Cell */}
                  <td className="px-4 py-4">
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {formatDate(item.DateAcquired)}
                    </span>
                  </td>

                  <td className="px-4 py-4 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase ${item.status === "Available"
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : item.status === "In Use"
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : item.status === "Maintenance"
                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                      {item.status || 'Unknown'}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    <span className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded-md inline-block max-w-[120px] truncate" title={item.remarks}>
                      {item.remarks || "No remarks"}
                    </span>
                  </td>

                  <td className="px-4 py-4 text-center">
                    <div className="flex justify-center items-center gap-2">
                      <button
                        onClick={() => { setSelectedEquipment(item); setFormModalOpen(true); }}
                        className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                        title="Edit Equipment"
                      >
                        <Edit size={16} strokeWidth={1.5} />
                      </button>
                      <button
                        onClick={() => handleDelete(item._id)}
                        className="p-1.5 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                        title="Delete Equipment"
                      >
                        <Trash2 size={16} strokeWidth={1.5} />
                      </button>
                      <button
                        onClick={() => handleAssignClick(item)}
                        className={`p-1.5 rounded transition-colors ${item.status === "Not Available"
                            ? 'text-orange-500 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/30'
                            : 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30'
                          }`}
                        title={item.status === "Not Available" ? "Retrieve Equipment" : "Assign Equipment"}
                      >
                        {item.status === "Not Available" ? (
                          <RefreshCw size={16} strokeWidth={1.5} />
                        ) : (
                          <PlusCircle size={16} strokeWidth={1.5} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* FOOTER / PAGINATION */}
      <div className="px-6 py-3 bg-gray-50 dark:bg-slate-800 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Showing <span className="font-medium text-gray-700 dark:text-gray-300">
            {filteredEquipment.length === 0 ? 0 : Math.min(filteredEquipment.length, (currentPage - 1) * equipmentsPerPage + 1)}
          </span> to{' '}
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {Math.min(currentPage * equipmentsPerPage, filteredEquipment.length)}
          </span> of{' '}
          <span className="font-medium text-gray-700 dark:text-gray-300">{filteredEquipment.length}</span> entries
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => paginate(currentPage - 1)}
            disabled={currentPage === 1 || filteredEquipment.length === 0}
            className="p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-slate-700 disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors text-gray-700 dark:text-gray-300"
          >
            <ChevronLeft size={14} strokeWidth={2} />
          </button>

          <span className="px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300">
            Page {currentPage} of {totalPages || 1}
          </span>

          <button
            onClick={() => paginate(currentPage + 1)}
            disabled={currentPage === totalPages || filteredEquipment.length === 0}
            className="p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-slate-700 disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors text-gray-700 dark:text-gray-300"
          >
            <ChevronRight size={14} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* SUB-MODALS */}
      {isFormModalOpen && <EquipmentformModal isOpen={isFormModalOpen} onClose={handleCloseSubModals} equipment={selectedEquipment} />}
      {isRetrieveModalOpen && <RetrieveForm isOpen={isRetrieveModalOpen} onClose={handleCloseSubModals} equipment={selectedEquipment} />}
      {isAssignModalOpen && <PopupModal isOpen={isAssignModalOpen} onClose={handleCloseSubModals} equipment={selectedEquipment} />}
    </div>
  );
};

export default EquipmentForm;