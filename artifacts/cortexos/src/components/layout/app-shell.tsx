import { useClerk, useUser } from "@clerk/react";
import { Link, useLocation } from "wouter";
import { 
  TerminalSquare, 
  FileText, 
  Files, 
  CheckSquare, 
  Briefcase, 
  MessageSquare, 
  SplitSquareHorizontal, 
  BrainCircuit, 
  Network, 
  Search, 
  Users, 
  Clock,
  Settings,
  LogOut,
  Menu,
  X
} from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: TerminalSquare },
  { href: "/notes", label: "Notes", icon: FileText },
  { href: "/documents", label: "Documents", icon: Files },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/projects", label: "Projects", icon: Briefcase },
  { href: "/chat", label: "OS Chat", icon: MessageSquare },
  { href: "/decisions", label: "Simulator", icon: SplitSquareHorizontal },
  { href: "/contradictions", label: "Detector", icon: BrainCircuit },
  { href: "/knowledge-graph", label: "Graph", icon: Network },
  { href: "/research", label: "Research", icon: Search },
  { href: "/reasoning", label: "Agents", icon: Users },
  { href: "/memory", label: "Memory", icon: Clock },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { signOut } = useClerk();
  const { user } = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background text-foreground font-mono selection:bg-primary/30">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-white/10 glass z-50 sticky top-0">
        <Link href="/dashboard" className="flex items-center gap-2">
          <img src={`${basePath}/logo.svg`} alt="CortexOS" className="w-8 h-8" />
          <span className="font-bold text-lg tracking-wider neon-text">CORTEX<span className="text-primary">OS</span></span>
        </Link>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed md:sticky top-[73px] md:top-0 h-[calc(100dvh-73px)] md:h-[100dvh] w-full md:w-64 
        glass-card border-r border-y-0 border-l-0 flex flex-col transition-transform duration-300 z-40
        ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        <div className="hidden md:flex p-6 items-center gap-3 border-b border-white/10">
          <img src={`${basePath}/logo.svg`} alt="CortexOS" className="w-8 h-8" />
          <span className="font-bold text-xl tracking-wider neon-text">CORTEX<span className="text-primary">OS</span></span>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
          <div className="text-xs font-semibold text-primary/70 mb-4 px-3 uppercase tracking-widest">Core Systems</div>
          {NAV_ITEMS.slice(0, 5).map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                <div className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200
                  ${isActive 
                    ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_10px_rgba(0,240,255,0.1)]" 
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"}
                `}>
                  <item.icon size={18} className={isActive ? "text-primary" : ""} />
                  <span className="font-medium text-sm">{item.label}</span>
                </div>
              </Link>
            );
          })}

          <div className="text-xs font-semibold text-secondary/70 mt-8 mb-4 px-3 uppercase tracking-widest">AI Modules</div>
          {NAV_ITEMS.slice(5).map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                <div className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200
                  ${isActive 
                    ? "bg-secondary/10 text-secondary border border-secondary/20 shadow-[0_0_10px_rgba(112,0,255,0.1)]" 
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"}
                `}>
                  <item.icon size={18} className={isActive ? "text-secondary" : ""} />
                  <span className="font-medium text-sm">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 bg-background/50">
          <Link href="/settings" onClick={() => setMobileMenuOpen(false)}>
            <div className={`
              flex items-center gap-3 mb-2 px-2 py-2 rounded-md transition-all duration-200 cursor-pointer
              ${location === "/settings"
                ? "bg-primary/10 border border-primary/20 shadow-[0_0_10px_rgba(0,240,255,0.1)]"
                : "hover:bg-white/5 border border-transparent"}
            `}>
              <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold shadow-[0_0_10px_rgba(0,240,255,0.2)]">
                {user?.firstName?.[0] || user?.username?.[0] || "U"}
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="text-sm font-semibold truncate">{user?.firstName || user?.username || "User"}</div>
                <div className="text-xs text-primary truncate">View profile</div>
              </div>
              <Settings size={16} className={location === "/settings" ? "text-primary" : "text-muted-foreground"} />
            </div>
          </Link>
          <button
            onClick={() => signOut({ redirectUrl: basePath || "/" })}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-destructive/80 hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut size={18} />
            <span className="text-sm font-medium">Terminate Session</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative h-[calc(100dvh-73px)] md:h-[100dvh] overflow-y-auto custom-scrollbar">
        {/* Ambient background glow */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="flex-1 p-4 md:p-8 z-10">
          {children}
        </div>
      </main>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}} />
    </div>
  );
}