import type { User, Post } from "../types";

export const USERS: User[] = [
  { id: "u1", name: "Raiyan Z.", handle: "@raiyan", avatar: "https://i.pravatar.cc/100?img=13", verified: true },
  { id: "u2", name: "Ada Lovelace", handle: "@ada", avatar: "https://i.pravatar.cc/100?img=5", verified: true },
  { id: "u3", name: "Alan Turing", handle: "@turing", avatar: "https://i.pravatar.cc/100?img=12" },
  { id: "u4", name: "Grace Hopper", handle: "@grace", avatar: "https://i.pravatar.cc/100?img=30" },
];

export const SEED_POSTS: Post[] = [
  {
    id: "p1",
    authorId: "u2",
    text: "Shipping a tiny social app UI today. Keeping it simple, fast, and fun!",
    image: "https://images.unsplash.com/photo-1505238680356-667803448bb6?q=80&w=1600&auto=format&fit=crop",
    likes: 12,
    reposts: 3,
    createdAt: Date.now() - 1000 * 60 * 15,
    comments: [{ id: "c1", userId: "u3", text: "Looks slick!", ts: Date.now() - 1000 * 60 * 14 }],
  },
  { id: "p2", authorId: "u3", text: "Functional programming + distributed systems = chef's kiss.", likes: 42, reposts: 10, createdAt: Date.now() - 1000 * 60 * 60, comments: [] },
  { id: "p3", authorId: "u4", text: "Debugging is like being the detective in a crime movie where you're also the murderer.", likes: 123, reposts: 25, createdAt: Date.now() - 1000 * 60 * 60 * 7, comments: [] },
  { id: "p4", authorId: "u1", text: "Vaylu is coming together — messages, reels, and a clean feed. Next up: notifications!", likes: 33, reposts: 4, createdAt: Date.now() - 1000 * 60 * 25, comments: [] },
];
