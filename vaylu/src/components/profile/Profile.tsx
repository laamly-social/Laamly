import { useState } from "react";
import { ChevronLeft, User as UserIcon } from "lucide-react";
import { USERS } from "../../data/mock";
import { clsx, formatTime } from "../../utils";
import Verified from "../ui/Verified";
import UserChip from "../ui/UserChip";
import type { Post, Reel } from "../../types";

export default function Profile(props: {
  userId: string;
  meId: string;
  posts: Post[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  followMap: { [id: string]: Set<string> };
  followToggle: (uid: string) => void;
  reels: Reel[];
  openProfile: (uid: string) => void;
  onBack: () => void;
}) {
  const { userId, meId, posts, followMap, followToggle, reels, openProfile, onBack } = props;
  const user = USERS.find(x => x.id === userId)!;
  const isMe = userId === meId;

  const followings = followMap[userId] || new Set<string>();
  const followers = Object.keys(followMap).filter(uid => followMap[uid].has(userId));

  const userPosts = posts.filter(p => p.authorId === userId);

  const [view, setView] = useState<
    "posts" | "reposts" | "likedPosts" | "likedReels" | "savedPosts" | "savedReels" | "followers" | "following"
  >("posts");

  const originalPosts = userPosts.filter(p => !p.originalId);
  const repostsList = userPosts.filter(p => p.originalId);
  const likedPosts = posts.filter(p => p.liked);
  const savedPosts = posts.filter(p => p.bookmarked);
  const likedReels = reels.filter(r => r.liked);
  const savedReels = reels.filter(r => r.saved);

  return (
    <div className="profile">
      <button className="chip" onClick={onBack}>
        <ChevronLeft size={16} /> Back
      </button>

      <div className="profile__header card">
        <div className="card__body profile__row">
          <img className="profile__avatar" src={user.avatar} alt={user.name} />
          <div className="profile__meta">
            <div className="profile__name">
              {user.name} {user.verified && <Verified />}
            </div>
            <div className="profile__handle">{user.handle}</div>
            <div className="profile__stats">
              <span>
                <strong>{followers.length}</strong> Followers
              </span>
              <span>
                <strong>{followings.size}</strong> Following
              </span>
            </div>
          </div>
          {!isMe && (
            <button
              className={clsx("btn", (followMap[meId] || new Set()).has(user.id) ? "" : "btn--ghost")}
              onClick={() => followToggle(user.id)}
            >
              {(followMap[meId] || new Set()).has(user.id) ? "Following" : "Follow"}
            </button>
          )}
        </div>
      </div>

      <div className="row gap8" style={{ marginTop: 8, marginBottom: 8 }}>
        <button className={clsx("chip", view === "posts" && "chip--active")} onClick={() => setView("posts")}>
          Posts
        </button>
        <button className={clsx("chip", view === "reposts" && "chip--active")} onClick={() => setView("reposts")}>
          Reposts
        </button>
        {isMe && (
          <>
            <button
              className={clsx("chip", view === "likedPosts" && "chip--active")}
              onClick={() => setView("likedPosts")}
            >
              Liked Posts
            </button>
            <button
              className={clsx("chip", view === "likedReels" && "chip--active")}
              onClick={() => setView("likedReels")}
            >
              Liked Reels
            </button>
            <button
              className={clsx("chip", view === "savedPosts" && "chip--active")}
              onClick={() => setView("savedPosts")}
            >
              Saved Posts
            </button>
            <button
              className={clsx("chip", view === "savedReels" && "chip--active")}
              onClick={() => setView("savedReels")}
            >
              Saved Reels
            </button>
          </>
        )}
        <button
          className={clsx("chip", view === "followers" && "chip--active")}
          onClick={() => setView("followers")}
        >
          Followers
        </button>
        <button
          className={clsx("chip", view === "following" && "chip--active")}
          onClick={() => setView("following")}
        >
          Following
        </button>
      </div>

      <div className="stack">
        {view === "posts" &&
          originalPosts.map(p => {
            const original = p.originalId ? posts.find(o => o.id === p.originalId) : null;
            const isRepostCard = !!original;
            const contentText = p.text || (isRepostCard ? original?.text || "" : "");
            const contentImage = p.image || (isRepostCard ? original?.image : undefined);
            return (
              <div key={p.id} className="card post">
                <div className="card__header">
                  <UserIcon size={16} /> {isRepostCard && original ? <span>Repost from {USERS.find(u => u.id === original.authorId)?.name}</span> : <span>Post</span>}
                </div>
                <div className="card__body">
                  {isRepostCard && original && (
                    <div className="repostLine" style={{ margin: "6px 0 8px 0", fontSize: "12px" }}>
                      (original by{" "}
                      <button className="linklike" onClick={() => openProfile(original.authorId)}>
                        {USERS.find(u => u.id === original.authorId)?.name}
                      </button>
                      )
                    </div>
                  )}
                  {contentText && <p className="post__text" style={{ marginBottom: 8 }}>{contentText}</p>}
                  {contentImage && <img className="post__img" src={contentImage} alt="post" />}
                </div>
              </div>
            );
          })}

        {view === "reposts" &&
          repostsList.map(p => {
            const original = posts.find(o => o.id === p.originalId)!;
            return (
              <div key={p.id} className="card post">
                <div className="card__header">
                  <UserIcon size={16} /> Repost
                </div>
                <div className="card__body">
                  <div className="repostLine" style={{ margin: "6px 0 8px 0", fontSize: "12px" }}>
                    (original by{" "}
                    <button className="linklike" onClick={() => openProfile(original.authorId)}>
                      {USERS.find(u => u.id === original.authorId)?.name}
                    </button>
                    )
                  </div>
                  {original.text && <p className="post__text" style={{ marginBottom: 8 }}>{original.text}</p>}
                  {original.image && <img className="post__img" src={original.image} alt="post" />}
                </div>
              </div>
            );
          })}

        {view === "likedPosts" &&
          likedPosts.map(p => {
            const owner = USERS.find(u => u.id === p.authorId)!;
            return (
              <div key={p.id} className="card post">
                <div className="card__header">
                  <UserChip userId={owner.id} onClickName={() => openProfile(owner.id)} />
                  <span className="post__meta">{formatTime(p.createdAt)}</span>
                </div>
                <div className="card__body">
                  {p.text && <p className="post__text">{p.text}</p>}
                  {p.image && <img className="post__img" src={p.image} alt="post" />}
                </div>
              </div>
            );
          })}

        {view === "savedPosts" &&
          savedPosts.map(p => {
            const owner = USERS.find(u => u.id === p.authorId)!;
            return (
              <div key={p.id} className="card post">
                <div className="card__header">
                  <UserChip userId={owner.id} onClickName={() => openProfile(owner.id)} />
                  <span className="post__meta">{formatTime(p.createdAt)}</span>
                </div>
                <div className="card__body">
                  {p.text && <p className="post__text">{p.text}</p>}
                  {p.image && <img className="post__img" src={p.image} alt="post" />}
                </div>
              </div>
            );
          })}

        {view === "likedReels" &&
          likedReels.map(r => {
            const u = USERS.find(x => x.id === r.authorId)!;
            return (
              <div key={r.id} className="card">
                <div className="card__body">
                  <div className="row gap8">
                    <img className="avatar" src={u.avatar} alt={u.name} />
                    <div>
                      <div style={{ fontWeight: 700 }}>{u.name}</div>
                      <div style={{ fontSize: "12px" }}>{r.title}</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

        {view === "savedReels" &&
          savedReels.map(r => {
            const u = USERS.find(x => x.id === r.authorId)!;
            return (
              <div key={r.id} className="card">
                <div className="card__body">
                  <div className="row gap8">
                    <img className="avatar" src={u.avatar} alt={u.name} />
                    <div>
                      <div style={{ fontWeight: 700 }}>{u.name}</div>
                      <div style={{ fontSize: "12px" }}>{r.title}</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

        {view === "followers" &&
          followers.map(uid => <UserChip key={uid} userId={uid} small onClickName={() => openProfile(uid)} />)}

        {view === "following" &&
          Array.from(followings).map(uid => (
            <UserChip key={uid} userId={uid} small onClickName={() => openProfile(uid)} />
          ))}
      </div>
    </div>
  );
}
