import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  FileSpreadsheet, Download, Upload, FileDown, Loader2, CheckCircle2,
  Layers, GraduationCap, Users, FileText, ChevronRight, Table2,
} from "lucide-react";
import {
  type ScolariteStudent, type ParsedSheet,
  downloadNiveau, downloadTemplate, parseWorkbook, toDbInsert, splitFullName,
} from "@/lib/scolariteExcel";

export const Route = createFileRoute("/import-export")({
  component: ImportExportPage,
});

// Convertit une ligne brute de la table students en ScolariteStudent
function dbToScolarite(r: Record<string, unknown>): ScolariteStudent {
  const full = String(r.full_name ?? "");
  const fallback = splitFullName(full);
  return {
    id: r.id as string,
    matricule: String(r.matricule ?? ""),
    nom: (r.nom as string) ?? fallback.nom ?? null,
    prenom: (r.prenom as string) ?? fallback.prenom ?? null,
    full_name: full,
    date_naissance: (r.date_naissance as string) ?? null,
    age: r.age == null ? null : Number(r.age),
    lieu_naissance: (r.lieu_naissance as string) ?? null,
    sexe: (r.sexe as string) ?? null,
    nationalite: (r.nationalite as string) ?? null,
    region: (r.region as string) ?? null,
    langue: (r.langue as string) ?? null,
    departement: (r.departement as string) ?? null,
    bac_serie: (r.bac_serie as string) ?? null,
    telephone: (r.telephone as string) ?? null,
    situation_matrimoniale: (r.situation_matrimoniale as string) ?? null,
    du1: Number(r.du1 ?? 0),
    du2: Number(r.du2 ?? 0),
    cas_social: Boolean(r.cas_social),
    filiere: String(r.filiere ?? ""),
    niveau: String(r.niveau ?? ""),
  };
}

