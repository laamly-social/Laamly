// src/components/reels/Reels.tsx
// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import Card from "../ui/Card";
import Avatar from "../ui/Avatar";
import GenericButton from "../ui/GenericButton";
import IconBtn from "../ui/IconBtn";
import {
  Plus, // NEW: floating FAB icon
  Upload,
  VolumeX,
  Volume2,
  Heart,
  Bookmark,
  Share2,
  MessageSquare,
  Trash2,
  PlusCircle,
  X,
} from "lucide-react";
import { useAutoplayOnView } from "../../hooks/useAutoplayOnView";
import type { Reel } from "../../types";
import {
  uploadReelVideo,
  createReel,
  fetchAllReels,
  toggleReelLike,
  toggleReelSave,
  deleteReel,
} from "../../utils/reels";

type PanelMode = "composer" | "comments" | null;

export default function Reels({
  reels,
  setReels,
}: {
  reels: Reel[];
  setReels: React.Dispatch<React.SetStateAction<Reel[]>>;
}) {
  // unified floating panel
  const [panelMode, setPanelMode] = useState<PanelMode>(null);
  const [panelFor, setPanelFor] = useState<Reel | null>(null);

  // composer state
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);

  // playback
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    (async () => setReels(await fetchAllReels()))();
  }, [setReels]);

  useAutoplayOnView(wrapRef);

  // ---- panel toggles ----
  const toggleComposer = () => {
    setPanelMode((m) => (m === "composer" ? null : "composer"));
    setPanelFor(null);
  };

  const toggleComments = (r: Reel) => {
    setPanelFor((prev) => {
      const isSame = prev?.id === r.id;
      setPanelMode((m) => (m === "comments" && isSame ? null : "comments"));
      return isSame ? null : r;
    });
  };

  // ---- composer handlers ----
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
      await createReel({ title: title.trim(), description: caption.trim(), src });
      if (preview) URL.revokeObjectURL(preview);
      setFile(null);
      setPreview("");
      setTitle("");
      setCaption("");
      setPanelMode(null);
      setPanelFor(null);
      setReels(await fetchAllReels());
    } catch (e) {
      console.error(e);
      alert("Failed to create reel.");
    } finally {
      setUploading(false);
    }
  };

  // keep your click-to-play
  const togglePlay = (e: React.MouseEvent<HTMLVideoElement>) => {
    const v = e.currentTarget;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };

  const onLike = async (id: string) => {
    try {
      const { liked, likes } = await toggleReelLike(id);
      setReels((prev) => prev.map((r) => (r.id === id ? { ...r, liked, likes } : r)));
    } catch {}
  };
  const onSave = async (id: string) => {
    try {
      const { saved } = await toggleReelSave(id);
      setReels((prev) => prev.map((r) => (r.id === id ? { ...r, saved } : r)));
    } catch {}
  };
  const onDelete = async (id: string) => {
    if (!confirm("Delete this reel?")) return;
    try {
      await deleteReel(id);
      setReels((prev) => prev.filter((r) => r.id !== id));
    } catch {
      alert("Delete failed");
    }
  };

  return (
    <div className="relative">
      {/* Center column with reels */}
      <div ref={wrapRef} className="mx-auto my-6 w-full max-w-[820px] px-2">
        {reels.map((r) => (
          <Card key={r.id} className="relative overflow-hidden mb-8 p-0 rounded-2xl">
            {/* 9:16 stage — tall with rounded card */}
            <div
              className="relative w-full overflow-hidden rounded-2xl"
              style={{ aspectRatio: "9/16", maxHeight: "96vh", minHeight: "90vh" }}
            >
              <video
                src={r.src + "/raw"}
                className="absolute inset-0 w-full h-full object-cover"
                muted={muted}
                playsInline
                autoPlay
                loop
                preload="metadata"
                onClick={togglePlay}
              />

              {/* Action rail (upload removed here) */}
              <div className="absolute right-3 top-[56%] -translate-y-1/2 flex flex-col gap-3 z-10">
                <button
                  className="backdrop-blur bg-black/35 hover:bg-black/45 text-white rounded-full h-11 w-11 grid place-items-center"
                  onClick={() => setMuted((m) => !m)}
                  title="Sound"
                >
                  {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>

                <button
                  className="backdrop-blur bg-black/35 hover:bg-black/45 text-white rounded-full h-11 w-11 grid place-items-center"
                  onClick={() => onLike(r.id)}
                  title="Like"
                >
                  <Heart size={18} />
                </button>
                <div className="text-center text-xs text-white drop-shadow">{r.likes ?? 0}</div>

                <button
                  className="backdrop-blur bg-black/35 hover:bg-black/45 text-white rounded-full h-11 w-11 grid place-items-center"
                  onClick={() => onSave(r.id)}
                  title="Save"
                >
                  <Bookmark size={18} />
                </button>

                <button
                  className="backdrop-blur bg-black/35 hover:bg-black/45 text-white rounded-full h-11 w-11 grid place-items-center"
                  onClick={() => toggleComments(r)}
                  title="Comments"
                >
                  <MessageSquare size={18} />
                </button>

                <button
                  className="backdrop-blur bg-black/35 hover:bg-black/45 text-white rounded-full h-11 w-11 grid place-items-center"
                  title="Share"
                >
                  <Share2 size={18} />
                </button>

                {r.authorInfo?.isCurrentUser && (
                  <button
                    className="backdrop-blur bg-black/35 hover:bg-black/45 text-white rounded-full h-11 w-11 grid place-items-center"
                    onClick={() => onDelete(r.id)}
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>

              {/* Bottom meta */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4">
                <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="relative flex items-center gap-3 text-white">
                  <Avatar src={r.authorInfo?.avatar || ""} alt={r.authorInfo?.name || ""} />
                  <div>
                    <div className="font-semibold leading-tight">{r.authorInfo?.name || "Unknown"}</div>
                    <div className="text-sm opacity-80 leading-tight">
                      @{r.authorInfo?.handle || "unknown"} {r.title ? `• ${r.title}` : ""}
                    </div>
                  </div>
                </div>
                {r.description && (
                  <div className="relative mt-2 text-sm text-white/90 line-clamp-3">{r.description}</div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* FAB: bottom-right “+” opens composer */}
      {!panelMode && (
        <button
          onClick={toggleComposer}
          aria-label="Create reel"
          className="
            fixed right-6 bottom-6 z-40
            h-14 w-14 rounded-full
            bg-accent text-white
            shadow-xl hover:shadow-2xl
            transition-all active:scale-95
            flex items-center justify-center
          "
        >
          <Plus size={24} />
        </button>
      )}

      {/* Dim background when panel visible (click to close) */}
      {panelMode && (
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onClick={() => {
            setPanelMode(null);
            setPanelFor(null);
          }}
        />
      )}

      {/* Floating rounded right panel */}
      {panelMode && (
        <aside className="fixed right-4 top-4 bottom-4 w-[420px] max-w-[92vw] bg-bg dark:bg-bg-dark border border-border dark:border-border-dark rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-border dark:border-border-dark">
            <div className="font-semibold">
              {panelMode === "composer" ? "Add Reel" : "Comments"}
            </div>
            <button
              className="btn rounded-full h-[32px] w-[32px] p-0"
              onClick={() => {
                setPanelMode(null);
                setPanelFor(null);
              }}
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          {panelMode === "composer" ? (
            <div className="p-4 grid gap-3 overflow-auto">
              <input
                className="input bg-muted dark:bg-muted-dark"
                placeholder="Title (optional)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <textarea
                className="input bg-muted dark:bg-muted-dark min-h-[96px]"
                placeholder="Write a caption…"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
              {preview && (
                <video className="rounded-xl w-full" src={preview} muted controls playsInline preload="metadata" />
              )}
              <div className="flex items-center gap-2">
                <label className="btn rounded-xl bg-transparent hover:bg-muted dark:hover:bg-muted-dark cursor-pointer">
                  <Upload size={16} /> Upload video
                  <input type="file" accept="video/*" onChange={onPickVideo} className="hidden" />
                </label>
                <GenericButton className="btn" onClick={addReel} disabled={!file || uploading}>
                  <PlusCircle size={16} /> {uploading ? "Posting…" : "Add Reel"}
                </GenericButton>
              </div>
            </div>
          ) : (
            <div className="p-4 text-sm overflow-auto">
              {panelFor ? (
                <>
                  <div className="mb-2 font-medium">@{panelFor.authorInfo?.handle}</div>
                  <div className="bg-muted dark:bg-muted-dark rounded-lg p-3">
                    Comments API not implemented yet.
                  </div>
                </>
              ) : (
                <div className="opacity-70">No reel selected.</div>
              )}
            </div>
          )}
        </aside>
      )}
    </div>
  );
}