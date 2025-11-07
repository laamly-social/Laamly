import { apiEndpoint } from "../config";

const UPLOAD_API = "https://pictshare.hnasheralneam.dev/api/upload.php";

export async function uploadReelVideo(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("upload_code", "5219dd95-5672-44ca-8423-970afa123633");

  const r = await fetch(UPLOAD_API, { method: "POST", body: form });
  const ct = r.headers.get("content-type") || "";
  const data = ct.includes("application/json")
    ? await r.json()
    : { status: "error", reason: await r.text() };

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
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.message || "Failed to create reel");
  return data as { message: string; reelId: string };
}

export async function fetchAllReels() {
  const res = await fetch(apiEndpoint("/reels/get-all"), { credentials: "include" });
  if (!res.ok) return [];
  const data = await res.json().catch(() => ({}));
  const list = (data as any)?.reels ?? [];
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
    views: Number(r.views || 0),
    authorInfo: r.authorInfo || undefined,
    comments: Array.isArray(r.comments)
      ? r.comments.map((c: any) => ({
          ...c,
          text: c.content || c.text,
          ts: c.datePosted ? new Date(c.datePosted).getTime() : c.ts,
        }))
      : [],
  }));
}

export async function fetchReelById(id: string) {
  const res = await fetch(apiEndpoint(`/reels/${id}`), { credentials: "include" });
  if (!res.ok) return null;
  const data = await res.json().catch(() => ({}));
  const r = (data as any)?.reel;
  if (!r) return null;
  return {
    id: String(r._id),
    authorId: String(r.author),
    title: r.title || "",
    description: r.description || "",
    src: r.src,
    createdAt: r.createdAt || new Date(r.datePosted).getTime(),
    liked: !!r.liked,
    saved: !!r.saved,
    likes: Number(r.likes || 0),
    views: Number(r.views || 0),
    authorInfo: r.authorInfo || undefined,
    comments: Array.isArray(r.comments)
      ? r.comments.map((c: any) => ({
          ...c,
          text: c.content || c.text,
          ts: c.datePosted ? new Date(c.datePosted).getTime() : c.ts,
        }))
      : [],
  };
}

export async function toggleReelLike(id: string) {
  const res = await fetch(apiEndpoint("/reels/toggle-like"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ id }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("toggleReelLike failed:", res.status, data);
    throw new Error((data as any)?.message || "Failed");
  }
  return data as { liked: boolean; likes: number };
}

export async function toggleReelSave(id: string) {
  const res = await fetch(apiEndpoint("/reels/toggle-save"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ id }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("toggleReelSave failed:", res.status, data);
    throw new Error((data as any)?.message || "Failed");
  }
  // server returns { saved, savedCount }
  return data as { saved: boolean; savedCount?: number };
}

export async function deleteReel(id: string) {
  const res = await fetch(apiEndpoint("/reels/delete"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ id }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.message || "Failed");
  return data as { message: string; id: string };
}

export async function createReelComment(reelId: string, text: string) {
  const res = await fetch(apiEndpoint("/reels/comments/create"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ reelId, text }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.message || "Failed to add comment");
  return data as {
    message: string;
    currentUser?: { id: string; handle: string; name: string; avatar: string };
  };
}

/** Track a reel view */
export async function trackReelView(id: string): Promise<{ views: number }> {
  try {
    const res = await fetch(apiEndpoint("/reels/track-view"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id }),
    });
    const data = await res.json().catch(() => ({ views: 0 }));
    if (!res.ok) {
      console.warn("trackReelView failed:", res.status, data);
      return { views: 0 };
    }
    return data;
  } catch (err) {
    console.warn("trackReelView error:", err);
    return { views: 0 };
  }
}
