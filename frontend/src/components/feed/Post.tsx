// @ts-nocheck

import Card from "../ui/Card";
import UserChip from "../ui/UserChip";
import IconBtn from "../ui/IconBtn";
import GenericButton from "../ui/GenericButton";
import Carousel from "../ui/Carousel";
import InputField from "../ui/InputField";
import Avatar from "../ui/Avatar";
import { Heart, Repeat, Share2, Bookmark, BookmarkCheck, Trash2, MessageSquare } from "lucide-react";
import { formatTime } from "../../utils";
import type { Post as PostType } from "../../types";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { div } from "framer-motion/client";

interface PostProps {
  post: PostType;
  meId: string;
  posts: PostType[];
  setPosts: React.Dispatch<React.SetStateAction<PostType[]>>;
  openProfile: (uid: string) => void;
  addComment: (postId: string, body: string) => void;
  deletePost: (id: string) => void;
  /*

const res = await fetch("/posts/delete", {
       method: "POST",
       headers: { "Content-Type": "application/json" },
       credentials: "include",
       body: JSON.stringify({
         content: {
          id: id
         }
       })
     });
  */
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
  const original = p.originalId ? posts.find(x => x.id === p.originalId) : undefined;
  const isRepost = !!original;

  const source = original ?? p;

  const postText = p.content || (isRepost ? original?.content || "" : "");

  // Prefer the current post's media; fallback to original (for reposts)
  const media = useMemo(() => {
    const here = mediaUrlsFrom(p);
    return here.length ? here : mediaUrlsFrom(source);
  }, [p, source]);
  const toShow = media;

  return (
    <motion.div key={p.id} id={"id-"+p._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
      <Card className="post">
        <div className="card_header border-b-1 border-border dark:border-border-dark justify-between">
          <div>
              <UserChip
               avatar={p.authorInfo.avatar}
                handle={p.authorInfo.handle}
                fullName={p.authorInfo.name}
                onClickName={() => openProfile(p.authorHandle)} />

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
            {/* <IconBtn
              icon={p.bookmarked ? BookmarkCheck : Bookmark}
              label="Bookmark"
              active={!!p.bookmarked}
              onClick={() => setPosts(prev => prev.map(x => (x.id === p.id ? { ...x, bookmarked: !x.bookmarked } : x)))}
            /> */}
            {p.authorInfo.isCurrentUser && (
              <IconBtn icon={Trash2} danger label="Delete" onClick={() => deletePost(p._id)} />
            )}
          </div>
        </div>

        <div className="card__body">
          {postText && <p className="text-lg whitespace-pre-wrap mb-4">{postText}</p>}

          <Carousel urls={toShow} />

          {/* <div className="flex items-center gap-3 flex-wrap">
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

          <CommentsList post={source} onAdd={addComment} /> */}
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
        const u = {};
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
