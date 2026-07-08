import { Link, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ScanLine, Users, LayoutDashboard, LogOut, ShieldCheck, Receipt, GraduationCap, Home, FileSpreadsheet, Menu, X } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [router.state.location.pathname]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  const handleLogout = async () => {
    await signOut();
    router.navigate({ to: "/login" });
  };

  const SidebarContent = () => (
    <>
      <div className="px-6 py-8 lg:px-8 lg:py-10">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 lg:h-12 lg:w-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-premium animate-pulse-slow flex-shrink-0">
            <ShieldCheck className="h-6 w-6 lg:h-7 lg:w-7" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-xl lg:text-2xl tracking-tight text-gradient">UniVerify</div>
            <div className="text-[10px] font-medium text-muted-foreground/80 uppercase tracking-widest truncate">RECTORAT FS Ebolowa</div>
          </div>
          {/* Close button visible only on mobile */}
          <button
            className="ml-auto lg:hidden text-muted-foreground hover:text-foreground transition-colors p-1"
            onClick={() => setSidebarOpen(false)}
            aria-label="Fermer le menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <nav className="flex-1 px-3 lg:px-4 space-y-1">
        <div className="px-4 pb-3 text-xs font-bold text-muted-foreground uppercase tracking-[0.2em]">Menu Principal</div>
        <NavItem to="/" icon={<Home className="h-5 w-5" />} label="Accueil" onClick={() => setSidebarOpen(false)} />
        <NavItem to="/dashboard" icon={<LayoutDashboard className="h-5 w-5" />} label="Tableau de bord" onClick={() => setSidebarOpen(false)} />
        <NavItem to="/verify" icon={<ScanLine className="h-5 w-5" />} label="Scanner Reçu" onClick={() => setSidebarOpen(false)} />
        <NavItem to="/face-verify" icon={<ShieldCheck className="h-5 w-5" />} label="Vérifier Visage" onClick={() => setSidebarOpen(false)} />
        <NavItem to="/import-excel" icon={<Receipt className="h-5 w-5" />} label="Import Banque" onClick={() => setSidebarOpen(false)} />
        <NavItem to="/students" icon={<Users className="h-5 w-5" />} label="Base Étudiants" onClick={() => setSidebarOpen(false)} />
        <NavItem to="/import-export" icon={<FileSpreadsheet className="h-5 w-5" />} label="Import/Export Excel" onClick={() => setSidebarOpen(false)} />
        <NavItem to="/classes" icon={<GraduationCap className="h-5 w-5" />} label="Gestion Classes" onClick={() => setSidebarOpen(false)} />
        <NavItem to="/depenses" icon={<Receipt className="h-5 w-5" />} label="Flux Dépenses" onClick={() => setSidebarOpen(false)} />
      </nav>

      <div className="p-4 lg:p-6 mt-auto">
        <div className="glass-card p-4 space-y-4">
          <div className="flex items-center gap-3 px-1">
            <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center border border-primary/10 flex-shrink-0">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="text-sm font-semibold truncate">{user?.email?.split('@')[0]}</div>
              <div className="text-xs text-muted-foreground truncate uppercase">{user?.email?.split('@')[1]}</div>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start hover:bg-destructive hover:text-destructive-foreground transition-all duration-300"
          >
            <LogOut className="h-4 w-4 mr-2" />
            <span className="text-sm font-bold">Déconnexion</span>
          </Button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-slate-900 text-slate-50 font-sans selection:bg-blue-500/20">

      {/* ── Desktop Sidebar (always visible on lg+) ── */}
      <aside className="hidden lg:flex w-72 xl:w-80 glass border-r flex-col z-20 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* ── Mobile: Backdrop overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile: Slide-over sidebar ── */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 glass border-r flex flex-col z-40 lg:hidden
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <SidebarContent />
      </aside>

      {/* ── Main content area ── */}
      <main className="flex-1 relative overflow-hidden min-w-0">
        {/* Subtle background glow elements */}
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] -z-10" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[120px] -z-10" />

        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-20 flex items-center gap-3 px-4 h-14 bg-slate-900/90 backdrop-blur border-b border-white/10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-base tracking-tight text-gradient">UniVerify</span>
          </div>
        </div>

        <div className="h-full overflow-auto">
          <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 xl:p-14 animate-in fade-in duration-700">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

function NavItem({ to, icon, label, onClick }: { to: string; icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      activeOptions={{ exact: to === "/" }}
      className="flex items-center gap-3 lg:gap-4 px-4 lg:px-5 py-3 lg:py-3.5 rounded-xl text-sm lg:text-base font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-300 group"
      activeProps={{
        className:
          "flex items-center gap-3 lg:gap-4 px-4 lg:px-5 py-3 lg:py-3.5 rounded-xl text-sm lg:text-base font-bold bg-primary/10 text-primary shadow-sm border border-primary/20",
      }}
    >
      <span className="transition-transform duration-300 group-hover:scale-110 flex-shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </Link>
  );
}
