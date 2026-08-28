import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const GATEWAY = "https://connector-gateway.lovable.dev/google_drive";
const FOLDER_NAME = "Files Manager";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function driveHeaders() {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const connKey = Deno.env.get("GOOGLE_DRIVE_API_KEY");
  if (!lovableKey || !connKey) return null;
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": connKey,
  };
}

async function driveFetch(path: string, init: RequestInit, headers: Record<string, string>) {
  const res = await fetch(`${GATEWAY}${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers as Record<string, string> | undefined) },
  });
  if (!res.ok) {
    const details = await res.text();
    console.error(`Drive request failed [${res.status}] ${path}: ${details}`);
    throw new Error(`[${res.status}]: ${details}`);
  }
  return res.json();
}

async function ensureFolder(headers: Record<string, string>): Promise<string> {
  const q = encodeURIComponent(
    `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
  );
  const found = await driveFetch(`/drive/v3/files?q=${q}&fields=files(id,name)`, { method: "GET" }, headers);
  if (found?.files?.length) return found.files[0].id;

  const created = await driveFetch(
    "/drive/v3/files?fields=id",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: FOLDER_NAME, mimeType: "application/vnd.google-apps.folder" }),
    },
    headers,
  );
  return created.id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Not authenticated" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "Not authenticated" }, 401);

    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    const fileId = body?.fileId;
    if (typeof fileId !== "string" || !fileId) return json({ error: "fileId is required" }, 400);
    if (action !== "upload" && action !== "set_share") {
      return json({ error: "Invalid action" }, 400);
    }

    // RLS on public.files restricts this to the owner (or an admin).
    const { data: file, error: fileError } = await supabase
      .from("files")
      .select("id,name,type,url,drive_file_id,drive_shared,drive_share_link")
      .eq("id", fileId)
      .maybeSingle();

    if (fileError) return json({ error: fileError.message }, 400);
    if (!file) return json({ error: "File not found or access denied" }, 404);

    const headers = driveHeaders();
    if (!headers) {
      return json(
        { error: "Google Drive is not connected yet. Ask the app owner to link a Google Drive connection." },
        503,
      );
    }

    if (action === "upload") {
      if (file.drive_file_id) {
        return json({ driveFileId: file.drive_file_id, driveLink: file.drive_share_link, alreadyUploaded: true });
      }
      if (!file.url) return json({ error: "This item has no downloadable file" }, 400);

      const sourceRes = await fetch(file.url);
      if (!sourceRes.ok) return json({ error: "Could not download the source file" }, 400);
      const blob = await sourceRes.blob();
      const mime = sourceRes.headers.get("content-type") || "application/octet-stream";

      const folderId = await ensureFolder(headers);

      const form = new FormData();
      form.append(
        "metadata",
        new Blob([JSON.stringify({ name: file.name, parents: [folderId] })], { type: "application/json" }),
      );
      form.append("file", new Blob([await blob.arrayBuffer()], { type: mime }), file.name);

      const uploadRes = await fetch(
        `${GATEWAY}/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink`,
        { method: "POST", headers, body: form },
      );
      if (!uploadRes.ok) {
        const details = await uploadRes.text();
        console.error(`Drive upload failed [${uploadRes.status}]: ${details}`);
        return json({ error: "Drive upload failed", status: uploadRes.status, details }, uploadRes.status);
      }
      const uploaded = await uploadRes.json();

      await supabase
        .from("files")
        .update({ drive_file_id: uploaded.id, drive_share_link: uploaded.webViewLink })
        .eq("id", file.id);

      return json({ driveFileId: uploaded.id, driveLink: uploaded.webViewLink });
    }

    // set_share
    const enabled = body?.enabled === true;
    if (!file.drive_file_id) return json({ error: "Upload this file to Drive first" }, 400);

    if (enabled) {
      await driveFetch(
        `/drive/v3/files/${file.drive_file_id}/permissions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "reader", type: "anyone" }),
        },
        headers,
      );
    } else {
      const perms = await driveFetch(
        `/drive/v3/files/${file.drive_file_id}/permissions?fields=permissions(id,type)`,
        { method: "GET" },
        headers,
      );
      for (const p of perms?.permissions ?? []) {
        if (p.type === "anyone") {
          await fetch(`${GATEWAY}/drive/v3/files/${file.drive_file_id}/permissions/${p.id}`, {
            method: "DELETE",
            headers,
          });
        }
      }
    }

    const meta = await driveFetch(
      `/drive/v3/files/${file.drive_file_id}?fields=id,webViewLink`,
      { method: "GET" },
      headers,
    );

    await supabase
      .from("files")
      .update({ drive_shared: enabled, drive_share_link: meta.webViewLink })
      .eq("id", file.id);

    return json({ shared: enabled, driveLink: enabled ? meta.webViewLink : null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error("drive-sync error:", message);
    return json({ error: message }, 500);
  }
});
