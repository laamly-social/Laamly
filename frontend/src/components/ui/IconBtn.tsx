import { clsx } from "../../utils";
import type { LucideIcon } from "lucide-react";

export default function IconBtn({
  icon: Icon,
  label,
  count,
  onClick,
  active,
  danger,
}: {
  icon: LucideIcon;
  label: string;
  count?: number;
  onClick?: () => void;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <button 
      className={clsx(
        "flex gap-1 items-center rounded-full py-1.5 px-2.5 border border-transparent text-text dark:text-text-dark cursor-pointer hover:bg-muted dark:hover:bg-muted-dark transition", 
        active && "text-[#ff9db5]", 
        danger && "text-danger"
      )} 
      aria-label={label} 
      onClick={onClick}
    >
      <Icon size={16} />
      {typeof count === "number" && <span>{count}</span>}
    </button>
  );
}
