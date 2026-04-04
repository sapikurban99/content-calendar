import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, query, where, setDoc, getDoc } from "firebase/firestore";
import { db, auth } from "./firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import type { User, Account, ContentPlan, SocialProfile, PostAnalytics } from "@/types/index";

// 🚀 AUTHENTICATION (MOCK)
export const registerUser = async (email: string, name: string): Promise<User> => {
  const userId = email.toLowerCase().replace(/[^a-z0-9]/g, "");
  const docRef = doc(db, "users", userId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    throw new Error("Email already registered");
  }
  
  const newUser: User = {
    id: userId,
    email,
    name,
    createdAt: new Date().toISOString()
  };
  
  await setDoc(docRef, newUser);
  // Auto-migrate on register
  await reassignLegacyData(userId);
  return newUser;
};

export const loginUser = async (email: string): Promise<User> => {
  const userId = email.toLowerCase().replace(/[^a-z0-9]/g, "");
  const docRef = doc(db, "users", userId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    const userData = docSnap.data() as User;
    // Trigger migration check just in case on login
    await reassignLegacyData(userId);
    return userData;
  }
  throw new Error("User not found");
};

export const loginWithGoogleService = async (): Promise<User> => {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  const user = result.user;
  
  if (!user.email) throw new Error("No email found in Google account");
  
  const userId = user.email.toLowerCase().replace(/[^a-z0-9]/g, "");
  const docRef = doc(db, "users", userId);
  const docSnap = await getDoc(docRef);
  
  const userData: User = {
    id: userId,
    email: user.email,
    name: user.displayName || "Google User",
    createdAt: docSnap.exists() ? (docSnap.data() as User).createdAt : new Date().toISOString()
  };
  
  // Create or update
  await setDoc(doc(db, "users", userId), userData, { merge: true });
  
  // ⚡ Auto-Migrate legacy data to this new ID
  await reassignLegacyData(userId);
  
  return userData;
};

/**
 * ⚡ AUTO-MIGRATION: Mencari data lama (test/mock/admin) dan memindahkannya ke ID user yang baru login.
 */
export const reassignLegacyData = async (newUserId: string) => {
  const staleIds = ["mock-user-123", "test-user", "admin", "mockuser"];
  const collections = ["accounts", "content_plans", "profiles", "analytics_posts"];
  
  console.log(`[Migration] Checking legacy data for user: ${newUserId}`);

  for (const collName of collections) {
    for (const staleId of staleIds) {
      const q = query(collection(db, collName), where("userId", "==", staleId));
      const snap = await getDocs(q);
      
      const updates = snap.docs.map(d => 
        updateDoc(doc(db, collName, d.id), { userId: newUserId })
      );
      
      if (updates.length > 0) {
        await Promise.all(updates);
        console.log(`[Migration] Moved ${updates.length} items from ${staleId} to ${newUserId} in ${collName}`);
      }
    }
  }
};


// ... [Existing CRUD Functions] ...

// 🚀 ANALYTICS & N8N SERVICES

/**
 * Fetches cached stats for a single post from Firestore (1 Plan = 1 Data Analytics).
 */
export const getSinglePostAnalytics = async (planId: string, platform: string = "tiktok"): Promise<PostAnalytics | null> => {
  const collectionName = `analytics_posts_${platform}`;
  const docRef = doc(db, collectionName, planId); // Use planId as Doc ID for strong relation
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data() as PostAnalytics;
  }
  return null;
};

/**
 * Triggers n8n Post Scraper and upserts results to Firestore.
 */
