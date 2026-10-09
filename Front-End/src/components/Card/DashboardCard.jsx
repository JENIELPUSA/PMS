import { 
    MdPerson, 
    MdBuild, 
    MdScience, 
    MdApartment, 
    MdCheckCircle, 
    MdHourglassEmpty, 
    MdWarning, 
    MdPending, 
    MdCheck, 
    MdClose, 
    MdDoneAll, 
    MdSchedule, 
    MdAssignment, 
    MdDevices, 
    MdInventory, 
    MdErrorOutline, 
    MdOutlineCheckCircle, 
    MdOutlinePending, 
    MdOutlineWarning, 
    MdChevronLeft, 
    MdChevronRight,
    MdInventory2,
    MdCheckCircleOutline,
    MdCancel,
    MdReportProblem
} from "react-icons/md";

import React, { useState, useContext, useEffect, useRef, useMemo, useCallback } from "react";
import { EquipmentDataContext } from "../../contexts/EquipmentContext/EquipmentContext.jsx";
import { LaboratoryContext } from "../../contexts/LaboratoryContext/LaboratoryContext.jsx";
import { UserDataContext } from "../../contexts/UserContext/UserContext.jsx";
import { AuthContext } from "../../contexts/AuthContext.jsx";
import { FilterSpecificAssignContext } from "../../contexts/FilterSpecificAssignContext/FilterSpecificAssignContext.jsx";
import { MaintenanceRequestContext } from "../../contexts/MaintenanceRequestContext/MaintenanceRequestContext.jsx";
import { motion, AnimatePresence } from "framer-motion";

