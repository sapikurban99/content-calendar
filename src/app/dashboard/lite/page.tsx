"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { onSnapshot, doc, collection, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { 
  Plus, Video, Calendar as CalendarIcon, Trash2, Sparkles, Disc3, LayoutList, ChevronLeft, ChevronRight, Hash, AlignLeft, X, Link as LinkIcon, ExternalLink, RefreshCw, Activity, Heart, Users, Eye, MessageCircle, Share2, UserPlus, AtSign, Smartphone, Edit3, LogOut, Camera, Briefcase, Download 
} from "lucide-react";
import { 
  getAccounts, 
  syncSocialAnalytics, 
  addAccount, 
  addContentPlan, 
  updatePlanStatus, 
  deleteContentPlan,
  getSinglePostAnalytics,
  syncSinglePostAnalytics,
  updateContentPlan,
  deleteAccount
} from "@/lib/services";
import type { Account, ContentPlan, SocialProfile, PostAnalytics, Platform } from "@/types/index";
import { APP_VERSION, COMMIT_HASH } from "../version";

// ✨ System Utility: Safe Date Parser for old iOS (Safari < 15)
const parseSafeDate = (dateStr: string | undefined | null) => {
  if (!dateStr) return new Date();
  var d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;
  var fallback = new Date(dateStr.replace(/-/g, '/').replace('T', ' '));
  return isNaN(fallback.getTime()) ? new Date() : fallback;
};

// ✨ IMAGE PROXY HELPER
const proxyImage = (url: string | undefined | null) => {
  if (!url) return "";
  var cleanUrl = url.replace(/&amp;/g, '&');
  if (cleanUrl.indexOf("cdninstagram.com") !== -1 || cleanUrl.indexOf("tiktokcdn") !== -1 || cleanUrl.indexOf("fbcdn.net") !== -1 || cleanUrl.indexOf("licdn.com") !== -1) {
    return "https://wsrv.nl/?url=" + encodeURIComponent(cleanUrl) + "&n=-1";
  }
  return cleanUrl;
};

// ✨ BRAND-SPECIFIC ICONS COMPONENT
const BrandIcon = ({ platform = 'tiktok', className = "w-4 h-4" }: { platform?: string, className?: string }) => {
  var p = platform || 'tiktok';
  if (p === 'tiktok') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.002-.001.002.001a2.895 2.895 0 0 1 3.183-4.51v-3.5a6.329 6.329 0 0 0-5.394 10.692 6.33 6.33 0 0 0 10.857-4.424V8.617a8.171 8.171 0 0 0 3.77 1.419V6.686Z"/>
      </svg>
    );
  }
  if (p === 'instagram') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
      </svg>
    );
  }
  if (p === 'linkedin') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
      </svg>
    );
  }
  return <AtSign className={className} />;
};

