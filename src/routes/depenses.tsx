import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo, Fragment } from "react";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  Search,
  UserCircle2,
  TrendingUp,
  Wallet,
  Filter,
} from "lucide-react";

export const Route = createFileRoute("/depenses")({
  component: DepensesPage,
});

interface Payment {
  id: string;
  remettant: string;
  amount: number | null;
  status: string;
  face_match: boolean;
  confidence_score: number | null;
  face_analysis: string | null;
  client_name: string | null;
  account_number: string | null;
  captured_photo_url: string | null;
  created_at: string;
  students: { full_name: string; matricule: string; filiere: string; niveau: string } | null;
}

const STATUS_OPTIONS = ["tous", "verified", "rejected", "pending"] as const;
type StatusFilter = (typeof STATUS_OPTIONS)[number];

function DepensesPage() {
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
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("tous");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    supabase
      .from("payments")
      .select(
        "id, remettant, amount, status, face_match, confidence_score, face_analysis, client_name, account_number, captured_photo_url, created_at, students(full_name, matricule, filiere, niveau)"
      )
      .order("created_at", { ascending: false })
      .limit(500)
      .then(({ data }) => {
        setPayments((data as unknown as Payment[]) || []);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return payments.filter((p) => {
      const matchStatus = statusFilter === "tous" || p.status === statusFilter;
      const matchSearch =
        !q ||
        p.remettant?.toLowerCase().includes(q) ||
        p.students?.full_name?.toLowerCase().includes(q) ||
        p.students?.matricule?.toLowerCase().includes(q) ||
        p.client_name?.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [payments, search, statusFilter]);

  // Aggregate stats
  const stats = useMemo(() => {
    const verified = payments.filter((p) => p.status === "verified");
    const rejected = payments.filter((p) => p.status === "rejected");
    const pending = payments.filter((p) => p.status === "pending");
    const totalAmount = verified.reduce((s, p) => s + Number(p.amount || 0), 0);
    return { verified: verified.length, rejected: rejected.length, pending: pending.length, totalAmount };
  }, [payments]);

  const exportCSV = () => {
    const headers = ["Date", "Étudiant", "Matricule", "Remettant", "Montant (XAF)", "Correspondance visage", "Statut"];
    const rows = filtered.map((p) => [
      new Date(p.created_at).toLocaleString("fr-FR"),
      p.students?.full_name ?? "—",
      p.students?.matricule ?? "—",
      p.remettant,
      p.amount ?? "",
      p.face_match ? "Oui" : "Non",
      p.status,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `depenses_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="space-y-10">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">Audit des Paiements</h1>
          <p className="text-muted-foreground text-base sm:text-lg mt-1">
            Traçabilité complète et historique des vérifications biométriques.
          </p>
        </div>
        <Button variant="outline" size="lg" className="w-full sm:w-auto rounded-xl border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-all duration-300" onClick={exportCSV} disabled={filtered.length === 0}>
          <Download className="h-5 w-5 mr-2" />
          Exporter l'Audit
        </Button>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard
          icon={<Wallet className="h-6 w-6 text-primary" />}
          label="Flux de Trésorerie"
          value={`${stats.totalAmount.toLocaleString("fr-FR")} XAF`}
          colorClass="bg-primary/10"
        />
        <SummaryCard
          icon={<CheckCircle2 className="h-6 w-6 text-success" />}
          label="Validations Réussies"
          value={stats.verified}
          colorClass="bg-success/10"
        />
        <SummaryCard
          icon={<XCircle className="h-6 w-6 text-destructive" />}
          label="Tentatives Rejetées"
          value={stats.rejected}
          colorClass="bg-destructive/10"
        />
        <SummaryCard
          icon={<Clock className="h-6 w-6 text-muted-foreground" />}
          label="Sessions en Suspens"
          value={stats.pending}
          colorClass="bg-muted"
        />
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1 w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher étudiant, remettant…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-full"
            />
          </div>
          <div className="flex overflow-x-auto pb-2 sm:pb-0 sm:flex-wrap items-center gap-2 mt-3 sm:mt-0 w-full sm:w-auto hide-scrollbar">
            <Filter className="h-4 w-4 text-muted-foreground mr-1 hidden sm:block shrink-0" />
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex-1 sm:flex-none text-center ${
                  statusFilter === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {s === "tous" ? "Tous" : s === "verified" ? "Validé" : s === "rejected" ? "Rejeté" : "En attente"}
              </button>
            ))}
          </div>
          <div className="text-sm text-muted-foreground ml-auto">
            {filtered.length} résultat{filtered.length !== 1 ? "s" : ""}
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="py-24 text-center text-muted-foreground">
            <TrendingUp className="h-8 w-8 mx-auto mb-3 opacity-40 animate-pulse" />
            Chargement des données…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 text-center text-muted-foreground">
            <Wallet className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Aucun paiement trouvé.</p>
            <p className="text-sm mt-1">Lancez une vérification pour en voir apparaître ici.</p>
          </div>
        ) : (
          <div>
            {/* Vue Mobile : Cartes empilées */}
            <div className="md:hidden space-y-4 p-4">
              {filtered.map((p) => (
                <div key={p.id} className="bg-muted/20 p-4 rounded-xl border border-primary/5 relative space-y-3" onClick={() => setExpanded(expanded === p.id ? null : p.id)}>
                  <div className="absolute top-4 right-4">
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString("fr-FR")}</div>
                  <div>
                    {p.students ? (
                      <div>
                        <div className="font-bold">{p.students.full_name}</div>
                        <div className="text-xs text-muted-foreground">{p.students.matricule}</div>
                      </div>
                    ) : (
                      <span className="italic text-muted-foreground flex items-center gap-1"><UserCircle2 className="h-4 w-4" />Non identifié</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-sm border-t border-primary/5 pt-2">
                    <span className="text-muted-foreground">Montant</span>
                    <span className="font-bold">{p.amount != null ? `${Number(p.amount).toLocaleString("fr-FR")} XAF` : "—"}</span>
                  </div>
                  {expanded === p.id && (
                    <div className="pt-3 mt-3 border-t border-primary/10 space-y-4 animate-in fade-in duration-300">
                      <div>
                        <div className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Photo capturée</div>
                        {p.captured_photo_url ? (
                          <img src={p.captured_photo_url} className="h-24 w-24 rounded-lg object-cover border" alt="Capture" />
                        ) : (
                          <div className="h-24 w-24 rounded-lg bg-muted flex items-center justify-center text-muted-foreground"><UserCircle2 className="h-8 w-8" /></div>
                        )}
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Détails du reçu</div>
                        <div className="text-xs space-y-1">
                          <div className="flex justify-between"><span className="text-muted-foreground">Remettant</span><span>{p.remettant}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Compte</span><span>{p.account_number || "—"}</span></div>
                        </div>
                      </div>
                      <div>
                         <div className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Analyse IA</div>
                         <p className="text-xs italic text-muted-foreground">"{p.face_analysis || "Aucune analyse"}"</p>
                      </div>
                    </div>
                  )}
                  <div className="text-center text-muted-foreground text-[10px] pt-1">
                    {expanded === p.id ? "▲ Réduire" : "▼ Détails"}
                  </div>
                </div>
              ))}
            </div>

            {/* Vue Desktop : Tableau */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="text-left text-muted-foreground border-b bg-muted/40">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Étudiant</th>
                  <th className="px-4 py-3 font-medium">Remettant (reçu)</th>
                  <th className="px-4 py-3 font-medium text-right">Montant</th>
                  <th className="px-4 py-3 font-medium text-center">Visage</th>
                  <th className="px-4 py-3 font-medium text-center">Confiance</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <Fragment key={p.id}>
                    <tr
                      key={p.id}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {new Date(p.created_at).toLocaleString("fr-FR")}
                      </td>
                      <td className="px-4 py-3">
                        {p.students ? (
                          <div>
                            <div className="font-medium">{p.students.full_name}</div>
                            <div className="text-xs text-muted-foreground">{p.students.matricule}</div>
                          </div>
                        ) : (
                          <span className="italic text-muted-foreground flex items-center gap-1">
                            <UserCircle2 className="h-4 w-4" />Non identifié
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium">{p.remettant}</td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {p.amount != null ? `${Number(p.amount).toLocaleString("fr-FR")} XAF` : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {p.face_match ? (
                          <CheckCircle2 className="h-4 w-4 text-success mx-auto" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive mx-auto" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {p.confidence_score != null ? (
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              p.confidence_score >= 80
                                ? "bg-success/15 text-success"
                                : p.confidence_score >= 50
                                ? "bg-yellow-500/15 text-yellow-600"
                                : "bg-destructive/15 text-destructive"
                            }`}
                          >
                            {p.confidence_score}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                        {expanded === p.id ? "▲" : "▼"}
                      </td>
                    </tr>
                    {expanded === p.id && (
                      <tr key={`${p.id}-detail`} className="bg-muted/20">
                        <td colSpan={8} className="px-6 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Photo capturée */}
                            <div>
                              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                                Photo capturée
                              </div>
                              {p.captured_photo_url ? (
                                <img
                                  src={p.captured_photo_url}
                                  alt="Photo capturée"
                                  className="h-32 w-32 rounded-lg object-cover border"
                                />
                              ) : (
                                <div className="h-32 w-32 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                                  <UserCircle2 className="h-10 w-10" />
                                </div>
                              )}
                            </div>
                            {/* Infos reçu */}
                            <div>
                              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                                Détails du reçu
                              </div>
                              <dl className="space-y-1 text-sm">
                                <InfoRow label="Client" value={p.client_name} />
                                <InfoRow label="N° compte" value={p.account_number} />
                                <InfoRow label="Remettant" value={p.remettant} />
                                <InfoRow
                                  label="Montant"
                                  value={p.amount != null ? `${Number(p.amount).toLocaleString("fr-FR")} XAF` : null}
                                />
                              </dl>
                            </div>
                            {/* Analyse IA */}
                            <div>
                              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                                Analyse IA
                              </div>
                              <p className="text-sm italic text-muted-foreground leading-relaxed">
                                "{p.face_analysis || "Aucune analyse disponible."}"
                              </p>
                              {p.students && (
                                <div className="mt-3 text-xs text-muted-foreground">
                                  <span className="font-medium text-foreground">{p.students.filiere}</span>{" "}
                                  · {p.students.niveau}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  colorClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  colorClass: string;
}) {
  return (
    <Card className="p-6 hover-lift border-primary/5 bg-card/50 backdrop-blur-md">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0">
          <p className="text-xs sm:text-sm font-bold text-muted-foreground uppercase tracking-wider leading-tight">{label}</p>
          <div className="text-xl sm:text-3xl font-black tracking-tight truncate">{value}</div>
        </div>
        <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl flex-shrink-0 ${colorClass} flex items-center justify-center border border-primary/10 shadow-sm`}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-right">{value || "—"}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    verified: { label: "Validé", cls: "bg-success/15 text-success" },
    rejected: { label: "Rejeté", cls: "bg-destructive/15 text-destructive" },
    pending: { label: "En attente", cls: "bg-muted text-muted-foreground" },
  };
  const m = map[status] || map.pending;
  return <span className={`px-2 py-1 rounded-md text-xs font-medium ${m.cls}`}>{m.label}</span>;
}
