// Shared upload utility for all features
const UPLOAD_API = "https://pictshare.hnasheralneam.dev/api/upload.php";

/**
 * Upload files (images, videos, documents) to PictShare and return absolute URLs (https)
 */
export async function uploadFiles(files: File[]): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_code", "5219dd95-5672-44ca-8423-970afa123633");

    try {
      console.log(`Uploading file: ${file.name} (${file.size} bytes)`);
      const r = await fetch(UPLOAD_API, { method: "POST", body: formData });
      console.log(`Upload response status: ${r.status}`);
      
      const ct = r.headers.get("content-type") || "";
      const result = ct.includes("application/json")
        ? await r.json()
        : { status: "error", reason: await r.text() };

      console.log("Upload result:", result);

      if ((result as any).status === "ok") {
        const raw = (result as any).url as string;
        // Normalize to https absolute URL so files can be loaded directly
        const finalUrl = raw.replace("http://", "https://pictshare.hnasheralneam.dev");
        console.log("Final URL:", finalUrl);
        urls.push(finalUrl);
      } else {
        console.error("Upload failed:", result);
        throw new Error(result.reason || "Upload failed");
      }
    } catch (e) {
      console.error("Upload error:", e);
      throw e; // Re-throw the error instead of silently catching it
    }
  }
  return urls;
}

/**
 * Get the file type from URL extension
 */
export function getFileType(url: string): 'image' | 'video' | 'file' {
  const ext = url.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
  if (['mp4', 'webm', 'ogg', 'mov'].includes(ext)) return 'video';
  return 'file';
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
