// src/utils/posts.ts
import type { Post } from "../types";

type BackendPost = {
  _id: string;
  content: string;
  author: string;      // githubId
  urls: string[];      // image/video links ONLY
  datePosted: string;  // ISO
  authorHandle?: string;
  authorImage?: any;
  authorId?: string;
};

export async function fetchAllPosts(): Promise<Post[]> {
  const res = await fetch("/posts/get-all", { credentials: "include" });
  if (!res.ok) return [];
  const data = await res.json();
  const list: BackendPost[] = data?.posts ?? [];

  return list
    .sort((a, b) => new Date(b.datePosted).getTime() - new Date(a.datePosted).getTime())
    .map(p => ({
      id: p._id,
      authorId: p.author,            // still github id; UI falls back if unknown
      text: p.content || "",
      image: p.urls?.[0],
      likes: 0,
      reposts: 0,
      createdAt: new Date(p.datePosted).getTime(),
      comments: [],
    }));
}

export async function uploadImages(files: File[]): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_code", "5219dd95-5672-44ca-8423-970afa123633");
    try {
      const r = await fetch("https://pictshare.hnasheralneam.dev/api/upload.php", { method: "POST", body: formData });
      const ct = r.headers.get("content-type") || "";
      const result = ct.includes("application/json") ? await r.json() : { status: "error", reason: await r.text() };
      if ((result as any).status === "ok") {
        const raw = (result as any).url as string;
        urls.push(raw.replace("http://", "https://pictshare.hnasheralneam.dev"));
      }
    } catch {
      // swallow & continue
    }
  }
  return urls;
}

export async function createPost(payload: { content: string; urls: string[]; meId: string }) {
  const res = await fetch("/posts/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      content: payload.content,
      urls: payload.urls,           // ONLY links stored in Mongo
      datePosted: new Date().toISOString(),
      authorId: payload.meId,
    }),
  });
  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await res.json() : { message: await res.text() };
  if (!res.ok) throw new Error((data as any)?.message || `Request failed: ${res.status}`);
  return data; // { message, postId }
}
