// src/contexts/EquipmentDataContext/EquipmentDataContext.jsx
import React, {
    createContext,
    useState,
    useEffect,
    useContext,
    useMemo,
} from "react";
import { AuthContext } from "../AuthContext";
import StatusModal from "../../components/ReusableComponent/SuccessandFailedModal";
import axiosInstance from "../../components/ReusableComponent/axiosInstance";

export const EquipmentDataContext = createContext();

export const EquipmentProvider = ({ children }) => {
    // Fixed: Changed from [""] to [] (empty array)
    const [equipment, setEquipment] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [totalEquipments, setTotalEquipments] = useState(0);
    const [TotalAvailableEquipments, setTotalAvailableEquipments] = useState(0);
    const { authToken } = useContext(AuthContext);
    const [currentPage, setCurrentPage] = useState(1);
    const [equipmentsPerPage, setequipmentsPerPage] = useState(6);
    const [showModal, setShowModal] = useState(false);
    const [modalStatus, setModalStatus] = useState("success");
    const [customError, setCustomError] = useState("");
    const [PmsRecord, setPmsRecord] = useState([]);

    // 🔹 BAGONG STATE — selected equipment, search, filter, single fetch
    const [selectedEquipment, setSelectedEquipment] = useState(null);
    const [equipmentById, setEquipmentById] = useState(null);
    const [equipmentByCode, setEquipmentByCode] = useState(null); // 🔹 BAGO
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");

    // BAGO — laboratory info ng naka-login na user (FindByEquipment)
    const [myLaboratory, setMyLaboratory] = useState(null);

    useEffect(() => {
        if (customError) {
            const timer = setTimeout(() => {
                setCustomError(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [customError]);

    const fetchEquipmentData = async () => {
        if (!authToken) return;
        setLoading(true);
        try {
            const res = await axiosInstance.get(
                `${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/api/v1/equipment`,
                {
                    withCredentials: true,
                    headers: { Authorization: `Bearer ${authToken}` },
                }
            );

            const equipmentData = res.data.data || [];

            const pmsrecords = res.data.pmsRecord || [];

            // Count equipment with status "Available"
            const availableEquipmentCount =
                equipmentData?.filter(
                    (item) => item.status === "Available"
                ).length || 0;


            setPmsRecord(pmsrecords)

            setTotalAvailableEquipments(availableEquipmentCount);
            setTotalEquipments(equipmentData.length);
            setEquipment(equipmentData);
            setError(null);
        } catch (error) {
            console.error("Error fetching data:", error);
            setError("Failed to fetch data");
        } finally {
            setLoading(false);
        }
    };

    // 🔹 BAGONG FUNCTION — fetch single equipment by ID
    const fetchEquipmentById = async (equipmentID) => {
        if (!authToken || !equipmentID) return null;
        try {
            const res = await axiosInstance.get(
                `${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/api/v1/equipment/${equipmentID}`,
                {
                    withCredentials: true,
                    headers: { Authorization: `Bearer ${authToken}` },
                }
            );
            const data = res?.data?.data || null;
            setEquipmentById(data);
            return { success: true, data };
        } catch (error) {
            console.error("Error fetching equipment by ID:", error);
            setCustomError("Failed to fetch equipment.");
            return { success: false, error: "Failed to fetch equipment." };
        }
    };

    // 🔹 BAGONG FUNCTION — fetch equipment by CODE (FindByCode endpoint)
    const fetchEquipmentByCode = async (code) => {
        if (!authToken || !code) return null;
        try {
            const res = await axiosInstance.get(
                `${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/api/v1/equipment/code/${code}`,
                {
                    withCredentials: true,
                    headers: { Authorization: `Bearer ${authToken}` },
                }
            );

            if (res?.data?.status === "success" && res?.data?.data) {
                setEquipmentByCode(res.data.data);
                return { success: true, data: res.data.data };
            } else {
                setEquipmentByCode(null);
                return {
                    success: false,
                    error: res?.data?.message || "No equipment found.",
                };
            }
        } catch (error) {
            if (error.response && error.response.data) {
                const errorData = error.response.data;
                const message =
                    typeof errorData === "string"
                        ? errorData
                        : errorData?.message ||
                        errorData.error ||
                        "Something went wrong.";
                setCustomError(message);
                setEquipmentByCode(null);
                return { success: false, error: message };
            } else if (error.request) {
                setCustomError("No response from the server.");
                return { success: false, error: "No response from the server." };
            } else {
                setCustomError(error.message || "Unexpected error occurred.");
                return {
                    success: false,
                    error: error.message || "Unexpected error occurred.",
                };
            }
        }
    };


    // ============================================================
    // FETCH MY LABORATORY
    // GET /api/v1/equipment/FindByEquipment?from=&to=&all=
    // ============================================================
    const fetchMyLaboratory = async (filters = {}) => {
        if (!authToken) return null;
        setLoading(true);
        try {
            // ✅ Buuin ang query params
            const params = {};

            if (filters.all) {
                params.all = "true";
            } else {
                if (filters.from) params.from = filters.from;
                if (filters.to) params.to = filters.to;
            }

            const res = await axiosInstance.get(
                `${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/api/v1/equipment/FindByEquipment`,
                {
                    params, // ✅ axios automatic mag-a-append sa URL
                    withCredentials: true,
                    headers: { Authorization: `Bearer ${authToken}` },
                }
            );

            if (res?.data?.status === "success") {
                // Laboratory info
                const labData = Array.isArray(res.data.data)
                    ? res.data.data[0]
                    : res.data.data || null;

                // PMS records (top-level array sa response mo)
                const pmsRecords = Array.isArray(res.data.pmsRecord)
                    ? res.data.pmsRecord
                    : [];

                setMyLaboratory(labData);
                setPmsRecord(pmsRecords);

                return {
                    success: true,
                    data: labData,
                    pmsRecord: pmsRecords,
                };
            } else {
                setMyLaboratory(null);
                setPmsRecord([]);
                return {
                    success: false,
                    error: res?.data?.message || "No laboratory found.",
                };
            }
        } catch (error) {
            if (error.response && error.response.data) {
                const errorData = error.response.data;
                const message =
                    typeof errorData === "string"
                        ? errorData
                        : errorData?.message ||
                        errorData.error ||
                        "Something went wrong.";
                setCustomError(message);
                setMyLaboratory(null);
                setPmsRecord([]);
                return { success: false, error: message };
            } else if (error.request) {
                setCustomError("No response from the server.");
                setMyLaboratory(null);
                setPmsRecord([]);
                return {
                    success: false,
                    error: "No response from the server.",
                };
            } else {
                setCustomError(error.message || "Unexpected error occurred.");
                setMyLaboratory(null);
                setPmsRecord([]);
                return {
                    success: false,
                    error: error.message || "Unexpected error occurred.",
                };
            }
        } finally {
            setLoading(false);
        }
    };
    const sendaddEquipment = async (values) => {
        try {
            const response = await axiosInstance.post(
                `${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/api/v1/equipment`,
                {
                    code: values.code,
                    Category: values.Category,
                    Specification: values.Specification,
                    Brand: values.Brand,
                    SerialNumber: values.SerialNumber,
                    remarks: values.remarks,
                    DateAcquired: values.DateAcquired,
                },
                {
                    withCredentials: true,
                    headers: { Authorization: `Bearer ${authToken}` },
                }
            );

            if (response?.data.status === "success") {
                setModalStatus("success");
                setShowModal(true);
                await fetchEquipmentData(); //  Refresh data after adding
                return { success: true, data: response?.data.data };
            } else {
                setModalStatus("failed");
                setShowModal(true);
                return {
                    success: false,
                    error: "Unexpected response from server.",
                };
            }
        } catch (error) {
            if (error.response && error.response.data) {
                const errorData = error.response.data;
                const message =
                    typeof errorData === "string"
                        ? errorData
                        : errorData?.message ||
                        errorData.error ||
                        "Something went wrong.";
                setCustomError(message);
            } else if (error.request) {
                setCustomError("No response from the server.");
            } else {
                setCustomError(error.message || "Unexpected error occurred.");
            }
            return { success: false, error: customError };
        }
    };

    const EditEquipmentData = async (equipmentID, values) => {
        try {
            const response = await axiosInstance.patch(
                `${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/api/v1/equipment/${equipmentID}`,
                {
                    code: values.code,
                    Category: values.Category,
                    Specification: values.Specification,
                    Brand: values.Brand,
                    SerialNumber: values.SerialNumber,
                    remarks: values.remarks,
                    DateAcquired: values.DateAcquired,
                },
                {
                    withCredentials: true,
                    headers: { Authorization: `Bearer ${authToken}` },
                }
            );

            if (response.data && response.data.status === "success") {
                setModalStatus("success");
                setShowModal(true);
                await fetchEquipmentData(); //  Refresh data after editing
                return { success: true, data: response.data.data };
            } else {
                setModalStatus("failed");
                setShowModal(true);
                return {
                    success: false,
                    error: "Unexpected response from server.",
                };
            }
        } catch (error) {
            if (error.response && error.response.data) {
                const errorData = error.response.data;
                const message =
                    typeof errorData === "string"
                        ? errorData
                        : errorData.message ||
                        errorData.error ||
                        "Something went wrong.";
                setCustomError(message);
            } else if (error.request) {
                setCustomError("No response from the server.");
            } else {
                setCustomError(error.message || "Unexpected error occurred.");
            }
            return { success: false, error: customError };
        }
    };

    const DeleteDatas = async (equipmentID) => {
        try {
            const response = await axiosInstance.delete(
                `${import.meta.env.VITE_REACT_APP_BACKEND_BASEURL}/api/v1/equipment/delete/${equipmentID}`,
                {
                    withCredentials: true,
                    headers: { Authorization: `Bearer ${authToken}` },
                }
            );
            if (response.data && response.data.status === "success") {
                setModalStatus("success");
                setShowModal(true);
                await fetchEquipmentData(); //  Refresh data after deletion
                return { success: true, data: response.data.data };
            } else {
                setModalStatus("failed");
                setShowModal(true);
                return {
                    success: false,
                    error: "Unexpected response from server.",
                };
            }
        } catch (error) {
            setCustomError("Failed to delete equipment.");
            return { success: false, error: "Failed to delete equipment." };
        }
    };

    // 🔹 Helper — reset error state
    const resetError = () => setError(null);

    // 🔹 Helper — clear selected equipment
    const clearSelection = () => setSelectedEquipment(null);

    // 🔹 Derived — filtered equipment base sa searchQuery + statusFilter
    const filteredEquipment = useMemo(() => {
        let list = equipment || [];

        if (statusFilter && statusFilter !== "All") {
            list = list.filter((item) => item.status === statusFilter);
        }

        if (searchQuery && searchQuery.trim() !== "") {
            const q = searchQuery.toLowerCase();
            list = list.filter((item) => {
                return (
                    item.code?.toLowerCase().includes(q) ||
                    item.Brand?.toLowerCase().includes(q) ||
                    item.Specification?.toLowerCase().includes(q) ||
                    item.SerialNumber?.toLowerCase().includes(q) ||
                    item.CategoryName?.toLowerCase().includes(q)
                );
            });
        }

        return list;
    }, [equipment, statusFilter, searchQuery]);

    return (
        <EquipmentDataContext.Provider
            value={{
                // existing
                DeleteDatas,
                EditEquipmentData,
                setCustomError,
                customError,
                sendaddEquipment,
                equipmentsPerPage,
                setequipmentsPerPage,
                setCurrentPage,
                currentPage,
                TotalAvailableEquipments,
                totalEquipments,
                equipment,
                setEquipment,
                loading,
                error,
                fetchEquipmentData,

                // bagong dagdag
                selectedEquipment,
                setSelectedEquipment,
                equipmentById,
                fetchEquipmentById,
                equipmentByCode,
                setEquipmentByCode,
                fetchEquipmentByCode,
                searchQuery,
                setSearchQuery,
                statusFilter,
                setStatusFilter,
                filteredEquipment,
                resetError,
                clearSelection,
                setError,
                setLoading,
                myLaboratory,
                setMyLaboratory,
                fetchMyLaboratory, PmsRecord
            }}
        >
            {children}

            <StatusModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                status={modalStatus}
            />
        </EquipmentDataContext.Provider>
    );
};

//  Add default export
export default EquipmentProvider;