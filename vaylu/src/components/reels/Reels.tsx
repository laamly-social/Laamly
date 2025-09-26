import { useRef, useState } from "react";
import { Upload, PlusCircle, VolumeX, Volume2, Heart, Bookmark, Share2, MessageSquare } from "lucide-react";
import { USERS } from "../../data/mock";
import { useAutoplayOnView } from "../../hooks/useAutoplayOnView";
import IconBtn from "../ui/IconBtn";
import type { Reel } from "../../types";

export default function Reels({
  reels,
  setReels,
  toggleReelLike,
  toggleReelSave,
}: {
  reels: Reel[];
  setReels: React.Dispatch<React.SetStateAction<Reel[]>>;
  toggleReelLike: (id: string) => void;
  toggleReelSave: (id: string) => void;
}) {
  const [videoUrl, setVideoUrl] = useState("");
  const [title, setTitle] = useState("");
  const [muted, setMuted] = useState(true);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  useAutoplayOnView(wrapRef);

  const onPickVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoUrl(URL.createObjectURL(file));
  };

  const addReel = () => {
    if (!videoUrl.trim()) return;
    setReels(prev => [
      { id: `r_${Date.now()}`, title: title.trim() || "Untitled", authorId: "u1", src: videoUrl.trim(), liked: false, saved: false },
      ...prev,
    ]);
    setVideoUrl("");
    setTitle("");
  };

  const togglePlay = (e: React.MouseEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  };

  return (
    <div className="reelsShell">
      <div className="reelsUploader card shell-narrow">
        <div className="card__body">
          <div className="row gap8 wrap">
            <input className="input" placeholder="Reel title (optional)" value={title} onChange={e => setTitle(e.target.value)} />
            <input className="input" placeholder="Video URL or upload" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} />
            <label className="btn btn--ghost" style={{ cursor: "pointer" }}>
              <Upload size={16} /> Upload
              <input type="file" accept="video/*" onChange={onPickVideo} style={{ display: "none" }} />
            </label>
            <button className="btn" onClick={addReel}>
              <PlusCircle size={16} /> Add Reel
            </button>
          </div>
        </div>
      </div>

      <div ref={wrapRef} className="reels reels--centered">
        {reels.map(r => {
          const u = USERS.find(x => x.id === r.authorId)!;
          return (
            <section key={r.id} className="reel">
              <video src={r.src} muted={muted} playsInline loop onClick={togglePlay} />
              <button className="mute" onClick={() => setMuted(m => !m)} aria-label="Toggle sound">
                {muted ? <VolumeX /> : <Volume2 />}
              </button>
              <div className="reel__bar">
                <div className="reel__meta">
                  <div className="row gap8">
                    <img className="avatar" src={u.avatar} alt={u.name} />
                    <div>
                      <div className="meta__title">{u.name}</div>
                      <div className="meta__sub">
                        {u.handle} • {r.title}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="actions">
                  <IconBtn icon={Heart} label="Like Reel" active={r.liked} onClick={() => toggleReelLike(r.id)} />
                  <IconBtn icon={Bookmark} label="Save Reel" active={r.saved} onClick={() => toggleReelSave(r.id)} />
                  <button className="btn btn--circle">
                    <MessageSquare size={18} />
                  </button>
                  <button className="btn btn--circle">
                    <Share2 size={18} />
                  </button>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
