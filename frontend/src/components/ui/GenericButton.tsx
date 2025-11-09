import React from "react";

export type GenericButtonProps =
   React.ButtonHTMLAttributes<HTMLButtonElement> & {
      children: React.ReactNode;
      className?: string;
   };

export default function GenericButton({
   children,
   className = "",
   ...props
}: GenericButtonProps) {
   return (
      <button
         className={[
            className,
            "border border-border dark:border-border-dark rounded-xl"
         ]
            .filter(Boolean)
            .join(" ")}
         {...props}>
         {children}
      </button>
   );
}
