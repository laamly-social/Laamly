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
import { useMemo, useState } from "react";

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

/** Treat common video extensions as video */
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
  const owner = USERS.find(u => u.id === p.authorId) || null;

  const original = p.originalId ? posts.find(x => x.id === p.originalId) : undefined;
  const isRepost = !!original;

  const source = original ?? p;

  const postText = p.text || (isRepost ? original?.text || "" : "");

  // Prefer the current post's media; fallback to original (for reposts)
  const media = useMemo(() => {
    const here = mediaUrlsFrom(p);
    return here.length ? here : mediaUrlsFrom(source);
  }, [p, source]);

  // Show up to 5 items and overlay the last tile if more
  const cap = 5;
  const toShow = media.slice(0, cap);
  const overflow = Math.max(0, media.length - cap);

  return (
    <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
      <Card className="post">
        <div className="card_header border-b-1 border-border dark:border-border-dark justify-between">
          <div>
            {owner ? (
              <UserChip userId={owner.id} onClickName={() => openProfile(owner.id)} />
            ) : (
              <div className="flex items-center gap-2">
                {/* IMPORTANT: pass undefined, not empty string */}
                <Avatar src={undefined} alt={p.authorId} size="sm" />
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
            {p.authorId === meId && !isRepost && (
              <IconBtn icon={Trash2} danger label="Delete" onClick={() => deletePost(p.id)} />
            )}
          </div>
        </div>

        <div className="card__body">
          {postText && <p className="text-lg whitespace-pre-wrap">{postText}</p>}

          {toShow.length > 0 && (
            <div
              className="grid gap-2 my-2"
              style={{ gridTemplateColumns: toShow.length === 1 ? "1fr" : "1fr 1fr" }}
            >
              {toShow.map((url, i) => {
                const showOverlay = overflow > 0 && i === toShow.length - 1;
                const cls = "rounded-xl w-full overflow-hidden";
                return (
                  <div key={url + i} className="relative">
                    {isVideo(url) ? (
                      <video className={cls} controls playsInline preload="metadata" crossOrigin="anonymous"
                        onError={(e) => {
                          const v = e.currentTarget;
                          // eslint-disable-next-line no-console
                          console.error("Video failed to load", { url, error: v.error, networkState: v.networkState, readyState: v.readyState });
                        }}
                      >
                        <source src={url} type="video/mp4" />
                      </video>
                    ) : (
                      <img className={cls} src={url} alt="post media" />
                    )}

                    {showOverlay && (
                      <div className="absolute inset-0 bg-black/50 text-white flex items-center justify-center text-2xl font-semibold rounded-xl">
                        +{overflow}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            <IconBtn icon={Heart} label="Like" count={source.likes} onClick={() => toggleLike(source.id)} active={!!source.liked} />
            <IconBtn icon={Repeat} label="Repost" count={source.reposts} onClick={() => toggleRepost(source.id)} active={!!source.repostedByMe} />
            <IconBtn
              icon={MessageSquare}
              label="Comments"
              count={source.comments.length}
              onClick={() => document.getElementById(`cbox-${source.id}`)?.focus()}
            />
            <IconBtn icon={Share2} label="Share" />
          </div>

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
            <Avatar src={u?.avatar || undefined} alt={u?.name ?? c.userId} size="sm" />
            <div className="comment bg-muted dark:bg-muted-dark rounded-xl border-1 border-border dark:border-border-dark flex-1 px-4 py-2">
              <div className="flex justify-between text-text dark:text-text-dark text-xs">
                <span className="font-semibold">{u?.name ?? c.userId}</span>
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
        <GenericButton className="btn disabled:bg-muted disabled:dark:bg-muted-dark disabled:text-sub dark:disabled:text-sub-dark" disabled={!draft.trim()} onClick={() => draft.trim() && (onAdd(post.id, draft.trim()), setDraft(""))}>
          Post
        </GenericButton>
      </div>
    </div>
  );
}
