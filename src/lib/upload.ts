import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const MAX_BYTES = 4 * 1024 * 1024;

export async function saveCandidatePhoto(
  file: File,
  slug: string,
): Promise<string | null> {
  if (!file || file.size === 0) return null;
  if (file.size > MAX_BYTES) {
    throw new Error("Photo trop lourde (max 4 Mo)");
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    throw new Error("Format photo invalide (JPG, PNG ou WebP)");
  }

  const dir = path.join(process.cwd(), "public", "uploads", "candidates");
  await mkdir(dir, { recursive: true });

  const filename = `${slug}-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  return `/uploads/candidates/${filename}`;
}

export async function deleteCandidatePhotoFile(photoUrl: string | null) {
  if (!photoUrl || !photoUrl.startsWith("/uploads/candidates/")) return;

  const filePath = path.join(process.cwd(), "public", photoUrl.slice(1));
  try {
    await unlink(filePath);
  } catch {
    // fichier déjà absent
  }
}
