import GenericButton, { type GenericButtonProps } from "./GenericButton";
import { clsx } from "../../utils";

interface ChipProps extends GenericButtonProps {
  active?: boolean;
}

export default function Chip({ active = false, className = "", children, ...props }: ChipProps) {
  return (
    <GenericButton
      className={clsx(
        "rounded-full bg-muted border-2 dark:bg-muted-dark border-transparent dark:border-transparent text-text dark:text-text-dark transition-colors hover:bg-border mx-1 px-2 dark:hover:bg-border-dark",
        active && "border-2 border-red-500 dark:bg-red-500",
        className
      )}
      {...props}
    >
      {children}
    </GenericButton>
  );
}
