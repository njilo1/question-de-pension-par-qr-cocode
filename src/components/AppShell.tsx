import { Link, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ScanLine, Users, LayoutDashboard, LogOut, ShieldCheck, Receipt, GraduationCap, Home, FileSpreadsheet, Menu, X } from "lucide-react";
import { useState } from "react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    router.navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground font-sans selection:bg-blue-500/20">
      {/* Mobile Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-sidebar-border bg-sidebar text-sidebar-foreground md:hidden z-30">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <span className="font-bold text-lg text-gradient">UniVerify</span>
            <div className="text-[9px] font-semibold text-muted-foreground/80 uppercase tracking-wider">RECTORAT FS Ebolowa</div>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setIsMobileMenuOpen(true)}
          className="hover:bg-primary/10"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </header>

      {/* Backdrop for mobile sidebar */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Aside */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-80 border-r border-sidebar-border flex flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300 md:translate-x-0 md:relative ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="px-8 py-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-premium animate-pulse-slow">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div>
              <div className="font-bold text-2xl tracking-tight text-gradient">UniVerify</div>
              <div className="text-xs font-medium text-muted-foreground/80 uppercase tracking-widest">RECTORAT FS Ebolowa</div>
            </div>
          </div>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden" 
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="h-6 w-6" />
          </Button>
        </div>
        
        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
          <div className="px-4 pb-3 text-xs font-bold text-muted-foreground uppercase tracking-[0.2em]">Menu Principal</div>
          <NavItem to="/" icon={<Home className="h-5 w-5" />} label="Accueil" onClick={() => setIsMobileMenuOpen(false)} />
          <NavItem to="/dashboard" icon={<LayoutDashboard className="h-5 w-5" />} label="Tableau de bord" onClick={() => setIsMobileMenuOpen(false)} />
          <NavItem to="/verify" icon={<ScanLine className="h-5 w-5" />} label="Scanner Reçu" onClick={() => setIsMobileMenuOpen(false)} />
          <NavItem to="/face-verify" icon={<ShieldCheck className="h-5 w-5" />} label="Vérifier Visage" onClick={() => setIsMobileMenuOpen(false)} />
          <NavItem to="/import-excel" icon={<Receipt className="h-5 w-5" />} label="Import Banque" onClick={() => setIsMobileMenuOpen(false)} />
          <NavItem to="/students" icon={<Users className="h-5 w-5" />} label="Base Étudiants" onClick={() => setIsMobileMenuOpen(false)} />
          <NavItem to="/import-export" icon={<FileSpreadsheet className="h-5 w-5" />} label="Import/Export Excel" onClick={() => setIsMobileMenuOpen(false)} />
          <NavItem to="/classes" icon={<GraduationCap className="h-5 w-5" />} label="Gestion Classes" onClick={() => setIsMobileMenuOpen(false)} />
          <NavItem to="/depenses" icon={<Receipt className="h-5 w-5" />} label="Flux Dépenses" onClick={() => setIsMobileMenuOpen(false)} />
        </nav>

        <div className="p-6 mt-auto">
          <div className="glass-card p-4 space-y-4">
            <div className="flex items-center gap-3 px-1">
              <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center border border-primary/10">
                <Users className="h-5 w-5 text-primary" />
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
      </aside>

      <main className="flex-1 relative overflow-hidden">
        {/* Subtle background glow elements */}
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] -z-10" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[120px] -z-10" />
        
        <div className="h-full overflow-auto">
          <div className="max-w-7xl mx-auto p-4 sm:p-8 lg:p-14 animate-in fade-in duration-700">
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
      className="flex items-center gap-4 px-5 py-3.5 rounded-xl text-base font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-300 hover-lift group"
      activeProps={{
        className:
          "flex items-center gap-4 px-5 py-3.5 rounded-xl text-base font-bold bg-primary/10 text-primary shadow-sm border border-primary/20",
      }}
    >
      <span className="transition-transform duration-300 group-hover:scale-110">{icon}</span>
      {label}
    </Link>
  );
}
