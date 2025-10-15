

import { useEffect, useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import Card from "../ui/Card";
import { fetchUserMedia } from "../../utils/media";

export default function MediaGallery() {
  const [items, setItems] = useState<Array<{ kind: "image" | "video"; url: string; id: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const media = await fetchUserMedia();
        setItems(media);
      } catch (e) {
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <Card className="min-w-[60vw]">
      <div className="p-3 border-b border-border dark:border-border-dark flex items-center gap-2.5">
        <ImageIcon size={16} /> Media
      </div>
      <div className="p-3 grid gap-2.5" style={{
        gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))"
      }}>
        {loading ? (
          <div className="text-sub dark:text-sub-dark">Loading media...</div>
        ) : items.length === 0 ? (
          <div className="text-sub dark:text-sub-dark">No media yet. Add a post image or a reel.</div>
        ) : (
          items.map(item =>
            item.kind === "image" ? (
              <img key={item.id + item.url} src={item.url} className="object-cover w-full h-[180px] rounded-xl border border-border dark:border-border-dark" alt="media" />
            ) : (
              <video key={item.id + item.url} className="object-cover w-full h-[180px] rounded-xl border border-border dark:border-border-dark" controls>
                <source
                  src={item.url + "/raw"}
                  type={(() => {
                    const match = item.url.match(/\.(mp4|webm|ogg)$/i);
                    if (!match) return "video/mp4";
                    switch (match[1].toLowerCase()) {
                      case "mp4":
                        return "video/mp4";
                      case "webm":
                        return "video/webm";
                      case "ogg":
                        return "video/ogg";
                      default:
                        return "video/mp4";
                    }
                  })()}
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