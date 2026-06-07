
# Piano: App Voto Colleghi – Dipendente del Mese/Anno

App mobile-first per votare colleghi una volta al mese, con classifiche, dashboard direzionale e premi automatici. Backend su Lovable Cloud, login con codice fornito dall'azienda, anagrafica importata via CSV.

## Fase 1 — Fondamenta (questa iterazione)

### Backend (Lovable Cloud)
Tabelle principali:
- `employees`: id, nome, cognome, telefono, codice_accesso (univoco), mansione, negozio, data_assunzione, foto_url, attivo, escluso_premi, motivo_esclusione, device_id (associato al primo login)
- `admins`: gestione utenti amministratori (ruolo via tabella `user_roles` separata, RLS sicura)
- `voting_periods`: anno, mese, stato (aperto/chiuso)
- `votes`: id, period_id, voter_id, voted_id, criterio (8 enum), voto (1-5), created_at, device_fingerprint, ip
- `comments`: period_id, voter_id (anonimizzato in lettura), voted_id, punto_forza, suggerimento
- `disciplinary_actions`: employee_id, data, descrizione, penalità
- `audit_log`: registrazione voti per antifrode

RLS: dipendenti vedono solo i propri dati e l'elenco colleghi (senza voti altrui); admin via `has_role(auth.uid(),'admin')`.

### Frontend mobile-first
- **Login** (`/`): inserimento codice accesso → associa device → sessione persistente
- **Home dipendente** (`/vota`): lista colleghi raggruppati per mansione (alfabetico), badge "da votare/votato", progress mese
- **Schermata voto** (`/vota/$id`): foto, nome, mansione, negozio + 8 slider/stelle (1-5) + 2 campi opzionali (punto forza / suggerimento)
- **Le mie classifiche** (`/classifiche`): Top 10 aziendale, per negozio, per mansione, con TEAM SCORE
- **Area admin** (`/admin`): login admin separato
  - Import CSV anagrafica (drag&drop)
  - Gestione periodi, dipendenti, esclusioni, richiami disciplinari
  - Dashboard: % completamento, trend mensile, confronti negozio/mansione, clima aziendale
  - Premi: Dipendente del Mese / Anno (calcolo automatico con condizioni)

### Logica
- TEAM SCORE = somma medie 8 criteri normalizzata su 100
- Antifrode: blocco auto-voto, una sola votazione/collega/mese (vincolo DB), device fingerprint, rilevamento pattern (scambi reciproci, voti tutti uguali)
- Anonimato: query pubbliche non espongono `voter_id`

### Design
Mobile-first, tono moderno aziendale italiano: palette blu-petrolio + accenti oro per i premi, tipografia pulita (Manrope display + Inter body), card morbide con ombre eleganti, micro-animazioni su voto (stelle pulsanti), badge "🏆 Dipendente del Mese".

## Fase 2 — Estensioni (iterazione successiva)
- Notifiche promemoria fine mese
- Esportazione PDF classifiche
- Grafici trend annuali avanzati
- Multi-azienda

## Dettagli tecnici

```text
src/
├── routes/
│   ├── index.tsx                    # Login dipendente
│   ├── vota.tsx                     # Lista colleghi
│   ├── vota.$id.tsx                 # Form voto
│   ├── classifiche.tsx              # Top 10 / negozio / mansione
│   ├── _admin/
│   │   ├── route.tsx                # Gate admin
│   │   ├── dashboard.tsx
│   │   ├── dipendenti.tsx           # CRUD + import CSV
│   │   ├── periodi.tsx
│   │   ├── esclusioni.tsx
│   │   └── premi.tsx
│   └── _authenticated/route.tsx     # (gestito da integrazione)
├── lib/
│   ├── voting.functions.ts          # server fns calcolo classifiche, team score
│   ├── employees.functions.ts       # import CSV, CRUD
│   └── anti-fraud.server.ts
└── components/
    ├── StarRating.tsx
    ├── EmployeeCard.tsx
    └── Leaderboard.tsx
```

Il primo step attiva Lovable Cloud e crea schema DB + login dipendente + import CSV anagrafica + flusso voto base. Le classifiche e la dashboard admin arrivano subito dopo nella stessa iterazione.

Procedo?
