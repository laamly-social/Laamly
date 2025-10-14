// src/components/reels/Reels.tsx
// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import Card from "../ui/Card";
import Avatar from "../ui/Avatar";
import GenericButton from "../ui/GenericButton";
import {
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
  // Floating panel (composer / comments)
  const [panelMode, setPanelMode] = useState<PanelMode>(null);
  const [panelFor, setPanelFor] = useState<Reel | null>(null);

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
  useEffect(() => { (async () => setReels(await fetchAllReels()))(); }, [setReels]);

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

    root.addEventListener("touchstart", start, { passive: false });
    root.addEventListener("touchmove", move, { passive: false });
    root.addEventListener("touchend", end);
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

      const next =
        e.key === "ArrowDown"
          ? clamp(active + 1)
          : clamp(active - 1);

      if (next !== active) goToIndex(next);
    };
    window.addEventListener("keydown", onKey, { passive: false });
    return () => window.removeEventListener("keydown", onKey);
  }, [active, panelMode, reels.length]);

  // Panel toggles
  const toggleComposer = () => {
    setPanelMode((m) => (m === "composer" ? null : "composer"));
    setPanelFor(null);
  };
  const toggleComments = (r: Reel) => {
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
      setFile(null); setPreview(""); setTitle(""); setCaption("");
      setPanelMode(null); setPanelFor(null);
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
    } catch { alert("Delete failed"); }
  };

  return (
    <div className="relative">
      {/* Hide scrollbar in FF/WebKit */}
      <style>{`
        .reelSnapViewport { scrollbar-width: none; }
        .reelSnapViewport::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Snapping viewport (we also programmatically lock to pages) */}
      <div
        ref={wrapRef}
        className="reelSnapViewport mx-auto w-full max-w-[820px] px-2"
        style={{
          height: "calc(100vh - 24px)",
          overflowY: "auto",
          scrollSnapType: "y mandatory",
          scrollBehavior: "smooth",
          background: "transparent",
        }}
      >
        {reels.map((r, i) => (
          <Card
            key={r.id}
            ref={setItemRef(i)}
            data-idx={i}
            className="relative overflow-hidden p-0"
            style={{
              margin: "18px 0",
              scrollSnapAlign: "start",
              borderRadius: 18,
            }}
          >
            {/* Stage 9:16; tall but view-safe */}
            <div
              className="relative w-full overflow-hidden"
              style={{ aspectRatio: "9/16", minHeight: "88vh", maxHeight: "96vh" }}
              data-idx={i}
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

              {/* Action rail */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-10">
                <button
                  className="backdrop-blur bg-black/35 hover:bg-black/45 text-white rounded-full h-11 w-11 grid place-items-center"
                  title="Upload reel"
                  onClick={toggleComposer}
                >
                  <Upload size={18} />
                </button>

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
                    <div className="font-semibold leading-tight">
                      {r.authorInfo?.name || "Unknown"}
                    </div>
                    <div className="text-sm opacity-80 leading-tight">
                      @{r.authorInfo?.handle || "unknown"} {r.title ? `• ${r.title}` : ""}
                    </div>
                  </div>
                </div>
                {r.description && (
                  <div className="relative mt-2 text-sm text-white/90 line-clamp-3">
                    {r.description}
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Dim background when panel visible */}
      {panelMode && (
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onClick={() => { setPanelMode(null); setPanelFor(null); }}
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
              onClick={() => { setPanelMode(null); setPanelFor(null); }}
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