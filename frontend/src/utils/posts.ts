// @ts-nocheck
import type { Post } from "../types";
import { apiEndpoint } from "../config";

/** Delete a post by ID on the backend */
export async function deletePost(id: string): Promise<{ message: string }> {
   const res = await fetch(apiEndpoint("/posts/delete"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
         content: { id }
      })
   });
   const ct = res.headers.get("content-type") || "";
   const data = ct.includes("application/json") ? await res.json() : { message: await res.text() };
   if (!res.ok) throw new Error((data as any)?.message || `Delete failed: ${res.status}`);
   else document.querySelector(`#id-${id}`)?.remove();
   return data;
}
// src/utils/posts.ts

type BackendPost = {
   _id: string;
   content: string;
   author: string;      // githubId
   urls?: string[];     // image/video links ONLY
   datePosted: string;  // ISO
   authorHandle?: string;
   authorImage?: any;
   authorId?: string;
   authorInfo?: { handle?: string; profile?: any };
   text?: string;
};

const UPLOAD_API = "https://pictshare.hnasheralneam.dev/api/upload.php";
const CREATE_POST_URL = apiEndpoint("/posts/create");
const GET_ALL_URL = apiEndpoint("/posts/get-all");

/** Fetch posts and KEEP the full urls[] array for multi-media posts */
export async function fetchAllPosts(): Promise<Post[]> {
   const res = await fetch(GET_ALL_URL, { credentials: "include" });
   if (!res.ok) return [];

   const data = await res.json();
   const list: BackendPost[] = data?.posts ?? [];

   return list
      .sort((a, b) => new Date(b.datePosted).getTime() - new Date(a.datePosted).getTime())
      .map<Post>((p) => {
         return { ...p };
      });
}

/** Upload images/videos to PictShare and return absolute URLs (https) */
export async function uploadImages(files: File[]): Promise<string[]> {
   const urls: string[] = [];
   for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_code", "5219dd95-5672-44ca-8423-970afa123633");

      try {
         const r = await fetch(UPLOAD_API, { method: "POST", body: formData });
         const ct = r.headers.get("content-type") || "";
         const result = ct.includes("application/json")
            ? await r.json()
            : { status: "error", reason: await r.text() };

         if ((result as any).status === "ok") {
            const raw = (result as any).url as string;
            // Normalize to https absolute URL so <video>/<img> can load it directly
            urls.push(raw.replace("http://", "https://pictshare.hnasheralneam.dev"));
         } else {
            console.error("Upload failed:", result);
         }
      } catch (e) {
         console.error("Upload error:", e);
      }
   }
   return urls;
}

/** Create a post on the backend – Mongo stores only the links in urls[] */
export async function createPost(payload: { content: string; urls: string[]; meId: string }) {
   const res = await fetch(CREATE_POST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
         content: payload.content,
         urls: payload.urls,              // ONLY links stored in Mongo
         datePosted: new Date().toISOString(),
         authorId: payload.meId,          // not used server-side now, kept for parity
      }),
   });

   const ct = res.headers.get("content-type") || "";
   const data = ct.includes("application/json") ? await res.json() : { message: await res.text() };
   if (!res.ok) throw new Error((data as any)?.message || `Request failed: ${res.status}`);
   return data; // { message, postId }
}

/** Toggle like on a post */
export async function togglePostLike(postId: string): Promise<{ liked: boolean; likes: number }> {
  const res = await fetch(apiEndpoint("/posts/toggle-like"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ postId }),
  });

  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await res.json() : { message: await res.text() };
  
  if (!res.ok) throw new Error((data as any)?.message || `Failed to toggle like: ${res.status}`);
  return data;
}
