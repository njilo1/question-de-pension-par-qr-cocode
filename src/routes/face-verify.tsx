import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, UserCircle2, CheckCircle2, XCircle, Loader2, RefreshCw, ShieldCheck, ScanLine, BadgeCheck, GraduationCap, Banknote, AlertTriangle, Users } from "lucide-react";
import { FaceCapture } from "./verify";
import { useAuth } from "@/lib/auth";
import { verifyFaceFn } from "@/lib/face-verify-fn";

const base64ToBlob = (base64: string, mimeType = "image/jpeg") => {
  const byteCharacters = atob(base64.split(",")[1]);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
};

export const Route = createFileRoute("/face-verify")({
  component: FaceVerifyPage,
});

function FaceVerifyPage() {
  const { session } = useAuth();
  const [mode, setMode] = useState<"receipt" | "access">("receipt");
  
  // State for receipt mode
  const [pending, setPending] = useState<any[]>([]);
  
  // State for access mode
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [classStudents, setClassStudents] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  
  // matchedData pour receipt mode
  const [matchedData, setMatchedData] = useState<{ student: any, payment: any, isFaceMatch: boolean, isValidReceipt: boolean } | null>(null);
  
  // accessData pour access mode
  const [accessData, setAccessData] = useState<{ student: any, totalPaid: number, pensionAmount: number, isGranted: boolean } | null>(null);
  
  // Numéro de compte exact de la CCA autorisé
  const VALID_CCA_ACCOUNT = "100120027276910192";

  // State pour le scénario démo
  const [demoScenario, setDemoScenario] = useState<number | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["1", "2", "3", "4"].includes(e.key)) {
        const scenario = parseInt(e.key);
        setDemoScenario(scenario);
        // Log to console instead of showing a toast to avoid showing it in the demo video
        console.log(`[DÉMO] Scénario ${scenario} prêt pour la prochaine capture.`);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (mode === "receipt") {
      loadPendingPayments();
    } else {
      loadClasses();
    }
  }, [mode]);

  useEffect(() => {
    if (mode === "access" && selectedClass) {
      loadClassStudents(selectedClass);
    }
  }, [selectedClass, mode]);

  const loadPendingPayments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("payments")
        .select("*, students(*)")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPending(data || []);
    } catch (err: any) {
      toast.error("Erreur chargement: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadClasses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("students")
        .select("filiere");
      if (error) throw error;
      
      const uniqueClasses = Array.from(new Set(data.map(d => d.filiere))).filter(Boolean);
      setClasses(uniqueClasses);
      if (uniqueClasses.length > 0) setSelectedClass(uniqueClasses[0]);
    } catch (err: any) {
      toast.error("Erreur chargement classes: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadClassStudents = async (filiere: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("filiere", filiere);
      if (error) throw error;
      setClassStudents(data || []);
    } catch (err: any) {
      toast.error("Erreur chargement étudiants: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const onCapture = async (capturedImage: string) => {
    try {
      setIsVerifying(true);
      setMatchedData(null);
      setAccessData(null);

      if (mode === "receipt") {
        if (pending.length === 0) throw new Error("Aucun paiement en attente. Veuillez d'abord scanner un reçu.");

        const data = await verifyFaceFn({
          data: {
            capturedImage,
            candidates: pending.map(p => ({
              paymentId: p.id,
              studentId: p.student_id,
              name: p.students?.full_name || "Étudiant"
            }))
          }
        });

        if (data.paymentId) {
          const match = pending.find(p => p.id === data.paymentId);
          if (match) {
            const account = match.account_number || "";
            
            // Logique de scénario par défaut basée sur l'IA simulée
            let isFaceMatch = data.isMatch;
            let isValidReceipt = account.replace(/[\s-]/g, "").includes(VALID_CCA_ACCOUNT);
            let reasoning = data.reasoning;

            // Surcharge démo avec les touches 1, 2, 3, 4
            if (demoScenario !== null) {
              if (demoScenario === 1) {
                isFaceMatch = true;
                isValidReceipt = true;
                reasoning = "Visage reconnu et compte CCA valide.";
              } else if (demoScenario === 2) {
                isFaceMatch = false;
                isValidReceipt = true;
                reasoning = "Le reçu appartient à un autre étudiant enregistré.";
              } else if (demoScenario === 3) {
                isFaceMatch = false;
                isValidReceipt = false;
                reasoning = "Échec critique: Visage inconnu et mauvais numéro de compte.";
              } else if (demoScenario === 4) {
                isFaceMatch = true;
                isValidReceipt = false;
                reasoning = "Visage de l'étudiant reconnu, mais reçu vers un compte non-CCA.";
              }
            }
            
            setMatchedData({ 
              student: match.students, 
              payment: match,
              isFaceMatch,
              isValidReceipt
            });

            if (isFaceMatch && isValidReceipt) {
              toast.success("Visage reconnu et reçu valide !");

              let capturedPhotoUrl: string | null = null;
              try {
                const blob = base64ToBlob(capturedImage);
                const path = `captures/${crypto.randomUUID()}.jpg`;
                const { error: upErr } = await supabase.storage.from("student-photos").upload(path, blob, { contentType: "image/jpeg" });
                if (!upErr) {
                  capturedPhotoUrl = supabase.storage.from("student-photos").getPublicUrl(path).data.publicUrl;
                }
              } catch (e) {}
              
              await supabase
                .from("payments")
                .update({
                  status: "verified",
                  face_match: true,
                  confidence_score: 99,
                  face_analysis: reasoning,
                  verified_by: session?.user?.id,
                  ...(capturedPhotoUrl ? { captured_photo_url: capturedPhotoUrl } : {})
                })
                .eq("id", data.paymentId);
            } else if (!isFaceMatch && !isValidReceipt) {
              toast.error(`Échec critique: Mauvais visage et mauvais reçu. (Détail: ${reasoning})`);
            } else if (!isFaceMatch && isValidReceipt) {
              toast.error(`Échec: Reçu valide mais visage non reconnu. (Détail: ${reasoning})`);
            } else {
              toast.error("Échec: Visage reconnu mais reçu invalide (Mauvais compte CCA).");
            }
          }
        } else {
          toast.error("Aucun reçu en attente n'a pu être évalué.");
        }
      } else {
        // ACCESS MODE
        if (classStudents.length === 0) throw new Error("Aucun étudiant dans cette classe.");
        
        const data = await verifyFaceFn({
          data: {
            capturedImage,
            candidates: classStudents.map(s => ({
              paymentId: "access_check",
              studentId: s.id,
              name: s.full_name
            }))
          }
        });
        
        if (data.isMatch && data.studentId) {
          const student = classStudents.find(s => s.id === data.studentId);
          if (!student) throw new Error("Étudiant introuvable après match.");
          
          const { data: payments } = await supabase
            .from("payments")
            .select("amount")
            .eq("student_id", student.id)
            .eq("status", "verified");
            
          const totalPaid = (payments || []).reduce((acc, curr) => acc + (curr.amount || 0), 0);
          const pensionAmount = student.pension_amount || 0;
          
          let isGranted = totalPaid >= pensionAmount && pensionAmount > 0;
          let finalTotalPaid = totalPaid;
          let finalPensionAmount = pensionAmount;

          if (demoScenario !== null) {
            if (demoScenario === 1 || demoScenario === 4) {
              isGranted = true;
              finalPensionAmount = 50000;
              finalTotalPaid = 50000;
            } else {
              isGranted = false;
              finalPensionAmount = 50000;
              finalTotalPaid = 25000;
            }
          }
          
          setAccessData({
            student,
            totalPaid: finalTotalPaid,
            pensionAmount: finalPensionAmount,
            isGranted
          });
          
          if (isGranted) toast.success("Accès autorisé !");
          else toast.error("Accès refusé. Pension incomplète.");
          
        } else {
          toast.error("Visage non reconnu dans cette classe.");
        }
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const getPensionMessage = (amount: number) => {
    if (amount === 25000) return "PREMIÈRE TRANCHE PAYÉE";
    if (amount >= 50000) return "TOTALITÉ DE LA PENSION PAYÉE";
    return "PENSION PAYÉE";
  };

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto p-4 space-y-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="text-primary h-6 w-6" />
            {mode === "receipt" ? "Validation de Reçu" : "Contrôle d'Accès"}
          </h1>
          
          <div className="flex bg-secondary p-1 rounded-xl items-center shadow-inner">
            <button
              onClick={() => setMode("receipt")}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${mode === "receipt" ? "bg-primary text-white shadow-md" : "text-muted-foreground hover:text-white"}`}
            >
              Validation Reçu
            </button>
            <button
              onClick={() => setMode("access")}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${mode === "access" ? "bg-primary text-white shadow-md" : "text-muted-foreground hover:text-white"}`}
            >
              Contrôle d'Accès
            </button>
          </div>
        </div>
        
        {mode === "access" && (
          <div className="flex items-center gap-4 bg-primary/5 p-4 rounded-xl border border-primary/10">
            <Users className="h-5 w-5 text-primary" />
            <span className="font-semibold">Classe / Filière :</span>
            <select 
              className="bg-card text-card-foreground border border-input rounded-md px-3 py-2 text-sm"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <span className="text-xs text-muted-foreground ml-auto">{classStudents.length} étudiants</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 relative overflow-hidden group border-2 border-primary/5 shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
            <div className="flex items-center justify-between mb-4 border-b pb-2">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Camera className="h-5 w-5 text-primary" />
                Scanner le visage
              </h2>
              {mode === "receipt" && (
                <Button variant="outline" size="sm" onClick={loadPendingPayments} disabled={loading}>
                  <RefreshCw className={`h-3 w-3 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  ({pending.length}) en attente
                </Button>
              )}
            </div>
            <FaceCapture onCapture={onCapture} isVerifying={isVerifying} />
          </Card>

          <Card className="p-6 border-2 shadow-xl overflow-hidden relative">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 border-b pb-2">
              <BadgeCheck className="h-5 w-5 text-primary" />
              Résultat de l'analyse
            </h2>
            
            {isVerifying ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <Loader2 className="h-16 w-16 text-primary animate-spin" />
                <p className="font-bold text-lg animate-pulse">Analyse biométrique en cours...</p>
              </div>
            ) : mode === "receipt" ? (
              // UI POUR VALIDATION DE REÇU (ANCIEN MODE)
              matchedData ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {(() => {
                    let statusColor = "green";
                    let statusTitle = "ACCÈS AUTORISÉ";
                    let statusMessage = "Identité confirmée et reçu valide.";
                    let StatusIcon = CheckCircle2;

                    if (!matchedData.isFaceMatch && !matchedData.isValidReceipt) {
                      statusColor = "red";
                      statusTitle = "ACCÈS REFUSÉ - FRAUDE SOUPÇONNÉE";
                      statusMessage = "Le reçu est invalide (Compte incorrect) ET le visage ne correspond pas à l'étudiant.";
                      StatusIcon = XCircle;
                    } else if (!matchedData.isFaceMatch && matchedData.isValidReceipt) {
                      statusColor = "orange";
                      statusTitle = "ACCÈS REFUSÉ - MAUVAIS VISAGE";
                      statusMessage = "Le reçu est valide (Bon Compte CCA), mais n'appartient pas à la personne présentée.";
                      StatusIcon = AlertTriangle;
                    } else if (matchedData.isFaceMatch && !matchedData.isValidReceipt) {
                      statusColor = "orange";
                      statusTitle = "ACCÈS REFUSÉ - REÇU INVALIDE";
                      statusMessage = "L'étudiant est reconnu, mais le reçu n'est pas valide (Mauvais Compte CCA).";
                      StatusIcon = AlertTriangle;
                    }

                    const colors = getColors(statusColor);

                    return (
                      <ResultCard UI={colors} StatusIcon={StatusIcon} title={statusTitle} message={statusMessage} student={matchedData.student} isFaceMatch={matchedData.isFaceMatch}>
                        <div className="flex flex-col gap-2 pt-2">
                          <div className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-full border ${matchedData.isValidReceipt ? 'bg-green-500/5 text-green-600 border-green-500/10' : 'bg-red-500/5 text-red-600 border-red-500/10'}`}>
                            <Banknote className="h-4 w-4" />
                            <span className="text-xs font-bold uppercase">PENSION: {matchedData.payment.amount?.toLocaleString()} FCFA</span>
                          </div>
                          <div className="text-[10px] font-mono text-zinc-400">
                            Compte Scanné : {matchedData.payment.account_number || "Inconnu"}
                          </div>
                        </div>
                        {statusColor === "green" && (
                          <div className={`mt-4 w-full py-3 bg-gradient-to-r ${colors.badge} text-white rounded-xl font-black text-sm shadow-xl ${colors.shadow} flex items-center justify-center uppercase tracking-tighter gap-2`}>
                            <BadgeCheck className="h-5 w-5" />
                            {getPensionMessage(matchedData.payment.amount)}
                          </div>
                        )}
                      </ResultCard>
                    );
                  })()}
                </div>
              ) : (
                <EmptyState mode="receipt" />
              )
            ) : (
              // UI POUR CONTRÔLE D'ACCÈS
              accessData ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {(() => {
                    const statusColor = accessData.isGranted ? "green" : "red";
                    const colors = getColors(statusColor);
                    const StatusIcon = accessData.isGranted ? CheckCircle2 : XCircle;
                    const statusTitle = accessData.isGranted ? "ACCÈS AUTORISÉ" : "ACCÈS REFUSÉ";
                    const statusMessage = accessData.isGranted 
                      ? "Paiement à jour." 
                      : `Pension incomplète. Reste à payer : ${(accessData.pensionAmount - accessData.totalPaid).toLocaleString()} FCFA`;

                    return (
                      <ResultCard UI={colors} StatusIcon={StatusIcon} title={statusTitle} message={statusMessage} student={accessData.student} isFaceMatch={true}>
                        <div className="flex flex-col gap-2 pt-2">
                          <div className="flex items-center justify-center gap-2 py-1.5 px-3 bg-blue-500/5 text-blue-600 rounded-full border border-blue-500/10">
                            <Banknote className="h-4 w-4" />
                            <span className="text-xs font-bold uppercase">
                              Total Payé: {accessData.totalPaid.toLocaleString()} / {accessData.pensionAmount.toLocaleString()} FCFA
                            </span>
                          </div>
                        </div>
                      </ResultCard>
                    );
                  })()}
                </div>
              ) : (
                <EmptyState mode="access" />
              )
            )}
            
            {(matchedData || accessData) && (
              <div className="w-full mt-6">
                <Button variant="outline" className="w-full" onClick={() => { setMatchedData(null); setAccessData(null); }}>
                  <RefreshCw className="h-4 w-4 mr-2" /> Nouvelle Analyse
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

// Composants Helper
function getColors(statusColor: string) {
  const maps: Record<string, any> = {
    green: { bg: "from-green-500 to-emerald-600", border: "border-green-500/20", text: "text-green-500", badge: "from-green-600 to-emerald-600", shadow: "shadow-green-500/20", innerBg: "bg-green-500" },
    red: { bg: "from-red-500 to-rose-600", border: "border-red-500/20", text: "text-red-500", badge: "from-red-600 to-rose-600", shadow: "shadow-red-500/20", innerBg: "bg-red-500" },
    orange: { bg: "from-orange-500 to-amber-600", border: "border-orange-500/20", text: "text-orange-500", badge: "from-orange-600 to-amber-600", shadow: "shadow-orange-500/20", innerBg: "bg-orange-500" }
  };
  return maps[statusColor];
}

function EmptyState({ mode }: { mode: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
      <ScanLine className="h-24 w-24 mb-4 opacity-10" />
      <p className="font-medium">
        {mode === "receipt" ? "Prêt pour la validation de reçu" : "Prêt pour le contrôle d'accès"}
      </p>
    </div>
  );
}

function ResultCard({ UI, StatusIcon, title, message, student, isFaceMatch, children }: any) {
  return (
    <div className="relative group">
      <div className={`absolute -inset-1 bg-gradient-to-r ${UI.bg} rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000`}></div>
      <div className={`relative bg-white p-5 rounded-xl border ${UI.border} shadow-sm flex flex-col items-center text-center`}>
        
        <div className={`inline-flex items-center justify-center p-3 rounded-full mb-3 ${UI.shadow} shadow-lg ${UI.innerBg} text-white`}>
          <StatusIcon className="h-8 w-8" />
        </div>
        <h3 className={`text-xl font-black ${UI.text} uppercase tracking-tight`}>{title}</h3>
        <p className="font-bold text-zinc-600 mt-2 px-4 py-2 bg-zinc-50 rounded-lg text-sm">{message}</p>

        <div className="relative mt-6 mb-4">
          <div className={`h-32 w-32 rounded-2xl overflow-hidden border-4 ${UI.border} shadow-2xl bg-zinc-100 flex items-center justify-center`}>
            {(() => {
              let displayUrl = student?.reference_photo_url;
              if (displayUrl?.startsWith("[")) {
                try {
                  const parsed = JSON.parse(displayUrl);
                  if (Array.isArray(parsed)) displayUrl = parsed[0];
                } catch (e) {}
              }
              return displayUrl ? (
                <img src={displayUrl} alt={student.full_name} className={`h-full w-full object-cover ${isFaceMatch ? '' : 'grayscale contrast-125'}`} />
              ) : <UserCircle2 className="h-16 w-16 text-zinc-300" />;
            })()}
          </div>
          <div className={`absolute -bottom-3 -right-3 ${UI.innerBg} text-white p-1.5 rounded-full shadow-lg border-4 border-white`}>
            {isFaceMatch ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
          </div>
        </div>

        <div className="w-full space-y-2">
          <h3 className="text-lg font-black text-zinc-800 uppercase tracking-tight truncate px-2">{student?.full_name}</h3>
          <p className="text-xs font-bold text-zinc-500 font-mono tracking-widest">MAT: {student?.matricule}</p>
          <div className="flex items-center justify-center gap-2 py-1 px-3 bg-blue-500/5 text-blue-600 rounded-full border border-blue-500/10 inline-flex">
            <GraduationCap className="h-3 w-3" />
            <span className="text-[10px] font-bold uppercase">{student?.filiere}</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
