// src/utils/reels.ts
import { apiEndpoint } from "../config";

const UPLOAD_API = "https://pictshare.hnasheralneam.dev/api/upload.php";

export async function uploadReelVideo(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("upload_code", "5219dd95-5672-44ca-8423-970afa123633");

  const r = await fetch(UPLOAD_API, { method: "POST", body: form });
  const ct = r.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await r.json() : { status: "error", reason: await r.text() };

  if ((data as any).status !== "ok") throw new Error((data as any).reason || "Upload failed");
  const raw = (data as any).url as string;
  return raw.replace("http://", "https://pictshare.hnasheralneam.dev");
}

export async function createReel(payload: { title?: string; description?: string; src: string }) {
  const res = await fetch(apiEndpoint("/reels/create"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Failed to create reel");
  return data; // { message, reelId }
}

export async function fetchAllReels() {
  const res = await fetch(apiEndpoint("/reels/get-all"), { credentials: "include" });
  if (!res.ok) return [];
  const data = await res.json();
  const list = data?.reels ?? [];
  return list.map((r: any) => ({
    id: String(r._id),
    authorId: String(r.author),
    title: r.title || "",
    description: r.description || "",
    src: r.src,
    createdAt: r.createdAt || new Date(r.datePosted).getTime(),
    liked: !!r.liked,
    saved: !!r.saved,
    likes: Number(r.likes || 0),
    authorInfo: r.authorInfo || undefined,

    // ✅ NEW: include comments (already decorated by backend)
    comments: Array.isArray(r.comments) ? r.comments.map((c: any) => ({
      ...c,
      text: c.content || c.text,
      ts: c.datePosted ? new Date(c.datePosted).getTime() : c.ts
    })) : []
  }));
}


export async function toggleReelLike(id: string) {
  const res = await fetch(apiEndpoint("/reels/toggle-like"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ id }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Failed");
  return data as { liked: boolean; likes: number };
}

export async function toggleReelSave(id: string) {
  const res = await fetch(apiEndpoint("/reels/toggle-save"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ id }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Failed");
  return data as { saved: boolean };
}

export async function deleteReel(id: string) {
  const res = await fetch(apiEndpoint("/reels/delete"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ id }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Failed");
  return data;
}

export async function createReelComment(reelId: string, text: string) {
  const res = await fetch(apiEndpoint("/reels/comments/create"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ reelId, text }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Failed to add comment");
  return data as { message: string; currentUser?: { id: string; handle: string; name: string; avatar: string } };
}

