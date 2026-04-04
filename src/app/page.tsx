import Link from "next/link";
import { ArrowRight, Star, Sparkles, TrendingUp, Calendar, Users } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] text-gray-900 font-sans selection:bg-fuchsia-300 selection:text-black overflow-x-hidden">

      {/* 🌟 NAVBAR */}
      <nav className="fixed top-0 w-full backdrop-blur-md bg-white/70 border-b-2 border-black z-50 px-6 py-4 flex justify-between items-center transition-all">
        <div className="flex items-center gap-2">
          <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.525.02c1.31-.036 2.612-.012 3.914-.012.036 1.662.63 3.193 1.82 4.316.89.843 1.986 1.406 3.167 1.63v3.743c-1.37-.156-2.61-.745-3.616-1.67-.183-.17-.353-.35-.512-.54v7.412a7.11 7.11 0 0 1-7.11 7.11 7.11 7.11 0 0 1-7.11-7.11 7.11 7.11 0 0 1 7.11-7.11c.2 0 .4.01.6.03V11.2a3.333 3.333 0 1 0 3.13 3.333V0l.01.02z"></path>
          </svg>
          <span className="text-xl font-black italic tracking-tighter hover:scale-105 transition-transform cursor-pointer">
            TikTok<span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 to-cyan-400">Planner</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="hidden sm:inline-block font-bold font-mono text-xs uppercase tracking-widest hover:text-fuchsia-600 transition-colors">
            Masuk
          </Link>
          <Link href="/register" className="px-5 py-2 bg-black text-white rounded-xl font-bold font-mono text-xs uppercase tracking-widest border-2 border-black hover:bg-cyan-400 hover:text-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all">
            Mulai Gratis
          </Link>
        </div>
      </nav>

      {/* 🚀 HERO SECTION */}
      <section className="pt-32 pb-20 px-4 max-w-6xl mx-auto flex flex-col items-center text-center relative">
        <div className="absolute top-20 left-10 w-24 h-24 bg-cyan-300 rounded-full blur-3xl opacity-50 mix-blend-multiply animate-pulse"></div>
        <div className="absolute top-40 right-10 w-32 h-32 bg-fuchsia-300 rounded-full blur-3xl opacity-50 mix-blend-multiply animate-pulse delay-700"></div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-8 transform -rotate-2 hover:rotate-0 transition-transform">
          <Sparkles className="w-4 h-4 text-fuchsia-500" />
          <span className="font-mono text-[10px] font-black uppercase tracking-widest">Platform Creator #1</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[1.1] mb-6 max-w-4xl cursor-default">
          Rencanakan Konten TikTok Tanpa <span className="relative inline-block">
            <span className="relative z-10 text-white italic">Pusing</span>
            <span className="absolute inset-0 bg-black -rotate-2 scale-110 -z-0"></span>
          </span>
        </h1>

        <p className="text-lg md:text-xl text-black font-medium max-w-2xl mb-10 leading-relaxed font-mono">
          Kalender editorial premium dikhususkan untuk TikTok Creator. Lacak metrik, atur status produksi, dan dominasi FYP sekarang juga!
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link href="/register" className="px-8 py-4 bg-fuchsia-500 text-black border-4 border-black rounded-2xl font-black text-lg tracking-wide hover:bg-cyan-400 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 active:translate-y-2 active:shadow-none transition-all flex items-center justify-center gap-2">
            BUAT AKUN SEKARANG <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* ✨ FEATURES SECTION */}
      <section className="py-20 px-4 bg-black text-white border-y-4 border-black relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_2px,transparent_2px)] [background-size:24px_24px]"></div>

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter mb-4 text-cyan-400">Tools Kelas Dewa</h2>
            <p className="font-mono text-white/80 text-sm uppercase tracking-widest">Fitur yang bikin konten kamu meledak</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-[#111] border-2 border-white/20 p-8 rounded-3xl hover:border-cyan-400 hover:-translate-y-2 transition-all group">
              <div className="w-14 h-14 bg-cyan-400/20 text-cyan-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Calendar className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-black mb-3">Visual Calendar</h3>
              <p className="text-white/70 font-mono text-sm leading-relaxed">Kelola semua ide konten dan jadwal rilis dalam satu kalender interaktif yang memanjakan mata.</p>
            </div>

            <div className="bg-[#111] border-2 border-white/20 p-8 rounded-3xl hover:border-fuchsia-400 hover:-translate-y-2 transition-all group">
              <div className="w-14 h-14 bg-fuchsia-400/20 text-fuchsia-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-black mb-3">Live Analytics</h3>
              <p className="text-white/70 font-mono text-sm leading-relaxed">Tarik data Views, Likes, dan Engagement langsung dari TikTok ke dashboard pribadimu.</p>
            </div>

            <div className="bg-[#111] border-2 border-white/20 p-8 rounded-3xl hover:border-lime-400 hover:-translate-y-2 transition-all group">
              <div className="w-14 h-14 bg-lime-400/20 text-lime-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-black mb-3">Multi-Account</h3>
              <p className="text-white/70 font-mono text-sm leading-relaxed">Kelola banyak akun TikTok klien atau pribadi tanpa perlu login-logout aplikasi aslinya.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 🤙 CTA SECTION */}
      <section className="py-24 px-4 bg-lime-300 text-black text-center border-b-4 border-black relative overflow-hidden">
        <Star className="absolute top-10 left-10 w-24 h-24 opacity-20 -rotate-12" />
        <Star className="absolute bottom-10 right-10 w-32 h-32 opacity-20 rotate-45" />

        <h2 className="text-5xl md:text-7xl font-black tracking-tighter mb-6">Siap FYP?</h2>
        <p className="font-mono text-lg font-bold mb-10 max-w-md mx-auto">Jangan biarkan ide kontenmu hilang. Simpan, jadwalkan, dan ukur hasilnya.</p>
        <Link href="/register" className="inline-block px-10 py-5 bg-black text-white rounded-full font-black text-xl tracking-wider hover:bg-fuchsia-600 hover:scale-105 transition-all shadow-[8px_8px_0px_0px_rgba(255,255,255,0.5)]">
          MULAI PLANNER-MU
        </Link>
      </section>

      {/* BRANDED FOOTER (Header Match Layout) */}
      <footer className="bg-[#F8FAF5] text-black pt-16 pb-8 px-6 lg:px-12 mt-20 border-t-2 border-black">
        <div className="max-w-7xl mx-auto">
          {/* Top Section */}
          <div className="flex flex-col md:flex-row justify-between mb-16 gap-10">
            {/* Left: Branding & Desc */}
            <div className="max-w-sm">
              <div className="flex items-center gap-3 mb-6 group cursor-default">
                <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(236,72,153,1)]">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.525.02c1.31-.036 2.612-.012 3.914-.012.036 1.662.63 3.193 1.82 4.316.89.843 1.986 1.406 3.167 1.63v3.743c-1.37-.156-2.61-.745-3.616-1.67-.183-.17-.353-.35-.512-.54v7.412a7.11 7.11 0 0 1-7.11 7.11 7.11 7.11 0 0 1-7.11-7.11 7.11 7.11 0 0 1 7.11-7.11c.2 0 .4.01.6.03V11.2a3.333 3.333 0 1 0 3.13 3.333V0l.01.02z"></path>
                  </svg>
                </div>
                <span className="text-xl font-black italic tracking-tighter">TikTok<span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 to-cyan-400">Planner</span></span>
              </div>
              <p className="text-black/60 text-sm leading-relaxed font-mono font-medium">
                Platform cerdas untuk mengelola jadwal rilis. 
                Optimalkan strategi konten TikTokmu untuk dominasi FYP.
              </p>
            </div>

            {/* Right: Links */}
            <div className="flex flex-col md:items-start text-left">
              <h4 className="font-black text-[11px] tracking-widest uppercase mb-6 text-black/40 font-mono">TAUTAN</h4>
              <ul className="space-y-4 text-sm font-bold font-mono">
                <li><Link href="/register" className="border-b-2 border-transparent hover:border-fuchsia-500 transition-all">Mulai Planner</Link></li>
                <li><a href="https://pijarteknologi.id" target="_blank" rel="noopener noreferrer" className="border-b-2 border-transparent hover:border-cyan-400 transition-all">Pijar Teknologi</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="pt-6 border-t-2 border-black/10 flex flex-col-reverse md:flex-row items-center justify-between gap-6">
            <p className="text-xs font-bold font-mono text-black/40 uppercase tracking-tight">
              © 2026 Pijar Teknologi. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-black">
              <a href="https://www.linkedin.com/company/pijar-teknologi-indonesia/" target="_blank" rel="noopener noreferrer" className="hover:text-fuchsia-500 hover:scale-110 transition-all">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"></path></svg>
              </a>
              <a href="https://www.instagram.com/pijarteknologi.id/" target="_blank" rel="noopener noreferrer" className="hover:text-fuchsia-600 hover:scale-110 transition-all">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"></path></svg>
              </a>
              <a href="https://www.tiktok.com/@pijarteknologi.id" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-500 hover:scale-110 transition-all">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.036 2.612-.012 3.914-.012.036 1.662.63 3.193 1.82 4.316.89.843 1.986 1.406 3.167 1.63v3.743c-1.37-.156-2.61-.745-3.616-1.67-.183-.17-.353-.35-.512-.54v7.412a7.11 7.11 0 0 1-7.11 7.11 7.11 7.11 0 0 1-7.11-7.11 7.11 7.11 0 0 1 7.11-7.11c.2 0 .4.01.6.03V11.2a3.333 3.333 0 1 0 3.13 3.333V0l.01.02z"></path></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
