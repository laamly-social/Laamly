const CREATE_COMMENT_URL = "/posts/comments/create";
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
