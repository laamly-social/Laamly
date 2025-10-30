// src/components/media/MediaGallery.tsx
import { useEffect, useMemo, useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import Card from "../ui/Card";
import { fetchUserMedia } from "../../utils/media";

type MediaItem =
  | { kind: "image"; url: string; id: string }
  | { kind: "video"; url: string; id: string };

interface MediaGalleryProps {
  /** Optional: provide items directly. If present, the component will NOT fetch. */
  items?: MediaItem[];
  /** Optional: if you later add support in fetchUserMedia to fetch by user id */
  userId?: string;
  /** Optional: override the title row text */
  title?: string;
}

export default function MediaGallery({ items, userId, title = "Media" }: MediaGalleryProps) {
  const [fetchedItems, setFetchedItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);

  const shouldFetch = !items; // fetch only when items prop is not provided

  useEffect(() => {
    if (!shouldFetch) return;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        // If you add userId support in the util, pass it here: fetchUserMedia(userId)
        const media = await fetchUserMedia();
        if (!cancelled) setFetchedItems(media);
      } catch {
        if (!cancelled) setFetchedItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [shouldFetch, userId]);

  const data: MediaItem[] = useMemo(() => (items ? items : fetchedItems), [items, fetchedItems]);

  return (
    <Card className="min-w-[60vw] max-w-[800px] mx-auto">
      <div className="p-3 border-b border-border dark:border-border-dark flex items-center gap-2.5">
        <ImageIcon size={16} /> {title}
      </div>

      <div
        className="p-3 grid gap-2.5"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}
      >
        {shouldFetch && loading ? (
          <div className="text-sub dark:text-sub-dark">Loading media...</div>
        ) : data.length === 0 ? (
          <div className="text-sub dark:text-sub-dark">No media yet. Add a post image or a reel.</div>
        ) : (
          data.map((item) =>
            item.kind === "image" ? (
              <img
                key={`${item.id}|${item.url}`}
                src={item.url}
                className="object-cover w-full h-[140px] sm:h-[180px] rounded-xl border border-border dark:border-border-dark"
                alt=""
                loading="lazy"
              />
            ) : (
              <video
                key={`${item.id}|${item.url}`}
                className="object-cover w-full h-[140px] sm:h-[180px] rounded-xl border border-border dark:border-border-dark"
                controls
                playsInline
                preload="metadata"
              >
                <source
                  src={item.url + "/raw"}
                  // Guess mime type from extension; default to mp4
                  type={(item.url.match(/\.(mp4|webm|ogg)$/i)?.[1] || "mp4")
                    .toLowerCase()
                    .replace("mp4", "video/mp4")
                    .replace("webm", "video/webm")
                    .replace("ogg", "video/ogg")}
                />
                Your browser does not support the video tag or the video failed to load.
              </video>
            )
          )
        )}
      </div>
    </Card>
  );
}