export default function LiteDashboardPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [plans, setPlans] = useState<ContentPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Analytics Stats
  const [profileStats, setProfileStats] = useState<SocialProfile | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncAllProgress, setSyncAllProgress] = useState({ current: 0, total: 0, label: "" });

  // View, Calendar, & Modal State
  const [activeView, setActiveView] = useState<"list" | "calendar" | "kanban">("calendar");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedPlan, setSelectedPlan] = useState<ContentPlan | null>(null);
  const [postStats, setPostStats] = useState<PostAnalytics | null>(null); 
  const [isSyncingPost, setIsSyncingPost] = useState(false); 

  // Form State
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newType, setNewType] = useState("Video");
  const [newBrief, setNewBrief] = useState("");
  const [newLink, setNewLink] = useState(""); 

  // Modal & Logic State
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [isAddPlanOpen, setIsAddPlanOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [newAccHandle, setNewAccHandle] = useState("");
  const [newAccName, setNewAccName] = useState("");
  const [newAccPlatform, setNewAccPlatform] = useState<Platform>("tiktok");
  const [newAccLinkedinType, setNewAccLinkedinType] = useState<"personal" | "company">("personal");
  const [isProcessing, setIsProcessing] = useState(false);
  const [draggedPlan, setDraggedPlan] = useState<ContentPlan | null>(null);
  const [linkRequiredModal, setLinkRequiredModal] = useState<{ isOpen: boolean; planId: string; status: string }>({ isOpen: false, planId: '', status: '' });
  const [requiredLink, setRequiredLink] = useState("");
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);

  const activeAccount = accounts.find(function(a) { return a.id === selectedAccount; });
  const activePlatform = (activeAccount && activeAccount.platform) || 'tiktok';
  const activeHandle = ((activeAccount && activeAccount.handle) || selectedAccount).toLowerCase();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    } else if (user) {
      fetchAccounts();
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!selectedAccount || !user) return;
    setProfileStats(null);
    setIsLoading(true);

    var collectionName = "profiles_" + activePlatform;
    var profileDoc = doc(db, collectionName, activeHandle);
    var unsubscribeProfile = onSnapshot(profileDoc, function(docSnap) {
      if (docSnap.exists()) {
        setProfileStats(docSnap.data() as SocialProfile);
      } else {
        setProfileStats(null);
      }
    });

    var plansQuery = query(
      collection(db, "content_plans"),
      where("accountId", "==", selectedAccount),
      where("userId", "==", user.id)
    );

    var unsubscribePlans = onSnapshot(plansQuery, function(snapshot) {
      var data = snapshot.docs.map(function(d) { return { id: d.id, ...d.data() } as ContentPlan; });
      setPlans(data.sort(function(a, b) { 
        return parseSafeDate(b.publishDate).getTime() - parseSafeDate(a.publishDate).getTime(); 
      }));
      setIsLoading(false);
    }, function(error) {
      console.error("Plans listener error:", error);
      setIsLoading(false);
    });

    return function() {
      unsubscribeProfile();
      unsubscribePlans();
    };
  }, [selectedAccount, user, activePlatform, activeHandle]);

  const handleDeleteAccount = async (accId: string, platform: string, handle: string) => {
    if (!window.confirm("Hapus akun @" + handle + " (" + platform + ")? Semua data analytics akun ini akan hilang.")) return;
    try {
      await deleteAccount(accId, platform);
      var updatedAccounts = accounts.filter(function(a) { return a.id !== accId; });
      setAccounts(updatedAccounts);
      if (selectedAccount === accId) {
        setSelectedAccount(updatedAccounts.length > 0 ? updatedAccounts[0].id : "");
      }
      alert("Akun berhasil dihapus!");
    } catch (error) {
      console.error("Error deleting account:", error);
      alert("Gagal menghapus akun.");
    }
  };

  const filteredPlans = plans.filter(function(p) {
    var d = parseSafeDate(p.publishDate);
    return d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
  });

  const fetchAccounts = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      var data = await getAccounts(user.id);
      setAccounts(data);
      if (data.length > 0) setSelectedAccount(data[0].id);
    } catch (error) {
      console.error("Error fetching accounts:", error);
    }
    setIsLoading(false);
  };

  const handleDayClick = (dayNum: number, currentMonth: number, currentYear: number) => {
    var formattedDate = new Date(Date.UTC(currentYear, currentMonth, dayNum, 12, 0, 0)).toISOString().split("T")[0];
    setNewDate(formattedDate);
    setIsAddPlanOpen(true);
  };

  const handleOpenModal = async (plan: ContentPlan) => {
    setSelectedPlan(plan);
    setPostStats(null); 
    setIsEditing(false);
    if (plan.link) {
      var stats = await getSinglePostAnalytics(plan.id, activePlatform);
      if (stats) setPostStats(stats);
    }
  };

  const handleSyncPostStats = async () => {
    if (!selectedPlan || !selectedPlan.link || !activeAccount) return;
    setIsSyncingPost(true);
    setIsProcessing(true);
    var prog = 0;
    var interval = setInterval(function() {
      prog += Math.random() * 20;
      if (prog > 85) prog = 85;
      setSyncProgress(prog);
    }, 300);

    try {
      await syncSinglePostAnalytics(selectedPlan.id, selectedPlan.link, activeAccount.handle || "");
      clearInterval(interval);
      setSyncProgress(100);
      setTimeout(function() { setSyncProgress(0); }, 800);
    } catch (error) {
      console.error("Post sync error:", error);
      clearInterval(interval);
      setSyncProgress(0);
      alert("Failed to sync post stats... 😭");
    } finally {
      setIsSyncingPost(false);
      setIsProcessing(false);
    }
  };

  const handleAddPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount || !newTitle || !newDate || !user) {
      alert("⚠️ Mohon isi semua field yang diperlukan!");
      return;
    }

    setIsProcessing(true);
    try {
      await addContentPlan({
        accountId: selectedAccount,
        userId: user.id,
        title: newTitle,
        link: newLink,
        brief: newBrief,
        publishDate: parseSafeDate(newDate).toISOString(),
        contentType: newType as any,
        status: "Ideation",
      });

      setNewTitle("");
      setNewDate("");
      setNewBrief("");
      setNewLink("");
      setIsAddPlanOpen(false);
      alert("✅ Konten berhasil dijadwalkan!");
    } catch (error: any) {
      console.error("Save error:", error);
      alert("❌ Gagal menyimpan: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSyncProfile = async () => {
    if (!selectedAccount || !activeAccount) return;
    setIsSyncing(true);
    setIsProcessing(true);
    var prog = 0;
    var interval = setInterval(function() {
      prog += Math.random() * 15;
      if (prog > 90) prog = 90;
      setSyncProgress(prog);
    }, 400);

    try {
      await syncSocialAnalytics(activeAccount.handle || selectedAccount, activePlatform, activeAccount.linkedinType);
      clearInterval(interval);
      setSyncProgress(100);
      setTimeout(function() { setSyncProgress(0); }, 800);
    } catch (error: any) {
      console.error("Sync error:", error);
      clearInterval(interval);
      setSyncProgress(0);
      alert("❌ Sync Error: " + error.message);
    } finally {
      setIsSyncing(false);
      setIsProcessing(false);
    }
  };

  const handleSyncAll = async () => {
    if (!selectedAccount || !activeAccount) return;
    var plansWithLinks = plans.filter(function(p) { return p.accountId === selectedAccount && p.link; });
    
    setIsSyncingAll(true);
    setSyncAllProgress({ current: 0, total: plansWithLinks.length, label: "Initializing Sync..." });

    try {
      setSyncAllProgress(function(prev) { return { ...prev, label: "Updating Profile..." }; });
      await syncSocialAnalytics(activeAccount.handle || selectedAccount, activePlatform, activeAccount.linkedinType);
      
      if (plansWithLinks.length === 0) {
        setSyncAllProgress(function(prev) { return { ...prev, label: "Profile Updated" }; });
        setTimeout(function() { setIsSyncingAll(false); }, 2000);
        return;
      }

      for (var i = 0; i < plansWithLinks.length; i++) {
        var plan = plansWithLinks[i];
        setSyncAllProgress({ current: i + 1, total: plansWithLinks.length, label: "Syncing: " + plan.title });
        
        try {
          await syncSinglePostAnalytics(plan.id, plan.link!, activeAccount.handle || "");
          await new Promise(function(r) { setTimeout(r, 800); });
        } catch (err) {
          console.warn("Failed to sync post " + plan.id, err);
        }
      }

      setSyncAllProgress(function(prev) { return { ...prev, current: plansWithLinks.length, label: "Data Synchronized!" }; });
      setTimeout(function() { setIsSyncingAll(false); }, 3000);
    } catch (error: any) {
      console.error("Sync All error:", error);
      alert("❌ Sync All Error: " + error.message);
      setIsSyncingAll(false);
    }
  };

  const handleUpdatePlan = async () => {
    if (!selectedPlan) return;
    setIsProcessing(true);
    try {
      await updateContentPlan(selectedPlan.id, {
        title: selectedPlan.title,
        link: selectedPlan.link,
        brief: selectedPlan.brief,
        publishDate: selectedPlan.publishDate,
        contentType: selectedPlan.contentType,
        status: selectedPlan.status
      });
      setIsEditing(false);
      alert("✅ Plan Updated!");
    } catch (error: any) {
      alert("❌ Failed to update: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, planId: string) => {
    e.stopPropagation();
    if (!confirm("Hapus rencana ini?")) return;
    setIsProcessing(true);
    try {
      await deleteContentPlan(planId);
      if (selectedPlan && selectedPlan.id === planId) setSelectedPlan(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStatusChange = async (e: any, planId: string, currentStatus: string, targetStatus?: string) => {
    if (e && e.stopPropagation) e.stopPropagation();
    var nextStatus = targetStatus || (currentStatus === "Ideation" ? "Filming" : currentStatus === "Filming" ? "Editing" : "Posted");
    
    if (nextStatus === "Posted") {
      var plan = plans.find(function(p) { return p.id === planId; });
      if (plan && !plan.link) {
        setLinkRequiredModal({ isOpen: true, planId: planId, status: nextStatus });
        return;
      }
    }

    setIsProcessing(true);
    try {
      await updatePlanStatus(planId, nextStatus);
      if (selectedPlan && selectedPlan.id === planId) {
        setSelectedPlan({ ...selectedPlan, status: nextStatus as any });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const submitRequiredLink = async () => {
    if (!requiredLink.trim()) {
      alert("Link wajib diisi!");
      return;
    }
    
    setIsProcessing(true);
    try {
      await updateContentPlan(linkRequiredModal.planId, { link: requiredLink });
      await updatePlanStatus(linkRequiredModal.planId, linkRequiredModal.status);
      
      if (selectedPlan && selectedPlan.id === linkRequiredModal.planId) {
        setSelectedPlan({ ...selectedPlan, status: linkRequiredModal.status as any, link: requiredLink });
      }
      
      setLinkRequiredModal({ isOpen: false, planId: '', status: '' });
      setRequiredLink("");
      alert("✅ Posted!");
    } catch (error) {
      alert("❌ Gagal update.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccHandle || !newAccName || !user) return;

    setIsProcessing(true);
    try {
      var handle = newAccHandle.replace("@", "").trim();
      await addAccount({
        handle: handle,
        name: newAccName,
        userId: user.id,
        platform: newAccPlatform,
        ...(newAccPlatform === "linkedin" && { linkedinType: newAccLinkedinType }),
      });
      
      setNewAccHandle("");
      setNewAccName("");
      setIsAddAccountOpen(false);
      await fetchAccounts();
      alert("✅ Berhasil ditambahkan!");
    } catch (error: any) {
      alert("❌ Gagal: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  var firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  var prevMonth = function() { setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)); };
  var nextMonth = function() { setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)); };

  var handleExportExcel = async function() {
    if (filteredPlans.length === 0) {
      alert("Tidak ada data.");
      return;
    }

    setIsProcessing(true);
    var prog = 10;
    setSyncProgress(prog);
    var interval = setInterval(function() {
      prog += 5;
      if (prog > 95) prog = 95;
      setSyncProgress(prog);
    }, 200);

    try {
      var plansWithStats = await Promise.all(
        filteredPlans.map(async function(plan) {
          var stats = null;
          if (plan.link) {
            try { stats = await getSinglePostAnalytics(plan.id, activePlatform); } catch (err) {}
          }
          return { ...plan, stats: stats };
        })
      );
      
      clearInterval(interval);
      setSyncProgress(100);
      setTimeout(function() { setSyncProgress(0); }, 1000);

      var headers = ["Judul", "Tanggal", "Status", "Format", "Link", "Views", "Likes", "Comments", "Shares"];
      var rows = plansWithStats.map(function(item) {
        var views = (item.stats && item.stats.playCount) || 0;
        var likes = (item.stats && item.stats.likeCount) || 0;
        var comms = (item.stats && item.stats.commentCount) || 0;
        var shrs = (item.stats && item.stats.shareCount) || 0;
        return [
          item.title || "", 
          item.publishDate ? parseSafeDate(item.publishDate).toLocaleDateString() : "",
          item.status || "",
          item.contentType || "",
          item.link || "",
          views, likes, comms, shrs
        ].join("\t");
      });

      var tsv = headers.join("\t") + "\n" + rows.join("\n");
      var blob = new Blob(["\uFEFF" + tsv], { type: "application/vnd.ms-excel;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", "Report_" + monthNames[currentDate.getMonth()] + ".xls");
      link.click();
    } catch (error) {
      alert("Gagal export.");
    } finally {
      setIsProcessing(false);
    }
  };

  var getStatusStyle = function(status: string) {
    switch (status) {
      case "Ideation": return "bg-cyan-100 text-cyan-700 border-cyan-300";
      case "Filming": return "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-300";
      case "Editing": return "bg-purple-100 text-purple-700 border-purple-300";
      case "Posted": return "bg-lime-300 text-lime-900 border-lime-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]";
      default: return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  if (authLoading || (!user && !authLoading)) {
    return <div className="min-h-screen bg-white flex items-center justify-center font-black">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-[#fafafa] bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] text-gray-900 font-sans pb-12 relative">
      
      {/* GLOBAL LOADING */}
      {isProcessing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-white/20 backdrop-blur-xl">
          <div className="bg-white border-2 border-black p-10 rounded-[48px] shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center gap-8 text-center relative">
             <div className="w-28 h-28 rounded-full border-4 border-black flex items-center justify-center bg-gray-50 relative overflow-hidden">
                <div className="absolute bottom-0 left-0 w-full bg-fuchsia-500 opacity-80" style={{ height: syncProgress + "%" }}></div>
                <span className="relative z-10 font-black text-xl italic">{Math.round(syncProgress)}%</span>
             </div>
             <div className="font-black italic uppercase tracking-tighter text-xl">Syncing Data...</div>
          </div>
        </div>
      )}

      {/* HEADER - PERSIS DASHBOARD UTAMA */}
      <header className="bg-white/80 backdrop-blur-md border-b-2 border-black px-4 md:px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-30 shadow-md">
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-2 md:gap-3">
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" className="text-fuchsia-500"></circle>
              <circle cx="6" cy="12" r="3" className="text-black"></circle>
              <circle cx="18" cy="19" r="3" className="text-cyan-500"></circle>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
            </svg>
            <h1 className="text-xl md:text-2xl font-black tracking-tighter">Content <span className="text-fuchsia-600">Planner</span> <span className="text-[10px] bg-black text-white px-1.5 py-0.5 rounded ml-1 tracking-widest">LITE</span></h1>
          </div>
        </div>

        <div className="flex items-center w-full md:w-auto gap-3">
            <button onClick={function() { setIsAddPlanOpen(true); }} className="px-4 py-2 bg-black text-white rounded-full font-bold text-xs tracking-wide flex items-center gap-2 border-2 border-black active:translate-y-1 transition-all"><Plus className="w-4 h-4" /> BUAT KONTEN</button>
            <div className="relative">
              <button 
                onClick={function() { setIsAccountDropdownOpen(!isAccountDropdownOpen); }}
                className="min-w-[140px] border-2 border-black rounded-full px-4 py-2 bg-white font-mono text-xs flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 truncate">
                  <BrandIcon platform={activePlatform} className="w-4 h-4" />
                  <span className="truncate">@{ (activeAccount && activeAccount.handle) || 'Pilih' }</span>
                </div>
                <ChevronRight className={"w-4 h-4 transform " + (isAccountDropdownOpen ? "rotate-90" : "")} />
              </button>

              {isAccountDropdownOpen && (
                <div className="absolute top-12 right-0 w-[200px] bg-white border-2 border-black rounded-xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] z-[61] overflow-hidden">
                    {accounts.map(function(acc) {
                      return (
                        <div
                          key={acc.id}
                          className={"px-4 py-3 text-xs font-mono border-b border-gray-100 flex items-center gap-3 cursor-pointer " + (selectedAccount === acc.id ? 'bg-gray-100 font-bold' : 'hover:bg-gray-50')}
                          onClick={function() { setSelectedAccount(acc.id); setIsAccountDropdownOpen(false); }}
                        >
                          <BrandIcon platform={acc.platform || 'tiktok'} className="w-4 h-4" />
                          <span className="flex-1 truncate">@{acc.handle}</span>
                          <button onClick={function(e) { e.stopPropagation(); handleDeleteAccount(acc.id, acc.platform || 'tiktok', acc.handle); }} className="text-gray-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      );
                    })}
                    <button onClick={function() { setIsAddAccountOpen(true); setIsAccountDropdownOpen(false); }} className="w-full p-2 text-[10px] font-black uppercase text-center bg-gray-50 border-t border-black">+ Add Account</button>
                </div>
              )}
            </div>
            <button onClick={logout} className="w-10 h-10 rounded-full bg-red-100 border-2 border-black flex items-center justify-center text-red-600 active:scale-90 transition-all"><LogOut className="w-4 h-4" /></button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-3 space-y-6">
            {/* PROFILE CARD - PREMIUM STYLE */}
            <div className="bg-white border-2 border-black rounded-3xl p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
               <div className="flex flex-col items-center text-center">
                  <div className="relative mb-4">
                     {profileStats && profileStats.avatar ? <img src={proxyImage(profileStats.avatar)} className="w-20 h-20 rounded-full border-2 border-black relative z-10 object-cover" alt="avatar" /> : <div className="w-20 h-20 rounded-full border-2 border-black bg-gray-100 flex items-center justify-center text-black font-black uppercase">{ (activeAccount && activeAccount.handle.slice(0,2)) || 'CP' }</div>}
                     <button onClick={handleSyncProfile} className="absolute bottom-0 right-0 w-8 h-8 bg-black text-white border-2 border-white rounded-full z-20 flex items-center justify-center"><RefreshCw className={"w-4 h-4 " + (isSyncing ? "animate-spin" : "")}/></button>
                  </div>
                  <h3 className="text-xl font-black italic tracking-tighter">@{activeAccount && activeAccount.handle}</h3>
                  <button onClick={handleSyncAll} className="mt-4 w-full py-2 bg-black text-white rounded-xl font-black text-[10px] tracking-widest border-2 border-black active:translate-y-1 transition-all">SYNC ALL POSTS</button>
               </div>

               <div className="mt-8 pt-6 border-t-2 border-black grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                     <div className="text-[8px] font-black font-mono text-gray-400">FOLLOWERS</div>
                     <div className="text-xl font-black font-mono">{ (profileStats && profileStats.followersCount && profileStats.followersCount.toLocaleString()) || 0 }</div>
                  </div>
                  <div className="space-y-1">
                     <div className="text-[8px] font-black font-mono text-fuchsia-400">HEARTS</div>
                     <div className="text-xl font-black font-mono text-fuchsia-600">{ (profileStats && profileStats.totalHeartsReceived && profileStats.totalHeartsReceived.toLocaleString()) || 0 }</div>
                  </div>
               </div>
            </div>

            {/* STATUS SUMMARY */}
            <div className="bg-black rounded-3xl p-6 text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
               <h2 className="text-lg font-black italic italic mb-4 text-cyan-400 uppercase">Status Konten</h2>
               <div className="space-y-3">
                  {["Ideation", "Filming", "Editing", "Posted"].map(function(st) {
                    var count = filteredPlans.filter(function(p) { return p.status === st; }).length;
                    return (
                      <div key={st} className="flex justify-between items-center text-xs font-mono border-b border-white/10 pb-2 last:border-0 uppercase tracking-widest">
                         <span>{st}</span>
                         <span className="font-black text-white">{count}</span>
                      </div>
                    );
                  })}
               </div>
            </div>
          </div>

          <div className="lg:col-span-9 space-y-6">
             {/* CONTROLS - PREMIUM STYLE */}
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border-2 border-black rounded-2xl p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex gap-1">
                   {["calendar", "kanban", "list"].map(function(v) {
                     return (
                       <button key={v} onClick={function() { setActiveView(v as any); }} className={"px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all " + (activeView === v ? "bg-black text-white" : "hover:bg-gray-100")}>
                          {v === 'calendar' ? <CalendarIcon className="w-3.5 h-3.5" /> : <LayoutList className="w-3.5 h-3.5" />}
                          {v}
                       </button>
                     );
                   })}
                </div>
                <div className="flex items-center justify-between md:justify-end gap-4 px-4">
                   <button onClick={handleExportExcel} className="p-1 px-3 bg-green-50 text-green-700 border-2 border-green-200 rounded-lg text-[10px] font-black uppercase flex items-center gap-2"><Download className="w-3.5 h-3.5"/> EXPORT XLS</button>
                   <div className="flex items-center gap-4 font-black text-xs uppercase italic">
                      <button onClick={prevMonth} className="hover:text-fuchsia-500"><ChevronLeft className="w-5 h-5"/></button>
                      <span className="min-w-[120px] text-center">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
                      <button onClick={nextMonth} className="hover:text-fuchsia-500"><ChevronRight className="w-5 h-5"/></button>
                   </div>
                </div>
             </div>

             {/* DYNAMIC VIEWS */}
             {activeView === 'calendar' && (
                <div className="bg-white border-2 border-black rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                   <div className="grid grid-cols-7 border-b-2 border-black bg-gray-50">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(function(day) { return <div key={day} className="p-3 text-center text-[10px] font-black uppercase font-mono border-r-2 border-black last:border-r-0">{day}</div>; })}
                   </div>
                   <div className="grid grid-cols-7">
                      {Array.from({ length: firstDay }).map(function(_, i) { return <div key={"empty-"+i} className="min-h-[120px] border-b-2 border-r-2 border-gray-100 bg-gray-50/50"></div>; })}
                      {Array.from({ length: daysInMonth }).map(function(_, i) {
                        var dayNum = i + 1;
                        var dayPlans = plans.filter(function(p) { var d = parseSafeDate(p.publishDate); return d.getDate() === dayNum && d.getMonth() === currentDate.getMonth(); });
                        return (
                          <div key={dayNum} onClick={function() { handleDayClick(dayNum, currentDate.getMonth(), currentDate.getFullYear()); }} className="min-h-[140px] p-2 border-b-2 border-r-2 border-gray-100 hover:bg-fuchsia-50 transition-all group relative cursor-pointer">
                             <div className="text-xs font-black font-mono mb-2">{dayNum}</div>
                             <div className="space-y-1.5 pb-2">
                                {dayPlans.map(function(p) {
                                  return (
                                    <div key={p.id} onClick={function(e) { e.stopPropagation(); handleOpenModal(p); }} className={"p-1.5 rounded-xl border-2 text-[8px] font-black uppercase leading-tight hover:scale-105 transition-all " + getStatusStyle(p.status)}>
                                       {p.title}
                                    </div>
                                  );
                                })}
                             </div>
                          </div>
                        );
                      })}
                   </div>
                </div>
             )}

             {activeView === 'kanban' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                   {["Ideation", "Filming", "Editing", "Posted"].map(function(status) {
                     var columnPlans = filteredPlans.filter(function(p) { return p.status === status; });
                     return (
                       <div key={status} className="flex flex-col gap-4">
                          <h3 className="text-[10px] font-black font-mono uppercase tracking-[0.2em] border-b-2 border-black pb-2 mb-2">{status} ({columnPlans.length})</h3>
                          <div className="space-y-4">
                             {columnPlans.map(function(plan) {
                               return (
                                 <div key={plan.id} onClick={function() { handleOpenModal(plan); }} className={"bg-white border-2 border-black rounded-2xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none active:translate-x-1 active:translate-y-1 transition-all " + getStatusStyle(plan.status)}>
                                    <div className="flex flex-col gap-3">
                                       {plan.coverUrl && <img src={proxyImage(plan.coverUrl)} className="w-full aspect-video rounded-xl border border-black/10 object-cover" alt="cover" />}
                                       <h4 className="text-[10px] font-black italic text-black leading-tight">{plan.title}</h4>
                                       <div className="text-[8px] font-mono font-bold text-black/40 uppercase uppercase">📅 {parseSafeDate(plan.publishDate).toLocaleDateString()}</div>
                                    </div>
                                 </div>
                               );
                             })}
                             {columnPlans.length === 0 && <div className="h-20 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center text-[10px] font-black text-gray-300">KOSONG</div>}
                          </div>
                       </div>
                     );
                   })}
                </div>
             )}

             {activeView === 'list' && (
                <div className="space-y-4">
                   {filteredPlans.map(function(plan) {
                     return (
                       <div key={plan.id} onClick={function() { handleOpenModal(plan); }} className={"bg-white border-2 border-black cursor-pointer rounded-2xl p-4 flex items-center justify-between gap-4 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all " + getStatusStyle(plan.status)}>
                          <div className="flex items-center gap-4 text-black min-w-0">
                             {plan.coverUrl ? <img src={proxyImage(plan.coverUrl)} className="w-12 h-12 rounded-lg object-cover border border-black/10" alt="p" /> : <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center border-2 border-black/5"><Video className="w-5 h-5 text-gray-300"/></div>}
                             <div className="truncate">
                                <span className="text-[8px] font-black uppercase opacity-40 mb-1 block tracking-widest">{activePlatform}</span>
                                <h3 className="font-black italic text-sm sm:text-base truncate">{plan.title}</h3>
                                <p className="text-[9px] font-mono font-bold mt-1 uppercase text-black/50">{plan.status} • {parseSafeDate(plan.publishDate).toLocaleDateString()}</p>
                             </div>
                          </div>
                          <ChevronRight className="w-6 h-6 text-black"/>
                       </div>
                     );
                   })}
                </div>
             )}
          </div>
      </main>

      {/* FOOTER */}
      <footer className="text-center p-12 mt-12 border-t-2 border-black/5">
        <div className="inline-flex items-center gap-3 px-4 py-2 bg-gray-50 border border-black/10 rounded-2xl">
           <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
           <span className="text-[9px] font-black font-mono text-black uppercase tracking-widest">LITE v{APP_VERSION} • {COMMIT_HASH}</span>
        </div>
      </footer>

      {/* DETAIL MODAL - PERSIS DASHBOARD UTAMA */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={function() { setSelectedPlan(null); }}>
          <div className="bg-white rounded-[32px] border-2 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] w-full max-w-lg max-h-[90vh] overflow-y-auto no-scrollbar" onClick={function(e) { e.stopPropagation(); }}>
              <div className="border-b-2 border-black p-5 flex items-center justify-between bg-gray-50 sticky top-0 z-10">
                 <div className="flex items-center gap-2">
                    <span className={"px-3 py-1 rounded-full border-2 border-black text-[10px] font-black uppercase tracking-widest " + getStatusStyle(selectedPlan.status)}>{selectedPlan.status}</span>
                    <span className="font-mono text-[10px] font-black">📅 {parseSafeDate(selectedPlan.publishDate).toLocaleDateString()}</span>
                 </div>
                 <button onClick={function() { setSelectedPlan(null); }} className="w-8 h-8 rounded-full border-2 border-black flex items-center justify-center hover:bg-gray-100"><X className="w-4 h-4"/></button>
              </div>

              <div className="p-6 space-y-6">
                 {selectedPlan.coverUrl && <div className="w-full aspect-video rounded-3xl border-2 border-black overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"><img src={proxyImage(selectedPlan.coverUrl)} className="w-full h-full object-cover" alt="cover" onClick={function() { setPreviewImage(selectedPlan.coverUrl!); }}/></div>}

                 {isEditing ? (
                   <div className="space-y-4">
                      <input type="text" className="w-full px-4 py-3 border-2 border-black rounded-2xl font-black italic bg-white" value={selectedPlan.title} onChange={function(e) { setSelectedPlan({...selectedPlan, title: e.target.value}); }} />
                      <div className="flex gap-3">
                         <select className="flex-1 px-3 py-3 border-2 border-black rounded-2xl font-black text-[10px] uppercase tracking-widest" value={selectedPlan.status} onChange={function(e) { setSelectedPlan({...selectedPlan, status: e.target.value as any}); }}>
                            <option>Ideation</option><option>Filming</option><option>Editing</option><option>Posted</option>
                         </select>
                         <select className="flex-1 px-3 py-3 border-2 border-black rounded-2xl font-black text-[10px] uppercase tracking-widest" value={selectedPlan.contentType} onChange={function(e) { setSelectedPlan({...selectedPlan, contentType: e.target.value as any}); }}>
                            <option>Video</option><option>Carousel</option><option>Story</option>
                         </select>
                      </div>
                   </div>
                 ) : (
                   <div className="flex justify-between items-start">
                      <h2 className="text-2xl font-black italic tracking-tighter leading-tight">{selectedPlan.title}</h2>
                      <button onClick={function() { setIsEditing(true); }} className="p-2 border-2 border-black rounded-xl bg-gray-50"><Edit3 className="w-4 h-4"/></button>
                   </div>
                 )}

                 {selectedPlan.link && !isEditing && (
                    <div className="bg-cyan-50 border-2 border-black rounded-2xl p-4 flex items-center justify-between">
                       <span className="text-xs font-mono truncate mr-4">{selectedPlan.link}</span>
                       <a href={selectedPlan.link} target="_blank" rel="noopener noreferrer" className="p-2 bg-white border-2 border-black rounded-xl"><ExternalLink className="w-4 h-4 text-cyan-600"/></a>
                    </div>
                 )}
                 
                 {isEditing && (
                   <input type="url" placeholder="Link..." className="w-full px-4 py-3 border-2 border-black rounded-2xl font-mono text-[10px]" value={selectedPlan.link || ""} onChange={function(e) { setSelectedPlan({...selectedPlan, link: e.target.value}); }} />
                 )}

                 {/* ANALYTICS SECTION */}
                 {selectedPlan.link && !isEditing && (
                   <div className="bg-white border-2 border-black rounded-3xl p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                      <div className="flex justify-between items-center mb-6">
                         <h3 className="text-[10px] font-black uppercase tracking-widest italic flex items-center gap-2"><Disc3 className="w-4 h-4 text-fuchsia-500 animate-spin-slow"/> Live Analytics</h3>
                         <button onClick={handleSyncPostStats} className="px-3 py-1.5 bg-fuchsia-100 text-fuchsia-900 border-2 border-black rounded-xl text-[9px] font-black uppercase">SYNC</button>
                      </div>
                      {postStats ? (
                        <div className="grid grid-cols-4 gap-4 text-center">
                           <div><div className="text-[8px] font-black text-gray-400">PLAYS</div><div className="text-sm font-black font-mono">{postStats.playCount || 0}</div></div>
                           <div><div className="text-[8px] font-black text-fuchsia-400">LIKES</div><div className="text-sm font-black font-mono text-fuchsia-600">{postStats.likeCount || 0}</div></div>
                           <div><div className="text-[8px] font-black text-blue-400">COMMS</div><div className="text-sm font-black font-mono text-blue-600">{postStats.commentCount || 0}</div></div>
                           <div><div className="text-[8px] font-black text-cyan-400">SHARES</div><div className="text-sm font-black font-mono text-cyan-600">{postStats.shareCount || 0}</div></div>
                        </div>
                      ) : <div className="text-center font-mono text-[10px] text-gray-300 py-4 uppercase tracking-widest">No analytics synced yet...</div>}
                   </div>
                 )}

                 <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest italic flex items-center gap-2 text-black/50"><AlignLeft className="w-4 h-4"/> Script / Briefing</label>
                    {isEditing ? (
                      <textarea className="w-full min-h-[150px] p-4 border-2 border-black rounded-3xl font-mono text-xs outline-none bg-gray-50/50" value={selectedPlan.brief} onChange={function(e) { setSelectedPlan({...selectedPlan, brief: e.target.value}); }} />
                    ) : (
                      <div className="w-full min-h-[120px] p-6 border-2 border-black/10 rounded-3xl font-mono text-xs whitespace-pre-wrap leading-relaxed shadow-inner bg-gray-50/20">{selectedPlan.brief || "No description provided..."}</div>
                    )}
                 </div>
              </div>

              <div className="p-6 border-t-2 border-black bg-gray-50 flex gap-4 rounded-b-[32px]">
                 {isEditing ? (
                   <>
                     <button onClick={function() { setIsEditing(false); }} className="flex-1 py-4 border-2 border-black rounded-2xl font-black text-xs hover:bg-white active:translate-y-1 transition-all">BATAL</button>
                     <button onClick={handleUpdatePlan} className="flex-1 py-4 bg-black text-white border-2 border-black rounded-2xl font-black text-xs active:translate-y-1 transition-all">SIMPAN</button>
                   </>
                 ) : (
                   <>
                     <button onClick={function(e) { handleDelete(e, selectedPlan.id); }} className="px-5 py-4 border-2 border-black rounded-2xl text-red-600 hover:bg-red-50"><Trash2 className="w-5 h-5"/></button>
                     <button onClick={function(e) { handleStatusChange(e, selectedPlan.id, selectedPlan.status); }} className="flex-1 py-4 bg-black text-white border-2 border-black rounded-2xl font-black text-xs uppercase tracking-widest active:translate-y-1 transition-all">LANJUT STATUS ➟</button>
                   </>
                 )}
              </div>
          </div>
        </div>
      )}

      {/* SYNC ALL TOAST */}
      {isSyncingAll && (
        <div className="fixed bottom-6 right-6 left-6 md:left-auto z-[80] bg-white border-2 border-black p-5 rounded-3xl shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] max-w-sm ml-auto animate-in slide-in-from-bottom-4">
           <div className="flex justify-between items-center mb-3 font-black text-[10px] uppercase tracking-widest italic">
              <span>Batch Syncing</span>
              <span className="text-fuchsia-600">{Math.round((syncAllProgress.current / (syncAllProgress.total || 1)) * 100)}%</span>
           </div>
           <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden border border-black/5 mb-3">
              <div className="bg-gradient-to-r from-fuchsia-500 to-cyan-400 h-full transition-all duration-700" style={{ width: (syncAllProgress.current / (syncAllProgress.total || 1)) * 100 + "%" }}></div>
           </div>
           <div className="text-[9px] font-bold font-mono text-black/50 truncate uppercase italic">{syncAllProgress.label}</div>
        </div>
      )}

      {/* FULLSCREEN PREVIEW */}
      {previewImage && (
        <div className="fixed inset-0 z-[101] bg-black flex items-center justify-center p-4 cursor-zoom-out" onClick={function() { setPreviewImage(null); }}>
          <button className="absolute top-8 right-8 text-white"><X className="w-10 h-10"/></button>
          <img src={proxyImage(previewImage)} className="max-w-full max-h-full object-contain border-4 border-white rounded-3xl shadow-2xl" alt="P"/>
        </div>
      )}

      {/* ADD ACCOUNT / PLAN MODALS - MINIMALIZED FOR STABILITY */}
      {isAddAccountOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60" onClick={function() { setIsAddAccountOpen(false); }}>
          <div className="bg-white rounded-3xl border-2 border-black p-6 shadow-xl w-full max-w-sm" onClick={function(e) { e.stopPropagation(); }}>
             <h2 className="text-xl font-black italic uppercase tracking-tighter mb-6">Tambah Profil</h2>
             <form onSubmit={handleAddAccount} className="space-y-4">
                <input type="text" placeholder="Handle (tanpa @)..." className="w-full p-4 border-2 border-black rounded-2xl font-mono text-xs uppercase" value={newAccHandle} onChange={function(e) { setNewAccHandle(e.target.value); }} />
                <input type="text" placeholder="Nama..." className="w-full p-4 border-2 border-black rounded-2xl font-mono text-xs uppercase" value={newAccName} onChange={function(e) { setNewAccName(e.target.value); }} />
                <div className="flex border-2 border-black rounded-2xl overflow-hidden font-black text-[10px]">
                   <button type="button" onClick={function() { setNewAccPlatform("tiktok"); }} className={"flex-1 py-3 " + (newAccPlatform === "tiktok" ? "bg-black text-white" : "")}>TIKTOK</button>
                   <button type="button" onClick={function() { setNewAccPlatform("instagram"); }} className={"flex-1 py-3 " + (newAccPlatform === "instagram" ? "bg-black text-white" : "")}>IG</button>
                   <button type="button" onClick={function() { setNewAccPlatform("linkedin"); }} className={"flex-1 py-3 " + (newAccPlatform === "linkedin" ? "bg-black text-white" : "")}>IN</button>
                </div>
                <button type="submit" className="w-full py-4 bg-black text-white rounded-2xl font-black text-xs tracking-widest uppercase">SIMPAN PROFIL</button>
             </form>
          </div>
        </div>
      )}

      {isAddPlanOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60" onClick={function() { setIsAddPlanOpen(false); }}>
          <div className="bg-white rounded-3xl border-2 border-black p-6 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] w-full max-w-md max-h-[90vh] overflow-y-auto no-scrollbar" onClick={function(e) { e.stopPropagation(); }}>
             <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black italic tracking-tight flex items-center gap-2"><Plus className="w-6 h-6 text-fuchsia-500" /> Rencana Baru</h2>
                <button onClick={function() { setIsAddPlanOpen(false); }} className="bg-gray-100 p-2 rounded-full hover:bg-black hover:text-white transition-colors"><X className="w-4 h-4" /></button>
             </div>
             <form onSubmit={handleAddPlan} className="space-y-4">
                <div className="group">
                  <label className="text-[10px] font-black font-mono text-black uppercase mb-1 ml-1 block">Hook / Title</label>
                  <input type="text" required placeholder="POV: You..." className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-black outline-none font-sans font-bold transition-all" value={newTitle} onChange={function(e) { setNewTitle(e.target.value); }} />
                </div>
                <div className="group">
                  <label className="text-[10px] font-black font-mono text-black uppercase mb-1 ml-1 block">Post Link (Optional)</label>
                  <input type="url" placeholder="https://tiktok.com/..." className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-black outline-none font-mono text-xs transition-all" value={newLink} onChange={function(e) { setNewLink(e.target.value); }} />
                </div>
                <div className="group">
                  <label className="text-[10px] font-black font-mono text-black uppercase mb-1 ml-1 block">Brief / Description</label>
                  <textarea placeholder="Notes..." className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-black outline-none font-mono text-xs transition-all min-h-[100px] resize-none" value={newBrief} onChange={function(e) { setNewBrief(e.target.value); }} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black font-mono text-black uppercase mb-1 ml-1 block">Publish_Date</label>
                    <input type="date" required className="w-full px-3 py-3 rounded-xl border-2 border-gray-200 focus:border-black outline-none" value={newDate} onChange={function(e) { setNewDate(e.target.value); }} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black font-mono text-black uppercase mb-1 ml-1 block">Format</label>
                    <select className="w-full px-3 py-3 border-2 border-gray-200 rounded-xl focus:border-black outline-none" value={newType} onChange={function(e) { setNewType(e.target.value); }}>
                      <option>Video</option><option>Carousel</option><option>Story</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="w-full bg-black text-white px-4 py-4 rounded-2xl font-black text-sm tracking-widest hover:bg-gradient-to-r hover:from-fuchsia-600 hover:to-cyan-500 transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)] mt-4">JADWALKAN KONTEN ➟</button>
             </form>
          </div>
        </div>
      )}

    </div>
  );
}
