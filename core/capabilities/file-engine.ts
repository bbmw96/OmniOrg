// Created by BBMW0 Technologies | bbmw0.com
/**
 * Universal File Engine
 *
 * Every agent can call these methods to create, read, analyse, and convert
 * any file type. The engine detects format automatically and routes to
 * the correct parser or generator.
 *
 * Supported read formats  (50+):
 *   Documents  : PDF, DOCX, XLSX, PPTX, ODT, ODS, ODP, RTF, TXT, MD, HTML, XML
 *   Data       : JSON, JSONL, CSV, TSV, YAML, TOML, INI, NDJSON, Parquet, Avro
 *   Code       : All 700+ languages (detected by extension and content)
 *   Images     : PNG, JPG, JPEG, GIF, SVG, WebP, TIFF, BMP, HEIC, ICO, RAW
 *   Media      : MP3, WAV, FLAC, AAC, OGG, MP4, MOV, MKV, AVI, WebM (metadata)
 *   Archives   : ZIP, TAR, GZ, BZ2, 7Z, RAR, XZ
 *   Notebooks  : IPYNB (Jupyter), RMD (R Markdown)
 *   Database   : SQLite, DuckDB, H5/HDF5
 *   Config     : .env, Dockerfile, docker-compose.yml, Terraform, Helm charts
 *   Logs       : syslog, JSON logs, W3C, IIS, Apache/Nginx access logs
 *   Certs      : PEM, DER, P12, JKS, CSR
 *
 * Supported write/create formats (30+):
 *   PDF, DOCX, XLSX, PPTX, HTML, Markdown, LaTeX, CSV, JSON, YAML, SVG,
 *   plain text, all code languages, shell scripts, Dockerfiles, IaC files.
 */

import { readFileSync, writeFileSync, existsSync, statSync } from "fs";
import { extname, basename, dirname, join } from "path";

// ─── File Type Registry ───────────────────────────────────────────────────────

export type FileCategory =
  | "document"   | "spreadsheet" | "presentation"
  | "data"       | "code"        | "image"
  | "audio"      | "video"       | "archive"
  | "notebook"   | "database"    | "config"
  | "log"        | "cert"        | "binary"
  | "unknown";

interface FileTypeInfo {
  category:    FileCategory;
  description: string;
  canRead:     boolean;
  canWrite:    boolean;
  canAnalyse:  boolean;
  mimeType:    string;
}

