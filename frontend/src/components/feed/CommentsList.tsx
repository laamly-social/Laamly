// src/components/feed/CommentsList.tsx
// @ts-nocheck
import { useState } from "react";
import { createComment } from "../../utils/comments";
import InputField from "../ui/InputField";
import GenericButton from "../ui/GenericButton";
import UserChip from "../ui/UserChip";
import type { Post as PostType, User } from "../../types";

// local helper to avoid missing import
function timeBetween(ts: number | Date) {
  const t = typeof ts === "number" ? ts : ts.getTime();
  const s = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

interface Props {
  post: PostType;
  user: User | null;
  onAdd?: (postId: string, body: string) => void;
  showList?: boolean;
}

export default function CommentsList({ post, user, onAdd, showList = true }: Props) {
  const [draft, setDraft] = useState("");
  const [comments, setComments] = useState(() =>
    (post.comments || []).map((c: any) => ({
      ...c,
      text: c.content ?? c.text ?? "",
      ts: c.datePosted ? new Date(c.datePosted).getTime() : (typeof c.ts === "number" ? c.ts : Date.now()),
    }))
  );

  const addComment = async () => {
    const text = draft.trim();
    if (!text) return;

    try {
      const data = await createComment(post._id!, text);
      if (data?.currentUser) {
        const newComment = {
          _id: `temp_${Date.now()}`,
          author: data.currentUser.id,
          content: text,
          text,
          datePosted: new Date().toISOString(),
          ts: Date.now(),
          stats: {},
          authorInfo: {
            handle: data.currentUser.handle,
            name: data.currentUser.name,
            avatar: data.currentUser.avatar,
            isCurrentUser: true,
          },
        };
        setComments(prev => [...prev, newComment]);
        setDraft("");
        onAdd?.(post._id!, text);
      } else {
        console.error("Failed to add comment:", data?.message || "Unknown error");
      }
    } catch (err) {
      console.error("Error adding comment:", err);
    }
  };

  return (
    <>
      <div className="grid gap-2.5">
        {showList && comments.length > 0 && (
          <div className="bg-muted dark:bg-muted-dark rounded-xl border border-border dark:border-border-dark">
            {comments.map((c, idx) => {
              const u = (c as any).authorInfo;
              if (u?.deleted) return <div key={c._id || idx} />;
              const isLast = idx === comments.length - 1;
              return (
                <div key={c._id || idx} className="flex gap-2">
                  <div className={`comment ${isLast ? "" : "border-b"} border-border dark:border-border-dark flex-1 px-6 py-4`}>
                    <div className="flex justify-between text-text dark:text-text-dark text-xs mb-1">
                      <div>
                        <UserChip
                          avatar={u?.avatar || ""}
                          handle={u?.handle ?? c.author}
                          fullName={u?.name ?? c.author}
                        />
                      </div>
                      <span className="opacity-[.75]">
                        {timeBetween(c.ts)} ago
                      </span>
                    </div>
                    <div className="mt-1 ml-13 mb-1 whitespace-pre-wrap">{c.text}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <CreateComment
          user={user}
          postId={post._id}
          draft={draft}
          setDraft={setDraft}
          addComment={addComment}
          onAdd={(body) => onAdd?.(post._id!, body)}
        />
      </div>
    </>
  );
}

function CreateComment({
  user,
  postId,
  draft,
  setDraft,
  addComment,
  onAdd,
}: {
  user: User | null;
  postId: string;
  draft: string;
  setDraft: (v: string) => void;
  addComment: () => void;
  onAdd?: (body: string) => void;
}) {
  if (!user) return null;

  return (
    <div className="flex gap-2">
      <InputField
        id={`cbox-${postId}`}
        className="input bg-muted dark:bg-muted-dark"
        placeholder="Write a comment…"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter") {
            e.preventDefault();
            addComment();
          }
        }}
      />
      <GenericButton
        className="inline-flex gap-2 items-center justify-center h-9 px-3 bg-accent text-white cursor-pointer disabled:bg-muted disabled:dark:bg-muted-dark disabled:text-sub dark:disabled:text-sub-dark"
        disabled={!draft.trim()}
        onClick={addComment}
      >
        Post
      </GenericButton>
    </div>
  );
}
