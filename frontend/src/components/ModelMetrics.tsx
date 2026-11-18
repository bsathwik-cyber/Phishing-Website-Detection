"use client";

import React, { useEffect } from "react";
import axios from "axios";
import useSWR from "swr";
import { Cpu, RefreshCw, BarChart2, AlertTriangle, Info } from "lucide-react";

// Import ShadCN components
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface ModelMetricsResponse {
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  cross_validation: number;
  cv_std: number;
  status?: "available" | "unavailable";
  message?: string;
  evaluation_note?: string;
  evaluation_dataset?: string;
}

interface ConfusionMatrixResponse {
  insufficient_data: boolean;
  tn?: number;
  fp?: number;
  fn?: number;
  tp?: number;
}

interface FeatureImportanceResponse {
  feature_importances: Record<string, number>;
}

interface ModelMetricsProps {
  refreshTrigger?: number;
  addNotification: (message: string, type: "success" | "error" | "info" | "warning") => void;
}

const fetcher = (url: string) => axios.get(url).then(res => res.data);

export default function ModelMetrics({ refreshTrigger, addNotification }: ModelMetricsProps) {
  const { data: metrics, error: metricsError, mutate: mutateMetrics } = useSWR<ModelMetricsResponse>(
    "http://127.0.0.1:5001/api/model-metrics",
    fetcher
  );

  const { data: confusionMatrix, error: cmError, mutate: mutateCM } = useSWR<ConfusionMatrixResponse>(
    "http://127.0.0.1:5001/api/dashboard/confusion-matrix",
    fetcher
  );

  const { data: featureImportance, error: fiError, mutate: mutateFI } = useSWR<FeatureImportanceResponse>(
    "http://127.0.0.1:5001/api/dashboard/feature-importance",
    fetcher
  );

  useEffect(() => {
    mutateMetrics();
    mutateCM();
    mutateFI();
  }, [refreshTrigger, mutateMetrics, mutateCM, mutateFI]);

  useEffect(() => {
    if (metricsError || cmError || fiError) {
      addNotification("Failed to load machine learning model metrics", "error");
    }
  }, [metricsError, cmError, fiError, addNotification]);

  const loading = (!metrics && !metricsError) || 
                  (!confusionMatrix && !cmError) || 
                  (!featureImportance && !fiError);

  if (loading) {
    return (
      <div className="glass-panel p-20 rounded-xl flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-10 h-10 text-cyber-cyan animate-spin" />
        <p className="text-sm text-gray-400 font-medium">Extracting classifier validation logs...</p>
      </div>
    );
  }

  if (metrics?.status === "unavailable") {
    return (
      <Card className="p-8 border-cyber-warning/30 bg-cyber-warning/5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-cyber-warning shrink-0" />
          <div>
            <h3 className="font-bold text-gray-200">Model evaluation is unavailable</h3>
            <p className="text-sm text-gray-400 mt-2">
              {metrics.message || "Train the local Random Forest model to generate evaluation metrics."}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card className="p-8">
        <p className="text-sm text-gray-400">Model evaluation metrics have not been generated yet.</p>
      </Card>
    );
  }

  const tn = confusionMatrix?.tn ?? 0;
  const fp = confusionMatrix?.fp ?? 0;
  const fn = confusionMatrix?.fn ?? 0;
  const tp = confusionMatrix?.tp ?? 0;
  const totalInstances = tn + fp + fn + tp;

  // Check for overfitting warning condition (any core metric exceeds 99.5%)
  const isOverfitted = 
    metrics.accuracy > 99.5 || 
    metrics.precision > 99.5 || 
    metrics.recall > 99.5 || 
    metrics.f1_score > 99.5;

  const importances = featureImportance?.feature_importances || {};

  return (
    <div className="space-y-6">
      {/* Overfitting Warning */}
      {isOverfitted && (
        <Card className="border-cyber-danger/45 bg-cyber-danger/10 p-5 flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-cyber-danger shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-cyber-danger uppercase tracking-wider">
              Overfitting Warning
            </h4>
            <p className="text-xs text-gray-300 mt-1">
              Possible overfitting detected. Consider retraining with a more diverse dataset.
            </p>
          </div>
        </Card>
      )}

      {/* Overview Card */}
      <Card className="p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyber-cyan/5 rounded-full blur-3xl pointer-events-none" />
        <h2 className="text-xl font-bold mb-2 flex items-center gap-2 text-cyber-cyan glow-text">
          <Cpu className="w-5 h-5" /> Random Forest Classifier Architecture
        </h2>
        <p className="text-sm text-gray-400">
          PhishGuard utilizes an optimized Scikit-Learn Random Forest ensemble model trained entirely on local data features.
        </p>

        {/* 4 Score Badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-cyber-darker/60 border border-cyber-border/80 p-4 rounded-lg text-center">
            <span className="text-xs text-gray-400 font-semibold">Accuracy Score</span>
            <div className="text-2xl font-black text-cyber-cyan mt-1">{metrics.accuracy.toFixed(2)}%</div>
          </div>
          <div className="bg-cyber-darker/60 border border-cyber-border/80 p-4 rounded-lg text-center">
            <span className="text-xs text-gray-400 font-semibold">Precision Score</span>
            <div className="text-2xl font-black text-cyber-cyan mt-1">{metrics.precision.toFixed(2)}%</div>
          </div>
          <div className="bg-cyber-darker/60 border border-cyber-border/80 p-4 rounded-lg text-center">
            <span className="text-xs text-gray-400 font-semibold">Recall Score</span>
            <div className="text-2xl font-black text-cyber-cyan mt-1">{metrics.recall.toFixed(2)}%</div>
          </div>
          <div className="bg-cyber-darker/60 border border-cyber-border/80 p-4 rounded-lg text-center">
            <span className="text-xs text-gray-400 font-semibold">F1 Score</span>
            <div className="text-2xl font-black text-cyber-cyan mt-1">{metrics.f1_score.toFixed(2)}%</div>
          </div>
        </div>

        {/* Cross Validation & Disclaimer */}
        <div className="mt-4 flex flex-col gap-2.5">
          <div className="p-3 rounded bg-cyber-cyan/5 border border-cyber-cyan/10 text-xs text-gray-400 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-cyber-cyan shrink-0" />
            <span>
              <strong>Cross Validation Performance:</strong> 3-fold cross-validation mean accuracy is{" "}
              <strong className="text-cyber-cyan">{metrics.cross_validation.toFixed(2)}%</strong>{" "}
              (std dev: {metrics.cv_std.toFixed(2)}%).
            </span>
          </div>
          
          <div className="p-3 rounded bg-slate-900/40 border border-cyber-border/40 text-2xs text-gray-400 flex items-start gap-2 italic">
            <Info className="w-3.5 h-3.5 text-cyber-cyan shrink-0 mt-0.5" />
            <span>
              {metrics.evaluation_note || "These results describe the supplied evaluation dataset and do not guarantee real-world phishing detection performance."}
            </span>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Confusion Matrix (5 Columns) */}
        <Card className="lg:col-span-5 p-5 flex flex-col justify-between">
          <div>
            <CardTitle className="text-base font-bold text-cyber-cyan glow-text flex items-center gap-2 mb-2">
              Confusion Matrix Grid
            </CardTitle>
            <p className="text-xs text-gray-400 mb-4">
              Breakdown of scan results with supplied reference labels ({totalInstances} URLs).
            </p>
          </div>

          {confusionMatrix?.insufficient_data ? (
            <CardContent className="flex flex-col items-center justify-center p-8 border border-cyber-border/50 rounded-lg bg-cyber-darker/30 text-center min-h-[220px]">
              <AlertTriangle className="w-8 h-8 text-cyber-warning mb-2 animate-pulse" />
              <div className="text-sm font-semibold text-gray-300">
                Confusion Matrix Available After Model Evaluation
              </div>
              <p className="text-2xs text-gray-500 mt-1">
                Import a labelled CSV to calculate this matrix from its reference labels.
              </p>
            </CardContent>
          ) : (
            <CardContent className="grid grid-cols-2 gap-4 border border-cyber-border/50 p-4 rounded-lg bg-cyber-darker/30">
              
              {/* True Negatives (TN) */}
              <div className="p-4 rounded bg-cyber-safe/10 border border-cyber-safe/30 text-center space-y-1 relative">
                <span className="text-xxs text-cyber-safe font-semibold uppercase absolute top-2 left-2">TN</span>
                <div className="text-2xl font-bold text-cyber-safe">{tn}</div>
                <div className="text-xs text-gray-300 font-semibold">True Negatives</div>
                <div className="text-3xs text-gray-500">Correctly Flagged Safe</div>
              </div>

              {/* False Positives (FP) */}
              <div className="p-4 rounded bg-cyber-danger/10 border border-cyber-danger/30 text-center space-y-1 relative">
                <span className="text-xxs text-cyber-danger font-semibold uppercase absolute top-2 left-2">FP</span>
                <div className="text-2xl font-bold text-cyber-danger">{fp}</div>
                <div className="text-xs text-gray-300 font-semibold">False Positives</div>
                <div className="text-3xs text-gray-500">Safe Flagged Malicious</div>
              </div>

              {/* False Negatives (FN) */}
              <div className="p-4 rounded bg-cyber-danger/10 border border-cyber-danger/30 text-center space-y-1 relative">
                <span className="text-xxs text-cyber-danger font-semibold uppercase absolute top-2 left-2">FN</span>
                <div className="text-2xl font-bold text-cyber-danger">{fn}</div>
                <div className="text-xs text-gray-300 font-semibold">False Negatives</div>
                <div className="text-3xs text-gray-500">Malicious Flagged Safe</div>
              </div>

              {/* True Positives (TP) */}
              <div className="p-4 rounded bg-cyber-safe/10 border border-cyber-safe/30 text-center space-y-1 relative">
                <span className="text-xxs text-cyber-safe font-semibold uppercase absolute top-2 left-2">TP</span>
                <div className="text-2xl font-bold text-cyber-safe">{tp}</div>
                <div className="text-xs text-gray-300 font-semibold">True Positives</div>
                <div className="text-3xs text-gray-500">Correctly Flagged Phishing</div>
              </div>
              
            </CardContent>
          )}

          <div className="mt-4 p-3 bg-cyber-darker border border-cyber-border rounded text-2xs text-gray-400">
            * Hyperparameters are selected by GridSearchCV using the training partition. Fixed random seed: 42.
          </div>
        </Card>

        {/* Feature Importances (7 Columns) */}
        <Card className="lg:col-span-7 p-5">
          <CardTitle className="text-base font-bold text-cyber-cyan glow-text flex items-center gap-2 mb-2">
            RF Feature Importance Ranking
          </CardTitle>
          <p className="text-xs text-gray-400 mb-4">
            Relative weight of each extracted URL parameter calculated during model fitting.
          </p>

          <CardContent className="space-y-3 max-h-80 overflow-y-auto pr-2 p-0">
            {Object.entries(importances).map(([name, weight]) => {
              const formattedName = name
                .split("_")
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(" ");

              return (
                <div key={name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-gray-300 font-semibold">{formattedName}</span>
                    <span className="text-cyber-cyan">{weight.toFixed(2)}%</span>
                  </div>
                  
                  <Progress value={weight} />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
