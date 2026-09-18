import "server-only";
import pdf from "pdf-parse/lib/pdf-parse.js";
import { db } from "./db";
import { chunkText, normalizeText } from "./text";

export async function extractMaterialText(args: { text?: string; file?: File | null }) {
  if (args.file && args.file.size > 0) {
    const bytes = Buffer.from(await args.file.arrayBuffer());
    const mime = args.file.type || "application/octet-stream";
    if (mime === "application/pdf" || args.file.name.toLowerCase().endsWith(".pdf")) {
      const parsed = await pdf(bytes);
      return { type: "PDF" as const, text: parsed.text, fileName: args.file.name, fileMime: mime, fileData: bytes };
    }
    if (mime.startsWith("text/") || /\.(md|markdown|txt)$/i.test(args.file.name)) {
      return { type: args.file.name.match(/\.md|\.markdown/i) ? "MARKDOWN" as const : "TEXT" as const, text: bytes.toString("utf8"), fileName: args.file.name, fileMime: mime, fileData: bytes };
    }
    throw new Error("Formato no soportado. Usá PDF, TXT o Markdown.");
  }
  const text = args.text?.trim();
  if (!text) throw new Error("Agregá texto o un archivo.");
  return { type: "TEXT" as const, text, fileName: null, fileMime: null, fileData: null };
}

export async function createMaterial(args: { courseId: string; title: string; state: "DRAFT" | "ACTIVE"; text?: string; file?: File | null }) {
  const extracted = await extractMaterialText({ text: args.text, file: args.file });
  if (extracted.text.trim().length < 20) throw new Error("El contenido extraído es demasiado corto.");
  const chunks = chunkText(extracted.text);
  return db.$transaction(async (tx) => {
    const material = await tx.learningMaterial.create({ data: { courseId: args.courseId, title: args.title, type: extracted.type, state: args.state } });
    const version = await tx.learningMaterialVersion.create({ data: { materialId: material.id, version: 1, rawText: extracted.text, fileName: extracted.fileName, fileMime: extracted.fileMime, fileData: extracted.fileData } });
    if (chunks.length) {
      await tx.contentChunk.createMany({ data: chunks.map((text, position) => ({ courseId: args.courseId, materialId: material.id, versionId: version.id, position, text, searchText: normalizeText(text) })) });
    }
    return material;
  });
}
