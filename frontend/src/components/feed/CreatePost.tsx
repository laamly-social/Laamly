import React, { useRef, useState } from "react";
import Card from "../ui/Card";
import UserChip from "../ui/UserChip";
import GenericButton from "../ui/GenericButton";
import { Upload } from "lucide-react";
import { createPost, uploadImages } from "../../utils/posts";

type CreatePostProps = {
  meId: string;
  openProfile: (id: string) => void;
  onPosted?: () => void; // optional callback to refresh feed
};

function showAlert(msg: string) { window.alert(msg); }

const CreatePost: React.FC<CreatePostProps> = ({ meId, openProfile, onPosted }) => {
  const [text, setText] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files ? Array.from(e.target.files) : [];
    setFiles(fileList);
    setPreviews(fileList.map((file) => URL.createObjectURL(file)));
  };

  const handleCreatePost = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!text.trim()) return showAlert("Post content cannot be empty.");
    if (files.length === 0) return showAlert("Please upload at least one image or video.");
    setUploading(true);
    const urls = await uploadImages(files);
    await createPost({ content: text, urls, meId });
    showAlert("Post created successfully!");
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
          <div className="previewArea my-2">
            {previews.length > 0 ? (
              <div className="flex gap-2 flex-wrap">
                {previews.map((src, i) => (
                  <img key={i} src={src} alt={`preview-${i}`} style={{ maxHeight: 80, borderRadius: 8 }} />
                ))}
              </div>
            ) : (
              <span>Upload an image or video</span>
            )}
          </div>
        </div>
      </form>
    </Card>
  );
};

export default CreatePost;
