import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, query, where, setDoc, getDoc } from "firebase/firestore";
import { db, auth } from "./firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import type { User, Account, ContentPlan, TikTokProfile, TikTokPostAnalytics } from "@/types/index";

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
export const getSinglePostAnalytics = async (planId: string): Promise<TikTokPostAnalytics | null> => {
  const docRef = doc(db, "analytics_posts", planId); // Use planId as Doc ID for strong relation
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data() as TikTokPostAnalytics;
  }
  return null;
};

/**
 * Triggers n8n Post Scraper and upserts results to Firestore.
 */
export const syncSinglePostAnalytics = async (planId: string, postUrl: string): Promise<TikTokPostAnalytics> => {
  // Payload EXACTLY as required by the scraper flow
  const payload = {
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

  // Use server-side proxy to avoid CORS issues on old browsers
  const response = await fetch("/api/sync?target=post", {
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
    if (input.videoId) return input;
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
    return null;
  };

  const profileData = findProfileData(data);

  if (profileData) {
    const profileRef = doc(db, "profiles", profileData.username.toLowerCase());
    await setDoc(profileRef, {
      ...profileData,
      avatar: profileData.avatar || "", // ✨ Foto profil baru
      lastUpdated: new Date().toISOString()
    }, { merge: true });
  }

  if (!postData) {
    console.warn("Parsing failed for data structure:", data);
    throw new Error("No data returned for this post URL");
  }

  const formattedStats: TikTokPostAnalytics = {
    videoId: postData.videoId || "",
    caption: postData.caption || "",
    coverUrl: postData.coverUrl || "", // ✨ Thumbnail baru
    playCount: postData.playCount || 0,
    likeCount: postData.likeCount || 0,
    commentCount: postData.commentCount || 0,
    shareCount: postData.shareCount || 0,
    hashtags: postData.hashtags || [],
    createdAt: postData.createdAt || "",
    authorId: postData.authorId || "",
    lastUpdated: new Date().toISOString()
  };

  // Upsert to Firestore using planId for strong association
  const postRef = doc(db, "analytics_posts", planId);
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
export const getProfileStats = async (accountId: string): Promise<TikTokProfile | null> => {
  const docRef = doc(db, "profiles", accountId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data() as TikTokProfile;
  }
  return null;
};

/**
 * Triggers n8n webhook and upserts resulting analytics to Firestore.
 */
export const syncTikTokAnalytics = async (accountId: string) => {
  // 1. Trigger the n8n scraping engine via server-side proxy
  const response = await fetch(`/api/sync?target=profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accountId: accountId })
  });

  if (!response.ok) throw new Error("Failed to reach n8n webhook (via proxy)");

  const data = await response.json();
  const now = new Date().toISOString();

  // 🔍 SMART ANALYTICS PARSER: Cari data profil & posts secara fleksibel
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

  const analyticsPackage = findAnalyticsPackage(data);

  if (analyticsPackage) {
    const scrapedProfile = analyticsPackage.profiles[0];
    const scrapedPosts = analyticsPackage.posts;

    // A. Profile Upsert (Document ID = accountId)
    const profileRef = doc(db, "profiles", accountId);
    await setDoc(profileRef, {
      ...scrapedProfile,
      accountId: accountId,
      lastUpdated: now
    }, { merge: true });

    // B. Posts Upsert (Document ID = videoId)
    const postsPromises = scrapedPosts.map((post: any) => {
      const postRef = doc(db, "analytics_posts", post.videoId);
      return setDoc(postRef, {
        ...post,
        lastUpdated: now
      }, { merge: true });
    });

    await Promise.all(postsPromises);
    alert("✅ Full Sync Berhasil!");
  } else {
    console.warn("Analytics package not found in response:", data);
    throw new Error("Invalid analytics format from n8n 😭");
  }
};

/**
 * Creates a new account in Firestore.
 */
export const addAccount = async (account: Omit<Account, "id">) => {
  // Gunakan handle sebagai ID agar rapi di Firestore
  const docRef = doc(db, "accounts", account.handle.toLowerCase());
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
