import { clsx } from "../../utils";
import type { LucideIcon } from "lucide-react";
import { Heart } from "lucide-react";

export default function IconBtn({
   icon: Icon,
   label,
   count,
   onClick,
   active,
   danger,
   disabled,
   className,
   title
}: {
   icon: LucideIcon;
   label: string;
   count?: number;
   onClick?: () => void;
   active?: boolean;
   danger?: boolean;
   disabled?: boolean;
   className?: string;
   title?: string;
}) {
   const isHeartIcon = Icon === Heart;

   return (
      <button
         className={clsx(
            "flex gap-1 items-center rounded-full py-2.5 px-2.5 border border-transparent text-text dark:text-text-dark cursor-pointer transition-all duration-200 leading-none",
            active && (isHeartIcon ? "text-red-500" : "text-[#ff9db5]"),
            danger
               ? "text-red-600 hover:bg-red-600 hover:text-white focus:bg-red-600 focus:text-white"
               : "hover:bg-panel dark:hover:bg-panel-dark",
            disabled && "opacity-50 cursor-not-allowed",
            className
         )}
         aria-label={label}
         onClick={onClick}
         disabled={disabled}
         title={title}>
         {isHeartIcon && active ? (
            <Heart size={16} fill="currentColor" />
         ) : (
            <Icon size={16} />
         )}
         {typeof count === "number" && <span>{count}</span>}
      </button>
   );
}
