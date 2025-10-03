import Avatar from "../ui/Avatar";
import GenericButton from "../ui/GenericButton";
import InputField from "../ui/InputField";
import WhoToFollow from "../ui/WhoToFollow";
import Card from "../ui/Card";
import { useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Upload, PlusCircle } from "lucide-react";
import { USERS } from "../../data/mock";
import { clsx } from "../../utils";
import UserChip from "../ui/UserChip";
import type { Post } from "../../types";
import "../../index.css";
import PostComponent from "./Post";

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

  const sortedPosts = useMemo(() => {
    return [...posts].sort((a, b) =>
      sort === "latest"
        ? b.createdAt - a.createdAt
        : b.likes + b.reposts + b.comments.length - (a.likes + a.reposts + a.comments.length)
    );
  }, [posts, sort]);

  const myFollowings = followMap[meId] || new Set<string>();

  return (
    <div className="center grid gap-4 w-full container" style={{gridTemplateColumns: "65% 35%"}}>
      <div className="col col--main">
        <Card className="p-2">
          <div className="grid grid-cols-2 gap">
            <GenericButton className={clsx("chip py-2", sort === "latest" && "chip--active bg-accent text-white")} onClick={() => setSort("latest")}>Latest</GenericButton>
            <GenericButton className={clsx("chip py-2", sort === "top" && "chip--active bg-accent text-white")} onClick={() => setSort("top")}>Top</GenericButton>
          </div>
        </Card>
        <Card className="composer">
          <div className="card_header border-b-1 border-border dark:border-border-dark justify-between">
            <UserChip userId={meId} onClickName={() => openProfile(meId)} />
          </div>
          <div className="card__body">
            <textarea className="bg-muted dark:bg-muted-dark border-1 border-border dark:border-border-dark text-text dark:text-text-dark rounded-xl w-full min-h-[96px] resize-y my-4 p-2" placeholder="What's happening?" value={text} onChange={e => setText(e.target.value)} />
            <div className="flex items-center gap-2 flex-wrap">
              <InputField className="input bg-muted dark:bg-muted-dark" placeholder="Optional image URL" value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
              <label className="btn rounded-xl btn--ghost bg-transparent text-text dark:text-text-dark hover:bg-muted" style={{ cursor: "pointer" }}>
                <Upload size={16} /> Upload
                <InputField className="bg-muted dark:bg-muted-dark" type="file" accept="image/*" onChange={onPickImage} style={{ display: "none" }} />
              </label>
              <GenericButton className="btn" onClick={addPost}>
                Post
              </GenericButton>
            </div>
          </div>
        </Card>
        <div className="grid">
          {sortedPosts.map(p => (
            <PostComponent
              key={p.id}
              post={p}
              meId={meId}
              posts={posts}
              setPosts={setPosts}
              openProfile={openProfile}
              addComment={addComment}
              deletePost={deletePost}
              toggleLike={toggleLike}
              toggleRepost={toggleRepost}
            />
          ))}
        </div>
  </div>

      {/* Sidebar */}
      <aside className="col sticky t-20">
        <WhoToFollow meId={meId} followMap={followMap} followToggle={followToggle} openProfile={openProfile} />
        <Trends />
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


function Trends() {
  const TRENDS = [
    { tag: "typescript", posts: 18200 },
    { tag: "react", posts: 55100 },
    { tag: "vaylu", posts: 820 },
    { tag: "ai", posts: 98000 },
  ];
  return (
  <Card>
      <div className="card_header border-b-1 border-border dark:border-border-dark">Trends</div>
      <div className="card__body side__list">
        {TRENDS.map(t => (
          <div key={t.tag} className="trend">
            <div className="trend__tag">#{t.tag}</div>
            <div className="trend__sub">{t.posts.toLocaleString()} posts</div>
          </div>
        ))}
      </div>
    </Card>
  );
}