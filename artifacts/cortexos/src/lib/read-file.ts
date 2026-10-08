export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export interface ReadFileResult {
  fileName: string;
  fileType: string;
  content: string;
}

async function readPdf(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url"))
    .default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const text = await page.getTextContent();
    const line = text.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    pages.push(line);
  }
  await doc.destroy();
  return pages.join("\n\n").trim();
}

const TEXT_EXTENSIONS = [
  ".txt",
  ".md",
  ".markdown",
  ".csv",
  ".json",
  ".log",
  ".html",
  ".htm",
  ".xml",
  ".yml",
  ".yaml",
];

function isPdf(file: File): boolean {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

function isReadableText(file: File): boolean {
  if (file.type.startsWith("text/")) return true;
  if (file.type === "application/json") return true;
  const lower = file.name.toLowerCase();
  return TEXT_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export async function readFileContent(file: File): Promise<ReadFileResult> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("too-large");
  }

  let content: string;
  if (isPdf(file)) {
    content = await readPdf(file);
  } else if (isReadableText(file)) {
    content = await file.text();
  } else {
    throw new Error("unsupported");
  }

  return {
    fileName: file.name,
    fileType: file.type || (isPdf(file) ? "application/pdf" : "text/plain"),
    content,
  };
}
