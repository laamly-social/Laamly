import Avatar from "../ui/Avatar";
import InputField from "../ui/InputField";
import GenericButton from "../ui/GenericButton";
import Card from "../ui/Card";
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
    <div className="h-[calc(100vh-1rem)] my-2 grid gap-8" style={{gridTemplateColumns: "20rem auto"}}>
      <Card className="shell-narrow max-w-xl mx-auto my-8">
        <div className="card__body">
          <div className="flex items-center gap-2 flex-wrap">
            <InputField className="input bg-muted dark:bg-muted-dark" placeholder="Reel title (optional)" value={title} onChange={e => setTitle(e.target.value)} />
            <InputField className="input bg-muted dark:bg-muted-dark" placeholder="Video URL or upload" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} />
            <label className="btn rounded-xl bg-transparent text-text dark:text-text-dark hover:bg-muted dark:hover:bg-muted-dark" style={{ cursor: "pointer" }}>
              <Upload size={16} /> Upload
              <InputField className="bg-muted dark:bg-muted-dark" type="file" accept="video/*" onChange={onPickVideo} style={{ display: "none" }} />
            </label>
            <GenericButton className="btn" onClick={addReel}>
              <PlusCircle size={16} /> Add Reel
            </GenericButton>
          </div>
        </div>
      </Card>

      <div ref={wrapRef} className="reels reels--centered h-full">
        {reels.map(r => {
          const u = USERS.find(x => x.id === r.authorId)!;
          return (
            <Card key={r.id} className="reel shadow-none h-full">
              <video src={r.src} muted={muted} playsInline loop onClick={togglePlay} />
              <GenericButton className="mute" onClick={() => setMuted(m => !m)} aria-label="Toggle sound">
                {muted ? <VolumeX /> : <Volume2 />}
              </GenericButton>
              <div className="reel__bar">
                <div className="reel__meta">
                  <div className="flex items-center gap-2">
                    <Avatar src={u.avatar} alt={u.name} />
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
                  <GenericButton className="btn rounded-full h-[40px] w-[40px] p-0">
                    <MessageSquare size={18} />
                  </GenericButton>
                  <GenericButton className="btn rounded-full h-[40px] w-[40px] p-0">
                    <Share2 size={18} />
                  </GenericButton>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
