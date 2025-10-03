import React from "react";

interface AvatarProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClass = {
  sm: "avatar--sm",
  md: "",
  lg: "avatar--lg"
};

export default function Avatar({ src, alt, size = "md", className = "", ...props }: AvatarProps) {
  return (
    <img
      src={src}
      alt={alt}
      className={["avatar", "hover:scale-135", "transition", sizeClass[size], className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}
