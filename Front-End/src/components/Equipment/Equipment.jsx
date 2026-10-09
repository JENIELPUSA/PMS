import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FaTimes, FaTools, FaBarcode, FaTags, FaInfoCircle, FaChevronDown, FaChevronUp, FaSave, FaCalendarAlt, FaStickyNote, FaHashtag } from "react-icons/fa";
import { EquipmentContext } from "../CountContext"; 
import StatusModal from "../ReusableComponent/SuccessandFailedModal";
import { EquipmentDataContext } from "../../contexts/EquipmentContext/EquipmentContext";

function Equipment({ isOpen, onClose, equipment, onAddEquipment, onEditEquipment }) {
  const { sendaddEquipment, customError, setCustomError, EditEquipmentData } = useContext(EquipmentDataContext);
  const [animateExit, setAnimateExit] = useState(false);
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalStatus, setModalStatus] = useState("success");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const token = localStorage.getItem("token");

  const [values, setValues] = useState({
    code: "",
    Category: "",
    Specification: "",
    Brand: "",
    SerialNumber: "",
    remarks: "",
    DateAcquired: "",
  });

  useEffect(() => {
    if (isOpen) {
      checkTokenAndFetchCategories();
      if (equipment) {
        setValues({
          code: equipment.code || "",
          Brand: equipment.Brand || "",
          SerialNumber: equipment.SerialNumber || "",
          Specification: equipment.Specification || "",
          Category: equipment.CategoryId || "",
          remarks: equipment.remarks || "",
          DateAcquired: equipment.DateAcquired
            ? new Date(equipment.DateAcquired).toISOString().split("T")[0]
            : "",
        });
      } else {
        resetForm();
      }
    }
  }, [equipment, isOpen]);

  const resetForm = () => {
    setValues({
      code: "",
      Category: "",
      Specification: "",
      Brand: "",
      SerialNumber: "",
      remarks: "",
      DateAcquired: "",
    });
  };

  const checkTokenAndFetchCategories = async () => {
    if (!token) {
      navigate("/login");
      return;
    }
    try {
      const response = await axios.get(`${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/api/v1/categorys`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      if (response.data?.status === "success") {
        setCategories(response.data.data);
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  const handleInput = (e) => {
    const { name, value } = e.target;
    setValues({ ...values, [name]: value });
  };

  const handleClose = () => {
    setAnimateExit(true);
    setTimeout(() => {
      setAnimateExit(false);
      onClose();
    }, 400);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = equipment 
        ? await EditEquipmentData(equipment._id, values)
        : await sendaddEquipment(values);

      if (result?.success) {
        equipment ? onEditEquipment(result.data) : onAddEquipment(result.data);
        resetForm();
        handleClose();
      }
    } catch (error) {
      console.error("Error submitting equipment:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        onClick={handleClose} 
        className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" 
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={animateExit ? { opacity: 0, y: 50, scale: 0.95 } : { opacity: 1, y: 0, scale: 1 }}
        className="relative w-full max-w-lg bg-white rounded-[2.5rem] overflow-hidden shadow-2xl border-2 border-[#1e3a8a]"
      >
        {/* Header - Industrial Blue */}
        <div className="bg-[#1e3a8a] px-8 py-6 text-white relative">
          <div className="absolute top-0 right-0 p-4 opacity-10"><FaTools size={70} /></div>
          <button 
            onClick={handleClose} 
            className="absolute top-4 right-4 text-white/50 hover:text-yellow-400 transition-colors"
          >
            <FaTimes size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-400 rounded-2xl text-[#1e3a8a] shadow-lg shadow-yellow-400/20">
              <FaTools size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tighter">
                {equipment ? "Modify" : "Register"} <span className="text-yellow-400">Equipment</span>
              </h2>
              <p className="text-[10px] text-blue-200 font-bold uppercase tracking-[0.2em]">Asset Management Terminal</p>
            </div>
          </div>
        </div>

        <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {customError && (
            <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-bold rounded-r-md">
              {customError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Brand */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Manufacturer / Brand</label>
                <div className="relative group">
                  <FaTags className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1e3a8a]" />
                  <input 
                    type="text" 
                    name="Brand" 
                    value={values.Brand} 
                    onChange={handleInput} 
                    placeholder="e.g. Caterpillar"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-600/5 focus:border-[#1e3a8a] outline-none font-bold text-slate-700 text-sm transition-all" 
                  />
                </div>
              </div>

              {/* Serial Number */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Asset Serial S/N</label>
                <div className="relative group">
                  <FaBarcode className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1e3a8a]" />
                  <input 
                    type="text" 
                    name="SerialNumber" 
                    value={values.SerialNumber} 
                    onChange={handleInput} 
                    placeholder="SN-000-000"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-600/5 focus:border-[#1e3a8a] outline-none font-bold text-slate-700 text-sm transition-all" 
                  />
                </div>
              </div>

              {/* ✅ NEW: Code */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Equipment Code</label>
                <div className="relative group">
                  <FaHashtag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1e3a8a]" />
                  <input 
                    type="text" 
                    name="code" 
                    value={values.code} 
                    onChange={handleInput} 
                    placeholder="e.g. EQ-0001"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-600/5 focus:border-[#1e3a8a] outline-none font-bold text-slate-700 text-sm transition-all" 
                  />
                </div>
              </div>

              {/* ✅ NEW: Date Acquired */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date Acquired</label>
                <div className="relative group">
                  <FaCalendarAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#1e3a8a]" />
                  <input 
                    type="date" 
                    name="DateAcquired" 
                    value={values.DateAcquired} 
                    onChange={handleInput} 
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-600/5 focus:border-[#1e3a8a] outline-none font-bold text-slate-700 text-sm transition-all" 
                  />
                </div>
              </div>
            </div>

            {/* Category Custom Dropdown */}
            <div className="space-y-1 relative">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Equipment Category</label>
              <div 
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center cursor-pointer group hover:border-blue-400 transition-all"
              >
                <span className={`text-sm font-bold ${values.Category ? "text-slate-700" : "text-slate-400"}`}>
                  {values.Category ? categories.find(c => c._id === values.Category)?.CategoryName : "Select Type..."}
                </span>
                {dropdownOpen ? <FaChevronUp className="text-blue-600" /> : <FaChevronDown className="text-slate-300" />}
              </div>
              
              <AnimatePresence>
                {dropdownOpen && (
                  <motion.ul 
                    initial={{ opacity: 0, y: -10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto border-t-4 border-t-yellow-400"
                  >
                    {categories.map((cat) => (
                      <li 
                        key={cat._id} 
                        onClick={() => { 
                          setValues({...values, Category: cat._id}); 
                          setDropdownOpen(false); 
                        }}
                        className="px-4 py-3 text-sm font-bold text-slate-600 hover:bg-blue-50 hover:text-[#1e3a8a] cursor-pointer transition-colors border-b border-slate-50 last:border-0"
                      >
                        {cat.CategoryName}
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>

            {/* Specification */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Technical Specification</label>
              <div className="relative group">
                <FaInfoCircle className="absolute left-4 top-4 text-slate-300 group-focus-within:text-[#1e3a8a]" />
                <textarea 
                  name="Specification" 
                  value={values.Specification} 
                  onChange={handleInput} 
                  placeholder="Describe technical details..." 
                  rows="3"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-600/5 focus:border-[#1e3a8a] outline-none font-bold text-slate-700 text-sm transition-all resize-none" 
                />
              </div>
            </div>

            {/* ✅ NEW: Remarks */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Remarks</label>
              <div className="relative group">
                <FaStickyNote className="absolute left-4 top-4 text-slate-300 group-focus-within:text-[#1e3a8a]" />
                <textarea 
                  name="remarks" 
                  value={values.remarks} 
                  onChange={handleInput} 
                  placeholder="Additional notes..." 
                  rows="2"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-600/5 focus:border-[#1e3a8a] outline-none font-bold text-slate-700 text-sm transition-all resize-none" 
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className={`w-full py-4 rounded-2xl font-black text-white uppercase tracking-[0.2em] text-xs transition-all shadow-lg flex items-center justify-center gap-3
                ${isLoading ? "bg-slate-400 cursor-not-allowed" : "bg-[#1e3a8a] hover:bg-[#112d7a] active:scale-95 shadow-blue-900/20"}`}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><FaSave /> {equipment ? "Update Asset" : "Initialize Asset"}</>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="bg-yellow-400 py-2 text-center">
          <p className="text-[9px] font-black text-blue-900 uppercase tracking-widest">Authorized Personnel Access Only</p>
        </div>
      </motion.div>

      <StatusModal isOpen={showModal} onClose={() => setShowModal(false)} status={modalStatus} />
    </div>
  );
}

export default Equipment;