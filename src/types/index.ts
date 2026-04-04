export interface User {
  id: string; // The email will be used as the ID/username for simplicity
  email: string;
  name: string;
  createdAt: string;
}

export type Platform = 'tiktok' | 'instagram' | 'linkedin';

export interface Account {
  id: string;
  handle: string;
  name: string;
  userId: string; // ✨ To link the account to the specific user
  platform?: Platform; // Optional initially for backwards compatibility, we'll default to 'tiktok'
  linkedinType?: 'personal' | 'company'; // ✨ Specify LinkedIn profile type
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

export interface SocialProfile {
  name?: string; // ✨ Display name (fullName or companyName)
  authorId: string;
  username: string;
  avatar?: string; // ✨ Field baru untuk foto profil
  followersCount: number;
  followingCount: number;
  friendsCount: number;
  totalHeartsReceived: number; // For compatibility or generic likes engagement
  totalVideos: number;
  bio?: string; // ✨ Tagline/Bio for LinkedIn and other platforms
  lastUpdated: string;
  accountId: string;
}

export interface PostAnalytics {
  videoId: string; // the generic post ID
  caption: string;
  coverUrl?: string; // ✨ Field baru untuk thumbnail video
  playCount: number; // or views/impressions
  likeCount: number;
  commentCount: number;
  shareCount: number;
  hashtags: string[];
  createdAt: string;
  authorId: string;
  lastUpdated: string;
}