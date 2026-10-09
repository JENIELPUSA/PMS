import {
    ChartColumn,
    Home,
    NotepadText,
    Package,
    PackagePlus,
    Settings,
    ShoppingBag,
    UserCheck,
    UserPlus,
    Users,
    FlaskConical,
    Building2,
    FileText,
    ClipboardCheck,
    Wrench,
    History,
    FileBarChart,
    Microscope
} from "lucide-react";

export const navbarLinks = [
    {
        title: "Dashboard",
        links: [
            {
                label: "Dashboard",
                icon: Home,
                path: "/dashboard",
            },
            {
                label: "User",
                icon: Users,
                path: "/dashboard/User",
            },
            {
                label: "Equipment",
                icon: Package,
                path: "/dashboard/equipment",
            },
            {
                label: "Department",
                icon: Building2,
                path: "/dashboard/department",
            },
            {
                label: "Laboratory",
                icon: FlaskConical,
                path: "/dashboard/laboratory",
            },
            {
                label: "Report",
                icon: FileBarChart,
                path: "/dashboard/report",
            },
            {
                label: "Department & Laboratory",
                icon: ClipboardCheck,
                path: "/dashboard/assign",
            },
            {
                label: "PMS Form",
                icon: FileText,
                path: "/dashboard/pms",
            },
            {
                label: "Maintenance History",
                icon: History,
                path: "/dashboard/maintenance",
            },
            {
                label: "Computer Problem",
                icon: History,
                path: "/dashboard/problem",
            },
            {
                label: "Equipment",
                icon: History,
                path: "/dashboard/RequestMaintenances",
            },
            {
                label: "Category",
                icon: History,
                path: "/dashboard/category",
            }
        ],
    }
];