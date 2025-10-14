// @ts-nocheck
import { useEffect } from "react";

/**
 * Autoplay/pause <video> elements inside `ref` based on intersection.
 * Re-runs when `deps` change so newly-rendered videos are observed.
 */
export function useAutoplayOnView<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  deps: any[] = []
) {
  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const videos = Array.from(node.querySelectorAll("video")) as HTMLVideoElement[];
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const v = e.target as HTMLVideoElement;
          if (e.isIntersecting) {
            // chrome/iOS need muted + playsInline (we set those on the element)
            v.play().catch(() => {});
          } else {
            v.pause();
          }
        });
      },
      { threshold: 0.6 }
    );

    videos.forEach((v) => io.observe(v));

    // try to start the first already-in-view video
    videos.forEach((v) => {
      const r = v.getBoundingClientRect();
      const inView = r.top >= 0 && r.bottom <= (window.innerHeight || document.documentElement.clientHeight);
      if (inView) v.play().catch(() => {});
    });

    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, ...deps]);
}
