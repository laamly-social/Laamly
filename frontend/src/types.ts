// Single source of truth for all shared types

export type User = {
   githubId: string;
   id: string;
   name: string;
   handle: string;
   avatar: string;
   bio?: string;
   privilegeLevel?: string;
};

export type Comment = {
   _id?: string | number;
   id?: string;
   author?: string; // githubId from backend
   userId?: string;
   content?: string; // from backend
   text?: string; // normalized field
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
   text: string; // <-- string only
   image?: string;
   likes: number;
   liked?: boolean; // Whether the current user has liked this post
   views?: number; // Number of unique views
   repostedBy: number;
   createdAt: number;
   comments: Comment[];
   originalId?: string; // if set, this post is a repost of originalId
   repostedByMe?: boolean; // did the logged-in user repost this original?
};

export type DM = {
   id: string;
   from: "me" | string;
   text: string;
   ts: number;
   attachments?: string[]; // URLs to uploaded files (images, videos, etc.)
   read?: boolean; // Whether message has been read
   edited?: boolean; // Whether message has been edited
   reactions?: Array<{ userId: string; emoji: string }>; // Message reactions
};

export type Thread = {
   id: string;
   participantIds: string[]; // Support multiple participants for group chats
   participants?: User[]; // Full user info for participants
   last: string;
   lastTs?: number;
   messages: DM[];
   unread?: boolean;
   isGroup?: boolean;
   groupName?: string;
   groupAvatar?: string; // Avatar URL for group chats
};

export type Reel = {
   id: string;
   title: string;
   description?: string;
   authorId: string;
   src: string;
   liked?: boolean;
   saved?: boolean;
   likes?: number;
   views?: number; // Number of unique views
   createdAt?: number;
   authorInfo?: {
      handle?: string;
      name?: string;
      avatar?: string;
      isCurrentUser?: boolean;
   };
   comments?: Comment[];
};

export type Notification = {
   id: string;
   type:
      | "like"
      | "comment"
      | "comment_like"
      | "message"
      | "reply"
      | "group-add"
      | "follow"
      | "unfollow";
   from: string; // githubId of the person who triggered the notification
   fromName: string;
   fromAvatar: string;
   contentId: string; // postId, reelId, threadId, or userId for follow notifications
   contentType: "post" | "reel" | "message" | "comment" | "group" | "user";
   message: string;
   read: boolean;
   createdAt: number;
};

export type Tab = "home" | "messages" | "reels" | "profile";
