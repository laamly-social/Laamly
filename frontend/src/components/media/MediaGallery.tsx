
import { Image as ImageIcon } from "lucide-react";
import Card from "../ui/Card";

export default function MediaGallery({
  items,
}: {
  items: Array<{ kind: "image" | "video"; url: string; id: string }>;
}) {
  return (
    <Card className="min-w-[60vw]">
      <div className="card_header border-b-1 border-border dark:border-border-dark">
        <ImageIcon size={16} /> Media
      </div>
      <div className="card__body grid gap-2.5" style={{
        gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))"
      }}>
        {items.map(item =>
          item.kind === "image" ? (
            <img key={item.id} src={item.url} className="object-cover w-full h-[180px] rounded-xl border-1 border-border dark:border-border-dark" alt="media" />
          ) : (
            <video key={item.id} src={item.url} className="object-cover w-full h-[180px] rounded-xl border-1 border-border dark:border-border-dark" muted controls />
          )
        )}
        {items.length === 0 && <div className="muted">No media yet. Add a post image or a reel.</div>}
      </div>
    </Card>
  );
}
