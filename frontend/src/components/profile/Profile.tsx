// @ts-nocheck

import Avatar from "../ui/Avatar";
import GenericButton from "../ui/GenericButton";
import Chip from "../ui/Chip";
import Card from "../ui/Card";
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { ChevronLeft, Calendar, Link as LinkIcon, MapPin } from "lucide-react";
import { clsx } from "../../utils";
import UserChip from "../ui/UserChip";
import type { Post, Reel, User } from "../../types";
import PostComponent from "../feed/Post";
import { apiEndpoint } from "../../config";

export default function Profile(props: {
   meId: string;
   posts: Post[];
   setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
   followMap: { [id: string]: Set<string> };
   followToggle: (uid: string) => void;
   reels: Reel[];
   openProfile: (uid: string) => void;
   onBack: () => void;
}) {
   const { userId } = useParams<{ userId: string }>();
   const { meId, posts, followMap, followToggle, reels, openProfile, onBack } = props;
   const [user, setUser] = useState<User | null>(null);
   const [loading, setLoading] = useState(true);
   const [view, setView] = useState<
      "posts" | "reels" | "reposts" | "likedPosts" | "likedReels" | "savedPosts" | "savedReels"
   >("posts");

   const isMe = userId === meId;

   useEffect(() => {
      // Fetch user profile data
      async function fetchUserProfile() {
         try {
            setLoading(true);

            // If no userId is provided in the URL, show the logged-in user's profile
            const profileUserId = userId || meId;

            if (!profileUserId) {
               setUser(null);
               setLoading(false);
               return;
            }

            // Fetch the user profile using the public endpoint
            const res = await fetch(apiEndpoint(`/api/users/${profileUserId}`));
            const data = await res.json();

            if (data.user) {
               setUser({
                  id: data.user.id,
                  githubId: data.user.id,
                  name: data.user.name,
                  handle: data.user.handle || data.user.name,
                  avatar: data.user.avatar
               });
            } else {
               setUser(null);
            }
         } catch (error) {
            console.error('Failed to fetch user profile:', error);
            setUser(null);
         } finally {
            setLoading(false);
         }
      }

      fetchUserProfile();
   }, [userId, meId]);

   if (loading) {
      return (
         <div className="profile">
            <Card className="profile__header">
               <div className="p-6 text-center text-sub dark:text-sub-dark">
                  Loading profile...
               </div>
            </Card>
         </div>
      );
   }

   if (!user) {
      return (
         <div className="profile">
            <Chip onClick={onBack}>
               <ChevronLeft size={16} /> Back
            </Chip>
            <Card className="profile__header">
               <div className="p-6 text-center text-sub dark:text-sub-dark">
                  User not found
               </div>
            </Card>
         </div>
      );
   }

   const profileUserId = userId || meId;
   const userPosts = posts.filter(p => p.authorId === profileUserId);

   const originalPosts = userPosts.filter(p => !p.originalId);
   const repostsList = userPosts.filter(p => p.originalId);
   const userReels = reels.filter(r => r.authorId === profileUserId);
   const likedPosts = posts.filter(p => p.liked);
   const savedPosts = posts.filter(p => p.bookmarked);
   const likedReels = reels.filter(r => r.liked);
   const savedReels = reels.filter(r => r.saved);

   // Format join date
   const joinDate = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

   return (
      <div className="profile max-w-2xl mx-auto px-4 sm:px-0">
         {/* Profile Header Card */}
         <Card className="profile__header">
            {/* Cover Photo Area */}
            <div className="h-24 sm:h-32 bg-gradient-to-r from-accent to-accent-dark"></div>

            {/* Profile Info */}
            <div className="px-4 sm:px-6 pb-4 sm:pb-6">
               {/* Avatar positioned over cover */}
               <div className="flex justify-between items-start -mt-12 sm:-mt-16 mb-3 sm:mb-4">
                  <Avatar
                     src={user.avatar}
                     alt={user.name}
                     className="w-24 h-24 sm:w-32 sm:h-32 border-4 border-white dark:border-gray-800 object-cover rounded-full shadow-lg"
                  />
                  {!isMe && (
                     <GenericButton
                        className={clsx(
                           "mt-12 sm:mt-16 inline-flex gap-2 items-center justify-center h-9 sm:h-10 px-4 sm:px-6 rounded-full text-sm sm:text-base font-semibold cursor-pointer transition-all",
                           (followMap[meId] || new Set()).has(user.id)
                              ? "bg-accent hover:bg-accent-dark text-white"
                              : "bg-transparent text-accent dark:text-accent-dark border-2 border-accent dark:border-accent-dark hover:bg-accent hover:text-white"
                        )}
                        onClick={() => followToggle(user.id)}
                     >
                        {(followMap[meId] || new Set()).has(user.id) ? "Following" : "Follow"}
                     </GenericButton>
                  )}
               </div>

               {/* Name and Handle */}
               <div className="mb-3 sm:mb-4">
                  <h1 className="text-xl sm:text-2xl font-bold text-text dark:text-text-dark mb-1">
                     {user.name}
                  </h1>
                  <p className="text-sub dark:text-sub-dark text-sm sm:text-base">
                     @{user.handle}
                  </p>
               </div>

               {/* Bio Section */}
               <div className="mb-3 sm:mb-4 text-text dark:text-text-dark">
                  <p className="text-sm sm:text-base leading-relaxed">
                     Welcome to my profile! 👋
                  </p>
               </div>

               {/* Additional Info */}
               <div className="flex flex-wrap gap-3 sm:gap-4 sm:mb-4 text-sub dark:text-sub-dark text-xs sm:text-sm">
                  <div className="flex items-center gap-1">
                     <Calendar size={14} className="sm:w-4 sm:h-4" />
                     <span>Joined {joinDate}</span>
                  </div>
               </div>
            </div>
         </Card>

         {/* Navigation Tabs */}
         <div className="flex items-center gap-2 overflow-x-auto mt-4 mb-4 pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <div className="bg-muted dark:bg-muted-dark border-1 border-border dark:border-border-dark rounded-full w-full text-center">
               <Chip active={view === "posts"} onClick={() => setView("posts")}>
                  Posts ({originalPosts.length})
               </Chip>
               <Chip active={view === "reels"} onClick={() => setView("reels")}>
                  Reels ({userReels.length})
               </Chip>
               {/* <Chip active={view === "reposts"} onClick={() => setView("reposts")}>
                  Reposts ({repostsList.length})
               </Chip> */}
               {isMe && (
                  <>
                     <Chip active={view === "likedPosts"} onClick={() => setView("likedPosts")}>
                        Liked Posts
                     </Chip>
                     <Chip active={view === "likedReels"} onClick={() => setView("likedReels")}>
                        Liked Reels
                     </Chip>
                     {/* <Chip active={view === "savedPosts"} onClick={() => setView("savedPosts")}>
                        Saved Posts
                     </Chip>
                     <Chip active={view === "savedReels"} onClick={() => setView("savedReels")}>
                        Saved Reels
                     </Chip> */}
                  </>
               )}
            </div>
         </div>

         {/* Content Area */}
         <div className="grid gap-3 sm:gap-4">
            {view === "posts" && originalPosts.length === 0 && (
               <Card>
                  <div className="p-6 sm:p-8 text-center text-sub dark:text-sub-dark text-sm sm:text-base">
                     No posts yet
                  </div>
               </Card>
            )}

            {view === "posts" &&
               originalPosts.map(p => (
                  <PostComponent
                     key={p.id}
                     post={p}
                     meId={meId}
                     posts={posts}
                     setPosts={props.setPosts}
                     openProfile={openProfile}
                     addComment={() => { }}
                     deletePost={() => { }}
                     editPost={() => { }}
                     toggleLike={() => { }}
                     toggleRepost={() => { }}
                     user={user}
                  />
               ))}

            {view === "reels" && userReels.length === 0 && (
               <Card>
                  <div className="p-6 sm:p-8 text-center text-sub dark:text-sub-dark text-sm sm:text-base">
                     No reels yet
                  </div>
               </Card>
            )}

            {view === "reels" && userReels.length > 0 && (
               <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {userReels.map(r => (
                     <a
                        key={r.id}
                        href={`/reel/${r.id}`}
                        className="relative aspect-[9/16] rounded-lg overflow-hidden bg-muted dark:bg-muted-dark hover:opacity-90 transition-opacity cursor-pointer"
                     >
                        <video
                           src={r.src + "/raw"}
                           className="absolute inset-0 w-full h-full object-cover"
                           preload="metadata"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50" />
                        <div className="absolute bottom-2 left-2 right-2">
                           <p className="text-white text-xs font-medium truncate">{r.title}</p>
                        </div>
                     </a>
                  ))}
               </div>
            )}

            {view === "reposts" && repostsList.length === 0 && (
               <Card>
                  <div className="p-6 sm:p-8 text-center text-sub dark:text-sub-dark text-sm sm:text-base">
                     No reposts yet
                  </div>
               </Card>
            )}

            {view === "reposts" &&
               repostsList.map(p => (
                  <PostComponent
                     key={p.id}
                     post={p}
                     meId={meId}
                     posts={posts}
                     setPosts={props.setPosts}
                     openProfile={openProfile}
                     addComment={() => { }}
                     deletePost={() => { }}
                     editPost={() => { }}
                     toggleLike={() => { }}
                     toggleRepost={() => { }}
                     user={user}
                  />
               ))}

            {view === "likedPosts" && likedPosts.length === 0 && (
               <Card>
                  <div className="p-6 sm:p-8 text-center text-sub dark:text-sub-dark text-sm sm:text-base">
                     No liked posts yet
                  </div>
               </Card>
            )}

            {view === "likedPosts" &&
               likedPosts.map(p => (
                  <PostComponent
                     key={p.id}
                     post={p}
                     meId={meId}
                     posts={posts}
                     setPosts={props.setPosts}
                     openProfile={openProfile}
                     addComment={() => { }}
                     deletePost={() => { }}
                     editPost={() => { }}
                     toggleLike={() => { }}
                     toggleRepost={() => { }}
                     user={user}
                  />
               ))}

            {view === "savedPosts" && savedPosts.length === 0 && (
               <Card>
                  <div className="p-6 sm:p-8 text-center text-sub dark:text-sub-dark text-sm sm:text-base">
                     No saved posts yet
                  </div>
               </Card>
            )}

            {view === "savedPosts" &&
               savedPosts.map(p => (
                  <PostComponent
                     key={p.id}
                     post={p}
                     meId={meId}
                     posts={posts}
                     setPosts={props.setPosts}
                     openProfile={openProfile}
                     addComment={() => { }}
                     deletePost={() => { }}
                     editPost={() => { }}
                     toggleLike={() => { }}
                     toggleRepost={() => { }}
                     user={user}
                  />
               ))}

            {view === "likedReels" && likedReels.length === 0 && (
               <Card>
                  <div className="p-6 sm:p-8 text-center text-sub dark:text-sub-dark text-sm sm:text-base">
                     No liked reels yet
                  </div>
               </Card>
            )}

            {view === "likedReels" &&
               likedReels.map(r => {
                  return (
                     <Card key={r.id}>
                        <div className="p-3 sm:p-4">
                           <div className="flex items-center gap-2 sm:gap-3">
                              <Avatar src={user.avatar} alt={user.name} />
                              <div className="min-w-0 flex-1">
                                 <div className="font-bold text-text dark:text-text-dark text-sm sm:text-base truncate">{user.name}</div>
                                 <div className="text-xs sm:text-sm text-sub dark:text-sub-dark truncate">{r.title}</div>
                              </div>
                           </div>
                        </div>
                     </Card>
                  );
               })}

            {view === "savedReels" && savedReels.length === 0 && (
               <Card>
                  <div className="p-6 sm:p-8 text-center text-sub dark:text-sub-dark text-sm sm:text-base">
                     No saved reels yet
                  </div>
               </Card>
            )}

            {view === "savedReels" &&
               savedReels.map(r => {
                  return (
                     <Card key={r.id}>
                        <div className="p-3 sm:p-4">
                           <div className="flex items-center gap-2 sm:gap-3">
                              <Avatar src={user.avatar} alt={user.name} />
                              <div className="min-w-0 flex-1">
                                 <div className="font-bold text-text dark:text-text-dark text-sm sm:text-base truncate">{user.name}</div>
                                 <div className="text-xs sm:text-sm text-sub dark:text-sub-dark truncate">{r.title}</div>
                              </div>
                           </div>
                        </div>
                     </Card>
                  );
               })}
         </div>
      </div>
   );
}
