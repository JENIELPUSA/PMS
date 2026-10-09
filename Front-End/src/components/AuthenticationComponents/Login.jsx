import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  Wrench,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Cpu,
  ClipboardList,
  BarChart3,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import logobipsu from "../../../public/logo.jpg";

export default function AuthForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [values, setValues] = useState({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [focused, setFocused] = useState(null);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleInput = useCallback(
    (event) => {
      const { name, value } = event.target;
      setValues((prev) => ({ ...prev, [name]: value }));
      if (errorMessage) setErrorMessage("");
    },
    [errorMessage]
  );

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await login(values.email, values.password);
      if (response && response.success) {
        setTimeout(() => navigate("/dashboardfinal"), 1200);
      } else {
        setErrorMessage(
          response?.message ||
            "Invalid credentials. Please verify your PMS access."
        );
      }
    } catch (error) {
      console.error(error);
      setErrorMessage(
        "An unexpected system error occurred. Please try again later."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    { icon: ClipboardList, label: "Equipment Logs" },
    { icon: BarChart3, label: "Analytics" },
    { icon: Cpu, label: "Asset Tracking" },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 relative overflow-hidden font-sans">
      {/* Animated gradient background */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 100, 0],
            y: [0, -50, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-1/2 -left-1/2 w-full h-full rounded-full bg-blue-600/20 blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            x: [0, -100, 0],
            y: [0, 50, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-1/2 -right-1/2 w-full h-full rounded-full bg-amber-400/10 blur-3xl"
        />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative w-full max-w-5xl bg-white rounded-3xl overflow-hidden shadow-2xl shadow-blue-950/50 border border-white/10 grid grid-cols-1 lg:grid-cols-2"
      >
        {/* ============================================================ */}
        {/* LEFT: BRANDING PANEL                                        */}
        {/* ============================================================ */}
        <div className="relative hidden lg:flex flex-col justify-between bg-gradient-to-br from-blue-900 via-blue-950 to-slate-950 p-12 overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-amber-400/10 blur-2xl" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-blue-500/10 blur-2xl" />

          {/* Top: Logo + badge */}
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-12">
              <div className="w-12 h-12 bg-amber-400 rounded-xl flex items-center justify-center shadow-lg shadow-amber-400/30">
                <Wrench size={22} className="text-blue-950" />
              </div>
              <div>
                <div className="text-white font-black text-sm tracking-wider uppercase leading-none">
                  PMS
                </div>
                <div className="text-amber-400 text-[10px] font-bold tracking-wider uppercase mt-0.5">
                  Terminal
                </div>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <h1 className="text-4xl font-black text-white leading-tight mb-4 tracking-tight">
                Preventive
                <br />
                <span className="text-amber-400">Maintenance</span>
                <br />
                System
              </h1>
              <p className="text-blue-200/70 text-sm leading-relaxed max-w-xs">
                Streamlined equipment management, maintenance tracking, and
                analytics for smoother operations.
              </p>
            </motion.div>
          </div>

          {/* Middle: Features */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="relative z-10 space-y-3"
          >
            {features.map((feature, idx) => (
              <motion.div
                key={feature.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + idx * 0.1, duration: 0.4 }}
                className="flex items-center gap-3 text-blue-100/80"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-800/50 backdrop-blur-sm border border-blue-700/50 flex items-center justify-center">
                  <feature.icon size={14} className="text-amber-400" />
                </div>
                <span className="text-xs font-semibold tracking-wide">
                  {feature.label}
                </span>
              </motion.div>
            ))}
          </motion.div>

          {/* Bottom: Status */}
          <div className="relative z-10 pt-8">
            <div className="flex items-center gap-3 bg-blue-900/40 backdrop-blur-md px-4 py-3 rounded-xl border border-blue-700/40">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[10px] font-bold text-amber-300 tracking-wider uppercase">
                System Online · Secure Connection
              </span>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* RIGHT: FORM PANEL                                           */}
        {/* ============================================================ */}
        <div className="relative p-8 sm:p-12 flex flex-col justify-center bg-white">
          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-blue-900 rounded-2xl flex items-center justify-center mb-3 shadow-lg">
              <Wrench size={28} className="text-amber-400" />
            </div>
            <div className="text-blue-900 font-black text-lg tracking-wider uppercase">
              PMS Terminal
            </div>
          </div>

          {/* Desktop: BIPSU Logo */}
          <div className="hidden lg:flex flex-col items-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-amber-50 rounded-full blur-xl opacity-60" />
              <img
                src={logobipsu}
                alt="BIPSU Logo"
                className="relative w-28 h-28 object-contain drop-shadow-sm"
              />
            </div>
          </div>

          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 mb-3">
              <ShieldCheck className="text-blue-900" size={12} />
              <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider">
                Secure Access
              </span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-1">
              Welcome Back
            </h2>
            <p className="text-xs text-slate-500">
              Sign in to access your PMS dashboard
            </p>
          </div>

          {/* Error Banner */}
          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                className="mb-5 overflow-hidden"
              >
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
                  <AlertCircle
                    size={16}
                    className="shrink-0 text-rose-500 mt-0.5"
                  />
                  <span className="text-xs font-medium text-rose-700 leading-relaxed">
                    {errorMessage}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                <Mail size={11} />
                Email Address
              </label>
              <div className="relative">
                <div
                  className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${
                    focused === "email" ? "text-blue-900" : "text-slate-400"
                  }`}
                >
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  name="email"
                  required
                  value={values.email}
                  onChange={handleInput}
                  onFocus={() => setFocused("email")}
                  onBlur={() => setFocused(null)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3.5 pl-11 pr-4 focus:border-blue-900 focus:bg-white outline-none transition-all text-slate-800 font-medium text-sm placeholder:text-slate-400 placeholder:font-normal"
                  placeholder="name@bipsu.edu.ph"
                />
                {values.email && values.email.includes("@") && (
                  <CheckCircle2
                    size={16}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500"
                  />
                )}
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                <Lock size={11} />
                Password
              </label>
              <div className="relative">
                <div
                  className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${
                    focused === "password" ? "text-blue-900" : "text-slate-400"
                  }`}
                >
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required
                  value={values.password}
                  onChange={handleInput}
                  onFocus={() => setFocused("password")}
                  onBlur={() => setFocused(null)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3.5 pl-11 pr-11 focus:border-blue-900 focus:bg-white outline-none transition-all text-slate-800 font-medium text-sm placeholder:text-slate-400 placeholder:font-normal"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-900 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember / Forgot */}
            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-3.5 h-3.5 rounded border-slate-300 text-blue-900 focus:ring-blue-900/20 cursor-pointer"
                />
                <span className="text-slate-600 group-hover:text-slate-800 transition-colors font-medium">
                  Remember me
                </span>
              </label>
              <button
                type="button"
                className="text-blue-900 hover:text-blue-700 font-semibold transition-colors"
              >
                Forgot password?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-4 rounded-xl font-bold text-white uppercase tracking-wider text-xs transition-all shadow-lg relative overflow-hidden group ${
                isLoading
                  ? "bg-slate-400 cursor-wait shadow-slate-300"
                  : "bg-blue-900 hover:bg-blue-800 active:scale-[0.98] shadow-blue-900/30"
              }`}
            >
              {/* Shine effect */}
              {!isLoading && (
                <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              )}
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin" size={16} />
                  Authenticating...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <ShieldCheck size={14} />
                  Sign In to PMS
                </span>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-[10px] text-slate-400 text-center leading-relaxed">
              <span className="font-bold uppercase tracking-wider">
                Biliran Province State University
              </span>
              <br />
              <span className="text-slate-500">
                Preventive Maintenance System © 2026
              </span>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}