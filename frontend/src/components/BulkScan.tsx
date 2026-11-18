"use client";

import React, { useState, useRef } from "react";
import axios from "axios";
import { mutate } from "swr";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Upload, 
  FileText, 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  RefreshCw, 
  CheckCircle,
  AlertTriangle,
  Flame,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

// Import ShadCN components
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface BulkResult {
  url: string;
  prediction: "Safe" | "Suspicious" | "Phishing";
  confidence: number;
  risk_level: "Low" | "Medium" | "High";
}

interface BulkScanProps {
  onScanComplete: () => void;
  addNotification: (message: string, type: "success" | "error" | "info" | "warning") => void;
}

export default function BulkScan({ onScanComplete, addNotification }: BulkScanProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BulkResult[]>([]);
  
  const [search, setSearch] = useState("");
  const [filterPrediction, setFilterPrediction] = useState<string>("All");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const ext = selectedFile.name.split(".").pop()?.toLowerCase();
      
      if (ext !== "csv" && ext !== "txt") {
        addNotification("Unsupported file format. Please upload a .csv or .txt file.", "error");
        return;
      }
      if (selectedFile.size > 1024 * 1024) {
        addNotification("File is too large. The maximum upload size is 1 MiB.", "error");
        return;
      }
      setFile(selectedFile);
      setResults([]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      const ext = selectedFile.name.split(".").pop()?.toLowerCase();
      
      if (ext !== "csv" && ext !== "txt") {
        addNotification("Unsupported file format. Please upload a .csv or .txt file.", "error");
        return;
      }
      if (selectedFile.size > 1024 * 1024) {
        addNotification("File is too large. The maximum upload size is 1 MiB.", "error");
        return;
      }
      setFile(selectedFile);
      setResults([]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const clearFile = () => {
    setFile(null);
    setResults([]);
    setSearch("");
    setFilterPrediction("All");
    setCurrentPage(1);
  };

  const handleUploadAndAnalyze = async () => {
    if (!file) {
      addNotification("Please upload a file first", "warning");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post("http://127.0.0.1:5001/api/bulk-predict", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      setResults(response.data.results);
      setCurrentPage(1); // Reset page counter to 1
      addNotification(
        `Successfully scanned ${response.data.total_processed} URLs from ${file.name}!`, 
        "success"
      );
      mutate("http://127.0.0.1:5001/api/dashboard/stats");
      mutate("http://127.0.0.1:5001/api/dashboard/confusion-matrix");
      onScanComplete();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || "Failed to process file. Make sure the backend is active.";
      addNotification(errorMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    if (results.length === 0) return;
    
    let csvContent = "data:text/csv;charset=utf-8,URL,Prediction,Confidence %,Risk Level\n";
    
    results.forEach((row) => {
      const escapedUrl = row.url.replace(/"/g, '""');
      csvContent += `"${escapedUrl}",${row.prediction},${row.confidence.toFixed(2)},${row.risk_level}\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `phishguard_bulk_results_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addNotification("Downloaded results CSV successfully", "success");
  };

  const filteredResults = results.filter((item) => {
    const matchesSearch = item.url.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filterPrediction === "All" || item.prediction === filterPrediction;
    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.ceil(filteredResults.length / itemsPerPage);
  const paginatedResults = filteredResults.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
    if (risk === "High") {
      return (
        <span className="px-2 py-0.5 rounded border border-cyber-danger/20 bg-cyber-danger/10 text-cyber-danger text-xs font-semibold">
          High
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded border border-gray-600/20 bg-gray-600/10 text-gray-400 text-xs font-semibold">
        N/A
      </span>
    );
  };

  const getPredictionIcon = (pred: string) => {
    if (pred === "Safe") return <CheckCircle className="w-4 h-4 text-cyber-safe" />;
    if (pred === "Suspicious") return <AlertTriangle className="w-4 h-4 text-cyber-warning" />;
    if (pred === "Invalid") return <AlertTriangle className="w-4 h-4 text-gray-500" />;
    return <Flame className="w-4 h-4 text-cyber-danger" />;
  };

  return (
    <div className="space-y-6">
      {/* File Dropzone Card */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-cyber-cyan glow-text">
          <Upload className="w-5 h-5" /> Bulk Threat Scan
        </h2>
        <p className="text-sm text-gray-400 mb-6">
          Upload a plain text file (`.txt`) containing one URL per line, or a comma-separated file (`.csv`) containing a column named `url` or `URL` to perform batch classification.
        </p>

        {!file ? (
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={triggerFileInput}
            className="border-2 border-dashed border-cyber-border hover:border-cyber-cyan/60 bg-cyber-darker/40 hover:bg-cyber-cyan/5 rounded-xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-300"
          >
            <Upload className="w-12 h-12 text-cyber-cyan animate-pulse" />
            <div className="text-center">
              <span className="font-semibold text-cyber-cyan">Click to upload</span> or drag and drop
            </div>
            <div className="text-xs text-gray-500">CSV or TXT · Up to 500 URLs · Maximum file size 1 MiB</div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv,.txt"
              className="hidden"
            />
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-cyber-darker/60 border border-cyber-border flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-cyber-cyan/10 border border-cyber-cyan/20">
                <FileText className="w-6 h-6 text-cyber-cyan" />
              </div>
              <div>
                <h4 className="font-medium text-gray-200 break-all">{file.name}</h4>
                <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={clearFile}
                disabled={loading}
                className="text-gray-400 hover:text-cyber-danger cursor-pointer"
                title="Remove File"
              >
                <Trash2 className="w-5 h-5" />
              </Button>
              
              <Button
                onClick={handleUploadAndAnalyze}
                disabled={loading}
                className="cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Processing...
                  </>
                ) : (
                  <>
                    Run Scan
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Progress Indicators & Spinner */}
      {loading && (
        <Card className="p-10 flex flex-col items-center justify-center gap-4 text-center">
          <RefreshCw className="w-10 h-10 text-cyber-cyan animate-spin" />
          <div className="space-y-1">
            <h3 className="font-bold text-gray-200">Executing Random Forest Predictions</h3>
            <p className="text-sm text-gray-500">Extracting 15 structural features for all batched URLs...</p>
          </div>
          <div className="w-64 bg-cyber-darker rounded-full h-1.5 overflow-hidden">
            <div className="bg-cyber-cyan h-full rounded-full animate-[loading_1.5s_ease-in-out_infinite]" style={{ width: "60%" }}></div>
          </div>
        </Card>
      )}

      {/* Results Table Panel */}
      {results.length > 0 && !loading && (
        <Card className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-lg font-bold text-cyber-cyan glow-text">Analysis Results ({results.length})</h3>
            
            <Button
              variant="default"
              onClick={downloadCSV}
              className="cursor-pointer"
            >
              <Download className="w-4 h-4 mr-2" /> Download CSV
            </Button>
          </div>

          {/* Search, Filter Tools */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Search URL list..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={filterPrediction}
                onChange={(e) => {
                  setFilterPrediction(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-cyber-darker border border-cyber-border focus:border-cyber-cyan focus:outline-none rounded-lg py-2 px-3 text-sm text-gray-300 cursor-pointer"
              >
                <option value="All">All Predictions</option>
                <option value="Safe">Safe</option>
                <option value="Suspicious">Suspicious</option>
                <option value="Phishing">Phishing</option>
              </select>
            </div>
          </div>

          {/* Results Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-4 py-3">URL</TableHead>
                <TableHead className="px-4 py-3 text-center">Prediction</TableHead>
                <TableHead className="px-4 py-3 text-right">Confidence</TableHead>
                <TableHead className="px-4 py-3 text-center">Risk Level</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedResults.length > 0 ? (
                paginatedResults.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-mono text-xs max-w-md truncate break-all" title={row.url}>
                      {row.url}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1.5">
                        {getPredictionIcon(row.prediction)}
                        <span className="font-semibold text-xs">{row.prediction}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-cyber-cyan">
                      {row.confidence.toFixed(2)}%
                    </TableCell>
                    <TableCell className="text-center">
                      {getRiskBadge(row.risk_level)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="px-4 py-8 text-center text-gray-500">
                    No matching records found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-cyber-border/40 text-sm">
              <div className="text-gray-400">
                Showing <span className="text-cyber-cyan">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
                <span className="text-cyber-cyan">
                  {Math.min(currentPage * itemsPerPage, filteredResults.length)}
                </span>{" "}
                of <span className="text-cyber-cyan">{filteredResults.length}</span> entries
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded border border-cyber-border hover:border-cyber-cyan hover:text-cyber-cyan disabled:opacity-30 disabled:hover:border-cyber-border disabled:hover:text-gray-300 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 text-gray-300">
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
      )}
    </div>
  );
}
