import { useState, useEffect, useRef } from "react";
import { Search, Upload } from "lucide-react";
import GenericButton from "../ui/GenericButton";
import Modal from "../ui/Modal";
import UserList from "../ui/UserList";
import { searchUsers } from "../../utils/messages";
import { uploadFiles } from "../../utils/uploads";
import type { User } from "../../types";

interface NewChatModalProps {
   isOpen: boolean;
   onClose: () => void;
   onCreateChat: (
      userIds: string[],
      options?: { isGroup?: boolean; groupName?: string; groupAvatar?: string }
   ) => void;
}

export default function NewChatModal({
   isOpen,
   onClose,
   onCreateChat
}: NewChatModalProps) {
   const [searchQuery, setSearchQuery] = useState("");
   const [users, setUsers] = useState<User[]>([]);
   const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
   const [isSearching, setIsSearching] = useState(false);
   const [isGroup, setIsGroup] = useState(false);
   const [groupName, setGroupName] = useState("");
   const [avatarFile, setAvatarFile] = useState<File | null>(null);
   const [avatarPreview, setAvatarPreview] = useState<string>("");
   const [isUploading, setIsUploading] = useState(false);
   const fileInputRef = useRef<HTMLInputElement>(null);

   useEffect(() => {
      if (!isOpen) {
         setSearchQuery("");
         setUsers([]);
         setSelectedUsers(new Set());
         setIsGroup(true);
         setGroupName("");
         setAvatarFile(null);
         if (avatarPreview) {
            URL.revokeObjectURL(avatarPreview);
         }
         setAvatarPreview("");
         return;
      }
   }, [isOpen]);

   useEffect(() => {
      if (searchQuery.trim().length < 2) {
         setUsers([]);
         return;
      }

      const timer = setTimeout(async () => {
         setIsSearching(true);
         try {
            const results = await searchUsers(searchQuery);
            setUsers(results);
         } catch (error) {
            console.error("Failed to search users:", error);
         } finally {
            setIsSearching(false);
         }
      }, 300);

      return () => clearTimeout(timer);
   }, [searchQuery]);

   const toggleUser = (userId: string) => {
      const newSet = new Set(selectedUsers);
      if (newSet.has(userId)) {
         newSet.delete(userId);
      } else {
         newSet.add(userId);
      }
      setSelectedUsers(newSet);
   };

   const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Check if it's an image
      if (!file.type.startsWith("image/")) {
         alert("Please select an image file");
         return;
      }

      // Revoke previous preview URL if exists
      if (avatarPreview) {
         URL.revokeObjectURL(avatarPreview);
      }

      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
   };

   const handleRemoveAvatar = () => {
      if (avatarPreview) {
         URL.revokeObjectURL(avatarPreview);
      }
      setAvatarFile(null);
      setAvatarPreview("");
      if (fileInputRef.current) {
         fileInputRef.current.value = "";
      }
   };

   const handleCreate = async () => {
      if (selectedUsers.size === 0) {
         alert("Please select at least one user to start a chat.");
         return;
      }

      setIsUploading(true);
      try {
         let groupAvatar: string | undefined = undefined;

         // Upload avatar if one was selected
         if (avatarFile) {
            console.log("Uploading avatar...");
            const urls = await uploadFiles([avatarFile]);
            console.log("Avatar upload result:", urls);
            if (urls.length > 0) {
               groupAvatar = urls[0];
            }
         }

         const userIds = Array.from(selectedUsers);
         console.log("Creating chat with users:", userIds);
         const options = isGroup
            ? { isGroup: true, groupName: groupName || undefined, groupAvatar }
            : undefined;

         await onCreateChat(userIds, options);
         onClose();
      } catch (error) {
         console.error("Failed to create chat:", error);
         alert(
            `Failed to create chat: ${error instanceof Error ? error.message : "Unknown error"}. Please try again.`
         );
      } finally {
         setIsUploading(false);
      }
   };

   if (!isOpen) return null;

   return (
      <Modal
         isOpen={isOpen}
         onClose={onClose}
         title="New Group Chat"
         footer={
            <>
               <GenericButton
                  onClick={onClose}
                  disabled={isUploading}
                  className="px-4 py-2 bg-transparent hover:bg-muted dark:hover:bg-muted-dark text-text dark:text-text-dark">
                  Cancel
               </GenericButton>
               <GenericButton
                  onClick={handleCreate}
                  disabled={selectedUsers.size === 0 || isUploading}
                  className="px-4 py-2 bg-accent text-white disabled:opacity-50 disabled:cursor-not-allowed">
                  {isUploading ? "Creating..." : "Create Chat"}
               </GenericButton>
            </>
         }>
         {/* Search bar */}
         <div className="p-4 border-b border-border dark:border-border-dark">
            <input
               type="text"
               placeholder="Group name (optional)"
               value={groupName}
               onChange={(e) => setGroupName(e.target.value)}
               className="w-full mb-3 px-3 py-2 bg-muted dark:bg-muted-dark rounded-xl border-none outline-none text-text dark:text-text-dark placeholder:text-sub dark:placeholder:text-sub-dark"
            />

            {/* Avatar upload */}
            <div className="mb-3">
               <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarSelect}
                  className="hidden"
               />
               <div className="flex items-center gap-3">
                  {avatarPreview ? (
                     <>
                        <img
                           src={avatarPreview}
                           alt="Group avatar preview"
                           className="w-12 h-12 rounded-full object-cover"
                        />
                        <button
                           onClick={handleRemoveAvatar}
                           className="text-sm text-red-500 hover:text-red-600 transition">
                           Remove
                        </button>
                     </>
                  ) : (
                     <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-3 py-2 mx-auto bg-muted dark:bg-muted-dark rounded-xl text-sm text-text dark:text-text-dark hover:bg-border dark:hover:bg-border-dark transition">
                        <Upload size={16} />
                        Upload Group Avatar (optional)
                     </button>
                  )}
               </div>
            </div>

            {/* User search */}
            <div className="flex items-center gap-2 bg-muted dark:bg-muted-dark rounded-xl px-3 py-2">
               <Search size={18} className="text-sub dark:text-sub-dark" />
               <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-text dark:text-text-dark placeholder:text-sub dark:placeholder:text-sub-dark"
                  autoFocus
               />
            </div>
            {selectedUsers.size > 0 && (
               <div className="mt-2 text-sm text-sub dark:text-sub-dark text-center">
                  {selectedUsers.size} user{selectedUsers.size !== 1 ? "s" : ""}{" "}
                  selected
               </div>
            )}
         </div>

         {/* User list */}
         <div className="max-h-96 overflow-y-auto">
            {isSearching ? (
               <div className="p-4 text-center text-sub dark:text-sub-dark">
                  Searching...
               </div>
            ) : users.length === 0 && searchQuery.trim().length >= 2 ? (
               <UserList
                  users={[]}
                  onUserClick={() => {}}
                  emptyMessage="No users found"
               />
            ) : users.length === 0 ? (
               <div className="p-4 text-center text-sub dark:text-sub-dark">
                  Starting typing to find users
               </div>
            ) : (
               <UserList
                  users={users}
                  onUserClick={toggleUser}
                  selectedUsers={selectedUsers}
                  showCheckmark={true}
               />
            )}
         </div>
      </Modal>
   );
}
