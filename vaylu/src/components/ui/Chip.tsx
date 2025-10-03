import React from "react";
import GenericButton, { type GenericButtonProps } from "./GenericButton";
import { clsx } from "../../utils";

interface ChipProps extends GenericButtonProps {
  active?: boolean;
}

export default function Chip({ active = false, className = "", children, ...props }: ChipProps) {
  return (
    <GenericButton
      className={clsx(
        "rounded-full", "bg-muted", "dark:bg-muted-dark", "border-1", "border-border", "dark:border-border-dark", "text-text", "dark:text-text-dark", "cursor-pointer", "transition-colors", "hover:bg-border px-2", "dark:hover:bg-border-dark",
        active && "outline-accent outline-2 bg-accent dark:bg-accent-dark text-white border-transparent",
        className
      )}
      {...props}
    >
      {children}
    </GenericButton>
  );
}
