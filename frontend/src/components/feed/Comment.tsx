// src/components/feed/Comment.tsx
// @ts-nocheck
import { useState } from "react";
import InputField from "../ui/InputField";
import IconBtn from "../ui/IconBtn";
import UserChip from "../ui/UserChip";
import { Edit2, Trash2, Check, X, Heart } from "lucide-react";



interface CommentProps {
   comment: any;
   user: any;
   isLast: boolean;
   onEdit: (commentId: string, text: string) => void;
   onDelete: (commentId: string) => void;
   onLike: (commentId: string) => void;
   openProfile?: (uid: string) => void;
}

export default function Comment({
   comment: c,
   user,
   isLast,
   onEdit,
   onDelete,
   onLike,
   openProfile,
}: CommentProps) {
   const [editingId, setEditingId] = useState<string | null>(null);
   const [editText, setEditText] = useState("");

   const u = c.authorInfo;
   if (u?.deleted) return <div />;

   const isEditing = editingId === c._id;
   const isCurrentUser = u?.isCurrentUser;

   const startEditing = () => {
      setEditingId(c._id);
      setEditText(c.text);
   };

   const cancelEditing = () => {
      setEditingId(null);
      setEditText("");
   };

   const handleEditComment = () => {
      const text = editText.trim();
      if (!text) return;
      onEdit(c._id, text);
      setEditingId(null);
      setEditText("");
   };

   return (
      <div className="flex gap-2">
         <div className={`comment ${isLast ? "" : "border-b"} border-border dark:border-border-dark flex-1 px-6 py-4`}>
            <div className="flex justify-between items-start text-text dark:text-text-dark text-xs mb-1">
               <div>
                  <UserChip
                     avatar={u?.avatar || ""}
                     handle={u?.handle ?? c.author}
                     fullName={u?.name ?? c.author}
                     onClickName={openProfile ? () => openProfile(c.author) : undefined}
                  />
               </div>
               <div className="flex items-center gap-2">
                  <span className="opacity-[.75]">
                     {timeBetween(c.ts)} ago
                  </span>
                  {!isEditing && (

                     <div className="inline-flex items-center rounded-full flex-wrap bg-bg dark:bg-bg-dark border border-border dark:border-border-dark">
                        <IconBtn
                           icon={Heart}
                           label="Like"
                           onClick={() => onLike(c._id)}
                           count={(c.likedBy || []).length > 0 ? (c.likedBy || []).length : undefined}
                           active={!!(c.likedBy || []).includes(user?.uuid || "")}
                        />
                        {isCurrentUser && (<>
                           <span className="mx-1 h-3 border-l border-border dark:border-border-dark inline-block align-middle" />

                           <IconBtn
                              icon={Edit2}
                              label="Edit"
                              onClick={startEditing}
                              title="Edit comment"
                           />
                           <IconBtn
                              icon={Trash2}
                              className="hover:bg-red-600"
                              danger
                              label="Delete"
                              onClick={() => onDelete(c._id)}
                              title="Delete comment"
                           /></>)}

                     </div>
                  )}
                  {isEditing && (
                     <div className="inline-flex items-center rounded-full flex-wrap bg-bg dark:bg-bg-dark border border-border dark:border-border-dark">
                           <IconBtn
                              icon={Check}
                              label="Save"
                              onClick={handleEditComment}
                           />
                           <IconBtn
                              icon={X}
                              label="Cancel"
                              onClick={cancelEditing}
                           />
                        </div>

                     )
                  }
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
                           handleEditComment();
                        } else if (e.key === "Escape") {
                           cancelEditing();
                        }
                     }}
                  />
               </div>
            ) : (
               <div className="mt-1 ml-13 mb-1 whitespace-pre-wrap">{c.text}</div>
            )}
         </div>
      </div>
   );
}
