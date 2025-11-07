import { apiEndpoint } from "../config";

const CREATE_COMMENT_URL = apiEndpoint("/posts/comments/create");
const EDIT_COMMENT_URL = apiEndpoint("/posts/comments/edit");
const DELETE_COMMENT_URL = apiEndpoint("/posts/comments/delete");
const LIKE_COMMENT_URL = apiEndpoint("/posts/comments/like");

export async function createComment(postId: string, text: string) {
  const res = await fetch(CREATE_COMMENT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      postId: postId,
      text: text,
      datePosted: new Date().toISOString(),
    }),
  });

  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await res.json() : { message: await res.text() };
  if (!res.ok) throw new Error((data as any)?.message || `Request failed: ${res.status}`);
  return data;
}

export async function editComment(postId: string, commentId: string, text: string) {
  const res = await fetch(EDIT_COMMENT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      postId: postId,
      commentId: commentId,
      text: text,
    }),
  });

  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await res.json() : { message: await res.text() };
  if (!res.ok) throw new Error((data as any)?.message || `Request failed: ${res.status}`);
  return data;
}

export async function deleteComment(postId: string, commentId: string) {
  const res = await fetch(DELETE_COMMENT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      postId: postId,
      commentId: commentId,
    }),
  });

  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await res.json() : { message: await res.text() };
  if (!res.ok) throw new Error((data as any)?.message || `Request failed: ${res.status}`);
  return data;
}

export async function likeComment(postId: string, commentId: string) {
  const res = await fetch(LIKE_COMMENT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      postId: postId,
      commentId: commentId,
    }),
  });

  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await res.json() : { message: await res.text() };
  if (!res.ok) throw new Error((data as any)?.message || `Request failed: ${res.status}`);
  return data;
}
