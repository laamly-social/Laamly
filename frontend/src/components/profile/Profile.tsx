// @ts-nocheck

import Avatar from "../ui/Avatar";
import GenericButton from "../ui/GenericButton";
import Chip from "../ui/Chip";
import Card from "../ui/Card";
import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { ChevronLeft, Calendar, Link as LinkIcon, MapPin, Pencil, Check, X, Upload } from "lucide-react";
import { clsx } from "../../utils";
import UserChip from "../ui/UserChip";
import type { Post, Reel, User } from "../../types";
import PostComponent from "../feed/Post";
import { apiEndpoint } from "../../config";
import { updateProfile } from "../../utils/me";
import { uploadFiles } from "../../utils/uploads";
import IconBtn from "../ui/IconBtn";

export default function Profile(props: {
   meId: string;
   posts: Post[];
   setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
   followMap: { [id: string]: Set<string> };
   followToggle: (uid: string) => void;
   reels: Reel[];
   openProfile: (uid: string) => void;
   onBack: () => void;
   deletePost?: (id: string) => void;
   editPost?: (id: string, content: string) => void;
   toggleLike?: (id: string) => void;
   addComment?: (postId: string, text: string) => void;
}) {
   const { userId } = useParams<{ userId: string }>();
   const { meId, posts, followMap, followToggle, reels, openProfile, onBack, deletePost, editPost, toggleLike, addComment } = props;
   const [user, setUser] = useState<User | null>(null);
   const [loading, setLoading] = useState(true);
   const [view, setView] = useState<
      "posts" | "reels" | "reposts" | "likedPosts" | "likedReels" | "savedPosts" | "savedReels"
   >("posts");

   // Edit states
   const [editingName, setEditingName] = useState(false);
   const [editingHandle, setEditingHandle] = useState(false);
   const [editingBio, setEditingBio] = useState(false);
   const [editingAvatar, setEditingAvatar] = useState(false);
   const [tempName, setTempName] = useState("");
   const [tempHandle, setTempHandle] = useState("");
   const [tempBio, setTempBio] = useState("");
   const [uploading, setUploading] = useState(false);
   const [error, setError] = useState("");
   const fileInputRef = useRef<HTMLInputElement>(null);

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
                  avatar: data.user.avatar,
                  bio: data.user.bio || "",
                  privilegeLevel: data.user.privilegeLevel || ""
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

   // Edit handlers
   const startEditName = () => {
      setTempName(user?.name || "");
      setEditingName(true);
      setError("");
   };

   const startEditHandle = () => {
      setTempHandle(user?.handle || "");
      setEditingHandle(true);
      setError("");
   };

   const startEditBio = () => {
      setTempBio(user?.bio || "");
      setEditingBio(true);
      setError("");
   };

   const cancelEdit = () => {
      setEditingName(false);
      setEditingHandle(false);
      setEditingBio(false);
      setEditingAvatar(false);
      setError("");
   };

   const saveName = async () => {
      if (!tempName.trim()) {
         setError("Name cannot be empty");
         return;
      }
      try {
         const updated = await updateProfile({ name: tempName.trim() });
         setUser({ ...user, name: updated.name });
         setEditingName(false);
         setError("");
      } catch (err) {
         setError(err.message || "Failed to update name");
      }
   };

   const saveHandle = async () => {
      if (!tempHandle.trim()) {
         setError("Username cannot be empty");
         return;
      }
      try {
         const updated = await updateProfile({ handle: tempHandle.trim() });
         setUser({ ...user, handle: updated.handle });
         setEditingHandle(false);
         setError("");
      } catch (err) {
         setError(err.message || "Failed to update username");
      }
   };

   const saveBio = async () => {
      try {
         const updated = await updateProfile({ bio: tempBio.trim() });
         setUser({ ...user, bio: updated.bio });
         setEditingBio(false);
         setError("");
      } catch (err) {
         setError(err.message || "Failed to update bio");
      }
   };

   const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      try {
         setUploading(true);
         setError("");
         const urls = await uploadFiles(Array.from(files));
         if (urls.length > 0) {
            const updated = await updateProfile({ avatar: urls[0] });
            setUser({ ...user, avatar: updated.avatar });
         }
      } catch (err) {
         setError(err.message || "Failed to upload avatar");
      } finally {
         setUploading(false);
      }
   };

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
   const userPosts = posts.filter(p => p.author === profileUserId || p.authorId === profileUserId);

   const originalPosts = userPosts.filter(p => !p.originalId);
   const repostsList = userPosts.filter(p => p.originalId);
   const userReels = reels.filter(r => r.author === profileUserId || r.authorId === profileUserId);
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
                  <div className="relative">
                     <Avatar
                        src={user.avatar}
                        alt={user.name}
                        className="w-24 h-24 sm:w-32 sm:h-32 border-4 border-white dark:border-gray-800 object-cover rounded-full shadow-lg"
                     />
                     {isMe && (
                        <>
                           <button
                              onClick={() => fileInputRef.current?.click()}
                              disabled={uploading}
                              className="absolute bottom-0 right-0 bg-accent hover:bg-accent-dark text-white p-2 rounded-full shadow-lg transition-all disabled:opacity-50"
                              title="Change avatar"
                           >
                              {uploading ? (
                                 <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                 <Upload size={16} />
                              )}
                           </button>
                           <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              onChange={handleAvatarChange}
                              className="hidden"
                           />
                        </>
                     )}
                  </div>
               </div>

               {/* Name and Handle */}
               <div className="mb-3 sm:mb-4">
                  {/* Name */}
                  {editingName ? (
                     <div className="flex items-center gap-2 mb-2">
                        <input
                           type="text"
                           value={tempName}
                           onChange={(e) => setTempName(e.target.value)}
                           className="flex-1 px-3 py-1.5 text-xl sm:text-2xl font-bold bg-muted dark:bg-muted-dark border border-border dark:border-border-dark rounded-lg text-text dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-accent"
                           autoFocus
                        />
                        <div className="inline-flex items-center rounded-full flex-wrap bg-bg dark:bg-bg-dark border border-border dark:border-border-dark">
                           <IconBtn
                              icon={Check}
                              label="Save"
                              onClick={saveName}
                              title="Save"
                           />
                           <IconBtn
                              icon={X}
                              label="Cancel"
                              onClick={cancelEdit}
                              title="Cancel"
                           />
                        </div>
                     </div>
                  ) : (
                     <div className="flex items-center justify-between mb-1 group">
                        <div className="flex items-center gap-2 flex-wrap">
                           <h1 className="text-xl sm:text-2xl font-bold text-text dark:text-text-dark">
                              {user.name}
                           </h1>
                           {user.privilegeLevel === "admin" && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-sm">
                                 👑 ADMIN
                              </span>
                           )}
                        </div>
                        {isMe && (
                           <div className="inline-flex items-center rounded-full flex-wrap bg-bg dark:bg-bg-dark border border-border dark:border-border-dark">
                              <IconBtn
                                 icon={Pencil}
                                 label="Edit"
                                 onClick={startEditName}
                                 title="Edit name"
                              />
                           </div>
                        )}
                     </div>
                  )}

                  {/* Handle */}
                  {editingHandle ? (
                     <div className="flex items-center gap-2">
                        <span className="text-sub dark:text-sub-dark text-sm sm:text-base">@</span>
                        <input
                           type="text"
                           value={tempHandle}
                           onChange={(e) => setTempHandle(e.target.value)}
                           className="flex-1 px-3 py-1 text-sm sm:text-base bg-muted dark:bg-muted-dark border border-border dark:border-border-dark rounded-lg text-text dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-accent"
                           autoFocus
                        />
                        <div className="inline-flex items-center rounded-full flex-wrap bg-bg dark:bg-bg-dark border border-border dark:border-border-dark">
                           <IconBtn
                              icon={Check}
                              label="Save"
                              onClick={saveHandle}
                              title="Save"
                           />
                           <IconBtn
                              icon={X}
                              label="Cancel"
                              onClick={cancelEdit}
                              title="Cancel"
                           />
                        </div>
                     </div>
                  ) : (
                     <div className="flex items-center justify-between group">
                        <p className="text-sub dark:text-sub-dark text-sm sm:text-base">
                           @{user.handle}
                        </p>
                        {isMe && (
                           <div className="inline-flex items-center rounded-full flex-wrap bg-bg dark:bg-bg-dark border border-border dark:border-border-dark">
                              <IconBtn
                                 icon={Pencil}
                                 label="Edit"
                                 onClick={startEditHandle}
                                 title="Edit username"
                              />
                           </div>
                        )}
                     </div>
                  )}
               </div>

               {/* Bio Section */}
               <div className="mb-3 sm:mb-4 text-text dark:text-text-dark">
                  {editingBio ? (
                     <div className="space-y-2">
                        <textarea
                           value={tempBio}
                           onChange={(e) => setTempBio(e.target.value)}
                           placeholder="Write something about yourself..."
                           className="w-full px-3 py-2 text-sm sm:text-base bg-muted dark:bg-muted-dark border border-border dark:border-border-dark rounded-lg text-text dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                           rows={3}
                           autoFocus
                        />
                        <div className="flex items-center gap-2 justify-end">
                           <div className="inline-flex items-center rounded-full flex-wrap bg-bg dark:bg-bg-dark border border-border dark:border-border-dark">
                              <IconBtn
                                 icon={Check}
                                 label="Save"
                                 onClick={saveBio}
                                 title="Save"
                              />
                              <IconBtn
                                 icon={X}
                                 label="Cancel"
                                 onClick={cancelEdit}
                                 title="Cancel"
                              />
                           </div>
                        </div>
                     </div>
                  ) : (
                     <div className="flex items-start justify-between group">
                        <p className="text-sm sm:text-base leading-relaxed flex-1">
                           {user.bio || (isMe ? "Add a bio to tell others about yourself..." : "No bio yet")}
                        </p>
                        {isMe && (
                           <div className="inline-flex items-center rounded-full flex-wrap bg-bg dark:bg-bg-dark border border-border dark:border-border-dark ml-2 flex-shrink-0">
                              <IconBtn
                                 icon={Pencil}
                                 label="Edit"
                                 onClick={startEditBio}
                                 title="Edit bio"
                              />
                           </div>
                        )}
                     </div>
                  )}
               </div>

               {/* Error message */}
               {error && (
                  <div className="mb-3 sm:mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                     {error}
                  </div>
               )}

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
                     addComment={addComment || (() => { })}
                     deletePost={deletePost || (() => { })}
                     editPost={editPost || (() => { })}
                     toggleLike={toggleLike || (() => { })}
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
                     addComment={addComment || (() => { })}
                     deletePost={deletePost || (() => { })}
                     editPost={editPost || (() => { })}
                     toggleLike={toggleLike || (() => { })}
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
                     addComment={addComment || (() => { })}
                     deletePost={deletePost || (() => { })}
                     editPost={editPost || (() => { })}
                     toggleLike={toggleLike || (() => { })}
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
                     addComment={addComment || (() => { })}
                     deletePost={deletePost || (() => { })}
                     editPost={editPost || (() => { })}
                     toggleLike={toggleLike || (() => { })}
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

            {view === "likedReels" && likedReels.length > 0 && (
               <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {likedReels.map(r => (
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
