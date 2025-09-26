import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, Repeat, Share2, Upload, PlusCircle, Bookmark, BookmarkCheck, Trash2, MessageSquare } from "lucide-react";
import { USERS } from "../../data/mock";
import { clsx, formatTime } from "../../utils";
import IconBtn from "../ui/IconBtn";
import UserChip from "../ui/UserChip";
import type { Post } from "../../types";

export default function HomeFeed({
  meId,
  posts,
  setPosts,
  followMap,
  followToggle,
  openProfile,
}: {
  meId: string;
  posts: Post[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  followMap: { [id: string]: Set<string> };
  followToggle: (uid: string) => void;
  openProfile: (uid: string) => void;
}) {
  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [sort, setSort] = useState<"latest" | "top">("latest");
  const [lightbox, setLightbox] = useState<string | null>(null);

  const onPickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUrl(URL.createObjectURL(file));
  };

  const addPost = () => {
    if (!text.trim() && !imageUrl.trim()) return;
    const newPost: Post = {
      id: `p_${Date.now()}`,
      authorId: meId,
      text: text.trim(),
      image: imageUrl.trim() || undefined,
      likes: 0,
      reposts: 0,
      createdAt: Date.now(),
      comments: [],
    };
    setPosts(prev => [newPost, ...prev]);
    setText("");
    setImageUrl("");
  };

  const toggleLike = (id: string) => {
    setPosts(prev =>
      prev.map(p => (p.id === id ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p))
    );
  };

  const toggleRepost = (originalId: string) => {
    setPosts(prevPosts => {
      const targetPost = prevPosts.find(x => x.id === originalId);
      const baseId = targetPost && targetPost.originalId ? targetPost.originalId : originalId;
      const original = prevPosts.find(x => x.id === baseId);
      if (!original) return prevPosts;

      const existingRepost = prevPosts.find(p => p.originalId === baseId && p.authorId === meId);
      if (existingRepost) {
        return prevPosts
          .filter(p => p.id !== existingRepost.id)
          .map(p => (p.id === baseId ? { ...p, reposts: Math.max(0, p.reposts - 1), repostedByMe: false } : p));
      } else {
        const repost: Post = {
          id: `rp_${Date.now()}`,
          authorId: meId,
          text: "",
          image: original.image,
          likes: 0,
          reposts: 0,
          createdAt: Date.now(),
          comments: [],
          originalId: baseId,
        };
        return prevPosts.map(p => (p.id === baseId ? { ...p, reposts: p.reposts + 1, repostedByMe: true } : p)).concat(repost);
      }
    });
  };

  const addComment = (postId: string, body: string) => {
    if (!body.trim()) return;
    setPosts(prev =>
      prev.map(p =>
        p.id === postId
          ? { ...p, comments: [...p.comments, { id: `c_${Date.now()}`, userId: meId, text: body.trim(), ts: Date.now() }] }
          : p
      )
    );
  };

  const deletePost = (id: string) => setPosts(prev => prev.filter(p => p.id !== id));

  const sortedPosts = [...posts].sort((a, b) =>
    sort === "latest"
      ? b.createdAt - a.createdAt
      : b.likes + b.reposts + b.comments.length - (a.likes + a.reposts + a.comments.length)
  );

  const myFollowings = followMap[meId] || new Set<string>();

  return (
    <div className="center">
      <div className="col col--main">
        <div className="composer card">
          <div className="card__header card__header--between">
            <UserChip userId={meId} onClickName={() => openProfile(meId)} />
            <div className="row gap8">
              <button className={clsx("chip", sort === "latest" && "chip--active")} onClick={() => setSort("latest")}>Latest</button>
              <button className={clsx("chip", sort === "top" && "chip--active")} onClick={() => setSort("top")}>Top</button>
            </div>
          </div>
          <div className="card__body">
            <textarea placeholder="What's happening?" value={text} onChange={e => setText(e.target.value)} />
            <div className="row gap8 wrap">
              <input className="input" placeholder="Optional image URL" value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
              <label className="btn btn--ghost" style={{ cursor: "pointer" }}>
                <Upload size={16} /> Upload
                <input type="file" accept="image/*" onChange={onPickImage} style={{ display: "none" }} />
              </label>
              <button className="btn" onClick={addPost}>
                <PlusCircle size={16} /> Post
              </button>
            </div>
          </div>
        </div>

        <div className="stack">
          <AnimatePresence>
            {sortedPosts.map(p => {
              const owner = USERS.find(u => u.id === p.authorId)!;
              const original = p.originalId ? posts.find(x => x.id === p.originalId) : null;
              const isRepost = !!original;
              const postText = p.text || (isRepost ? original?.text || "" : "");
              const postImage = p.image || (isRepost ? original?.image : undefined);

              return (
                <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                  <div className="card post">
                    <div className="card__header card__header--between">
                      <div>
                        <UserChip userId={owner.id} onClickName={() => openProfile(owner.id)} />
                        {isRepost && original && (
                          <div className="repostLine">
                            reposted from{" "}
                            <button className="linklike" onClick={() => openProfile(original.authorId)}>
                              {USERS.find(u => u.id === original.authorId)?.name}
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="row gap8">
                        <span className="post__meta">{formatTime(p.createdAt)}</span>
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
                      {postText && <p className="post__text">{postText}</p>}
                      {postImage && <img className="post__img" src={postImage} alt="post" />}

                      <div className="row gap12 wrap">
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
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Sidebar */}
      <aside className="col col--side">
        <WhoToFollow meId={meId} followMap={followMap} followToggle={followToggle} openProfile={openProfile} />
        <Trends />
        <QuickLinks />
      </aside>

      {/* Lightbox (optional, if you still use it) */}
      <AnimatePresence>
        {lightbox && (
          <motion.div className="lightbox" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setLightbox(null)}>
            <img src={lightbox} alt="preview" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* Helpers inside HomeFeed file */

function CommentsList({ post, onAdd }: { post: Post; onAdd: (postId: string, body: string) => void }) {
  const [draft, setDraft] = useState("");
  return (
    <div className="comments">
      {post.comments.map(c => {
        const u = USERS.find(x => x.id === c.userId)!;
        return (
          <div key={c.id} className="comment">
            <img className="avatar avatar--sm" src={u.avatar} alt={u.name} />
            <div className="comment__body">
              <div className="comment__top">
                <span className="comment__name">{u.name}</span>
                <span className="comment__time">{new Date(c.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <div className="comment__text">{c.text}</div>
            </div>
          </div>
        );
      })}
      <div className="comment__composer">
        <input
          id={`cbox-${post.id}`}
          className="input"
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
        <button
          className="btn"
          onClick={() => {
            if (draft.trim()) {
              onAdd(post.id, draft.trim());
              setDraft("");
            }
          }}
        >
          Post
        </button>
      </div>
    </div>
  );
}

function WhoToFollow({
  meId,
  followMap,
  followToggle,
  openProfile,
}: {
  meId: string;
  followMap: { [id: string]: Set<string> };
  followToggle: (uid: string) => void;
  openProfile: (uid: string) => void;
}) {
  const myFollowings = followMap[meId] || new Set<string>();
  return (
    <div className="card">
      <div className="card__header">Who to follow</div>
      <div className="card__body side__list">
        {USERS.filter(u => u.id !== meId && !myFollowings.has(u.id)).map(u => (
          <div key={u.id} className="side__row">
            <UserChip userId={u.id} small onClickName={() => openProfile(u.id)} />
            <button className={clsx("btn", myFollowings.has(u.id) ? "" : "btn--ghost")} onClick={() => followToggle(u.id)}>
              {myFollowings.has(u.id) ? "Following" : "Follow"}
            </button>
          </div>
        ))}
        {USERS.filter(u => u.id !== meId && !myFollowings.has(u.id)).length === 0 && (
          <div className="muted">You're following everyone here!</div>
        )}
      </div>
    </div>
  );
}

function Trends() {
  const TRENDS = [
    { tag: "typescript", posts: 18200 },
    { tag: "react", posts: 55100 },
    { tag: "vaylu", posts: 820 },
    { tag: "ai", posts: 98000 },
  ];
  return (
    <div className="card">
      <div className="card__header">Trends</div>
      <div className="card__body side__list">
        {TRENDS.map(t => (
          <div key={t.tag} className="trend">
            <div className="trend__tag">#{t.tag}</div>
            <div className="trend__sub">{t.posts.toLocaleString()} posts</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickLinks() {
  return (
    <div className="card">
      <div className="card__header">Quick links</div>
      <div className="card__body side__links">
        <a className="link" href="#"><span>🔗</span> Docs</a>
        <a className="link" href="#"><span>#</span> Tags</a>
      </div>
    </div>
  );
}
