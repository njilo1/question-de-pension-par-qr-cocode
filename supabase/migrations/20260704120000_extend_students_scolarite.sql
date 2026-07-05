-- Extension de la table students pour le format "scolarité" (fichier Excel 21 colonnes)
-- Chaque champ est optionnel afin de rester compatible avec les étudiants déjà enregistrés.

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS nom                     TEXT,
  ADD COLUMN IF NOT EXISTS prenom                  TEXT,
  ADD COLUMN IF NOT EXISTS date_naissance          TEXT,
  ADD COLUMN IF NOT EXISTS age                     INTEGER,
  ADD COLUMN IF NOT EXISTS lieu_naissance          TEXT,
  ADD COLUMN IF NOT EXISTS sexe                    TEXT,      -- 'M' | 'F'
  ADD COLUMN IF NOT EXISTS nationalite             TEXT,
  ADD COLUMN IF NOT EXISTS region                  TEXT,
  ADD COLUMN IF NOT EXISTS langue                  TEXT,      -- 'Français' | 'Anglais'
  ADD COLUMN IF NOT EXISTS departement             TEXT,
  ADD COLUMN IF NOT EXISTS bac_serie               TEXT,
  ADD COLUMN IF NOT EXISTS telephone               TEXT,
  ADD COLUMN IF NOT EXISTS situation_matrimoniale  TEXT,
  ADD COLUMN IF NOT EXISTS du1                     NUMERIC(12,2) NOT NULL DEFAULT 0,  -- 1ère tranche (D.U.1)
  ADD COLUMN IF NOT EXISTS du2                     NUMERIC(12,2) NOT NULL DEFAULT 0,  -- 2ème tranche (D.U.2)
  ADD COLUMN IF NOT EXISTS cas_social              BOOLEAN NOT NULL DEFAULT false;

-- Index utiles pour le regroupement par niveau / filière lors de l'export
CREATE INDEX IF NOT EXISTS idx_students_niveau_filiere ON public.students(niveau, filiere);
