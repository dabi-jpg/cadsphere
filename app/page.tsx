import Link from "next/link";
import { Navbar } from "@/components/Navbar";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      <Navbar />

      {/* Hero Section */}
      <section className="bg-white py-20 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            
            {/* Text Content */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-primary text-xs font-bold uppercase tracking-wider mb-6">
                Internal Corporate Resource
              </div>
              <h1 className="text-4xl lg:text-6xl font-extrabold text-slate-900 leading-tight mb-6">
                Centralized Engineering <span className="text-primary text-opacity-90">Design Vault</span>
              </h1>
              <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto lg:mx-0">
                Access the company's secure private cloud for CAD storage, versioning, and cross-departmental collaboration. Unified infrastructure for global engineering teams.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link 
                  href="/login" 
                  className="bg-primary text-white px-8 py-4 rounded-lg font-bold text-base hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 text-center"
                >
                  SSO Employee Login
                </Link>
                <Link 
                  href="/signup" 
                  className="bg-white border border-slate-300 text-slate-700 px-8 py-4 rounded-lg font-bold text-base hover:bg-slate-50 transition-colors text-center"
                >
                  Request Server Access
                </Link>
              </div>
            </div>

            {/* Visual Element */}
            <div className="flex-1 w-full max-w-xl">
              <div className="relative bg-slate-100 rounded-xl p-4 border border-slate-200 shadow-xl overflow-hidden group">
                <img 
                  alt="Internal Storage UI" 
                  className="rounded border border-slate-200 w-full transition-transform duration-300 group-hover:scale-[1.02]" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBZSdf0Kl2WJxf0aJvMzah9bAaFrDx2KvOKJpPmlvomYSx3BqvSoPnl_VvMCVuadWEH_QgnUDJZ1mCzSkxheUYS6djoOMAD_-q9M_v14LB_jyChld7FDj6243s11W5YPNd9I6H8XgxJmD7pzAvWTBi9OyJmlsbtpDtfO7tVVyCZwv4cSHRt1PGqNiRjk0CdsdIFpYo3wFIjhJLYjD6iBz1mEslk3Igcb-gztKQF1MRJb3-vdewCwt3_5awXBbm2arcWme3yHYVoIg4" 
                />
                {/* Decorative element */}
                <div className="absolute top-8 right-8 bg-white p-3 rounded-lg shadow-lg border border-slate-100 flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs font-bold text-slate-700">VPN ENCRYPTED</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="py-20 bg-slate-50" id="features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Internal Engineering Infrastructure</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">Optimized tools designed specifically for our private CAD ecosystem and proprietary design workflows.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-50 text-primary rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Secure Engineering Vault</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Tier-3 data center encryption for all proprietary .DWG, .STEP, and .SLDPRT files. Compliant with company IP protection policies.
              </p>
            </div>
            
            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-50 text-primary rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Team Collaboration</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Enable real-time design reviews and markup sharing across global offices. Integrated with internal communication channels.
              </p>
            </div>
            
            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-50 text-primary rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Version Control</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Complete history tracking for every design iteration. Revert to any state and prevent file conflicts with smart check-in/out.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Company News */}
      <section className="py-20 bg-white" id="news">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-12 gap-4">
            <div className="max-w-xl">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Systems & Infrastructure News</h2>
              <p className="text-slate-600">Stay informed about scheduled maintenance and software rollouts.</p>
            </div>
            <Link href="#" className="text-primary font-semibold text-sm hover:underline">
              View Archives →
            </Link>
          </div>
          
          <div className="space-y-4">
            {/* News Item 1 */}
            <div className="flex items-center gap-6 p-6 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
              <div className="flex-shrink-0 w-24 text-center">
                <span className="block text-2xl font-bold text-slate-900">OCT 24</span>
                <span className="text-xs text-slate-500 font-bold uppercase">Scheduled</span>
              </div>
              <div className="flex-grow">
                <h4 className="text-lg font-bold text-slate-800 mb-1">Vault Server Migration (EMEA Region)</h4>
                <p className="text-sm text-slate-600">The EMEA primary storage cluster will undergo a performance upgrade between 02:00 and 04:00 UTC.</p>
              </div>
              <div className="hidden md:block">
                <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded">MAINTENANCE</span>
              </div>
            </div>
            
            {/* News Item 2 */}
            <div className="flex items-center gap-6 p-6 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
              <div className="flex-shrink-0 w-24 text-center">
                <span className="block text-2xl font-bold text-slate-900">OCT 20</span>
                <span className="text-xs text-slate-500 font-bold uppercase">Update</span>
              </div>
              <div className="flex-grow">
                <h4 className="text-lg font-bold text-slate-800 mb-1">SolidWorks Plugin Version 4.2 Rollout</h4>
                <p className="text-sm text-slate-600">Please update your local desktop plugins to the latest version to maintain sync compatibility.</p>
              </div>
              <div className="hidden md:block">
                <span className="px-3 py-1 bg-green-50 text-green-700 text-xs font-bold rounded">SYSTEM UPDATE</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 border-b border-slate-800 pb-8 mb-8">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary rounded flex items-center justify-center text-white text-[10px] font-bold">C</div>
              <span className="text-white font-bold text-sm uppercase tracking-widest">CorpCAD Private Storage</span>
            </div>
            <div className="flex gap-8 text-xs font-medium uppercase tracking-wider flex-wrap justify-center">
              <Link href="#" className="hover:text-white transition-colors">IT Help Desk</Link>
              <Link href="#" className="hover:text-white transition-colors">Security Policy</Link>
              <Link href="#" className="hover:text-white transition-colors">Admin Dashboard</Link>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
            <p className="text-xs">© 2026 Company Name Inc. | Internal Use Only | Confidential Infrastructure</p>
            <div className="text-xs">
              System Status: <span className="text-green-500 font-bold">ALL SYSTEMS OPERATIONAL</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
