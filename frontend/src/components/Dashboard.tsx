"use client";

import React, { useEffect } from "react";
import axios from "axios";
import useSWR from "swr";
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  AreaChart, 
  Area, 
  CartesianGrid 
} from "recharts";
import { 
  BarChart3, 
  Shield, 
  CheckCircle2, 
  AlertTriangle, 
  Skull, 
  Percent, 
  TrendingUp, 
  Loader2,
  ShieldAlert
} from "lucide-react";

// Import ShadCN Card Components
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface TrendData {
  date: string;
  total: number;
  safe: number;
  suspicious: number;
  phishing: number;
}

interface DistributionData {
  name: string;
  value: number;
}

interface StatsResponse {
  totalScans: number;
  safe: number;
  suspicious: number;
  phishing: number;
  avgConfidence: number;
  detectionRate: number;
  latestScanTimestamp?: string | null;
  trends: TrendData[];
  distribution: DistributionData[];
}

interface DashboardProps {
  refreshTrigger: number;
  addNotification: (message: string, type: "success" | "error" | "info" | "warning") => void;
}

const fetcher = (url: string) => axios.get(url).then(res => res.data);

export default function Dashboard({ refreshTrigger, addNotification }: DashboardProps) {
  const { data: stats, error, mutate } = useSWR<StatsResponse>(
    "http://127.0.0.1:5001/api/dashboard/stats",
    fetcher
  );

  useEffect(() => {
    mutate();
  }, [refreshTrigger, mutate]);

  useEffect(() => {
    if (error) {
      addNotification("Failed to fetch dashboard metrics from backend.", "error");
    }
  }, [error, addNotification]);

  if (!stats && !error) {
    return (
      <div className="glass-panel p-20 rounded-xl flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 text-cyber-cyan animate-spin" />
        <p className="text-sm text-gray-400 font-medium">Retrieving security audit analytics...</p>
      </div>
    );
  }

  if (!stats) return null;

  const COLORS = ["#10b981", "#f59e0b", "#ef4444"]; // Safe, Suspicious, Phishing

  // Custom tooltips for Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-cyber-darker border border-cyber-border p-3 rounded-lg shadow-xl text-xs font-mono">
          <p className="text-gray-400 mb-1">{label}</p>
          {payload.map((item: any, i: number) => (
            <p key={i} style={{ color: item.color || item.fill }}>
              {item.name}: {item.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* 6 Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Card 1: Total Scans */}
        <Card className="glass-panel-hover flex items-center justify-between p-5">
          <div className="space-y-1">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Total Scans</span>
            <div className="text-2xl font-bold text-cyber-cyan glow-text">{stats.totalScans}</div>
            {stats.latestScanTimestamp && (
              <p className="text-[10px] text-gray-500 font-mono mt-0.5 leading-none">
                Latest: {new Date(stats.latestScanTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
            )}
          </div>
          <div className="p-3 bg-cyber-cyan/10 border border-cyber-cyan/20 rounded-lg">
            <Shield className="w-5 h-5 text-cyber-cyan" />
          </div>
        </Card>

        {/* Card 2: Safe Scans */}
        <Card className="glass-panel-hover flex items-center justify-between p-5">
          <div className="space-y-1">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Safe URLs</span>
            <div className="text-2xl font-bold text-cyber-safe">{stats.safe}</div>
          </div>
          <div className="p-3 bg-cyber-safe/10 border border-cyber-safe/20 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-cyber-safe" />
          </div>
        </Card>

        {/* Card 3: Suspicious Scans */}
        <Card className="glass-panel-hover flex items-center justify-between p-5">
          <div className="space-y-1">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Suspicious URLs</span>
            <div className="text-2xl font-bold text-cyber-warning">{stats.suspicious}</div>
          </div>
          <div className="p-3 bg-cyber-warning/10 border border-cyber-warning/20 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-cyber-warning" />
          </div>
        </Card>

        {/* Card 4: Phishing Scans */}
        <Card className="glass-panel-hover flex items-center justify-between p-5">
          <div className="space-y-1">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Phishing URLs</span>
            <div className="text-2xl font-bold text-cyber-danger">{stats.phishing}</div>
          </div>
          <div className="p-3 bg-cyber-danger/10 border border-cyber-danger/20 rounded-lg">
            <Skull className="w-5 h-5 text-cyber-danger" />
          </div>
        </Card>

        {/* Card 5: Detection Rate */}
        <Card className="glass-panel-hover flex items-center justify-between p-5">
          <div className="space-y-1">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Detection Rate</span>
            <div className="text-2xl font-bold text-cyber-danger">{stats.detectionRate.toFixed(2)}%</div>
          </div>
          <div className="p-3 bg-cyber-danger/10 border border-cyber-danger/20 rounded-lg">
            <ShieldAlert className="w-5 h-5 text-cyber-danger" />
          </div>
        </Card>

        {/* Card 6: Average Confidence */}
        <Card className="glass-panel-hover flex items-center justify-between p-5">
          <div className="space-y-1">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Avg Confidence</span>
            <div className="text-2xl font-bold text-cyber-cyan glow-text">{stats.avgConfidence.toFixed(2)}%</div>
          </div>
          <div className="p-3 bg-cyber-cyan/10 border border-cyber-cyan/20 rounded-lg">
            <Percent className="w-5 h-5 text-cyber-cyan" />
          </div>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Trend Area Chart (8 Columns) */}
        <Card className="lg:col-span-8 p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <CardTitle className="text-base font-bold text-cyber-cyan glow-text flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Scan History Trend
            </CardTitle>
          </div>
          
          <CardContent className="p-0">
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSafe" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorSuspicious" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPhish" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#102238" vertical={false} />
                  <XAxis dataKey="date" stroke="#4b5563" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                  <YAxis stroke="#4b5563" tick={{ fill: "#9ca3af", fontSize: 10 }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Area type="monotone" dataKey="safe" name="Safe" stroke="#10b981" fillOpacity={1} fill="url(#colorSafe)" strokeWidth={2} />
                  <Area type="monotone" dataKey="suspicious" name="Suspicious" stroke="#f59e0b" fillOpacity={1} fill="url(#colorSuspicious)" strokeWidth={2} />
                  <Area type="monotone" dataKey="phishing" name="Phishing" stroke="#ef4444" fillOpacity={1} fill="url(#colorPhish)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart Distribution (4 Columns) */}
        <Card className="lg:col-span-4 p-5 flex flex-col justify-between">
          <CardTitle className="text-base font-bold text-cyber-cyan glow-text flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4" /> Threat Distribution
          </CardTitle>
          
          <CardContent className="p-0">
            <div className="h-[224px] w-full flex items-center justify-center">
              {stats.totalScans > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.distribution.filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {stats.distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-gray-500 text-sm">No distribution metrics available</div>
              )}
            </div>
          </CardContent>
          
          <div className="flex justify-around text-xs pt-2 border-t border-cyber-border/40 font-mono">
            <div className="text-center">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-cyber-safe mr-1" />
              <span className="text-gray-400">Safe</span>
            </div>
            <div className="text-center">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-cyber-warning mr-1" />
              <span className="text-gray-400">Suspicious</span>
            </div>
            <div className="text-center">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-cyber-danger mr-1" />
              <span className="text-gray-400">Phishing</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Bar Chart Summary */}
      {stats.totalScans > 0 && (
        <Card className="p-5">
          <CardTitle className="text-base font-bold text-cyber-cyan glow-text flex items-center gap-2 mb-4">
            Threat Breakdown Statistics
          </CardTitle>
          <CardContent className="p-0">
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: "Safe", Count: stats.safe, fill: "#10b981" },
                    { name: "Suspicious", Count: stats.suspicious, fill: "#f59e0b" },
                    { name: "Phishing", Count: stats.phishing, fill: "#ef4444" }
                  ]}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#102238" vertical={false} />
                  <XAxis dataKey="name" stroke="#4b5563" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                  <YAxis stroke="#4b5563" tick={{ fill: "#9ca3af", fontSize: 11 }} allowDecimals={false} />
                  <Tooltip cursor={{ fill: "rgba(0, 240, 255, 0.05)" }} content={<CustomTooltip />} />
                  <Bar dataKey="Count" radius={[4, 4, 0, 0]}>
                    {
                      [
                        { fill: "#10b981" },
                        { fill: "#f59e0b" },
                        { fill: "#ef4444" }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))
                    }
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