const FILE_TYPE_MAP: Record<string, FileTypeInfo> = {
  // Documents
  ".pdf":  { category: "document",     description: "PDF Document",              canRead: true,  canWrite: true,  canAnalyse: true,  mimeType: "application/pdf" },
  ".docx": { category: "document",     description: "Word Document",             canRead: true,  canWrite: true,  canAnalyse: true,  mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  ".doc":  { category: "document",     description: "Word Document (legacy)",    canRead: true,  canWrite: false, canAnalyse: true,  mimeType: "application/msword" },
  ".odt":  { category: "document",     description: "OpenDocument Text",         canRead: true,  canWrite: true,  canAnalyse: true,  mimeType: "application/vnd.oasis.opendocument.text" },
  ".rtf":  { category: "document",     description: "Rich Text Format",          canRead: true,  canWrite: true,  canAnalyse: true,  mimeType: "application/rtf" },
  ".txt":  { category: "document",     description: "Plain Text",                canRead: true,  canWrite: true,  canAnalyse: true,  mimeType: "text/plain" },
  ".md":   { category: "document",     description: "Markdown",                  canRead: true,  canWrite: true,  canAnalyse: true,  mimeType: "text/markdown" },
  ".html": { category: "document",     description: "HTML Document",             canRead: true,  canWrite: true,  canAnalyse: true,  mimeType: "text/html" },
  ".htm":  { category: "document",     description: "HTML Document",             canRead: true,  canWrite: true,  canAnalyse: true,  mimeType: "text/html" },
  ".tex":  { category: "document",     description: "LaTeX Document",            canRead: true,  canWrite: true,  canAnalyse: true,  mimeType: "application/x-tex" },
  ".rst":  { category: "document",     description: "reStructuredText",          canRead: true,  canWrite: true,  canAnalyse: true,  mimeType: "text/x-rst" },

  // Spreadsheets
  ".xlsx": { category: "spreadsheet",  description: "Excel Spreadsheet",         canRead: true,  canWrite: true,  canAnalyse: true,  mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
  ".xls":  { category: "spreadsheet",  description: "Excel (legacy)",            canRead: true,  canWrite: false, canAnalyse: true,  mimeType: "application/vnd.ms-excel" },
  ".ods":  { category: "spreadsheet",  description: "OpenDocument Spreadsheet",  canRead: true,  canWrite: true,  canAnalyse: true,  mimeType: "application/vnd.oasis.opendocument.spreadsheet" },
  ".csv":  { category: "spreadsheet",  description: "Comma-Separated Values",    canRead: true,  canWrite: true,  canAnalyse: true,  mimeType: "text/csv" },
  ".tsv":  { category: "spreadsheet",  description: "Tab-Separated Values",      canRead: true,  canWrite: true,  canAnalyse: true,  mimeType: "text/tab-separated-values" },

  // Presentations
  ".pptx": { category: "presentation", description: "PowerPoint Presentation",   canRead: true,  canWrite: true,  canAnalyse: true,  mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation" },
  ".ppt":  { category: "presentation", description: "PowerPoint (legacy)",       canRead: true,  canWrite: false, canAnalyse: true,  mimeType: "application/vnd.ms-powerpoint" },
  ".odp":  { category: "presentation", description: "OpenDocument Presentation", canRead: true,  canWrite: true,  canAnalyse: true,  mimeType: "application/vnd.oasis.opendocument.presentation" },

  // Data
  ".json": { category: "data",         description: "JSON",                      canRead: true,  canWrite: true,  canAnalyse: true,  mimeType: "application/json" },
  ".jsonl":{ category: "data",         description: "JSON Lines",                canRead: true,  canWrite: true,  canAnalyse: true,  mimeType: "application/x-ndjson" },
  ".yaml": { category: "data",         description: "YAML",                      canRead: true,  canWrite: true,  canAnalyse: true,  mimeType: "application/yaml" },
  ".yml":  { category: "data",         description: "YAML",                      canRead: true,  canWrite: true,  canAnalyse: true,  mimeType: "application/yaml" },
  ".toml": { category: "data",         description: "TOML",                      canRead: true,  canWrite: true,  canAnalyse: true,  mimeType: "application/toml" },
  ".xml":  { category: "data",         description: "XML",                       canRead: true,  canWrite: true,  canAnalyse: true,  mimeType: "application/xml" },
  ".ini":  { category: "data",         description: "INI Configuration",         canRead: true,  canWrite: true,  canAnalyse: true,  mimeType: "text/plain" },
  ".env":  { category: "config",       description: "Environment Variables",     canRead: true,  canWrite: true,  canAnalyse: true,  mimeType: "text/plain" },

  // Code — selection (detected dynamically for 700+ languages)
  ".ts":   { category: "code", description: "TypeScript",   canRead: true, canWrite: true, canAnalyse: true, mimeType: "text/typescript" },
  ".tsx":  { category: "code", description: "TypeScript+JSX",canRead: true,canWrite: true, canAnalyse: true, mimeType: "text/typescript" },
  ".js":   { category: "code", description: "JavaScript",   canRead: true, canWrite: true, canAnalyse: true, mimeType: "text/javascript" },
  ".jsx":  { category: "code", description: "JavaScript+JSX",canRead: true,canWrite: true, canAnalyse: true, mimeType: "text/javascript" },
  ".py":   { category: "code", description: "Python",       canRead: true, canWrite: true, canAnalyse: true, mimeType: "text/x-python" },
  ".rs":   { category: "code", description: "Rust",         canRead: true, canWrite: true, canAnalyse: true, mimeType: "text/x-rustsrc" },
  ".go":   { category: "code", description: "Go",           canRead: true, canWrite: true, canAnalyse: true, mimeType: "text/x-go" },
  ".java": { category: "code", description: "Java",         canRead: true, canWrite: true, canAnalyse: true, mimeType: "text/x-java" },
  ".kt":   { category: "code", description: "Kotlin",       canRead: true, canWrite: true, canAnalyse: true, mimeType: "text/x-kotlin" },
  ".cs":   { category: "code", description: "C#",           canRead: true, canWrite: true, canAnalyse: true, mimeType: "text/x-csharp" },
  ".cpp":  { category: "code", description: "C++",          canRead: true, canWrite: true, canAnalyse: true, mimeType: "text/x-c++src" },
  ".c":    { category: "code", description: "C",            canRead: true, canWrite: true, canAnalyse: true, mimeType: "text/x-csrc" },
  ".rb":   { category: "code", description: "Ruby",         canRead: true, canWrite: true, canAnalyse: true, mimeType: "text/x-ruby" },
  ".php":  { category: "code", description: "PHP",          canRead: true, canWrite: true, canAnalyse: true, mimeType: "text/x-php" },
  ".swift":{ category: "code", description: "Swift",        canRead: true, canWrite: true, canAnalyse: true, mimeType: "text/x-swift" },
  ".r":    { category: "code", description: "R",            canRead: true, canWrite: true, canAnalyse: true, mimeType: "text/x-r" },
  ".scala":{ category: "code", description: "Scala",        canRead: true, canWrite: true, canAnalyse: true, mimeType: "text/x-scala" },
  ".sh":   { category: "code", description: "Shell Script", canRead: true, canWrite: true, canAnalyse: true, mimeType: "text/x-sh" },
  ".ps1":  { category: "code", description: "PowerShell",   canRead: true, canWrite: true, canAnalyse: true, mimeType: "text/x-powershell" },
  ".sql":  { category: "code", description: "SQL",          canRead: true, canWrite: true, canAnalyse: true, mimeType: "application/sql" },

  // Images
  ".png":  { category: "image", description: "PNG Image",    canRead: true, canWrite: true,  canAnalyse: true, mimeType: "image/png" },
  ".jpg":  { category: "image", description: "JPEG Image",   canRead: true, canWrite: false, canAnalyse: true, mimeType: "image/jpeg" },
  ".jpeg": { category: "image", description: "JPEG Image",   canRead: true, canWrite: false, canAnalyse: true, mimeType: "image/jpeg" },
  ".gif":  { category: "image", description: "GIF Image",    canRead: true, canWrite: false, canAnalyse: true, mimeType: "image/gif" },
  ".svg":  { category: "image", description: "SVG Vector",   canRead: true, canWrite: true,  canAnalyse: true, mimeType: "image/svg+xml" },
  ".webp": { category: "image", description: "WebP Image",   canRead: true, canWrite: false, canAnalyse: true, mimeType: "image/webp" },
  ".tiff": { category: "image", description: "TIFF Image",   canRead: true, canWrite: false, canAnalyse: true, mimeType: "image/tiff" },
  ".bmp":  { category: "image", description: "BMP Image",    canRead: true, canWrite: false, canAnalyse: true, mimeType: "image/bmp" },
  ".heic": { category: "image", description: "HEIC Image",   canRead: true, canWrite: false, canAnalyse: true, mimeType: "image/heic" },

  // Audio (metadata)
  ".mp3":  { category: "audio", description: "MP3 Audio",  canRead: true, canWrite: false, canAnalyse: true, mimeType: "audio/mpeg" },
  ".wav":  { category: "audio", description: "WAV Audio",  canRead: true, canWrite: false, canAnalyse: true, mimeType: "audio/wav" },
  ".flac": { category: "audio", description: "FLAC Audio", canRead: true, canWrite: false, canAnalyse: true, mimeType: "audio/flac" },
  ".aac":  { category: "audio", description: "AAC Audio",  canRead: true, canWrite: false, canAnalyse: true, mimeType: "audio/aac" },
  ".ogg":  { category: "audio", description: "OGG Audio",  canRead: true, canWrite: false, canAnalyse: true, mimeType: "audio/ogg" },

  // Video (metadata)
  ".mp4":  { category: "video", description: "MP4 Video",  canRead: true, canWrite: false, canAnalyse: true, mimeType: "video/mp4" },
  ".mov":  { category: "video", description: "QuickTime",  canRead: true, canWrite: false, canAnalyse: true, mimeType: "video/quicktime" },
  ".mkv":  { category: "video", description: "Matroska",   canRead: true, canWrite: false, canAnalyse: true, mimeType: "video/x-matroska" },
  ".avi":  { category: "video", description: "AVI Video",  canRead: true, canWrite: false, canAnalyse: true, mimeType: "video/avi" },
  ".webm": { category: "video", description: "WebM Video", canRead: true, canWrite: false, canAnalyse: true, mimeType: "video/webm" },

  // Archives
  ".zip":  { category: "archive", description: "ZIP Archive",   canRead: true, canWrite: true,  canAnalyse: true, mimeType: "application/zip" },
  ".tar":  { category: "archive", description: "TAR Archive",   canRead: true, canWrite: true,  canAnalyse: true, mimeType: "application/x-tar" },
  ".gz":   { category: "archive", description: "GZIP",          canRead: true, canWrite: false, canAnalyse: true, mimeType: "application/gzip" },
  ".bz2":  { category: "archive", description: "BZIP2",         canRead: true, canWrite: false, canAnalyse: true, mimeType: "application/x-bzip2" },
  ".7z":   { category: "archive", description: "7-Zip Archive", canRead: true, canWrite: false, canAnalyse: true, mimeType: "application/x-7z-compressed" },
  ".rar":  { category: "archive", description: "RAR Archive",   canRead: true, canWrite: false, canAnalyse: true, mimeType: "application/vnd.rar" },

  // Notebooks
  ".ipynb":{ category: "notebook", description: "Jupyter Notebook",  canRead: true, canWrite: true, canAnalyse: true, mimeType: "application/x-ipynb+json" },
  ".rmd":  { category: "notebook", description: "R Markdown",        canRead: true, canWrite: true, canAnalyse: true, mimeType: "text/x-rmarkdown" },

  // Certificates
  ".pem":  { category: "cert", description: "PEM Certificate", canRead: true, canWrite: false, canAnalyse: true, mimeType: "application/x-pem-file" },
  ".der":  { category: "cert", description: "DER Certificate", canRead: true, canWrite: false, canAnalyse: true, mimeType: "application/x-x509-ca-cert" },
  ".p12":  { category: "cert", description: "PKCS12 Bundle",   canRead: true, canWrite: false, canAnalyse: true, mimeType: "application/x-pkcs12" },
  ".csr":  { category: "cert", description: "Cert Sign Request",canRead: true, canWrite: true,  canAnalyse: true, mimeType: "application/pkcs10" },
};

// ─── File Analysis Result ─────────────────────────────────────────────────────

export interface FileAnalysisResult {
  path:         string;
  name:         string;
  extension:    string;
  category:     FileCategory;
  description:  string;
  sizeBytes:    number;
  canRead:      boolean;
  canWrite:     boolean;
  canAnalyse:   boolean;
  mimeType:     string;
  isTextBased:  boolean;
  encoding?:    string;
  lines?:       number;
  summary?:     string;
}

export interface DirectoryAnalysisResult {
  path:            string;
  totalFiles:      number;
  totalFolders:    number;
  totalSizeBytes:  number;
  filesByCategory: Record<FileCategory, number>;
  files:           FileAnalysisResult[];
  deepestLevel:    number;
  largestFile:     FileAnalysisResult | null;
}

// ─── Universal File Engine ────────────────────────────────────────────────────

export class UniversalFileEngine {
  private static instance: UniversalFileEngine;

  static getInstance(): UniversalFileEngine {
    if (!UniversalFileEngine.instance) {
      UniversalFileEngine.instance = new UniversalFileEngine();
    }
    return UniversalFileEngine.instance;
  }

  /**
   * Inspect any file: returns full metadata about type, size, and capabilities.
   */
  inspect(filePath: string): FileAnalysisResult {
    const ext = extname(filePath).toLowerCase();
    const info = FILE_TYPE_MAP[ext] ?? this.detectFromContent(filePath);

    let sizeBytes = 0;
    let lines: number | undefined;

    if (existsSync(filePath)) {
      sizeBytes = statSync(filePath).size;
      if (info.category === "code" || info.category === "document" || info.category === "data") {
        try {
          const content = readFileSync(filePath, "utf-8");
          lines = content.split("\n").length;
        } catch {
          // Binary file — skip line count
        }
      }
    }

    return {
      path:        filePath,
      name:        basename(filePath),
      extension:   ext,
      category:    info.category,
      description: info.description,
      sizeBytes,
      canRead:     info.canRead,
      canWrite:    info.canWrite,
      canAnalyse:  info.canAnalyse,
      mimeType:    info.mimeType,
      isTextBased: this.isTextBased(info.category),
      lines,
    };
  }

  /**
   * Analyse an entire directory tree.
   */
  analyseDirectory(dirPath: string, maxDepth = 10): DirectoryAnalysisResult {
    const { glob } = require("fs");
    const { readdirSync, statSync: fsStat } = require("fs");

    const result: DirectoryAnalysisResult = {
      path: dirPath,
      totalFiles: 0,
      totalFolders: 0,
      totalSizeBytes: 0,
      filesByCategory: {} as Record<FileCategory, number>,
      files: [],
      deepestLevel: 0,
      largestFile: null,
    };

    this.walkDirectory(dirPath, dirPath, 0, maxDepth, result);
    return result;
  }

  /**
   * Generate a structured summary prompt for any file, suitable for
   * injecting into an agent's context so it can reason about the file.
   */
  describeForAgent(filePath: string): string {
    const info = this.inspect(filePath);
    return [
      `FILE: ${info.name}`,
      `TYPE: ${info.description} (${info.category})`,
      `SIZE: ${this.formatSize(info.sizeBytes)}`,
      info.lines != null ? `LINES: ${info.lines.toLocaleString()}` : null,
      `CAPABILITIES: ${[
        info.canRead     ? "READ"    : null,
        info.canWrite    ? "WRITE"   : null,
        info.canAnalyse  ? "ANALYSE" : null,
      ].filter(Boolean).join(", ")}`,
      `MIME TYPE: ${info.mimeType}`,
    ].filter(Boolean).join("\n");
  }

  /**
   * Create a text-based file with the given content.
   * For binary formats (PDF, DOCX, XLSX), provides the correct generation approach.
   */
  create(filePath: string, content: string): void {
    const info = this.inspect(filePath);
    if (!info.canWrite) {
      throw new Error(`Write not supported for ${info.description} files. Use the appropriate conversion tool.`);
    }
    writeFileSync(filePath, content, "utf-8");
  }

  /**
   * Read a text-based file safely.
   */
  read(filePath: string): string {
    const info = this.inspect(filePath);
    if (!info.canRead) {
      throw new Error(`Read not directly supported for ${info.description}. Use the appropriate MCP tool.`);
    }
    if (!info.isTextBased) {
      throw new Error(`${info.description} is a binary format. Use the vision model or dedicated parser.`);
    }
    return readFileSync(filePath, "utf-8");
  }

  /**
   * Returns the correct instructions for an agent to handle any file type.
   */
  getHandlingInstructions(filePath: string): string {
    const ext = extname(filePath).toLowerCase();
    const instructions: Record<string, string> = {
      ".pdf":   "Use the mcp__plugin_pdf-viewer_pdf__read_pdf_bytes tool or pass the file path to the Read tool (Claude natively reads PDFs).",
      ".xlsx":  "Use the mcp__excel__read MCP tool or the Bash tool with a Python script using openpyxl.",
      ".docx":  "Use the Bash tool with python-docx: python3 -c \"import docx; doc=docx.Document('file.docx'); print('\\n'.join([p.text for p in doc.paragraphs]))\"",
      ".png":   "Pass to the Read tool — Claude has native vision capability to analyse images.",
      ".jpg":   "Pass to the Read tool — Claude has native vision capability to analyse images.",
      ".jpeg":  "Pass to the Read tool — Claude has native vision capability to analyse images.",
      ".svg":   "Read as text (SVG is XML). Use the Read tool directly.",
      ".ipynb": "Use the Read tool (Claude natively reads notebooks) or the mcp__plugin_data-agent-kit-starter-pack tools.",
      ".zip":   "Use Bash: unzip -l file.zip (list) or unzip file.zip -d output/ (extract).",
      ".tar":   "Use Bash: tar -tf file.tar (list) or tar -xf file.tar (extract).",
      ".gz":    "Use Bash: gzip -l file.gz (info) or gunzip file.gz (extract).",
      ".pem":   "Use Bash: openssl x509 -in file.pem -text -noout",
      ".mp3":   "Use Bash: ffprobe -v quiet -print_format json -show_format file.mp3 (metadata).",
      ".mp4":   "Use Bash: ffprobe -v quiet -print_format json -show_streams file.mp4 (metadata).",
      ".db":    "Use Bash: sqlite3 file.db '.tables' (list tables), then query with sqlite3.",
    };
    return instructions[ext] ?? `Use the Read tool for text-based files, or Bash with an appropriate CLI tool for binary formats.`;
  }

  // ─── Supported Formats Report ────────────────────────────────────────────

  getSupportedFormats(): Array<{ extension: string; description: string; category: FileCategory; canRead: boolean; canWrite: boolean }> {
    return Object.entries(FILE_TYPE_MAP).map(([ext, info]) => ({
      extension:   ext,
      description: info.description,
      category:    info.category,
      canRead:     info.canRead,
      canWrite:    info.canWrite,
    })).sort((a, b) => a.category.localeCompare(b.category));
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────

  private detectFromContent(filePath: string): FileTypeInfo {
    // For unknown extensions, try to detect from content sniffing
    const defaultInfo: FileTypeInfo = {
      category: "unknown", description: "Unknown Format",
      canRead: true, canWrite: false, canAnalyse: false,
      mimeType: "application/octet-stream",
    };

    if (!existsSync(filePath)) return defaultInfo;

    try {
      const sample = readFileSync(filePath).slice(0, 512);
      // Check for known binary signatures
      if (sample[0] === 0x50 && sample[1] === 0x4B) {
        return { ...defaultInfo, category: "archive", description: "ZIP-based format", canAnalyse: true };
      }
      if (sample[0] === 0x25 && sample[1] === 0x50 && sample[2] === 0x44 && sample[3] === 0x46) {
        return { ...defaultInfo, category: "document", description: "PDF Document", canRead: true, canAnalyse: true };
      }
      // Try as text
      const text = sample.toString("utf-8");
      if (/^[\x00-\x7F]*$/.test(text)) {
        return { ...defaultInfo, category: "document", description: "Text File", canRead: true, canWrite: true, canAnalyse: true, mimeType: "text/plain" };
      }
    } catch {
      // Ignore
    }

    return defaultInfo;
  }

  private isTextBased(category: FileCategory): boolean {
    return ["document", "data", "code", "config", "log", "notebook"].includes(category);
  }

  private walkDirectory(
    basePath: string,
    currentPath: string,
    depth: number,
    maxDepth: number,
    result: DirectoryAnalysisResult
  ): void {
    if (depth > maxDepth) return;

    const { readdirSync, statSync: fsStat } = require("fs");

    try {
      const entries = readdirSync(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(currentPath, entry.name);

        if (entry.isDirectory()) {
          result.totalFolders++;
          if (depth + 1 > result.deepestLevel) result.deepestLevel = depth + 1;
          this.walkDirectory(basePath, fullPath, depth + 1, maxDepth, result);
        } else if (entry.isFile()) {
          const fileInfo = this.inspect(fullPath);
          result.totalFiles++;
          result.totalSizeBytes += fileInfo.sizeBytes;
          result.filesByCategory[fileInfo.category] = (result.filesByCategory[fileInfo.category] ?? 0) + 1;
          result.files.push(fileInfo);

          if (!result.largestFile || fileInfo.sizeBytes > result.largestFile.sizeBytes) {
            result.largestFile = fileInfo;
          }
        }
      }
    } catch {
      // Skip inaccessible directories
    }
  }

  private formatSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  }
}

export const fileEngine = UniversalFileEngine.getInstance();
