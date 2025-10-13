// @ts-nocheck

import Avatar from "../ui/Avatar";
import GenericButton from "../ui/GenericButton";
import Chip from "../ui/Chip";
import Card from "../ui/Card";
import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { clsx } from "../../utils";
import UserChip from "../ui/UserChip";
import type { Post, Reel } from "../../types";
import PostComponent from "../feed/Post";

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
      <Chip onClick={onBack}>
        <ChevronLeft size={16} /> Back
      </Chip>

      {/* Use Card component for profile header */}
      <Card className="profile__header">
        <div className="card__body profile__row">
          <Avatar src={user.avatar} alt={user.name} className="w-20 h-20 border border-gray-300 dark:border-gray-700 object-cover rounded-full" />
          <div className="profile__meta">
            <div className="profile__name">
              {user.name}
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
            <GenericButton
              className={clsx("btn", (followMap[meId] || new Set()).has(user.id) ? "" : "bg-transparent text-text dark:text-text-dark hover:bg-muted dark:hover:bg-muted-dark")}
              onClick={() => followToggle(user.id)}
            >
              {(followMap[meId] || new Set()).has(user.id) ? "Following" : "Follow"}
            </GenericButton>
          )}
        </div>
      </Card>

      <div className="flex items-center gap-2" style={{ marginTop: 8, marginBottom: 8 }}>
        <Chip active={view === "posts"} onClick={() => setView("posts")}>
          Posts
        </Chip>
        <Chip active={view === "reposts"} onClick={() => setView("reposts")}>
          Reposts
        </Chip>
        {isMe && (
          <>
            <Chip active={view === "likedPosts"} onClick={() => setView("likedPosts")}>Liked Posts</Chip>
            <Chip active={view === "likedReels"} onClick={() => setView("likedReels")}>Liked Reels</Chip>
            <Chip active={view === "savedPosts"} onClick={() => setView("savedPosts")}>Saved Posts</Chip>
            <Chip active={view === "savedReels"} onClick={() => setView("savedReels")}>Saved Reels</Chip>
          </>
        )}
        <Chip active={view === "followers"} onClick={() => setView("followers")}>Followers</Chip>
        <Chip active={view === "following"} onClick={() => setView("following")}>Following</Chip>
      </div>

      <div className="grid gap-4">
        {view === "posts" &&
          originalPosts.map(p => (
            <PostComponent
              key={p.id}
              post={p}
              meId={meId}
              posts={posts}
              setPosts={props.setPosts}
              openProfile={openProfile}
              addComment={() => {}}
              deletePost={() => {}}
              toggleLike={() => {}}
              toggleRepost={() => {}}
            />
          ))}

        {view === "reposts" &&
          repostsList.map(p => (
            <PostComponent
              key={p.id}
              post={p}
              meId={meId}
              posts={posts}
              setPosts={props.setPosts}
              openProfile={openProfile}
              addComment={() => {}}
              deletePost={() => {}}
              toggleLike={() => {}}
              toggleRepost={() => {}}
            />
          ))}

        {view === "likedPosts" &&
          likedPosts.map(p => (
            <PostComponent
              key={p.id}
              post={p}
              meId={meId}
              posts={posts}
              setPosts={props.setPosts}
              openProfile={openProfile}
              addComment={() => {}}
              deletePost={() => {}}
              toggleLike={() => {}}
              toggleRepost={() => {}}
            />
          ))}

        {view === "savedPosts" &&
          savedPosts.map(p => (
            <PostComponent
              key={p.id}
              post={p}
              meId={meId}
              posts={posts}
              setPosts={props.setPosts}
              openProfile={openProfile}
              addComment={() => {}}
              deletePost={() => {}}
              toggleLike={() => {}}
              toggleRepost={() => {}}
            />
          ))}

        {view === "likedReels" &&
          likedReels.map(r => {
            const u = USERS.find(x => x.id === r.authorId)!;
            return (
              <div key={r.id} className="card">
                <div className="card__body">
                  <div className="flex items-center gap-2">
                    <Avatar src={u.avatar} alt={u.name} />
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
                  <div className="flex items-center gap-2">
                    <Avatar src={u.avatar} alt={u.name} />
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
          followers.map(uid => <UserChip key={uid} userId={uid} onClickName={() => openProfile(uid)} />)}

        {view === "following" &&
          Array.from(followings).map(uid => (
            <UserChip key={uid} userId={uid} onClickName={() => openProfile(uid)} />
          ))}
      </div>
    </div>
  );
}
