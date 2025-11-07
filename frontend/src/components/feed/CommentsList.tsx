// src/components/feed/CommentsList.tsx
// @ts-nocheck
import { useState } from "react";
import { createComment, editComment, deleteComment, likeComment } from "../../utils/comments";
import InputField from "../ui/InputField";
import GenericButton from "../ui/GenericButton";
import Comment from "./Comment";
import type { Post as PostType, User } from "../../types";

interface Props {
   post: PostType;
   user: User | null;
   onAdd?: (postId: string, body: string) => void;
   showList?: boolean;
   openProfile?: (uid: string) => void;
}

export default function CommentsList({ post, user, onAdd, showList = true, openProfile }: Props) {
   const [draft, setDraft] = useState("");
   const [comments, setComments] = useState(() =>
      (post.comments || []).map((c: any) => ({
         ...c,
         text: c.content ?? c.text ?? "",
         ts: c.datePosted ? new Date(c.datePosted).getTime() : (typeof c.ts === "number" ? c.ts : Date.now()),
         likedBy: c.likedBy || [],
      }))
   );

   // Safeguard: if post becomes invalid, don't crash
   if (!post || !post._id) {
      return null;
   }

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

   const handleEditComment = async (commentId: string, text: string) => {
      try {
         await editComment(post._id!, commentId, text);
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
         await deleteComment(post._id!, commentId);
         setComments(prev => prev.filter(c => c._id !== commentId));
      } catch (err) {
         console.error("Error deleting comment:", err);
         alert("Failed to delete comment. Please try again.");
      }
   };

   const handleLikeComment = async (commentId: string) => {
      try {
         const data = await likeComment(post._id!, commentId);
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
      <>
         <div className="grid gap-2.5">
            {showList && comments.length > 0 && (
               <div className="bg-muted dark:bg-muted-dark rounded-xl border border-border dark:border-border-dark">
                  {comments.map((c, idx) => {
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
                           openProfile={openProfile}
                        />
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
