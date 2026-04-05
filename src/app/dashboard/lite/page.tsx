"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { onSnapshot, doc, collection, query, where, DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { 
  Plus, Video, Calendar as CalendarIcon, Trash2, X, RefreshCw, Activity, Heart, Users, LogOut, Download, ChevronLeft, ChevronRight, LayoutList
} from "lucide-react";
import { 
  getAccounts, syncSocialAnalytics, addAccount, addContentPlan, deleteContentPlan, updateContentPlan, deleteAccount
} from "@/lib/services";
import { Account, ContentPlan, SocialProfile } from "@/types/index";
import { APP_VERSION } from "../version";

// LITE UTILITY: No modern JS patterns like optional chaining (?.) for maximum safety
const parseSafeDate = (dateStr: string | undefined | null) => {
  if (!dateStr) return new Date();
  var d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;
  var fallback = new Date(dateStr.replace(/-/g, '/').replace('T', ' '));
  return isNaN(fallback.getTime()) ? new Date() : fallback;
};

const proxyImage = (url: string | undefined | null) => {
  if (!url) return "";
  var cleanUrl = url.replace(/&amp;/g, '&');
  if (cleanUrl.indexOf("cdninstagram.com") !== -1 || cleanUrl.indexOf("tiktokcdn") !== -1 || cleanUrl.indexOf("fbcdn.net") !== -1 || cleanUrl.indexOf("licdn.com") !== -1) {
    return "https://wsrv.nl/?url=" + encodeURIComponent(cleanUrl) + "&n=-1";
  }
  return cleanUrl;
};

