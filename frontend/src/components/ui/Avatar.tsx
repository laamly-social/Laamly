import React from "react";

interface AvatarProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const sizeClass = {
  xs: "w-3 h-3",
  sm: "w-6 h-6",
  md: "",
  lg: "w-16 h-16"
};

export default function Avatar({ src, alt, size = "md", className = "", ...props }: AvatarProps) {
  return (
    <img
      src={src}
      alt={alt}
      className={["object-cover border border-border dark:border-border-dark", "w-10", "h-10", "rounded-full", "hover:scale-125", "transition", sizeClass[size], className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}
