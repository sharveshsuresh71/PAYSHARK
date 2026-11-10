import Link from "next/link";
import { ShieldCheck, ArrowUpRight, LockKeyhole, BrainCircuit, Fingerprint } from "lucide-react";
export default function Home(){return <main className="shell min-h-screen flex items-center px-6">
 <div className="max-w-6xl mx-auto w-full py-20">
  <div className="flex items-center gap-3 mb-20"><div className="h-11 w-11 rounded-xl bg-accent text-slate-950 grid place-items-center"><ShieldCheck/></div><span className="font-bold tracking-[.16em]">PAYSHARK <span className="text-accent">AI</span></span><span className="ml-2 text-xs border border-slate-700 rounded-full px-3 py-1 text-slate-400">PRIVATE BETA · SANDBOX</span></div>
  <div className="grid lg:grid-cols-[1.2fr_.8fr] gap-14 items-center">
   <div><div className="kicker mb-5">AGENTIC COMMERCE · HUMAN CONTROL</div><h1 className="text-5xl md:text-7xl font-semibold leading-[1.04] tracking-tight" style={{fontFamily:"Space Grotesk"}}>Trust every agreement.<br/><span className="text-accent">Control every payment.</span></h1>
    <p className="text-lg text-slate-400 max-w-xl mt-7 leading-8">A policy enforcement layer between autonomous AI agents and money movement. Agreements define intent. Rules enforce limits. Humans authorize.</p>
    <div className="flex flex-wrap gap-3 mt-9"><Link className="btn btn-primary inline-flex items-center gap-2" href="/dashboard">Open workspace <ArrowUpRight size={17}/></Link><Link className="btn btn-secondary" href="/demo">Explore security demo</Link></div>
    <p className="text-xs text-slate-600 mt-7">AI interprets. Rules enforce. Humans authorize. PayPal processes.</p>
   </div>
   <div className="card p-6 md:p-8 shadow-glow"><div className="flex justify-between items-center"><span className="kicker">Authorization pipeline</span><span className="text-xs text-emerald-300">● guarded</span></div>
    {[["01","Agreement verified","Mutual confirmation + version lock"],["02","Policy evaluated","Deterministic limits and merchant rules"],["03","Human authorization","Single-use approval binding"],["04","PayPal Sandbox","Server-side order and capture verification"]].map(([n,t,d])=><div key={n} className="flex gap-4 py-5 border-b border-slate-800 last:border-0"><div className="text-accent font-mono text-sm">{n}</div><div><div className="font-semibold">{t}</div><div className="text-xs muted mt-1">{d}</div></div></div>)}
   </div>
  </div>
 </div>
</main>}
