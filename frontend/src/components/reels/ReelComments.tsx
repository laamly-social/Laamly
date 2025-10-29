// src/components/reels/ReelComments.tsx
// @ts-nocheck
import { useState } from "react";
import { createReelComment } from "../../utils/reels";
import InputField from "../ui/InputField";
import GenericButton from "../ui/GenericButton";
import UserChip from "../ui/UserChip";

export default function ReelComments({ reel, user, onAdd }: { reel: any; user: Any; onAdd?: (reelId: string, body: string) => void }) {
  const [draft, setDraft] = useState("");
  const [comments, setComments] = useState(() => {
    return (reel.comments || []).map((c: any) => ({
      ...c,
      text: c.content || c.text,
      ts: c.datePosted || c.ts,
    }));
  });

  const addComment = async () => {
    if (!draft.trim()) return;
    const text = draft.trim();
    try {
      const data = await createReelComment(reel.id, text);
      if (data.currentUser) {
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
          }
        };
        setComments(prev => [...prev, newComment]);
        setDraft("");
        onAdd?.(reel.id, text);
      } else {
        console.error("Failed to add comment:", data.message || "Unknown error");
      }
    } catch (err) {
      console.error("Error adding comment:", err);
    }
  };

  return (
    <div className="grid gap-2.5">
      <div className="bg-muted dark:bg-muted-dark rounded-xl border border-border dark:border-border-dark">
        {comments.length === 0 ? (
          <div className="px-6 py-4 text-sm opacity-70">Be the first to comment.</div>
        ) : comments.map((c: any, idx: number) => {
          const u = c.authorInfo;
          const isLast = idx === comments.length - 1;
          if (u?.deleted) return <div key={c._id || idx} />;
          return (
            <div key={c._id || idx} className="flex gap-2">
              <div className={`comment ${isLast ? "" : "border-b"} border-border dark:border-border-dark flex-1 px-6 py-4`}>
                <div className="flex justify-between text-text dark:text-text-dark text-xs mb-1">
                  <UserChip
                    avatar={u?.avatar}
                    handle={u?.handle ?? c.author}
                    fullName={u?.name ?? c.author}
                  />
                  <span className="opacity-[.75]">
                    {timeBetween(new Date(c.ts)) + " ago"}
                  </span>
                </div>
                <div className="mt-1 ml-13 mb-1 whitespace-pre-wrap">{c.text}</div>
              </div>
            </div>
          );
        })}
      </div>

      {user && (<div className="flex gap-2">
        <InputField
          id={`rcbox-${reel.id}`}
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
      </div>)}
    </div>
  );
}
