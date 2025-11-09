import React from "react";

interface AvatarProps extends React.ImgHTMLAttributes<HTMLImageElement> {
   src: string;
   alt: string;
   size?: "xs" | "sm" | "md" | "lg";
   className?: string;
}

const sizeClass = {
   xs: "w-5 h-5",
   sm: "w-8 h-8",
   md: "w-10 h-10",
   lg: "w-16 h-16"
};

export default function Avatar({
   src,
   alt,
   size = "md",
   className = "",
   ...props
}: AvatarProps) {
   return (
      <img
         src={src}
         alt={alt}
         className={[
            "object-cover border border-border dark:border-border-dark",
            "rounded-full",
            "hover:scale-125",
            "transition",
            sizeClass[size],
            className
         ]
            .filter(Boolean)
            .join(" ")}
         {...props}
      />
   );
}
