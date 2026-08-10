"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { mutate } from "swr";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Globe, 
  ShieldAlert, 
  ShieldCheck, 
  RefreshCw, 
  ChevronRight, 
  Info,
  ExternalLink,
  Flame,
  AlertTriangle
} from "lucide-react";

// Import ShadCN components
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface FeatureDetails {
  url_length: number;
  domain_length: number;
  dots_count: number;
  hyphens_count: number;
  digits_count: number;
  subdomains_count: number;
  https_present: number;
  ip_present: number;
  keywords_count: number;
  special_chars_count: number;
  redirect_count: number;
  at_present: number;
  double_slash_present: number;
  entropy_score: number;
  tld_risk_score: number;
}

interface PredictionResponse {
  url: string;
  prediction: "Safe" | "Suspicious" | "Phishing";
  probability_score: number;
  confidence: number;
  risk_level: "Low" | "Medium" | "High";
  features: FeatureDetails;
  recommendations: string[];
}

interface SingleScanProps {
  onScanComplete: () => void;
  addNotification: (message: string, type: "success" | "error" | "info" | "warning") => void;
}

export default function SingleScan({ onScanComplete, addNotification }: SingleScanProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionResponse | null>(null);

  const [realtimeStats, setRealtimeStats] = useState({
    length: 0,
    domainLength: 0,
    dots: 0,
    hyphens: 0,
    digits: 0
  });

  useEffect(() => {
    if (!url) {
      setRealtimeStats({ length: 0, domainLength: 0, dots: 0, hyphens: 0, digits: 0 });
      return;
    }

    const cleanUrl = url.trim();
    const dotsCount = (cleanUrl.match(/\./g) || []).length;
    const hyphensCount = (cleanUrl.match(/-/g) || []).length;
    const digitsCount = (cleanUrl.match(/\d/g) || []).length;

    let domain = cleanUrl;
    if (cleanUrl.includes("://")) {
      domain = cleanUrl.split("://")[1];
    }
    domain = domain.split("/")[0].split("?")[0];

    setRealtimeStats({
      length: cleanUrl.length,
      domainLength: domain.length,
      dots: dotsCount,
      hyphens: hyphensCount,
      digits: digitsCount
    });
  }, [url]);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      addNotification("Please enter a URL to scan", "warning");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await axios.post("http://127.0.0.1:5001/api/predict", {
        url: url.trim()
      });
      setResult(response.data);
      addNotification(`Scan complete: URL is classified as ${response.data.prediction}`, 
        response.data.prediction === "Safe" ? "success" : response.data.prediction === "Suspicious" ? "warning" : "error"
      );
      mutate("http://127.0.0.1:5001/api/dashboard/stats");
      onScanComplete();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || "Failed to scan URL. Please make sure the backend is running.";
      addNotification(errorMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (risk: string) => {
    if (risk === "Low") return "text-cyber-safe border-cyber-safe/30 bg-cyber-safe/5";
    if (risk === "Medium") return "text-cyber-warning border-cyber-warning/30 bg-cyber-warning/5";
    return "text-cyber-danger border-cyber-danger/30 bg-cyber-danger/5";
  };

  const getPredictionBadge = (pred: string) => {
    if (pred === "Safe") {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 text-sm font-semibold rounded-full border border-cyber-safe/30 bg-cyber-safe/10 text-cyber-safe glow-border">
          <ShieldCheck className="w-4 h-4" /> SAFE
        </span>
      );
    } else if (pred === "Suspicious") {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 text-sm font-semibold rounded-full border border-cyber-warning/30 bg-cyber-warning/10 text-cyber-warning">
          <AlertTriangle className="w-4 h-4" /> SUSPICIOUS
        </span>
      );
    } else {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 text-sm font-semibold rounded-full border border-cyber-danger/30 bg-cyber-danger/10 text-cyber-danger">
          <Flame className="w-4 h-4" /> PHISHING
        </span>
      );
    }
  };

  const featureDefinitions = [
    { key: "url_length", name: "URL Length", desc: "Total characters in the URL string" },
    { key: "domain_length", name: "Domain Length", desc: "Characters in the domain name" },
    { key: "dots_count", name: "Dots Count", desc: "Total dots (.) present in URL" },
    { key: "hyphens_count", name: "Hyphens Count", desc: "Total hyphens (-) present in URL" },
    { key: "digits_count", name: "Digits Count", desc: "Total numeric digits present in URL" },
    { key: "subdomains_count", name: "Subdomains", desc: "Number of subdomain portions detected" },
    { key: "https_present", name: "HTTPS Security", desc: "Presence of secured HTTPS protocol", binary: true },
    { key: "ip_present", name: "IP Address Domain", desc: "Whether domain is an IP address raw value", binary: true },
    { key: "keywords_count", name: "Suspicious Keywords", desc: "Matches of phishing keywords (login, bank, secure)" },
    { key: "special_chars_count", name: "Special Characters", desc: "Counts of special symbols (?, =, &, _, %)" },
    { key: "redirect_count", name: "Redirect Patterns", desc: "Count of redirect params or double slashes in path" },
    { key: "at_present", name: "Presence of @", desc: "Presence of @ symbol (splits credentials / masks)", binary: true },
    { key: "double_slash_present", name: "Subsequent Double Slash", desc: "Double slash // appearing in path/query", binary: true },
    { key: "entropy_score", name: "Entropy Score", desc: "Shannon entropy of string randomness" },
    { key: "tld_risk_score", name: "TLD Risk Score", desc: "Risk weight based on Domain Extension reputation" }
  ];

  return (
    <div className="space-y-6">
      {/* Search Input Bar */}
      <Card className="p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyber-cyan/5 rounded-full blur-3xl pointer-events-none" />
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-cyber-cyan glow-text">
          <Globe className="w-5 h-5" /> Threat URL Scanner
        </h2>
        
        <form onSubmit={handleScan} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter URL to analyze (e.g., https://paypal.secure-login-verify.xyz/update)"
              className="py-3 px-4 pr-10"
            />
            {url && (
              <button
                type="button"
                onClick={() => setUrl("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="px-6 py-3 cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Analyzing...
              </>
            ) : (
              <>
                Scan URL <ChevronRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </form>

        {/* Real-time Indicator Panel */}
        <div className="mt-4 pt-4 border-t border-cyber-border/40 grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="text-center p-2 rounded bg-cyber-darker/40 border border-cyber-border/50">
            <div className="text-xs text-gray-400">URL Length</div>
            <div className={`text-base font-bold ${realtimeStats.length > 75 ? 'text-cyber-warning' : 'text-cyber-cyan'}`}>
              {realtimeStats.length}
            </div>
          </div>
          <div className="text-center p-2 rounded bg-cyber-darker/40 border border-cyber-border/50">
            <div className="text-xs text-gray-400">Domain Length</div>
            <div className="text-base font-bold text-cyber-cyan">{realtimeStats.domainLength}</div>
          </div>
          <div className="text-center p-2 rounded bg-cyber-darker/40 border border-cyber-border/50">
            <div className="text-xs text-gray-400">Dots Count</div>
            <div className={`text-base font-bold ${realtimeStats.dots > 3 ? 'text-cyber-danger' : 'text-cyber-cyan'}`}>
              {realtimeStats.dots}
            </div>
          </div>
          <div className="text-center p-2 rounded bg-cyber-darker/40 border border-cyber-border/50">
            <div className="text-xs text-gray-400">Hyphens Count</div>
            <div className={`text-base font-bold ${realtimeStats.hyphens > 2 ? 'text-cyber-warning' : 'text-cyber-cyan'}`}>
              {realtimeStats.hyphens}
            </div>
          </div>
          <div className="text-center p-2 rounded bg-cyber-darker/40 border border-cyber-border/50 col-span-2 sm:col-span-1">
            <div className="text-xs text-gray-400">Digits Count</div>
            <div className={`text-base font-bold ${realtimeStats.digits > 5 ? 'text-cyber-warning' : 'text-cyber-cyan'}`}>
              {realtimeStats.digits}
            </div>
          </div>
        </div>
      </Card>

      {/* Skeleton / Loading Experience */}
      {loading && (
        <div className="space-y-6">
          <Card className="p-6 animate-pulse space-y-4">
            <div className="h-6 bg-slate-800 rounded w-1/4" />
            <div className="h-12 bg-slate-800 rounded" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="h-24 bg-slate-800 rounded" />
              <div className="h-24 bg-slate-800 rounded" />
              <div className="h-24 bg-slate-800 rounded" />
            </div>
          </Card>
          <Card className="p-6 animate-pulse space-y-3">
            <div className="h-6 bg-slate-800 rounded w-1/3" />
            <div className="h-32 bg-slate-800 rounded" />
          </Card>
        </div>
      )}

      {/* Result Display Panel */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            {/* Header Result Card */}
            <Card className="p-6 border-t-4 border-t-cyber-cyan">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Scanned Target</h3>
                  <p className="text-sm font-mono text-gray-300 break-all select-all flex items-center gap-1.5 mt-1">
                    {result.url}
                    <a href={result.url} target="_blank" rel="noopener noreferrer" className="hover:text-cyber-cyan">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {getPredictionBadge(result.prediction)}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-cyber-darker/50 border border-cyber-border">
                  <div className="text-xs text-gray-400">Risk Assessment</div>
                  <div className={`text-xl font-bold mt-1 px-2.5 py-0.5 rounded border inline-block ${getRiskColor(result.risk_level)}`}>
                    {result.risk_level} Risk
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-cyber-darker/50 border border-cyber-border">
                  <div className="text-xs text-gray-400">RF Classifier Probability</div>
                  <div className="text-xl font-bold text-cyber-cyan mt-1">
                    {(result.probability_score * 100).toFixed(1)}%
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-cyber-darker/50 border border-cyber-border">
                  <div className="text-xs text-gray-400">Analysis Confidence</div>
                  <div className="text-xl font-bold text-cyber-cyan mt-1">
                    {result.confidence.toFixed(1)}%
                  </div>
                </div>
              </div>
            </Card>

            {/* Security Recommendations Cards */}
            <Card className={`p-6 border border-l-4 ${
              result.prediction === "Safe" 
                ? "border-l-cyber-safe border-cyber-safe/20 bg-cyber-safe/5" 
                : result.prediction === "Suspicious" 
                ? "border-l-cyber-warning border-cyber-warning/20 bg-cyber-warning/5"
                : "border-l-cyber-danger border-cyber-danger/20 bg-cyber-danger/5"
            }`}>
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-cyber-darker/60">
                  {result.prediction === "Safe" ? (
                    <ShieldCheck className="w-8 h-8 text-cyber-safe" />
                  ) : result.prediction === "Suspicious" ? (
                    <AlertTriangle className="w-8 h-8 text-cyber-warning" />
                  ) : (
                    <ShieldAlert className="w-8 h-8 text-cyber-danger" />
                  )}
                </div>
                <div className="space-y-2 flex-1">
                  <h4 className="text-lg font-bold">
                    Security Advisory: {result.prediction} URL Detected
                  </h4>
                  <ul className="space-y-1.5">
                    {result.recommendations.map((rec, i) => (
                      <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${
                          result.prediction === "Safe" 
                            ? "bg-cyber-safe" 
                            : result.prediction === "Suspicious" 
                            ? "bg-cyber-warning" 
                            : "bg-cyber-danger"
                        }`} />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>

            {/* Feature Analysis Table */}
            <Card className="p-6">
              <h4 className="text-base font-bold mb-4 text-cyber-cyan glow-text flex items-center gap-2">
                <Info className="w-4 h-4" /> Feature Extraction & Classifier Ingestion
              </h4>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-4 py-3">Feature Name</TableHead>
                    <TableHead className="px-4 py-3 hidden md:table-cell">Details / Objective</TableHead>
                    <TableHead className="px-4 py-3 text-right">Extracted Value</TableHead>
                    <TableHead className="px-4 py-3 text-center">Risk Vector</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {featureDefinitions.map((f) => {
                    const rawVal = (result.features as any)[f.key];
                    let displayVal = rawVal;
                    
                    if (f.binary) {
                      displayVal = rawVal === 1 ? "TRUE (1)" : "FALSE (0)";
                    }

                    let threatIndicator = (
                      <span className="px-2 py-0.5 rounded text-xs bg-gray-800 text-gray-400">
                        Neutral
                      </span>
                    );

                    if (f.key === "url_length" && rawVal > 75) {
                      threatIndicator = <span className="px-2 py-0.5 rounded text-xs bg-cyber-warning/10 text-cyber-warning font-semibold">Medium</span>;
                    } else if (f.key === "dots_count" && rawVal > 3) {
                      threatIndicator = <span className="px-2 py-0.5 rounded text-xs bg-cyber-danger/10 text-cyber-danger font-semibold">High</span>;
                    } else if (f.key === "hyphens_count" && rawVal > 2) {
                      threatIndicator = <span className="px-2 py-0.5 rounded text-xs bg-cyber-warning/10 text-cyber-warning font-semibold">Medium</span>;
                    } else if (f.key === "digits_count" && rawVal > 5) {
                      threatIndicator = <span className="px-2 py-0.5 rounded text-xs bg-cyber-warning/10 text-cyber-warning font-semibold">Medium</span>;
                    } else if (f.key === "https_present" && rawVal === 0) {
                      threatIndicator = <span className="px-2 py-0.5 rounded text-xs bg-cyber-danger/10 text-cyber-danger font-semibold">High</span>;
                    } else if (f.key === "https_present" && rawVal === 1) {
                      threatIndicator = <span className="px-2 py-0.5 rounded text-xs bg-cyber-safe/10 text-cyber-safe font-semibold">Secure</span>;
                    } else if (f.key === "ip_present" && rawVal === 1) {
                      threatIndicator = <span className="px-2 py-0.5 rounded text-xs bg-cyber-danger/10 text-cyber-danger font-semibold">High</span>;
                    } else if (f.key === "keywords_count" && rawVal > 0) {
                      threatIndicator = <span className="px-2 py-0.5 rounded text-xs bg-cyber-danger/10 text-cyber-danger font-semibold">High</span>;
                    } else if (f.key === "at_present" && rawVal === 1) {
                      threatIndicator = <span className="px-2 py-0.5 rounded text-xs bg-cyber-danger/10 text-cyber-danger font-semibold">High</span>;
                    } else if (f.key === "double_slash_present" && rawVal === 1) {
                      threatIndicator = <span className="px-2 py-0.5 rounded text-xs bg-cyber-danger/10 text-cyber-danger font-semibold">High</span>;
                    } else if (f.key === "tld_risk_score" && rawVal > 0.6) {
                      threatIndicator = <span className="px-2 py-0.5 rounded text-xs bg-cyber-danger/10 text-cyber-danger font-semibold">High</span>;
                    } else if (f.key === "tld_risk_score" && rawVal < 0.2) {
                      threatIndicator = <span className="px-2 py-0.5 rounded text-xs bg-cyber-safe/10 text-cyber-safe font-semibold">Low</span>;
                    }

                    return (
                      <TableRow key={f.key}>
                        <TableCell className="font-semibold text-gray-200">{f.name}</TableCell>
                        <TableCell className="text-xs text-gray-400 hidden md:table-cell">{f.desc}</TableCell>
                        <TableCell className="text-right font-mono text-cyber-cyan">{displayVal}</TableCell>
                        <TableCell className="text-center">{threatIndicator}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
