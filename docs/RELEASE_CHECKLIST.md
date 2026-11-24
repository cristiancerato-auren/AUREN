# AUREN — checklist generale di rilascio

Questo documento separa le funzionalità preparate nel codice dalle attività che richiedono dati reali, configurazione o autorizzazione del titolare.

## Pagine e percorsi

- [x] Homepage con identità AUREN e accesso ai quattro mondi.
- [x] Properties: ricerca, schede, account, invio annunci in moderazione e area admin.
- [x] Living: catalogo, carrello, varianti, checkout Stripe predisposto, area ordini e pannello catalogo.
- [x] Studio: catalogo dinamico collegato ai servizi attivi e ai prezzi gestiti dall'admin; richieste collegate all'ID del servizio e con email o telefono.
- [x] Journal: pagina editoriale e iscrizione newsletter con consenso esplicito; migrazione dedicata per registrare versione del consenso e timestamp server.
- [x] Account cliente e pannelli amministrativi separati.
- [x] Privacy e condizioni presenti come bozze, non pubblicabili come documenti definitivi.

## Da collaudare prima del rilascio

- [x] Pipeline GitHub Actions superata: controlli statici HTML/JavaScript e type-check delle Edge Functions (commit `02d2c82`).
- [ ] Testare registrazione, login, logout, recupero password e protezione delle password compromesse. Il controllo password compromesse risulta ancora disattivato nel progetto Supabase.
- [ ] Testare Properties con account privato, account agenzia, utente non autenticato e amministratore.
- [ ] Verificare upload, dimensione, tipo e accesso alle immagini; controllare che un utente non possa modificare annunci altrui.
- [ ] Applicare in staging la migrazione `20261124000100_auren_journal_consent.sql` e verificare che ogni nuova iscrizione registri la versione del consenso e il timestamp server.
- [ ] Testare richieste Studio e newsletter da anonimo e da utente autenticato; verificare anti-spam, duplicati e gestione richieste.
- [ ] Popolare il catalogo Living con prodotti, fotografie, varianti, prezzi, SKU e disponibilità reali.
- [ ] Popolare il catalogo Studio con nomi, descrizioni e prezzi approvati dal titolare.
- [x] Preparata migrazione di hardening per impedire l'auto-promozione del profilo ad admin e limitare le richieste pubbliche ai servizi attivi.
- [ ] Applicare e collaudare le migrazioni di consenso e hardening in un progetto Supabase isolato.
- [ ] Testare tutte le policy RLS con utenti distinti e ruolo admin.
- [ ] Eseguire le migrazioni Living su un ambiente isolato, mai direttamente sul database operativo.
- [ ] Configurare Stripe in modalità test, verificare webhook, importi, annullamenti, scadenze, retry e rimborsi.
- [ ] Configurare Resend e collaudare email ordine/spedizione su dominio verificato.
- [ ] Definire tariffe, zone, corrieri e tempi di consegna.
- [ ] Verificare backup, ripristino e piano di rollback.
- [ ] Testare navigazione, accessibilità, prestazioni e responsive su desktop e mobile.

## Dati e decisioni del titolare

- [ ] Denominazione del venditore, sede, partita IVA e recapiti ufficiali.
- [ ] Definire chi è il venditore dei prodotti Living e chi eroga i servizi Studio.
- [ ] Definire prezzi, imposte, fatturazione, spedizioni, resi, recesso e garanzie.
- [ ] Approvare privacy policy, cookie policy, condizioni di vendita e informative newsletter con professionista competente.
- [ ] Definire contenuti editoriali originali e calendario del Journal.
- [ ] Definire piani, eventuali abbonamenti e condizioni economiche per agenzie e inserzionisti Properties.
- [ ] Definire modalità di moderazione, segnalazione annunci e gestione richieste.
- [ ] Confermare le attività e i codici ATECO compatibili con l'attività effettivamente esercitata prima di vendere o fatturare.

## Regole di rilascio

- Il ramo di sviluppo non equivale al sito operativo.
- Non usare dati dimostrativi come annunci, prodotti, tariffe o disponibilità reali.
- Non inserire segreti nel codice frontend o nel repository.
- Non applicare migrazioni al database operativo, distribuire funzioni, attivare pagamenti reali o unire in `main` senza approvazione esplicita.
- Nessuna risorsa a pagamento deve essere attivata senza autorizzazione.
