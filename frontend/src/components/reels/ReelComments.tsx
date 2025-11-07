// src/components/reels/ReelComments.tsx
// @ts-nocheck
import { useState } from "react";
import { createReelComment, editReelComment, deleteReelComment, likeReelComment } from "../../utils/reels";
import InputField from "../ui/InputField";
import GenericButton from "../ui/GenericButton";
import Comment from "../feed/Comment";

export default function ReelComments({ reel, user, onAdd }: { reel: any; user: any; onAdd?: (reelId: string, body: string) => void }) {
  const [draft, setDraft] = useState("");
  const [comments, setComments] = useState(() => {
    return (reel.comments || []).map((c: any) => ({
      ...c,
      text: c.content || c.text,
      ts: c.datePosted || c.ts,
      likedBy: c.likedBy || [],
    }));
  });

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

  const handleEditComment = async (commentId: string, text: string) => {
    try {
      await editReelComment(reel.id, commentId, text);
      setComments(prev =>
        prev.map(c =>
          c._id === commentId ? { ...c, text, content: text } : c
        )
      );
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

  const handleLikeComment = async (commentId: string) => {
    try {
      const data = await likeReelComment(reel.id, commentId);
      setComments(prev =>
        prev.map(c =>
          c._id === commentId
            ? {
                ...c,
                likedBy: data.isLiked
                  ? [...(c.likedBy || []), user?.uuid || ""]
                  : (c.likedBy || []).filter((id: string) => id !== user?.uuid),
              }
            : c
        )
      );
    } catch (err) {
      console.error("Error liking comment:", err);
    }
  };

  return (
    <div className="grid gap-2.5">
      <div className="bg-muted dark:bg-muted-dark rounded-xl border border-border dark:border-border-dark">
        {comments.length === 0 ? (
          <div className="px-6 py-4 text-sm opacity-70">Be the first to comment.</div>
        ) : comments.map((c: any, idx: number) => {
          const isLast = idx === comments.length - 1;

          return (
            <Comment
              key={c._id || idx}
              comment={c}
              user={user}
              isLast={isLast}
              onEdit={handleEditComment}
              onDelete={handleDeleteComment}
              onLike={handleLikeComment}
            />
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
