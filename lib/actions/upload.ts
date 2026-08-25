import "server-only";

import { randomUUID } from "crypto";
import { join, resolve, sep } from "path";
import { mkdir, unlink, writeFile } from "fs/promises";

const UPLOAD_DIR =
  process.env.NODE_ENV === "production"
    ? join(process.cwd(), "uploads")
    : join(process.cwd(), process.env.STORAGE_PATH || "uploads");

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function sanitizeFileName(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, "_").trim();
}

function getValidFileName(name: string, maxLength = 20): string {
  const clean = sanitizeFileName(name);
  if (clean.length <= maxLength) return clean;
  const dot = clean.lastIndexOf(".");
  if (dot === -1) return clean.slice(0, maxLength);
  const ext = clean.slice(dot);
  return clean.slice(0, maxLength - ext.length) + ext;
}

async function ensureDirExists(dir: string) {
  await mkdir(dir, { recursive: true });
}

/**
 * Persists an uploaded image to the local disk (outside public/) and records
 * it in the Image table. Returns the publicly served URL (/api/uploads/<key>).
 */
export async function uploadFile(file: File) {
  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error("unsupported file type");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("file too large");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  await ensureDirExists(UPLOAD_DIR);

  const validName = getValidFileName(file.name || "image.jpg");
  const dot = validName.lastIndexOf(".");
  const ext = dot === -1 ? ".jpg" : validName.slice(dot);
  const uniqueName = `${validName.slice(0, dot === -1 ? undefined : dot)}-${randomUUID()}${ext}`;

  await writeFile(join(UPLOAD_DIR, uniqueName), buffer);

  return { key: uniqueName, url: `/api/uploads/${uniqueName}` };
}

export async function uploadFiles(files: File[]) {
  const results = [];
  for (const file of files) {
    results.push(await uploadFile(file));
  }
  return results;
}

export async function deleteFile(key: string) {
  // Path-traversal defense: reject anything that escapes the upload root.
  if (
    key.includes("/") ||
    key.includes("\\") ||
    key.includes("..") ||
    key.length > 200
  ) {
    throw new Error("invalid key");
  }
  const filePath = resolve(join(UPLOAD_DIR, key));
  if (!filePath.startsWith(resolve(UPLOAD_DIR) + sep)) {
    throw new Error("invalid key");
  }

  try {
    await unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}
