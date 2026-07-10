import { createFileRoute, useNavigate, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { user, loading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("admin@rectorat.edu");
  const [password, setPassword] = useState("admin123");
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to="/" />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const fn = mode === "signin" ? signIn : signUp;
    const { error } = await fn(email, password);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (mode === "signup") {
      toast.success("Compte créé avec succès !");
      setMode("signin");
    } else {
      toast.success("Connexion réussie");
      navigate({ to: "/" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background font-sans text-foreground selection:bg-blue-500/20">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-primary/10 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[50%] bg-primary/10 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-md px-4 relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-primary/10 border border-primary/30 mb-6 shadow-2xl shadow-primary/10 animate-float">
            <ShieldCheck className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-primary mb-2">PensionVerify</h1>
          <p className="text-muted-foreground font-medium uppercase tracking-[0.2em] text-[10px]">Portail d'Administration</p>
        </div>

        <Card className="p-10 border-border bg-card shadow-2xl relative overflow-hidden group hover:border-primary/30 transition-colors duration-500 rounded-3xl">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-accent to-primary animate-pulse" />
          
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-black text-foreground tracking-tight mb-2">
              {mode === "signin" ? "Accès Sécurisé" : "Rejoindre l'Administration"}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {mode === "signin" ? "Authentification requise pour la gestion biométrique." : "Configurez votre accès administrateur."}
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-muted-foreground text-[10px] uppercase tracking-widest font-black ml-1">Identifiant Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="admin@rectorat.edu"
                className="h-13 rounded-xl transition-all" 
                required 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password" className="text-muted-foreground text-[10px] uppercase tracking-widest font-black ml-1">Clé d'Accès</Label>
              </div>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••"
                className="h-13 rounded-xl transition-all" 
                required 
                minLength={6} 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
              />
            </div>
            
            <Button type="submit" className="w-full h-14 text-lg font-black shadow-2xl shadow-primary/40 hover:scale-[1.02] active:scale-95 transition-all duration-300 mt-4" disabled={busy}>
              {busy ? "Traitement..." : mode === "signin" ? "Se Connecter" : "Créer l'Accès"}
            </Button>
          </form>

          <div className="mt-10 pt-8 border-t border-border text-center">
            <button 
              className="text-muted-foreground hover:text-primary text-xs font-bold transition-all duration-300 uppercase tracking-widest" 
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin" ? "Nouveau membre ? Créer un compte" : "Déjà enregistré ? S'identifier"}
            </button>
          </div>
        </Card>
        
        <p className="mt-12 text-center text-[10px] text-muted-foreground uppercase tracking-[0.4em] font-black">
          © 2026 Rectorat • Gouvernance Numérique
        </p>
      </div>
    </div>
  );
}
