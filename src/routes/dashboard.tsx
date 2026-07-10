import { createFileRoute, Navigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, ScanLine, Users, Wallet, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getAcademicYear } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

interface Stats {
  totalStudents: number;
  verifiedToday: number;
  rejectedToday: number;
  totalAmount: number;
}

interface RecentPayment {
  id: string;
  remettant: string;
  amount: number | null;
  status: string;
  face_match: boolean | null;
  captured_photo_url: string | null;
  created_at: string;
  students: { full_name: string; matricule: string } | null;
}

function DashboardPage() {
  const { user, loading } = useAuth();
  if (!loading && !user) return <Navigate to="/login" />;
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Chargement…</div>;
  
  return (
    <AppShell>
      <Dashboard />
    </AppShell>
  );
}

function Dashboard() {
  const [stats, setStats] = useState<Stats>({ totalStudents: 0, verifiedToday: 0, rejectedToday: 0, totalAmount: 0 });
  const [recent, setRecent] = useState<RecentPayment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const iso = today.toISOString();

    const [students, verified, rejected, recentRes] = await Promise.all([
      supabase.from("students").select("id", { count: "exact", head: true }),
      supabase.from("payments").select("amount", { count: "exact" }).eq("status", "verified").gte("created_at", iso),
      supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "rejected").gte("created_at", iso),
      supabase.from("payments").select("id, remettant, amount, status, face_match, captured_photo_url, created_at, students(full_name, matricule)").order("created_at", { ascending: false }).limit(10),
    ]);

    const totalAmount = (verified.data || []).reduce((s, p) => s + Number(p.amount || 0), 0);
    setStats({
      totalStudents: students.count ?? 0,
      verifiedToday: verified.count ?? 0,
      rejectedToday: rejected.count ?? 0,
      totalAmount,
    });
    setRecent((recentRes.data as unknown as RecentPayment[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();

    // Optimisation : Écoute en temps réel des changements sur la table payments
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments'
        },
        () => {
          fetchData(); // Rafraîchit les stats et l'historique dès qu'un changement survient
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const onDeletePayment = async (id: string) => {
    if (!confirm("Supprimer cette vérification de l'historique ?")) return;
    const { error } = await supabase.from("payments").delete().eq("id", id);
    if (error) {
      toast.error("Erreur lors de la suppression");
    } else {
      toast.success("Vérification supprimée");
      fetchData();
    }
  };

  return (
    <div className="space-y-6 lg:space-y-12">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-primary">Tableau de Bord</h1>
          <p className="text-muted-foreground text-base lg:text-xl mt-2">Supervision en temps réel des flux de vérification.</p>
        </div>
        <Link to="/verify" className="flex-shrink-0">
          <Button size="lg" className="shadow-premium animate-in slide-in-from-right-4 duration-500 text-base px-6 py-3 h-auto w-full sm:w-auto">
            <ScanLine className="h-5 w-5 mr-2" />
            Nouvelle Session
          </Button>
        </Link>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-8">
        <StatCard icon={<Users className="h-6 w-6 lg:h-7 lg:w-7 text-primary" />} label="Étudiants Actifs" value={stats.totalStudents} />
        <StatCard icon={<CheckCircle2 className="h-6 w-6 lg:h-7 lg:w-7 text-success" />} label="Identités Validées" value={stats.verifiedToday} />
        <StatCard icon={<XCircle className="h-6 w-6 lg:h-7 lg:w-7 text-destructive" />} label="Tentatives Rejetées" value={stats.rejectedToday} />
        <StatCard icon={<Wallet className="h-6 w-6 lg:h-7 lg:w-7 text-accent" />} label="Volume Financier" value={`${stats.totalAmount.toLocaleString("fr-FR")} XAF`} />
      </div>

      <Card className="p-4 lg:p-8">
        <h2 className="font-semibold text-xl lg:text-2xl text-primary mb-4 lg:mb-6">Vérifications récentes</h2>
        {loading ? (
          <div className="text-muted-foreground text-sm">Chargement…</div>
        ) : recent.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Aucune vérification encore. Lancez la première !
          </div>
        ) : (
          <div>
            {/* Vue mobile: cartes empilées */}
            <div className="md:hidden space-y-4">
              {recent.map((p) => (
                <div key={p.id} className="p-4 bg-muted/30 rounded-xl border border-primary/10 relative">
                  <div className="absolute top-4 right-4">
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">{new Date(p.created_at).toLocaleString("fr-FR")}</div>
                  <div className="mb-3">
                    {p.students ? (
                      <div>
                        <div className="font-semibold text-base">{p.students.full_name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-muted-foreground font-medium">{p.students.matricule}</span>
                          <span className="h-1.5 w-1.5 rounded-full bg-primary/30" />
                          <span className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10">{getAcademicYear(p.created_at)}</span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic">Non identifié</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-sm border-t border-primary/5 pt-3 mt-3">
                    <span className="text-muted-foreground">Montant</span>
                    <span className="font-bold text-foreground">{p.amount ? `${Number(p.amount).toLocaleString("fr-FR")} XAF` : "—"}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-t border-primary/5 pt-3 mt-3">
                    <span className="text-muted-foreground">Visage</span>
                    <span>
                      {p.status === "pending" ? (
                        <span className="text-muted-foreground">—</span>
                      ) : p.face_match ? (
                        <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="h-4 w-4" />OK</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-destructive"><XCircle className="h-4 w-4" />Non</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-end mt-4">
                    <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => onDeletePayment(p.id)}>
                      <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Vue desktop: tableau */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-base whitespace-nowrap">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-4 pr-4 font-semibold">Date</th>
                  <th className="py-4 pr-4 font-semibold">Étudiant</th>
                  <th className="py-4 pr-4 font-semibold">Remettant (reçu)</th>
                  <th className="py-4 pr-4 font-semibold">Montant</th>
                  <th className="py-4 pr-4 font-semibold">Visage</th>
                  <th className="py-4 pr-4 font-semibold">Statut</th>
                  <th className="py-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="py-4 pr-4">{new Date(p.created_at).toLocaleString("fr-FR")}</td>
                    <td className="py-3">
                      {p.students ? (
                        <div>
                          <div className="font-semibold text-base">{p.students.full_name}</div>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-sm text-muted-foreground font-medium">{p.students.matricule}</span>
                            <span className="h-1.5 w-1.5 rounded-full bg-primary/30" />
                            <span className="text-[11px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10">{getAcademicYear(p.created_at)}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">Non identifié</span>
                      )}
                    </td>
                    <td className="py-4 pr-4">{p.remettant}</td>
                    <td className="py-4 pr-4 font-medium">{p.amount ? `${Number(p.amount).toLocaleString("fr-FR")} XAF` : "—"}</td>
                    <td className="py-3">
                      {p.status === "pending" ? (
                        <span className="text-muted-foreground">—</span>
                      ) : p.face_match ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="h-4 w-4" />OK</span>
                          {p.captured_photo_url && (
                            <img src={p.captured_photo_url} className="h-8 w-8 rounded object-cover border" alt="Capture" />
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-destructive"><XCircle className="h-4 w-4" />Non</span>
                          {p.captured_photo_url && (
                            <img src={p.captured_photo_url} className="h-8 w-8 rounded object-cover border opacity-50" alt="Capture" />
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-4 pr-4"><StatusBadge status={p.status} /></td>
                    <td className="py-4 text-right">
                       <Button 
                         variant="ghost" 
                         size="icon" 
                         className="text-destructive hover:bg-destructive/10"
                         onClick={() => onDeletePayment(p.id)}
                       >
                         <Trash2 className="h-4 w-4" />
                       </Button>
                     </td>
                  </tr>
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

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <Card className="p-4 lg:p-8 hover-lift border-primary/5 bg-card/50 backdrop-blur-md">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 lg:space-y-2 min-w-0">
          <p className="text-[10px] lg:text-base font-bold text-muted-foreground uppercase tracking-wider leading-tight">{label}</p>
          <div className="text-xl lg:text-4xl font-black tracking-tight truncate">{value}</div>
        </div>
        <div className="h-10 w-10 lg:h-14 lg:w-14 rounded-xl lg:rounded-2xl bg-primary/5 flex items-center justify-center border border-primary/10 flex-shrink-0">
          {icon}
        </div>
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    verified: { label: "Validé", cls: "bg-success/15 text-success" },
    rejected: { label: "Rejeté", cls: "bg-destructive/15 text-destructive" },
    pending: { label: "En attente", cls: "bg-muted text-muted-foreground" },
  };
  const m = map[status] || map.pending;
  return <span className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${m.cls}`}>{m.label}</span>;
}
