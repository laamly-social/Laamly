// @ts-nocheck
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchPostById } from "../../utils/posts";
import Post from "./Post";
import type { Post as PostType } from "../../types";
import { ArrowLeft } from "lucide-react";
import GenericButton from "../ui/GenericButton";

export default function SinglePost({
  meId,
  openProfile,
  addComment,
  deletePost,
  editPost,
  user,
  toggleLike,
  toggleRepost,
}: {
  meId: string;
  openProfile: (uid: string) => void;
  addComment: (postId: string, body: string) => void;
  deletePost: (id: string) => void;
  editPost: (id: string, content: string) => void;
  user: any;
  toggleLike: (id: string) => void;
  toggleRepost: (id: string) => void;
}) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<PostType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const fetchedPost = await fetchPostById(id);
        if (fetchedPost) {
          setPost(fetchedPost);
        } else {
          setError("Post not found");
        }
      } catch (err) {
        setError("Failed to load post");
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-sub dark:text-sub-dark">Loading post...</div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="text-lg text-sub dark:text-sub-dark">{error || "Post not found"}</div>
        <GenericButton onClick={() => navigate("/home")}>
          Back to Home
        </GenericButton>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <Post
        post={post}
        meId={meId}
        posts={[post]}
        setPosts={(updater) => {
          if (typeof updater === 'function') {
            setPost(updater([post])[0]);
          } else {
            setPost(updater[0]);
          }
        }}
        openProfile={openProfile}
        addComment={addComment}
        deletePost={(id) => {
          deletePost(id);
          // Immediately set post to null to prevent rendering issues
          setPost(null);
          navigate("/home");
        }}
        editPost={editPost}
        user={user}
        toggleLike={toggleLike}
        toggleRepost={toggleRepost}
      />
    </div>
  );
}
