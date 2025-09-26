import type { LucideIcon } from "lucide-react";
import { clsx } from "../../utils";

export default function TabBtn({ icon: Icon, label, active, onClick }: { icon: LucideIcon; label: string; active: boolean; onClick: () => void }) {
  return (
    <button className={clsx("tab", active && "tab--active")} onClick={onClick}>
      <Icon size={16} /> {label}
    </button>
  );
}
