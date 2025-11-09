import UserChip from "./UserChip";
import { Check } from "lucide-react";

interface UserListUser {
   id: string;
   name: string;
   handle: string;
   avatar: string;
}

interface UserListProps {
   users: UserListUser[];
   onUserClick: (userId: string) => void;
   selectedUsers?: Set<string>;
   showCheckmark?: boolean;
   emptyMessage?: string;
}

export default function UserList({
   users,
   onUserClick,
   selectedUsers,
   showCheckmark = false,
   emptyMessage = "No users found"
}: UserListProps) {
   if (users.length === 0) {
      return (
         <div className="p-4 text-center text-sub dark:text-sub-dark text-sm">
            {emptyMessage}
         </div>
      );
   }

   return (
      <>
         {users.map((user) => {
            const isSelected = selectedUsers?.has(user.id);
            return (
               <button
                  key={user.id}
                  onClick={() => onUserClick(user.id)}
                  className="w-full flex items-center gap-3 px-4 py-4 hover:bg-muted dark:hover:bg-muted-dark text-left cursor-pointer transition">
                  <div className="flex-1 min-w-0">
                     <UserChip
                        avatar={user.avatar}
                        handle={user.handle}
                        fullName={user.name}
                     />
                  </div>
                  {showCheckmark && isSelected && (
                     <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                        <Check size={16} className="text-white" />
                     </div>
                  )}
               </button>
            );
         })}
      </>
   );
}
