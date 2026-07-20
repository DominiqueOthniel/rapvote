import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";

const ALLOWED_PHOTO_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const ALLOWED_AUDIO_TYPES: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
};

const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
const MAX_AUDIO_BYTES = 15 * 1024 * 1024;
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
    fileSizeLimit: MAX_AUDIO_BYTES,
    allowedMimeTypes: [
      ...Object.keys(ALLOWED_PHOTO_TYPES),
      ...Object.keys(ALLOWED_AUDIO_TYPES),
    ],
  });

  if (error && !/already exists|duplicate/i.test(error.message)) {
    throw new Error(`Bucket Supabase: ${error.message}`);
  }
}

function validatePhoto(file: File) {
  if (!file || file.size === 0) return null;
  if (file.size > MAX_PHOTO_BYTES) {
    throw new Error("Photo trop lourde (max 4 Mo)");
  }
  const ext = ALLOWED_PHOTO_TYPES[file.type];
  if (!ext) {
    throw new Error("Format photo invalide (JPG, PNG ou WebP)");
  }
  return ext;
}

function validateAudio(file: File) {
  if (!file || file.size === 0) return null;
  if (file.size > MAX_AUDIO_BYTES) {
    throw new Error("Son trop lourd (max 15 Mo)");
  }
  const ext = ALLOWED_AUDIO_TYPES[file.type];
  if (!ext) {
    throw new Error("Format audio invalide (MP3, M4A, WAV, WebM ou OGG)");
  }
  return ext;
}

async function uploadToSupabase(
  file: File,
  objectPath: string,
): Promise<string> {
  const client = getSupabaseAdmin();
  if (!client) {
    throw new Error(
      "Upload indisponible : configure SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  await ensureBucket(client);
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

async function savePhotoToLocal(file: File, slug: string, ext: string) {
  const dir = path.join(process.cwd(), "public", "uploads", "candidates");
  await mkdir(dir, { recursive: true });

  const filename = `${slug}-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  return `/uploads/candidates/${filename}`;
}

async function saveAudioToLocal(
  file: File,
  slug: string,
  phaseNumber: number,
  ext: string,
) {
  const dir = path.join(process.cwd(), "public", "uploads", "audio", slug);
  await mkdir(dir, { recursive: true });

  const filename = `phase-${phaseNumber}-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  return `/uploads/audio/${slug}/${filename}`;
}

export async function saveCandidatePhoto(
  file: File,
  slug: string,
): Promise<string | null> {
  const ext = validatePhoto(file);
  if (!ext) return null;

  if (isSupabaseStorageConfigured()) {
    return uploadToSupabase(file, `photos/${slug}-${Date.now()}.${ext}`);
  }

  if (process.env.NETLIFY === "true" || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    throw new Error(
      "Photo impossible sur Netlify sans Supabase Storage. Ajoute SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  try {
    return await savePhotoToLocal(file, slug, ext);
  } catch {
    throw new Error(
      "Impossible d'enregistrer la photo en local. Configure Supabase Storage.",
    );
  }
}

export async function savePhaseAudio(
  file: File,
  slug: string,
  phaseNumber: number,
): Promise<string | null> {
  const ext = validateAudio(file);
  if (!ext) return null;

  const objectPath = `audio/${slug}/phase-${phaseNumber}-${Date.now()}.${ext}`;

  if (isSupabaseStorageConfigured()) {
    return uploadToSupabase(file, objectPath);
  }

  if (process.env.NETLIFY === "true" || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    throw new Error(
      "Son impossible sur Netlify sans Supabase Storage. Ajoute SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  try {
    return await saveAudioToLocal(file, slug, phaseNumber, ext);
  } catch {
    throw new Error(
      "Impossible d'enregistrer le son en local. Configure Supabase Storage.",
    );
  }
}

async function deleteStorageUrl(fileUrl: string | null) {
  if (!fileUrl) return;

  if (fileUrl.startsWith("/uploads/")) {
    const filePath = path.join(process.cwd(), "public", fileUrl.slice(1));
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
  const idx = fileUrl.indexOf(marker);
  if (idx === -1) return;

  const objectPath = fileUrl.slice(idx + marker.length).split("?")[0];
  if (!objectPath) return;

  await client.storage.from(BUCKET).remove([decodeURIComponent(objectPath)]);
}

export async function deleteCandidatePhotoFile(photoUrl: string | null) {
  await deleteStorageUrl(photoUrl);
}

export async function deletePhaseAudioFile(audioUrl: string | null) {
  await deleteStorageUrl(audioUrl);
}
