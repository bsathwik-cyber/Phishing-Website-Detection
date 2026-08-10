"use client";

import React, { useState } from "react";
import { SWRConfig } from "swr";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldAlert, 
  LayoutDashboard, 
  Globe, 
  PlusSquare, 
  History as HistoryIcon, 
  Cpu, 
  Skull,
  X,
  CheckCircle,
  AlertTriangle,
  Info
} from "lucide-react";

// Import custom page modules
import Dashboard from "@/components/Dashboard";
import SingleScan from "@/components/SingleScan";
import BulkScan from "@/components/BulkScan";
import History from "@/components/History";
import ModelMetrics from "@/components/ModelMetrics";

interface Notification {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "single" | "bulk" | "history" | "metrics">("dashboard");
  const [refreshTrigger, setRefreshTrigger] = useState(0); // For reloading stats & history dynamically
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Function to add a floating toast notification
  const addNotification = (message: string, type: "success" | "error" | "info" | "warning") => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications((prev) => [...prev, { id, message, type }]);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
      removeNotification(id);
    }, 4000);
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleScanSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const getNotificationStyles = (type: string) => {
    switch (type) {
      case "success":
        return { border: "border-l-cyber-safe", bg: "bg-slate-900/90", icon: <CheckCircle className="w-5 h-5 text-cyber-safe shrink-0" /> };
      case "error":
        return { border: "border-l-cyber-danger", bg: "bg-slate-900/90", icon: <Skull className="w-5 h-5 text-cyber-danger shrink-0" /> };
      case "warning":
        return { border: "border-l-cyber-warning", bg: "bg-slate-900/90", icon: <AlertTriangle className="w-5 h-5 text-cyber-warning shrink-0" /> };
      default:
        return { border: "border-l-cyber-cyan", bg: "bg-slate-900/90", icon: <Info className="w-5 h-5 text-cyber-cyan shrink-0" /> };
    }
  };

  const tabs = [
    { id: "dashboard", label: "Security Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: "single", label: "Single URL Scan", icon: <Globe className="w-4 h-4" /> },
    { id: "bulk", label: "Bulk Threat Scan", icon: <PlusSquare className="w-4 h-4" /> },
    { id: "history", label: "Scan History", icon: <HistoryIcon className="w-4 h-4" /> },
    { id: "metrics", label: "Model Architecture", icon: <Cpu className="w-4 h-4" /> },
  ] as const;

  return (
    <SWRConfig value={{ revalidateOnFocus: false }}>
      <div className="flex-1 flex flex-col min-h-screen relative bg-cyber-dark scanlines">
      {/* Glow overlays */}
      <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] bg-cyber-cyan/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[10%] w-[500px] h-[500px] bg-cyber-blue/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Header / Navigation */}
      <header className="glass-panel border-x-0 border-t-0 border-b border-cyber-border/80 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyber-cyan/10 border border-cyber-cyan/30 rounded-lg text-cyber-cyan glow-border">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-1.5">
                Phish<span className="text-cyber-cyan glow-text">Guard</span>
              </h1>
              <p className="text-2xs font-semibold tracking-wider uppercase text-cyber-cyan/80">
                Real-Time Phishing URL Detection Using Machine Learning
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-2xs font-mono px-3 py-1.5 rounded bg-cyber-darker border border-cyber-border text-gray-400">
            <span className="w-2 h-2 rounded-full bg-cyber-safe animate-ping" />
            <span>LOCAL AUDIT AGENT ACTIVE</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Glassmorphic Tab Navigation */}
        <div className="glass-panel p-1.5 rounded-xl flex flex-wrap gap-1 border border-cyber-border/40">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider cursor-pointer transition-all duration-300 ${
                activeTab === tab.id
                  ? "bg-cyber-cyan/10 border border-cyber-cyan/40 text-cyber-cyan glow-border"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 border border-transparent"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Dynamic Panel Renderer with Page Transitions */}
        <div className="min-h-[500px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === "dashboard" && (
                <Dashboard 
                  refreshTrigger={refreshTrigger} 
                  addNotification={addNotification} 
                />
              )}
              {activeTab === "single" && (
                <SingleScan 
                  onScanComplete={handleScanSuccess} 
                  addNotification={addNotification} 
                />
              )}
              {activeTab === "bulk" && (
                <BulkScan 
                  onScanComplete={handleScanSuccess} 
                  addNotification={addNotification} 
                />
              )}
              {activeTab === "history" && (
                <History 
                  refreshTrigger={refreshTrigger} 
                  addNotification={addNotification} 
                />
              )}
              {activeTab === "metrics" && (
                <ModelMetrics 
                  refreshTrigger={refreshTrigger}
                  addNotification={addNotification} 
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-cyber-border/30 bg-cyber-darker/60 py-6 text-center text-xs text-gray-500 font-mono">
        <div>PhishGuard Local Threat Detection Service. Running entirely on Localhost.</div>
        <div className="text-gray-600 mt-1">Random Forest Classifier | n_estimators: 300 | max_depth: 25</div>
      </footer>

      {/* Toast Notification Manager */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full">
        <AnimatePresence>
          {notifications.map((n) => {
            const styles = getNotificationStyles(n.type);
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: 50, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 50, scale: 0.95 }}
                className={`flex items-start justify-between gap-3 p-4 rounded-lg border-l-4 border ${styles.border} ${styles.bg} shadow-2xl backdrop-blur-md`}
              >
                <div className="flex gap-2">
                  {styles.icon}
                  <p className="text-sm font-semibold text-gray-200">{n.message}</p>
                </div>
                <button
                  onClick={() => removeNotification(n.id)}
                  className="text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  </SWRConfig>
);
}
