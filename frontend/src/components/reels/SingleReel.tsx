// @ts-nocheck
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchReelById, toggleReelLike, toggleReelSave, deleteReel } from "../../utils/reels";
import Reel from "./Reel";
import type { Reel as ReelType } from "../../types";
import { ArrowLeft, X } from "lucide-react";
import GenericButton from "../ui/GenericButton";
import ReelComments from "./ReelComments";

type PanelMode = "comments" | null;

export default function SingleReel({ user }: { user: any }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [reel, setReel] = useState<ReelType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  const [panelMode, setPanelMode] = useState<PanelMode>(null);

  useEffect(() => {
    if (!id) return;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const fetchedReel = await fetchReelById(id);
        if (fetchedReel) {
          setReel(fetchedReel);
        } else {
          setError("Reel not found");
        }
      } catch (err) {
        setError("Failed to load reel");
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const togglePlay = (e: React.MouseEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    video.paused ? video.play() : video.pause();
  };

  const handleLike = async (reelId: string) => {
    if (!user) return;
    try {
      const result = await toggleReelLike(reelId);
      setReel((prev) => {
        if (!prev) return prev;
        return { ...prev, liked: result.liked, likes: result.likes };
      });
    } catch (err) {
      console.error("Failed to toggle like:", err);
    }
  };

  const handleSave = async (reelId: string) => {
    if (!user) return;
    try {
      const result = await toggleReelSave(reelId);
      setReel((prev) => {
        if (!prev) return prev;
        return { ...prev, saved: result.saved };
      });
    } catch (err) {
      console.error("Failed to toggle save:", err);
    }
  };

  const handleDelete = async (reelId: string) => {
    if (!confirm("Delete this reel?")) return;
    try {
      await deleteReel(reelId);
      navigate("/reels");
    } catch (err) {
      console.error("Failed to delete reel:", err);
      alert("Failed to delete reel");
    }
  };

  const toggleComments = (reel: ReelType) => {
    setPanelMode((prev) => (prev === "comments" ? null : "comments"));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg dark:bg-bg-dark">
        <div className="text-lg text-sub dark:text-sub-dark">Loading reel...</div>
      </div>
    );
  }

  if (error || !reel) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-bg dark:bg-bg-dark">
        <div className="text-lg text-sub dark:text-sub-dark">{error || "Reel not found"}</div>
        <GenericButton onClick={() => navigate("/reels")}>
          <ArrowLeft size={18} />
          Back to Reels
        </GenericButton>
      </div>
    );
  }

  return (
    <div className="relative h-screen overflow-hidden md:bg-bg dark:md:bg-bg-dark bg-black flex">
      {/* Back button - top left - mobile only */}
      <button
        className="md:hidden fixed top-4 left-4 bg-white/20 hover:bg-white/30 dark:bg-black/20 hover:dark:bg-black/30 text-white backdrop-blur-xl rounded-full h-10 w-10 grid place-items-center shadow-lg z-50 transition-transform hover:scale-110"
        onClick={() => navigate("/reels")}
        title="Back to reels"
      >
        <ArrowLeft size={20} />
      </button>

      <div className="h-full w-full flex items-center justify-center">
        <Reel
          reel={reel}
          index={0}
          muted={muted}
          setItemRef={() => {}}
          togglePlay={togglePlay}
          setMuted={setMuted}
          onLike={handleLike}
          onSave={handleSave}
          toggleComments={toggleComments}
          onDelete={handleDelete}
          user={user}
        />
      </div>

      {/* Comments panel - Desktop: side panel, Mobile: bottom sheet */}
      {panelMode === "comments" && reel && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setPanelMode(null)}
        >
          {/* Desktop side panel */}
          <div
            className="hidden md:block absolute right-0 top-0 bottom-0 w-full max-w-md bg-bg dark:bg-bg-dark shadow-xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border dark:border-border-dark">
              <div className="font-semibold text-lg">Comments</div>
              <button
                className="inline-flex gap-2 items-center justify-center rounded-full h-[32px] w-[32px] p-0 bg-accent text-white cursor-pointer"
                onClick={() => setPanelMode(null)}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4">
              <ReelComments
                reel={reel}
                onClose={() => setPanelMode(null)}
                onUpdate={(updatedReel) => setReel(updatedReel)}
                user={user}
              />
            </div>
          </div>

          {/* Mobile bottom sheet */}
          <div
            className="md:hidden absolute bottom-0 left-0 right-0 bg-bg dark:bg-bg-dark rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300"
            style={{ height: "75vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="flex items-center justify-center pt-2 pb-1">
              <div className="w-12 h-1 bg-border dark:bg-border-dark rounded-full" />
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-b border-border dark:border-border-dark">
              <div className="font-semibold text-lg">Comments</div>
              <button
                className="inline-flex gap-2 items-center justify-center rounded-full h-[32px] w-[32px] p-0 bg-accent text-white cursor-pointer"
                onClick={() => setPanelMode(null)}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 text-sm overflow-auto flex-1">
              <ReelComments
                reel={reel}
                onClose={() => setPanelMode(null)}
                onUpdate={(updatedReel) => setReel(updatedReel)}
                user={user}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
