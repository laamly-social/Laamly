import { useEffect } from "react";

export function useAutoplayOnView<T extends HTMLElement>(ref: React.RefObject<T | null>) {
  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const videos = Array.from(node.querySelectorAll("video")) as HTMLVideoElement[];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          if (entry.isIntersecting) video.play().catch(() => {});
          else video.pause();
        });
      },
      { threshold: 0.6 }
    );

    videos.forEach((v) => observer.observe(v));
    return () => observer.disconnect();
  }, [ref]);
}
