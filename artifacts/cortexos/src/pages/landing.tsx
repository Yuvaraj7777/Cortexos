import { Link } from "wouter";
import { ArrowRight, BrainCircuit, Database, Network, Search, Shield, Zap } from "lucide-react";

export default function LandingPage() {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <div className="min-h-[100dvh] bg-background text-foreground font-mono selection:bg-primary/30 relative overflow-hidden">
      {/* Background imagery */}
      <div 
        className="absolute inset-0 z-0 opacity-30 pointer-events-none" 
        style={{ backgroundImage: `url(${basePath}/hero-bg.png)`, backgroundSize: 'cover', backgroundPosition: 'center' }} 
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-background/40 via-background/90 to-background pointer-events-none" />

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <img src={`${basePath}/logo.svg`} alt="CortexOS" className="w-10 h-10" />
          <span className="font-bold text-2xl tracking-wider neon-text">CORTEX<span className="text-primary">OS</span></span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/sign-in" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
            Login
          </Link>
          <Link href="/sign-up" className="bg-primary text-primary-foreground px-6 py-2 rounded-md font-bold hover:bg-primary/90 transition-all shadow-[0_0_15px_rgba(0,240,255,0.4)] hover:shadow-[0_0_25px_rgba(0,240,255,0.6)]">
            Initialize
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary mb-8 text-sm font-semibold tracking-wide">
            <Zap size={14} className="fill-primary" />
            SYSTEM ONLINE: VERSION X
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
            An Operating System <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">For Your Mind.</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl leading-relaxed">
            Dump your thoughts, tasks, and data into a living knowledge graph. Watch as a panel of AI agents reasons over it, detects contradictions, and simulates decisions.
          </p>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <Link href="/sign-up" className="inline-flex items-center justify-center gap-2 bg-foreground text-background px-8 py-4 rounded-lg font-bold text-lg hover:bg-foreground/90 transition-all w-full sm:w-auto">
              Boot Sequence
              <ArrowRight size={20} />
            </Link>
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Shield size={16} className="text-secondary" />
              End-to-end encrypted neural storage
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-32">
          <FeatureCard 
            icon={BrainCircuit}
            title="Multi-Agent Reasoning"
            description="Consult a panel of 6 specialized AI agents (Optimist, Critic, Strategist, etc.) to analyze any problem from multiple angles."
            color="primary"
          />
          <FeatureCard 
            icon={Network}
            title="Living Knowledge Graph"
            description="Your notes and documents automatically form a vast, interconnected web of relationships that grows as you think."
            color="secondary"
          />
          <FeatureCard 
            icon={Search}
            title="Contradiction Detection"
            description="The system constantly scans your second brain to identify conflicting beliefs, assumptions, or outdated information."
            color="primary"
          />
        </div>
      </main>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description, color }: { icon: any, title: string, description: string, color: "primary" | "secondary" }) {
  const isPrimary = color === "primary";
  return (
    <div className={`glass-card p-8 rounded-xl border-t ${isPrimary ? "border-primary/20" : "border-secondary/20"} hover:-translate-y-1 transition-transform duration-300`}>
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-6 ${isPrimary ? "bg-primary/10 text-primary" : "bg-secondary/10 text-secondary"}`}>
        <Icon size={24} />
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}