export default function LiteDashboard() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [plans, setPlans] = useState<ContentPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [profileStats, setProfileStats] = useState<SocialProfile | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAddPlanOpen, setIsAddPlanOpen] = useState(false);
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);

  // Form State
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newType, setNewType] = useState("Video");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    const q = query(collection(db, "accounts"), where("userId", "==", user.id));
    const unsub = onSnapshot(q, (snapshot) => {
      const accs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Account));
      setAccounts(accs);
      if (accs.length > 0 && !selectedAccount) {
        setSelectedAccount(accs[0].id);
      }
      setIsLoading(false);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!selectedAccount || !user) return;
    const q = query(collection(db, "content_plans"), where("accountId", "==", selectedAccount));
    const unsub = onSnapshot(q, (snapshot) => {
      setPlans(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ContentPlan)));
    });

    const activeAcc = accounts.find(a => a.id === selectedAccount);
    if (activeAcc) {
      const platform = activeAcc.platform || 'tiktok';
      const handle = (activeAcc.handle || "").toLowerCase();
      const collectionName = "profiles_" + platform;
      const unsubProfile = onSnapshot(doc(db, collectionName, handle), (docSnap) => {
        if (docSnap.exists()) setProfileStats(docSnap.data() as SocialProfile);
      });
      return () => { unsub(); unsubProfile(); };
    }
    return () => unsub();
  }, [selectedAccount, user, accounts]);

  const activeAccount = accounts.find(a => a.id === selectedAccount);

  const handleSyncProfile = async () => {
    if (!activeAccount) return;
    setIsSyncing(true);
    try {
      await syncSocialAnalytics(activeAccount.handle || "", activeAccount.platform || "tiktok");
    } catch(e) {} finally {
      setIsSyncing(false);
    }
  };

  const handleAddPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount || !user) return;
    const dateStr = new Date(newDate).toISOString();
    try {
      await addContentPlan({
        userId: user.id,
        accountId: selectedAccount,
        title: newTitle,
        publishDate: dateStr,
        status: "Ideation",
        contentType: newType as any,
        brief: ""
      });
      setIsAddPlanOpen(false);
      setNewTitle("");
    } catch (err: any) { alert(err.message); }
  };

  const filteredPlans = plans.filter(p => {
    const d = parseSafeDate(p.publishDate);
    return d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
  });

  if (authLoading || isLoading) return <div className="p-10 font-mono text-center">LOADING LITE...</div>;

  return (
    <div className="min-h-screen bg-white text-black font-sans pb-10">
      {/* LITE HEADER */}
      <header className="border-b-2 border-black p-4 flex justify-between items-center bg-gray-50">
        <div className="font-black italic">PLANNER LITE</div>
        <div className="flex gap-2">
          <button onClick={() => setIsAddPlanOpen(true)} className="bg-black text-white px-3 py-1 rounded text-xs font-bold">+</button>
          <button onClick={logout} className="bg-red-100 text-red-600 px-3 py-1 rounded text-xs font-bold">OUT</button>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {/* ACCOUNT SELECTOR */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {accounts.map(acc => (
            <button 
              key={acc.id} 
              onClick={() => setSelectedAccount(acc.id)}
              className={"px-3 py-2 rounded-lg border-2 text-xs font-bold whitespace-nowrap " + (selectedAccount === acc.id ? "bg-black text-white border-black" : "bg-white border-gray-200")}
            >
              @{acc.handle}
            </button>
          ))}
          <button onClick={() => setIsAddAccountOpen(true)} className="px-3 py-2 rounded-lg border-2 border-dashed border-gray-300 text-xs">+</button>
        </div>

        {/* STATS CARD */}
        {activeAccount && (
          <div className="border-2 border-black p-4 rounded-xl bg-gray-50">
            <div className="flex items-center gap-3 mb-4">
              {profileStats && profileStats.avatar && (
                <img src={proxyImage(profileStats.avatar)} className="w-12 h-12 rounded-full border border-black" alt="avatar" />
              )}
              <div>
                <div className="font-bold">@{activeAccount.handle}</div>
                <div className="text-[10px] text-gray-500 uppercase">{activeAccount.platform}</div>
              </div>
              <button onClick={handleSyncProfile} className="ml-auto p-2 bg-white border border-black rounded-lg">
                <RefreshCw className={"w-4 h-4 " + (isSyncing ? "animate-spin" : "")} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-white p-2 border border-black rounded-lg">
                <div className="text-[8px] font-black text-gray-400 uppercase">FOLLOWERS</div>
                <div className="font-bold text-sm">{(profileStats && profileStats.followersCount) || 0}</div>
              </div>
              <div className="bg-white p-2 border border-black rounded-lg">
                <div className="text-[8px] font-black text-gray-400 uppercase">LIKES</div>
                <div className="font-bold text-sm">{(profileStats && profileStats.totalHeartsReceived) || 0}</div>
              </div>
            </div>
          </div>
        )}

        {/* DATE CONTROLS */}
        <div className="flex justify-between items-center bg-gray-100 p-2 rounded-lg">
           <button onClick={() => { var d = new Date(currentDate); d.setMonth(d.getMonth()-1); setCurrentDate(d); }} className="p-2 bg-white rounded border border-black"><ChevronLeft className="w-4 h-4"/></button>
           <div className="font-bold text-xs uppercase">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</div>
           <button onClick={() => { var d = new Date(currentDate); d.setMonth(d.getMonth()+1); setCurrentDate(d); }} className="p-2 bg-white rounded border border-black"><ChevronRight className="w-4 h-4"/></button>
        </div>

        {/* LITE LIST VIEW */}
        <div className="space-y-2">
          <div className="font-black text-[10px] text-gray-400 tracking-widest px-1 uppercase">DAFTAR KONTEN</div>
          {filteredPlans.length > 0 ? filteredPlans.map(plan => (
            <div key={plan.id} className="border border-black p-3 rounded-lg flex justify-between items-center bg-white">
              <div className="min-w-0 flex-1">
                <div className="font-bold text-sm truncate">{plan.title}</div>
                <div className="text-[10px] text-gray-500 font-mono">
                  {plan.status} • {parseSafeDate(plan.publishDate).toLocaleDateString()}
                </div>
              </div>
              <button onClick={() => deleteContentPlan(plan.id)} className="text-red-500 p-2"><Trash2 className="w-4 h-4"/></button>
            </div>
          )) : <div className="text-center p-10 text-xs text-gray-400 italic">Kosong...</div>}
        </div>
      </main>

      {/* VERSION */}
      <footer className="text-center p-4">
        <div className="text-[8px] font-mono text-gray-300">LITE v{APP_VERSION}</div>
      </footer>

      {/* LITE MODAL ADD PLAN */}
      {isAddPlanOpen && (
        <div className="fixed inset-0 bg-black/50 p-4 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl border-2 border-black w-full max-w-xs">
            <div className="flex justify-between items-center mb-4">
              <div className="font-bold text-sm uppercase">BARU</div>
              <button onClick={() => setIsAddPlanOpen(false)}><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleAddPlan} className="space-y-4">
              <input type="text" required placeholder="Judul..." className="w-full p-2 border border-black rounded text-sm" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
              <input type="date" required className="w-full p-2 border border-black rounded text-sm" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
              <button type="submit" className="w-full bg-black text-white p-3 rounded font-bold text-sm">SIMPAN</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
