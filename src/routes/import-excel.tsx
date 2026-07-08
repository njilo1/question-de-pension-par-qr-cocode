import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, FileSpreadsheet, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export const Route = createFileRoute("/import-excel")({
  component: ImportExcelPage,
});

function ImportExcelPage() {
  const { session } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const jsonData = XLSX.utils.sheet_to_json(ws);
        
        const normalizedData = jsonData.map((row: any) => {
          const newRow: any = {};
          for (const key in row) {
            // Normalisation des clés pour éviter les erreurs de frappe (espaces, accents)
            const normalizedKey = key.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/'/g, "");
            newRow[normalizedKey] = row[key];
          }
          return {
            matricule: newRow.matricule || newRow.mat || "",
            montant: newRow['montant verse'] || newRow.montant || 0,
            nom: newRow['nom et prenom de letudiant'] || newRow['nom et prenom'] || newRow.nom || "",
            compte: newRow['numero du compte'] || newRow.compte || "",
            date: newRow.date || ""
          };
        }).filter(r => r.matricule);

        setData(normalizedData);
        toast.success(`${normalizedData.length} lignes trouvées dans le fichier.`);
      } catch (error) {
        toast.error("Erreur lors de la lecture du fichier Excel.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const processImport = async () => {
    if (data.length === 0) return;
    setIsProcessing(true);
    
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const row of data) {
        const { data: student, error: studentError } = await supabase
          .from("students")
          .select("id")
          .ilike("matricule", row.matricule)
          .single();

        if (studentError || !student) {
          errorCount++;
          continue;
        }

        const paymentPayload: Database["public"]["Tables"]["payments"]["Insert"] = {
          student_id: student.id,
          amount: Number(row.montant) || 0,
          account_number: row.compte || "IMPORT_EXCEL",
          status: "verified",
          verified_by: session?.user?.id ?? null,
          face_match: true,
          confidence_score: 100,
          face_analysis: `Validé par import Excel (Date banque: ${row.date || 'N/A'})`,
          qr_raw_text: `IMPORT_EXCEL|${row.matricule}|${row.montant}`,
          remettant: row.nom || "Import Excel"
        };

        const { error: insertError } = await supabase
          .from("payments")
          .insert(paymentPayload);

        if (insertError) errorCount++;
        else successCount++;
      }

      toast.success(`Import terminé: ${successCount} paiements ajoutés.`);
      if (errorCount > 0) toast.warning(`${errorCount} paiements ignorés (Matricule introuvable).`);
      setData([]); 
    } catch (error: any) {
      toast.error("Erreur lors de l'importation.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <FileSpreadsheet className="text-primary h-8 w-8 shrink-0" />
          Importation Bancaire (Excel)
        </h1>

        <Card className="p-8 border-2 border-dashed border-primary/20 bg-primary/5 text-center space-y-4">
          <div className="mx-auto h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center text-primary">
            <Upload className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-semibold">Télécharger le fichier Excel de la Banque</h2>
          <p className="text-muted-foreground text-sm max-w-2xl mx-auto">
            Format attendu des colonnes : <strong className="text-primary">Matricule</strong>, <strong className="text-primary">Montant versé</strong>, <strong className="text-primary">Nom et prenom de l'etudiant</strong>, <strong className="text-primary">Numéro du compte</strong>, <strong className="text-primary">Date</strong>.
          </p>
          <div className="pt-4 relative flex justify-center">
            <Input 
              type="file" 
              accept=".xlsx, .xls" 
              className="absolute opacity-0 cursor-pointer w-64 h-12"
              onChange={handleFileUpload}
            />
            <Button size="lg" className="pointer-events-none w-64">
              Choisir un fichier Excel
            </Button>
          </div>
        </Card>

        {data.length > 0 && (
          <Card className="p-6 space-y-4 border-primary/20 shadow-lg">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
              <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0" />
                <span>Aperçu des données ({data.length})</span>
              </h3>
              <Button onClick={processImport} disabled={isProcessing} className="w-full sm:w-auto bg-green-600 hover:bg-green-700">
                {isProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Valider l'importation
              </Button>
            </div>
            
            <div className="md:hidden space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {data.map((row, idx) => (
                <div key={idx} className="bg-muted/20 p-4 rounded-xl border border-primary/5 space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-primary">{row.matricule}</span>
                    <span className="text-xs text-muted-foreground">{row.date || "-"}</span>
                  </div>
                  <div className="font-medium">{row.nom || "-"}</div>
                  <div className="flex justify-between items-center text-sm border-t border-primary/5 pt-2 mt-2">
                    <span className="text-muted-foreground">Compte</span>
                    <span className="font-mono text-xs">{row.compte || "-"}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-t border-primary/5 pt-2 mt-2">
                    <span className="text-muted-foreground">Montant</span>
                    <span className="font-bold">{Number(row.montant).toLocaleString()} FCFA</span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="hidden md:block overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3">Matricule</th>
                    <th className="px-4 py-3">Nom & Prénom</th>
                    <th className="px-4 py-3">Montant Versé</th>
                    <th className="px-4 py-3">N° Compte</th>
                    <th className="px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, idx) => (
                    <tr key={idx} className="border-b border-border/50 hover:bg-primary/5">
                      <td className="px-4 py-3 font-bold text-primary">{row.matricule}</td>
                      <td className="px-4 py-3">{row.nom || "-"}</td>
                      <td className="px-4 py-3 font-semibold">{Number(row.montant).toLocaleString()} FCFA</td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{row.compte || "-"}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{row.date || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
