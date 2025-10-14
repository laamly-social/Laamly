// @ts-nocheck
import Avatar from "../ui/Avatar";
import GenericButton from "../ui/GenericButton";
import Card from "../ui/Card";
import { useEffect, useRef, useState } from "react";
import { Upload, PlusCircle, VolumeX, Volume2, Heart, Bookmark, Share2, MessageSquare, Trash2 } from "lucide-react";
import { useAutoplayOnView } from "../../hooks/useAutoplayOnView";
import IconBtn from "../ui/IconBtn";
import type { Reel } from "../../types";
import { uploadReelVideo, createReel, fetchAllReels, toggleReelLike, toggleReelSave, deleteReel } from "../../utils/reels";

export default function Reels({
  reels,
  setReels,
}: {
  reels: Reel[];
  setReels: React.Dispatch<React.SetStateAction<Reel[]>>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [muted, setMuted] = useState(true);
  const [uploading, setUploading] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  useAutoplayOnView(wrapRef);

  useEffect(() => { (async () => setReels(await fetchAllReels()))(); }, [setReels]);

  const onPickVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : "");
  };

  const addReel = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const src = await uploadReelVideo(file);
      await createReel({ title: title.trim(), description: description.trim(), src });
      // reset and refresh
      if (preview) URL.revokeObjectURL(preview);
      setFile(null); setPreview(""); setTitle(""); setDescription("");
      setReels(await fetchAllReels());
    } catch (e) {
      console.error(e);
      alert("Failed to create reel.");
    } finally {
      setUploading(false);
    }
  };

  const togglePlay = (e: React.MouseEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  };

  const onLike = async (id: string) => {
    try {
      const { liked, likes } = await toggleReelLike(id);
      setReels(prev => prev.map(r => r.id === id ? { ...r, liked, likes } : r));
    } catch { /* ignore */ }
  };

  const onSave = async (id: string) => {
    try {
      const { saved } = await toggleReelSave(id);
      setReels(prev => prev.map(r => r.id === id ? { ...r, saved } : r));
    } catch { /* ignore */ }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete this reel?")) return;
    try {
      await deleteReel(id);
      setReels(prev => prev.filter(r => r.id !== id));
    } catch { alert("Delete failed"); }
  };

  return (
    <div className="h-[calc(100vh-1rem)] my-2 grid gap-8" style={{ gridTemplateColumns: "20rem auto" }}>
      {/* Composer */}
      <Card className="shell-narrow max-w-xl mx-auto my-8">
        <div className="card__body">
          <div className="grid gap-2">
            <input
              className="input bg-muted dark:bg-muted-dark"
              placeholder="Title (optional)"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
            <textarea
              className="input bg-muted dark:bg-muted-dark min-h-[80px]"
              placeholder="Description (optional)"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
            <div className="flex items-center gap-2 flex-wrap">
              <label className="btn rounded-xl bg-transparent text-text dark:text-text-dark hover:bg-muted dark:hover:bg-muted-dark" style={{ cursor: "pointer" }}>
                <Upload size={16} /> Upload video
                <input type="file" accept="video/*" onChange={onPickVideo} style={{ display: "none" }} />
              </label>
              <GenericButton className="btn" onClick={addReel} disabled={!file || uploading}>
                <PlusCircle size={16} /> {uploading ? "Posting…" : "Add Reel"}
              </GenericButton>
            </div>

            {preview && (
              <video className="w-full rounded-xl" src={preview} muted controls playsInline />
            )}
          </div>
        </div>
      </Card>

      {/* Feed */}
      <div ref={wrapRef} className="reels reels--centered h-full">
        {reels.map(r => (
          <Card key={r.id} className="reel shadow-none h-full">
            <video src={r.src} muted={muted} playsInline loop onClick={togglePlay} />
            <GenericButton className="mute" onClick={() => setMuted(m => !m)} aria-label="Toggle sound">
              {muted ? <VolumeX /> : <Volume2 />}
            </GenericButton>

            <div className="reel__bar">
              <div className="reel__meta">
                <div className="flex items-center gap-2">
                  <Avatar src={r.authorInfo?.avatar || ""} alt={r.authorInfo?.name || ""} />
                  <div>
                    <div className="meta__title">{r.authorInfo?.name || "Unknown"}</div>
                    <div className="meta__sub">
                      @{r.authorInfo?.handle || "unknown"} • {r.title || "Untitled"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="actions">
                <IconBtn icon={Heart} label="Like Reel" active={r.liked} count={r.likes} onClick={() => onLike(r.id)} />
                <IconBtn icon={Bookmark} label="Save Reel" active={r.saved} onClick={() => onSave(r.id)} />
                {/* You can wire these later */}
                <GenericButton className="btn rounded-full h-[40px] w-[40px] p-0">
                  <MessageSquare size={18} />
                </GenericButton>
                <GenericButton className="btn rounded-full h-[40px] w-[40px] p-0">
                  <Share2 size={18} />
                </GenericButton>
                {r.authorInfo?.isCurrentUser && (
                  <GenericButton className="btn rounded-full h-[40px] w-[40px] p-0" onClick={() => onDelete(r.id)}>
                    <Trash2 size={18} />
                  </GenericButton>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
