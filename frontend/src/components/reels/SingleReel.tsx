// @ts-nocheck
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchReelById, toggleReelLike, toggleReelSave, deleteReel } from "../../utils/reels";
import Reel from "./Reel";
import type { Reel as ReelType } from "../../types";
import { ArrowLeft } from "lucide-react";
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
    <div className="relative h-screen overflow-hidden bg-bg dark:bg-bg-dark">
      <div className="h-full flex items-center justify-center">
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

      {/* Comments panel */}
      {panelMode === "comments" && reel && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => setPanelMode(null)}
        >
          <div
            className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-bg dark:bg-bg-dark shadow-xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <ReelComments
              reel={reel}
              onClose={() => setPanelMode(null)}
              onUpdate={(updatedReel) => setReel(updatedReel)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
