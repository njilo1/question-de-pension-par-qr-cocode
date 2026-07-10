import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Pencil, GraduationCap, Coins } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/classes")({
  component: ClassesPage,
});

export interface ClassItem {
  id: string;
  name: string;
  filiere: string;
  niveau: string;
  pension_amount: number;
  created_at: string;
}

function ClassesPage() {
  const { user, loading } = useAuth();
  if (!loading && !user) return <Navigate to="/login" />;
  if (loading) return null;
  return (
    <AppShell>
      <InnerClasses />
    </AppShell>
  );
}

function InnerClasses() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [reload, setReload] = useState(0);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    setLoadingData(true);
    supabase
      .from("classes")
      .select("*")
      .order("name", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          toast.error("Erreur de chargement : " + error.message);
        } else {
          setClasses((data as ClassItem[]) || []);
        }
        setLoadingData(false);
      });
  }, [reload]);

  const filtered = classes.filter((c) => {
    const q = search.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || c.filiere.toLowerCase().includes(q) || c.niveau.toLowerCase().includes(q);
  });

  const onDelete = async (id: string) => {
    if (!confirm("Supprimer cette classe ? Cela dissociera les étudiants liés à cette classe (leur class_id sera mis à NULL).")) return;
    const { error } = await supabase.from("classes").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Classe supprimée");
      setReload((x) => x + 1);
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-primary">Gestion des Classes</h1>
          <p className="text-muted-foreground text-base sm:text-lg mt-1">{classes.length} classes configurées pour l'établissement.</p>
        </div>
        <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) setEditingClass(null); }}>
          <DialogTrigger asChild>
            <Button size="lg" className="shadow-premium w-full sm:w-auto" onClick={() => { setEditingClass(null); setOpen(true); }}>
              <Plus className="h-5 w-5 mr-2" />Nouvelle Classe
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl glass rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-gradient mb-4">
                {editingClass ? "Modifier la Classe" : "Ajouter une Classe"}
              </DialogTitle>
            </DialogHeader>
            <ClassForm 
              editingClass={editingClass || undefined}
              onCreated={() => { setOpen(false); setEditingClass(null); setReload((x) => x + 1); }} 
            />
          </DialogContent>
        </Dialog>
      </header>

      <div className="flex items-center gap-4">
        <Input 
          placeholder="Rechercher une classe, filière, niveau…" 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          className="w-full sm:max-w-md h-12 rounded-xl bg-card/50 backdrop-blur-sm border-primary/10 focus:ring-primary/40" 
        />
      </div>

      {loadingData ? (
        <div className="text-center py-20 text-muted-foreground">Chargement des classes…</div>
      ) : filtered.length === 0 ? (
        <Card className="p-20 text-center text-muted-foreground glass-card border-dashed">
          Aucune classe trouvée.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((c) => (
            <Card key={c.id} className="p-5 flex flex-col justify-between shadow-elegant hover-lift bg-card/60 border-primary/5 group relative overflow-hidden">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    <GraduationCap className="h-6 w-6" />
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-primary/60 hover:text-primary hover:bg-primary/10 rounded-full" 
                      onClick={() => {
                        setEditingClass(c);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive/40 hover:text-destructive hover:bg-destructive/10 rounded-full" 
                      onClick={() => onDelete(c.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-bold text-xl truncate group-hover:text-primary transition-colors">{c.name}</h3>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="inline-flex px-2 py-0.5 rounded-md bg-secondary text-foreground text-[10px] font-black uppercase tracking-wider">{c.niveau}</span>
                    <span className="text-xs text-muted-foreground truncate">{c.filiere}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-primary/5 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Coins className="h-4 w-4 text-accent" />
                  <span className="text-xs font-semibold">Pension requise</span>
                </div>
                <div className="text-lg font-black text-gradient">{Number(c.pension_amount).toLocaleString("fr-FR")} XAF</div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

interface ClassFormProps {
  onCreated: () => void;
  editingClass?: ClassItem;
}

function ClassForm({ onCreated, editingClass }: ClassFormProps) {
  const [name, setName] = useState("");
  const [filiere, setFiliere] = useState("");
  const [niveau, setNiveau] = useState("");
  const [pension, setPension] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (editingClass) {
      setName(editingClass.name);
      setFiliere(editingClass.filiere);
      setNiveau(editingClass.niveau);
      setPension(editingClass.pension_amount.toString());
    } else {
      setName("");
      setFiliere("");
      setNiveau("");
      setPension("50000");
    }
  }, [editingClass]);

  // Générer automatiquement le nom de la classe en combinant Filière et Niveau
  const handleAutoName = (fil: string, niv: string) => {
    if (!editingClass) {
      const computed = `${fil.trim()} - ${niv.trim()}`;
      setName(computed);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !filiere || !niveau || !pension) {
      toast.error("Veuillez remplir tous les champs.");
      return;
    }
    
    setBusy(true);
    try {
      if (editingClass) {
        const { error } = await supabase
          .from("classes")
          .update({
            name,
            filiere,
            niveau,
            pension_amount: Number(pension) || 0,
          })
          .eq("id", editingClass.id);

        if (error) throw error;
        toast.success("Classe modifiée");
      } else {
        const { error } = await supabase
          .from("classes")
          .insert({
            name,
            filiere,
            niveau,
            pension_amount: Number(pension) || 0,
          });

        if (error) throw error;
        toast.success("Classe créée");
      }
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Filière</Label>
          <Input 
            required 
            value={filiere} 
            onChange={(e) => {
              setFiliere(e.target.value);
              handleAutoName(e.target.value, niveau);
            }} 
            placeholder="Génie Informatique" 
          />
        </div>
        <div className="space-y-1.5">
          <Label>Niveau</Label>
          <Input 
            required 
            value={niveau} 
            onChange={(e) => {
              setNiveau(e.target.value);
              handleAutoName(filiere, e.target.value);
            }} 
            placeholder="L3" 
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Nom de la classe</Label>
        <Input 
          required 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          placeholder="Génie Informatique - L3" 
        />
      </div>

      <div className="space-y-1.5">
        <Label>Pension par défaut (XAF)</Label>
        <Input 
          required 
          type="number" 
          value={pension} 
          onChange={(e) => setPension(e.target.value)} 
          placeholder="50000" 
        />
      </div>

      <Button type="submit" className="w-full h-11" disabled={busy}>
        {busy ? "Enregistrement…" : editingClass ? "Modifier la Classe" : "Créer la Classe"}
      </Button>
    </form>
  );
}
