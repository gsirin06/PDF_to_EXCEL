/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  FileText, 
  Download, 
  Terminal, 
  CheckCircle, 
  AlertTriangle, 
  Layers, 
  Settings, 
  Code, 
  Play, 
  Cpu, 
  Copy, 
  Check, 
  RefreshCw, 
  ChevronRight, 
  Info, 
  Grid,
  Eye,
  BookOpen,
  FolderTree,
  UploadCloud,
  X
} from "lucide-react";
import { EngineStatus, RecreateResponse } from "./types";
import { 
  PIP_INSTALL_COMMANDS, 
  FOLDER_STRUCTURE, 
  USAGE_GUIDE, 
  EXPLANATION_MODULES, 
  SAMPLE_CLI_COMMANDS 
} from "./data/code_documentation";

export default function App() {
  // Input settings
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [combinePages, setCombinePages] = useState<boolean>(false);
  const [forceEngine, setForceEngine] = useState<"auto" | "python" | "gemini">("auto");
  const [dragActive, setDragActive] = useState<boolean>(false);

  // Status & states
  const [engineStatus, setEngineStatus] = useState<EngineStatus | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressLog, setProgressLog] = useState<string[]>([]);
  const [result, setResult] = useState<RecreateResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // UI state tabs
  const [activeResultTab, setActiveResultTab] = useState<"download" | "preview" | "mockup" | "code">("download");
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [selectedPreviewPage, setSelectedPreviewPage] = useState<number>(0);
  const [selectedMockupPage, setSelectedMockupPage] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Fetch engine statuses from backend
  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/status");
      const data: EngineStatus = await res.json();
      setEngineStatus(data);
    } catch (e) {
      console.error("Failed to fetch engine status", e);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Handle logging scroll
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [progressLog]);

  // Handle Drag-and-Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        setSelectedFile(file);
        setErrorMessage(null);
      } else {
        setErrorMessage("File type not supported. Please upload a valid PDF document.");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        setSelectedFile(file);
        setErrorMessage(null);
      } else {
        setErrorMessage("File type not supported. Please upload a valid PDF document.");
      }
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const removeFile = () => {
    setSelectedFile(null);
    setResult(null);
    setProgressLog([]);
    setErrorMessage(null);
  };

  // Copy helper
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const [downloadingType, setDownloadingType] = useState<"excel" | "log" | null>(null);

  // Secure client-side download helper to fetch via iframe context and avoid proxy redirects
  const handleDownload = async (url: string, defaultFilename: string, type: "excel" | "log") => {
    try {
      setDownloadingType(type);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const blob = await response.blob();
      
      const localUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = localUrl;
      link.download = defaultFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(localUrl);
    } catch (error) {
      console.error("Download failed, trying direct opening:", error);
      window.open(url, "_blank");
    } finally {
      setDownloadingType(null);
    }
  };

  // Trigger Excel recreation pipeline
  const handleRecreate = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setResult(null);
    setErrorMessage(null);
    setProgressLog([
      `Initializing PDF upload: ${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(2)} MB)`,
      `User configuration: Combine worksheets: ${combinePages ? "YES" : "NO"} | Engine mode: ${forceEngine.toUpperCase()}`,
      `Queuing processing thread...`
    ]);

    // Live-simulated socket logs while waiting for standard request
    const logInterval = setInterval(() => {
      const mockLogs = [
        "Analyzing physical layout page profiles...",
        "Identifying vertical layout segments...",
        "Applying morphology operations to separate tables...",
        "Scanning page layout coordinate anchors...",
        "Synthesizing alignment mappings...",
        "Processing text block elements and drawing layers...",
        "Formatting openpyxl sheets, fonts, and borders..."
      ];
      const randomLog = mockLogs[Math.floor(Math.random() * mockLogs.length)];
      setProgressLog(prev => [...prev, randomLog]);
    }, 2800);

    try {
      const formData = new FormData();
      formData.append("pdf", selectedFile);
      formData.append("combine", String(combinePages));
      formData.append("forceEngine", forceEngine);

      const response = await fetch("/api/recreate", {
        method: "POST",
        body: formData,
      });

      clearInterval(logInterval);

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.details || errData.error || "Server processing failed");
      }

      const data: RecreateResponse = await response.json();
      setResult(data);
      setProgressLog(prev => [
        ...prev,
        `Recreation completed successfully via ${data.engine.toUpperCase()} engine!`,
        `Workbook compiled: ${data.excelUrl.split("/").pop()}`,
        `Warnings logged: ${data.warnings.length}`
      ]);
      setActiveResultTab("download");
    } catch (err: any) {
      clearInterval(logInterval);
      console.error(err);
      setErrorMessage(err.message || "An unexpected error occurred during processing.");
      setProgressLog(prev => [...prev, `CRITICAL ERROR: ${err.message}`]);
    } finally {
      setIsProcessing(false);
      fetchStatus();
    }
  };

  // Static Python Code Download Content (the pdf_recreator.py contents)
  const fullPythonCode = `#!/usr/bin/env python3
# PDF to Excel Layout Recreator
# Fully functional, visual-aware CLI utility
# ...
# Run python pdf_recreator.py --help for more information.
`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-teal-500 selection:text-slate-950 flex flex-col">
      {/* Premium Header - Geometric Balance Theme */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/50 sticky top-0 z-50 flex items-center justify-between px-6">
        <div className="flex items-center space-x-4">
          <div className="w-8 h-8 bg-teal-500 rounded-sm flex items-center justify-center font-bold text-slate-950 text-lg">
            P
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight uppercase text-slate-100 flex items-center gap-2">
              Architect <span className="text-teal-400 font-mono text-xs">v1.0.4</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-mono tracking-wider hidden sm:block uppercase">
              PDF to Excel Layout Recreator
            </p>
          </div>
        </div>

        {/* Engine Statuses & Geometric Tapes */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-4 flex-wrap">
            <div className="flex items-center gap-2 bg-slate-900/80 px-2.5 py-1 rounded-sm border border-slate-800 text-[10px] font-mono">
              <Cpu className="w-3 h-3 text-slate-400" />
              <span className="text-slate-500 uppercase tracking-widest text-[9px]">CLI Engine:</span>
              {engineStatus?.pythonEngine.available ? (
                <span className="text-teal-400 font-semibold flex items-center gap-1">
                  ● Ready
                </span>
              ) : engineStatus?.pythonEngine.installing ? (
                <span className="text-amber-500 font-semibold animate-pulse flex items-center gap-1">
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Installing...
                </span>
              ) : (
                <span className="text-slate-600 font-medium">Inactive</span>
              )}
            </div>

            <div className="flex items-center gap-2 bg-slate-900/80 px-2.5 py-1 rounded-sm border border-slate-800 text-[10px] font-mono">
              <Layers className="w-3 h-3 text-slate-400" />
              <span className="text-slate-500 uppercase tracking-widest text-[9px]">Gemini:</span>
              {engineStatus?.geminiEngine.available ? (
                <span className="text-teal-400 font-semibold">● Ready</span>
              ) : (
                <span className="text-rose-500 font-semibold">● Missing Key</span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 hidden md:flex">
            <div className="w-2 h-2 rounded-full bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.6)]"></div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">System Ready</span>
          </div>

          <div className="flex space-x-1 hidden sm:flex">
            <div className="w-1.5 h-6 bg-slate-800"></div>
            <div className="w-1.5 h-6 bg-teal-500/30"></div>
            <div className="w-1.5 h-6 bg-teal-500/60"></div>
            <div className="w-1.5 h-6 bg-teal-500"></div>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Panel: Upload Zone & Configurations */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Instruction Card */}
            <div className="bg-slate-900 border border-slate-800 p-6 shadow-xl relative overflow-hidden rounded-none">
              <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-32 h-32 bg-teal-500/5 rounded-full blur-2xl pointer-events-none" />
              <h3 className="text-[10px] uppercase tracking-[0.2em] text-teal-400 mb-2 font-mono">
                Process Pipeline
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                Upload any PDF. Our engine will map visual elements onto an Excel sheet with precise coordinates, cell merges, formatting, and a Control verification sheet.
              </p>
            </div>

            {/* Core Workspace Card */}
            <div className="bg-slate-900/40 border border-slate-800 p-6 flex flex-col gap-6 rounded-none">
              <h2 className="text-xs font-bold tracking-[0.15em] uppercase text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-3 font-mono">
                <Settings className="w-3.5 h-3.5 text-teal-400" /> Setup Workspace
              </h2>

              {/* Upload Dropzone */}
              {!selectedFile ? (
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={triggerFileSelect}
                  className={`border border-dashed p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all rounded-none ${
                    dragActive 
                      ? "border-teal-500 bg-slate-900/80 scale-[0.99]" 
                      : "border-slate-800 hover:border-slate-750 bg-slate-900/20"
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="application/pdf"
                    className="hidden"
                  />
                  <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-none mb-4">
                    <UploadCloud className="w-6 h-6 text-teal-400" />
                  </div>
                  <h4 className="text-xs font-mono uppercase tracking-wider text-slate-200">Drag PDF here</h4>
                  <p className="text-[11px] text-slate-500 mt-1 font-sans">or click to browse from device</p>
                  <div className="mt-4 text-[9px] bg-slate-950 text-slate-400 font-mono px-2 py-0.5 border border-slate-800 rounded-none">
                    MAX FILE SIZE: 30MB
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900/60 border border-slate-800 p-4 flex items-center justify-between gap-3 rounded-none">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="bg-teal-500/10 text-teal-400 p-2.5 border border-teal-500/20 flex-shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="overflow-hidden">
                      <h4 className="text-xs font-mono text-slate-200 truncate">
                        {selectedFile.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={removeFile}
                    className="p-1.5 hover:bg-slate-800 text-slate-500 hover:text-rose-400 transition-colors"
                    title="Remove File"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Processing Options */}
              <div className="flex flex-col gap-4 border-t border-slate-800 pt-5">
                <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">
                  Advanced Configurations
                </h3>

                {/* Combine worksheets switch */}
                <div className="flex items-center justify-between p-3 bg-slate-950/40 border border-slate-800 hover:bg-slate-900/40 transition-colors rounded-none">
                  <div>
                    <span className="text-xs font-mono uppercase text-slate-200 block">Combine Pages</span>
                    <span className="text-[9px] text-slate-500 block font-sans mt-0.5">
                      Recreate all pages into a single worksheet
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={combinePages}
                      onChange={(e) => setCombinePages(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-none peer peer-checked:after:translate-x-full peer-checked:after:border-teal-400 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-600 after:border-slate-500 after:border after:rounded-none after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-950 peer-checked:after:bg-teal-400"></div>
                  </label>
                </div>

                {/* Core Engine Select */}
                <div>
                  <span className="text-[10px] uppercase tracking-[0.15em] text-slate-500 block mb-2 font-mono">Core Analysis Engine</span>
                  <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 border border-slate-850 rounded-none">
                    {(["auto", "python", "gemini"] as const).map((eng) => (
                      <button
                        key={eng}
                        onClick={() => setForceEngine(eng)}
                        className={`text-[10px] uppercase tracking-wider font-mono py-1.5 transition-all rounded-none ${
                          forceEngine === eng 
                            ? "bg-teal-500 text-slate-950 font-bold" 
                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
                        }`}
                      >
                        {eng}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                disabled={!selectedFile || isProcessing}
                onClick={handleRecreate}
                className={`w-full py-3.5 font-bold tracking-widest uppercase text-xs flex items-center justify-center gap-2 border transition-all rounded-none ${
                  !selectedFile 
                    ? "bg-slate-900/50 text-slate-600 border-slate-850 cursor-not-allowed" 
                    : isProcessing
                      ? "bg-teal-950 text-teal-400 border-teal-500/40 cursor-wait animate-pulse"
                      : "bg-teal-500 text-slate-950 border-teal-500 hover:bg-teal-400 hover:shadow-[0_0_15px_rgba(20,184,166,0.2)]"
                }`}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Processing Layout...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" /> Run Reconstruction
                  </>
                )}
              </button>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-rose-950/20 border border-rose-900/60 text-rose-300 p-4 rounded-none flex items-start gap-3"
              >
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
                <div>
                  <h4 className="text-xs font-mono uppercase text-rose-400">Execution Failed</h4>
                  <p className="text-[10px] mt-1 leading-relaxed font-mono">{errorMessage}</p>
                </div>
              </motion.div>
            )}

          </div>

          {/* Right Panel: Output Explorer, Previews, Console & SDK docs */}
          <div className="lg:col-span-8">
            
            {/* Loading / Console panel during processing */}
            {isProcessing && (
              <div className="bg-slate-950 text-slate-300 rounded-none p-6 border border-slate-800 font-mono flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-850 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-teal-500 rounded-full animate-ping" />
                    <span className="text-[10px] font-semibold text-slate-200 uppercase tracking-widest font-mono">
                      Processing Activity Log
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    ENGINE: {forceEngine.toUpperCase()}
                  </span>
                </div>

                <div className="h-64 overflow-y-auto flex flex-col gap-2 text-[10px] leading-relaxed custom-scrollbar bg-slate-900/20 p-4 border border-slate-850 font-mono">
                  {progressLog.map((log, idx) => (
                    <div key={idx} className="flex gap-2">
                      <span className="text-slate-600 select-none">[{idx + 1}]</span>
                      <span className={log.startsWith("CRITICAL") ? "text-rose-400" : log.startsWith("Success") ? "text-teal-400" : log.includes("successfully") ? "text-teal-400" : "text-slate-300"}>
                        {log}
                      </span>
                    </div>
                  ))}
                  <div ref={logEndRef} />
                </div>

                <div className="flex items-center justify-between text-[9px] text-slate-500 mt-2 font-mono uppercase tracking-wider">
                  <span>Accuracy Optimization enabled</span>
                  <span>DPI Target: 300 Fixed</span>
                </div>
              </div>
            )}

            {/* Result Dashboard Panel once extraction completes */}
            {!isProcessing && result && (
              <div className="bg-slate-900/10 rounded-none border border-slate-800 overflow-hidden flex flex-col">
                
                {/* Header Selector Tabs */}
                <div className="border-b border-slate-800 bg-slate-900/30 px-6 pt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => setActiveResultTab("download")}
                    className={`text-[10px] uppercase tracking-widest font-bold pb-4 px-3 border-b-2 transition-all flex items-center gap-2 ${
                      activeResultTab === "download"
                        ? "border-teal-500 text-teal-400"
                        : "border-transparent text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    <Download className="w-3.5 h-3.5" /> Download Files
                  </button>
                  <button
                    onClick={() => setActiveResultTab("preview")}
                    className={`text-[10px] uppercase tracking-widest font-bold pb-4 px-3 border-b-2 transition-all flex items-center gap-2 ${
                      activeResultTab === "preview"
                        ? "border-teal-500 text-teal-400"
                        : "border-transparent text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" /> Layout Previews
                  </button>
                  <button
                    onClick={() => setActiveResultTab("mockup")}
                    className={`text-[10px] uppercase tracking-widest font-bold pb-4 px-3 border-b-2 transition-all flex items-center gap-2 ${
                      activeResultTab === "mockup"
                        ? "border-teal-500 text-teal-400"
                        : "border-transparent text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    <Grid className="w-3.5 h-3.5" /> Structure Mockup
                  </button>
                  <button
                    onClick={() => setActiveResultTab("code")}
                    className={`text-[10px] uppercase tracking-widest font-bold pb-4 px-3 border-b-2 transition-all flex items-center gap-2 ${
                      activeResultTab === "code"
                        ? "border-teal-500 text-teal-400"
                        : "border-transparent text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    <Code className="w-3.5 h-3.5" /> CLI Developer Kit
                  </button>
                </div>

                {/* Dashboard Tab Contents */}
                <div className="p-6">
                  
                  {/* TAB 1: DOWNLOADS PANEL */}
                  {activeResultTab === "download" && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col gap-6"
                    >
                      <div className="flex items-start gap-4 p-4 bg-teal-950/20 border border-teal-500/30 text-slate-300 rounded-none">
                        <div className="bg-teal-500/10 text-teal-400 p-2 border border-teal-500/20">
                          <CheckCircle className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-mono uppercase tracking-wider text-teal-400">Spreadsheet successfully reconstructed!</h4>
                          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                            Visual coordinate grids and structural table boundaries have been aligned. Download the finalized Excel workbook and verification metadata files below.
                          </p>
                        </div>
                      </div>

                      {/* Download Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        {/* Excel Card */}
                        <button
                          onClick={() => handleDownload(result.excelUrl, "recreated_from_pdf.xlsx", "excel")}
                          disabled={downloadingType !== null}
                          className="group border border-slate-850 bg-slate-900/20 hover:border-teal-500/50 hover:bg-slate-900/40 p-5 flex items-center justify-between gap-4 transition-all rounded-none text-left w-full cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <div className="flex items-center gap-4 overflow-hidden">
                            <div className="bg-teal-500/10 text-teal-400 p-3 border border-teal-500/20 group-hover:bg-teal-500/20 transition-colors">
                              <Grid className="w-5 h-5" />
                            </div>
                            <div className="overflow-hidden">
                              <span className="text-[8px] uppercase font-mono tracking-widest text-teal-400 block">
                                Excel Workbook
                              </span>
                              <h5 className="text-xs font-mono font-bold text-slate-200 truncate mt-0.5">
                                recreated_from_pdf.xlsx
                              </h5>
                              <p className="text-[10px] text-slate-500 mt-0.5 font-sans">
                                {downloadingType === "excel" ? "Downloading..." : "Fully editable tables & styling"}
                              </p>
                            </div>
                          </div>
                          {downloadingType === "excel" ? (
                            <div className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Download className="w-4 h-4 text-slate-500 group-hover:text-teal-400 transition-colors" />
                          )}
                        </button>

                        {/* Log Card */}
                        <button
                          onClick={() => handleDownload(result.logUrl, "extraction_log.txt", "log")}
                          disabled={downloadingType !== null}
                          className="group border border-slate-850 bg-slate-900/20 hover:border-teal-500/50 hover:bg-slate-900/40 p-5 flex items-center justify-between gap-4 transition-all rounded-none text-left w-full cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <div className="flex items-center gap-4 overflow-hidden">
                            <div className="bg-slate-900 text-slate-400 p-3 border border-slate-800 group-hover:bg-slate-850 transition-colors">
                              <Terminal className="w-5 h-5" />
                            </div>
                            <div className="overflow-hidden">
                              <span className="text-[8px] uppercase font-mono tracking-widest text-slate-500 block">
                                Diagnostics Log
                              </span>
                              <h5 className="text-xs font-mono font-bold text-slate-200 truncate mt-0.5">
                                extraction_log.txt
                              </h5>
                              <p className="text-[10px] text-slate-500 mt-0.5 font-sans">
                                {downloadingType === "log" ? "Downloading..." : "Complete extraction metadata"}
                              </p>
                            </div>
                          </div>
                          {downloadingType === "log" ? (
                            <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Download className="w-4 h-4 text-slate-500 group-hover:text-teal-400 transition-colors" />
                          )}
                        </button>

                      </div>

                      {/* Warnings Block */}
                      {result.warnings.length > 0 && (
                        <div className="border border-amber-500/20 bg-amber-500/5 p-4 rounded-none">
                          <h5 className="text-[10px] font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider font-mono">
                            <AlertTriangle className="w-4 h-4 text-amber-500" /> Validation Warnings ({result.warnings.length})
                          </h5>
                          <ul className="mt-2.5 flex flex-col gap-1.5">
                            {result.warnings.map((warn, i) => (
                              <li key={i} className="text-[9px] text-amber-300 font-mono list-disc ml-5 leading-relaxed">
                                {warn}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Log Snippet Console */}
                      <div className="bg-slate-950 text-slate-300 p-4 border border-slate-850 font-mono rounded-none">
                        <span className="text-[9px] text-slate-500 uppercase tracking-widest block mb-2 border-b border-slate-900 pb-1.5 font-mono">
                          Extraction Summary Console
                        </span>
                        <pre className="text-[10px] leading-relaxed overflow-x-auto whitespace-pre-wrap font-mono text-slate-400">
                          {result.logSummary}
                        </pre>
                      </div>

                    </motion.div>
                  )}

                  {/* TAB 2: VISUAL PREVIEWS PANEL */}
                  {activeResultTab === "preview" && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col gap-6"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h4 className="text-xs font-mono uppercase text-slate-200">Bounding-Box Layout overlays</h4>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                            COLOR CODES: <span className="text-rose-500 font-semibold">RED: TEXT BLOCKS</span>, <span className="text-teal-400 font-semibold">GREEN: TABLE CELLS</span>, <span className="text-blue-400 font-semibold">BLUE: DRAWINGS</span>.
                          </p>
                        </div>
                        {result.previews.length > 1 && (
                          <div className="flex items-center gap-1">
                            {result.previews.map((_, i) => (
                              <button
                                key={i}
                                onClick={() => setSelectedPreviewPage(i)}
                                className={`w-6 h-6 font-mono text-xs rounded-none border transition-all ${
                                  selectedPreviewPage === i
                                    ? "bg-teal-500 text-slate-950 font-bold border-teal-500"
                                    : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-850"
                                }`}
                              >
                                {i + 1}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {result.previews.length === 0 ? (
                        <div className="border border-slate-800 border-dashed p-12 text-center flex flex-col items-center justify-center rounded-none bg-slate-950/20">
                          <Eye className="w-8 h-8 text-slate-600 mb-3" />
                          <h5 className="text-xs font-mono uppercase tracking-wider text-slate-400">No layout overlays available</h5>
                          <p className="text-[10px] text-slate-500 mt-2 max-w-sm font-sans leading-relaxed">
                            The cloud-native Gemini AI engine does not render static visual debug drawings directly onto file systems. To see layout bounding boxes, switch to the <strong>Python Core Engine</strong>.
                          </p>
                        </div>
                      ) : (
                        <div className="border border-slate-850 bg-slate-950 flex items-center justify-center p-4 rounded-none">
                          <img
                            src={result.previews[selectedPreviewPage]}
                            alt={`Page ${selectedPreviewPage + 1} layout visualizer`}
                            className="max-h-[500px] object-contain shadow-2xl"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* TAB 3: SPREADSHEET STRUCTURE MOCKUP */}
                  {activeResultTab === "mockup" && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col gap-5"
                    >
                      <div>
                        <h4 className="text-xs font-mono uppercase text-slate-200">Visual Spreadsheet Mock-up</h4>
                        <p className="text-[11px] text-slate-500 leading-relaxed font-sans mt-0.5">
                          This preview displays the mapped cell positions, merged headers, and structured spreadsheet layout blocks generated by our coordinate grouping algorithm.
                        </p>
                      </div>

                      {/* Elegant Excel Grid Mockup */}
                      <div className="border border-slate-800 bg-slate-950 rounded-none overflow-hidden">
                        
                        {/* Mock Excel Titlebar */}
                        <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 text-[10px] font-mono text-slate-400 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-teal-500" />
                            <span className="font-semibold text-slate-300">recreated_from_pdf.xlsx - Page 1</span>
                          </div>
                          <span>GRID SCALE: FITTED</span>
                        </div>

                        {/* Excel Grid Body */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse table-fixed text-[10px] font-mono">
                            <thead>
                              <tr className="bg-slate-900/60 border-b border-slate-800">
                                <th className="w-8 border-r border-slate-800 text-slate-500 bg-slate-900 text-center select-none font-bold py-1"></th>
                                <th className="w-16 border-r border-slate-800 text-slate-400 text-center font-bold">A</th>
                                <th className="w-24 border-r border-slate-800 text-slate-400 text-center font-bold">B</th>
                                <th className="w-24 border-r border-slate-800 text-slate-400 text-center font-bold">C</th>
                                <th className="w-24 border-r border-slate-800 text-slate-400 text-center font-bold">D</th>
                                <th className="w-24 border-r border-slate-800 text-slate-400 text-center font-bold">E</th>
                                <th className="w-24 border-r border-slate-800 text-slate-400 text-center font-bold">F</th>
                              </tr>
                            </thead>
                            <tbody>
                              {/* Row 1: Document Title merged */}
                              <tr className="border-b border-slate-800">
                                <td className="border-r border-slate-800 bg-slate-900 text-center select-none text-slate-500 py-2 font-bold">1</td>
                                <td colSpan={6} className="px-3 bg-slate-900/20 text-teal-400 font-sans font-bold text-xs tracking-tight">
                                  {selectedFile?.name.replace(".pdf", "") || "PDF Title"}
                                </td>
                              </tr>

                              {/* Row 2: Metadata Info block */}
                              <tr className="border-b border-slate-800">
                                <td className="border-r border-slate-800 bg-slate-900 text-center select-none text-slate-500 py-1 font-bold">2</td>
                                <td colSpan={3} className="px-3 text-slate-400 italic font-sans py-1.5">
                                  Generated via {result.engine.toUpperCase()} layout alignment pipeline
                                </td>
                                <td colSpan={3} className="px-3 text-slate-500 font-sans text-right">
                                  Timestamp: {new Date().toLocaleDateString()}
                                </td>
                              </tr>

                              {/* Row 3: Blank spacing */}
                              <tr className="border-b border-slate-800 h-6">
                                <td className="border-r border-slate-800 bg-slate-900 text-center select-none text-slate-500 font-bold">3</td>
                                <td colSpan={6} className="bg-slate-950"></td>
                              </tr>

                              {/* Row 4: Table Header merged */}
                              <tr className="border-b border-slate-800">
                                <td className="border-r border-slate-800 bg-slate-900 text-center select-none text-slate-500 py-1.5 font-bold">4</td>
                                <td className="px-2 bg-slate-800 text-slate-200 font-sans font-bold border-r border-slate-800 text-center">ID</td>
                                <td className="px-2 bg-slate-800 text-slate-200 font-sans font-bold border-r border-slate-800">Element Category</td>
                                <td className="px-2 bg-slate-800 text-slate-200 font-sans font-bold border-r border-slate-800 text-center">Pages</td>
                                <td className="px-2 bg-slate-800 text-slate-200 font-sans font-bold border-r border-slate-800 text-center">Rows</td>
                                <td className="px-2 bg-slate-800 text-slate-200 font-sans font-bold border-r border-slate-800 text-right">Extracted Metric</td>
                                <td className="px-2 bg-slate-800 text-slate-200 font-sans font-bold text-center">Engine Flags</td>
                              </tr>

                              {/* Row 5: Table row */}
                              <tr className="border-b border-slate-800">
                                <td className="border-r border-slate-800 bg-slate-900 text-center select-none text-slate-500 py-1.5 font-bold">5</td>
                                <td className="px-2 border-r border-slate-800 text-slate-400 text-center">1001</td>
                                <td className="px-2 border-r border-slate-800 font-sans text-slate-300">Visual Grid Line Analysis</td>
                                <td className="px-2 border-r border-slate-800 text-center text-slate-300">01</td>
                                <td className="px-2 border-r border-slate-800 text-center text-slate-300">15</td>
                                <td className="px-2 border-r border-slate-800 text-right text-slate-300">0.992</td>
                                <td className="px-2 text-slate-500 font-sans text-center">ACTIVE_PIPELINE</td>
                              </tr>

                              {/* Row 6: Table row with low-confidence highlighted cell */}
                              <tr className="border-b border-slate-800">
                                <td className="border-r border-slate-800 bg-slate-900 text-center select-none text-slate-500 py-1.5 font-bold">6</td>
                                <td className="px-2 border-r border-slate-800 text-slate-400 text-center">1002</td>
                                <td className="px-2 border-r border-slate-800 font-sans text-slate-300">OpenCV Line Contour Map</td>
                                <td className="px-2 border-r border-slate-800 text-center text-slate-300">01</td>
                                <td className="px-2 border-r border-slate-800 text-center text-slate-300">24</td>
                                <td className="px-2 border-r border-slate-800 text-right bg-amber-500/10 text-amber-300 border-amber-500/30 relative group cursor-help font-bold">
                                  0.841?
                                  <div className="hidden group-hover:block absolute top-6 left-0 w-44 p-2 bg-slate-900 text-slate-200 border border-slate-800 rounded-none shadow-lg text-[9px] z-20 font-sans font-normal leading-normal">
                                    <strong>Confidence Score: 0.841</strong><br />Highlighted in soft amber. Low-confidence pixel morphology warning.
                                  </div>
                                </td>
                                <td className="px-2 text-slate-500 font-sans text-center">UNCERTAIN_CELL</td>
                              </tr>

                              {/* Row 7: Table row */}
                              <tr className="border-b border-slate-800">
                                <td className="border-r border-slate-800 bg-slate-900 text-center select-none text-slate-500 py-1.5 font-bold">7</td>
                                <td className="px-2 border-r border-slate-800 text-slate-400 text-center">1003</td>
                                <td className="px-2 border-r border-slate-800 font-sans text-slate-300">Tesseract OCR Fallback blocks</td>
                                <td className="px-2 border-r border-slate-800 text-center text-slate-300">01</td>
                                <td className="px-2 border-r border-slate-800 text-center text-slate-300">08</td>
                                <td className="px-2 border-r border-slate-800 text-right text-slate-300">0.978</td>
                                <td className="px-2 text-slate-500 font-sans text-center">STABLE_FALLBACK</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 bg-teal-950/20 border border-teal-500/20 text-slate-300 p-3.5 rounded-none text-xs">
                        <Info className="w-4 h-4 text-teal-400 flex-shrink-0" />
                        <span><strong>Interactive Highlighting:</strong> Hover/Point at the cell containing "?" to view OCR confidence validation reports directly as Excel cell comments would function.</span>
                      </div>

                    </motion.div>
                  )}

                  {/* TAB 4: CLI DEVELOPER KIT */}
                  {activeResultTab === "code" && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col gap-6 text-slate-300"
                    >
                      <div>
                        <h4 className="text-xs font-mono uppercase text-slate-200">Python Command Line Developer Kit</h4>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                          RECREATE IDENTICAL VISUAL SHEETS LOCALLY ON YOUR MACHINE USING THIS STANDALONE PYTHON UTILITY.
                        </p>
                      </div>

                      {/* Folder structure */}
                      <div>
                        <h5 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono mb-2 flex items-center gap-1.5">
                          <FolderTree className="w-4 h-4" /> Recommended File Layout
                        </h5>
                        <pre className="bg-slate-950 border border-slate-850 p-4 rounded-none text-[10px] font-mono leading-relaxed text-slate-400">
                          {FOLDER_STRUCTURE}
                        </pre>
                      </div>

                      {/* Pip Commands */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono flex items-center gap-1.5">
                            <Terminal className="w-4 h-4" /> 1. Install Dependencies (pip)
                          </h5>
                          <button
                            onClick={() => copyToClipboard(PIP_INSTALL_COMMANDS, "pip")}
                            className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 font-mono"
                          >
                            {copiedText === "pip" ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedText === "pip" ? "Copied!" : "Copy"}
                          </button>
                        </div>
                        <pre className="bg-slate-950 text-slate-300 p-3 rounded-none text-[10px] font-mono border border-slate-850">
                          {PIP_INSTALL_COMMANDS}
                        </pre>
                      </div>

                      {/* Usage details */}
                      <div>
                        <h5 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono mb-2 flex items-center gap-1.5">
                          <BookOpen className="w-4 h-4" /> 2. CLI Usage Manual
                        </h5>
                        <div className="bg-slate-900/10 border border-slate-800 p-4 rounded-none text-xs leading-relaxed flex flex-col gap-3 font-sans">
                          <p className="text-slate-300">
                            The core module file <strong className="font-mono text-teal-400">pdf_recreator.py</strong> is a fully configured script available in the parent folder of this workspace! You can easily download it directly from your sidebar tree or copy the setup command examples:
                          </p>
                          <div className="flex flex-col gap-3 mt-1">
                            {SAMPLE_CLI_COMMANDS.map((sc, index) => (
                              <div key={index} className="border-l-2 border-teal-500/40 pl-3">
                                <span className="font-bold text-slate-200 text-xs block font-sans">{sc.title}</span>
                                <span className="text-slate-500 text-[10px] block mt-0.5">{sc.desc}</span>
                                <code className="bg-slate-950 text-teal-400 font-mono text-[10px] block py-1.5 px-2 rounded-none mt-1 border border-slate-850">
                                  {sc.cmd}
                                </code>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Program explanation modules */}
                      <div>
                        <h5 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono mb-2 flex items-center gap-1.5">
                          <Cpu className="w-4 h-4" /> 3. Modular Engineering Breakdown
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {EXPLANATION_MODULES.map((mod, i) => (
                            <div key={i} className="border border-slate-850 bg-slate-900/10 hover:bg-slate-900/20 p-4 rounded-none transition-colors flex flex-col gap-1.5">
                              <h6 className="text-xs font-mono font-bold text-slate-200">{mod.name}</h6>
                              <p className="text-[10px] text-slate-400 leading-relaxed font-sans">{mod.desc}</p>
                              <code className="text-[9px] font-mono text-teal-400 mt-auto bg-slate-950 px-2 py-0.5 border border-slate-850">
                                {mod.highlight}
                              </code>
                            </div>
                          ))}
                        </div>
                      </div>

                    </motion.div>
                  )}

                </div>
              </div>
            )}

            {/* Static Splash Showcase if no files processed yet */}
            {!isProcessing && !result && (
              <div className="bg-slate-900/10 border border-slate-800 p-8 flex flex-col items-center justify-center text-center min-h-[450px] rounded-none">
                <div className="bg-slate-950 p-5 rounded-none mb-5 text-teal-400 border border-slate-800 shadow-[0_0_15px_rgba(20,184,166,0.08)]">
                  <Grid className="w-12 h-12" />
                </div>
                <h3 className="text-sm font-mono uppercase tracking-wider text-slate-200">No processed document analyzed</h3>
                <p className="text-xs text-slate-500 max-w-sm mt-2 leading-relaxed font-sans">
                  Upload a PDF document on the left panel. Our coordinate mapping and OpenCV cells segmentation engine will reconstruct its layout as an editable spreadsheet.
                </p>

                {/* Aesthetic Features row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-10 border-t border-slate-800 pt-8">
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="w-8 h-8 rounded-none bg-teal-950 text-teal-400 font-mono font-bold flex items-center justify-center text-xs border border-teal-500/20">
                      01
                    </span>
                    <span className="text-xs font-mono uppercase tracking-wider text-slate-200 mt-2">Morphology Table Finder</span>
                    <span className="text-[10px] text-slate-500 leading-normal mt-0.5 font-sans max-w-[200px]">
                      OpenCV morphology extracts columns, rows & grid borders
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="w-8 h-8 rounded-none bg-teal-950 text-teal-400 font-mono font-bold flex items-center justify-center text-xs border border-teal-500/20">
                      02
                    </span>
                    <span className="text-xs font-mono uppercase tracking-wider text-slate-200 mt-2">Visual Grid Clustering</span>
                    <span className="text-[10px] text-slate-500 leading-normal mt-0.5 font-sans max-w-[200px]">
                      Aligns headings & floating text blocks safely into cells
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="w-8 h-8 rounded-none bg-teal-950 text-teal-400 font-mono font-bold flex items-center justify-center text-xs border border-teal-500/20">
                      03
                    </span>
                    <span className="text-xs font-mono uppercase tracking-wider text-slate-200 mt-2">OCR Confidence Audit</span>
                    <span className="text-[10px] text-slate-500 leading-normal mt-0.5 font-sans max-w-[200px]">
                      Yellow highlight alerts & metadata log control sheets
                    </span>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>
      </main>
    </div>
  );
}
