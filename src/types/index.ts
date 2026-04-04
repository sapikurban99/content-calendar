export interface User {
  id: string; // The email will be used as the ID/username for simplicity
  email: string;
  name: string;
  createdAt: string;
}

export interface Account {
  id: string;
  handle: string;
  name: string;
  userId: string; // ✨ To link the account to the specific user
}

export interface ContentPlan {
  id: string;
  accountId: string;
  userId: string; // ✨ To link the plan to the specific user
  title: string;
  status: string;
  publishDate: string;
  contentType?: string;
  brief?: string;
  link?: string;
  coverUrl?: string; // ✨ Field baru untuk preview visual di planner
}

export interface TikTokProfile {
  authorId: string;
  username: string;
  avatar?: string; // ✨ Field baru untuk foto profil
  followersCount: number;
  followingCount: number;
  friendsCount: number;
  totalHeartsReceived: number;
  totalVideos: number;
  lastUpdated: string;
  accountId: string;
}

export interface TikTokPostAnalytics {
  videoId: string;
  caption: string;
  coverUrl?: string; // ✨ Field baru untuk thumbnail video
  playCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  hashtags: string[];
  createdAt: string;
  authorId: string;
  lastUpdated: string;
}