// src/components/feed/CreatePost.tsx
import React, { useRef, useState } from "react";
import Card from "../ui/Card";
import UserChip from "../ui/UserChip";
import GenericButton from "../ui/GenericButton";
import { createPost, uploadImages } from "../../utils/posts";
import { X } from "lucide-react"; // Still useful if you want a main close button, but we'll use it for image previews too

type CreatePostProps = {
  meId: string;
  openProfile: (id: string) => void;
  onPosted?: () => void;
  onClose?: () => void; // Keeping this for the main composer close button, if you decide to use it
};

const MAX_MEDIA = 5;

const CreatePost: React.FC<CreatePostProps> = ({ meId, openProfile, onPosted, onClose }) => {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Helper to revoke old URLs and create new ones
  const updatePreviews = (currentFiles: File[]) => {
    previews.forEach(u => URL.revokeObjectURL(u)); // Revoke existing preview URLs
    setPreviews(currentFiles.map(f => URL.createObjectURL(f)));
  };

  const handleSetFiles = (newFiles: File[]) => {
    setError(null);
    let combined = [...files, ...newFiles];
    if (combined.length > MAX_MEDIA) {
      setError(`You can attach up to ${MAX_MEDIA} items. Keeping the first ${MAX_MEDIA}.`);
      combined = combined.slice(0, MAX_MEDIA);
    }
    setFiles(combined);
    updatePreviews(combined); // Update previews based on the new files array
  };

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files ? Array.from(e.target.files) : [];
    handleSetFiles(picked);
    // Clear the input value so the same file can be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (indexToRemove: number) => {
    setError(null);
    const updatedFiles = files.filter((_, i) => i !== indexToRemove);
    setFiles(updatedFiles);
    updatePreviews(updatedFiles); // Update previews after removal
    // If the last file was removed, also reset the file input
    if (updatedFiles.length === 0 && fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // --- Drag and Drop Handlers ---
  const dropHandler = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFiles = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];
    handleSetFiles(droppedFiles);
  };

  const dragOverHandler = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const dragLeaveHandler = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  // --- Textarea Auto-grow ---
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  };

  const handleCreatePost = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!text.trim()) return setError("Post content cannot be empty.");
    if (files.length === 0) return setError("Please upload at least one image or video.");

    setUploading(true);
    try {
      const urls = await uploadImages(files); // images AND videos; server stores only links
      await createPost({ content: text, urls, meId });

      // Reset state
      previews.forEach(u => URL.revokeObjectURL(u)); // Revoke all preview URLs
      setText("");
      setFiles([]);
      setPreviews([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      onPosted?.();
    } catch (err) {
      console.error("Failed to create post:", err);
      setError("Failed to create post. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="composer">
      <form onSubmit={handleCreatePost}>
        <div className="card_header border-b-1 border-border dark:border-border-dark justify-between items-center">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Make a post</h2>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-full hover:bg-muted dark:hover:bg-muted-dark"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <div className="card__body p-4">
          <textarea
            ref={textareaRef}
            maxLength={1500}
            className="create-post-message my-2 p-2 rounded-md w-full resize-none focus:outline-public focus:outline-4 bg-muted dark:bg-muted-dark border border-border dark:border-border-dark"
            placeholder="Share something..."
            autoComplete="off"
            value={text}
            onChange={handleTextChange}
            rows={3} // Initial rows
          />

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,video/*"
            multiple
            onChange={onPickFiles}
          />

          <div
            className={`upload-preview-area bg-muted dark:bg-muted-dark border-border dark:border-border-dark border-2 border-dashed mt-1 rounded-md p-4 text-center transition-all ${isDragging
                ? 'inset-shadow-sm shadow-close-h-dark ring-2 ring-blue-500'
                : 'bg-close-h-light dark:bg-close-h-dark hover:inset-shadow-sm shadow-close-h-dark'
              } text-close-b-dark dark:text-close-b-light cursor-pointer`}
            onDrop={dropHandler}
            onDragOver={dragOverHandler}
            onDragLeave={dragLeaveHandler}
            onClick={() => fileInputRef.current?.click()}
          >
            {previews.length > 0 ? (
              <div className="grid gap-2" style={{ gridTemplateColumns: previews.length === 1 ? "1fr" : "repeat(auto-fill, minmax(120px, 1fr))" }}>
                {files.map((file, i) => {
                  const src = previews[i];
                  const isVid = file.type.startsWith("video/");
                  return (
                    <div key={i} className="relative rounded-xl overflow-hidden group"> {/* Added group for hover effects */}
                      {isVid ? (
                        <video src={src} className="w-full h-full object-cover" muted playsInline />
                      ) : (
                        <img src={src} className="w-full h-full object-cover" alt={`preview-${i}`} />
                      )}
                      {/* X button for each image */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent triggering the file input click
                          removeFile(i);
                        }}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label={`Remove image ${i + 1}`}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <span>Upload up to {MAX_MEDIA} images or videos</span>
            )}
          </div>

          {error && (
            <div className="alert p-2 my-2 bg-red-100 border border-red-400 text-red-700 rounded-md">
              {error}
            </div>
          )}

          <div className="mt-4 clearfix">
            <GenericButton
              type="submit"
              className="transition-all p-2 min-w-20 mb-4 border bg-close-light dark:bg-close-dark border-close-b-light dark:border-close-b-dark rounded-md float-right border-accent
                hover:bg-accent hover:text-white hover:border-muted hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              disabled={uploading}
            >
              {uploading ? "Posting..." : "Post"}
            </GenericButton>
          </div>
        </div>
      </form>
    </Card>
  );
};

export default CreatePost;