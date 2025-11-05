// @ts-nocheck
import type { Post } from "../types";
import { apiEndpoint } from "../config";

// Initialize Pica for image resizing
const pica = (window as any).pica?.();

/** Helper function to convert file to base64 */
function convertFileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string); // This will be the Base64 data URL
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsDataURL(file); // Read the file as a data URL
  });
}

/** Resize image with Pica for high-quality results */
async function resizeImageWithPica(fileOrBlob: File | Blob, maxSize: number): Promise<Blob> {
    const img = document.createElement('img');
    const url = URL.createObjectURL(fileOrBlob);

    await new Promise(resolve => {
        img.onload = () => {
            URL.revokeObjectURL(url); // Clean up the object URL
            resolve(null);
        };
        img.src = url;
    });

    // Calculate new dimensions while maintaining aspect ratio
    let width = img.width;
    let height = img.height;

    if (width > height) {
        if (width > maxSize) {
            height = height * (maxSize / width);
            width = maxSize;
        }
    } else {
        if (height > maxSize) {
            width = width * (maxSize / height);
            height = maxSize;
        }
    }

    // Create a canvas for Pica to output to
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = width;
    outputCanvas.height = height;

    // Use Pica for high-quality resizing
    const resizedCanvas = await pica.resize(img, outputCanvas);

    // Convert the resulting canvas back to a Blob
    return pica.toBlob(resizedCanvas, fileOrBlob.type, 0.9); // 0.9 is JPEG quality
}

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

/** Fetch a single post by ID */
export async function fetchPostById(id: string): Promise<Post | null> {
   const res = await fetch(apiEndpoint(`/posts/${id}`), { credentials: "include" });
   if (!res.ok) return null;

   const data = await res.json();
   return data?.post || null;
}

/** Process images: resize and convert to base64 (for AI analysis only) */
export async function processImagesToBase64(files: File[]): Promise<string[]> {
   const MAX_SIZE = 224; // Smaller size to reduce payload (was 336)
   const base64Array: string[] = [];

   for (const file of files) {
      try {
         // Only process images, skip videos
         if (file.type.startsWith('image/')) {
            const resizedFile = await resizeImageWithPica(file, MAX_SIZE);
            const base64String = await convertFileToBase64(resizedFile);
            base64Array.push(base64String);
         }
         // Videos are skipped - they won't be sent to AI model
      } catch (error) {
         console.error('Error processing file:', error);
      }
   }

   return base64Array;
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
            const finalUrl = raw.replace("http://", "https://pictshare.hnasheralneam.dev");
            urls.push(finalUrl);
         } else {
            console.error("Upload failed:", result);
         }
      } catch (e) {
         console.error("Upload error:", e);
      }
   }
   return urls;
}

/** Create a post on the backend – accepts image URLs or base64 images array */
export async function createPost(payload: { content: string; urls?: string[]; imageUrls?: string[]; base64Images?: string[]; meId: string }) {
   const res = await fetch(CREATE_POST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
         content: payload.content,
         urls: payload.urls || [],              // All media URLs stored in Mongo
         imageUrls: payload.imageUrls || [],    // Image URLs for backend to fetch and analyze
         base64Images: payload.base64Images || [], // Base64 images array (legacy)
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

/** Edit a post by ID on the backend */
export async function editPost(postId: string, content: string): Promise<{ message: string; postId: string; content: string }> {
   const res = await fetch(apiEndpoint("/posts/edit"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
         id: postId,
         content: content
      })
   });
   const ct = res.headers.get("content-type") || "";
   const data = ct.includes("application/json") ? await res.json() : { message: await res.text() };
   if (!res.ok) throw new Error((data as any)?.message || `Edit failed: ${res.status}`);
   return data;
}

/** Regenerate AI tags for a post */
export async function regenerateTags(postId: string): Promise<{ message: string; tags: string[]; isHalal: boolean }> {
   const res = await fetch(apiEndpoint("/posts/regenerate-tags"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ postId })
   });
   const ct = res.headers.get("content-type") || "";
   const data = ct.includes("application/json") ? await res.json() : { message: await res.text() };
   if (!res.ok) throw new Error((data as any)?.message || `Regenerate tags failed: ${res.status}`);
   return data;
}

/** Remove a tag from a post */
export async function removeTag(postId: string, tag: string): Promise<{ message: string; tags: string[] }> {
   const res = await fetch(apiEndpoint("/posts/remove-tag"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ postId, tag })
   });
   const ct = res.headers.get("content-type") || "";
   const data = ct.includes("application/json") ? await res.json() : { message: await res.text() };
   if (!res.ok) throw new Error((data as any)?.message || `Remove tag failed: ${res.status}`);
   return data;
}
