// Single source of truth for all shared types

export type User = {
  githubId: string;
  id: string;
  name: string;
  handle: string;
  avatar: string;
};

export type Comment = {
  _id?: string | number;
  id?: string;
  author?: string;  // githubId from backend
  userId?: string;
  content?: string; // from backend
  text?: string;    // normalized field
  datePosted?: string | Date;
  ts?: number;
  stats?: any;
  authorInfo?: {
    handle?: string;
    name?: string;
    avatar?: string;
    isCurrentUser?: boolean;
    deleted?: boolean;
  };
};

export type Post = {
  content: any;
  _id: string | null | undefined;
  authorHandle: string;
  authorInfo: {
    isCurrentUser: any;
    handle?: string;
    profile?: any;
    avatar?: string;
    name?: string;
  };
  authorImage: any;
  id: string;
  authorId: string;
  text: string;   // <-- string only
  image?: string;
  likes: number;
  liked?: boolean; // Whether the current user has liked this post
  repostedBy: number;
  createdAt: number;
  comments: Comment[];
  originalId?: string;    // if set, this post is a repost of originalId
  repostedByMe?: boolean; // did the logged-in user repost this original?
};

export type DM = { id: string; from: "me" | string; text: string; ts: number };

export type Thread = {
  id: string;
  participantId: string;
  last: string;
  messages: DM[];
  unread?: boolean;
};

export type Reel = {
  id: string;
  title: string;
  authorId: string;
  src: string;
  liked?: boolean;
  saved?: boolean;
};

export type Tab = "home" | "messages" | "reels" | "media" | "profile";
