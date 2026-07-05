// ---------------------------------------------------------------------------
// Module Import / Export Excel — format "Scolarité"
//
// Structure d'un fichier :
//   • 1 fichier  = 1 NIVEAU
//   • 1 feuille  = 1 FILIÈRE  (ex. "TIC L1", "ROSE L1", "CHIMIE L1"…)
//   • Ligne 1    = les 21 en-têtes de colonnes (A → U)
//   • Ligne 2…N  = les étudiants
//   • Bloc bas   = les statistiques de la feuille (2 colonnes : Libellé | Valeur)
// ---------------------------------------------------------------------------
import * as XLSX from "xlsx-js-style";
import { normalizeName } from "@/lib/normalize";

// --- Type manipulé côté application ----------------------------------------
export interface ScolariteStudent {
  id?: string;
  matricule: string;
  nom: string | null;
  prenom: string | null;
  full_name: string;
  date_naissance: string | null;
  age: number | null;
  lieu_naissance: string | null;
  sexe: string | null;
  nationalite: string | null;
  region: string | null;
  langue: string | null;
  departement: string | null;
  bac_serie: string | null;
  telephone: string | null;
  situation_matrimoniale: string | null;
  du1: number;
  du2: number;
  cas_social: boolean;
  filiere: string;
  niveau: string;
  pension_amount?: number;
}

