// Supabase Storage via REST (sem SDK). Usa a service_role key — SÓ no back-end.
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const BUCKET = process.env.SUPABASE_BUCKET || "clinicaos-files";

function assertConfig() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error("Supabase Storage não configurado (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
  }
}

// Sobe um arquivo para o bucket. path = caminho relativo (ex: "clinicId/patientId/uuid-nome.pdf")
export async function uploadFile(path: string, bytes: ArrayBuffer, contentType: string): Promise<string> {
  assertConfig();
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": contentType || "application/octet-stream",
      "x-upsert": "true",
    },
    body: Buffer.from(bytes),
  });
  if (!res.ok) throw new Error(`Falha no upload (${res.status}): ${await res.text()}`);
  return path;
}

// Gera uma URL assinada temporária para download (bucket é privado).
export async function getSignedUrl(path: string, expiresIn = 3600): Promise<string> {
  assertConfig();
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${BUCKET}/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn }),
  });
  if (!res.ok) throw new Error(`Falha ao assinar URL (${res.status})`);
  const j = await res.json();
  return `${SUPABASE_URL}/storage/v1${j.signedURL}`;
}

export async function deleteFile(path: string): Promise<boolean> {
  assertConfig();
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${SERVICE_KEY}` },
  });
  return res.ok;
}
