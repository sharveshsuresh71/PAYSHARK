import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-canvas px-6">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute left-1/2 top-1/2 h-[620px] w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(52_150_255/.18),transparent)]" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 [background-image:linear-gradient(rgb(52_150_255/.08)_1px,transparent_1px),linear-gradient(90deg,rgb(52_150_255/.08)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:linear-gradient(to_top,#000,transparent)] [transform:perspective(500px)_rotateX(60deg)] origin-bottom" />
      </div>
      <div className="relative text-center">
        <div className="kicker">Error 404 · Route not found</div>
        <h1 className="mt-4 bg-gradient-to-b from-white via-[#C9D3E0] to-[#3D7EFF] bg-clip-text font-display text-[clamp(96px,22vw,220px)] font-semibold leading-[0.85] tracking-[-0.06em] text-transparent">
          404
        </h1>
        <p className="mx-auto mt-6 max-w-md text-[15px] leading-[1.65] text-fg-muted">
          This payment rail doesn’t lead anywhere. The page may have moved, or the link is out of date.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/dashboard" className="btn btn-primary"><ArrowLeft size={15} /> Back to command centre</Link>
          <Link href="/" className="btn btn-secondary"><Compass size={15} /> Explore PAYSHARK</Link>
        </div>
      </div>
    </main>
  );
}
