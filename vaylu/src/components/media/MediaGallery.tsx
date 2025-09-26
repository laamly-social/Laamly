import { Image as ImageIcon } from "lucide-react";

export default function MediaGallery({
  items,
}: {
  items: Array<{ kind: "image" | "video"; url: string; id: string }>;
}) {
  return (
    <div className="card">
      <div className="card__header">
        <ImageIcon size={16} /> Media
      </div>
      <div className="card__body gallery">
        {items.map(item =>
          item.kind === "image" ? (
            <img key={item.id} src={item.url} className="gallery__item" alt="media" />
          ) : (
            <video key={item.id} src={item.url} className="gallery__item" muted controls />
          )
        )}
        {items.length === 0 && <div className="muted">No media yet. Add a post image or a reel.</div>}
      </div>
    </div>
  );
}
