// src/components/feed/Post.tsx
// @ts-nocheck

import Card from "../ui/Card";
import UserChip from "../ui/UserChip";
import IconBtn from "../ui/IconBtn";
import GenericButton from "../ui/GenericButton";
import Carousel from "../ui/Carousel";
import InputField from "../ui/InputField";
import Avatar from "../ui/Avatar";
import StyledButton from "../ui/StyleButton";
import {
   Heart,
   Repeat,
   Share2,
   Bookmark,
   BookmarkCheck,
   Trash2,
   MessageSquare,
   Edit2,
   Check,
   X,
   RefreshCw,
   Eye
} from "lucide-react";
import { motion } from "framer-motion";
import { useMemo, useState, useEffect } from "react";
import CommentsList from "./CommentsList";
import type { Post as PostType, User } from "../../types";
import { regenerateTags, removeTag, trackPostView } from "../../utils/posts";
import { apiEndpoint } from "../../config";

// ---- Helpers ----
function isVideo(url?: string): boolean {
   if (!url) return false;
   return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url);
}

function mediaUrlsFrom(post: any): string[] {
   if (!post) return [];
   if (Array.isArray(post.urls) && post.urls.length)
      return post.urls as string[];
   if (post.image) return [post.image as string];
   return [];
}

function timeAgo(ts: number | string | Date): string {
   const t = typeof ts === "number" ? ts : new Date(ts as any).getTime();
   const s = Math.max(1, Math.floor((Date.now() - t) / 1000));
   const m = Math.floor(s / 60);
   const h = Math.floor(m / 60);
   const d = Math.floor(h / 24);
   if (d > 0) return `${d}d`;
   if (h > 0) return `${h}h`;
   if (m > 0) return `${m}m`;
   return `${s}s`;
}

interface PostProps {
   post: PostType;
   meId: string;
   posts: PostType[];
   setPosts: React.Dispatch<React.SetStateAction<PostType[]>>;
   openProfile: (uid: string) => void;
   addComment: (postId: string, body: string) => void;
   deletePost: (id: string) => void;
   editPost: (id: string, content: string) => void;
   user: User | null;
   toggleLike: (id: string) => void;
   toggleRepost: (id: string) => void;
}

