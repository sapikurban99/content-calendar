"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { onSnapshot, doc, collection, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Plus, Video, Calendar as CalendarIcon, Trash2, Sparkles, Disc3, LayoutList, ChevronLeft, ChevronRight, Hash, AlignLeft, X, Link as LinkIcon, ExternalLink, RefreshCw, Activity, Heart, Users, Eye, MessageCircle, Share2, UserPlus, AtSign, Smartphone, Edit3, LogOut } from "lucide-react";
import { 
  getAccounts, 
  getProfileStats, 
  syncTikTokAnalytics, 
  addAccount, 
  getContentPlans, 
  addContentPlan, 
  updatePlanStatus, 
  deleteContentPlan,
  getSinglePostAnalytics,
  syncSinglePostAnalytics,
  updateContentPlan
} from "@/lib/services";
import type { Account, ContentPlan, TikTokProfile, TikTokPostAnalytics } from "@/types/index";
// ✨ Sytem Utility: Safe Date Parser for old iOS (Safari < 15)
const parseSafeDate = (dateStr: string | undefined | null) => {
  if (!dateStr) return new Date();
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;
  
  // Fallback ISO polyfill for iOS 14
  const fallback = new Date(dateStr.replace(/-/g, '/').replace('T', ' '));
  return isNaN(fallback.getTime()) ? new Date() : fallback;
};

