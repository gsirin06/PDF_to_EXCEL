import express from "express";
import path from "path";
import fs from "fs";
import { exec, execFile } from "child_process";
import multer from "multer";
import { GoogleGenAI, Type } from "@google/genai";
import ExcelJS from "exceljs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Setup directories
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage for uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});
const upload = multer({
  storage: storage,
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB limit
});

// Environment variable and Gemini SDK check
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Background python library check & automatic installer
let pythonEngineStatus = {
  pythonAvailable: false,
  dependenciesInstalled: false,
  error: "",
  installing: false,
};

function checkPythonEngine() {
  pythonEngineStatus.installing = true;
  console.log("[Python Setup] Checking if python3 is available in environment...");
  exec("python3 --version", (err, stdout, stderr) => {
    if (err) {
      pythonEngineStatus.pythonAvailable = false;
      pythonEngineStatus.installing = false;
      pythonEngineStatus.error = "python3 executable not found in path.";
      console.log("[Python Setup] Warning: python3 is not available. Using Gemini Engine as default.");
      return;
    }
    pythonEngineStatus.pythonAvailable = true;
    console.log("[Python Setup] python3 is available:", stdout.trim());

    // Check if pip is available via python3 -m pip
    exec("python3 -m pip --version", (pipCheckErr) => {
      const installDeps = () => {
        console.log("[Python Setup] Installing python dependencies: pymupdf, openpyxl, opencv-python-headless, pillow, numpy...");
        exec(
          "python3 -m pip install --no-cache-dir pymupdf openpyxl opencv-python-headless pillow numpy",
          (pipErr, pipStdout, pipStderr) => {
            pythonEngineStatus.installing = false;
            if (pipErr) {
              pythonEngineStatus.dependenciesInstalled = false;
              pythonEngineStatus.error = "pip install failed: " + pipStderr;
              console.error("[Python Setup] Error installing python dependencies:", pipStderr);
            } else {
              pythonEngineStatus.dependenciesInstalled = true;
              pythonEngineStatus.error = "";
              console.log("[Python Setup] Python Local Engine is fully operational! Output:\n", pipStdout);
            }
          }
        );
      };

      if (pipCheckErr) {
        console.log("[Python Setup] pip not found. Attempting to install pip via get-pip.py...");
        exec(
          "curl -sS https://bootstrap.pypa.io/get-pip.py -o get-pip.py && python3 get-pip.py --user",
          (bootstrapErr, bStdout, bStderr) => {
            if (bootstrapErr) {
              pythonEngineStatus.installing = false;
              pythonEngineStatus.dependenciesInstalled = false;
              pythonEngineStatus.error = "Failed to bootstrap pip: " + bStderr;
              console.error("[Python Setup] Error bootstrapping pip:", bStderr);
            } else {
              console.log("[Python Setup] pip successfully bootstrapped!");
              installDeps();
            }
          }
        );
      } else {
        console.log("[Python Setup] pip is already available.");
        installDeps();
      }
    });
  });
}

// Run python check at startup
checkPythonEngine();

// Serve uploads folder as static for page layout preview images
app.use("/uploads", express.static(uploadsDir));

// API routes
app.use(express.json({ limit: "50mb" }));

// 1. Status endpoint to check active engine capabilities
app.get("/api/status", (req, res) => {
  res.json({
    pythonEngine: {
      available: pythonEngineStatus.pythonAvailable && pythonEngineStatus.dependenciesInstalled,
      pythonPresent: pythonEngineStatus.pythonAvailable,
      libsPresent: pythonEngineStatus.dependenciesInstalled,
      error: pythonEngineStatus.error,
      installing: pythonEngineStatus.installing,
    },
    geminiEngine: {
      available: !!process.env.GEMINI_API_KEY,
    },
  });
});

