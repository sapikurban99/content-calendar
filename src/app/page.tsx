"use client";

import { useState, useEffect } from "react";
import { onSnapshot, doc, collection, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Plus, Video, Calendar as CalendarIcon, Trash2, Sparkles, Disc3, LayoutList, ChevronLeft, ChevronRight, Hash, AlignLeft, X, Link as LinkIcon, ExternalLink, RefreshCw, Activity, Heart, Users, Eye, MessageCircle, Share2, UserPlus, AtSign, Smartphone, Edit3 } from "lucide-react";
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

// ✨ Safe Date Parser for old iOS Safari (< 15)
const parseSafeDate = (dateStr: string | undefined | null) => {
  if (!dateStr) return new Date();
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;
  const fallback = new Date(dateStr.replace(/-/g, '/').replace('T', ' '));
  return isNaN(fallback.getTime()) ? new Date() : fallback;
};

export default function DashboardPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [plans, setPlans] = useState<ContentPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [profileStats, setProfileStats] = useState<TikTokProfile | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const [activeView, setActiveView] = useState<"list" | "calendar">("calendar");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedPlan, setSelectedPlan] = useState<ContentPlan | null>(null);
  const [postStats, setPostStats] = useState<TikTokPostAnalytics | null>(null); 
  const [isSyncingPost, setIsSyncingPost] = useState(false); 

  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newType, setNewType] = useState("Video");
  const [newBrief, setNewBrief] = useState("");
  const [newLink, setNewLink] = useState(""); 

  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [isAddPlanOpen, setIsAddPlanOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [newAccHandle, setNewAccHandle] = useState("");
  const [newAccName, setNewAccName] = useState("");

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (!selectedAccount) return;
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
      where("accountId", "==", selectedAccount)
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
  }, [selectedAccount]);

  const filteredPlans = plans.filter(p => {
    const d = parseSafeDate(p.publishDate);
    return d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
  });

  const fetchAccounts = async () => {
    setIsLoading(true);
    try {
      const data = await getAccounts();
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
    setIsEditing(false);
    if (plan.link) {
      const stats = await getSinglePostAnalytics(plan.id);
      if (stats) setPostStats(stats);
    }
  };

  const handleSyncPostStats = async () => {
    if (!selectedPlan || !selectedPlan.link) return;
    setIsSyncingPost(true);
    try {
      await syncSinglePostAnalytics(selectedPlan.id, selectedPlan.link);
    } catch (error) {
      console.error("Post sync error:", error);
      alert("Failed to sync post stats... 😭");
    } finally {
      setIsSyncingPost(false);
    }
  };

  const handleAddPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount || !newTitle || !newDate) {
      alert("⚠️ Mohon isi semua field yang diperlukan!");
      return;
    }

    try {
      await addContentPlan({
        accountId: selectedAccount,
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
      alert("❌ Gagal menyimpan: " + error.message);
    }
  };

  const handleUpdatePlan = async () => {
    if (!selectedPlan) return;

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
    }
  };

  const handleDelete = async (e: React.MouseEvent, planId: string) => {
    e.stopPropagation();
    if (!confirm("Hapus rencana ini?")) return;
    await deleteContentPlan(planId);
    if (selectedPlan && selectedPlan.id === planId) setSelectedPlan(null);
  };

  const handleStatusChange = async (e: React.MouseEvent, planId: string, currentStatus: string) => {
    e.stopPropagation();
    const nextStatus = currentStatus === "Ideation" ? "Filming" : currentStatus === "Filming" ? "Editing" : "Posted";
    await updatePlanStatus(planId, nextStatus);

    if (selectedPlan && selectedPlan.id === planId) {
      setSelectedPlan({ ...selectedPlan, status: nextStatus });
    }
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccHandle || !newAccName) return;

    try {
      const handle = newAccHandle.replace("@", "").trim();
      await addAccount({
        handle: handle,
        name: newAccName,
      });
      
      setNewAccHandle("");
      setNewAccName("");
      setIsAddAccountOpen(false);
      await fetchAccounts();
      alert("✅ Akun @" + handle + " berhasil ditambahkan!");
    } catch (error: any) {
      alert("❌ Gagal menambah akun: " + error.message);
    }
  };

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const firstDay = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "Ideation": return "bg-cyan-100 text-cyan-700 border-cyan-300";
      case "Filming": return "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-300";
      case "Editing": return "bg-purple-100 text-purple-700 border-purple-300";
      case "Posted": return "bg-lime-300 text-lime-900 border-lime-400";
      default: return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  // Overlay style using rgba instead of Tailwind slash-opacity (old browser compat)
  const overlayStyle = { backgroundColor: "rgba(0,0,0,0.4)" };
  const overlayDarkStyle = { backgroundColor: "rgba(0,0,0,0.95)" };
  const overlayLightStyle = { backgroundColor: "rgba(0,0,0,0.3)" };

  return (
    <div className="page-root">

      {/* ✨ DETAIL & EDIT MODAL */}
      {selectedPlan && (
        <div className="modal-overlay" style={overlayLightStyle} onClick={() => setSelectedPlan(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="modal-header">
              <div className="modal-header-inner">
                <span className={"status-badge " + getStatusStyle(selectedPlan.status)}>
                  {selectedPlan.status}
                </span>
                <span className="date-badge">
                  <CalendarIcon className="w-3 h-3" /> {parseSafeDate(selectedPlan.publishDate).toLocaleDateString("en-GB")}
                </span>
              </div>
              <button onClick={() => setSelectedPlan(null)} className="icon-btn">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body">
              {selectedPlan.coverUrl && (
                <div className="cover-wrap" onClick={() => setPreviewImage(selectedPlan.coverUrl!)}>
                  <img src={selectedPlan.coverUrl} alt="Video Cover" className="cover-img" />
                  <div className="cover-hint">
                    <span className="cover-hint-text"><Sparkles className="w-3 h-3" /> KLIK UNTUK MEMPERBESAR</span>
                  </div>
                </div>
              )}

              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="field-label">Judul Konten</label>
                    <input 
                      type="text" 
                      className="field-input"
                      value={selectedPlan.title}
                      onChange={(e) => setSelectedPlan({...selectedPlan, title: e.target.value})}
                    />
                  </div>
                  <div className="grid-2col">
                    <div>
                      <label className="field-label">Ubah Status</label>
                      <select 
                        className="field-select"
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
                      <label className="field-label">Format Konten</label>
                      <select 
                        className="field-select"
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
                <div className="plan-title-row">
                  <div>
                    <h2 className="plan-title">{selectedPlan.title}</h2>
                    <div className="plan-type">
                      <Hash className="w-4 h-4" /> {selectedPlan.contentType}
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="edit-btn"
                    title="Edit Plan"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              )}

              {selectedPlan.link && !isEditing && (
                <div className="link-box">
                  <div className="link-inner">
                    <LinkIcon className="w-4 h-4 link-icon" />
                    <span className="link-text">{selectedPlan.link}</span>
                  </div>
                  <a href={selectedPlan.link.startsWith("http") ? selectedPlan.link : "https://" + selectedPlan.link} target="_blank" rel="noopener noreferrer" className="link-btn">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}

              {isEditing && (
                <div>
                  <label className="field-label">Link Postingan</label>
                  <input 
                    type="url" 
                    className="field-input font-mono text-xs"
                    value={selectedPlan.link}
                    onChange={(e) => setSelectedPlan({...selectedPlan, link: e.target.value})}
                  />
                </div>
              )}

              {selectedPlan.link && !isEditing && (
                <div className="stats-box">
                  <div className="stats-header">
                    <h3 className="stats-title">
                      <Disc3 className={"w-4 h-4 text-fuchsia-500 " + (isSyncingPost ? "anim-spin" : "")} /> 
                      Statistik Postingan
                    </h3>
                    <button 
                      onClick={handleSyncPostStats}
                      disabled={isSyncingPost}
                      className={"sync-btn " + (isSyncingPost ? "sync-btn-disabled" : "sync-btn-active")}
                    >
                      {isSyncingPost ? "LOADING..." : "Update Data"}
                    </button>
                  </div>

                  {postStats ? (
                    <div className="stats-grid-wrap">
                      {postStats.coverUrl && (
                        <div className="stats-cover" onClick={() => setPreviewImage(postStats.coverUrl!)}>
                          <img src={postStats.coverUrl} className="stats-cover-img" alt="Sync Preview" />
                        </div>
                      )}
                      <div className="stats-grid">
                        <div className="stat-item">
                          <Eye className="w-4 h-4 text-gray-500" />
                          <span className="stat-num">{postStats.playCount ? postStats.playCount.toLocaleString() : 0}</span>
                        </div>
                        <div className="stat-item stat-item-pink">
                          <Heart className="w-4 h-4 text-fuchsia-600" />
                          <span className="stat-num text-fuchsia-700">{postStats.likeCount ? postStats.likeCount.toLocaleString() : 0}</span>
                        </div>
                        <div className="stat-item stat-item-blue">
                          <MessageCircle className="w-4 h-4 text-blue-600" />
                          <span className="stat-num text-blue-700">{postStats.commentCount ? postStats.commentCount.toLocaleString() : 0}</span>
                        </div>
                        <div className="stat-item stat-item-cyan">
                          <Share2 className="w-4 h-4 text-cyan-600" />
                          <span className="stat-num text-cyan-700">{postStats.shareCount ? postStats.shareCount.toLocaleString() : 0}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="stats-empty">No stats synced yet. Hit the update!</div>
                  )}
                </div>
              )}

              <div>
                <label className="brief-label">
                  <AlignLeft className="w-4 h-4" /> Brief / Script
                </label>
                {isEditing ? (
                  <textarea
                    className="field-textarea"
                    value={selectedPlan.brief}
                    onChange={(e) => setSelectedPlan({...selectedPlan, brief: e.target.value})}
                  />
                ) : (
                  <div className="brief-view">
                    {selectedPlan.brief || (
                      <span className="text-gray-400 italic">No brief attached to this plan...</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer">
              {isEditing ? (
                <>
                  <button onClick={() => setIsEditing(false)} className="btn-cancel">BATAL</button>
                  <button onClick={handleUpdatePlan} className="btn-primary">SIMPAN PERUBAHAN ➔</button>
                </>
              ) : (
                <>
                  <button onClick={(e) => handleDelete(e, selectedPlan.id)} className="btn-danger">
                    <Trash2 className="w-4 h-4" /> HAPUS RENCANA
                  </button>
                  <button onClick={(e) => handleStatusChange(e, selectedPlan.id, selectedPlan.status)} className="btn-status">
                    LANJUT STATUS ➔
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="app-header">
        <div className="header-brand">
          <CalendarIcon className="w-6 h-6 text-black" />
          <h1 className="brand-title">Content <span className="brand-accent">Planner</span></h1>
        </div>

        <div className="header-actions">
          <button onClick={() => setIsAddPlanOpen(true)} className="btn-add-plan">
            <Plus className="w-4 h-4" /> <span className="btn-label-hide">Buat Konten</span>
          </button>
          <select className="account-select" value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)}>
            {accounts.map(acc => <option key={acc.id} value={acc.id}>@{acc.handle}</option>)}
          </select>
          <button onClick={() => setIsAddAccountOpen(true)} className="btn-icon-round">
            <UserPlus className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ✨ ADD CONTENT PLAN MODAL */}
      {isAddPlanOpen && (
        <div className="modal-overlay" style={overlayStyle} onClick={() => setIsAddPlanOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "24px" }}>
              <div className="modal-title-row">
                <h2 className="modal-title"><Plus className="w-6 h-6 text-fuchsia-500" /> Rencana Baru</h2>
                <button onClick={() => setIsAddPlanOpen(false)} className="icon-btn"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAddPlan} className="form-stack">
                <div>
                  <label className="field-label">Hook / Title</label>
                  <input type="text" required placeholder="POV: You..." className="field-input" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
                </div>
                <div>
                  <label className="field-label">Post Link (Optional)</label>
                  <input type="url" placeholder="https://tiktok.com/..." className="field-input font-mono text-xs" value={newLink} onChange={(e) => setNewLink(e.target.value)} />
                </div>
                <div>
                  <label className="field-label">Brief / Description</label>
                  <textarea placeholder="Notes..." className="field-textarea" value={newBrief} onChange={(e) => setNewBrief(e.target.value)} />
                </div>
                <div className="grid-2col">
                  <div>
                    <label className="field-label">Tanggal Publish</label>
                    <input type="date" required className="field-input" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="field-label">Format</label>
                    <select className="field-select" value={newType} onChange={(e) => setNewType(e.target.value)}>
                      <option>Video</option><option>Carousel</option><option>Story</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="btn-submit">JADWALKAN KONTEN ➔</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ✨ ADD ACCOUNT MODAL */}
      {isAddAccountOpen && (
        <div className="modal-overlay" style={overlayStyle} onClick={() => setIsAddAccountOpen(false)}>
          <div className="modal-box modal-sm" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "24px" }}>
              <div className="modal-title-row">
                <h2 className="modal-title"><UserPlus className="w-6 h-6 text-fuchsia-500" /> Tambah Profil</h2>
                <button onClick={() => setIsAddAccountOpen(false)} className="icon-btn"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAddAccount} className="form-stack">
                <div>
                  <label className="field-label">Handle TikTok</label>
                  <div className="field-icon-wrap">
                    <AtSign className="field-icon" />
                    <input type="text" required placeholder="john_doe" className="field-input field-with-icon" value={newAccHandle} onChange={(e) => setNewAccHandle(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="field-label">Nama Tampilan</label>
                  <div className="field-icon-wrap">
                    <Smartphone className="field-icon" />
                    <input type="text" required placeholder="John Official" className="field-input field-with-icon" value={newAccName} onChange={(e) => setNewAccName(e.target.value)} />
                  </div>
                </div>
                <button type="submit" className="btn-submit">Simpan Profil ➔</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="main-grid">
        {/* Sidebar */}
        <div className="sidebar">
          {/* Profile Card */}
          <div className="card">
            <div className="profile-top">
              <div className="avatar-wrap">
                {profileStats && profileStats.avatar ? (
                  <img src={profileStats.avatar} alt="Profile" className="avatar-img" />
                ) : (
                  <div className="avatar-placeholder">
                    <Users className="w-8 h-8 text-gray-300" />
                  </div>
                )}
                <div className="avatar-dot"></div>
              </div>
              
              <h3 className="profile-name">{accounts.find(a => a.id === selectedAccount) ? accounts.find(a => a.id === selectedAccount)!.name : "TikTok Account"}</h3>
              <p className="profile-handle">
                <AtSign className="w-3 h-3" /> {accounts.find(a => a.id === selectedAccount) ? accounts.find(a => a.id === selectedAccount)!.handle.toLowerCase() : selectedAccount}
              </p>
            </div>

            <div className="profile-stats">
              <div className="stat-row-item">
                <div className="stat-row-label stat-gray">
                  <Users className="w-3 h-3" /> <span className="stat-row-text">FOLLOWERS</span>
                </div>
                <div className="stat-row-value">
                  {profileStats && profileStats.followersCount ? profileStats.followersCount.toLocaleString() : "0"}
                </div>
              </div>
              <div className="stat-row-item">
                <div className="stat-row-label stat-pink">
                  <Heart className="w-3 h-3" /> <span className="stat-row-text">HEARTS</span>
                </div>
                <div className="stat-row-value text-fuchsia-600">
                  {profileStats && profileStats.totalHeartsReceived ? profileStats.totalHeartsReceived.toLocaleString() : "0"}
                </div>
              </div>
            </div>

            <button
              onClick={() => { setIsSyncing(true); syncTikTokAnalytics(selectedAccount).finally(() => setIsSyncing(false)); }}
              disabled={isSyncing}
              className={"sync-profile-btn " + (isSyncing ? "sync-profile-disabled" : "sync-profile-active")}
            >
              <RefreshCw className={"w-3 h-3 " + (isSyncing ? "anim-spin" : "")} />
              {isSyncing ? "Syncing..." : "Sync Data"}
            </button>
          </div>

          {/* Summary Card */}
          <div className="summary-card">
            <Sparkles className="summary-sparkle" />
            <p className="summary-eyebrow">Ringkasan Rencana</p>
            <h2 className="summary-title">Status Konten</h2>
            
            <div className="summary-list">
              {[
                { label: "Ideation", count: filteredPlans.filter(p => p.status === "Ideation").length, cls: "text-cyan-400" },
                { label: "Filming", count: filteredPlans.filter(p => p.status === "Filming").length, cls: "text-fuchsia-400" },
                { label: "Editing", count: filteredPlans.filter(p => p.status === "Editing").length, cls: "text-purple-400" },
                { label: "Posted", count: filteredPlans.filter(p => p.status === "Posted").length, cls: "text-lime-400" },
              ].map((stage) => (
                <div key={stage.label} className="summary-row">
                  <span className="summary-label">{stage.label}</span>
                  <span className={"summary-count " + stage.cls}>{stage.count}</span>
                </div>
              ))}
              
              <div className="summary-total">
                <span className="summary-total-label">TOTAL KONTEN</span>
                <span className="summary-total-value">{filteredPlans.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Panel */}
        <div className="main-panel">
          {/* View Toggle */}
          <div className="view-toggle">
            <div className="view-toggle-btns">
              <button onClick={() => setActiveView("calendar")} className={"view-btn " + (activeView === "calendar" ? "view-btn-active" : "view-btn-inactive")}>
                <CalendarIcon className="w-4 h-4" /> Calendar
              </button>
              <button onClick={() => setActiveView("list")} className={"view-btn " + (activeView === "list" ? "view-btn-active" : "view-btn-inactive")}>
                <LayoutList className="w-4 h-4" /> List View
              </button>
            </div>
            
            <div className="month-nav">
              <button onClick={prevMonth} className="month-nav-btn"><ChevronLeft className="w-5 h-5" /></button>
              <div className="month-label">
                {monthNames[currentDate.getMonth()]} <span className="month-year">{currentDate.getFullYear()}</span>
              </div>
              <button onClick={nextMonth} className="month-nav-btn"><ChevronRight className="w-5 h-5" /></button>
            </div>
          </div>

          {/* Calendar View */}
          {activeView === "calendar" && (
            <div className="calendar-wrap">
              <div className="calendar-header-row">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                  <div key={day} className="cal-day-header">{day}</div>
                ))}
              </div>
              <div className="calendar-grid">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={"empty-" + i} className="cal-cell cal-cell-empty"></div>
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dayPlans = plans.filter(p => {
                    const d = parseSafeDate(p.publishDate);
                    return d.getDate() === dayNum && d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
                  });
                  return (
                    <div key={dayNum} className="cal-cell">
                      <div className="cal-day-num">{dayNum}</div>
                      <div className="cal-plans">
                        {dayPlans.map(plan => (
                          <div key={plan.id} onClick={() => handleOpenModal(plan)} className={"cal-plan-item " + getStatusStyle(plan.status)}>
                            <div className="cal-plan-inner">
                              {plan.coverUrl && <img src={plan.coverUrl} className="cal-plan-thumb" alt="" />}
                              <div className="cal-plan-title">{plan.title}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* List View */}
          {activeView === "list" && (
            <div className="list-stack">
              {filteredPlans.length > 0 ? (
                filteredPlans.map(plan => (
                  <div key={plan.id} onClick={() => handleOpenModal(plan)} className={"list-item border-2 " + getStatusStyle(plan.status)}>
                    <div className="list-item-left">
                      {plan.coverUrl && <img src={plan.coverUrl} className="list-thumb" alt="" />}
                      <div>
                        <h3 className="list-item-title">{plan.title}</h3>
                        <p className="list-item-meta">
                          {plan.status} &bull; {parseSafeDate(plan.publishDate).toLocaleDateString("en-GB")}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300" />
                  </div>
                ))
              ) : (
                <div className="list-empty">
                  <CalendarIcon className="w-12 h-12 text-gray-200 mb-4" />
                  <h3 className="list-empty-title">Belum Ada Rencana</h3>
                  <p className="list-empty-sub">Tidak ada konten untuk bulan {monthNames[currentDate.getMonth()]}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-brand">
          <div className="footer-icon-wrap">
            <CalendarIcon className="w-5 h-5 text-fuchsia-500" />
          </div>
          <div>
            <p className="footer-copy">© 2026 Pijar Teknologi. All rights reserved.</p>
            <div className="footer-version">
              <span className="version-badge">v1.0.0</span>
              <span className="version-dot"></span>
              <span className="version-label">Stable Production</span>
            </div>
          </div>
        </div>

        <div className="footer-socials">
          <a href="https://www.linkedin.com/company/pijar-teknologi-indonesia/" target="_blank" rel="noopener noreferrer" className="social-link">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"></path></svg>
          </a>
          <a href="https://www.instagram.com/pijarteknologi.id/" target="_blank" rel="noopener noreferrer" className="social-link">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"></path></svg>
          </a>
          <a href="https://www.tiktok.com/@pijarteknologi.id" target="_blank" rel="noopener noreferrer" className="social-link">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.036 2.612-.012 3.914-.012.036 1.662.63 3.193 1.82 4.316.89.843 1.986 1.406 3.167 1.63v3.743c-1.37-.156-2.61-.745-3.616-1.67-.183-.17-.353-.35-.512-.54v7.412a7.11 7.11 0 0 1-7.11 7.11 7.11 7.11 0 0 1-7.11-7.11 7.11 7.11 0 0 1 7.11-7.11c.2 0 .4.01.6.03V11.2a3.333 3.333 0 1 0 3.13 3.333V0l.01.02z"></path></svg>
          </a>
        </div>
      </footer>

      {/* Fullscreen Image Preview */}
      {previewImage && (
        <div 
          className="fullscreen-overlay"
          style={overlayDarkStyle}
          onClick={() => setPreviewImage(null)}
        >
          <button className="fullscreen-close" onClick={() => setPreviewImage(null)}>
            <X className="w-8 h-8" />
          </button>
          <div className="fullscreen-inner">
            <img 
              src={previewImage} 
              className="fullscreen-img" 
              alt="Fullscreen Preview"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}