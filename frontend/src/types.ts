// Single source of truth for all shared types

export type User = {
  githubId: string;
  id: string;
  name: string;
  handle: string;
  avatar: string;
  verified?: boolean;
};

export type Comment = {
  id: string;
  userId: string;
  text: string;   // <-- string only
  ts: number;
};

export type Post = {
  content: any;
  _id: Key | null | undefined;
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
