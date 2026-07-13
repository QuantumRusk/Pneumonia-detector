"use client";

import LiquidBackground from "./components/LiquidBackground";
import Link from "next/link";
import { useState } from "react";
import { Mail, ArrowUpRight, Activity, ScanLine, FileText, Menu, X } from "lucide-react";

// 👇 This is where the Launch button sends users. Opens in new tab.
const APP_URL = "/workspace";

const navLinks = [
  { label: "Home", target: "top" },
  { label: "Working", target: "working" },
  { label: "Guide", target: "guide" },
  { label: "Contact", target: "contact" },
];

function scrollTo(id: string) {
  if (id === "top") { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

// export default function Landing() {
//   const [menuOpen, setMenuOpen] = useState(false);
//   return (
//     <div id="top" className="min-h-screen relative overflow-x-hidden">
//       <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
//         <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-225 h-225 rounded-full opacity-30 blur-3xl"
//           style={{ background: "radial-gradient(circle, oklch(0.82 0.14 195 / 0.35), transparent 60%)" }} />
//         <div className="absolute top-1/3 -right-40 w-150 h-150 rounded-full opacity-25 blur-3xl"
//           style={{ background: "radial-gradient(circle, oklch(0.7 0.18 180 / 0.35), transparent 60%)" }} />
//       </div>
//       <Header menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
//       <Hero />
//       <Working />
//       <Guide />
//       <FinalCTA />
//       <Footer />
//     </div>
//   );
// }
export default function Page() { // Renamed to Page as required by Next.js
  const [menuOpen, setMenuOpen] = useState(false);
  
  return (
    <div id="top" className="min-h-screen relative overflow-x-hidden">
      
      {/* 🌟 THIS IS WHERE YOUR NEW BACKGROUND GOES 🌟 */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <LiquidBackground />
      </div>

      {/* Your actual content wraps cleanly here with a relative z-index */}
      <div className="relative z-10">
        <Header menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
        <Hero />
        <Working />
        <Guide />
        <FinalCTA />
        <Footer />
      </div>

    </div>
  );
}

function Header({ menuOpen, setMenuOpen }: { menuOpen: boolean; setMenuOpen: (v: boolean) => void }) {
  return (
    <header className="fixed top-0 inset-x-0 z-50 px-4 md:px-8 pt-4">
      <div className="glass-strong rounded-2xl px-5 md:px-7 py-3 flex items-center justify-between max-w-7xl mx-auto">
        <button onClick={() => scrollTo("top")} className="flex items-center gap-2.5">
          <span className="relative flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: "var(--gradient-accent)" }}>
            <Activity className="h-4 w-4 text-background" strokeWidth={2.5} />
          </span>
          <span className="font-semibold tracking-tight text-sm md:text-base">
            AI Pneumonia <span className="text-gradient">Detector</span>
          </span>
        </button>
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((l) => (
            <button key={l.label} onClick={() => scrollTo(l.target)}
              className="px-3.5 py-1.5 text-sm text-muted-foreground hover:text-foreground transition rounded-lg hover:bg-white/5">
              {l.label}
            </button>
          ))}
          <a href={APP_URL} target="_blank" rel="noopener noreferrer"
            className="ml-2 glow-btn glow-btn-hover animate-pulse-glow inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold">
            Launch <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.5} />
          </a>
        </nav>
        <button className="md:hidden p-2 rounded-lg hover:bg-white/5" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {menuOpen && (
        <div className="md:hidden glass-strong rounded-2xl mt-2 p-4 max-w-7xl mx-auto flex flex-col gap-1">
          {navLinks.map((l) => (
            <button key={l.label} onClick={() => { scrollTo(l.target); setMenuOpen(false); }}
              className="px-3 py-2 text-left text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg">
              {l.label}
            </button>
          ))}
          <a href={APP_URL} target="_blank" rel="noopener noreferrer"
            className="mt-2 glow-btn inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold">
            Launch Diagnostic Workspace <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      )}
    </header>
  );
}

function Hero() {
  return (
    <section className="pt-40 md:pt-48 pb-24 px-6 max-w-7xl mx-auto">
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs uppercase tracking-[0.2em] text-primary">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-glow" />
            Thoracic Neural Inference · Live
          </div>
          <h1 className="mt-6 text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.02]">
            Precision Screening<br />for <span className="text-gradient">Pulmonary</span><br />Infections.
          </h1>
          <p className="mt-6 text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl">
            An advanced, AI-powered thoracic evaluation system designed to instantly classify chest X-rays into{" "}
            <span className="text-foreground/90">Normal</span>, <span className="text-foreground/90">Bacterial</span>, and{" "}
            <span className="text-foreground/90">Viral</span> pneumonia vectors — with deep-feature visual heatmaps.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <a href={APP_URL} target="_blank" rel="noopener noreferrer"
              className="glow-btn glow-btn-hover animate-pulse-glow inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm md:text-base">
              Launch Diagnostic Workspace <ArrowUpRight className="h-4 w-4" strokeWidth={2.5} />
            </a>
            <button onClick={() => scrollTo("working")}
              className="glass hover:bg-white/5 transition inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-medium text-sm md:text-base">
              How it works
            </button>
          </div>
          <dl className="mt-12 grid grid-cols-3 gap-4 max-w-lg">
            {[{ k: "3-Class", v: "Tensor output" }, { k: "Grad-CAM", v: "Heatmap layer" }, { k: "PDF", v: "Auto report" }].map((s) => (
              <div key={s.k} className="glass rounded-xl px-3 py-3">
                <dt className="text-sm font-semibold text-gradient">{s.k}</dt>
                <dd className="mt-0.5 text-xs text-muted-foreground">{s.v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="relative">
          <div className="glass-strong rounded-3xl p-3 md:p-4 animate-float">
            <div className="relative rounded-2xl overflow-hidden aspect-square">
              <img src="/xray-hero.jpg" alt="Chest X-ray with AI focus overlay" className="w-full h-full object-cover" />
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: "linear-gradient(180deg, transparent 40%, oklch(0.12 0.02 240 / 0.6) 100%)" }} />
              <div className="absolute top-4 left-4 glass rounded-lg px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-widest text-primary">
                ● Live Inference
              </div>
              <div className="absolute bottom-4 left-4 right-4 glass rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Classification</div>
                  <div className="text-sm font-semibold mt-0.5">Bacterial · Confidence 96.3%</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Grad-CAM</div>
                  <div className="text-sm font-semibold text-gradient mt-0.5">Active</div>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-6 -left-6 glass-strong rounded-2xl px-4 py-3 hidden md:flex items-center gap-3">
            <ScanLine className="h-5 w-5 text-primary" />
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Latency</div>
              <div className="text-sm font-semibold">1.24s / scan</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const modules = [
  { phase: "01", icon: ScanLine, title: "Multi-Class Tensor Classification", body: "Bypasses standard binary categorization to instantly separate clear lung fields from acute bacterial or diffuse viral infiltrates." },
  { phase: "02", icon: Activity, title: "Grad-CAM Focus Activation Map", body: "Generates real-time visual heatmaps to explicitly highlight pixel regions of high diagnostic interest for clinical verification." },
  { phase: "03", icon: FileText, title: "Automated Prognosis Engine", body: "Cross-references statistical outputs to instantly generate standardized, downloadable clinical evaluation reports." },
];

function Working() {
  return (
    <section id="working" className="py-24 px-6 max-w-7xl mx-auto scroll-mt-28">
      <div className="max-w-2xl">
        <div className="text-xs uppercase tracking-[0.25em] text-primary font-mono">The Core Technology Matrix</div>
        <h2 className="mt-3 text-4xl md:text-5xl font-bold">How the <span className="text-gradient">neural pipeline</span> works.</h2>
        <p className="mt-4 text-muted-foreground">Three tightly coupled inference stages — from raw radiograph ingestion to signed clinical output.</p>
      </div>
      <div className="mt-14 grid md:grid-cols-3 gap-5">
        {modules.map((m) => {
          const Icon = m.icon;
          return (
            <article key={m.phase} className="glass rounded-2xl p-7 relative overflow-hidden group hover:border-primary/40 transition">
              <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full opacity-0 group-hover:opacity-100 transition"
                style={{ background: "radial-gradient(circle, oklch(0.82 0.14 195 / 0.25), transparent 70%)" }} />
              <div className="flex items-start justify-between">
                <div className="h-11 w-11 rounded-xl glass-strong flex items-center justify-center">
                  <Icon className="h-5 w-5 text-primary" strokeWidth={2} />
                </div>
                <span className="font-mono text-xs text-muted-foreground tracking-widest">PHASE {m.phase}</span>
              </div>
              <h3 className="mt-6 text-xl font-semibold leading-tight">{m.title}</h3>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{m.body}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

const guides = [
  { tag: "Bacterial Matrix", color: "oklch(0.7 0.2 30)", img: "/xray-bacterial.jpg", title: "Dense lobar consolidation", body: "Looks for dense, localized lobar consolidations where infection completely opacifies specific sections of the lung fields." },
  { tag: "Viral Matrix", color: "oklch(0.7 0.2 300)", img: "/xray-viral.jpg", title: "Diffuse interstitial pattern", body: "Evaluates diffuse, widespread patchy interstitial shadows or ground-glass opacities scattered symmetrically across both lungs." },
  { tag: "Normal Matrix", color: "oklch(0.8 0.15 180)", img: "/xray-normal.jpg", title: "Translucent lung fields", body: "Verifies fully translucent lung fields, clear costophrenic angles, and healthy thoracic cavity positioning." },
];

function Guide() {
  return (
    <section id="guide" className="py-24 px-6 max-w-7xl mx-auto scroll-mt-28">
      <div className="max-w-2xl">
        <div className="text-xs uppercase tracking-[0.25em] text-primary font-mono">Clinical Comparison Guide</div>
        <h2 className="mt-3 text-4xl md:text-5xl font-bold">What the model <span className="text-gradient">actually sees</span>.</h2>
        <p className="mt-4 text-muted-foreground">A quick reference to the visual signatures our deep-learning weights are trained to detect across the thoracic field.</p>
      </div>
      <div className="mt-14 grid md:grid-cols-3 gap-5">
        {guides.map((g) => (
          <article key={g.tag} className="glass rounded-2xl overflow-hidden group">
            <div className="relative aspect-4/3 overflow-hidden">
              <img src={g.img} alt={`${g.tag} — ${g.title}`} loading="lazy"
                className="w-full h-full object-cover transition duration-700 group-hover:scale-105" />
              <div className="absolute top-3 left-3 glass rounded-full px-3 py-1 text-[10px] font-mono uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: g.color }} />
                {g.tag}
              </div>
            </div>
            <div className="p-6">
              <h3 className="text-lg font-semibold">{g.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{g.body}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="py-24 px-6 max-w-7xl mx-auto">
      <div className="glass-strong rounded-3xl px-8 md:px-16 py-16 md:py-20 text-center relative overflow-hidden">
        <div aria-hidden className="absolute inset-0 opacity-40"
          style={{ background: "radial-gradient(ellipse 60% 80% at 50% 50%, oklch(0.4 0.15 190 / 0.4), transparent 70%)" }} />
        <div className="relative">
          <h2 className="text-4xl md:text-6xl font-bold leading-tight">
            Ready to evaluate the<br /><span className="text-gradient">neural pipeline?</span>
          </h2>
          <p className="mt-5 text-muted-foreground max-w-xl mx-auto">
            Access the live production terminal to test sample datasets, view Grad-CAM focus metrics, and generate instant clinical analytics sheets.
          </p>
          <a href={APP_URL} target="_blank" rel="noopener noreferrer"
            className="mt-9 glow-btn glow-btn-hover animate-pulse-glow inline-flex items-center gap-2 px-7 py-4 rounded-xl font-semibold text-base">
            Open Deep-Learning Terminal <ArrowUpRight className="h-4 w-4" strokeWidth={2.5} />
          </a>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-6 py-4 mt-2 rounded-xl bg-slate-950/40 border border-white/5 backdrop-blur-md text-center">
            <p className="text-[10px] font-bold text-amber-400/80 uppercase tracking-widest mb-1.5 flex items-center justify-center gap-1.5">
              <span>⚠️</span> Legal & Clinical Demonstration Disclaimer
            </p>
            <p className="text-[15px] text-slate-white leading-relaxed font-normal max-w-3xl mx-auto">
              This system is an AI-assisted screening prototype developed exclusively for evaluation and hackathon demonstration purposes. 
              The multi-class predictive scores, automated threshold alterations, and Grad-CAM focus metrics generated by this console 
              are intended to support investigative clinical triage workflows and do not constitute a definitive medical diagnosis. 
              All diagnostic outputs must be strictly reviewed, cross-referenced, and authenticated by a licensed radiologist or 
              certified healthcare practitioner prior to any clinical intervention.
            </p>
          </div>
    </section>
  );
}

function Footer() {
  return (
    <footer id="contact" className="px-6 pb-10 scroll-mt-28">
      <div className="max-w-7xl mx-auto glass-strong rounded-3xl px-8 py-12">
        <div className="grid md:grid-cols-3 gap-10 items-start">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ background: "var(--gradient-accent)" }}>
                <Activity className="h-4 w-4 text-background" strokeWidth={2.5} />
              </span>
              <span className="font-semibold">AI Pneumonia <span className="text-gradient">Detector</span></span>
            </div>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-xs">
              Research-grade thoracic AI. Not a substitute for licensed clinical evaluation. Always consult radiologist for further treatment and safety.
            </p>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-mono">Navigate</div>
            <ul className="mt-4 space-y-2 text-sm">
              {navLinks.map((l) => (
                <li key={l.label}>
                  <button onClick={() => scrollTo(l.target)} className="text-muted-foreground hover:text-foreground transition">
                    {l.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-mono">Contact</div>
            <div className="mt-4 flex items-center gap-3">
              <a href="mailto:your.email@example.com" aria-label="Email" target="_blank" rel="noopener noreferrer" className="glass hover:bg-white/5 transition rounded-xl h-11 w-11 flex items-center justify-center"><Mail className="h-4 w-4" /></a>
              <a href="https://www.linkedin.com/in/anumeh-patil-867b39280/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="glass hover:bg-white/5 transition rounded-xl h-11 w-11 flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-linkedin"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9" rx="1"/><circle cx="4" cy="4" r="2"/></svg></a>
              <a href="https://github.com/QuantumRusk" target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="glass hover:bg-white/5 transition rounded-xl h-11 w-11 flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-github"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg></a>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">-</p>
          </div>
          
        </div>
        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div>Built with deep-feature clinical intent.</div>
          <div className="text-center">© 2026 <span className="text-foreground/80">Anumeh Patil</span>. All rights reserved.</div>
          <Link href="/workspace" className="hover:text-foreground transition">Workspace →</Link>
        </div>
      </div>
    </footer>
  );
}
