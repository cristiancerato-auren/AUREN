# AUREN Living — checklist pre-pubblicazione

Questo documento descrive ciò che deve essere completato prima di attivare gli acquisti. Il codice e la migrazione nel ramo di sviluppo non equivalgono a un negozio operativo.

## Stato attuale

- [x] Vetrina collegata al catalogo previsto.
- [x] Carrello con quantità e varianti.
- [x] Checkout server-side preparato: il browser invia solo identificativi e quantità.
- [x] Prezzi e disponibilità ricalcolati e bloccati in transazione SQL.
- [x] Struttura Stripe Checkout e webhook con verifica firma.
- [x] Area cliente con cronologia ordini, protetta dalle policy RLS previste.
- [x] Pannello admin per catalogo, varianti, ordini e aggiornamento tracking.
- [x] Bozze informative privacy e condizioni di vendita, marcate chiaramente come non definitive.
- [ ] Migrazione SQL testata su database isolato e poi approvata.
- [ ] Verifica RLS con account anonimo, cliente A, cliente B e amministratore.
- [ ] Tariffa e regole di spedizione decise e verificate.
- [ ] Dati legali del venditore inseriti e informativa/condizioni revisionate.
- [ ] Modalità Stripe test configurata, webhook registrato e segreti impostati.
- [ ] Test end-to-end: pagamento riuscito, annullamento, scadenza, retry webhook, stock concorrente.
- [ ] Email transazionali e riconciliazione pagamenti implementate e collaudate.
- [ ] Backup verificato, piano di rollback e approvazione esplicita prima del rilascio.

## Dati commerciali da definire

1. Identità del venditore: denominazione, sede, partita IVA, contatti assistenza e privacy.
2. Regime fiscale e modalità di esposizione dei prezzi.
3. Paesi e aree di consegna, corriere, tariffe, soglia di spedizione gratuita e tempi.
4. Indirizzo e procedura resi, gestione recesso, rimborsi e garanzia.
5. Categorie prodotto, marchi autorizzati, immagini, SKU, prezzi, stock e varianti.

## Collaudo tecnico richiesto

### Database e autorizzazioni
- Applicare la migrazione solo in un progetto/database di test dopo aver verificato il backup.
- Verificare che anon possa leggere solo prodotti e varianti attivi.
- Verificare che un cliente possa leggere solo i propri ordini e le relative righe.
- Verificare che un cliente non possa inserire o modificare ordini, prezzi, stock o tracking.
- Verificare che solo gli amministratori possano gestire catalogo, varianti e spedizioni.
- Verificare che le funzioni SQL privilegiate siano eseguibili solo da `service_role`.

### Pagamenti
- Usare esclusivamente chiavi Stripe test durante il collaudo.
- Verificare firma webhook, importo, valuta, ID sessione e stato ordine.
- Simulare eventi duplicati, fuori ordine, scaduti e pagamenti ritardati.
- Predisporre riconciliazione per pagamenti ricevuti quando un webhook fallisce.
- Definire una procedura manuale per rimborsi e contestazioni prima di accettare ordini.

### Pubblicazione
- Non applicare migrazioni al database live senza backup verificato e approvazione.
- Non distribuire funzioni con segreti live finché i test non sono superati.
- Non unire il ramo di sviluppo in `main` senza approvazione esplicita.
- Verificare il sito pubblicato, HTTPS, email, privacy, condizioni, spedizione e checkout da desktop e mobile.

## Configurazione server prevista

Segreti da impostare solo nell'ambiente server Supabase, mai nel browser o nel repository:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY` (prima test)
- `STRIPE_WEBHOOK_SECRET`
- `SITE_URL`
- `SHIPPING_FLAT_RATE_CENTS`

L'assenza della tariffa di spedizione deve mantenere il checkout disabilitato: non impostare un valore arbitrario per sbloccarlo.

## Vincoli di rilascio

Questo ramo è sviluppo. Nessun elemento di questa checklist autorizza automaticamente modifiche a produzione, creazione di risorse a pagamento, migrazioni live, attivazione di pagamenti reali o pubblicazione delle bozze legali.
