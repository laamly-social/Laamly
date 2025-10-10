// src/components/feed/Post.tsx
import { USERS } from "../../data/mock";
import Card from "../ui/Card";
import UserChip from "../ui/UserChip";
import IconBtn from "../ui/IconBtn";
import GenericButton from "../ui/GenericButton";
import InputField from "../ui/InputField";
import Avatar from "../ui/Avatar";
import { Heart, Repeat, Share2, Bookmark, BookmarkCheck, Trash2, MessageSquare } from "lucide-react";
import { formatTime } from "../../utils";
import type { Post as PostType } from "../../types";
import { motion } from "framer-motion";
import { useState } from "react";

interface PostProps {
  post: PostType;
  meId: string;
  posts: PostType[];
  setPosts: React.Dispatch<React.SetStateAction<PostType[]>>;
  openProfile: (uid: string) => void;
  addComment: (postId: string, body: string) => void;
  deletePost: (id: string) => void;
  toggleLike: (id: string) => void;
  toggleRepost: (id: string) => void;
}

/** Heuristic: treat common video extensions as video */
function isVideo(url?: string): boolean {
  if (!url) return false;
  return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url);
}

export default function Post({
  post: p,
  meId,
  posts,
  setPosts,
  openProfile,
  addComment,
  deletePost,
  toggleLike,
  toggleRepost,
}: PostProps) {
  // Author might not exist in mock USERS when coming from backend
  const owner = USERS.find(u => u.id === p.authorId) || null;

  const original = p.originalId ? posts.find(x => x.id === p.originalId) : undefined;
  const isRepost = !!original;

  // Use "source" for counts/actions (original if repost, else self)
  const source = original ?? p;

  const postText = p.text || (isRepost ? original?.text || "" : "");
  const mediaUrl = p.image || (isRepost ? original?.image : undefined);

  return (
    <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
      <Card className="post">
        <div className="card_header border-b-1 border-border dark:border-border-dark justify-between">
          <div>
            {owner ? (
              <UserChip userId={owner.id} onClickName={() => openProfile(owner.id)} />
            ) : (
              // Fallback header when author isn't in mock USERS
              <div className="flex items-center gap-2">
                <Avatar src="" alt={p.authorId} size="sm" />
                <div className="flex flex-col">
                  <span className="font-semibold">{p.authorId}</span>
                  <span className="text-sm opacity-70">@{p.authorId}</span>
                </div>
              </div>
            )}

            {isRepost && original && (
              <div className="repostLine">
                reposted from{" "}
                <button
                  className="linklike text-linklike dark:text-linklike-dark"
                  onClick={() => openProfile(original.authorId)}
                >
                  {USERS.find(u => u.id === original.authorId)?.name ?? original.authorId}
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-sub dark:text-sub-dark">{formatTime(p.createdAt)}</span>
            <IconBtn
              icon={p.bookmarked ? BookmarkCheck : Bookmark}
              label="Bookmark"
              active={!!p.bookmarked}
              onClick={() => setPosts(prev => prev.map(x => (x.id === p.id ? { ...x, bookmarked: !x.bookmarked } : x)))}
            />
            {/* hide delete for repost cards */}
            {p.authorId === meId && !isRepost && (
              <IconBtn icon={Trash2} danger label="Delete" onClick={() => deletePost(p.id)} />
            )}
          </div>
        </div>

        <div className="card__body">
          {postText && <p className="text-lg whitespace-pre-wrap">{postText}</p>}

          {/* Media (image or video) */}
          {mediaUrl ? (
            isVideo(mediaUrl) ? (
              <video
                key={mediaUrl}                       // force re-create if URL changes
                className="post__img rounded-xl w-full"
                controls
                playsInline
                preload="metadata"
                crossOrigin="anonymous"              // allow cross-origin metadata
                onError={(e) => {
                  const el = e.currentTarget;
                  // Helpful diagnostics in devtools
                  // eslint-disable-next-line no-console
                  console.error("Video failed to load", {
                    url: mediaUrl,
                    error: el?.error,
                    networkState: el?.networkState,
                    readyState: el?.readyState,
                  });
                }}
                onLoadedMetadata={(e) => {
                  // eslint-disable-next-line no-console
                  console.debug("Video metadata loaded", {
                    url: mediaUrl,
                    duration: e.currentTarget.duration,
                  });
                }}
              >
                {/* some CDNs need an explicit <source> with a type */}
                <source src={mediaUrl} type="video/mp4" />
                {/* graceful fallback */}
                Your browser can’t play this video.{" "}
                <a href={mediaUrl} target="_blank" rel="noreferrer">Open in a new tab</a>.
              </video>
            ) : (
              <img className="post__img" src={mediaUrl} alt="post" />
            )
          ) : null}

          <div className="flex items-center gap-3 flex-wrap">
            <IconBtn
              icon={Heart}
              label="Like"
              count={source.likes}
              onClick={() => toggleLike(source.id)}
              active={!!source.liked}
            />
            <IconBtn
              icon={Repeat}
              label="Repost"
              count={source.reposts}
              onClick={() => toggleRepost(source.id)}
              active={!!source.repostedByMe}
            />
            <IconBtn
              icon={MessageSquare}
              label="Comments"
              count={source.comments.length}
              onClick={() => {
                const el = document.getElementById(`cbox-${source.id}`);
                el?.focus();
              }}
            />
            <IconBtn icon={Share2} label="Share" />
          </div>

          {/* Comments */}
          <CommentsList post={source} onAdd={addComment} />
        </div>
      </Card>
    </motion.div>
  );
}

function CommentsList({ post, onAdd }: { post: PostType; onAdd: (postId: string, body: string) => void }) {
  const [draft, setDraft] = useState("");

  return (
    <div className="grid gap-2.5">
      {post.comments.map(c => {
        const u = USERS.find(x => x.id === c.userId);
        return (
          <div key={c.id} className="flex gap-2">
            <Avatar src={u?.avatar || ""} alt={u?.name ?? c.userId} size="sm" />
            <div className="comment bg-muted dark:bg-muted-dark rounded-xl border-1 border-border dark:border-border-dark flex-1 px-4 py-2">
              <div className="flex justify-between text-text dark:text-text-dark text-xs">
                <span className="font-semibold text-text dark:text-text-dark">{u?.name ?? c.userId}</span>
                <span className="opacity-[.75]">
                  {new Date(c.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="mt-1 whitespace-pre-wrap">{c.text}</div>
            </div>
          </div>
        );
      })}

      <div className="flex gap-2">
        <InputField
          id={`cbox-${post.id}`}
          className="input bg-muted dark:bg-muted-dark"
          placeholder="Write a comment…"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && draft.trim()) {
              onAdd(post.id, draft.trim());
              setDraft("");
            }
          }}
        />
        <GenericButton
          className="btn disabled:bg-muted disabled:dark:bg-muted-dark disabled:text-sub dark:disabled:text-sub-dark"
          disabled={!draft.trim()}
          onClick={() => {
            if (draft.trim()) {
              onAdd(post.id, draft.trim());
              setDraft("");
            }
          }}
        >
          Post
        </GenericButton>
      </div>
    </div>
  );
}
