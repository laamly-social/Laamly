// src/components/feed/CreatePost.tsx
import React, { useRef, useState } from "react";
import Card from "../ui/Card";
import UserChip from "../ui/UserChip";
import GenericButton from "../ui/GenericButton";
import { Upload } from "lucide-react";
import { createPost, uploadImages } from "../../utils/posts";

type CreatePostProps = {
  meId: string;
  openProfile: (id: string) => void;
  onPosted?: () => void;
};

const MAX_MEDIA = 5;
const alertUser = (s: string) => window.alert(s);

const CreatePost: React.FC<CreatePostProps> = ({ meId, openProfile, onPosted }) => {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files ? Array.from(e.target.files) : [];
    let next = [...files, ...picked];
    if (next.length > MAX_MEDIA) {
      alertUser(`You can attach up to ${MAX_MEDIA} items. Keeping the first ${MAX_MEDIA}.`);
      next = next.slice(0, MAX_MEDIA);
    }
    setFiles(next);
    setPreviews(next.map(f => URL.createObjectURL(f)));
  };

  const handleCreatePost = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!text.trim()) return alertUser("Post content cannot be empty.");
    if (files.length === 0) return alertUser("Please upload at least one image or video.");

    setUploading(true);
    const urls = await uploadImages(files.slice(0, MAX_MEDIA)); // images AND videos; server stores only links
    await createPost({ content: text, urls, meId });

    alertUser("Post created successfully!");
    // Reset
    previews.forEach(u => URL.revokeObjectURL(u));
    setText(""); setFiles([]); setPreviews([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setUploading(false);
    onPosted?.();
  };

  return (
    <Card className="composer">
      <form onSubmit={handleCreatePost}>
        <div className="card_header border-b-1 border-border dark:border-border-dark justify-between">
          <UserChip userId={meId} onClickName={() => openProfile(meId)} />
        </div>

        <div className="card__body">
          <textarea
            className="bg-muted dark:bg-muted-dark border-1 border-border dark:border-border-dark text-text dark:text-text-dark rounded-xl w-full min-h-[96px] resize-y my-4 p-2"
            placeholder="What's happening?"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          <div className="flex items-center gap-2 flex-wrap">
            <label className="btn rounded-xl btn--ghost bg-transparent text-text dark:text-text-dark hover:bg-muted" style={{ cursor: "pointer" }}>
              <Upload size={16} /> Upload
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                style={{ display: "none" }}
                onChange={onPickFiles}
              />
            </label>

            <GenericButton className="btn" type="submit" disabled={uploading}>
              {uploading ? "Posting..." : "Post"}
            </GenericButton>
          </div>

          {/* Previews grid */}
          <div className="previewArea my-2">
            {previews.length > 0 ? (
              <div className="grid gap-2" style={{ gridTemplateColumns: previews.length === 1 ? "1fr" : "1fr 1fr" }}>
                {files.map((file, i) => {
                  const src = previews[i];
                  const isVid = file.type.startsWith("video/");
                  return (
                    <div key={i} className="relative rounded-xl overflow-hidden">
                      {isVid ? (
                        <video src={src} className="w-full" muted playsInline controls={false} />
                      ) : (
                        <img src={src} className="w-full" alt={`preview-${i}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <span>Upload up to {MAX_MEDIA} images or videos</span>
            )}
          </div>
        </div>
      </form>
    </Card>
  );
};

export default CreatePost;