// 2. Main Recreate Route
app.post("/api/recreate", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file uploaded" });
    }

    const pdfPath = req.file.path;
    const filename = req.file.filename;
    const combinePages = req.body.combine === "true";
    const forceEngine = req.body.forceEngine || "auto"; // "auto", "python", "gemini"

    const baseName = filename.replace(".pdf", "");
    const outputExcelPath = path.join(uploadsDir, `${baseName}-recreated.xlsx`);
    const logPath = path.join(uploadsDir, `${baseName}-log.txt`);
    const previewsDir = path.join(uploadsDir, `previews-${baseName}`);

    fs.mkdirSync(previewsDir, { recursive: true });

    let activeEngineUsed = "python";
    let logContent = "";
    let warnings: string[] = [];
    let previews: string[] = [];

    // Check if python engine is available
    const isPythonOperational = pythonEngineStatus.pythonAvailable && pythonEngineStatus.dependenciesInstalled;

    if (forceEngine === "gemini" || (!isPythonOperational && forceEngine !== "python")) {
      // Execute multimodal Gemini AI Engine
      activeEngineUsed = "gemini";
      console.log(`[Recreate] Launching Gemini AI Layout Recreator Engine for file ${filename}...`);
      
      const result = await runGeminiAIEngine(pdfPath, outputExcelPath, logPath, combinePages);
      logContent = result.log;
      warnings = result.warnings;
      previews = result.previews;
    } else {
      // Run the local Python engine
      console.log(`[Recreate] Launching Python Local OpenCV + PyMuPDF Engine for file ${filename}...`);
      
      try {
        const result = await runPythonLocalEngine(pdfPath, outputExcelPath, logPath, previewsDir, combinePages);
        logContent = result.log;
        warnings = result.warnings;
        previews = result.previews.map(p => `/uploads/previews-${baseName}/${path.basename(p)}`);
      } catch (err: any) {
        console.error("[Recreate] Python Engine failed:", err);
        
        if (forceEngine === "python") {
          return res.status(500).json({
            error: "Python Local Engine failed, and it was explicitly requested.",
            details: err.message,
          });
        }

        // Fallback to Gemini
        console.log("[Recreate] Falling back to Gemini AI Layout Engine...");
        activeEngineUsed = "gemini";
        const result = await runGeminiAIEngine(pdfPath, outputExcelPath, logPath, combinePages);
        logContent = result.log + `\n--- FALLBACK LOG ---\nLocal Python Engine failed with error: ${err.message}. Automatically fell back to cloud Gemini AI Layout Engine.`;
        warnings = [...result.warnings, `Python engine failed: ${err.message}. Used Gemini fallback.`];
        previews = result.previews;
      }
    }

    res.json({
      success: true,
      engine: activeEngineUsed,
      excelUrl: `/api/download/${path.basename(outputExcelPath)}`,
      logUrl: `/api/download-log/${path.basename(logPath)}`,
      previews: previews,
      warnings: warnings,
      logSummary: logContent.split("\n").slice(-20).join("\n"), // return last 20 lines
    });

  } catch (err: any) {
    console.error("[Recreate API] Critical Failure:", err);
    res.status(500).json({ error: "Recreation failed", details: err.message });
  }
});

// Helper for running Python local engine
function runPythonLocalEngine(
  pdfPath: string,
  outputPath: string,
  logPath: string,
  previewsDir: string,
  combinePages: boolean
): Promise<{ log: string; warnings: string[]; previews: string[] }> {
  return new Promise((resolve, reject) => {
    const args = [
      "pdf_recreator.py",
      pdfPath,
      "--output",
      outputPath,
      "--previews",
      previewsDir,
      "--log",
      logPath,
    ];
    if (combinePages) {
      args.push("--combine");
    }

    execFile("python3", args, (err, stdout, stderr) => {
      // Even if there is some stderr warning, we check if the file was created
      if (fs.existsSync(outputPath)) {
        const logContent = fs.existsSync(logPath) ? fs.readFileSync(logPath, "utf-8") : "Log missing";
        
        // Find previews in previewsDir
        const previewFiles = fs.readdirSync(previewsDir).map(file => path.join(previewsDir, file));
        
        resolve({
          log: logContent,
          warnings: stderr ? [stderr] : [],
          previews: previewFiles,
        });
      } else {
        reject(new Error(stderr || err?.message || "Output excel file not created."));
      }
    });
  });
}

