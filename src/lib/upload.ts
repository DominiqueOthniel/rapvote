import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const MAX_BYTES = 4 * 1024 * 1024;
const BUCKET = "candidates";

function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function isSupabaseStorageConfigured() {
  return Boolean(
    process.env.SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

async function ensureBucket(client: SupabaseClient) {
  const { data: buckets } = await client.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === BUCKET);
  if (exists) return;

  const { error } = await client.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: MAX_BYTES,
    allowedMimeTypes: Object.keys(ALLOWED_TYPES),
  });

  if (error && !/already exists|duplicate/i.test(error.message)) {
    throw new Error(`Bucket Supabase: ${error.message}`);
  }
}

function validatePhoto(file: File) {
  if (!file || file.size === 0) return null;
  if (file.size > MAX_BYTES) {
    throw new Error("Photo trop lourde (max 4 Mo)");
  }
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    throw new Error("Format photo invalide (JPG, PNG ou WebP)");
  }
  return ext;
}

async function saveToSupabase(file: File, slug: string, ext: string) {
  const client = getSupabaseAdmin();
  if (!client) {
    throw new Error(
      "Upload photo indisponible : configure SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  await ensureBucket(client);

  const filename = `${slug}-${Date.now()}.${ext}`;
  const objectPath = `photos/${filename}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await client.storage.from(BUCKET).upload(objectPath, buffer, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    throw new Error(`Upload Supabase: ${error.message}`);
  }

  const { data } = client.storage.from(BUCKET).getPublicUrl(objectPath);
  return data.publicUrl;
}

async function saveToLocal(file: File, slug: string, ext: string) {
  const dir = path.join(process.cwd(), "public", "uploads", "candidates");
  await mkdir(dir, { recursive: true });

  const filename = `${slug}-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  return `/uploads/candidates/${filename}`;
}

export async function saveCandidatePhoto(
  file: File,
  slug: string,
): Promise<string | null> {
  const ext = validatePhoto(file);
  if (!ext) return null;

  if (isSupabaseStorageConfigured()) {
    return saveToSupabase(file, slug, ext);
  }

  // Local only (dev). Netlify filesystem is read-only.
  if (process.env.NETLIFY === "true" || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    throw new Error(
      "Photo impossible sur Netlify sans Supabase Storage. Ajoute SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  try {
    return await saveToLocal(file, slug, ext);
  } catch {
    throw new Error(
      "Impossible d'enregistrer la photo en local. Configure Supabase Storage.",
    );
  }
}

export async function deleteCandidatePhotoFile(photoUrl: string | null) {
  if (!photoUrl) return;

  if (photoUrl.startsWith("/uploads/candidates/")) {
    const filePath = path.join(process.cwd(), "public", photoUrl.slice(1));
    try {
      await unlink(filePath);
    } catch {
      // already gone
    }
    return;
  }

  const client = getSupabaseAdmin();
  if (!client) return;

  const marker = `/object/public/${BUCKET}/`;
  const idx = photoUrl.indexOf(marker);
  if (idx === -1) return;

  const objectPath = photoUrl.slice(idx + marker.length).split("?")[0];
  if (!objectPath) return;

  await client.storage.from(BUCKET).remove([decodeURIComponent(objectPath)]);
}
