import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { parseReceipt } from "@/lib/parseReceipt";
import type { ParsedReceipt } from "@/lib/parseReceipt";
import { normalizeName, similarity } from "@/lib/normalize";
import { CheckCircle2, ScanLine, Camera, UserCircle2, Loader2, Plus, ShieldCheck, XCircle, RefreshCw, Banknote, Keyboard } from "lucide-react";
import { toast } from "sonner";
import type { Student } from "./students";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAcademicYear } from "@/lib/utils";

export const Route = createFileRoute("/verify")({
  component: VerifyPage,
});

type Step = "scan" | "manual" | "match" | "saved";

function VerifyPage() {
  const [step, setStep] = useState<Step>("scan");
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedReceipt | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);
  const [matricule, setMatricule] = useState("");
  const [filiere, setFiliere] = useState("");
  const [niveau, setNiveau] = useState("");
  const [photos, setPhotos] = useState<(File | null)[]>([null, null]);
  
  // States for manual entry
  const [manualName, setManualName] = useState("");
  const [manualAmount, setManualAmount] = useState("");
  const [manualAccount, setManualAccount] = useState("10012-002727691011-92");

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
          canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.6);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const onScan = async (result: any[]) => {
    if (!result?.[0]?.rawValue) return;
    const raw = String(result[0].rawValue);
    setScannedData(raw);
    const p = parseReceipt(raw);
    setParsed(p);
    setStep("match");
    
    if (p.remettant) {
      setLoading(true);
      const { data: students } = await supabase.from("students").select("*");
      const normScanned = normalizeName(p.remettant);
      
      const match = students?.find(s => {
        const normRef = normalizeName(s.full_name);
        return normRef === normScanned || similarity(normRef, normScanned) > 0.85;
      });

      if (match) {
        setStudent(match);
        setMatricule(match.matricule || "");
        setFiliere(match.filiere || "");
        setNiveau(match.niveau || "");
      } else {
        setMatricule("");
        setFiliere("");
        setNiveau("");
        setPhotos([null, null]);
      }
      setLoading(false);
    }
  };

  const onManualSubmit = async () => {
    if (!manualName || !manualAmount) {
      toast.error("Veuillez remplir le nom et le montant");
      return;
    }
    const p: ParsedReceipt = {
      clientName: "Saisie Manuelle",
      accountNumber: manualAccount,
      amount: parseInt(manualAmount, 10),
      remettant: manualName
    };
    setScannedData("MANUAL_ENTRY");
    setParsed(p);
    setStep("match");
    
    setLoading(true);
    const { data: students } = await supabase.from("students").select("*");
    const normScanned = normalizeName(p.remettant || "");
    
    const match = students?.find(s => {
      const normRef = normalizeName(s.full_name);
      return normRef === normScanned || similarity(normRef, normScanned) > 0.85;
    });

    if (match) {
      setStudent(match);
      setMatricule(match.matricule || "");
      setFiliere(match.filiere || "");
      setNiveau(match.niveau || "");
    } else {
      setMatricule("");
      setFiliere("");
      setNiveau("");
      setPhotos([null, null]);
    }
    setLoading(false);
  };


  const saveAndNext = async () => {
    if (!matricule || !filiere || !niveau) {
      toast.error("Veuillez remplir tous les champs (Matricule, Filière, Niveau)");
      return;
    }

    if (!student && (!photos[0] || !photos[1])) {
      toast.error("Pour un nouvel étudiant, 2 photos de référence sont obligatoires.");
      return;
    }

    setLoading(true);
    try {
      // Vérification de la non-redondance du reçu (éviter d'enregistrer le même QR Code deux fois)
      if (scannedData && scannedData !== "MANUAL_ENTRY") {
        const { data: existingPayment, error: checkErr } = await supabase
          .from("payments")
          .select("id")
          .eq("qr_raw_text", scannedData)
          .maybeSingle();

        if (checkErr) throw checkErr;
        if (existingPayment) {
          toast.error("Ce reçu a déjà été scanné et enregistré !");
          setLoading(false);
          return;
        }
      }

      let finalStudentId = student?.id;
      let photoUrls: string[] = [];

      // Upload des photos si présentes
      for (let i = 0; i < photos.length; i++) {
        if (photos[i]) {
          const blob = await resizeImage(photos[i]!);
          const path = `references/${crypto.randomUUID()}.jpg`;
          const { error: upErr } = await supabase.storage.from("student-photos").upload(path, blob);
          if (upErr) throw upErr;
          photoUrls.push(supabase.storage.from("student-photos").getPublicUrl(path).data.publicUrl);
        }
      }

      if (!student) {
        const { data: newStudent, error: sErr } = await supabase.from("students").insert({
          full_name: parsed?.remettant || "",
          normalized_name: normalizeName(parsed?.remettant || ""),
          matricule,
          filiere,
          niveau,
          pension_amount: parsed?.amount || 0,
          reference_photo_url: photoUrls.length > 0 ? JSON.stringify(photoUrls) : null
        }).select().single();
        if (sErr) throw sErr;
        finalStudentId = newStudent.id;
      } else {
        const updateData: any = { matricule, filiere, niveau };
        if (photoUrls.length > 0) updateData.reference_photo_url = JSON.stringify(photoUrls);
        await supabase.from("students").update(updateData).eq("id", student.id);
      }

      const { error } = await supabase.from("payments").insert({
        student_id: finalStudentId,
        amount: parsed?.amount || 0,
        remettant: parsed?.remettant || "",
        status: "pending",
        qr_raw_text: scannedData || "",
        client_name: parsed?.clientName,
        account_number: parsed?.accountNumber
      });

      if (error) throw error;
      
      setStep("saved");
      toast.success("Session enregistrée avec succès.");
    } catch (e: any) {
      toast.error("Erreur: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep("scan");
    setScannedData(null);
    setParsed(null);
    setStudent(null);
    setMatricule("");
    setFiliere("");
    setNiveau("");
    setPhotos([null, null]);
    setManualName("");
    setManualAmount("");
    setManualAccount("10012-002727691011-92");
  };

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Session Scanner Reçu</h1>
            <p className="text-muted-foreground mt-1">Étape 1 : Acquisition des données du reçu.</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-premium">
            <ScanLine className="h-6 w-6" />
          </div>
        </header>

        <div className="relative">
          {step === "scan" && (
            <Card className="overflow-hidden border-2 border-dashed border-primary/20 glass bg-muted/30">
              <div className="aspect-square relative">
                <Scanner onScan={onScan} styles={{ container: { width: '100%', height: '100%' } }} />
                <div className="absolute inset-0 border-[20px] border-black/20 pointer-events-none">
                  <div className="w-full h-full border-2 border-primary/30 relative">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary"></div>
                  </div>
                </div>
              </div>
              <div className="p-6 text-center">
                <p className="font-bold text-lg">Présentez le QR Code</p>
                <p className="text-sm text-muted-foreground mt-1">Le scan démarrera automatiquement</p>
                
                <Button 
                  variant="outline" 
                  className="w-full mt-6 gap-2" 
                  onClick={() => setStep("manual")}
                >
                  <Keyboard className="h-4 w-4" />
                  Saisie manuelle (Reçu illisible)
                </Button>
              </div>
            </Card>
          )}

          {step === "manual" && (
            <Card className="p-6 space-y-6 glass-card animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="text-center">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-premium mx-auto mb-4">
                  <Keyboard className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-bold tracking-tight">Saisie Manuelle</h2>
                <p className="text-sm text-muted-foreground mt-1">Saisissez les informations inscrites sur le reçu papier illisible.</p>
              </div>
              
              <div className="space-y-4 bg-muted/30 p-5 rounded-2xl border border-primary/5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nom complet de l'étudiant (Remettant)</label>
                  <Input 
                    placeholder="Ex: JEAN DUPONT" 
                    value={manualName} 
                    onChange={e => setManualName(e.target.value)} 
                    className="bg-background/50 font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Montant Versé (FCFA)</label>
                  <Input 
                    type="number" 
                    placeholder="Ex: 50000" 
                    value={manualAmount} 
                    onChange={e => setManualAmount(e.target.value)} 
                    className="bg-background/50 font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Numéro de Compte (Défaut: CCA)</label>
                  <Input 
                    value={manualAccount} 
                    onChange={e => setManualAccount(e.target.value)} 
                    className="bg-background/50 font-bold text-primary"
                  />
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button variant="ghost" onClick={() => setStep("scan")} className="w-full sm:flex-1">Retour</Button>
                <Button onClick={onManualSubmit} disabled={loading} className="w-full sm:flex-[2] font-bold shadow-premium">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />} 
                  Continuer la vérification
                </Button>
              </div>
            </Card>
          )}

          {step === "match" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Card className="p-8 glass-card">
                <div className="flex flex-col space-y-6">
                  <div className="text-center flex flex-col items-center">
                    <div className={`h-16 w-16 rounded-full mx-auto mb-4 flex items-center justify-center ${student ? "bg-success/20 text-success" : "bg-warning/20 text-warning"}`}>
                      {student ? <CheckCircle2 className="h-8 w-8" /> : <UserCircle2 className="h-8 w-8" />}
                    </div>
                    <h2 className="text-2xl font-black">{student ? "Étudiant Reconnu" : "Nouveau Profil"}</h2>
                    <p className="text-muted-foreground mt-1">Reçu de : <span className="font-bold text-foreground">{parsed?.remettant}</span></p>
                    <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
                      <span>Année Académique :</span>
                      <span className="font-black text-gradient">{getAcademicYear()}</span>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 mt-4 w-full text-left text-sm bg-background/50 border border-primary/10 p-3 rounded-xl">
                      <div className="flex-1 space-y-1">
                        <span className="text-muted-foreground uppercase text-[10px] tracking-wider font-black flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3" /> Université / Client
                        </span>
                        <span className="font-black text-foreground block">{parsed?.clientName || "Non détecté"}</span>
                      </div>
                      <div className="flex-1 space-y-1">
                        <span className="text-muted-foreground uppercase text-[10px] tracking-wider font-black flex items-center gap-1">
                          <Banknote className="h-3 w-3" /> Compte Banque CCA
                        </span>
                        <span className="font-mono font-bold text-primary block">{parsed?.accountNumber || "Non détecté"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 bg-muted/30 p-6 rounded-2xl border border-primary/5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Matricule</label>
                        <Input 
                          placeholder="Ex: 22T2540" 
                          value={matricule} 
                          onChange={(e) => setMatricule(e.target.value)}
                          className="bg-background/50 font-bold"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Année Académique</label>
                        <Input 
                          value={getAcademicYear()} 
                          disabled
                          className="bg-background/50 font-bold text-primary border-primary/25 cursor-not-allowed"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Niveau</label>
                        <Input 
                          placeholder="Ex: L1, L2..." 
                          value={niveau} 
                          onChange={(e) => setNiveau(e.target.value)}
                          className="bg-background/50 font-bold"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Filière / Département</label>
                        <Input 
                          placeholder="Ex: Génie Informatique" 
                          value={filiere} 
                          onChange={(e) => setFiliere(e.target.value)}
                          className="bg-background/50 font-bold"
                        />
                      </div>
                    </div>

                    <div className="space-y-3 pt-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Photos de Référence (Biométrie)</label>
                      <div className="grid grid-cols-2 gap-3">
                        {[0, 1].map((i) => (
                          <div key={i} className="space-y-1.5">
                            <div 
                              className="aspect-square rounded-xl border-2 border-dashed border-primary/20 flex items-center justify-center bg-background/40 overflow-hidden relative group cursor-pointer hover:border-primary/40 transition-colors"
                              onClick={() => document.getElementById(`ref-photo-${i}`)?.click()}
                            >
                              {photos[i] ? (
                                <img 
                                  src={URL.createObjectURL(photos[i]!)} 
                                  className="absolute inset-0 w-full h-full object-cover" 
                                  alt={`Ref ${i+1}`}
                                />
                              ) : (
                                <Plus className="h-6 w-6 text-primary/40 group-hover:scale-110 transition-transform" />
                              )}
                            </div>
                            <Input 
                              id={`ref-photo-${i}`}
                              type="file" 
                              accept="image/*" 
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                const newPhotos = [...photos];
                                newPhotos[i] = file;
                                setPhotos(newPhotos);
                              }} 
                            />
                            <div className="text-[9px] text-center font-bold text-muted-foreground uppercase">Angle {i + 1}</div>
                          </div>
                        ))}
                      </div>
                      {!student && <p className="text-[10px] text-center text-warning font-medium italic">Requis pour l'identification faciale future</p>}
                    </div>

                    <div className="pt-4 border-t border-primary/10 flex justify-between items-center">
                      <span className="text-sm font-bold text-muted-foreground">Montant du Reçu</span>
                      <span className="text-2xl font-black text-primary">{parsed?.amount?.toLocaleString()} XAF</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Button variant="ghost" onClick={reset} className="w-full sm:flex-1">Annuler</Button>
                    <Button onClick={saveAndNext} disabled={loading} className="w-full sm:flex-1 shadow-premium font-bold">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                      Valider & Enregistrer
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {step === "saved" && (
            <Card className="p-12 text-center space-y-6 animate-in zoom-in duration-300">
              <div className="h-24 w-24 bg-success/20 text-success rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-12 w-12" />
              </div>
              <div>
                <h2 className="text-3xl font-bold">Enregistrement Réussi</h2>
                <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
                  Le paiement a été mis en attente. L'étudiant doit maintenant passer à la <b>Session Visage</b> pour validation finale.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Link to="/face-verify">
                  <Button size="lg" className="w-full gap-2">
                    <ShieldCheck className="h-5 w-5" /> Aller à la Session Visage
                  </Button>
                </Link>
                <Button variant="outline" onClick={reset} size="lg">
                  Scanner un autre reçu
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}

// Export pour réutilisation
export function FaceCapture({ onCapture, isVerifying = false }: { onCapture: (img: string) => void, isVerifying?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [captured, setCaptured] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        console.log("Tentative d'accès à la caméra...");
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        if (!mounted) {
          s.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.onloadedmetadata = () => {
            if (!mounted) return;
            console.log("Flux vidéo chargé:", videoRef.current?.videoWidth, "x", videoRef.current?.videoHeight);
            videoRef.current?.play().catch(e => console.error("Erreur lecture vidéo:", e));
            setReady(true);
          };
        }
      } catch (e: any) { 
        console.error("Erreur caméra:", e);
        setError("Accès caméra refusé ou non supporté");
        toast.error("Accès caméra refusé"); 
      }
    })();
    return () => {
      mounted = false;
      streamRef.current?.getTracks()?.forEach((t) => t.stop());
    };
  }, []);

  // Synchroniser l'état capturé avec isVerifying du parent
  useEffect(() => {
    if (!isVerifying && captured) {
      // Si le parent a fini de vérifier mais qu'on n'a pas de preview, on reset
      // (mais généralement on garde la preview jusqu'au reset global)
    }
  }, [isVerifying, captured]);

  const snap = () => {
    console.log("Clic sur le bouton de capture détecté");
    const v = videoRef.current; 
    if (!v || !ready) {
      console.warn("Capture impossible: vidéo non prête");
      return;
    }
    
    if (v.videoWidth === 0 || v.videoHeight === 0) {
      console.warn("Capture impossible: dimensions vidéo nulles");
      toast.error("La caméra n'est pas encore prête");
      return;
    }

    const canvas = document.createElement("canvas");
    
    // Redimensionnement agressif pour économiser le quota Gemini
    const MAX_DIM = 250;
    let w = v.videoWidth;
    let h = v.videoHeight;
    if (w > h && w > MAX_DIM) { h *= MAX_DIM / w; w = MAX_DIM; }
    else if (h > MAX_DIM) { w *= MAX_DIM / h; h = MAX_DIM; }
    
    canvas.width = w; 
    canvas.height = h;
    const ctx = canvas.getContext("2d"); 
    if (!ctx) return;
    
    ctx.drawImage(v, 0, 0, w, h);
    
    // Compression JPEG à 40%
    const data = canvas.toDataURL("image/jpeg", 0.4);
    setPreview(data);
    setCaptured(true);
    console.log("Photo capturée, envoi au parent...");
    onCapture(data);
  };

  const resetCapture = () => {
    setCaptured(false);
    setPreview(null);
  };

  return (
    <div className="space-y-4">
      <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3] shadow-2xl border-4 border-primary/20">
        {preview ? (
          <img src={preview} className="w-full h-full object-cover mirror" alt="Captured" />
        ) : (
          <video ref={videoRef} className="w-full h-full object-cover mirror" muted playsInline />
        )}
        
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/10 backdrop-blur-sm p-4 text-center">
            <XCircle className="h-12 w-12 text-destructive mb-2" />
            <p className="text-destructive font-bold">{error}</p>
          </div>
        )}

        {!captured && !error && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4">
            <div className="w-[80%] max-w-[256px] aspect-[3/4] border-2 border-dashed border-white/50 rounded-[120px] relative">
              <div className="absolute inset-0 border-2 border-primary rounded-[120px] animate-pulse opacity-50"></div>
            </div>
            {ready && <div className="absolute inset-0 w-full h-1 bg-primary/50 shadow-[0_0_15px_rgba(var(--primary),0.5)] animate-scan-line"></div>}
            <div className="absolute bottom-6 left-0 right-0 text-center">
              <p className="text-white text-sm font-medium bg-black/40 backdrop-blur-md py-1 px-3 rounded-full inline-block">Placez votre visage dans le cadre</p>
            </div>
          </div>
        )}
      </div>

      {!captured ? (
        <div className="relative">
          <Button 
            onClick={snap} 
            disabled={!ready || error !== null} 
            size="lg" 
            className={`w-full py-6 text-lg font-bold shadow-premium transition-all duration-300 relative z-10 ${ready ? "cursor-pointer opacity-100" : "cursor-not-allowed opacity-70"}`}
          >
            {!ready && !error ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Camera className="h-5 w-5 mr-2" />}
            {!ready && !error ? "Initialisation caméra..." : "Démarrer la capture"}
          </Button>
          {!ready && !error && (
            <p className="text-[10px] text-center text-muted-foreground mt-2 animate-pulse">
              En attente du flux vidéo...
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={resetCapture} disabled={isVerifying} variant="outline" className="w-full sm:flex-1 font-bold">
            <RefreshCw className="h-4 w-4 mr-2" /> Reprendre
          </Button>
          <Button disabled className="flex-[2] font-bold">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> 
            {isVerifying ? "Analyse en cours..." : "Photo capturée"}
          </Button>
        </div>
      )}
    </div>
  );
}
