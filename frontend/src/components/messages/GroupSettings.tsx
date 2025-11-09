import { useState, useRef } from "react";
import {
   X,
   UserPlus,
   Trash2,
   Edit2,
   Check,
   Users,
   Upload,
   Camera
} from "lucide-react";
import type { Thread, User } from "../../types";
import {
   addGroupMember,
   removeGroupMember,
   updateGroupName,
   deleteGroup,
   searchUsers,
   updateGroupAvatar
} from "../../utils/messages";
import { uploadFiles } from "../../utils/uploads";
import Avatar from "../ui/Avatar";
import GenericButton from "../ui/GenericButton";
import InputField from "../ui/InputField";

interface GroupSettingsProps {
   thread: Thread;
   onClose: () => void;
   onGroupUpdate: (updatedThread: Thread) => void;
   onGroupDeleted: () => void;
}

export default function GroupSettings({
   thread,
   onClose,
   onGroupUpdate,
   onGroupDeleted
}: GroupSettingsProps) {
   const [isEditingName, setIsEditingName] = useState(false);
   const [newGroupName, setNewGroupName] = useState(thread.groupName || "");
   const [showAddMember, setShowAddMember] = useState(false);
   const [searchQuery, setSearchQuery] = useState("");
   const [searchResults, setSearchResults] = useState<User[]>([]);
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState("");
   const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
   const avatarInputRef = useRef<HTMLInputElement>(null);

   // Get all member IDs (including participant IDs and the thread owner)
   const allMemberIds = [
      ...thread.participantIds,
      ...(thread.participants?.map((p) => p.id) || [])
   ].filter((id, index, self) => self.indexOf(id) === index); // Remove duplicates

   const handleUpdateName = async () => {
      if (!newGroupName.trim()) {
         setError("Group name cannot be empty");
         return;
      }

      try {
         setLoading(true);
         setError("");
         const result = await updateGroupName(thread.id, newGroupName.trim());
         onGroupUpdate({
            ...thread,
            groupName: newGroupName.trim(),
            isGroup: result.isGroup || true
         });
         setIsEditingName(false);
      } catch (err: any) {
         setError(err.message || "Failed to update group name");
      } finally {
         setLoading(false);
      }
   };

   const handleAvatarUpload = async (
      e: React.ChangeEvent<HTMLInputElement>
   ) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Check if it's an image
      if (!file.type.startsWith("image/")) {
         setError("Please select an image file");
         return;
      }

      try {
         setIsUploadingAvatar(true);
         setError("");

         console.log("Starting avatar upload...", file.name, file.size);

         // Upload the image
         const urls = await uploadFiles([file]);
         console.log("Upload response:", urls);

         if (urls.length === 0) {
            throw new Error("Failed to upload avatar");
         }

         const avatarUrl = urls[0];
         console.log("Avatar URL:", avatarUrl);

         // Update the group avatar on the backend
         const result = await updateGroupAvatar(thread.id, avatarUrl);
         console.log("Update result:", result);

         // Update the thread with the new avatar
         onGroupUpdate({
            ...thread,
            groupAvatar: avatarUrl
         });

         console.log("Avatar upload complete!");
      } catch (err: any) {
         console.error("Avatar upload error:", err);
         setError(err.message || "Failed to upload avatar");
      } finally {
         setIsUploadingAvatar(false);
         // Reset the file input
         if (avatarInputRef.current) {
            avatarInputRef.current.value = "";
         }
      }
   };

   const handleSearchUsers = async (query: string) => {
      setSearchQuery(query);
      if (!query.trim()) {
         setSearchResults([]);
         return;
      }

      try {
         const users = await searchUsers(query);
         // Filter out users already in the group
         const filteredUsers = users.filter(
            (user) => !allMemberIds.includes(user.id)
         );
         setSearchResults(filteredUsers);
      } catch (err) {
         console.error("Search failed:", err);
      }
   };

   const handleAddMember = async (user: User) => {
      try {
         setLoading(true);
         setError("");
         const result = await addGroupMember(thread.id, user.id);

         // Update thread with new member and group status from backend
         const updatedParticipants = [
            ...(thread.participants || []),
            result.member
         ];
         onGroupUpdate({
            ...thread,
            participants: updatedParticipants,
            participantIds: [...thread.participantIds, user.id],
            isGroup: result.isGroup || true,
            groupName: result.groupName || thread.groupName
         });

         setShowAddMember(false);
         setSearchQuery("");
         setSearchResults([]);
      } catch (err: any) {
         setError(err.message || "Failed to add member");
      } finally {
         setLoading(false);
      }
   };

   const handleRemoveMember = async (userId: string) => {
      if (thread.participants && thread.participants.length <= 2) {
         setError("Cannot remove members from a group with only 2 members");
         return;
      }

      if (!confirm("Are you sure you want to remove this member?")) return;

      try {
         setLoading(true);
         setError("");
         await removeGroupMember(thread.id, userId);

         // Update thread without removed member
         const updatedParticipants = (thread.participants || []).filter(
            (p) => p.id !== userId
         );
         onGroupUpdate({
            ...thread,
            participants: updatedParticipants,
            participantIds: thread.participantIds.filter((id) => id !== userId)
         });
      } catch (err: any) {
         setError(err.message || "Failed to remove member");
      } finally {
         setLoading(false);
      }
   };

   const handleDeleteGroup = async () => {
      if (
         !confirm(
            "Are you sure you want to delete this group? This action cannot be undone."
         )
      )
         return;

      try {
         setLoading(true);
         setError("");
         await deleteGroup(thread.id);
         onGroupDeleted();
      } catch (err: any) {
         setError(err.message || "Failed to delete group");
         setLoading(false);
      }
   };

   return (
      <div className="absolute inset-0 bg-bg dark:bg-bg-dark z-50 flex flex-col">
         {/* Header */}
         <div className="flex items-center justify-between p-4 border-b border-border dark:border-border-dark">
            <h2 className="text-xl font-semibold text-text dark:text-text-dark">
               Chat Settings
            </h2>
            <button
               onClick={onClose}
               className="p-2 rounded-lg hover:bg-muted dark:hover:bg-muted-dark transition"
               aria-label="Close settings">
               <X size={24} className="text-text dark:text-text-dark" />
            </button>
         </div>

         {/* Content */}
         <div className="flex-1 overflow-y-auto p-4 space-y-6 w-[95%] md:min-w-[60%] max-w-[600px] mx-auto">
            {error && (
               <div className="p-3 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg">
                  {error}
               </div>
            )}

            {/* Group Avatar */}
            <div className="text-center mt-6">
               <div className="inline-block">
                  <input
                     ref={avatarInputRef}
                     type="file"
                     accept="image/*"
                     onChange={handleAvatarUpload}
                     className="hidden"
                  />
                  <div
                     role="button"
                     tabIndex={0}
                     onClick={() => avatarInputRef.current?.click()}
                     onKeyPress={(e) => {
                        if (e.key === "Enter" || e.key === " ")
                           avatarInputRef.current?.click();
                     }}
                     className="cursor-pointer">
                     {thread.groupAvatar ? (
                        <img
                           src={thread.groupAvatar}
                           alt="Group avatar"
                           className="w-20 h-20 rounded-full object-cover border-2 border-border dark:border-border-dark mx-auto"
                        />
                     ) : (
                        <div className="w-20 h-20 rounded-full object-cover border-2 border-border dark:border-border-dark mx-auto flex items-center justify-center">
                           <Users
                              size={24}
                              className="text-sub dark:text-sub-dark "
                           />
                        </div>
                     )}
                  </div>
                  <br />
                  <p className="text-sm inline text-sub dark:text-sub-dark">
                     {isUploadingAvatar
                        ? "Uploading..."
                        : "Click photo to upload new avatar"}
                  </p>
               </div>
            </div>

            {/* Chat Name - all chats now have names */}
            <div className="space-y-2">
               <label className="text-sm font-medium text-text dark:text-text-dark">
                  Chat Name
               </label>
               {isEditingName ? (
                  <div className="flex gap-2">
                     <InputField
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder="Enter chat name"
                        className="flex-1"
                        disabled={loading}
                     />
                     <GenericButton
                        onClick={handleUpdateName}
                        disabled={loading}
                        className="px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg flex items-center gap-2">
                        <Check size={18} />
                     </GenericButton>
                     <GenericButton
                        onClick={() => {
                           setIsEditingName(false);
                           setNewGroupName(thread.groupName || "");
                        }}
                        disabled={loading}
                        className="px-4 py-2 bg-muted dark:bg-muted-dark hover:bg-muted/80 dark:hover:bg-muted-dark/80 text-text dark:text-text-dark rounded-lg">
                        <X size={18} />
                     </GenericButton>
                  </div>
               ) : (
                  <div className="flex items-center justify-between p-3 bg-panel dark:bg-panel-dark rounded-lg">
                     <span className="text-text dark:text-text-dark">
                        {thread.groupName || "Unnamed Chat"}
                     </span>
                     <button
                        onClick={() => setIsEditingName(true)}
                        className="p-2 rounded hover:bg-muted dark:hover:bg-muted-dark transition"
                        aria-label="Edit chat name">
                        <Edit2
                           size={18}
                           className="text-text dark:text-text-dark"
                        />
                     </button>
                  </div>
               )}
            </div>

            {/* Members */}
            <div className="space-y-3">
               <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-text dark:text-text-dark flex items-center gap-2">
                     <Users size={18} />
                     Members ({thread.participants?.length || 0})
                  </label>
                  <GenericButton
                     onClick={() => setShowAddMember(!showAddMember)}
                     className="px-3 py-1.5 bg-accent hover:bg-accent/90 text-white rounded-lg flex items-center gap-2 text-sm">
                     <UserPlus size={16} />
                     Add Member
                  </GenericButton>
               </div>

               {/* Add Member Search - all chats can add members now */}
               {showAddMember && (
                  <div className="p-3 bg-panel dark:bg-panel-dark rounded-lg space-y-2">
                     <InputField
                        value={searchQuery}
                        onChange={(e) => handleSearchUsers(e.target.value)}
                        placeholder="Search users to add..."
                        className="w-full"
                     />
                     {searchResults.length > 0 && (
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                           {searchResults.map((user) => (
                              <div
                                 key={user.id}
                                 className="flex items-center justify-between p-2 hover:bg-muted dark:hover:bg-muted-dark rounded transition cursor-pointer"
                                 onClick={() => handleAddMember(user)}>
                                 <div className="flex items-center gap-2">
                                    <Avatar
                                       src={user.avatar}
                                       alt={user.name}
                                       size="sm"
                                    />
                                    <div>
                                       <div className="text-sm font-medium text-text dark:text-text-dark">
                                          {user.name}
                                       </div>
                                       <div className="text-xs text-text/60 dark:text-text-dark/60">
                                          @{user.handle}
                                       </div>
                                    </div>
                                 </div>
                                 <UserPlus size={16} className="text-accent" />
                              </div>
                           ))}
                        </div>
                     )}
                     {searchQuery && searchResults.length === 0 && (
                        <div className="text-sm text-text/60 dark:text-text-dark/60 text-center py-2">
                           No users found
                        </div>
                     )}
                  </div>
               )}

               {/* Member List */}
               <div className="space-y-2">
                  {thread.participants?.map((participant) => (
                     <div
                        key={participant.id}
                        className="flex items-center justify-between p-3 bg-panel dark:bg-panel-dark rounded-lg">
                        <div className="flex items-center gap-3">
                           <Avatar
                              src={participant.avatar}
                              alt={participant.name}
                              size="md"
                           />
                           <div>
                              <div className="text-sm font-medium text-text dark:text-text-dark">
                                 {participant.name}
                              </div>
                              <div className="text-xs text-text/60 dark:text-text-dark/60">
                                 @{participant.handle}
                              </div>
                           </div>
                        </div>
                        {thread.participants &&
                           thread.participants.length > 2 && (
                              <button
                                 onClick={() =>
                                    handleRemoveMember(participant.id)
                                 }
                                 disabled={loading}
                                 className="p-2 rounded hover:bg-red-100 dark:hover:bg-red-900/20 transition text-red-600 dark:text-red-400"
                                 aria-label="Remove member">
                                 <Trash2 size={18} />
                              </button>
                           )}
                     </div>
                  ))}
               </div>
            </div>

            {/* Danger Zone - all chats can be deleted */}
            <div className="space-y-2 pt-4">
               <GenericButton
                  onClick={handleDeleteGroup}
                  disabled={loading}
                  className="mx-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center justify-center gap-2 font-medium">
                  <Trash2 size={18} />
                  Delete Chat
               </GenericButton>
            </div>
         </div>
      </div>
   );
}
