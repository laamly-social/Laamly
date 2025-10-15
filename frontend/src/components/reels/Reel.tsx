// src/components/reels/ReelItem.tsx
// @ts-nocheck
import { VolumeX, Volume2, Heart, Bookmark, Share2, MessageSquare, Trash2 } from "lucide-react";
import Card from "../ui/Card";
import Avatar from "../ui/Avatar";
import type { Reel } from "../../types";

interface ReelItemProps {
  reel: Reel;
  index: number;
  muted: boolean;
  setItemRef: (el: HTMLDivElement | null) => void;
  togglePlay: (e: React.MouseEvent<HTMLVideoElement>) => void;
  setMuted: (fn: (prev: boolean) => boolean) => void;
  onLike: (id: string) => void;
  onSave: (id: string) => void;
  toggleComments: (reel: Reel) => void;
  onDelete: (id: string) => void;
}

export default function ReelItem({
  reel,
  index,
  muted,
  setItemRef,
  togglePlay,
  setMuted,
  onLike,
  onSave,
  toggleComments,
  onDelete,
}: ReelItemProps) {
  return (
    <div
      ref={setItemRef}
      data-idx={index}
      className="relative overflow-hidden p-0 flex items-center justify-center"
      style={{
        height: "100vh",
        width: "100%",
        scrollSnapAlign: "start",
      }}
    >
      {/* Stage 9:16; tall but view-safe */}
      <div
        className="relative overflow-hidden"
        style={{ 
          aspectRatio: "9/16", 
          height: "100%",
          maxHeight: "100vh",
          width: "auto",
          maxWidth: "100%",
          borderRadius: 18
        }}
        data-idx={index}
      >
        <video
          src={reel.src + "/raw"}
          className="absolute inset-0 w-full h-full object-cover"
          muted={muted}
          playsInline
          autoPlay
          loop
          preload="metadata"
          onClick={togglePlay}
        />

        {/* Blur helper layer - needed because backdrop-filter doesn't work over video */}
        <div className="absolute inset-0 pointer-events-none" style={{ backdropFilter: 'blur(0px)' }} />

        {/* Action rail */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-10">
          <ActionButton
            title="Sound"
            Icon={muted ? VolumeX : Volume2}
            onClick={() => setMuted((m) => !m)}
          />

          <ActionButton
            title="Like"
            Icon={Heart}
            onClick={() => onLike(reel.id)}
          />
          <div className="text-center text-xs text-white drop-shadow">{reel.likes ?? 0}</div>

          <ActionButton
            title="Save"
            Icon={Bookmark}
            onClick={() => onSave(reel.id)}
          />

          <ActionButton
            title="Comments"
            Icon={MessageSquare}
            onClick={() => toggleComments(reel)}
          />

          <ActionButton
            title="Share"
            Icon={Share2}
          />

          {reel.authorInfo?.isCurrentUser && (
            <ActionButton
              title="Delete"
              Icon={Trash2}
              onClick={() => onDelete(reel.id)}
            />
          )}
        </div>

        {/* Bottom meta */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4">
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="relative flex items-center gap-3 text-white">
            <Avatar src={reel.authorInfo?.avatar || ""} alt={reel.authorInfo?.name || ""} />
            <div>
              <div className="font-semibold leading-tight">
                {reel.authorInfo?.name || "Unknown"}
              </div>
              <div className="text-sm opacity-80 leading-tight">
                @{reel.authorInfo?.handle || "unknown"} {reel.title ? `• ${reel.title}` : ""}
              </div>
            </div>
          </div>
          {reel.description && (
            <div className="relative mt-2 text-sm text-white/90 line-clamp-3">
              {reel.description}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ActionButtonProps {
  title: string;
  Icon: React.ComponentType<{ size?: number }>;
  onClick?: () => void;
}

function ActionButton({ title, Icon, onClick }: ActionButtonProps) {
  return (
    <button
      className="bg-white/35 hover:bg-white/45 dark:bg-black/35 hover:dark:bg-black/45 text-white backdrop-blur-2xl rounded-full h-11 w-11 grid place-items-center relative"
      title={title}
      onClick={onClick}
    >
      <Icon size={18} />
    </button>
  );
}