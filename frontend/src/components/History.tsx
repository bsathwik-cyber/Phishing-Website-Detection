"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  History as HistoryIcon,
  Search, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpDown, 
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Flame
} from "lucide-react";

// Import ShadCN components
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ScanRecord {
  id: number;
  url: string;
  prediction: "Safe" | "Suspicious" | "Phishing";
  confidence: number;
  risk_level: "Low" | "Medium" | "High";
  timestamp: string;
}

interface HistoryProps {
  refreshTrigger: number;
  addNotification: (message: string, type: "success" | "error" | "info" | "warning") => void;
}

export default function History({ refreshTrigger, addNotification }: HistoryProps) {
  const [history, setHistory] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState("timestamp");
  const [order, setOrder] = useState("DESC");
  const limit = 10;

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await axios.get("http://127.0.0.1:5001/api/history", {
        params: {
          search: search || undefined,
          sortBy,
          order,
          limit,
          page: currentPage
        }
      });
      setHistory(response.data.history);
      setTotalCount(response.data.total_count);
    } catch (err: any) {
      addNotification("Failed to fetch scan history from server", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [currentPage, sortBy, order, refreshTrigger]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchHistory();
  };

  const toggleSort = (column: string) => {
    if (sortBy === column) {
      setOrder(order === "DESC" ? "ASC" : "DESC");
    } else {
      setSortBy(column);
      setOrder("DESC");
    }
    setCurrentPage(1);
  };

  const getRiskBadge = (risk: string) => {
    if (risk === "Low") {
      return (
        <span className="px-2 py-0.5 rounded border border-cyber-safe/20 bg-cyber-safe/10 text-cyber-safe text-xs font-semibold">
          Low
        </span>
      );
    }
    if (risk === "Medium") {
      return (
        <span className="px-2 py-0.5 rounded border border-cyber-warning/20 bg-cyber-warning/10 text-cyber-warning text-xs font-semibold">
          Medium
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded border border-cyber-danger/20 bg-cyber-danger/10 text-cyber-danger text-xs font-semibold">
        High
      </span>
    );
  };

  const getPredictionIcon = (pred: string) => {
    if (pred === "Safe") return <CheckCircle className="w-4 h-4 text-cyber-safe" />;
    if (pred === "Suspicious") return <AlertTriangle className="w-4 h-4 text-cyber-warning" />;
    return <Flame className="w-4 h-4 text-cyber-danger" />;
  };

  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString();
    } catch (e) {
      return isoString;
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-cyber-cyan glow-text flex items-center gap-2">
          <HistoryIcon className="w-5 h-5" /> Threat Scan Logger
        </h2>
        
        <button
          onClick={fetchHistory}
          disabled={loading}
          className="p-2 rounded border border-cyber-border hover:border-cyber-cyan text-gray-400 hover:text-cyber-cyan cursor-pointer transition-colors"
          title="Refresh Log"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Search form */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Search by URL, prediction, or risk level..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          type="submit"
          disabled={loading}
          className="cursor-pointer"
        >
          Search
        </Button>
      </form>

      {/* Table Container */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="px-4 py-3 cursor-pointer select-none" onClick={() => toggleSort("url")}>
              <div className="flex items-center gap-1">
                URL <ArrowUpDown className="w-3 h-3" />
              </div>
            </TableHead>
            <TableHead className="px-4 py-3 cursor-pointer select-none text-center" onClick={() => toggleSort("prediction")}>
              <div className="flex items-center justify-center gap-1">
                Prediction <ArrowUpDown className="w-3 h-3" />
              </div>
            </TableHead>
            <TableHead className="px-4 py-3 cursor-pointer select-none text-right" onClick={() => toggleSort("confidence")}>
              <div className="flex items-center justify-end gap-1">
                Confidence <ArrowUpDown className="w-3 h-3" />
              </div>
            </TableHead>
            <TableHead className="px-4 py-3 text-center">Risk Level</TableHead>
            <TableHead className="px-4 py-3 cursor-pointer select-none text-right" onClick={() => toggleSort("timestamp")}>
              <div className="flex items-center justify-end gap-1">
                Scanned At <ArrowUpDown className="w-3 h-3" />
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={5} className="px-4 py-8 text-center text-gray-500">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-cyber-cyan" />
                Loading database scans...
              </TableCell>
            </TableRow>
          ) : history.length > 0 ? (
            history.map((record) => (
              <TableRow key={record.id}>
                <TableCell className="font-mono text-xs max-w-xs sm:max-w-md truncate break-all" title={record.url}>
                  {record.url}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-1.5">
                    {getPredictionIcon(record.prediction)}
                    <span className="font-semibold text-xs">{record.prediction}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono text-cyber-cyan">
                  {record.confidence.toFixed(2)}%
                </TableCell>
                <TableCell className="text-center">
                  {getRiskBadge(record.risk_level)}
                </TableCell>
                <TableCell className="text-right text-xs text-gray-400 font-mono">
                  {formatTimestamp(record.timestamp)}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="px-4 py-8 text-center text-gray-500">
                No scan history found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Pagination Controls */}
      {!loading && totalCount > limit && (
        <div className="flex items-center justify-between pt-4 border-t border-cyber-border/40 text-sm">
          <div className="text-gray-400">
            Showing <span className="text-cyber-cyan">{(currentPage - 1) * limit + 1}</span> to{" "}
            <span className="text-cyber-cyan">
              {Math.min(currentPage * limit, totalCount)}
            </span>{" "}
            of <span className="text-cyber-cyan">{totalCount}</span> records
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded border border-cyber-border hover:border-cyber-cyan hover:text-cyber-cyan disabled:opacity-30 disabled:hover:border-cyber-border disabled:hover:text-gray-300 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-gray-300 font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded border border-cyber-border hover:border-cyber-cyan hover:text-cyber-cyan disabled:opacity-30 disabled:hover:border-cyber-border disabled:hover:text-gray-300 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