export default function Post({
   post: p,
   meId,
   posts,
   setPosts,
   openProfile,
   addComment,
   deletePost,
   editPost,
   toggleLike,
   toggleRepost,
   user
}: PostProps) {
   // Safeguard: if post becomes invalid, don't crash
   if (!p || !p._id) {
      return null;
   }

   const original = p.originalId
      ? posts.find((x) => x.id === p.originalId)
      : undefined;
   const isRepost = !!original;
   const source = original ?? p;

   const postText = p.content || (isRepost ? original?.content || "" : "");

   // Author info
   const authorId = p.author || p.authorId || p.authorHandle || ""; // uuid as canonical author identifier
   const authorName = p.authorInfo?.name || p.authorInfo?.handle || "Unknown";
   const authorHandle = p.authorInfo?.handle || "unknown";
   const authorAvatar = p.authorInfo?.avatar || "";
   const isCurrentUser = authorId === meId;
   const isLoggedIn = !!meId;

   const createdAt = p.createdAt || Date.now();

   // UI state
   const [showComments, setShowComments] = useState(true);
   const [isEditing, setIsEditing] = useState(false);
   const [editedContent, setEditedContent] = useState(postText);
   const [showCopied, setShowCopied] = useState(false);
   const [isRegeneratingTags, setIsRegeneratingTags] = useState(false);
   const [localTags, setLocalTags] = useState(source.tags || []);
   const [viewCount, setViewCount] = useState(source.views || 0);

   // Follow state for this author
   const [isFollowingAuthor, setIsFollowingAuthor] = useState<boolean>(
      !!p.authorInfo?.isFollowing
   );
   const [followLoading, setFollowLoading] = useState(false);

   // Track view on mount
   useEffect(() => {
      if (source._id) {
         trackPostView(source._id).then((result) => {
            setViewCount(result.views);
         });
      }
   }, [source._id]);

   // Fetch follow state from backend so feed + profile stay in sync
   useEffect(() => {
      let cancelled = false;

      async function loadFollowState() {
         try {
            if (!isLoggedIn) return;
            if (!authorId || authorId === meId) return;

            const res = await fetch(apiEndpoint(`/api/users/${authorId}`), {
               credentials: "include"
            });
            if (!res.ok) return;

            const data = await res.json().catch(() => null);
            if (!data || !data.user || cancelled) return;

            if (typeof data.user.isFollowing === "boolean") {
               setIsFollowingAuthor(data.user.isFollowing);
            }
         } catch (err) {
            console.error("Failed to load follow state for post author:", err);
         }
      }

      loadFollowState();

      return () => {
         cancelled = true;
      };
   }, [authorId, isLoggedIn, meId]);

   const handleToggleFollowAuthor = async () => {
      if (!authorId || authorId === meId || followLoading) return;

      if (!isLoggedIn) {
         alert("Please log in to follow users.");
         return;
      }

      const prevIsFollowing = isFollowingAuthor;

      try {
         setFollowLoading(true);
         // optimistic
         const nextIsFollowing = !prevIsFollowing;
         setIsFollowingAuthor(nextIsFollowing);

         const res = await fetch(apiEndpoint(`/api/users/${authorId}/follow`), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include"
         });

         const data = await res.json().catch(() => ({}) as any);

         if (!res.ok) {
            setIsFollowingAuthor(prevIsFollowing);
            const msg =
               data?.message ||
               (res.status === 401
                  ? "You need to be logged in to follow users."
                  : "Failed to update follow status.");
            alert(msg);
         } else {
            if (typeof data.isFollowing === "boolean") {
               setIsFollowingAuthor(data.isFollowing);
            }
         }

         // Also push updated follow state into all posts by this author in local feed
         setPosts((prev) =>
            prev.map((post) => {
               const postAuthorId =
                  post.author || post.authorId || post.authorHandle || "";
               if (postAuthorId !== authorId) return post;
               return {
                  ...post,
                  authorInfo: {
                     ...(post.authorInfo || {}),
                     isFollowing: !prevIsFollowing
                  }
               };
            })
         );
      } catch (err) {
         console.error("Failed to toggle follow:", err);
         setIsFollowingAuthor(prevIsFollowing);
         alert("Failed to update follow status. Please try again.");
      } finally {
         setFollowLoading(false);
      }
   };

   const handleSaveEdit = () => {
      if (editedContent.trim() !== postText) {
         editPost(p._id, editedContent.trim());
         setPosts((prev) =>
            prev.map((post) =>
               post._id === p._id
                  ? { ...post, content: editedContent.trim() }
                  : post
            )
         );
      }
      setIsEditing(false);
   };

   const handleCancelEdit = () => {
      setEditedContent(postText);
      setIsEditing(false);
   };

   const handleShare = () => {
      const url = `${window.location.origin}/post/${p._id}`;
      navigator.clipboard
         .writeText(url)
         .then(() => {
            setShowCopied(true);
            setTimeout(() => setShowCopied(false), 2000);
         })
         .catch((err) => {
            console.error("Failed to copy:", err);
            alert("Failed to copy link");
         });
   };

   const handleRegenerateTags = async () => {
      setIsRegeneratingTags(true);
      try {
         const result = await regenerateTags(source._id);
         setLocalTags(result.tags);
         setPosts((prev) =>
            prev.map((post) =>
               post._id === source._id
                  ? { ...post, tags: result.tags, isHalal: result.isHalal }
                  : post
            )
         );
      } catch (err) {
         console.error("Failed to regenerate tags:", err);
         alert("Failed to regenerate tags. Please try again.");
      } finally {
         setIsRegeneratingTags(false);
      }
   };

   const handleRemoveTag = async (tag: string) => {
      try {
         const result = await removeTag(source._id, tag);
         setLocalTags(result.tags);
         setPosts((prev) =>
            prev.map((post) =>
               post._id === source._id ? { ...post, tags: result.tags } : post
            )
         );
      } catch (err) {
         console.error("Failed to remove tag:", err);
         alert("Failed to remove tag. Please try again.");
      }
   };

   // YouTube embeds
   const hasYoutubeLinks = postText.match(
      /(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/(watch\?v=)?[A-Za-z0-9_-]{11}/g
   );
   const videoImbeds = hasYoutubeLinks ? (
      <div className="mb-3">
         {hasYoutubeLinks.map((link: string, index: number) => {
            let videoId = "";
            const ytMatch = link.match(
               /(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/
            );
            if (ytMatch?.[1]) videoId = ytMatch[1];
            if (!videoId) return null;
            return (
               <div key={index} className="mb-3 aspect-w-16 aspect-h-9">
                  <iframe
                     className="w-full mx-auto min-h-[20rem] rounded-lg"
                     src={`https://www.youtube.com/embed/${videoId}`}
                     title="YouTube video player"
                     frameBorder="0"
                     allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                     allowFullScreen></iframe>
               </div>
            );
         })}
      </div>
   ) : null;

   // Prefer current post's media, fallback to original for reposts
   const media = useMemo(() => {
      const here = mediaUrlsFrom(p);
      return here.length ? here : mediaUrlsFrom(source);
   }, [p, source]);

   return (
      <motion.div
         id={"id-" + p._id}
         initial={{ opacity: 0, y: 8 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ duration: 0.2 }}>
         <Card className="post">
            <div className="p-3 border-b border-border dark:border-border-dark flex items-center gap-2.5 justify-between">
               <div className="flex gap-2">
                  <div>
                     <UserChip
                        avatar={p.authorInfo.avatar}
                        handle={p.authorInfo.handle}
                        fullName={p.authorInfo.name}
                        onClickName={() => openProfile(p.authorId)}
                     />
                  </div>

                  {isLoggedIn && !isCurrentUser && (
                     <div className="flex items-center mx-2">
                        <StyledButton
                           label={isFollowingAuthor ? "Following" : "Follow"}
                           variant={isFollowingAuthor ? "secondary" : "primary"}
                           onClick={handleToggleFollowAuthor}
                           disabled={followLoading}
                        />
                     </div>
                  )}
               </div>

               <div className="flex items-center gap-2">
                  <span className="text-sm text-sub dark:text-sub-dark">
                     {timeAgo(createdAt)} ago
                  </span>

                  {!isEditing && isCurrentUser && (
                     <div className="inline-flex items-center rounded-full flex-wrap bg-muted dark:bg-muted-dark border border-border dark:border-border-dark">
                        <IconBtn
                           icon={RefreshCw}
                           label={
                              localTags.length > 0
                                 ? "Regenerate Tags"
                                 : "Generate Tags"
                           }
                           onClick={handleRegenerateTags}
                           disabled={isRegeneratingTags}
                           className={isRegeneratingTags ? "animate-spin" : ""}
                           title={
                              localTags.length > 0
                                 ? "Regenerate AI-generated tags"
                                 : "Generate AI tags"
                           }
                        />
                        <IconBtn
                           icon={Edit2}
                           label="Edit"
                           onClick={() => setIsEditing(true)}
                           title="Edit post text"
                        />
                        <IconBtn
                           icon={Trash2}
                           className="hover:bg-red-600"
                           danger
                           label="Delete"
                           onClick={() => {
                              if (
                                 confirm(
                                    "Are you sure you want to delete this post?"
                                 )
                              ) {
                                 deletePost(p._id);
                              }
                           }}
                           title="Delete post"
                        />
                     </div>
                  )}

                  {isEditing && isCurrentUser && (
                     <div className="inline-flex items-center rounded-full flex-wrap bg-muted dark:bg-muted-dark border border-border dark:border-border-dark">
                        <IconBtn
                           icon={Check}
                           label="Save"
                           onClick={handleSaveEdit}
                        />
                        <IconBtn
                           icon={X}
                           label="Cancel"
                           onClick={handleCancelEdit}
                        />
                     </div>
                  )}
               </div>
            </div>

            {/* Body */}
            <div className="p-3">
               {isEditing ? (
                  <textarea
                     className="w-full text-lg p-2 rounded border border-border dark:border-border-dark bg-bg dark:bg-bg-dark text-fg dark:text-fg-dark mb-3"
                     value={editedContent}
                     onChange={(e) => setEditedContent(e.target.value)}
                     rows={Math.max(3, editedContent.split("\n").length)}
                     autoFocus
                  />
               ) : (
                  postText && (
                     <p className="text-lg whitespace-pre-wrap mb-3">
                        {postText}
                     </p>
                  )
               )}

               {/* AI-generated tags */}
               {localTags && localTags.length > 0 && (
                  <div className="max-w-[650px]">
                     <div className="relative mb-3 max-w-[90vw]">
                        <div className="flex gap-2 overflow-x-auto scrollbar-hide max-w-full">
                           {localTags.map((tag, idx) => (
                              <span
                                 key={idx}
                                 className="inline-flex items-center gap-0.5 px-2.5 py-1 text-xs font-medium rounded-full bg-muted dark:bg-muted-dark text-sub dark:text-sub-dark border border-border dark:border-border-dark whitespace-nowrap">
                                 #{tag}
                                 {isCurrentUser && (
                                    <button
                                       onClick={() => handleRemoveTag(tag)}
                                       className="ml-1 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                       aria-label={`Remove tag ${tag}`}>
                                       <X size={12} />
                                    </button>
                                 )}
                              </span>
                           ))}
                        </div>
                        <div className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none bg-gradient-to-l from-panel dark:from-panel-dark to-transparent"></div>
                     </div>
                  </div>
               )}

               {videoImbeds}

               <Carousel urls={media} />

               {/* Actions */}
               <div className="inline-flex items-center rounded-full flex-wrap bg-muted dark:bg-muted-dark border border-border dark:border-border-dark mb-3 px-1">
                  <IconBtn
                     icon={Heart}
                     label="Like"
                     count={Number(source.likes) || 0}
                     onClick={() => toggleLike(source._id!)}
                     active={!!source.liked}
                  />
                  <IconBtn
                     icon={MessageSquare}
                     label="Comments"
                     count={source?.comments?.length ?? 0}
                     onClick={() => setShowComments((v) => !v)}
                  />
                  <IconBtn
                     icon={Eye}
                     label="Views"
                     count={viewCount}
                     disabled
                  />
                  <div className="relative">
                     <IconBtn
                        icon={Share2}
                        label="Share"
                        onClick={handleShare}
                     />
                     {showCopied && (
                        <div className="absolute -top-9 left-1/2 -translate-x-1/2 rounded-full bg-border dark:bg-border-dark border border-muted dark:border-muted-dark whitespace-nowrap py-1 px-3 z-10">
                           Link copied!
                        </div>
                     )}
                  </div>
               </div>

               {showComments && (
                  <CommentsList
                     post={source}
                     user={user}
                     onAdd={addComment}
                     openProfile={openProfile}
                  />
               )}
            </div>
         </Card>
      </motion.div>
   );
}
