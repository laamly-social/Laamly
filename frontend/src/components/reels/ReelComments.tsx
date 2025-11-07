// src/components/reels/ReelComments.tsx
// @ts-nocheck
import { useState } from "react";
import { createReelComment, editReelComment, deleteReelComment } from "../../utils/reels";
import InputField from "../ui/InputField";
import GenericButton from "../ui/GenericButton";
import IconBtn from "../ui/IconBtn";
import UserChip from "../ui/UserChip";
import { Edit2, Trash2, Check, X } from "lucide-react";

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

export default function ReelComments({ reel, user, onAdd }: { reel: any; user: any; onAdd?: (reelId: string, body: string) => void }) {
  const [draft, setDraft] = useState("");
  const [comments, setComments] = useState(() => {
    return (reel.comments || []).map((c: any) => ({
      ...c,
      text: c.content || c.text,
      ts: c.datePosted || c.ts,
    }));
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  // Safeguard: if reel becomes invalid, don't crash
  if (!reel || !reel.id) {
    return null;
  }

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

  const handleEditComment = async (commentId: string) => {
    const text = editText.trim();
    if (!text) return;

    try {
      await editReelComment(reel.id, commentId, text);
      setComments(prev =>
        prev.map(c =>
          c._id === commentId ? { ...c, text, content: text } : c
        )
      );
      setEditingId(null);
      setEditText("");
    } catch (err) {
      console.error("Error editing comment:", err);
      alert("Failed to edit comment. Please try again.");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;

    try {
      await deleteReelComment(reel.id, commentId);
      setComments(prev => prev.filter(c => c._id !== commentId));
    } catch (err) {
      console.error("Error deleting comment:", err);
      alert("Failed to delete comment. Please try again.");
    }
  };

  const startEditing = (comment: any) => {
    setEditingId(comment._id);
    setEditText(comment.text);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditText("");
  };

  return (
    <div className="grid gap-2.5">
      <div className="bg-muted dark:bg-muted-dark rounded-xl border border-border dark:border-border-dark">
        {comments.length === 0 ? (
          <div className="px-6 py-4 text-sm opacity-70">Be the first to comment.</div>
        ) : comments.map((c: any, idx: number) => {
          const u = c.authorInfo;
          const isLast = idx === comments.length - 1;
          const isEditing = editingId === c._id;
          const isCurrentUser = u?.isCurrentUser;
          if (u?.deleted) return <div key={c._id || idx} />;

          return (
            <div key={c._id || idx} className="flex gap-2">
              <div className={`comment ${isLast ? "" : "border-b"} border-border dark:border-border-dark flex-1 px-6 py-4`}>
                <div className="flex justify-between items-start text-text dark:text-text-dark text-xs mb-1">
                  <UserChip
                    avatar={u?.avatar}
                    handle={u?.handle ?? c.author}
                    fullName={u?.name ?? c.author}
                  />
                  <div className="flex items-center gap-2">
                    <span className="opacity-[.75]">
                      {timeBetween(new Date(c.ts))} ago
                    </span>
                    {isCurrentUser && !isEditing && (
                      <div className="flex gap-1">
                        <IconBtn
                          icon={Edit2}
                          label="Edit"
                          onClick={() => startEditing(c)}
                          title="Edit comment"
                        />
                        <IconBtn
                          icon={Trash2}
                          className="hover:bg-red-600"
                          danger
                          label="Delete"
                          onClick={() => handleDeleteComment(c._id)}
                          title="Delete comment"
                        />
                      </div>
                    )}
                  </div>
                </div>
                
                {isEditing ? (
                  <div className="mt-2 ml-13">
                    <InputField
                      className="input bg-background dark:bg-background-dark mb-2"
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleEditComment(c._id);
                        } else if (e.key === "Escape") {
                          cancelEditing();
                        }
                      }}
                    />
                    <div className="flex gap-1">
                      <IconBtn
                        icon={Check}
                        label="Save"
                        onClick={() => handleEditComment(c._id)}
                      />
                      <IconBtn
                        icon={X}
                        label="Cancel"
                        onClick={cancelEditing}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="mt-1 ml-13 mb-1 whitespace-pre-wrap">{c.text}</div>
                )}
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
