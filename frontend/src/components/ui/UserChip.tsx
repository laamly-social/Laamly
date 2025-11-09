import Avatar from "./Avatar";

export default function UserChip({
   avatar,
   handle,
   fullName,
   onClickName,
   variant = "default"
}: {
   avatar: string;
   handle: string;
   fullName: string;
   onClickName?: () => void;
   variant?: "default" | "flat";
}) {
   if (variant === "flat") {
      return (
         <div className="flex items-center gap-1.5 text-md">
            <Avatar src={avatar} alt={handle} size="sm" />
            <div className="flex flex-col">
               <span
                  className="font-semibold bg-none border-none cursor-pointer p-0 text-linklike dark:text-linklike-dark hover:text-text dark:hover:text-text-dark"
                  onClick={onClickName}>
                  {fullName}
               </span>
               <span className="text-md text-sub dark:text-sub-dark">
                  @{handle}
               </span>
            </div>
         </div>
      );
   }

   return (
      <div className="flex items-center gap-2">
         <Avatar src={avatar} alt={handle} size="md" />
         <div className="flex flex-col">
            <span
               className="font-semibold bg-none border-none cursor-pointer p-0 text-linklike dark:text-linklike-dark hover:text-text dark:hover:text-text-dark"
               onClick={onClickName}>
               {fullName}
            </span>
            <span className="text-sm text-sub dark:text-sub-dark">
               @{handle}
            </span>
         </div>
      </div>
   );
}