export default function DashboardPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [plans, setPlans] = useState<ContentPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Analytics Stats
  const [profileStats, setProfileStats] = useState<TikTokProfile | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // View, Calendar, & Modal State
  const [activeView, setActiveView] = useState<"list" | "calendar">("calendar");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedPlan, setSelectedPlan] = useState<ContentPlan | null>(null);
  const [postStats, setPostStats] = useState<TikTokPostAnalytics | null>(null); 
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [draggedPlan, setDraggedPlan] = useState<ContentPlan | null>(null);
  const [linkRequiredModal, setLinkRequiredModal] = useState<{ isOpen: boolean; planId: string; status: string }>({ isOpen: false, planId: '', status: '' });
  const [requiredLink, setRequiredLink] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    } else if (user) {
      fetchAccounts();
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!selectedAccount || !user) return;
    setIsLoading(true);

    const unsubscribeProfile = onSnapshot(doc(db, "profiles", selectedAccount), (docSnap) => {
      if (docSnap.exists()) {
        setProfileStats(docSnap.data() as TikTokProfile);
      } else {
        setProfileStats(null);
      }
    });

    const plansQuery = query(
      collection(db, "content_plans"),
      where("accountId", "==", selectedAccount),
      where("userId", "==", user.id)
    );

    const unsubscribePlans = onSnapshot(plansQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ContentPlan));
      setPlans(data.sort((a, b) => parseSafeDate(b.publishDate).getTime() - parseSafeDate(a.publishDate).getTime()));
      setIsLoading(false);
    }, (error) => {
      console.error("Plans listener error:", error);
      setIsLoading(false);
    });

    return () => {
      unsubscribeProfile();
      unsubscribePlans();
    };
  }, [selectedAccount, user]);

  // ✨ DERIVED STATE: Filtered plans based on current month/year
  const filteredPlans = plans.filter(p => {
    const d = parseSafeDate(p.publishDate);
    return d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
  });

  const fetchAccounts = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const data = await getAccounts(user.id);
      setAccounts(data);
      if (data.length > 0) setSelectedAccount(data[0].id);
    } catch (error) {
      console.error("Error fetching accounts:", error);
    }
    setIsLoading(false);
  };

  const handleOpenModal = async (plan: ContentPlan) => {
    setSelectedPlan(plan);
    setPostStats(null); 
    setIsEditing(false); // Reset edit mode
    if (plan.link) {
      const stats = await getSinglePostAnalytics(plan.id);
      if (stats) setPostStats(stats);
    }
  };

  const handleSyncPostStats = async () => {
    if (!selectedPlan || !selectedPlan.link) return;
    setIsSyncingPost(true);
    setIsProcessing(true);
    try {
      await syncSinglePostAnalytics(selectedPlan.id, selectedPlan.link);
    } catch (error) {
      console.error("Post sync error:", error);
      alert("Failed to sync post stats... 😭");
    } finally {
      setIsSyncingPost(false);
      setIsProcessing(false);
    }
  };

  const handleAddPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount || !newTitle || !newDate) {
      alert("⚠️ Mohon isi semua field yang diperlukan!");
      return;
    }

    setIsProcessing(true);
    try {
      await addContentPlan({
        accountId: selectedAccount,
        userId: user!.id,
        title: newTitle,
        link: newLink,
        brief: newBrief,
        publishDate: parseSafeDate(newDate).toISOString(),
        contentType: newType,
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
      alert(`❌ Gagal menyimpan: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSyncProfile = async () => {
    if (!selectedAccount) return;
    setIsSyncing(true);
    setIsProcessing(true);
    try {
      await syncTikTokAnalytics(selectedAccount);
    } catch (error: any) {
      alert("❌ Sync Error: " + error.message);
    } finally {
      setIsSyncing(false);
      setIsProcessing(false);
    }
  };

  const handleUpdatePlan = async () => {
    if (!selectedPlan) return;
    setIsSyncing(true); // Reuse isSyncing as a general busy state or could use its own
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
      alert("❌ Failed to update plan: " + error.message);
    } finally {
      setIsSyncing(false);
      setIsProcessing(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, planId: string) => {
    e.stopPropagation();
    if (!confirm("Hapus rencana ini?")) return;
    setIsProcessing(true);
    try {
      await deleteContentPlan(planId);
      if (selectedPlan?.id === planId) setSelectedPlan(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStatusChange = async (e: React.MouseEvent, planId: string, currentStatus: string) => {
    e.stopPropagation();
    const nextStatus = currentStatus === "Ideation" ? "Filming" : currentStatus === "Filming" ? "Editing" : "Posted";
    
    // Check if link is present before posting
    if (nextStatus === "Posted") {
      const plan = plans.find(p => p.id === planId);
      if (!plan?.link) {
        setLinkRequiredModal({ isOpen: true, planId, status: nextStatus });
        return;
      }
    }

    setIsProcessing(true);
    try {
      await updatePlanStatus(planId, nextStatus);

      if (selectedPlan?.id === planId) {
        setSelectedPlan({ ...selectedPlan, status: nextStatus });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const submitRequiredLink = async () => {
    if (!requiredLink.trim()) {
      alert("Link wajib diisi untuk status Posted!");
      return;
    }
    
    setIsProcessing(true);
    try {
      await updateContentPlan(linkRequiredModal.planId, { link: requiredLink });
      await updatePlanStatus(linkRequiredModal.planId, linkRequiredModal.status);
      
      if (selectedPlan?.id === linkRequiredModal.planId) {
        setSelectedPlan({ ...selectedPlan, status: linkRequiredModal.status, link: requiredLink });
      }
      
      setLinkRequiredModal({ isOpen: false, planId: '', status: '' });
      setRequiredLink("");
      alert("✅ Status diupdate ke Posted!");
    } catch (error) {
      alert("❌ Gagal update status.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccHandle || !newAccName) return;

    setIsProcessing(true);
    try {
      const handle = newAccHandle.replace("@", "").trim();
      await addAccount({
        handle: handle,
        name: newAccName,
        userId: user!.id,
      });
      
      setNewAccHandle("");
      setNewAccName("");
      setIsAddAccountOpen(false);
      await fetchAccounts();
      alert(`✅ Akun @${handle} berhasil ditambahkan!`);
    } catch (error: any) {
      alert("❌ Gagal menambah akun: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const firstDay = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const handleDayClick = (dayNum: number, currentMonth: number, currentYear: number) => {
    const formattedDate = new Date(Date.UTC(currentYear, currentMonth, dayNum, 12, 0, 0)).toISOString().split("T")[0];
    setNewDate(formattedDate);
    setIsAddPlanOpen(true);
  };

  const handleDragOver = (e: React.DragEvent, dayNum: number) => {
    e.preventDefault();
    e.currentTarget.classList.add('dragging-over');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('dragging-over');
  };

  const handleDrop = async (e: React.DragEvent, dayNum: number) => {
    e.preventDefault();
    e.currentTarget.classList.remove('dragging-over');
    if (!draggedPlan) return;
    
    // Create new UTC date to prevent timezone shifts when saving
    const newDate = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), dayNum, 12, 0, 0));
    const dateStr = newDate.toISOString();
    
    setIsProcessing(true);
    try {
      await updateContentPlan(draggedPlan.id, { publishDate: dateStr });
      if (selectedPlan?.id === draggedPlan.id) setSelectedPlan({...selectedPlan, publishDate: dateStr});
    } catch (err) {
      alert("❌ Gagal memindahkan jadwal.");
    } finally {
      setIsProcessing(false);
      setDraggedPlan(null);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "Ideation": return "bg-cyan-100 text-cyan-700 border-cyan-300";
      case "Filming": return "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-300";
      case "Editing": return "bg-purple-100 text-purple-700 border-purple-300";
      case "Posted": return "bg-lime-300 text-lime-900 border-lime-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]";
      default: return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  if (authLoading || (!user && !authLoading)) {
    return <div className="min-h-screen bg-[#fafafa] flex items-center justify-center font-black animate-pulse">Loading Planner...</div>;
  }

  return (
    <div className="min-h-screen bg-[#fafafa] bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] text-gray-900 font-sans selection:bg-fuchsia-300 selection:text-black pb-12 relative">

      {/* ✨ GLOBAL PROCESSING INDICATOR */}
      {isProcessing && <div className="loading-bar"></div>}

      {/* ✨ LINK REQUIRED MODAL */}
      {linkRequiredModal.isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md transition-all" onClick={() => setLinkRequiredModal({ isOpen: false, planId: '', status: '' })}>
          <div className="bg-white rounded-3xl border-2 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black italic tracking-tight flex items-center gap-2"><LinkIcon className="w-5 h-5 text-lime-500" /> Link Required</h2>
                <button onClick={() => setLinkRequiredModal({ isOpen: false, planId: '', status: '' })} className="bg-gray-100 p-2 rounded-full hover:bg-black hover:text-white transition-colors"><X className="w-4 h-4" /></button>
              </div>
              <p className="text-xs font-mono mb-4 text-gray-700">Kamu harus memasukkan referensi link (misal: TikTok) sebelum menandai konten ini sebagai <span className="font-bold text-lime-600 bg-lime-100 px-1 rounded">Posted</span>.</p>
              <input type="url" placeholder="https://tiktok.com/..." className="w-full px-4 py-3 mb-4 bg-gray-50 border-2 border-black rounded-xl focus:bg-white outline-none font-mono text-sm transition-all" value={requiredLink} onChange={(e) => setRequiredLink(e.target.value)} />
              <button onClick={submitRequiredLink} className="w-full bg-lime-400 text-black px-4 py-4 rounded-2xl font-black text-sm tracking-widest hover:bg-lime-500 transition-all border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none">SIMPAN & POSTED ➔</button>
            </div>
          </div>
        </div>
      )}

      {/* ✨ DETAIL & EDIT MODAL */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm transition-opacity" onClick={() => setSelectedPlan(null)}>
          <div className="bg-white rounded-3xl border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-lg max-h-[95vh] overflow-y-auto relative no-scrollbar" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="border-b-2 border-black p-5 flex items-center justify-between bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:10px_10px]">
              <div className="flex items-center gap-3">
                <span className={`font-mono text-xs uppercase tracking-widest font-bold px-3 py-1 rounded-full border ${getStatusStyle(selectedPlan.status)}`}>
                  {selectedPlan.status}
                </span>
                <span className="font-mono text-xs text-black bg-white px-2 py-1 rounded-md border-2 border-black flex items-center gap-1">
                  <CalendarIcon className="w-3 h-3" /> {parseSafeDate(selectedPlan.publishDate).toLocaleDateString('en-GB')}
                </span>
              </div>
              <button onClick={() => setSelectedPlan(null)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors border-2 border-transparent hover:border-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {selectedPlan.coverUrl && (
                <div 
                  className="w-full aspect-video rounded-2xl border-2 border-black overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative group/cover cursor-zoom-in"
                  onClick={() => setPreviewImage(selectedPlan.coverUrl!)}
                >
                  <img src={selectedPlan.coverUrl} alt="Video Cover" className="w-full h-full object-cover transition-transform duration-500 group-hover/cover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover/cover:opacity-100 transition-opacity flex items-end p-4">
                    <span className="text-white font-mono text-[10px] font-bold tracking-widest flex items-center gap-2">
                      <Sparkles className="w-3 h-3" /> KLIK UNTUK MEMPERBESAR
                    </span>
                  </div>
                </div>
              )}

              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black font-mono text-black uppercase mb-1 block">Judul Konten</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-3 border-2 border-black rounded-xl font-bold outline-none focus:ring-2 ring-fuchsia-500/20"
                      value={selectedPlan.title}
                      onChange={(e) => setSelectedPlan({...selectedPlan, title: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black font-mono text-black uppercase mb-1 block">📅 Tanggal Publish</label>
                    <input 
                      type="date" 
                      className="w-full px-4 py-2 bg-gray-50 border-2 border-black rounded-xl font-mono text-xs outline-none focus:ring-2 ring-fuchsia-500/20"
                      value={selectedPlan.publishDate ? parseSafeDate(selectedPlan.publishDate).toISOString().split('T')[0] : ''}
                      onChange={(e) => setSelectedPlan({...selectedPlan, publishDate: new Date(e.target.value).toISOString()})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black font-mono text-black uppercase mb-1 block">Ubah Status</label>
                      <select 
                        className="w-full px-3 py-2 border-2 border-black rounded-xl font-mono text-xs outline-none"
                        value={selectedPlan.status}
                        onChange={(e) => setSelectedPlan({...selectedPlan, status: e.target.value as any})}
                      >
                        <option>Ideation</option>
                        <option>Filming</option>
                        <option>Editing</option>
                        <option>Posted</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black font-mono text-black uppercase mb-1 block">Format Konten</label>
                      <select 
                        className="w-full px-3 py-2 border-2 border-black rounded-xl font-mono text-xs outline-none"
                        value={selectedPlan.contentType}
                        onChange={(e) => setSelectedPlan({...selectedPlan, contentType: e.target.value as any})}
                      >
                        <option>Video</option>
                        <option>Carousel</option>
                        <option>Story</option>
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-black tracking-tight mb-2">{selectedPlan.title}</h2>
                    <div className="flex items-center gap-2 text-sm font-mono text-black">
                      <Hash className="w-4 h-4" /> {selectedPlan.contentType}
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="p-2 bg-gray-100 rounded-lg hover:bg-black hover:text-white transition-all border-2 border-transparent hover:border-black"
                    title="Edit Plan"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              )}

              {selectedPlan.link && !isEditing && (
                <div className="bg-cyan-50 border-2 border-cyan-200 rounded-xl p-3 flex items-center justify-between group">
                  <div className="flex items-center gap-2 truncate">
                    <LinkIcon className="w-4 h-4 text-cyan-600 flex-shrink-0" />
                    <span className="text-sm font-mono text-cyan-800 truncate">{selectedPlan.link}</span>
                  </div>
                  <a href={selectedPlan.link.startsWith('http') ? selectedPlan.link : `https://${selectedPlan.link}`} target="_blank" rel="noopener noreferrer" className="p-2 bg-white rounded-lg border-2 border-cyan-200 hover:bg-cyan-100 transition-colors flex-shrink-0">
                    <ExternalLink className="w-4 h-4 text-cyan-700" />
                  </a>
                </div>
              )}

              {isEditing && (
                <div>
                  <label className="text-[10px] font-black font-mono text-black uppercase mb-1 block">Link Postingan</label>
                  <input 
                    type="url" 
                    className="w-full px-4 py-3 border-2 border-black rounded-xl font-mono text-xs outline-none"
                    value={selectedPlan.link}
                    onChange={(e) => setSelectedPlan({...selectedPlan, link: e.target.value})}
                  />
                </div>
              )}

              {selectedPlan.link && !isEditing && (
                <div className="bg-white border-2 border-black rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-mono font-bold text-sm flex items-center gap-2 text-black">
                      <Disc3 className={`w-4 h-4 text-fuchsia-500 ${isSyncingPost ? 'animate-spin' : ''}`} /> 
                      Statistik Postingan
                    </h3>
                    <button 
                      onClick={handleSyncPostStats}
                      disabled={isSyncingPost}
                      className={`text-[10px] font-mono font-bold px-3 py-1.5 border-2 border-black rounded-lg transition-all ${isSyncingPost ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-fuchsia-100 text-fuchsia-900 hover:bg-fuchsia-200 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none'}`}
                    >
                      {isSyncingPost ? 'LOADING...' : 'Update Data'}
                    </button>
                  </div>

                  {postStats ? (
                    <div className="flex flex-col sm:flex-row gap-4">
                      {/* Cover Thumbnail Preview */}
                      {postStats.coverUrl && (
                        <div 
                          className="w-full sm:w-24 aspect-[9/16] sm:aspect-square rounded-lg border-2 border-black overflow-hidden bg-gray-50 flex-shrink-0 cursor-zoom-in group/sync"
                          onClick={() => setPreviewImage(postStats.coverUrl!)}
                        >
                          <img src={postStats.coverUrl} className="w-full h-full object-cover transition-transform group-hover/sync:scale-110" alt="Sync Preview" />
                        </div>
                      )}

                      <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2">
                        <div className="flex flex-col items-center justify-center bg-gray-50 border border-black rounded-lg p-2">
                          <Eye className="w-4 h-4 text-black mb-1" />
                          <span className="font-mono font-black text-[10px] sm:text-sm text-black">{postStats.playCount?.toLocaleString() || 0}</span>
                        </div>
                        <div className="flex flex-col items-center justify-center bg-fuchsia-50 border border-fuchsia-200 rounded-lg p-2">
                          <Heart className="w-4 h-4 text-fuchsia-600 mb-1" />
                          <span className="font-mono font-black text-[10px] sm:text-sm text-fuchsia-700">{postStats.likeCount?.toLocaleString() || 0}</span>
                        </div>
                        <div className="flex flex-col items-center justify-center bg-blue-50 border border-blue-200 rounded-lg p-2">
                          <MessageCircle className="w-4 h-4 text-blue-600 mb-1" />
                          <span className="font-mono font-black text-[10px] sm:text-sm text-blue-700">{postStats.commentCount?.toLocaleString() || 0}</span>
                        </div>
                        <div className="flex flex-col items-center justify-center bg-cyan-50 border border-cyan-200 rounded-lg p-2">
                          <Share2 className="w-4 h-4 text-cyan-600 mb-1" />
                          <span className="font-mono font-black text-[10px] sm:text-sm text-cyan-700">{postStats.shareCount?.toLocaleString() || 0}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-xs font-mono text-black py-2">
                      No stats synced yet. Hit the update!
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-black uppercase mb-2 flex items-center gap-2">
                  <AlignLeft className="w-4 h-4" /> Brief / Script
                </label>
                {isEditing ? (
                  <textarea
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-black rounded-xl outline-none font-mono text-sm min-h-[120px] focus:bg-white resize-none"
                    value={selectedPlan.brief}
                    onChange={(e) => setSelectedPlan({...selectedPlan, brief: e.target.value})}
                  />
                ) : (
                  <div className="bg-gray-50 border-2 border-black/10 rounded-xl p-4 min-h-[120px] max-h-[250px] overflow-y-auto font-mono text-sm whitespace-pre-wrap text-black">
                    {selectedPlan.brief || (
                      <span className="text-black italic">No brief attached to this plan...</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t-2 border-black bg-gray-50 flex flex-col sm:flex-row justify-between gap-3 sm:gap-0">
              {isEditing ? (
                <>
                  <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-black font-bold font-mono text-sm hover:bg-gray-200 rounded-lg transition-colors w-full sm:w-auto">BATAL</button>
                  <button onClick={handleUpdatePlan} className="px-8 py-2 bg-black text-white font-bold font-mono text-sm rounded-xl hover:bg-fuchsia-600 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] active:translate-y-1 active:shadow-none w-full sm:w-auto">SIMPAN PERUBAHAN ➔</button>
                </>
              ) : (
                <>
                  <button onClick={(e) => handleDelete(e, selectedPlan.id)} className="px-4 py-2 text-red-600 font-bold font-mono text-sm flex items-center justify-center gap-2 hover:bg-red-100 rounded-lg transition-colors w-full sm:w-auto"><Trash2 className="w-4 h-4" /> HAPUS RENCANA</button>
                  <button onClick={(e) => handleStatusChange(e, selectedPlan.id, selectedPlan.status)} className="px-6 py-2 bg-black text-white font-bold font-mono text-sm rounded-xl hover:bg-gray-800 transition-colors shadow-[2px_2px_0px_0px_rgba(200,200,200,1)] active:translate-y-1 active:shadow-none w-full sm:w-auto text-center">LANJUT STATUS ➔</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="backdrop-blur-md bg-white/70 border-b-2 border-black px-4 md:px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-30 shadow-[0px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-2 md:gap-3">
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.525.02c1.31-.036 2.612-.012 3.914-.012.036 1.662.63 3.193 1.82 4.316.89.843 1.986 1.406 3.167 1.63v3.743c-1.37-.156-2.61-.745-3.616-1.67-.183-.17-.353-.35-.512-.54v7.412a7.11 7.11 0 0 1-7.11 7.11 7.11 7.11 0 0 1-7.11-7.11 7.11 7.11 0 0 1 7.11-7.11c.2 0 .4.01.6.03V11.2a3.333 3.333 0 1 0 3.13 3.333V0l.01.02z"></path>
            </svg>
            <h1 className="text-xl md:text-2xl font-black tracking-tighter hover:scale-[1.02] transition-transform cursor-default">Content <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 to-cyan-400">Planner</span></h1>
          </div>
        </div>

        <div className="flex items-center overflow-x-auto no-scrollbar w-full md:w-auto gap-2 md:gap-3 pb-1 md:pb-0">
          <button onClick={() => setIsAddPlanOpen(true)} className="whitespace-nowrap flex-shrink-0 px-4 md:px-6 py-2 bg-black text-white rounded-full font-bold text-xs tracking-wide flex items-center gap-2 hover:bg-fuchsia-600 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] active:translate-y-1 active:shadow-none"><Plus className="w-4 h-4" /> <span className="hidden sm:inline">Buat Konten</span></button>
          <div className="w-[2px] h-8 bg-gray-200 mx-1 hidden md:block"></div>
          <select className="flex-1 md:flex-none border-2 border-black rounded-full px-3 md:px-5 py-2 bg-white font-mono text-xs md:text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] outline-none cursor-pointer" value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)}>
            {accounts.length === 0 ? <option value="">Belum Ada Akun</option> : accounts.map(acc => <option key={acc.id} value={acc.id}>@{acc.handle}</option>)}
          </select>
          <button onClick={() => setIsAddAccountOpen(true)} className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full bg-white border-2 border-black flex items-center justify-center hover:bg-cyan-100 hover:scale-110 active:scale-95 transition-all text-black"><UserPlus className="w-4 h-4 md:w-5 md:h-5" /></button>
          <button onClick={logout} className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full bg-red-100 border-2 border-black flex items-center justify-center hover:bg-red-200 hover:scale-110 active:scale-95 transition-all text-red-600"><LogOut className="w-4 h-4 md:w-5 md:h-5" /></button>
        </div>
      </header>

      {/* ✨ ADD CONTENT PLAN MODAL */}
      {isAddPlanOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md transition-all" onClick={() => setIsAddPlanOpen(false)}>
          <div className="bg-white rounded-3xl border-2 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] w-full max-w-md max-h-[90vh] overflow-y-auto relative no-scrollbar" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black italic tracking-tight flex items-center gap-2"><Plus className="w-6 h-6 text-fuchsia-500" /> Rencana Baru</h2>
                <button onClick={() => setIsAddPlanOpen(false)} className="bg-gray-100 p-2 rounded-full hover:bg-black hover:text-white transition-colors"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAddPlan} className="space-y-4">
                <div className="group">
                  <label className="text-[10px] font-black font-mono text-black uppercase mb-1 ml-1 block">Hook / Title</label>
                  <input type="text" required placeholder="POV: You..." className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-black outline-none font-sans font-bold transition-all" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
                </div>
                <div className="group">
                  <label className="text-[10px] font-black font-mono text-black uppercase mb-1 ml-1 block">Post Link (Optional)</label>
                  <input type="url" placeholder="https://tiktok.com/..." className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-black outline-none font-mono text-xs transition-all" value={newLink} onChange={(e) => setNewLink(e.target.value)} />
                </div>
                <div className="group">
                  <label className="text-[10px] font-black font-mono text-black uppercase mb-1 ml-1 block">Brief / Description</label>
                  <textarea placeholder="Notes..." className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-black outline-none font-mono text-xs transition-all min-h-[100px] resize-none" value={newBrief} onChange={(e) => setNewBrief(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black font-mono text-black uppercase mb-1 ml-1 block">Publish_Date</label>
                    <input type="date" required className="w-full px-3 py-3 rounded-xl border-2 border-gray-200 focus:border-black outline-none" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black font-mono text-black uppercase mb-1 ml-1 block">Format</label>
                    <select className="w-full px-3 py-3 border-2 border-gray-200 rounded-xl focus:border-black outline-none" value={newType} onChange={(e) => setNewType(e.target.value)}>
                      <option>Video</option><option>Carousel</option><option>Story</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="w-full bg-black text-white px-4 py-4 rounded-2xl font-black text-sm tracking-widest hover:bg-gradient-to-r hover:from-fuchsia-600 hover:to-cyan-500 transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)] mt-4">JADWALKAN KONTEN ➔</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ✨ ADD ACCOUNT MODAL */}
      {isAddAccountOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md transition-all" onClick={() => setIsAddAccountOpen(false)}>
          <div className="bg-white rounded-3xl border-2 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] w-full max-w-sm max-h-[90vh] overflow-y-auto relative no-scrollbar" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black italic tracking-tight flex items-center gap-2"><UserPlus className="w-6 h-6 text-fuchsia-500" /> Tambah Profil</h2>
                <button onClick={() => setIsAddAccountOpen(false)} className="bg-gray-100 p-2 rounded-full hover:bg-black hover:text-white transition-colors"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAddAccount} className="space-y-5">
                <div className="group">
                  <label className="text-[10px] font-black font-mono text-black uppercase mb-1 block">Handle_TikTok</label>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black" />
                    <input type="text" required placeholder="john_doe" className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-black rounded-xl focus:bg-white outline-none font-mono text-sm font-bold text-black" value={newAccHandle} onChange={(e) => setNewAccHandle(e.target.value)} />
                  </div>
                </div>
                <div className="group">
                  <label className="text-[10px] font-black font-mono text-black uppercase mb-1 block">Display_Name</label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black" />
                    <input type="text" required placeholder="John Official" className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-black rounded-xl focus:bg-white outline-none font-mono text-sm font-bold text-black" value={newAccName} onChange={(e) => setNewAccName(e.target.value)} />
                  </div>
                </div>
                <button type="submit" className="w-full bg-black text-white px-4 py-4 rounded-2xl font-black text-sm tracking-widest hover:bg-gradient-to-r hover:from-fuchsia-500 hover:to-cyan-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]">Simpan Profil ➔</button>
              </form>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 md:px-8 mt-4 md:mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 pb-12">
        <div className="lg:col-span-4 xl:col-span-3 space-y-6 order-2 lg:order-1">
          {/* ✨ LIVE_STATS PROFILE CARD (NOW ON TOP) */}
          <div className="bg-white border-2 border-black rounded-3xl p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden group transition-all hover:translate-y-[-2px] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
            <div className="absolute -right-6 -bottom-6 opacity-[0.03] group-hover:scale-125 transition-transform">
              <Activity className="w-32 h-32" />
            </div>

            <div className="flex flex-col items-center text-center mb-6 relative z-10">
              <div className="relative mb-3">
                <div className="absolute inset-0 bg-gradient-to-tr from-fuchsia-500 to-cyan-400 rounded-full animate-spin-slow opacity-20 blur-md"></div>
                {profileStats?.avatar ? (
                  <img src={profileStats.avatar} alt="Profile" className="w-20 h-20 rounded-full border-2 border-black relative z-10 object-cover" />
                ) : (
                  <div className="w-20 h-20 rounded-full border-2 border-black bg-gray-100 flex items-center justify-center relative z-10">
                    <Users className="w-8 h-8 text-black" />
                  </div>
                )}
                <button 
                  onClick={handleSyncProfile}
                  disabled={isSyncing}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-black text-white hover:bg-fuchsia-600 border-2 border-white rounded-full z-20 flex items-center justify-center transition-all active:scale-90 disabled:bg-gray-400"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                </button>
              </div>
              
              <h3 className="text-xl font-black italic tracking-tight">{accounts.find(a => a.id === selectedAccount)?.name || "TikTok Account"}</h3>
              <p className="text-xs font-bold font-mono text-black flex items-center gap-1 mt-1">
                <AtSign className="w-3 h-3" /> {accounts.find(a => a.id === selectedAccount)?.handle?.toLowerCase() || selectedAccount}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 relative z-10 border-t-2 border-black pt-6">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-black">
                  <Users className="w-3.5 h-3.5" /> <span className="text-[10px] font-black font-mono">FOLLOWERS</span>
                </div>
                <div className="text-xl font-black font-mono leading-none">
                  {profileStats?.followersCount?.toLocaleString() || "0"}
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-fuchsia-500">
                  <Heart className="w-3.5 h-3.5" /> <span className="text-[10px] font-bold font-mono uppercase">Hearts</span>
                </div>
                <div className="text-xl font-black font-mono leading-none text-fuchsia-600">
                  {profileStats?.totalHeartsReceived?.toLocaleString() || "0"}
                </div>
              </div>
            </div>
          </div>

          {/* ✨ DYNAMIC CONTENT SUMMARY */}
          <div className="bg-gradient-to-br from-black to-gray-800 rounded-3xl p-6 text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden group">
            <Sparkles className="absolute -top-4 -right-4 w-16 h-16 text-white opacity-20 group-hover:rotate-12 transition-transform" />
            <p className="text-[10px] font-bold font-mono tracking-widest text-fuchsia-400 mb-1 uppercase">Ringkasan Rencana</p>
            <h2 className="text-xl font-black italic tracking-tighter mb-5">Status Konten</h2>
            
            <div className="space-y-3">
              {[
                { label: 'Ideation', count: filteredPlans.filter(p => p.status === 'Ideation').length, color: 'text-cyan-400' },
                { label: 'Filming', count: filteredPlans.filter(p => p.status === 'Filming').length, color: 'text-fuchsia-400' },
                { label: 'Editing', count: filteredPlans.filter(p => p.status === 'Editing').length, color: 'text-purple-400' },
                { label: 'Posted', count: filteredPlans.filter(p => p.status === 'Posted').length, color: 'text-lime-400' },
              ].map((stage) => (
                <div key={stage.label} className="flex justify-between items-center text-xs font-mono border-b border-white/5 pb-2 last:border-0 last:pb-0">
                  <span className="text-white uppercase tracking-wider">{stage.label}</span>
                  <span className={`font-black ${stage.color} text-sm`}>{stage.count}</span>
                </div>
              ))}
              
              <div className="pt-4 mt-2 border-t border-white/20 flex justify-between items-center">
                <span className="text-[10px] font-bold text-white font-mono">TOTAL KONTEN</span>
                <span className="text-lg font-black font-mono text-white">{filteredPlans.length}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 xl:col-span-9 space-y-6 order-1 lg:order-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border-2 border-black rounded-2xl p-3 md:p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex gap-2">
              <button onClick={() => setActiveView('calendar')} className={`flex-1 md:flex-none justify-center px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${activeView === 'calendar' ? 'bg-black text-white' : 'hover:bg-gray-100 text-black'}`}><CalendarIcon className="w-4 h-4" /> Calendar</button>
              <button onClick={() => setActiveView('list')} className={`flex-1 md:flex-none justify-center px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${activeView === 'list' ? 'bg-black text-white' : 'hover:bg-gray-100 text-black'}`}><LayoutList className="w-4 h-4" /> List View</button>
            </div>
            
            <div className="flex items-center justify-between md:justify-end md:gap-4 px-2 md:px-4 font-mono font-bold">
              <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded-lg transition-colors"><ChevronLeft className="w-5 h-5 text-black" /></button>
              <div className="w-auto md:w-32 text-center uppercase tracking-tighter text-[10px] sm:text-xs md:text-sm flex-1">
                <span className="inline">{monthNames[currentDate.getMonth()]}</span> {' '}
                <span className="opacity-100 inline">{currentDate.getFullYear()}</span>
              </div>
              <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded-lg transition-colors"><ChevronRight className="w-5 h-5 text-black" /></button>
            </div>
          </div>

          {activeView === 'calendar' && (
            <div className="bg-white border-2 border-black rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
              <div className="grid grid-cols-7 border-b-2 border-black bg-gray-50">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (<div key={day} className="p-3 text-center font-mono text-xs font-bold uppercase border-r-2 border-black last:border-r-0">{day}</div>))}</div>
              <div className="grid grid-cols-7">
                {Array.from({ length: firstDay }).map((_, i) => (<div key={`empty-${i}`} className="min-h-[140px] p-2 border-b-2 border-r-2 border-gray-100 bg-gray-50/50"></div>))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dayPlans = plans.filter(p => {
                    const d = parseSafeDate(p.publishDate);
                    return d.getDate() === dayNum && d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
                  });
                  return (
                    <div 
                      key={dayNum} 
                      className="min-h-[140px] p-2 border-b-2 border-r-2 border-gray-100 hover:bg-gray-50 transition-colors group relative text-black cursor-pointer"
                      onClick={() => handleDayClick(dayNum, currentDate.getMonth(), currentDate.getFullYear())}
                      onDragOver={(e) => handleDragOver(e, dayNum)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, dayNum)}
                    >
                      <div className="font-mono text-xs font-bold mb-2 flex justify-between items-center text-black"><span>{dayNum}</span></div>
                      <div className="space-y-1.5">
                        {dayPlans.map(plan => {
                          const dateObj = parseSafeDate(plan.publishDate);
                          const isValidDate = !isNaN(dateObj.getTime());
                          return (
                            <div 
                              draggable
                              onDragStart={(e) => { e.stopPropagation(); setDraggedPlan(plan); }}
                              key={plan.id} 
                              onClick={(e) => { e.stopPropagation(); handleOpenModal(plan); }} 
                              className={`p-1.5 rounded-xl border-2 text-[10px] leading-tight font-bold cursor-grab active:cursor-grabbing transition-all hover:scale-[1.03] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${getStatusStyle(plan.status)}`}
                            >
                              <div className="flex items-start gap-2">
                                {plan.coverUrl && <img src={plan.coverUrl} className="w-6 h-6 rounded object-cover" />}
                                <div className="flex-1 truncate">{plan.title}</div>
                              </div>
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

          {activeView === 'list' && (
            <div className="space-y-4">
              {filteredPlans.length > 0 ? (
                filteredPlans.map(plan => (
                  <div key={plan.id} onClick={() => handleOpenModal(plan)} className={`bg-white border-2 cursor-pointer rounded-2xl p-4 flex items-center justify-between gap-4 transition-all hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${getStatusStyle(plan.status)}`}>
                    <div className="flex items-center gap-4">
                      {plan.coverUrl && <img src={plan.coverUrl} className="w-12 h-12 rounded-lg object-cover" />}
                      <div>
                        <h3 className="font-bold text-black">{plan.title}</h3>
                        <p className="text-[10px] text-black font-mono uppercase">
                          {plan.status} • {parseSafeDate(plan.publishDate).toLocaleDateString('en-GB')}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-black" />
                  </div>
                ))
              ) : (
                <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl p-12 text-center flex flex-col items-center justify-center">
                  <CalendarIcon className="w-12 h-12 text-black/20 mb-4" />
                  <h3 className="text-lg font-bold text-black italic">Belum Ada Rencana</h3>
                  <p className="text-xs font-mono text-black mt-1 uppercase tracking-widest">Tidak ada konten untuk bulan {monthNames[currentDate.getMonth()]}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* 🛠️ VERSIONING FOOTER */}
      <footer className="max-w-7xl mx-auto px-4 md:px-8 py-8 mt-8 border-t border-black/5 flex items-center justify-center">
        <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 border border-black/10 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-[10px] font-black font-mono text-black uppercase tracking-tighter">Production Build</span>
          </div>
          <div className="w-px h-3 bg-black/10"></div>
          <div className="flex items-center gap-1.5">
            <svg className="w-3 h-3 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5L20 8"></path><path d="M9 22v-4a4.8 4.8 0 0 1 1-3.5L4 8"></path><path d="m14 4-2 2 2 2"></path><path d="M12 6h10"></path><path d="m10 4 2 2-2 2"></path><path d="M12 6H2"></path></svg>
            <span className="text-[10px] font-bold font-mono text-fuchsia-600">c27fa2f</span>
          </div>
          <div className="w-px h-3 bg-black/10"></div>
          <span className="text-[10px] font-medium font-mono text-gray-400">v1.2.4-stable</span>
        </div>
      </footer>

      {/* ✨ FULLSCREEN IMAGE PREVIEW */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-12 cursor-zoom-out animate-in fade-in zoom-in duration-300"
          onClick={() => setPreviewImage(null)}
        >
          <button className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors">
            <X className="w-8 h-8" />
          </button>
          <div className="relative max-w-5xl w-full h-full flex items-center justify-center p-4">
            <img 
              src={previewImage} 
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl border-2 border-white/10" 
              alt="Fullscreen Preview"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

    </div>
  );
}