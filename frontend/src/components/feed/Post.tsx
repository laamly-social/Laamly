// src/components/feed/Post.tsx
// @ts-nocheck

import Card from "../ui/Card";
import UserChip from "../ui/UserChip";
import IconBtn from "../ui/IconBtn";
import GenericButton from "../ui/GenericButton";
import Carousel from "../ui/Carousel";
import InputField from "../ui/InputField";
import Avatar from "../ui/Avatar";
import {
  Heart,
  Repeat,
  Share2,
  Bookmark,
  BookmarkCheck,
  Trash2,
  MessageSquare,
  Edit2,
  Check,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import CommentsList from "./CommentsList";
import type { Post as PostType, User } from "../../types";

// ---- Helpers ----
function isVideo(url?: string): boolean {
  if (!url) return false;
  return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url);
}

function mediaUrlsFrom(post: any): string[] {
  if (!post) return [];
  if (Array.isArray(post.urls) && post.urls.length) return post.urls as string[];
  if (post.image) return [post.image as string];
  return [];
}

function timeAgo(ts: number | string | Date): string {
  const t = typeof ts === "number" ? ts : new Date(ts as any).getTime();
  const s = Math.max(1, Math.floor((Date.now() - t) / 1000));
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d`;
  if (h > 0) return `${h}h`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

interface PostProps {
  post: PostType;
  meId: string;
  posts: PostType[];
  setPosts: React.Dispatch<React.SetStateAction<PostType[]>>;
  openProfile: (uid: string) => void;
  addComment: (postId: string, body: string) => void;
  deletePost: (id: string) => void;
  editPost: (id: string, content: string) => void;
  user: User | null;
  toggleLike: (id: string) => void;
  toggleRepost: (id: string) => void;
}

export default function Post({
  post: p,
  meId,
  posts,
  setPosts,
  openProfile,
  addComment,
  deletePost,
  editPost,
  toggleLike,
  toggleRepost,
  user,
}: PostProps) {
  const original = p.originalId ? posts.find((x) => x.id === p.originalId) : undefined;
  const isRepost = !!original;
  const source = original ?? p;

  const postText = p.content || (isRepost ? original?.content || "" : "");

  // UI state
  const [showComments, setShowComments] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(postText);

  const handleSaveEdit = () => {
    if (editedContent.trim() !== postText) {
      editPost(p._id, editedContent.trim());
      setPosts((prev) =>
        prev.map((post) => (post._id === p._id ? { ...post, content: editedContent.trim() } : post))
      );
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedContent(postText);
    setIsEditing(false);
  };

  // YouTube embeds
  const hasYoutubeLinks = postText.match(
    /(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/(watch\?v=)?[A-Za-z0-9_-]{11}/g
  );
  const videoImbeds = hasYoutubeLinks ? (
    <div className="mb-3">
      {hasYoutubeLinks.map((link: string, index: number) => {
        let videoId = "";
        const ytMatch = link.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
        if (ytMatch?.[1]) videoId = ytMatch[1];
        if (!videoId) return null;
        return (
          <div key={index} className="mb-3 aspect-w-16 aspect-h-9">
            <iframe
              className="w-full mx-auto min-h-[20rem] rounded-lg"
              src={`https://www.youtube.com/embed/${videoId}`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        );
      })}
    </div>
  ) : null;

  // Prefer current post's media, fallback to original for reposts
  const media = useMemo(() => {
    const here = mediaUrlsFrom(p);
    return here.length ? here : mediaUrlsFrom(source);
  }, [p, source]);

  // Safe author info for both GitHub + Google users (or missing)
  const authorId = p.authorId || p.authorHandle || ""; // whatever you store as canonical author identifier
  const authorName = p.authorInfo?.name || p.authorInfo?.handle || "Unknown";
  const authorHandle = p.authorInfo?.handle || "unknown";
  const authorAvatar = p.authorInfo?.avatar || "";
  const isCurrentUser = !!p.authorInfo?.isCurrentUser;

  const createdAt = p.createdAt || Date.now();

  return (
    <motion.div
      key={p.id}
      id={"id-" + p._id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
    >
      <Card className="post">
        {/* Header */}
        <div className="p-3 border-b border-border dark:border-border-dark flex items-center gap-2.5 justify-between">
          <div>
            <UserChip
              avatar={authorAvatar}
              handle={authorHandle}
              fullName={authorName}
              onClickName={() => openProfile(authorId)}
            />

            {isRepost && original && (
              <div className="mt-1.5 ml-11 text-sub dark:text-sub-dark text-xs">
                reposted from{" "}
                <button
                  className="bg-none border-none cursor-pointer p-0 text-linklike dark:text-linklike-dark hover:text-white hover:underline"
                  onClick={() => openProfile(original.authorId || original.authorHandle || "")}
                >
                  @{original.authorInfo?.handle || "unknown"}
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-sub dark:text-sub-dark">{timeAgo(createdAt)} ago</span>

            {!isEditing && isCurrentUser && (
              <>
                <IconBtn icon={Edit2} label="Edit" onClick={() => setIsEditing(true)} />
                <IconBtn
                  icon={Trash2}
                  className="hover:bg-red-600"
                  danger
                  label="Delete"
                  onClick={() => deletePost(p._id)}
                />
              </>
            )}

            {isEditing && isCurrentUser && (
              <>
                <IconBtn icon={Check} label="Save" onClick={handleSaveEdit} />
                <IconBtn icon={X} label="Cancel" onClick={handleCancelEdit} />
              </>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-3">
          {isEditing ? (
            <textarea
              className="w-full text-lg p-2 rounded border border-border dark:border-border-dark bg-bg dark:bg-bg-dark text-fg dark:text-fg-dark mb-3"
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              rows={Math.max(3, editedContent.split("\n").length)}
              autoFocus
            />
          ) : (
            postText && <p className="text-lg whitespace-pre-wrap mb-3">{postText}</p>
          )}

          {videoImbeds}

          <Carousel urls={media} />

          {/* Actions */}
          <div className="inline-flex items-center gap-1 rounded-full flex-wrap bg-muted dark:bg-muted-dark border border-border dark:border-border-dark mb-3">
            <IconBtn
              icon={Heart}
              label="Like"
              count={Number(source.likes) || 0}
              onClick={() => toggleLike(source._id!)}
              active={!!source.liked}
            />
            <IconBtn
              icon={MessageSquare}
              label="Comments"
              count={source?.comments?.length ?? 0}
              onClick={() => setShowComments((v) => !v)}
            />
            {/* Add other buttons if needed (repost, share, save, etc.) */}
          </div>

          {showComments && <CommentsList post={source} user={user} onAdd={addComment} />}
        </div>
      </Card>
    </motion.div>
  );
}
