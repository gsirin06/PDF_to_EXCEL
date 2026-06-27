/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface EngineStatus {
  pythonEngine: {
    available: boolean;
    pythonPresent: boolean;
    libsPresent: boolean;
    error: string;
    installing: boolean;
  };
  geminiEngine: {
    available: boolean;
  };
}

export interface RecreateResponse {
  success: boolean;
  engine: "python" | "gemini";
  excelUrl: string;
  logUrl: string;
  previews: string[];
  warnings: string[];
  logSummary: string;
}

export interface CodeBlockSection {
  title: string;
  language: string;
  code: string;
  description: string;
}
