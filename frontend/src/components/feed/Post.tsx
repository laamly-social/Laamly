// @ts-nocheck

import Card from "../ui/Card";
import UserChip from "../ui/UserChip";
import IconBtn from "../ui/IconBtn";
import GenericButton from "../ui/GenericButton";
import Carousel from "../ui/Carousel";
import InputField from "../ui/InputField";
import Avatar from "../ui/Avatar";
import { Heart, Repeat, Share2, Bookmark, BookmarkCheck, Trash2, MessageSquare } from "lucide-react";
import { formatTime } from "../../utils";
import type { Post as PostType, User } from "../../types";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { div } from "framer-motion/client";
import CommentsList from "./CommentsList";

interface PostProps {
   post: PostType;
   meId: string;
   posts: PostType[];
   setPosts: React.Dispatch<React.SetStateAction<PostType[]>>;
   openProfile: (uid: string) => void;
   addComment: (postId: string, body: string) => void;
   deletePost: (id: string) => void;
   user: User | null;
   /*

 const res = await fetch("/posts/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          content: {
           id: id
          }
        })
      });
   */
   toggleLike: (id: string) => void;
   toggleRepost: (id: string) => void;
}

/** Treat common video extensions as video */
function isVideo(url?: string): boolean {
   if (!url) return false;
   return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url);
}

function mediaUrlsFrom(post: any): string[] {
   if (!post) return [];
   if (Array.isArray(post.urls) && post.urls.length) return post.urls as string[];
   if (post.image) return [post.image as string];
   return [];
}

// ...existing code...

export default function Post({
   post: p,
   meId,
   posts,
   setPosts,
   openProfile,
   addComment,
   deletePost,
   toggleLike,
   toggleRepost,
   user,
}: PostProps) {

   const original = p.originalId ? posts.find(x => x.id === p.originalId) : undefined;
   const isRepost = !!original;

   const source = original ?? p;

   const postText = p.content || (isRepost ? original?.content || "" : "");

   // YouTube embed logic moved here so postText is in scope
   const hasYoutubeLinks = postText.match(/(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/(watch\?v=)?[A-Za-z0-9_-]{11}/g);
   const videoImbeds = hasYoutubeLinks ? (
      <div className="mb-3">
         {hasYoutubeLinks.map((link: string, index: number) => {
            // Extract video ID from various YouTube URL formats
            let videoId = "";
            const ytMatch = link.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
            if (ytMatch && ytMatch[1]) {
               videoId = ytMatch[1];
            }

            if (!videoId) return null;

            return (
               <div key={index} className="mb-3 aspect-w-16 aspect-h-9">
                  <iframe
                     className="w-full mx-auto min-h-[20rem] rounded-lg"
                     src={`https://www.youtube.com/embed/${videoId}`}
                     title="YouTube video player"
                     frameBorder="0"
                     allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                     allowFullScreen
                  ></iframe>
               </div>
            );
         })}
      </div>
   ) : null;

   // Prefer the current post's media; fallback to original (for reposts)

   const media = useMemo(() => {
      const here = mediaUrlsFrom(p);
      return here.length ? here : mediaUrlsFrom(source);
   }, [p, source]);
   const toShow = media;

   // State for toggling comments
   const [showComments, setShowComments] = useState(true);

   return (
      <motion.div key={p.id} id={"id-" + p._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
         <Card className="post">
            <div className="p-3 border-b border-border dark:border-border-dark flex items-center gap-2.5 justify-between">
               <div>
                  <UserChip
                     avatar={p.authorInfo.avatar}
                     handle={p.authorInfo.handle}
                     fullName={p.authorInfo.name}
                     onClickName={() => openProfile(p.authorHandle)} />

                  {isRepost && original && (
                     <div className="mt-1.5 ml-11 text-sub dark:text-sub-dark text-xs">
                        reposted from{" "}
                        <button
                           className="bg-none border-none cursor-pointer p-0 text-linklike dark:text-linklike-dark hover:text-white hover:underline"
                           onClick={() => openProfile(original.authorId)}
                        >
                           {USERS.find(u => u.id === original.authorId)?.name ?? original.authorId}
                        </button>
                     </div>
                  )}
               </div>

               <div className="flex items-center gap-2">
                  <span className="text-sm text-sub dark:text-sub-dark">{timeBetween(p.createdAt) + " ago"}</span>
                  {/* <IconBtn
              icon={p.bookmarked ? BookmarkCheck : Bookmark}
              label="Bookmark"
              active={!!p.bookmarked}
              onClick={() => setPosts(prev => prev.map(x => (x.id === p.id ? { ...x, bookmarked: !x.bookmarked } : x)))}
            /> */}
                  {p.authorInfo.isCurrentUser && (
                     <IconBtn icon={Trash2} className="hover:bg-red-600 hover:text-white hover:!text-red-600" danger label="Delete" onClick={() => deletePost(p._id)} />
                  )}
               </div>
            </div>

            <div className="p-3">
               {postText && <p className="text-lg whitespace-pre-wrap mb-3">{postText}</p>}
               {videoImbeds}

               <Carousel urls={toShow} />

               <div className="inline-flex items-center gap-1 rounded-full flex-wrap bg-muted dark:bg-muted-dark border border-border dark:border-border-dark mb-3">
                  <IconBtn
                     icon={Heart}
                     label="Like"
                     count={source.likes}
                     onClick={() => toggleLike(source._id!)}
                     active={!!source.liked}
                  />
                  <IconBtn
                     icon={MessageSquare}
                     label="Comments"
                     count={source.comments.length}
                     onClick={() => setShowComments(v => !v)}
                  />
               </div>

               {user && showComments && <CommentsList post={source} onAdd={addComment} />}
            </div>
         </Card>
      </motion.div>
   );
}