// Helper for running Gemini AI Layout Engine (Multimodal Analysis fallback)
async function runGeminiAIEngine(
  pdfPath: string,
  outputPath: string,
  logPath: string,
  combinePages: boolean
): Promise<{ log: string; warnings: string[]; previews: string[] }> {
  const startTime = new Date();
  let logStr = `Starting Gemini AI Multimodal PDF Recreator Engine\nTimestamp: ${startTime.toISOString()}\n\n`;

  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable is not defined in the Secrets panel.");
  }

  logStr += "Step 1: Uploading PDF content to Gemini 3.5 Flash Model for structured layout analysis\n";
  const pdfBuffer = fs.readFileSync(pdfPath);
  const pdfBase64 = pdfBuffer.toString("base64");

  const prompt = `
    Analyze this PDF document and perform complete layout reconstruction.
    Identify all visual text blocks, headings, notes, tables, rows, columns, and merged cells.
    You must extract and return the content inside a structured JSON.
    The response MUST be a clean JSON conforming to this schema:
    {
      "pages": [
        {
          "page_number": 1,
          "has_tables": true,
          "elements": [
            {
              "type": "title" | "heading" | "text_block" | "table",
              "text": "text content for headers or regular blocks (null for table type)",
              "row_start": 1, // approximate 1-indexed spreadsheet row
              "col_start": 1, // approximate 1-indexed spreadsheet column
              "row_end": 2, // spanning rows
              "col_end": 12, // spanning columns
              "table_data": { // only if type is table
                "headers": ["Col 1", "Col 2", ...],
                "rows": [
                  ["Cell 1", "Cell 2", ...],
                  ...
                ],
                "merged_cells": [ // list of cell mergers within this table (optional)
                  { "start_row": 1, "start_col": 1, "end_row": 1, "end_col": 2 }
                ]
              }
            }
          ]
        }
      ]
    }
    Format everything accurately. Keep data types intact (store numbers as numbers, dates as dates, text as text). Do not lose row or column alignment. If a table cell is uncertain or needs validation, indicate it.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: [
      {
        inlineData: {
          data: pdfBase64,
          mimeType: "application/pdf",
        },
      },
      prompt,
    ],
    config: {
      responseMimeType: "application/json",
      systemInstruction: "You are an expert OCR and visual spreadsheet reconstruction machine. Convert any PDF image or text visual layout into detailed, grid-accurate spreadsheet JSON models.",
    },
  });

  const rawJson = response.text;
  if (!rawJson) {
    throw new Error("Empty response received from Gemini.");
  }

  logStr += "Step 2: Received structured layout map from Gemini. Reconstructing Excel Workbook with exceljs...\n";
  const parsedMap = JSON.parse(rawJson);

  // Recreate workbook via exceljs
  const workbook = new ExcelJS.Workbook();
  const warnings: string[] = [];
  const uncertainCells: any[] = [];

  // Build a "Control" sheet
  const controlSheet = workbook.addWorksheet("Control");
  controlSheet.views = [{ showGridLines: true }];
  controlSheet.getColumn("A").width = 30;
  controlSheet.getColumn("B").width = 50;

  controlSheet.addRow(["PDF TO EXCEL EXTRACTION CONTROL CENTER (AI ENGINE)"]);
  controlSheet.getCell("A1").font = { name: "Inter", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  controlSheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF111827" } };
  controlSheet.mergeCells("A1:B1");
  controlSheet.getRow(1).height = 40;

  controlSheet.addRow([]);
  controlSheet.addRow(["EXTRACTION METADATA"]);
  controlSheet.getCell("A3").font = { name: "Inter", size: 11, bold: true };
  controlSheet.addRow(["Source PDF File", path.basename(pdfPath)]);
  controlSheet.addRow(["Extraction Date", new Date().toLocaleString()]);
  controlSheet.addRow(["Engine Used", "Gemini 3.5 Flash Visual Recreator"]);
  controlSheet.addRow(["Status", "Completed via cloud-native neural segmentation"]);

  // Apply basic borders for metadata
  for (let r = 4; r <= 7; r++) {
    controlSheet.getCell(`A${r}`).border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
    controlSheet.getCell(`B${r}`).border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
  }

  // Iterate over parsed pages
  const pages = parsedMap.pages || [];
  logStr += `Detected ${pages.length} pages to recreate.\n`;

  pages.forEach((p: any, idx: number) => {
    const pageNum = p.page_number || idx + 1;
    const ws = workbook.addWorksheet(`Page ${pageNum}`);
    ws.views = [{ showGridLines: true }];

    // Set some generous column widths
    for (let col = 1; col <= 15; col++) {
      ws.getColumn(col).width = 18;
    }

    const elements = p.elements || [];
    elements.forEach((el: any) => {
      const rStart = el.row_start || 1;
      const cStart = el.col_start || 1;
      const rEnd = el.row_end || rStart + 1;
      const cEnd = el.col_end || cStart + 1;

      if (el.type === "table" && el.table_data) {
        // Render a Table
        const table = el.table_data;
        const headers = table.headers || [];
        const rows = table.rows || [];

        // Write headers
        headers.forEach((h: string, cIdx: number) => {
          const colNum = cStart + cIdx;
          const cell = ws.getCell(rStart, colNum);
          cell.value = h;
          cell.font = { name: "Inter", bold: true, size: 11 };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } }; // Light gray header
          cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
          cell.alignment = { horizontal: "center" };
        });

        // Write rows
        rows.forEach((rowVals: any[], rIdx: number) => {
          const rowNum = rStart + 1 + rIdx;
          rowVals.forEach((val: any, cIdx: number) => {
            const colNum = cStart + cIdx;
            const cell = ws.getCell(rowNum, colNum);
            
            // Try numeric/date coercion
            if (typeof val === "string" && !isNaN(Number(val)) && val.trim() !== "") {
              cell.value = Number(val);
              cell.alignment = { horizontal: "right" };
            } else {
              cell.value = val;
              cell.alignment = { horizontal: "left" };
            }

            cell.font = { name: "Inter", size: 10 };
            cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };

            // Highlight if cell value mentions uncertainty
            const sVal = String(val).toLowerCase();
            if (sVal.includes("uncertain") || sVal.includes("unknown") || sVal.includes("?") || sVal.includes("low_conf")) {
              cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF08A" } }; // yellow highlighting
              cell.note = "Reconstructed with lower visual confidence.";
              uncertainCells.push({ sheet: `Page ${pageNum}`, cell: `${cell.address}`, value: val, reason: "Uncertain marker inside cell content" });
            }
          });
        });

      } else {
        // Render normal Text block or title
        if (rEnd > rStart || cEnd > cStart) {
          try {
            ws.mergeCells(rStart, cStart, rEnd - 1, cEnd - 1);
          } catch (e) {
            // merge error (overlap)
          }
        }

        const cell = ws.getCell(rStart, cStart);
        cell.value = el.text;
        cell.alignment = { vertical: "middle", wrapText: true };

        if (el.type === "title") {
          cell.font = { name: "Inter", bold: true, size: 14, color: { argb: "FF111827" } };
        } else if (el.type === "heading") {
          cell.font = { name: "Inter", bold: true, size: 11, color: { argb: "FF1F2937" } };
        } else {
          cell.font = { name: "Inter", size: 10, color: { argb: "FF374151" } };
        }
      }
    });
  });

  // Write warnings and uncertain cells to control page
  controlSheet.addRow([]);
  controlSheet.addRow(["UNCERTAIN OR LOW CONFIDENCE CELL LOGS"]);
  controlSheet.getCell(`A${controlSheet.rowCount}`).font = { name: "Inter", size: 11, bold: true };
  controlSheet.addRow(["Sheet Name", "Cell Address", "Value", "Issue"]);
  const headerRowIdx = controlSheet.rowCount;
  controlSheet.getCell(`A${headerRowIdx}`).font = { name: "Inter", bold: true };
  controlSheet.getCell(`B${headerRowIdx}`).font = { name: "Inter", bold: true };

  if (uncertainCells.length === 0) {
    controlSheet.addRow(["All worksheets", "N/A", "N/A", "Excellent visual extraction confidence!"]);
  } else {
    uncertainCells.forEach(item => {
      controlSheet.addRow([item.sheet, item.cell, item.value, item.reason]);
    });
  }

  // Save Excel file
  await workbook.xlsx.writeFile(outputPath);
  logStr += `Recreation successful! File saved to ${outputPath}\n`;

  // Write log content
  const duration = (new Date().getTime() - startTime.getTime()) / 1000;
  logStr += `Extraction complete in ${duration.toFixed(2)} seconds.\n`;
  fs.writeFileSync(logPath, logStr);

  return {
    log: logStr,
    warnings: warnings,
    previews: [], // Gemini layout doesn't produce visual images, which is documented
  };
}

// Downloads and files servings
app.get("/api/download/:filename", (req, res) => {
  const filePath = path.join(uploadsDir, req.params.filename);
  if (fs.existsSync(filePath)) {
    res.download(filePath, "recreated_from_pdf.xlsx");
  } else {
    res.status(404).send("File not found");
  }
});

app.get("/api/download-log/:filename", (req, res) => {
  const filePath = path.join(uploadsDir, req.params.filename);
  if (fs.existsSync(filePath)) {
    res.download(filePath, "extraction_log.txt");
  } else {
    res.status(404).send("File not found");
  }
});

async function start() {
  // Vite middleware for client-side React preview
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Bind server to port 3000
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
});
