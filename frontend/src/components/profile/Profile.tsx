// src/components/profile/Profile.tsx
// @ts-nocheck

import Avatar from "../ui/Avatar";
import GenericButton from "../ui/GenericButton";
// import Chip from "../ui/Chip";
import Card from "../ui/Card";
import Modal from "../ui/Modal";
import UserList from "../ui/UserList";
import StyledButton from "../ui/StyleButton";
import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import {
   ChevronLeft,
   Calendar,
   Link as LinkIcon,
   MapPin,
   Pencil,
   Check,
   X,
   Upload
} from "lucide-react";
import { clsx } from "../../utils";
import UserChip from "../ui/UserChip";
import type { Post, Reel, User } from "../../types";
import PostComponent from "../feed/Post";
import { apiEndpoint } from "../../config";
import { updateProfile } from "../../utils/me";
import { uploadFiles } from "../../utils/uploads";
import IconBtn from "../ui/IconBtn";

type FollowUser = {
   id: string;
   uuid: string;
   name: string;
   handle: string;
   avatar: string;
};

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
   const {
      meId,
      posts,
      followMap,
      followToggle,
      reels,
      openProfile,
      onBack,
      deletePost,
      editPost,
      toggleLike,
      addComment
   } = props;

   const [user, setUser] = useState<User | null>(null);
   const [loading, setLoading] = useState(true);
   const [view, setView] = useState<
      | "posts"
      | "reels"
      | "reposts"
      | "likedPosts"
      | "likedReels"
      | "savedPosts"
      | "savedReels"
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

   const profileUserId = userId || meId;
   const isLoggedIn = !!meId;
   const isMe = isLoggedIn && profileUserId === meId;

   // Follow state
   const [followersCount, setFollowersCount] = useState(0);
   const [followingCount, setFollowingCount] = useState(0);
   const [isFollowing, setIsFollowing] = useState(false);
   const [followLoading, setFollowLoading] = useState(false);

   // Follow lists
   const [followers, setFollowers] = useState<FollowUser[]>([]);
   const [followingUsers, setFollowingUsers] = useState<FollowUser[]>([]);

   // Pop-up modal visibility
   const [showFollowersModal, setShowFollowersModal] = useState(false);
   const [showFollowingModal, setShowFollowingModal] = useState(false);

   // Fetch followers + following lists
   const fetchFollowLists = async (targetId: string) => {
      try {
         const [followersRes, followingRes] = await Promise.all([
            fetch(apiEndpoint(`/api/users/${targetId}/followers`), {
               credentials: "include"
            }),
            fetch(apiEndpoint(`/api/users/${targetId}/following`), {
               credentials: "include"
            })
         ]);

         if (followersRes.ok) {
            const data = await followersRes.json().catch(() => ({ users: [] }));
            setFollowers(data.users || []);
         } else {
            setFollowers([]);
         }

         if (followingRes.ok) {
            const data = await followingRes.json().catch(() => ({ users: [] }));
            setFollowingUsers(data.users || []);
         } else {
            setFollowingUsers([]);
         }
      } catch (err) {
         console.error("Failed to fetch follow lists:", err);
         setFollowers([]);
         setFollowingUsers([]);
      }
   };

   useEffect(() => {
      // Fetch user profile data + follow meta
      async function fetchUserProfile() {
         try {
            setLoading(true);

            if (!profileUserId) {
               setUser(null);
               setLoading(false);
               return;
            }

            const res = await fetch(
               apiEndpoint(`/api/users/${profileUserId}`),
               {
                  credentials: "include"
               }
            );
            const data = await res.json();

            if (data.user) {
               const apiUser = data.user;
               setUser({
                  id: apiUser.id,
                  githubId: apiUser.id,
                  name: apiUser.name,
                  handle: apiUser.handle || apiUser.name,
                  avatar: apiUser.avatar,
                  bio: apiUser.bio || "",
                  privilegeLevel: apiUser.privilegeLevel || ""
               });

               setFollowersCount(apiUser.followersCount ?? 0);
               setFollowingCount(apiUser.followingCount ?? 0);
               setIsFollowing(!!apiUser.isFollowing);

               // Load full lists
               await fetchFollowLists(apiUser.id);
            } else {
               setUser(null);
            }
         } catch (error) {
            console.error("Failed to fetch user profile:", error);
            setUser(null);
            setFollowers([]);
            setFollowingUsers([]);
         } finally {
            setLoading(false);
         }
      }

      fetchUserProfile();
   }, [profileUserId, meId]);

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
         setUser({ ...(user as User), name: updated.name });
         setEditingName(false);
         setError("");
      } catch (err: any) {
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
         setUser({ ...(user as User), handle: updated.handle });
         setEditingHandle(false);
         setError("");
      } catch (err: any) {
         setError(err.message || "Failed to update username");
      }
   };

   const saveBio = async () => {
      try {
         const updated = await updateProfile({ bio: tempBio.trim() });
         setUser({ ...(user as User), bio: updated.bio });
         setEditingBio(false);
         setError("");
      } catch (err: any) {
         setError(err.message || "Failed to update bio");
      }
   };

   const handleAvatarChange = async (
      e: React.ChangeEvent<HTMLInputElement>
   ) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      try {
         setUploading(true);
         setError("");
         const urls = await uploadFiles(Array.from(files));
         if (urls.length > 0) {
            const updated = await updateProfile({ avatar: urls[0] });
            setUser({ ...(user as User), avatar: updated.avatar });
         }
      } catch (err: any) {
         setError(err.message || "Failed to upload avatar");
      } finally {
         setUploading(false);
      }
   };

   const handleFollowToggle = async () => {
      if (!user) return;
      if (!isLoggedIn) {
         alert("Please log in to follow users.");
         return;
      }
      if (isMe || followLoading) return;

      const prevIsFollowing = isFollowing;
      const prevFollowersCount = followersCount;

      try {
         setFollowLoading(true);

         // optimistic
         const nextIsFollowing = !prevIsFollowing;
         setIsFollowing(nextIsFollowing);
         setFollowersCount(prevFollowersCount + (nextIsFollowing ? 1 : -1));

         const res = await fetch(apiEndpoint(`/api/users/${user.id}/follow`), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include"
         });

         const data = await res.json().catch(() => ({}) as any);

         if (!res.ok) {
            setIsFollowing(prevIsFollowing);
            setFollowersCount(prevFollowersCount);
            const msg =
               data?.message ||
               (res.status === 401
                  ? "You need to be logged in to follow users."
                  : "Failed to update follow status.");
            alert(msg);
         } else {
            if (typeof data.followersCount === "number") {
               setFollowersCount(data.followersCount);
            }
            if (typeof data.isFollowing === "boolean") {
               setIsFollowing(data.isFollowing);
            }

            // refresh lists from server so they are accurate
            await fetchFollowLists(user.id);
         }
      } catch (err) {
         console.error("Failed to toggle follow:", err);
         setIsFollowing(prevIsFollowing);
         setFollowersCount(prevFollowersCount);
         alert("Failed to update follow status. Please try again.");
      } finally {
         setFollowLoading(false);
      }
   };

   if (loading) {
      return (
         <div className="w-full h-[100vh] flex items-center justify-center">
            <Card className="inline-block text-center py-8 px-24">
               <div className="text-sub dark:text-sub-dark">
                  Loading profile...
               </div>
            </Card>
         </div>
      );
   }

   if (!user) {
      return (
         <div className="w-full h-[100vh] flex items-center justify-center">
            <Card className="inline-block text-center py-8 px-24">
               <StyledButton onClick={onBack} label="← Back" />

               <div className="mt-4 text-center text-sub dark:text-sub-dark">
                  User not found
               </div>
            </Card>
         </div>
      );
   }

   const userPosts = posts.filter(
      (p) => p.author === profileUserId || p.authorId === profileUserId
   );

   // Sort posts by creation date (newest first)
   const originalPosts = userPosts
      .filter((p) => !p.originalId)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
   const repostsList = userPosts
      .filter((p) => p.originalId)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
   const userReels = reels.filter(
      (r) => r.author === profileUserId || r.authorId === profileUserId
   );
   const likedPosts = posts
      .filter((p) => p.liked)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
   const savedPosts = posts
      .filter((p) => p.bookmarked)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
   const likedReels = reels.filter((r) => r.liked);
   const savedReels = reels.filter((r) => r.saved);

   // Format join date (you may want to use real createdAt from DB later)
   const joinDate = new Date().toLocaleDateString("en-US", {
      month: "long",
      year: "numeric"
   });

   return (
      <div className="profile max-w-2xl mx-auto px-4 sm:px-0">
         {/* Profile Header Card */}
         <Card className="profile__header">
            {/* Cover Photo Area */}
            <div className="h-24 sm:h-32 opacity-70 bg-gradient-to-b from-accent/80 to-accent-dark/40"></div>

            {/* Profile Info */}
            <div className="px-6 pb-2">
               {/* Avatar positioned over cover */}
               <div className="flex justify-between items-start -mt-12 sm:-mt-16 mb-3 sm:mb-4 mx-auto">
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
                              title="Change avatar">
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
                              <span className="-mb-0.5 inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-sm">
                                 ADMIN
                              </span>
                           )}
                              {isLoggedIn && !isMe && (
                                 <div className="-mb-0.5">
                                    <StyledButton
                                       label={isFollowing ? "Following" : "Follow"}
                                       variant={isFollowing ? "secondary" : "primary"}
                                       onClick={handleFollowToggle}
                                       disabled={followLoading}
                                    />
                                 </div>
                              )}
                        </div>
                        {isMe && (
                           <div className="inline-flex items-center rounded-full flex-wrap bg-bg dark:bg-bg-dark border border-border dark:border-border-dark">
                              <IconBtn
                                 icon={Pencil}
                                 label="Edit"
                                 onClick={startEditName}
                                 title="Edit name"
                                 className="pt-1 pb-1 scale-90"
                              />
                           </div>
                        )}
                     </div>
                  )}

                  {/* Handle */}
                  {editingHandle ? (
                     <div className="flex items-center justify-between gap-2">
                        <span className="text-sub dark:text-sub-dark text-sm sm:text-base">
                           @
                        </span>
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
                                 className="pt-1 pb-1 scale-90"
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
                        <p className="text-lg leading-relaxed flex-1">
                           {user.bio ||
                              (isMe
                                 ? "Add a bio to tell others about yourself..."
                                 : "No bio yet")}
                        </p>
                        {isMe && (
                           <div className="inline-flex items-center rounded-full flex-wrap bg-bg dark:bg-bg-dark border border-border dark:border-border-dark ml-2 flex-shrink-0">
                              <IconBtn
                                 icon={Pencil}
                                 label="Edit"
                                 onClick={startEditBio}
                                 title="Edit bio"
                                 className="pt-1 pb-1 scale-90"
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

               {/* Follow stats + button */}
               <div className="flex flex-wrap items-center mb-2">
                  <div className="text-text dark:text-text-dark">
                     <button
                        type="button"
                        onClick={() =>
                           followersCount > 0 && setShowFollowersModal(true)
                        }
                        className="inline cursor-pointer hover:opacity-80 transition-opacity">
                        <span>
                           {followersCount}{" "}
                           {followersCount === 1 ? "Follower" : "Followers"}
                        </span>
                     </button>
                     <span className="mx-2">|</span>
                     <button
                        type="button"
                        onClick={() =>
                           followingCount > 0 && setShowFollowingModal(true)
                        }
                        className="inline cursor-pointer hover:opacity-80 transition-opacity">
                        <span>
                           {followingCount} Following
                        </span>
                     </button>
                  </div>
               </div>

               {/* Additional Info */}
               <div className="text-sub dark:text-sub-dark text-md mb-2">
                  <div className="flex items-center">
                     <Calendar size={14} className="sm:w-4 sm:h-4 mr-2" />
                     <span>Joined {joinDate}</span>
                  </div>
               </div>
            </div>
         </Card>

         {/* Navigation Tabs */}
         <div
            className="m-2"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
            <div className="w-full text-center">
               <Chip active={view === "posts"} onClick={() => setView("posts")}>
                  Posts ({originalPosts.length})
               </Chip>
               <Chip active={view === "reels"} onClick={() => setView("reels")}>
                  Reels ({userReels.length})
               </Chip>
               {isMe && (
                  <>
                     <Chip
                        active={view === "likedPosts"}
                        onClick={() => setView("likedPosts")}>
                        Liked Posts
                     </Chip>
                     <Chip
                        active={view === "likedReels"}
                        onClick={() => setView("likedReels")}>
                        Liked Reels
                     </Chip>
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
               originalPosts.map((p) => (
                  <PostComponent
                     key={p._id}
                     post={p}
                     meId={meId}
                     posts={posts}
                     setPosts={props.setPosts}
                     openProfile={openProfile}
                     addComment={addComment || (() => {})}
                     deletePost={deletePost || (() => {})}
                     editPost={editPost || (() => {})}
                     toggleLike={toggleLike || (() => {})}
                     toggleRepost={() => {}}
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
                  {userReels.map((r) => (
                     <a
                        key={r.id}
                        href={`/reel/${r.id}`}
                        className="relative aspect-[9/16] rounded-lg overflow-hidden bg-muted dark:bg-muted-dark hover:opacity-90 transition-opacity cursor-pointer">
                        <video
                           src={r.src + "/raw"}
                           className="absolute inset-0 w-full h-full object-cover"
                           preload="metadata"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50" />
                        <div className="absolute bottom-2 left-2 right-2">
                           <p className="text-white text-xs font-medium truncate">
                              {r.title}
                           </p>
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
               repostsList.map((p) => (
                  <PostComponent
                     key={p._id}
                     post={p}
                     meId={meId}
                     posts={posts}
                     setPosts={props.setPosts}
                     openProfile={openProfile}
                     addComment={addComment || (() => {})}
                     deletePost={deletePost || (() => {})}
                     editPost={editPost || (() => {})}
                     toggleLike={toggleLike || (() => {})}
                     toggleRepost={() => {}}
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
               likedPosts.map((p) => (
                  <PostComponent
                     key={p._id}
                     post={p}
                     meId={meId}
                     posts={posts}
                     setPosts={props.setPosts}
                     openProfile={openProfile}
                     addComment={addComment || (() => {})}
                     deletePost={deletePost || (() => {})}
                     editPost={editPost || (() => {})}
                     toggleLike={toggleLike || (() => {})}
                     toggleRepost={() => {}}
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
               savedPosts.map((p) => (
                  <PostComponent
                     key={p._id}
                     post={p}
                     meId={meId}
                     posts={posts}
                     setPosts={props.setPosts}
                     openProfile={openProfile}
                     addComment={addComment || (() => {})}
                     deletePost={deletePost || (() => {})}
                     editPost={editPost || (() => {})}
                     toggleLike={toggleLike || (() => {})}
                     toggleRepost={() => {}}
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
                  {likedReels.map((r) => (
                     <a
                        key={r.id}
                        href={`/reel/${r.id}`}
                        className="relative aspect-[9/16] rounded-lg overflow-hidden bg-muted dark:bg-muted-dark hover:opacity-90 transition-opacity cursor-pointer">
                        <video
                           src={r.src + "/raw"}
                           className="absolute inset-0 w-full h-full object-cover"
                           preload="metadata"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50" />
                        <div className="absolute bottom-2 left-2 right-2">
                           <p className="text-white text-xs font-medium truncate">
                              {r.title}
                           </p>
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
               savedReels.map((r) => {
                  return (
                     <Card key={r.id}>
                        <div className="p-3 sm:p-4">
                           <div className="flex items-center gap-2 sm:gap-3">
                              <Avatar src={user.avatar} alt={user.name} />
                              <div className="min-w-0 flex-1">
                                 <div className="font-bold text-text dark:text-text-dark text-sm sm:text-base truncate">
                                    {user.name}
                                 </div>
                                 <div className="text-xs sm:text-sm text-sub dark:text-sub-dark truncate">
                                    {r.title}
                                 </div>
                              </div>
                           </div>
                        </div>
                     </Card>
                  );
               })}
         </div>

         {/* Followers / Following pop-up modals */}
         {showFollowersModal && (
            <FollowListModal
               title="Followers"
               users={followers}
               onClose={() => setShowFollowersModal(false)}
               openProfile={openProfile}
            />
         )}

         {showFollowingModal && (
            <FollowListModal
               title="Following"
               users={followingUsers}
               onClose={() => setShowFollowingModal(false)}
               openProfile={openProfile}
            />
         )}
      </div>
   );
}

/**
 * Instagram/Twitter-style pop-up for Followers / Following
 */
function FollowListModal({
   title,
   users,
   onClose,
   openProfile
}: {
   title: string;
   users: FollowUser[];
   onClose: () => void;
   openProfile: (id: string) => void;
}) {
   const handleUserClick = (userId: string) => {
      openProfile(userId);
      onClose();
   };

   return (
      <Modal isOpen={true} onClose={onClose} title={title} maxWidth="md">
         <UserList
            users={users}
            onUserClick={handleUserClick}
            emptyMessage={`No ${title.toLowerCase()} yet`}
         />
      </Modal>
   );
}


function Chip({
   active = false,
   ...props
}: ChipProps) {
   return (
      <button
         className={
            `rounded-full bg-muted dark:bg-muted-dark text-sub dark:text-sub-dark border border-border dark:border-border-dark py-1 px-3 m-1 ${active ? "bg-blue" : ""}`
         }
         {...props}>
      </button>
   );
}
