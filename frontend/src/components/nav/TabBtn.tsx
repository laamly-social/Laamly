import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { clsx } from "../../utils";

export default function TabBtn({
   icon: Icon,
   label,
   active,
   to
}: {
   icon: LucideIcon;
   label: string;
   active: boolean;
   to: string;
}) {
   return (
      <Link
         to={to}
         className={clsx(
            "flex gap-2 items-center cursor-pointer w-full py-2 px-3 rounded-xl text-text dark:text-text-dark hover:bg-muted dark:hover:bg-muted-dark border border-border dark:border-border-dark transition",
            active &&
               "!bg-accent !text-white !border-transparent hover:!bg-accent"
         )}>
         <Icon size={16} /> {label}
      </Link>
   );
}
