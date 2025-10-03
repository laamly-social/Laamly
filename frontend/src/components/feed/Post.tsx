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
import { AnimatePresence, motion } from "framer-motion";
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
  const owner = USERS.find(u => u.id === p.authorId)!;
  const original = p.originalId ? posts.find(x => x.id === p.originalId) : null;
  const isRepost = !!original;
  const postText = p.text || (isRepost ? original?.text || "" : "");
  const postImage = p.image || (isRepost ? original?.image : undefined);

  return (
    <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
      <Card className="post">
        <div className="card_header border-b-1 border-border dark:border-border-dark justify-between">
          <div>
            <UserChip userId={owner.id} onClickName={() => openProfile(owner.id)} />
            {isRepost && original && (
              <div className="repostLine">
                reposted from{" "}
                <button className="linklike text-linklike dark:text-linklike-dark" onClick={() => openProfile(original.authorId)}>
                  {USERS.find(u => u.id === original.authorId)?.name}
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-sub dark:text-sub-dark">{formatTime(p.createdAt)}</span>
            <IconBtn
              icon={p.bookmarked ? BookmarkCheck : Bookmark}
              label="Bookmark"
              active={p.bookmarked}
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
          {postImage && <img className="post__img" src={postImage} alt="post" />}

          <div className="flex items-center gap-3 flex-wrap">
            <IconBtn
              icon={Heart}
              label="Like"
              count={isRepost ? original!.likes : p.likes}
              onClick={() => toggleLike(isRepost ? original!.id : p.id)}
              active={isRepost ? original!.liked : p.liked}
            />
            <IconBtn
              icon={Repeat}
              label="Repost"
              count={isRepost ? original!.reposts : p.reposts}
              onClick={() => toggleRepost(isRepost ? original!.id : p.id)}
              active={(isRepost ? original!.repostedByMe : p.repostedByMe) ?? false}
            />
            <IconBtn
              icon={MessageSquare}
              label="Comments"
              count={isRepost ? original!.comments.length : p.comments.length}
              onClick={() => {
                const el = document.getElementById(`cbox-${(isRepost ? original! : p).id}`);
                el?.focus();
              }}
            />
            <IconBtn icon={Share2} label="Share" />
          </div>

          {/* Comments */}
          <CommentsList post={isRepost ? original! : p} onAdd={addComment} />
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
        const u = USERS.find(x => x.id === c.userId)!;
        return (
          <div key={c.id} className="flex gap-2">
            <Avatar src={u.avatar} alt={u.name} size="sm" />
            <div className="comment bg-muted dark:bg-muted-dark rounded-xl border-1 border-border dark:border-border-dark flex-1 px-4 py-2">
              <div className="flex justify-between text-text dark:text-text-dark text-xs">
                <span className="font-semibold text-text dark:text-text-dark">{u.name}</span>
                <span className="opacity-[.75]">{new Date(c.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
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