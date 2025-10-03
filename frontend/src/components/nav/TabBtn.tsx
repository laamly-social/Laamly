import type { LucideIcon } from "lucide-react";
import GenericButton from "../ui/GenericButton";
import { clsx } from "../../utils";

export default function TabBtn({ icon: Icon, label, active, onClick }: { icon: LucideIcon; label: string; active: boolean; onClick: () => void }) {
  return (
    <GenericButton className={clsx("flex gap-2 items-center cursor-pointer py-2 px-3 text-text dark:text-text-dark hover:bg-muted dark:hover:bg-muted-dark", active && "tab--active text-white")} onClick={onClick}>
      <Icon size={16} /> {label}
    </GenericButton>
  );
}