export const syncSinglePostAnalytics = async (planId: string, postUrl: string, handle: string = ""): Promise<PostAnalytics> => {
  // 🔍 Detect Platform from URL
  let platform = "tiktok";
  if (postUrl.includes("instagram.com")) platform = "instagram";
  else if (postUrl.includes("linkedin.com")) platform = "linkedin";

  // 📦 Construct Platform-Specific Payload
  let payload: any = {};

  if (platform === "tiktok") {
    payload = {
      commentsPerPost: 0,
      excludePinnedPosts: false,
      maxFollowersPerProfile: 0,
      maxFollowingPerProfile: 0,
      maxRepliesPerComment: 0,
      postURLs: [postUrl],
      proxyCountryCode: "None",
      resultsPerPage: 100,
      scrapeRelatedVideos: false,
      shouldDownloadAvatars: false,
      shouldDownloadCovers: false,
      shouldDownloadMusicCovers: false,
      shouldDownloadSlideshowImages: false,
      shouldDownloadVideos: false
    };
  } else if (platform === "instagram") {
    payload = {
      dataDetailLevel: "basicData",
      resultsLimit: 1,
      skipPinnedPosts: false,
      username: [
        handle,
        `https://www.instagram.com/${handle}/`,
        postUrl
      ]
    };
  } else if (platform === "linkedin") {
    payload = {
      postUrl: postUrl
    };
  }

  // Use server-side proxy to avoid CORS issues on old browsers
  const response = await fetch(`/api/sync?target=post&platform=${platform}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) throw new Error("Failed to reach n8n post scraper (via proxy)");

  const data = await response.json();
  console.log("DEBUG: n8n raw post data:", JSON.stringify(data, null, 2));
  
  // 🔍 SMART PARSER: Mencari data postingan secara rekursif
  const findPostData = (input: any): any => {
    if (!input) return null;
    if (Array.isArray(input)) {
        for (const item of input) {
            const found = findPostData(item);
            if (found) return found;
        }
        return null;
    }
    if (input.posts && Array.isArray(input.posts) && input.posts.length > 0) {
      return input.posts[0];
    }
    // ✨ Handle LinkedIn (activityId) or generic formats (id, shortCode, videoId)
    if (input.activityId || input.videoId || input.shortCode || (input.id && input.likesCount !== undefined)) return input;
    return null;
  };

  const postData = findPostData(data);

  // 🔍 SMART PROFILE PARSER: Mencari data profil untuk update real-time
  const findProfileData = (input: any): any => {
    if (!input) return null;
    if (Array.isArray(input)) {
        for (const item of input) {
            const found = findProfileData(item);
            if (found) return found;
        }
        return null;
    }
    if (input.profiles && Array.isArray(input.profiles) && input.profiles.length > 0) {
      return input.profiles[0];
    }
    // ✨ Support LinkedIn author field
    if (input.author && input.author.name) return input.author;
    return null;
  };

  const profileData = findProfileData(data);

  if (profileData) {
    const profileRef = doc(db, `profiles_${platform}`, (profileData.username || profileData.name || "").toLowerCase());
    await setDoc(profileRef, {
      ...profileData,
      avatar: profileData.avatar || (profileData.images && profileData.images[0]) || "", 
      lastUpdated: new Date().toISOString()
    }, { merge: true });
  }

  if (!postData) {
    console.warn("Parsing failed for data structure:", data);
    throw new Error("No data returned for this post URL");
  }

  const formattedStats: PostAnalytics = {
    videoId: postData.id || postData.shortCode || postData.videoId || postData.activityId || "",
    caption: postData.caption || (postData.content && postData.content.text) || "",
    coverUrl: (postData.displayUrl || postData.coverUrl || (postData.media && postData.media.images && postData.media.images[1]) || "").replace(/&amp;/g, '&'), 
    playCount: postData.videoViewCount || postData.playCount || (postData.engagement && postData.engagement.views) || 0,
    likeCount: postData.likesCount || postData.likeCount || (postData.engagement && postData.engagement.reactions) || 0,
    commentCount: postData.commentsCount || postData.commentCount || (postData.engagement && postData.engagement.comments) || 0,
    shareCount: postData.shareCount || 0,
    hashtags: postData.hashtags || [],
    createdAt: postData.timestamp || postData.createdAt || postData.scrapedAt || "",
    authorId: postData.ownerUsername || postData.authorId || (postData.author && postData.author.name) || "",
    lastUpdated: new Date().toISOString()
  };

  // Upsert to Firestore using planId for strong association (Platform-Specific)
  const postRef = doc(db, `analytics_posts_${platform}`, planId);
  await setDoc(postRef, formattedStats, { merge: true });

  // ✨ Sync coverUrl back to content_plans for instant UI preview
  if (formattedStats.coverUrl) {
    const planRef = doc(db, "content_plans", planId);
    await updateDoc(planRef, { coverUrl: formattedStats.coverUrl });
  }

  return formattedStats;
};

// ... [Existing CRUD Functions] ...

// 🚀 ANALYTICS & N8N SERVICES

/**
 * Fetches cached TikTok profile stats from Firestore.
 */
export const getProfileStats = async (accountId: string, platform: string = "tiktok"): Promise<SocialProfile | null> => {
  const collectionName = `profiles_${platform}`;
  const docRef = doc(db, collectionName, accountId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data() as SocialProfile;
  }
  return null;
};

/**
 * Triggers n8n webhook and upserts resulting analytics to Firestore.
 */
export const syncSocialAnalytics = async (accountIdRaw: string, platform: string = "tiktok", linkedinType?: "personal" | "company") => {
  const accountId = accountIdRaw.toLowerCase().trim();
  console.log(`[Sync] Starting sync for account: ${accountId} on platform: ${platform}`);
  
  // 📦 Construct Platform-Specific Payload
  let payload: any = {};

  if (platform === "tiktok") {
    payload = {
      profiles: [`@${accountId}`]
    };
  } else if (platform === "instagram") {
    payload = {
      includeAboutSection: false,
      usernames: [accountId]
    };
  } else if (platform === "linkedin") {
    const prefix = linkedinType === "company" ? "company" : "in";
    payload = {
      profileScraperMode: "Profile details no email ($4 per 1k)",
      queries: [`https://www.linkedin.com/${prefix}/${accountId}/`]
    };
  }

  // 1. Trigger the n8n scraping engine via server-side proxy
  const response = await fetch(`/api/sync?target=profile&platform=${platform}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) throw new Error("Failed to reach n8n webhook (via proxy)");

  const data = await response.json();
  console.log("DEBUG: n8n raw profile data:", JSON.stringify(data, null, 2));
  const now = new Date().toISOString();

  // 🔍 SMART ANALYTICS PARSER: Cari data profil & posts secara fleksibel
  let scrapedProfile: any = null;
  let scrapedPosts: any[] = [];

  // 1. Coba cari format "package" (lama: {profiles: [], posts: []})
  const findAnalyticsPackage = (input: any): any => {
    if (!input) return null;
    if (Array.isArray(input)) {
        for (const item of input) {
            const found = findAnalyticsPackage(item);
            if (found) return found;
        }
        return null;
    }
    if (input.profiles && input.posts) return input;
    return null;
  };

  const pkg = findAnalyticsPackage(data);
  if (pkg) {
    scrapedProfile = pkg.profiles[0];
    scrapedPosts = pkg.posts;
  } else {
    // 2. Coba cari format "flat" (baru: [ { type: "profile", ... } ] atau { type: "profile", ... })
    const findProfileInGenericData = (input: any): any => {
      if (!input) return null;
      // Jika input adalah array, cari di dalamnya 
      if (Array.isArray(input)) {
        return input.find(item => 
          item.type === "profile" || 
          item.pageType === "COMPANY" ||
          item.followers !== undefined || 
          item.followerCount !== undefined ||
          item.followersCount !== undefined ||
          item.connectionsCount !== undefined ||
          item.fullName !== undefined
        );
      }
      // Jika input adalah objek langsung, cek apakah ini profil
      if (
        input.type === "profile" || 
        input.pageType === "COMPANY" ||
        input.followers !== undefined || 
        input.followerCount !== undefined ||
        input.followersCount !== undefined ||
        input.connectionsCount !== undefined ||
        input.fullName !== undefined ||
        input.username !== undefined
      ) {
        return input;
      }
      return null;
    };
    
    scrapedProfile = findProfileInGenericData(data);
    // ✨ Handle cases where posts are nested inside the profile object (like in Instagram scraper)
    if (scrapedProfile && scrapedProfile.latestPosts) {
      scrapedPosts = scrapedProfile.latestPosts;
    }
    // Jika format baru hanya profile, posts tetap kosong atau bisa dicari terpisah nanti
  }

  if (scrapedProfile) {
    // A. Profile Upsert (Mapping fields to match legacy database)
    const collectionName = `profiles_${platform}`;
    const profileRef = doc(db, collectionName, accountId);
    
    // ✨ UNIVERSAL STATS MAPPING
    const followersCount = scrapedProfile.followerCount ?? scrapedProfile.followersCount ?? scrapedProfile.followers ?? scrapedProfile.followers_count ?? scrapedProfile.connectionsCount ?? scrapedProfile.connections ?? 0;
    const followingCount = scrapedProfile.followsCount ?? scrapedProfile.followingCount ?? scrapedProfile.following ?? scrapedProfile.following_count ?? 0;
    const totalHeartsReceived = scrapedProfile.totalHeartsReceived ?? scrapedProfile.likes ?? scrapedProfile.hearts ?? scrapedProfile.total_likes ?? 0;
    const totalVideos = scrapedProfile.postsCount ?? scrapedProfile.totalVideos ?? scrapedProfile.videoCount ?? 0;
    const headline = scrapedProfile.headline ?? scrapedProfile.biography ?? scrapedProfile.bio ?? scrapedProfile.tagline ?? scrapedProfile.description ?? "";
    const avatar = scrapedProfile.avatar ?? scrapedProfile.logo ?? scrapedProfile.profilePicUrl ?? scrapedProfile.profilePicUrlHD ?? "";
    const name = scrapedProfile.name ?? scrapedProfile.fullName ?? scrapedProfile.companyName ?? accountId;

    const mappedProfile = {
      ...scrapedProfile,
      name: name,
      followersCount: Number(followersCount),
      followingCount: Number(followingCount),
      totalHeartsReceived: Number(totalHeartsReceived),
      totalVideos: Number(totalVideos),
      bio: headline,
      avatar: avatar,
      accountId: accountId,
      lastUpdated: now
    };
    
    console.log(`DEBUG: Final mapped profile for Firestore (${collectionName}):`, JSON.stringify(mappedProfile, null, 2));
    await setDoc(profileRef, mappedProfile, { merge: true });

    // B. Posts Upsert (Hanya jika ada data posts - Platform-Specific)
    if (scrapedPosts && scrapedPosts.length > 0) {
      const postsPromises = scrapedPosts.map((post: any) => {
        const postCollection = `analytics_posts_${platform}`;
        // Normalize Instagram post fields to match dashboard expectations
        const videoId = post.id || post.shortCode || post.videoId;
        const mappedPost = {
          ...post,
          videoId: videoId,
          likeCount: post.likesCount ?? post.likeCount ?? 0,
          playCount: post.videoViewCount ?? post.playCount ?? 0,
          commentCount: post.commentsCount ?? post.commentCount ?? 0,
          createdAt: post.timestamp || new Date().toISOString(),
          lastUpdated: now
        };
        const postRef = doc(db, postCollection, videoId);
        return setDoc(postRef, mappedPost, { merge: true });
      });
      await Promise.all(postsPromises);
    }

    alert(`✅ Sync Profil ${platform.toUpperCase()} Berhasil!`);
  } else {
    console.warn("Analytics data not found in response:", data);
    throw new Error(`Format data dari n8n (${platform}) tidak dikenali atau kosong 😭`);
  }
};

/**
 * Creates a new account in Firestore.
 */
export const addAccount = async (account: Omit<Account, "id">) => {
  // Gunakan gabungan platform dan handle sebagai ID agar tidak saling timpa jika handle sama
  const docId = account.platform ? `${account.platform}_${account.handle.toLowerCase()}` : account.handle.toLowerCase();
  const docRef = doc(db, "accounts", docId);
  await setDoc(docRef, account);
};

export const getAccounts = async (userId: string): Promise<Account[]> => {
  const q = query(collection(db, "accounts"), where("userId", "==", userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account));
};

export const getContentPlans = async (accountId: string, userId: string): Promise<ContentPlan[]> => {
  const q = query(
    collection(db, "content_plans"), 
    where("accountId", "==", accountId),
    where("userId", "==", userId)
  );
  const snapshot = await getDocs(q);
  // Tambahkan fallback logic untuk sorting di client jika index firebase belum dibuat
  const plans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ContentPlan));
  return plans.sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime());
};

export const addContentPlan = async (plan: Omit<ContentPlan, "id">) => {
  await addDoc(collection(db, "content_plans"), plan);
};

export const updateContentPlan = async (planId: string, updates: Partial<ContentPlan>) => {
  const planRef = doc(db, "content_plans", planId);
  await updateDoc(planRef, updates);
};

export const updatePlanStatus = async (planId: string, newStatus: string) => {
  const planRef = doc(db, "content_plans", planId);
  await updateDoc(planRef, { status: newStatus });
};

export const deleteContentPlan = async (planId: string) => {
  await deleteDoc(doc(db, "content_plans", planId));
};

/**
 * ⚡ DATA MIGRATION: Moves legacy accounts and posts into platform-scoped collections.
 */
export const migrateDataToNewFormat = async (userId: string) => {
  console.log(`[Migration] Starting data migration for user: ${userId}`);
  
  // 1. Migrate Accounts
  const accountsQuery = query(collection(db, "accounts"), where("userId", "==", userId));
  const accountsSnap = await getDocs(accountsQuery);
  
  for (const accountDoc of accountsSnap.docs) {
    const accountData = accountDoc.data() as Account;
    const oldId = accountDoc.id;
    const platform = accountData.platform || "tiktok";
    const newId = `${platform}_${accountData.handle.toLowerCase()}`;
    
    if (oldId === newId) continue; // Already migrated
    
    console.log(`[Migration] Migrating account ${oldId} -> ${newId}`);
    
    try {
      // Create new account doc
      await setDoc(doc(db, "accounts", newId), accountData);
      
      // Update Content Plans referencing this account
      const plansQuery = query(collection(db, "content_plans"), where("accountId", "==", oldId));
      const plansSnap = await getDocs(plansQuery);
      
      for (const planDoc of plansSnap.docs) {
        console.log(`[Migration] Updating plan ${planDoc.id} to new accountId ${newId}`);
        await updateDoc(doc(db, "content_plans", planDoc.id), { accountId: newId });
        
        // Move Analytics Posts for this plan (from analytics_posts -> analytics_posts_platform)
        const oldPostRef = doc(db, "analytics_posts", planDoc.id);
        const oldPostSnap = await getDoc(oldPostRef);
        
        if (oldPostSnap.exists()) {
          console.log(`[Migration] Relocating post analytics for plan ${planDoc.id} to analytics_posts_${platform}`);
          await setDoc(doc(db, `analytics_posts_${platform}`, planDoc.id), oldPostSnap.data());
          await deleteDoc(oldPostRef);
        }
      }
      
      // Delete old account doc
      await deleteDoc(doc(db, "accounts", oldId));
      console.log(`[Migration] Account ${oldId} migrated successfully.`);
    } catch (err) {
      console.error(`[Migration] Error migrating ${oldId}:`, err);
    }
  }
  
  // 2. Clean up orphan analytics_posts (those not linked via planId in migration)
  // This is a safety check for any remaining posts in the legacy collection
  const legacyPostsSnap = await getDocs(collection(db, "analytics_posts"));
  for (const postDoc of legacyPostsSnap.docs) {
     console.warn(`[Migration] Non-migrated post found: ${postDoc.id}. Please manually verify or re-sync.`);
  }
  
  return true;
};

/**
 * Deletes an account and its associated profile cache.
 */
export const deleteAccount = async (accountId: string, platform: string) => {
  // 1. Delete account record
  await deleteDoc(doc(db, "accounts", accountId));
  
  // 2. Delete profile cache
  const handle = accountId.split('_')[1] || accountId;
  await deleteDoc(doc(db, `profiles_${platform}`, handle.toLowerCase()));
};