// --- Utilitaires de dérivation ---------------------------------------------
const norm = (v: unknown): string =>
  String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const toNumber = (v: unknown): number => {
  if (typeof v === "number") return v;
  const n = parseFloat(String(v ?? "").replace(/[^\d.,-]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

export const totalPension = (s: ScolariteStudent): number => (s.du1 || 0) + (s.du2 || 0);

// Palier de paiement : les 3 états sont mutuellement exclusifs
const isPaye50 = (s: ScolariteStudent) => totalPension(s) >= 50000;
const isPaye25 = (s: ScolariteStudent) => { const t = totalPension(s); return t >= 25000 && t < 50000; };
const isPasPaye = (s: ScolariteStudent) => totalPension(s) < 25000;

// Âge effectif : la valeur saisie, sinon calculée depuis l'année de naissance
export function effectiveAge(s: ScolariteStudent): number | null {
  if (typeof s.age === "number" && s.age > 0) return s.age;
  if (s.date_naissance) {
    const m = String(s.date_naissance).match(/(19|20)\d{2}/);
    if (m) {
      const age = new Date().getFullYear() - parseInt(m[0], 10);
      if (age > 0 && age < 120) return age;
    }
  }
  return null;
}

const isAnglophone = (s: ScolariteStudent) => norm(s.langue).includes("ANGL");
const isFrancophone = (s: ScolariteStudent) => norm(s.langue).includes("FRAN");
const isFille = (s: ScolariteStudent) => /^F/.test(norm(s.sexe));
const isGarcon = (s: ScolariteStudent) => /^[MH]/.test(norm(s.sexe));

// Découpe un nom complet en NOM (1er mot) + PRÉNOM (reste)
export function splitFullName(fullName: string): { nom: string; prenom: string } {
  const parts = (fullName || "").trim().split(/\s+/);
  if (parts.length <= 1) return { nom: parts[0] || "", prenom: "" };
  return { nom: parts[0], prenom: parts.slice(1).join(" ") };
}

// ---------------------------------------------------------------------------
// Définition des 21 colonnes (A → U)
// ---------------------------------------------------------------------------
type ColType = "text" | "number" | "mark";
interface ColumnDef {
  header: string;
  width: number;
  type: ColType;
  aliases: string[]; // en-têtes acceptés à l'import (normalisés)
  get: (s: ScolariteStudent) => string | number;
}

export const COLUMNS: ColumnDef[] = [
  { header: "Matricule", width: 14, type: "text", aliases: ["MATRICULE", "MAT"], get: (s) => s.matricule || "" },
  { header: "Nom", width: 16, type: "text", aliases: ["NOM"], get: (s) => s.nom || "" },
  { header: "Prénom", width: 18, type: "text", aliases: ["PRENOM", "PRENOMS"], get: (s) => s.prenom || "" },
  { header: "Date de Naissance", width: 15, type: "text", aliases: ["DATEDENAISSANCE", "DATENAISSANCE", "DATENAISS", "NAISSANCE"], get: (s) => s.date_naissance || "" },
  { header: "Âge", width: 6, type: "number", aliases: ["AGE"], get: (s) => effectiveAge(s) ?? "" as unknown as number },
  { header: "Lieu de Naissance", width: 16, type: "text", aliases: ["LIEUDENAISSANCE", "LIEUNAISSANCE", "LIEUNAISS", "LIEU"], get: (s) => s.lieu_naissance || "" },
  { header: "Sexe", width: 7, type: "text", aliases: ["SEXE", "GENRE"], get: (s) => s.sexe || "" },
  { header: "Nationalité", width: 14, type: "text", aliases: ["NATIONALITE"], get: (s) => s.nationalite || "" },
  { header: "Région", width: 12, type: "text", aliases: ["REGION"], get: (s) => s.region || "" },
  { header: "Langue", width: 12, type: "text", aliases: ["LANGUE"], get: (s) => s.langue || "" },
  { header: "Département", width: 16, type: "text", aliases: ["DEPARTEMENT"], get: (s) => s.departement || "" },
  { header: "Bac / Série", width: 10, type: "text", aliases: ["BACSERIE", "BAC", "SERIE", "BACSERIE"], get: (s) => s.bac_serie || "" },
  { header: "Téléphone", width: 14, type: "text", aliases: ["TELEPHONE", "TEL", "CONTACT"], get: (s) => s.telephone || "" },
  { header: "Situation matrimoniale", width: 16, type: "text", aliases: ["SITUATIONMATRIMONIALE", "SITUATION", "SITMATRIMONIALE"], get: (s) => s.situation_matrimoniale || "" },
  { header: "D.U.1", width: 11, type: "number", aliases: ["DU1", "DU1", "DROITUNIVERSITAIRE1", "TRANCHE1", "DUI"], get: (s) => s.du1 || 0 },
  { header: "D.U.2", width: 11, type: "number", aliases: ["DU2", "DROITUNIVERSITAIRE2", "TRANCHE2", "DUII"], get: (s) => s.du2 || 0 },
  { header: "Total", width: 12, type: "number", aliases: ["TOTAL"], get: (s) => totalPension(s) },
  { header: "Cas social", width: 10, type: "mark", aliases: ["CASSOCIAL", "CASSOCIAUX"], get: (s) => (s.cas_social ? "X" : "") },
  { header: "Pas payé", width: 10, type: "mark", aliases: ["PASPAYE", "NAYANTPASPAYE", "IMPAYE"], get: (s) => (isPasPaye(s) ? "X" : "") },
  { header: "Payé 25000", width: 12, type: "mark", aliases: ["PAYE25000", "PAYE25000F", "PAYE25"], get: (s) => (isPaye25(s) ? "X" : "") },
  { header: "Payé 50000", width: 12, type: "mark", aliases: ["PAYE50000", "PAYE50000F", "PAYE50"], get: (s) => (isPaye50(s) ? "X" : "") },
];

// Colonnes réellement importables (les colonnes dérivées Total / marqueurs sont ignorées)
const IMPORT_FIELDS: Record<string, keyof ScolariteStudent> = {
  MATRICULE: "matricule", MAT: "matricule",
  NOM: "nom",
  PRENOM: "prenom", PRENOMS: "prenom",
  DATEDENAISSANCE: "date_naissance", DATENAISSANCE: "date_naissance", DATENAISS: "date_naissance", NAISSANCE: "date_naissance",
  AGE: "age",
  LIEUDENAISSANCE: "lieu_naissance", LIEUNAISSANCE: "lieu_naissance", LIEUNAISS: "lieu_naissance", LIEU: "lieu_naissance",
  SEXE: "sexe", GENRE: "sexe",
  NATIONALITE: "nationalite",
  REGION: "region",
  LANGUE: "langue",
  DEPARTEMENT: "departement",
  BACSERIE: "bac_serie", BAC: "bac_serie", SERIE: "bac_serie",
  TELEPHONE: "telephone", TEL: "telephone", CONTACT: "telephone",
  SITUATIONMATRIMONIALE: "situation_matrimoniale", SITUATION: "situation_matrimoniale", SITMATRIMONIALE: "situation_matrimoniale",
  DU1: "du1", DROITUNIVERSITAIRE1: "du1", TRANCHE1: "du1", DUI: "du1",
  DU2: "du2", DROITUNIVERSITAIRE2: "du2", TRANCHE2: "du2", DUII: "du2",
  CASSOCIAL: "cas_social", CASSOCIAUX: "cas_social",
};

// ---------------------------------------------------------------------------
// Statistiques d'une feuille (filière)
// ---------------------------------------------------------------------------
export interface StatLine { label: string; value: number; }

// Bornes d'âge — centralisées ici pour être ajustées facilement
const AGE_BUCKETS: { label: string; test: (a: number) => boolean }[] = [
  { label: "AYANT MOINS DE 18 ANS", test: (a) => a < 18 },
  { label: "ÂGE COMPRIS DE 18 À 21 ANS", test: (a) => a >= 18 && a < 21 },
  { label: "ÂGE COMPRIS DE 21 À 24 ANS", test: (a) => a >= 21 && a < 24 },
  { label: "ÂGE COMPRIS DE 24 À 28 ANS", test: (a) => a >= 24 && a < 28 },
  { label: "ÂGE COMPRIS DE 28 À 40 ANS", test: (a) => a >= 28 && a < 40 },
];

export function computeStats(students: ScolariteStudent[]): StatLine[] {
  const count = (fn: (s: ScolariteStudent) => boolean) => students.filter(fn).length;
  const ageStats = AGE_BUCKETS.map((b) => ({
    label: b.label,
    value: students.filter((s) => { const a = effectiveAge(s); return a != null && b.test(a); }).length,
  }));

  return [
    { label: "EFFECTIF TOTAL", value: students.length },
    { label: "LISTE DES ÉTUDIANTS PRÉINSCRITS", value: students.length },
    ...ageStats,
    { label: "ÉTUDIANTS ANGLOPHONES", value: count(isAnglophone) },
    { label: "ÉTUDIANTS FRANCOPHONES", value: count(isFrancophone) },
    { label: "NOMBRE DE GARÇONS", value: count(isGarcon) },
    { label: "NOMBRE DE FILLES", value: count(isFille) },
    { label: "CAS SOCIAUX", value: count((s) => s.cas_social) },
    { label: "PAYÉ 25000", value: count(isPaye25) },
    { label: "PAYÉ 50000", value: count(isPaye50) },
    { label: "N'AYANT PAS PAYÉ", value: count(isPasPaye) },
  ];
}

// ---------------------------------------------------------------------------
// Styles Excel (police + couleur) — cohérents avec le thème de l'application
// ---------------------------------------------------------------------------
const FONT = "Calibri";
const C_NAVY = "13294B";   // en-tête colonnes (fond)
const C_GREEN = "2E7D5B";  // titre statistiques (fond)
const C_ALT = "EEF3F8";    // ligne paire
const C_BORDER = "AEB8C6"; // bordures

const thin = { style: "thin", color: { rgb: C_BORDER } };
const allBorders = { top: thin, bottom: thin, left: thin, right: thin };

const headerStyle = {
  font: { name: FONT, sz: 11, bold: true, color: { rgb: "FFFFFF" } },
  fill: { fgColor: { rgb: C_NAVY } },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border: allBorders,
};
const dataStyle = (alt: boolean, center: boolean, num: boolean) => ({
  font: { name: FONT, sz: 10, color: { rgb: "1A2433" } },
  fill: { fgColor: { rgb: alt ? C_ALT : "FFFFFF" } },
  alignment: { horizontal: center ? "center" : num ? "right" : "left", vertical: "center" },
  border: allBorders,
  ...(num ? { numFmt: "#,##0" } : {}),
});
const statsTitleStyle = {
  font: { name: FONT, sz: 11, bold: true, color: { rgb: "FFFFFF" } },
  fill: { fgColor: { rgb: C_GREEN } },
  alignment: { horizontal: "center", vertical: "center" },
  border: allBorders,
};
const statLabelStyle = {
  font: { name: FONT, sz: 10, bold: true, color: { rgb: "1A2433" } },
  alignment: { horizontal: "left", vertical: "center" },
  border: allBorders,
};
const statValueStyle = {
  font: { name: FONT, sz: 10, bold: true, color: { rgb: C_GREEN } },
  alignment: { horizontal: "center", vertical: "center" },
  border: allBorders,
};

// ---------------------------------------------------------------------------
// Construction d'une feuille (filière)
// ---------------------------------------------------------------------------
function buildSheet(students: ScolariteStudent[]): XLSX.WorkSheet {
  const nCols = COLUMNS.length;
  const aoa: (string | number)[][] = [];

  // Ligne 1 : en-têtes
  aoa.push(COLUMNS.map((c) => c.header));
  // Données
  students.forEach((s) => aoa.push(COLUMNS.map((c) => c.get(s))));

  const dataEndRow = students.length; // index de la dernière ligne de données (0-based)
  aoa.push([]); // ligne vide de séparation

  const statsTitleRow = aoa.length;
  aoa.push(["STATISTIQUES"]);
  const stats = computeStats(students);
  const statsStart = aoa.length;
  stats.forEach((st) => aoa.push([st.label, st.value]));
  const statsEnd = aoa.length - 1;

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = COLUMNS.map((c) => ({ wch: c.width }));

  // Fusion du titre "STATISTIQUES" sur les 2 colonnes
  ws["!merges"] = [{ s: { r: statsTitleRow, c: 0 }, e: { r: statsTitleRow, c: 1 } }];

  // Hauteur de la ligne d'en-tête
  ws["!rows"] = [];
  ws["!rows"][0] = { hpt: 30 };

  const setStyle = (r: number, c: number, style: object) => {
    const addr = XLSX.utils.encode_cell({ r, c });
    if (!ws[addr]) ws[addr] = { t: "s", v: "" };
    (ws[addr] as { s?: object }).s = style;
  };

  // En-têtes
  for (let c = 0; c < nCols; c++) setStyle(0, c, headerStyle);

  // Données
  for (let r = 1; r <= dataEndRow; r++) {
    const alt = r % 2 === 0;
    for (let c = 0; c < nCols; c++) {
      const col = COLUMNS[c];
      setStyle(r, c, dataStyle(alt, col.type === "mark", col.type === "number"));
    }
  }

  // Bloc statistiques
  setStyle(statsTitleRow, 0, statsTitleStyle);
  setStyle(statsTitleRow, 1, statsTitleStyle);
  for (let r = statsStart; r <= statsEnd; r++) {
    setStyle(r, 0, statLabelStyle);
    setStyle(r, 1, statValueStyle);
  }

  return ws;
}

// Nom de feuille valide pour Excel (≤ 31 caractères, sans caractères interdits)
function safeSheetName(name: string, used: Set<string>): string {
  let base = (name || "Feuille").replace(/[\\/?*[\]:]/g, " ").trim().slice(0, 31) || "Feuille";
  let candidate = base;
  let i = 2;
  while (used.has(candidate.toLowerCase())) {
    const suffix = ` (${i++})`;
    candidate = base.slice(0, 31 - suffix.length) + suffix;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

// ---------------------------------------------------------------------------
// EXPORT — un classeur par niveau, une feuille par filière
// ---------------------------------------------------------------------------
export function buildNiveauWorkbook(studentsOfNiveau: ScolariteStudent[]): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const used = new Set<string>();

  // Regroupement par filière
  const byFiliere = new Map<string, ScolariteStudent[]>();
  for (const s of studentsOfNiveau) {
    const key = s.filiere || "SANS FILIÈRE";
    if (!byFiliere.has(key)) byFiliere.set(key, []);
    byFiliere.get(key)!.push(s);
  }

  const filieres = [...byFiliere.keys()].sort((a, b) => a.localeCompare(b, "fr"));
  if (filieres.length === 0) {
    // Classeur avec une feuille vide pour rester valide
    XLSX.utils.book_append_sheet(wb, buildSheet([]), safeSheetName("VIDE", used));
  } else {
    for (const f of filieres) {
      const students = byFiliere.get(f)!.sort((a, b) => a.matricule.localeCompare(b.matricule));
      XLSX.utils.book_append_sheet(wb, buildSheet(students), safeSheetName(f, used));
    }
  }
  return wb;
}

export function downloadNiveau(niveau: string, studentsOfNiveau: ScolariteStudent[]): void {
  const wb = buildNiveauWorkbook(studentsOfNiveau);
  const safe = (niveau || "NIVEAU").replace(/[^\p{L}\p{N}\-_ ]/gu, "").trim() || "NIVEAU";
  XLSX.writeFile(wb, `NIVEAU ${safe}.xlsx`, { bookType: "xlsx" });
}

// Modèle vierge (en-têtes + bloc statistiques vide) à remplir puis réimporter
export function downloadTemplate(): void {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, buildSheet([]), "FILIÈRE 1");
  XLSX.writeFile(wb, "MODELE_SCOLARITE.xlsx", { bookType: "xlsx" });
}

// ---------------------------------------------------------------------------
// IMPORT — lecture d'un classeur (une feuille = une filière)
// ---------------------------------------------------------------------------
export interface ParsedSheet {
  filiere: string;
  students: ScolariteStudent[];
}

// Détecte si un libellé de colonne A correspond au bloc statistiques (à ignorer)
const STAT_PREFIXES = ["EFFECTIF", "LISTE", "AYANT", "AGE", "ETUDIANT", "NOMBRE", "CAS", "PAYE", "NAYANT", "STATISTIQUE"];
const looksLikeStat = (v: unknown) => {
  const n = norm(v);
  return STAT_PREFIXES.some((p) => n.startsWith(p));
};

export async function parseWorkbook(file: File, niveau: string): Promise<ParsedSheet[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const result: ParsedSheet[] = [];

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<(string | number)[]>(ws, { header: 1, blankrows: false, defval: "" });
    if (rows.length < 1) continue;

    // Repérage des colonnes depuis la ligne d'en-tête (ligne 1)
    const headerRow = rows[0] as (string | number)[];
    const colMap: { index: number; field: keyof ScolariteStudent }[] = [];
    headerRow.forEach((h, idx) => {
      const field = IMPORT_FIELDS[norm(h)];
      if (field) colMap.push({ index: idx, field });
    });
    const matriculeCol = colMap.find((c) => c.field === "matricule");
    if (!matriculeCol) continue; // feuille non conforme, ignorée

    const students: ScolariteStudent[] = [];
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r] as (string | number)[];
      const rawMat = row[matriculeCol.index];
      if (!String(rawMat ?? "").trim()) continue;      // ligne vide
      if (looksLikeStat(rawMat)) break;                // début du bloc statistiques

      const s: ScolariteStudent = {
        matricule: "", nom: null, prenom: null, full_name: "",
        date_naissance: null, age: null, lieu_naissance: null, sexe: null,
        nationalite: null, region: null, langue: null, departement: null,
        bac_serie: null, telephone: null, situation_matrimoniale: null,
        du1: 0, du2: 0, cas_social: false,
        filiere: sheetName.trim(), niveau: niveau.trim(),
      };

      for (const { index, field } of colMap) {
        const raw = row[index];
        if (field === "du1" || field === "du2") (s[field] as number) = toNumber(raw);
        else if (field === "age") s.age = raw === "" || raw == null ? null : Math.round(toNumber(raw)) || null;
        else if (field === "cas_social") s.cas_social = /^(X|OUI|1|TRUE|VRAI)$/i.test(String(raw ?? "").trim());
        else (s[field] as unknown as string | null) = String(raw ?? "").trim() || null;
      }

      s.matricule = String(rawMat).trim();
      // Nom complet reconstitué
      const composed = [s.nom, s.prenom].filter(Boolean).join(" ").trim();
      s.full_name = composed || s.matricule;
      students.push(s);
    }

    result.push({ filiere: sheetName.trim(), students });
  }

  return result;
}

// Prépare une ligne prête à être insérée dans Supabase (table students)
export function toDbInsert(s: ScolariteStudent) {
  return {
    matricule: s.matricule,
    full_name: s.full_name,
    normalized_name: normalizeName(s.full_name),
    nom: s.nom,
    prenom: s.prenom,
    date_naissance: s.date_naissance,
    age: s.age,
    lieu_naissance: s.lieu_naissance,
    sexe: s.sexe,
    nationalite: s.nationalite,
    region: s.region,
    langue: s.langue,
    departement: s.departement,
    bac_serie: s.bac_serie,
    telephone: s.telephone,
    situation_matrimoniale: s.situation_matrimoniale,
    du1: s.du1,
    du2: s.du2,
    cas_social: s.cas_social,
    filiere: s.filiere,
    niveau: s.niveau,
    pension_amount: 50000,
  };
}
