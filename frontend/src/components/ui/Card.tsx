import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
}

export default function Card({ className = "", children, ...props }: CardProps) {
  return (
    <div className={["card", "bg-panel", "dark:bg-panel-dark", "border-1", "border-border", "dark:border-border-dark", "rounded-xl", "overflow-hidden", "mt-4", className].filter(Boolean).join(" ")} {...props}>
      {children}
    </div>
  );
}
