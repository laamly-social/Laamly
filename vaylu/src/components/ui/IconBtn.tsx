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
    <button className={clsx("iconbtn", active && "iconbtn--active", danger && "danger")} aria-label={label} onClick={onClick}>
      <Icon size={16} />
      {typeof count === "number" && <span>{count}</span>}
    </button>
  );
}
