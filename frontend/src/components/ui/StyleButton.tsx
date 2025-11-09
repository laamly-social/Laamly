interface StyledButtonProps {
   label: string;
   onClick: () => void;
   disabled?: boolean;
   className?: string;
   variant?: "primary" | "secondary";
   type?: "button" | "submit" | "reset";
   shadowy?: boolean;
}

export default function StyledButton({
   label,
   onClick,
   disabled = false,
   className = "",
   variant = "primary",
   shadowy = false,
   type = "button"
}: StyledButtonProps) {
   return (
      <button
         type={type}
         onClick={onClick}
         disabled={disabled}
         className={`inline px-3 py-1 rounded-xl text-sm font-medium border transition-all ${
            variant === "secondary"
               ? "bg-muted dark:bg-muted-dark text-sub dark:text-sub-dark border border-border dark:border-border-dark"
               : `${shadowy ? "opacity-80 hover:opacity-100" : ""} bg-accent dark:bg-accent-dark text-white border-accent-dark dark:border-accent`
         } disabled:opacity-60 disabled:cursor-not-allowed ${className}`}>
         {label}
      </button>
   );
}
