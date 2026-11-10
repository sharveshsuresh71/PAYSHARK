import Link from "next/link";
import { ShieldCheck, LayoutDashboard, FileText, SlidersHorizontal, Bot, ClipboardCheck, Activity, Settings } from "lucide-react";
const links = [
  ["/dashboard","Overview",LayoutDashboard],["/agreements","Agreements",FileText],["/policies","Policies",SlidersHorizontal],
  ["/agents","AI Agents",Bot],["/approvals","Review Center",ClipboardCheck],["/audit","Audit Trail",Activity]
] as const;
export function Sidebar() {
  return <aside className="w-full lg:w-[250px] shrink-0 border-b lg:border-b-0 lg:border-r border-slate-800/80 p-5 lg:min-h-screen bg-[#0b1422]/80">
    <Link href="/dashboard" className="flex items-center gap-3 mb-10">
      <div className="h-10 w-10 rounded-xl bg-[#42d6d0] text-[#06141b] grid place-items-center"><ShieldCheck size={23}/></div>
      <div><div className="font-bold tracking-[.12em] text-white">PAYSHARK <span className="text-[#42d6d0]">AI</span></div><div className="text-[10px] text-slate-500 tracking-widest">PAYMENT CONTROL LAYER</div></div>
    </Link>
    <div className="kicker mb-3">Workspace</div>
    <nav className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-1">
      {links.map(([href,label,Icon])=><Link key={href} href={href} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-400 hover:text-white hover:bg-slate-800/70"><Icon size={17}/>{label}</Link>)}
    </nav>
    <div className="hidden lg:block mt-12 card p-4"><div className="flex items-center gap-2 text-sm font-semibold"><span className="h-2 w-2 rounded-full bg-amber-400"/> Sandbox environment</div><p className="text-xs muted mt-2 leading-5">Payments are routed to PayPal Sandbox. No real funds move.</p></div>
  </aside>;
}
