// @ts-nocheck

import Card from "../ui/Card";
// Removed GenericButton – no more "Load more" button
import { clsx } from "../../utils";
import type { Post, User } from "../../types";
import "../../index.css";
import PostComponent from "./Post";
import CreatePost from "./CreatePost";
import { AnimatePresence, motion } from "framer-motion";
import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import {
  fetchFeedPage,
  deletePost as deletePostApi,
  togglePostLike,
  editPost as editPostApi,
} from "../../utils/posts";

// ***** FRONTEND FEED PAGE SIZE: ALWAYS 5 *****
const FEED_PAGE_SIZE = 5;

export default function HomeFeed({
  meId,
  posts,
  setPosts,
  followMap,
  followToggle,
  openProfile,
  user,
}: {
  meId: string;
  posts: Post[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  followMap: { [id: string]: Set<string> };
  followToggle: (uid: string) => void;
  openProfile: (uid: string) => void;
  user: User | null;
}) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  // Sentinel element for intersection observer
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // --- Helper: load first page of personalized feed ---
  const loadFirstPage = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      console.log(
        `[HomeFeed] loadFirstPage -> requesting page=1, pageSize=${FEED_PAGE_SIZE}`
      );
      const data = await fetchFeedPage(1, FEED_PAGE_SIZE);
      console.log(
        `[HomeFeed] loadFirstPage -> got ${data.posts?.length ?? 0} posts`
      );
      setPosts(data.posts || []);
      setPage(1);
      setHasMore(data.hasMore);
      setInitialLoaded(true);
    } catch (err) {
      console.error("Failed to load feed:", err);
    } finally {
      setLoading(false);
    }
  }, [loading, setPosts]);

  // Initial fetch
  useEffect(() => {
    loadFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPosted = async () => {
    // Reload first page so the new post shows up near the top
    await loadFirstPage();
  };

  // Load next page (used by infinite scroll)
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    const nextPage = page + 1;
    setLoading(true);
    try {
      console.log(
        `[HomeFeed] loadMore -> requesting page=${nextPage}, pageSize=${FEED_PAGE_SIZE}`
      );
      const data = await fetchFeedPage(nextPage, FEED_PAGE_SIZE);
      console.log(
        `[HomeFeed] loadMore -> got ${data.posts?.length ?? 0} posts`
      );
      setPosts((prev) => [...prev, ...(data.posts || [])]);
      setPage(nextPage);
      setHasMore(data.hasMore);
    } catch (err) {
      console.error("Failed to load more posts:", err);
    } finally {
      setLoading(false);
    }
  }, [page, hasMore, loading, setPosts]);

  // Infinite scroll via IntersectionObserver on the sentinel
  useEffect(() => {
    if (!initialLoaded || !hasMore) return;
    const target = loadMoreRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          console.log("[HomeFeed] sentinel intersected, calling loadMore()");
          loadMore();
        }
      },
      {
        root: null,
        rootMargin: "300px", // start loading a bit before reaching the bottom
        threshold: 0.1,
      }
    );

    observer.observe(target);

    return () => observer.disconnect();
  }, [initialLoaded, hasMore, loadMore]);

  const handleToggleLike = async (postId: string) => {
    try {
      const { liked, likes } = await togglePostLike(postId);
      setPosts((prev) =>
        prev.map((p) => (p._id === postId ? { ...p, liked, likes } : p))
      );
    } catch (error) {
      console.error("Failed to toggle like:", error);
    }
  };

  const toggleRepost = (originalId: string) => {
    setPosts((prevPosts) => {
      const targetPost = prevPosts.find((x) => x.id === originalId);
      const baseId =
        targetPost && targetPost.originalId
          ? targetPost.originalId
          : originalId;
      const original = prevPosts.find((x) => x.id === baseId);
      if (!original) return prevPosts;

      const existingRepost = prevPosts.find(
        (p) => p.originalId === baseId && p.authorId === meId
      );
      if (existingRepost) {
        return prevPosts
          .filter((p) => p.id !== existingRepost.id)
          .map((p) =>
            p.id === baseId
              ? {
                  ...p,
                  reposts: Math.max(0, p.reposts - 1),
                  repostedByMe: false,
                }
              : p
          );
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
        return prevPosts
          .map((p) =>
            p.id === baseId
              ? { ...p, reposts: p.reposts + 1, repostedByMe: true }
              : p
          )
          .concat(repost);
      }
    });
  };

  const addComment = (postId: string, body: string) => {
    if (!body.trim()) return;
    setPosts((prev) =>
      prev.map((p) =>
        p._id === postId
          ? {
              ...p,
              comments: [
                ...p.comments,
                {
                  id: `c_${Date.now()}`,
                  userId: meId,
                  text: body.trim(),
                  ts: Date.now(),
                },
              ],
            }
          : p
      )
    );
  };

  const deletePost = async (id: string) => {
    try {
      await deletePostApi(id);
      setPosts((prev) => prev.filter((p) => p.id !== id && p._id !== id));
    } catch (e) {
      alert("Failed to delete post: " + (e instanceof Error ? e.message : e));
    }
  };

  const editPost = async (id: string, content: string) => {
    try {
      await editPostApi(id, content);
      // The local state is already updated in Post component
    } catch (e) {
      alert("Failed to edit post: " + (e instanceof Error ? e.message : e));
      // Revert changes by refetching feed
      await loadFirstPage();
    }
  };

  // Backend already returns posts in ranked order,
  // so just pass them through.
  const orderedPosts = useMemo(() => posts, [posts]);

  return (
    // Center the two-column feed and give the main column a comfortable, stable width
    <div
      className="w-full mx-auto grid gap-6 px-2 md:px-4"
      style={{
        gridTemplateColumns: "1fr",
        maxWidth: "100%",
      }}
    >
      <div className="col col--main max-w-[680px] mx-auto w-full">
        {user && (
          <CreatePost
            meId={meId}
            openProfile={openProfile}
            onPosted={onPosted}
          />
        )}

        <div className="grid">
          {orderedPosts.map((p) => (
            <PostComponent
              key={p._id}
              post={p}
              meId={meId}
              posts={orderedPosts}
              setPosts={setPosts}
              openProfile={openProfile}
              addComment={addComment}
              deletePost={deletePost}
              editPost={editPost}
              toggleLike={handleToggleLike}
              toggleRepost={toggleRepost}
              user={user}
            />
          ))}
        </div>

        {/* Loading / end-of-feed states + infinite scroll sentinel */}
        <div className="py-4 text-center text-sm text-sub dark:text-sub-dark space-y-2">
          {/* Sentinel for IntersectionObserver */}
          <div ref={loadMoreRef} />

          {loading && (
            <div className="flex justify-center items-center">
              <svg
                className="h-6 w-6 animate-spin text-sub dark:text-sub-dark"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
            </div>
          )}

          {!loading && orderedPosts.length === 0 && (
            <div>No posts yet. Be the first to post!</div>
          )}

          {!loading && !hasMore && orderedPosts.length > 0 && (
            <div>You’re all caught up ✅</div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {lightbox && (
          <motion.div
            className="lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
          >
            <img src={lightbox} alt="preview" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Trends() {
  const TRENDS = [
    { tag: "sharia", posts: 18200 },
    { tag: "dawah", posts: 55100 },
    { tag: "ai", posts: 98000 },
  ];
  return (
    <Card>
      <div className="p-3 border-b border-border dark:border-border-dark flex items-center gap-2.5">
        Trends
      </div>
      <div className="p-3 grid gap-2.5">
        {TRENDS.map((t) => (
          <div
            key={t.tag}
            className="py-1.5 border-t first:border-t-0 border-border dark:border-border-dark"
          >
            <div className="trend__tag">#{t.tag}</div>
            <div className="text-sub dark:text-sub-dark text-xs">
              {t.posts.toLocaleString()} posts
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