function ImportExportPage() {
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
  const [students, setStudents] = useState<ScolariteStudent[]>([]);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    supabase
      .from("students")
      .select("*")
      .then(({ data }) => setStudents(((data as Record<string, unknown>[]) || []).map(dbToScolarite)));
  }, [reload]);

  const niveaux = useMemo(
    () => [...new Set(students.map((s) => s.niveau).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr")),
    [students],
  );
  const filieres = useMemo(() => new Set(students.map((s) => s.filiere).filter(Boolean)), [students]);

  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white">Import / Export Excel</h1>
            <p className="text-muted-foreground text-lg mt-0.5">
              Synchronisez la base étudiants avec les fichiers Excel de la scolarité.
            </p>
          </div>
        </div>
      </header>

      {/* Aperçu chiffré */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={<Users className="h-5 w-5" />} label="Étudiants en base" value={students.length} />
        <StatCard icon={<Layers className="h-5 w-5" />} label="Niveaux" value={niveaux.length} />
        <StatCard icon={<GraduationCap className="h-5 w-5" />} label="Filières" value={filieres.size} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExportPanel students={students} niveaux={niveaux} />
        <ImportPanel niveaux={niveaux} onImported={() => setReload((x) => x + 1)} />
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="p-5 glass-card border-primary/10 flex items-center gap-4">
      <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div>
        <div className="text-2xl font-black text-gradient tabular-nums">{value}</div>
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// EXPORT
// ---------------------------------------------------------------------------
function ExportPanel({ students, niveaux }: { students: ScolariteStudent[]; niveaux: string[] }) {
  const [niveau, setNiveau] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!niveau && niveaux.length) setNiveau(niveaux[0]);
  }, [niveaux, niveau]);

  const countForNiveau = students.filter((s) => s.niveau === niveau).length;
  const filieresForNiveau = new Set(students.filter((s) => s.niveau === niveau).map((s) => s.filiere)).size;

  const exportOne = () => {
    const rows = students.filter((s) => s.niveau === niveau);
    if (!rows.length) return toast.error("Aucun étudiant pour ce niveau.");
    downloadNiveau(niveau, rows);
    toast.success(`Fichier « NIVEAU ${niveau} » généré (${filieresForNiveau} filière(s)).`);
  };

  const exportAll = async () => {
    if (!niveaux.length) return toast.error("Aucune donnée à exporter.");
    setBusy(true);
    try {
      for (const n of niveaux) {
        downloadNiveau(n, students.filter((s) => s.niveau === n));
        await new Promise((r) => setTimeout(r, 400)); // laisse le navigateur enchaîner les téléchargements
      }
      toast.success(`${niveaux.length} fichier(s) exporté(s).`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6 glass-card border-primary/10 space-y-5 flex flex-col">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <Download className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Exporter vers Excel</h2>
          <p className="text-sm text-muted-foreground">Un fichier par niveau · une feuille par filière.</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="exp-niveau">Niveau à exporter</Label>
        <select
          id="exp-niveau"
          value={niveau}
          onChange={(e) => setNiveau(e.target.value)}
          className="w-full h-12 rounded-xl bg-card/60 border border-primary/10 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          {niveaux.length === 0 && <option value="">— Aucun niveau en base —</option>}
          {niveaux.map((n) => (
            <option key={n} value={n} className="bg-slate-900">Niveau {n}</option>
          ))}
        </select>
        {niveau && (
          <p className="text-xs text-muted-foreground">
            {countForNiveau} étudiant(s) · {filieresForNiveau} filière(s) → {filieresForNiveau} feuille(s).
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2.5 mt-auto pt-2">
        <Button size="lg" onClick={exportOne} disabled={!niveau || busy} className="shadow-premium">
          <FileDown className="h-5 w-5 mr-2" />
          Exporter le niveau {niveau}
        </Button>
        <div className="flex gap-2.5">
          <Button variant="secondary" className="flex-1" onClick={exportAll} disabled={busy || !niveaux.length}>
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Layers className="h-4 w-4 mr-2" />}
            Tous les niveaux
          </Button>
          <Button variant="secondary" className="flex-1" onClick={() => downloadTemplate()}>
            <FileText className="h-4 w-4 mr-2" />
            Modèle vierge
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// IMPORT
// ---------------------------------------------------------------------------
function ImportPanel({ niveaux, onImported }: { niveaux: string[]; onImported: () => void }) {
  const [niveau, setNiveau] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedSheet[] | null>(null);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);

  // (Re)lecture du fichier dès qu'un fichier ET un niveau sont disponibles
  useEffect(() => {
    if (!file || !niveau.trim()) { setParsed(null); return; }
    let cancelled = false;
    setParsing(true);
    parseWorkbook(file, niveau)
      .then((res) => { if (!cancelled) setParsed(res); })
      .catch(() => { if (!cancelled) { setParsed(null); toast.error("Fichier illisible ou format inattendu."); } })
      .finally(() => { if (!cancelled) setParsing(false); });
    return () => { cancelled = true; };
  }, [file, niveau]);

  const allStudents = useMemo(() => (parsed ? parsed.flatMap((p) => p.students) : []), [parsed]);

  const doImport = async () => {
    if (!allStudents.length) return;
    setSaving(true);
    try {
      const rows = allStudents.map(toDbInsert);
      let ok = 0;
      for (let i = 0; i < rows.length; i += 200) {
        const chunk = rows.slice(i, i + 200);
        const { error } = await supabase.from("students").upsert(chunk, { onConflict: "matricule" });
        if (error) throw error;
        ok += chunk.length;
      }
      toast.success(`${ok} étudiant(s) importé(s) / mis à jour (niveau ${niveau}).`);
      setFile(null); setParsed(null);
      onImported();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de l'importation.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6 glass-card border-primary/10 space-y-5 flex flex-col">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-accent/15 text-accent flex items-center justify-center">
          <Upload className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Importer un fichier</h2>
          <p className="text-sm text-muted-foreground">Chaque feuille est chargée comme une filière.</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="imp-niveau">Niveau du fichier <span className="text-destructive">*</span></Label>
        <Input
          id="imp-niveau"
          list="niveaux-existants"
          value={niveau}
          onChange={(e) => setNiveau(e.target.value)}
          placeholder="ex. L1, L2, M1…"
          className="h-12 rounded-xl bg-card/60 border-primary/10"
        />
        <datalist id="niveaux-existants">
          {niveaux.map((n) => <option key={n} value={n} />)}
        </datalist>
        <p className="text-xs text-muted-foreground">Ce niveau sera appliqué à toutes les feuilles du fichier.</p>
      </div>

      <label
        className={`relative block rounded-2xl border-2 border-dashed p-6 text-center transition-colors cursor-pointer ${
          niveau.trim() ? "border-accent/30 bg-accent/5 hover:bg-accent/10" : "border-border/40 opacity-60 cursor-not-allowed"
        }`}
      >
        <input
          type="file"
          accept=".xlsx,.xls"
          disabled={!niveau.trim()}
          className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <div className="mx-auto h-12 w-12 rounded-full bg-accent/15 text-accent flex items-center justify-center mb-2">
          {parsing ? <Loader2 className="h-6 w-6 animate-spin" /> : <FileSpreadsheet className="h-6 w-6" />}
        </div>
        <div className="text-sm font-semibold">{file ? file.name : "Choisir un fichier .xlsx"}</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {niveau.trim() ? "Cliquez ou déposez votre fichier ici" : "Renseignez d'abord le niveau"}
        </div>
      </label>

      {parsed && (
        <div className="space-y-3">
          <div className="rounded-xl border border-primary/10 overflow-hidden">
            <div className="px-4 py-2 bg-secondary/40 text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Table2 className="h-4 w-4" /> Feuilles détectées
            </div>
            <div className="divide-y divide-border/40 max-h-48 overflow-y-auto">
              {parsed.map((p) => (
                <div key={p.filiere} className="px-4 py-2.5 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    <ChevronRight className="h-4 w-4 text-primary/50" />{p.filiere}
                  </span>
                  <span className="text-muted-foreground tabular-nums">{p.students.length} étudiant(s)</span>
                </div>
              ))}
              {parsed.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Aucune feuille conforme (colonne « Matricule » introuvable).
                </div>
              )}
            </div>
          </div>

          <Button
            size="lg"
            onClick={doImport}
            disabled={saving || allStudents.length === 0}
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90 shadow-premium"
          >
            {saving ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <CheckCircle2 className="h-5 w-5 mr-2" />}
            Charger {allStudents.length} étudiant(s) dans la base
          </Button>
        </div>
      )}
    </Card>
  );
}
