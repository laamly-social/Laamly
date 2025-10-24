// src/components/reels/Reels.tsx
// @ts-nocheck
import ReelComments from "./ReelComments";
import { useEffect, useRef, useState } from "react";
import GenericButton from "../ui/GenericButton";
import { Upload, PlusCircle, X } from "lucide-react";
import type { Reel as ReelType } from "../../types";
import {
  uploadReelVideo,
  createReel,
  fetchAllReels,
  toggleReelLike,
  toggleReelSave,
  deleteReel,
} from "../../utils/reels";
import Reel from "./Reel";

type PanelMode = "composer" | "comments" | null;

export default function Reels({
  reels,
  setReels,
}: {
  reels: ReelType[];
  setReels: React.Dispatch<React.SetStateAction<ReelType[]>>;
}) {
  // Floating panel (composer / comments)
  const [panelMode, setPanelMode] = useState<PanelMode>(null);
  const [panelFor, setPanelFor] = useState<ReelType | null>(null);

  // Composer
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);

  // Playback + navigation
  const wrapRef = useRef<HTMLDivElement | null>(null); // scroll viewport
  const itemRefs = useRef<HTMLDivElement[]>([]); // page nodes
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);

  // Paging control flags
  const isPagingRef = useRef(false); // throttle while animating
  const wheelAccumRef = useRef(0);
  const wheelTimerRef = useRef<number | null>(null);

  // Touch tracking
  const touchStartY = useRef<number | null>(null);
  const touchDeltaY = useRef(0);

  // Load data
  useEffect(() => {
    (async () => setReels(await fetchAllReels()))();
  }, [setReels]);

  // Helpers
  const clamp = (n: number, min = 0, max = itemRefs.current.length - 1) =>
    Math.max(min, Math.min(max, n));

  const setItemRef = (idx: number) => (el: HTMLDivElement | null) => {
    if (el) itemRefs.current[idx] = el;
  };

  const goToIndex = (idx: number) => {
    const root = wrapRef.current;
    const el = itemRefs.current[idx];
    if (!root || !el) return;
    setActive(idx);
    isPagingRef.current = true;

    const top = el.offsetTop - root.offsetTop;
    root.scrollTo({ top, behavior: "smooth" });

    // simple settle timer; browsers differ on scrollend support
    window.setTimeout(() => {
      isPagingRef.current = false;
      // ensure we're aligned (snap helps too)
      const fix = el.offsetTop - root.offsetTop;
      if (Math.abs(root.scrollTop - fix) > 2) root.scrollTop = fix;
    }, 420);
  };

  // IntersectionObserver to catch manual drags (e.g., scrollbar or touch)
  useEffect(() => {
    const root = wrapRef.current;
    if (!root || !itemRefs.current.length) return;

    const obs = new IntersectionObserver(
      (entries) => {
        if (isPagingRef.current) return;
        let bestIdx = active;
        let best = 0;
        for (const e of entries) {
          const idx = Number((e.target as HTMLElement).dataset.idx || 0);
          if (e.intersectionRatio > best) {
            best = e.intersectionRatio;
            bestIdx = idx;
          }
        }
        if (best >= 0.55 && bestIdx !== active) setActive(bestIdx);
      },
      { root, threshold: Array.from({ length: 11 }, (_, i) => i / 10) }
    );

    itemRefs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [reels.length]); // rerun when count changes

  // Play only the active video
  useEffect(() => {
    const root = wrapRef.current;
    if (!root) return;
    const vids = Array.from(root.querySelectorAll("video")) as HTMLVideoElement[];
    vids.forEach((v, i) => {
      v.muted = muted;
      if (i === active) v.play().catch(() => {});
      else v.pause();
    });
  }, [active, muted, reels.length]);

  // Wheel: convert continuous deltas into discrete page steps
  useEffect(() => {
    const root = wrapRef.current;
    if (!root) return;

    const onWheel = (e: WheelEvent) => {
      if (panelMode) return; // don't steal scroll when panel open
      e.preventDefault();

      if (isPagingRef.current) return; // still snapping to previous command

      wheelAccumRef.current += e.deltaY;
      // debounce accumulation just a hair; trackpads emit many tiny deltas
      if (wheelTimerRef.current) window.clearTimeout(wheelTimerRef.current);
      wheelTimerRef.current = window.setTimeout(() => {
        const amount = wheelAccumRef.current;
        wheelAccumRef.current = 0;
        if (Math.abs(amount) < 30) return; // ignore micro scroll

        const dir = amount > 0 ? 1 : -1;
        const next = clamp(active + dir);
        if (next !== active) goToIndex(next);
      }, 24);
    };

    root.addEventListener("wheel", onWheel, { passive: false });
    return () => root.removeEventListener("wheel", onWheel as any);
  }, [active, panelMode, reels.length]);

  // Touch swipe -> discrete page
  useEffect(() => {
    const root = wrapRef.current;
    if (!root) return;

    const start = (e: TouchEvent) => {
      if (panelMode) return;
      touchStartY.current = e.touches[0].clientY;
      touchDeltaY.current = 0;
    };
    const move = (e: TouchEvent) => {
      if (panelMode) return;
      if (touchStartY.current == null) return;
      const y = e.touches[0].clientY;
      touchDeltaY.current = y - touchStartY.current;
      // prevent native scroll to keep lock feeling
      if (Math.abs(touchDeltaY.current) > 10) e.preventDefault();
    };
    const end = () => {
      if (panelMode) return;
      const dy = touchDeltaY.current;
      touchStartY.current = null;
      touchDeltaY.current = 0;
      if (isPagingRef.current) return;

      if (Math.abs(dy) > 40) {
        const dir = dy < 0 ? 1 : -1; // swipe up => next
        const next = clamp(active + dir);
        if (next !== active) goToIndex(next);
      }
    };

    root.addEventListener("touchstart", start as any, { passive: false });
    root.addEventListener("touchmove", move as any, { passive: false });
    root.addEventListener("touchend", end as any);
    return () => {
      root.removeEventListener("touchstart", start as any);
      root.removeEventListener("touchmove", move as any);
      root.removeEventListener("touchend", end as any);
    };
  }, [active, panelMode, reels.length]);

  // Arrow keys: discrete page
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (panelMode) return;
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      if (isPagingRef.current) return;

      const next = e.key === "ArrowDown" ? clamp(active + 1) : clamp(active - 1);
      if (next !== active) goToIndex(next);
    };
    window.addEventListener("keydown", onKey as any, { passive: false });
    return () => window.removeEventListener("keydown", onKey as any);
  }, [active, panelMode, reels.length]);

  // Panel toggles
  const toggleComposer = () => {
    setPanelMode((m) => (m === "composer" ? null : "composer"));
    setPanelFor(null);
  };
  const toggleComments = (r: ReelType) => {
    setPanelFor((prev) => {
      const same = prev?.id === r.id;
      setPanelMode((m) => (m === "comments" && same ? null : "comments"));
      return same ? null : r;
    });
  };

  // Composer handlers
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
    <div className="relative overflow-hidden h-screen flex">
      {/* Hide scrollbar in FF/WebKit */}
      <style>{`
        .reelSnapViewport { scrollbar-width: none; }
        .reelSnapViewport::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Snapping viewport (we also programmatically lock to pages) */}
      <div
        ref={wrapRef}
        className={`reelSnapViewport mx-auto h-full px-2 md:px-0 transition-all duration-300 ${
          panelMode ? "w-1/2" : "w-full"
        }`}
        style={{
          overflowY: "auto",
          scrollSnapType: "y mandatory",
          scrollBehavior: "smooth",
        }}
      >
        {reels.map((r, i) => (
          <Reel
            key={r.id}
            reel={r}
            index={i}
            muted={muted}
            setItemRef={setItemRef(i)}
            togglePlay={togglePlay}
            setMuted={setMuted}
            onLike={onLike}
            onSave={onSave}
            toggleComments={toggleComments}
            onDelete={onDelete}
          />
        ))}
      </div>

      {/* Side panel (composer / comments) */}
      {panelMode && (
        <aside className="w-1/2 h-full bg-bg dark:bg-bg-dark border-l border-border dark:border-border-dark flex flex-col overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-border dark:border-border-dark">
            <div className="font-semibold">
              {panelMode === "composer" ? "Add Reel" : "Comments"}
            </div>
            <button
              className="inline-flex gap-2 items-center justify-center rounded-full h-[32px] w-[32px] p-0 bg-accent text-white cursor-pointer"
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
                <video
                  className="rounded-xl w-full"
                  src={preview}
                  muted
                  controls
                  playsInline
                  preload="metadata"
                />
              )}
              <div className="flex items-center gap-2">
                <label className="inline-flex gap-2 items-center justify-center h-9 px-3 rounded-xl bg-transparent hover:bg-muted dark:hover:bg-muted-dark cursor-pointer">
                  <Upload size={16} /> Upload video
                  <input type="file" accept="video/*" onChange={onPickVideo} className="hidden" />
                </label>
                <GenericButton
                  className="inline-flex gap-2 items-center justify-center h-9 px-3 bg-accent text-white cursor-pointer"
                  onClick={addReel}
                  disabled={!file || uploading}
                >
                  <PlusCircle size={16} /> {uploading ? "Posting…" : "Add Reel"}
                </GenericButton>
              </div>
            </div>
          ) : (
            <div className="p-4 text-sm overflow-auto">
              {panelFor ? (
                <>
                  <div className="mb-2 font-medium">@{panelFor.authorInfo?.handle}</div>
                  {/* ✅ Comments panel */}
                  <ReelComments
                    reel={panelFor}
                    onAdd={async () => {
                      // Refresh list so the parent feed reflects the new comment count + authorInfo
                      setReels(await fetchAllReels());
                    }}
                  />
                </>
              ) : (
                <div className="opacity-70">No reel selected.</div>
              )}
            </div>
          )}
        </aside>
      )}

      {/* Fixed floating button - bottom right */}
      <button
        className="fixed bottom-24 md:bottom-6 right-6 bg-accent hover:bg-accent-dark text-white rounded-full h-14 w-14 grid place-items-center shadow-lg z-30 transition-transform hover:scale-110"
        onClick={toggleComposer}
        title="Create new reel"
      >
        <PlusCircle size={24} />
      </button>
    </div>
  );
}