function DashboardCard({ statisticsData, technicianStats, supplyStatistics }) {

  const summary = statisticsData?.summary || {};
  const technicianCard = technicianStats?.dashboardCards || {};
  const supplyCard = supplyStatistics?.summary || {};
  const supplyCards = supplyStatistics?.cards || [];

  const [piedataTechnician, setPiedatatoTechnician] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [cardsPerPage, setCardsPerPage] = useState(3);
  const autoSlideInterval = useRef(null);
  const [isPaused, setIsPaused] = useState(false);
  const [direction, setDirection] = useState(1);

  const filterContext = useContext(FilterSpecificAssignContext);
  const maintenanceContext = useContext(MaintenanceRequestContext);
  const authContext = useContext(AuthContext);
  const equipmentContext = useContext(EquipmentDataContext);
  const laboratoryContext = useContext(LaboratoryContext);
  const userContext = useContext(UserDataContext);

  const laboratoryData = filterContext?.laboratoryData ?? {};
  const request = maintenanceContext?.request ?? [];
  const role = authContext?.role ?? null;
  const FirstName = authContext?.FirstName ?? "";
  const LastName = authContext?.LastName ?? "";
  const equipment = equipmentContext?.equipment ?? [];

  const [pending, setPending] = useState(0);
  const [under, setUnder] = useState(0);
  const [Accomplish, setAccomplish] = useState(0);
  const [Assigning, setAssigning] = useState(0);
  const [availables, setAvailables] = useState(0);

  const fullName = `${FirstName ?? ""} ${LastName ?? ""}`.trim();

  useEffect(() => {
    const updateCardsPerPage = () => {
      if (window.innerWidth < 640) {
        setCardsPerPage(1);
      } else if (window.innerWidth < 1024) {
        setCardsPerPage(2);
      } else {
        setCardsPerPage(3);
      }
    };

    updateCardsPerPage();
    window.addEventListener('resize', updateCardsPerPage);
    return () => window.removeEventListener('resize', updateCardsPerPage);
  }, []);

  const getCardData = useCallback(() => {
    if (role === "Admin") {
      return [
        { icon: MdDevices, label: "Total Equipment", value: summary.totalEquipment || 0, accent: "blue" },
        { icon: MdCheck, label: "Available", value: summary.availableEquipment || 0, accent: "green" },
        { icon: MdClose, label: "Not Available", value: summary.notAvailableEquipment || 0, accent: "red" },
        { icon: MdAssignment, label: "Assigned Equipment", value: summary.totalAssignedEquipment || 0, accent: "blue" },
        { icon: MdInventory, label: "Unassigned Equipment", value: summary.totalUnassignedEquipment || 0, accent: "slate" },
        { icon: MdDoneAll, label: "Total Assignments", value: summary.totalAssignments || 0, accent: "blue" },
        { icon: MdWarning, label: "Maintenance Requests", value: summary.totalMaintenanceRequests || 0, accent: "amber" },
        { icon: MdSchedule, label: "Maintenance Schedules", value: summary.totalMaintenanceSchedules || 0, accent: "blue" },
        { icon: MdBuild, label: "Equipment with Schedule", value: summary.totalEquipmentWithSchedule || 0, accent: "blue" },
        { icon: MdErrorOutline, label: "Overdue Schedules", value: summary.totalOverdueSchedules || 0, accent: "red" },
        { icon: MdOutlineCheckCircle, label: "Requests with Feedback", value: summary.requestsWithFeedback || 0, accent: "green" },
        { icon: MdOutlinePending, label: "Requests without Feedback", value: summary.requestsWithoutFeedback || 0, accent: "amber" },
      ];
    } else if (role === "User") {
      return [
        { icon: MdApartment, label: "Department", value: laboratoryData?.departmentName ?? "N/A", accent: "blue" },
        { icon: MdScience, label: "Laboratory", value: laboratoryData?.laboratoryName ?? "N/A", accent: "blue" },
        { icon: MdBuild, label: "Equipments", value: laboratoryData?.equipmentsCount ?? 0, accent: "green" },
      ];
    } else if (role === "Technician") {
      return [
        { icon: MdWarning, label: "Maintenance Requests", value: technicianCard.totalMaintenanceRequests || 0, accent: "amber" },
        { icon: MdSchedule, label: "Maintenance Schedules", value: technicianCard.totalMaintenanceSchedules || 0, accent: "blue" },
        { icon: MdCheckCircle, label: "Completed Requests", value: technicianCard.completedRequests || 0, accent: "green" },
        { icon: MdPending, label: "Not Accomplish", value: technicianCard.notAccomplish || 0, accent: "amber" },
        { icon: MdHourglassEmpty, label: "Completion Rate", value: (technicianCard.completionRate || 0) + "%", accent: "blue" },
        { icon: MdErrorOutline, label: "Overdue Schedules", value: technicianCard.totalOverdueSchedules || 0, accent: "red" },
        { icon: MdBuild, label: "With Technician", value: technicianCard.withTechnician || 0, accent: "blue" },
        { icon: MdOutlineWarning, label: "Without Technician", value: technicianCard.withoutTechnician || 0, accent: "slate" },
        { icon: MdOutlineCheckCircle, label: "Requests with Feedback", value: technicianCard.requestsWithFeedback || 0, accent: "green" },
        { icon: MdOutlinePending, label: "Requests without Feedback", value: technicianCard.requestsWithoutFeedback || 0, accent: "amber" },
        { icon: MdPerson, label: "Requests with Technician", value: technicianCard.requestsWithTechnician || 0, accent: "blue" },
        { icon: MdOutlineWarning, label: "Requests without Technician", value: technicianCard.requestsWithoutTechnician || 0, accent: "slate" },
      ];
    } else if (role === "Supply") {
      if (supplyCards && supplyCards.length > 0) {
        const iconMap = {
          'Total Equipment': MdInventory2,
          'Available': MdCheckCircleOutline,
          'Not Available': MdCancel,
          'With Issues': MdReportProblem
        };
        
        return supplyCards.map((card) => ({
          icon: iconMap[card.title] || MdInventory,
          label: card.title,
          value: card.value,
          subtitle: card.subtitle,
          accent: card.color === "yellow" ? "amber" : card.color,
        }));
      }

      return [
        {
          icon: MdInventory2,
          label: "Total Equipment",
          value: supplyCard?.totalEquipment || 0,
          subtitle: "All registered equipment",
          accent: "blue"
        },
        {
          icon: MdCheckCircleOutline,
          label: "Available",
          value: supplyCard?.availableEquipment || 0,
          subtitle: `${supplyCard?.totalEquipment > 0 ? ((supplyCard?.availableEquipment / supplyCard?.totalEquipment) * 100).toFixed(1) : 0}% of total`,
          accent: "green"
        },
        {
          icon: MdCancel,
          label: "Not Available",
          value: supplyCard?.notAvailableEquipment || 0,
          subtitle: `${supplyCard?.totalEquipment > 0 ? ((supplyCard?.notAvailableEquipment / supplyCard?.totalEquipment) * 100).toFixed(1) : 0}% of total`,
          accent: "red"
        },
        {
          icon: MdReportProblem,
          label: "With Issues",
          value: supplyCard?.equipmentWithRemarks || 0,
          subtitle: `${supplyCard?.totalEquipment > 0 ? ((supplyCard?.equipmentWithRemarks / supplyCard?.totalEquipment) * 100).toFixed(1) : 0}% have remarks`,
          accent: "amber"
        },
      ];
    }
    return [];
  }, [role, summary, technicianCard, supplyCard, supplyCards, laboratoryData]);

  const cards = useMemo(() => getCardData(), [getCardData]);
  const totalPages = useMemo(() => Math.ceil(cards.length / cardsPerPage), [cards.length, cardsPerPage]);

  const currentCards = useMemo(() => {
    const start = currentPage * cardsPerPage;
    const end = start + cardsPerPage;
    return cards.slice(start, end);
  }, [cards, currentPage, cardsPerPage]);

  useEffect(() => {
    if (autoSlideInterval.current) {
      clearInterval(autoSlideInterval.current);
      autoSlideInterval.current = null;
    }

    if (totalPages > 1 && !isPaused) {
      autoSlideInterval.current = setInterval(() => {
        setDirection(1);
        setCurrentPage((prev) => (prev < totalPages - 1 ? prev + 1 : 0));
      }, 4000);
    }

    return () => {
      if (autoSlideInterval.current) {
        clearInterval(autoSlideInterval.current);
        autoSlideInterval.current = null;
      }
    };
  }, [totalPages, isPaused]);

  useEffect(() => {
    const safeRequests = Array.isArray(request) ? request : [];
    const filteredPiedata = safeRequests.filter((item) => {
      const techName = typeof item?.Technician === "string" ? item.Technician.trim().toLowerCase() : "";
      return item?.UserId && techName === fullName.toLowerCase();
    });
    setPiedatatoTechnician(filteredPiedata);
  }, [request, fullName]);

  useEffect(() => {
    const safeEquipment = Array.isArray(equipment) ? equipment : [];
    const safeRequests = Array.isArray(request) ? request : [];

    if (role === "Admin") {
      setAvailables(safeEquipment.filter((item) => item?.status === "Available").length);
    } else if (role === "Technician") {
      const targetName = fullName.toLowerCase();
      const Assigned = safeRequests.filter((item) =>
        typeof item?.Technician === "string" &&
        item.Technician.toLowerCase().trim() === targetName
      );
      setUnder(piedataTechnician.filter(item => item?.Status === "Under Maintenance").length);
      setPending(piedataTechnician.filter(item => item?.Status === "Pending").length);
      setAccomplish(piedataTechnician.filter(item => item?.Status === "Success").length);
      setAssigning(Assigned.length);
    }
  }, [role, equipment, request, piedataTechnician, fullName]);

  const goToPrevious = useCallback(() => {
    setDirection(-1);
    setIsPaused(true);
    setCurrentPage((prev) => (prev > 0 ? prev - 1 : totalPages - 1));
    setTimeout(() => setIsPaused(false), 5000);
  }, [totalPages]);

  const goToNext = useCallback(() => {
    setDirection(1);
    setIsPaused(true);
    setCurrentPage((prev) => (prev < totalPages - 1 ? prev + 1 : 0));
    setTimeout(() => setIsPaused(false), 5000);
  }, [totalPages]);

  const goToPage = useCallback((pageIndex) => {
    setDirection(pageIndex > currentPage ? 1 : -1);
    setIsPaused(true);
    setCurrentPage(pageIndex);
    setTimeout(() => setIsPaused(false), 5000);
  }, [currentPage]);

  const handleMouseEnter = useCallback(() => setIsPaused(true), []);
  const handleMouseLeave = useCallback(() => setIsPaused(false), []);

  const slideVariants = useMemo(() => ({
    enter: (direction) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: {
        duration: 0.35,
        ease: "easeOut",
      }
    },
    exit: (direction) => ({
      x: direction > 0 ? -50 : 50,
      opacity: 0,
      transition: { duration: 0.25, ease: "easeIn" }
    })
  }), []);

  const cardVariants = useMemo(() => ({
    enter: { opacity: 0, y: 15 },
    center: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3, ease: "easeOut" }
    },
    exit: { opacity: 0, y: -15, transition: { duration: 0.2 } }
  }), []);

  const accentStyles = {
    blue: {
      bar: "bg-blue-600",
      iconBg: "bg-blue-50 text-blue-600",
      value: "text-slate-900",
      border: "hover:border-blue-200",
    },
    green: {
      bar: "bg-emerald-500",
      iconBg: "bg-emerald-50 text-emerald-600",
      value: "text-slate-900",
      border: "hover:border-emerald-200",
    },
    red: {
      bar: "bg-rose-500",
      iconBg: "bg-rose-50 text-rose-600",
      value: "text-slate-900",
      border: "hover:border-rose-200",
    },
    amber: {
      bar: "bg-amber-500",
      iconBg: "bg-amber-50 text-amber-600",
      value: "text-slate-900",
      border: "hover:border-amber-200",
    },
    slate: {
      bar: "bg-slate-400",
      iconBg: "bg-slate-100 text-slate-600",
      value: "text-slate-900",
      border: "hover:border-slate-300",
    },
  };

  const CardItem = useCallback(({ icon: Icon, label, value, index, subtitle, accent = "blue" }) => {
    const style = accentStyles[accent] || accentStyles.blue;

    return (
      <motion.div
        className="w-full px-2 mb-4 flex-shrink-0"
        style={{ width: `${100 / cardsPerPage}%` }}
        variants={cardVariants}
        custom={index}
      >
        <motion.div
          className={`relative flex items-center gap-4 p-5 bg-white rounded-2xl border border-slate-200 shadow-xs h-full overflow-hidden transition-all duration-300 ${style.border}`}
          whileHover={{ y: -3, shadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)" }}
          transition={{ duration: 0.2 }}
        >
          <span className={`absolute left-0 top-0 h-full w-1.5 ${style.bar}`} />

          <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${style.iconBg}`}>
            <Icon className="w-6 h-6" />
          </div>

          <div className="flex-1 min-w-0">
            <h4 className={`text-2xl font-bold tracking-tight ${style.value}`}>
              {value}
            </h4>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-0.5 truncate">
              {label}
            </p>
            {subtitle && (
              <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                {subtitle}
              </p>
            )}
          </div>
        </motion.div>
      </motion.div>
    );
  }, [cardsPerPage, cardVariants]);

  if (!authContext) {
    return (
      <div className="w-full text-center py-10 text-slate-400 font-medium italic">
        Loading authentication...
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="w-full text-center py-10 text-slate-400 font-medium italic">
        No data available for {role || "current"} role.
      </div>
    );
  }

  return (
    <div
      className="my-4 font-sans"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="relative">
        {totalPages > 1 && (
          <div className="absolute -top-8 right-0 flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-xs shadow-2xs">
            <span className={`inline-block w-2 h-2 rounded-full ${isPaused ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            <span className="text-[10px] font-semibold text-slate-600 uppercase">
              {isPaused ? 'Paused' : 'Auto'}
            </span>
          </div>
        )}

        <div className="overflow-hidden py-1">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentPage}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="flex flex-wrap"
              style={{ marginLeft: '-8px', marginRight: '-8px' }}
            >
              {currentCards.map((card, index) => (
                <CardItem
                  key={`${card.label}-${index}-${currentPage}`}
                  icon={card.icon}
                  label={card.label}
                  value={card.value}
                  subtitle={card.subtitle}
                  accent={card.accent}
                  index={index}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        {cards.length > cardsPerPage && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 flex items-center justify-center bg-white rounded-full shadow-md border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-all focus:outline-none"
              aria-label="Previous"
            >
              <MdChevronLeft className="h-5 w-5" />
            </button>

            <button
              onClick={goToNext}
              className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 flex items-center justify-center bg-white rounded-full shadow-md border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-all focus:outline-none"
              aria-label="Next"
            >
              <MdChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-2">
            {Array.from({ length: totalPages }).map((_, index) => (
              <button
                key={index}
                onClick={() => goToPage(index)}
                className={`h-2 rounded-full transition-all duration-300 focus:outline-none ${
                  currentPage === index
                    ? 'w-8 bg-blue-600'
                    : 'w-2 bg-slate-200 hover:bg-slate-300'
                }`}
                aria-label={`Go to page ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardCard;