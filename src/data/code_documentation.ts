/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const PIP_INSTALL_COMMANDS = `pip install pymupdf openpyxl opencv-python-headless pillow numpy`;

export const FOLDER_STRUCTURE = `
pdf-recreator/
│
├── pdf_recreator.py       # Main executable Python program
├── page_previews/         # Auto-generated visual preview renderings
│   ├── page_1_render.png
│   └── page_1_layout_preview.png
│
├── extraction_log.txt     # Detailed processing logs and runtime warnings
└── recreated_from_pdf.xlsx # Final, editable, fully styled Excel workbook
`;

export const USAGE_GUIDE = `
# How to Run the Program Locally

1. Install the required dependencies:
   $ pip install pymupdf openpyxl opencv-python-headless pillow numpy

2. (Optional) Install OCR fallback support:
   - For Tesseract OCR:
     - Install Tesseract-OCR binary on your operating system (e.g. brew install tesseract or apt install tesseract-ocr)
     - Install Python wrapper: pip install pytesseract
   - For EasyOCR fallback:
     - Run: pip install easyocr

3. Execute the script via command line:
   $ python pdf_recreator.py my_document.pdf --output my_sheet.xlsx

4. Explore additional processing configuration arguments:
   $ python pdf_recreator.py --help
`;

export const EXPLANATION_MODULES = [
  {
    name: "PDF Page Rendering",
    desc: "Uses PyMuPDF to render each PDF page at a razor-sharp 300 DPI. This provides the foundational visual matrix needed for OpenCV contour scanning and OCR fallbacks.",
    highlight: "fitz.open() & page.get_pixmap(dpi=300)"
  },
  {
    name: "OCR Fallback Extraction",
    desc: "When native text layers are missing (e.g., scanned PDFs), the script crops localized areas and invokes Tesseract or EasyOCR to extract characters, checking confidence scores.",
    highlight: "pytesseract.image_to_data() & easyocr.Reader()"
  },
  {
    name: "OpenCV Table & Line Detection",
    desc: "Uses binary adaptive thresholding and horizontal/vertical morphological kernels to extract structural tables, isolating cell boundary coordinates.",
    highlight: "cv2.morphologyEx() & cv2.findContours()"
  },
  {
    name: "Mathematical Grid Clustering",
    desc: "Applies a 1D clustering algorithm to group close visual lines. This creates a virtual grid in Excel, mapping floating elements onto clean, row/column boundaries.",
    highlight: "numpy.sort() & cluster_1d(coords, threshold)"
  },
  {
    name: "Openpyxl Styling & Merges",
    desc: "Constructs the workbook from scratch. Auto-calculates column widths/row heights, applies borders, fills, alignments, comments, and embeds visual drawings.",
    highlight: "openpyxl.Workbook() & ws.merge_cells()"
  },
  {
    name: "Control & Metadata Validation",
    desc: "Fleshes out a master 'Control' worksheet documenting processing parameters, warnings, OCR confidence rates, and lists low-confidence cells.",
    highlight: "Highlighted in soft yellow (FEF08A)"
  }
];

export const SAMPLE_CLI_COMMANDS = [
  {
    title: "Basic Excel Reconstruction",
    cmd: "python pdf_recreator.py sample.pdf",
    desc: "Recreates 'sample.pdf' into 'recreated_from_pdf.xlsx' using separate worksheets per page."
  },
  {
    title: "Custom Output & Preview Saving",
    cmd: "python pdf_recreator.py report.pdf --output financial.xlsx --previews ./my_images",
    desc: "Creates 'financial.xlsx' and saves rendered visual box boundaries in the folder './my_images'."
  },
  {
    title: "Combine All Pages Mode",
    cmd: "python pdf_recreator.py report.pdf --combine --grid_threshold 15",
    desc: "Merges page elements into a single continuous Excel worksheet using a looser 15-pixel clustering threshold."
  }
];
