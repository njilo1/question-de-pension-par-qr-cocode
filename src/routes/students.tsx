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
import { normalizeName } from "@/lib/normalize";
import { Plus, Trash2, UserCircle2, Pencil } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/students")({
  component: StudentsPage,
});

export interface Student {
  id: string;
  full_name: string;
  matricule: string;
  filiere: string;
  niveau: string;
  pension_amount: number;
  reference_photo_url: string | null;
}

function StudentsPage() {
  const { user, loading } = useAuth();
  if (!loading && !user) return <Navigate to="/login" />;
  if (loading) return null;
  return (
    <AppShell>
      <Inner />
    </AppShell>
  );
}

function Inner() {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    supabase
      .from("students")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setStudents((data as Student[]) || []));
  }, [reload]);

  const filtered = students.filter((s) => {
    const q = search.toLowerCase();
    return !q || s.full_name.toLowerCase().includes(q) || s.matricule.toLowerCase().includes(q);
  });

  const onDelete = async (id: string) => {
    if (!confirm("Supprimer cet étudiant ?")) return;
    const { error } = await supabase.from("students").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Étudiant supprimé"); setReload((x) => x + 1); }
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">Répertoire Étudiants</h1>
          <p className="text-muted-foreground text-base lg:text-lg mt-1">{students.length} membres enregistrés dans la base.</p>
        </div>
        <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) setEditingStudent(null); }}>
          <DialogTrigger asChild>
            <Button size="lg" className="shadow-premium w-full sm:w-auto flex-shrink-0" onClick={() => { setEditingStudent(null); setOpen(true); }}><Plus className="h-5 w-5 mr-2" />Nouvel Étudiant</Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl glass rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-gradient mb-4">
                {editingStudent ? "Modifier l'Étudiant" : "Inscrire un Étudiant"}
              </DialogTitle>
            </DialogHeader>
            <StudentForm 
              editingStudent={editingStudent || undefined}
              onCreated={() => { setOpen(false); setEditingStudent(null); setReload((x) => x + 1); }} 
            />
          </DialogContent>
        </Dialog>
      </header>

      <div className="flex items-center gap-4">
        <Input 
          placeholder="Rechercher par nom ou matricule…" 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          className="w-full sm:max-w-md h-12 rounded-xl bg-card/50 backdrop-blur-sm border-primary/10 focus:ring-primary/40" 
        />
      </div>

      {filtered.length === 0 ? (
        <Card className="p-20 text-center text-muted-foreground glass-card border-dashed">
          Aucun étudiant trouvé correspondant à votre recherche.
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
          {filtered.map((s) => (
            <Card key={s.id} className="p-4 sm:p-5 flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 shadow-elegant hover-lift bg-card/60 border-primary/5 group text-center sm:text-left">
              {(() => {
                let displayUrl = s.reference_photo_url;
                if (displayUrl?.startsWith("[")) {
                  try {
                    const parsed = JSON.parse(displayUrl);
                    if (Array.isArray(parsed)) displayUrl = parsed[0];
                  } catch (e) {}
                }
                
                return displayUrl ? (
                  <div className="relative h-24 w-24 flex-shrink-0">
                    <img src={displayUrl} alt={s.full_name} className="h-full w-full rounded-2xl object-cover shadow-md group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-black/10"></div>
                  </div>
                ) : (
                  <div className="h-24 w-24 flex-shrink-0 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground border border-primary/5">
                    <UserCircle2 className="h-12 w-12 opacity-20" />
                  </div>
                );
              })()}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="font-bold text-lg truncate group-hover:text-primary transition-colors">{s.full_name}</div>
                <div className="inline-flex px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wider">{s.matricule}</div>
                <div className="text-xs text-muted-foreground font-medium">{s.filiere} · {s.niveau}</div>
                <div className="text-base font-black text-gradient mt-2">{Number(s.pension_amount).toLocaleString("fr-FR")} XAF</div>
              </div>
              <div className="flex flex-row sm:flex-col justify-center gap-2 flex-shrink-0 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-primary/5">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-primary/60 hover:text-primary hover:bg-primary/10 rounded-full" 
                  onClick={() => {
                    setEditingStudent(s);
                    setOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-destructive/40 hover:text-destructive hover:bg-destructive/10 rounded-full" 
                  onClick={() => onDelete(s.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function StudentForm({ 
  onSuccess, 
  onCreated, 
  initialData, 
  editingStudent 
}: { 
  onSuccess?: (student: Student) => void; 
  onCreated?: () => void; 
  initialData?: { fullName?: string; pension?: string };
  editingStudent?: Student;
}) {
  const [fullName, setFullName] = useState("");
  const [matricule, setMatricule] = useState("");
  const [filiere, setFiliere] = useState("");
  const [niveau, setNiveau] = useState("");
  const [pension, setPension] = useState("");
  const [photos, setPhotos] = useState<(File | null)[]>([null, null]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (editingStudent) {
      setFullName(editingStudent.full_name);
      setMatricule(editingStudent.matricule);
      setFiliere(editingStudent.filiere);
      setNiveau(editingStudent.niveau);
      setPension(editingStudent.pension_amount.toString());
    } else {
      setFullName(initialData?.fullName || "");
      setMatricule("");
      setFiliere("");
      setNiveau("");
      setPension(initialData?.pension || "");
    }
    setPhotos([null, null]);
  }, [editingStudent, initialData]);

  const resizeImage = (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          const MAX = 512;
          if (width > height && width > MAX) { height *= MAX / width; width = MAX; }
          else if (height > MAX) { width *= MAX / height; height = MAX; }
          canvas.width = width;
          canvas.height = height;
          canvas.getContext("2d")?.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.5);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      let finalPhotoUrl = editingStudent?.reference_photo_url || null;
      
      if (photos[0] || photos[1]) {
        const photoUrls: string[] = [];
        for (let i = 0; i < photos.length; i++) {
          const p = photos[i];
          if (p) {
            const resizedBlob = await resizeImage(p);
            const ext = "jpg";
            const path = `references/${crypto.randomUUID()}.${ext}`;
            const { error: upErr } = await supabase.storage.from("student-photos").upload(path, resizedBlob, { upsert: false });
            if (upErr) throw upErr;
            const url = supabase.storage.from("student-photos").getPublicUrl(path).data.publicUrl;
            photoUrls.push(url);
          }
        }
        if (photoUrls.length > 0) {
          finalPhotoUrl = JSON.stringify(photoUrls);
        }
      }

      if (editingStudent) {
        const { data, error } = await supabase
          .from("students")
          .update({
            full_name: fullName,
            normalized_name: normalizeName(fullName),
            matricule,
            filiere,
            niveau,
            pension_amount: Number(pension) || 0,
            reference_photo_url: finalPhotoUrl,
          })
          .eq("id", editingStudent.id)
          .select()
          .single();

        if (error) throw error;
        toast.success("Étudiant modifié");
        if (onSuccess && data) onSuccess(data as Student);
      } else {
        const { data, error } = await supabase
          .from("students")
          .insert({
            full_name: fullName,
            normalized_name: normalizeName(fullName),
            matricule,
            filiere,
            niveau,
            pension_amount: Number(pension) || 0,
            reference_photo_url: finalPhotoUrl,
          })
          .select()
          .single();

        if (error) throw error;
        toast.success("Étudiant inscrit");
        if (onSuccess && data) onSuccess(data as Student);
      }

      if (onCreated) onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label>Nom complet</Label>
        <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="ATYAM MFOU'OU FELECITE BRUNA" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Matricule</Label>
          <Input required value={matricule} onChange={(e) => setMatricule(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Niveau</Label>
          <Input required value={niveau} onChange={(e) => setNiveau(e.target.value)} placeholder="L2" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Filière</Label>
          <Input required value={filiere} onChange={(e) => setFiliere(e.target.value)} placeholder="Génie Informatique" />
        </div>
        <div className="space-y-1.5">
          <Label>Pension due (XAF)</Label>
          <Input required type="number" value={pension} onChange={(e) => setPension(e.target.value)} placeholder="50000" />
        </div>
      </div>
      <div className="space-y-3">
        <Label>Photos de référence {editingStudent ? "(Optionnel - Laisser vide pour conserver)" : "(2 photos requises)"}</Label>
        <div className="grid grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="space-y-2">
              <div 
                className="aspect-square rounded-md border-2 border-dashed flex items-center justify-center bg-muted overflow-hidden relative group cursor-pointer"
                onClick={() => document.getElementById(`photo-${i}`)?.click()}
              >
                {photos[i] ? (
                  <img 
                    src={URL.createObjectURL(photos[i]!)} 
                    className="absolute inset-0 w-full h-full object-cover" 
                    alt={`Preview ${i+1}`}
                  />
                ) : (
                  <Plus className="h-6 w-6 text-muted-foreground group-hover:scale-110 transition-transform" />
                )}
              </div>
              <Input 
                id={`photo-${i}`}
                type="file" 
                accept="image/*" 
                required={!editingStudent}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  const newPhotos = [...photos];
                  newPhotos[i] = file;
                  setPhotos(newPhotos);
                }} 
              />
              <div className="text-[10px] text-center font-medium text-muted-foreground">Angle #{i + 1}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Importez 2 photos sous différents angles (ex: face, profil gauche ou droit).</p>
      </div>
      <Button type="submit" className="w-full" disabled={busy}>{busy ? "Enregistrement…" : editingStudent ? "Modifier" : "Enregistrer"}</Button>
    </form>
  );
}
