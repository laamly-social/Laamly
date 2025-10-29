// @ts-nocheck

import Card from "../ui/Card";
import GenericButton from "../ui/GenericButton";
import { clsx } from "../../utils";
import type { Post, User } from "../../types";
import "../../index.css";
import PostComponent from "./Post";
import CreatePost from "./CreatePost";
import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useMemo, useState } from "react";
import { fetchAllPosts, deletePost as deletePostApi, togglePostLike, editPost as editPostApi } from "../../utils/posts";

export default function HomeFeed({
   meId,
   posts,
   setPosts,
   followMap,
   followToggle,
   openProfile,
   user,
}: {
   meId: string;
   posts: Post[];
   setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
   followMap: { [id: string]: Set<string> };
   followToggle: (uid: string) => void;
   openProfile: (uid: string) => void;
   user: User | null;
}) {
   const [sort, setSort] = useState<"latest" | "top">("latest");
   const [lightbox, setLightbox] = useState<string | null>(null);

   // Initial fetch
   useEffect(() => { (async () => setPosts(await fetchAllPosts()))(); }, [setPosts]);
   const onPosted = async () => setPosts(await fetchAllPosts());

   const toggleLike = async (postId: string) => {
      try {
         const { liked, likes } = await togglePostLike(postId);
         setPosts(prev =>
            prev.map(p => p._id === postId ? { ...p, liked, likes } : p)
         );
      } catch (error) {
         console.error("Failed to toggle like:", error);
      }
   };

   const toggleRepost = (originalId: string) => {
      setPosts(prevPosts => {
         const targetPost = prevPosts.find(x => x.id === originalId);
         const baseId = targetPost && targetPost.originalId ? targetPost.originalId : originalId;
         const original = prevPosts.find(x => x.id === baseId);
         if (!original) return prevPosts;

         const existingRepost = prevPosts.find(p => p.originalId === baseId && p.authorId === meId);
         if (existingRepost) {
            return prevPosts
               .filter(p => p.id !== existingRepost.id)
               .map(p => (p.id === baseId ? { ...p, reposts: Math.max(0, p.reposts - 1), repostedByMe: false } : p));
         } else {
            const repost: Post = {
               id: `rp_${Date.now()}`,
               authorId: meId,
               text: "",
               image: original.image,
               likes: 0,
               reposts: 0,
               createdAt: Date.now(),
               comments: [],
               originalId: baseId,
            };
            return prevPosts
               .map(p => (p.id === baseId ? { ...p, reposts: p.reposts + 1, repostedByMe: true } : p))
               .concat(repost);
         }
      });
   };

   const addComment = (postId: string, body: string) => {
      if (!body.trim()) return;
      setPosts(prev =>
         prev.map(p =>
            p._id === postId
               ? { ...p, comments: [...p.comments, { id: `c_${Date.now()}`, userId: meId, text: body.trim(), ts: Date.now() }] }
               : p
         )
      );
   };

   const deletePost = async (id: string) => {
      try {
         await deletePostApi(id);
         setPosts(prev => prev.filter(p => p.id !== id));
      } catch (e) {
         alert("Failed to delete post: " + (e instanceof Error ? e.message : e));
      }
   };

   const editPost = async (id: string, content: string) => {
      try {
         await editPostApi(id, content);
         // The local state is already updated in Post component
      } catch (e) {
         alert("Failed to edit post: " + (e instanceof Error ? e.message : e));
         // Revert changes by refetching
         setPosts(await fetchAllPosts());
      }
   };

   const sortedPosts = useMemo(() => {
      return [...posts].sort((a, b) =>
         sort === "latest"
            ? b.createdAt - a.createdAt
            : b.likes + b.reposts + b.comments.length - (a.likes + a.reposts + a.comments.length)
      );
   }, [posts, sort]);

   return (
      // Center the two-column feed and give the main column a comfortable, stable width
      <div
         className="w-full mx-auto grid gap-6 px-2 md:px-4"
         style={{
            gridTemplateColumns: "1fr",
            maxWidth: "100%"
         }}
      >
         <div className="col col--main max-w-[680px] mx-auto w-full">
            {user && <CreatePost meId={meId} openProfile={openProfile} onPosted={onPosted} />}

            <div className="grid">
               {sortedPosts.map(p => (
                  <PostComponent
                     key={p._id}
                     post={p}
                     meId={meId}
                     posts={posts}
                     setPosts={setPosts}
                     openProfile={openProfile}
                     addComment={addComment}
                     deletePost={deletePost}
                     editPost={editPost}
                     toggleLike={toggleLike}
                     toggleRepost={toggleRepost}
                     user={user}
                  />
               ))}
            </div>
         </div>

         {/* Hide trends sidebar on mobile - only show on larger screens if needed */}
         {/* <aside className="col sticky t-20 h-fit hidden lg:block">
        <Trends />
      </aside> */}

         <AnimatePresence>
            {lightbox && (
               <motion.div
                  className="lightbox"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setLightbox(null)}
               >
                  <img src={lightbox} alt="preview" />
               </motion.div>
            )}
         </AnimatePresence>
      </div>
   );
}

function Trends() {
   const TRENDS = [
      { tag: "sharia", posts: 18200 },
      { tag: "dawah", posts: 55100 },
      { tag: "ai", posts: 98000 },
   ];
   return (
      <Card>
         <div className="p-3 border-b border-border dark:border-border-dark flex items-center gap-2.5">Trends</div>
         <div className="p-3 grid gap-2.5">
            {TRENDS.map(t => (
               <div key={t.tag} className="py-1.5 border-t first:border-t-0 border-border dark:border-border-dark">
                  <div className="trend__tag">#{t.tag}</div>
                  <div className="text-sub dark:text-sub-dark text-xs">{t.posts.toLocaleString()} posts</div>
               </div>
            ))}
         </div>
      </Card>
   );
}
