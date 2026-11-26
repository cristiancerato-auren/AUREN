# AUREN — checklist generale di rilascio

Questo documento separa le funzionalità preparate nel codice dalle attività che richiedono dati reali, configurazione o autorizzazione del titolare.

## Pagine e percorsi

- [x] Homepage con identità AUREN e accesso ai quattro mondi.
- [x] Properties: ricerca, schede, account, invio annunci in moderazione e area admin.
- [x] Living: catalogo, carrello, varianti, checkout Stripe predisposto, area ordini e pannello catalogo.
- [x] Studio: catalogo dinamico collegato ai servizi attivi e ai prezzi gestiti dall'admin; richieste collegate all'ID del servizio e con email o telefono.
- [x] Journal: pagina editoriale e interfaccia newsletter con consenso esplicito; la migrazione per registrare versione e timestamp del consenso è preparata ma NON applicata al database operativo. L’iscrizione resta quindi da attivare dopo la migrazione approvata.
- [x] Account cliente e pannelli amministrativi separati.
- [x] Privacy e condizioni presenti come bozze, non pubblicabili come documenti definitivi.

## Da collaudare prima del rilascio

- [x] Pipeline GitHub Actions superata: controlli statici HTML/JavaScript e type-check delle Edge Functions (commit `02d2c82`).
- [ ] Testare registrazione, login, logout, recupero password e protezione delle password compromesse. Il controllo password compromesse risulta ancora disattivato nel progetto Supabase.
- [ ] Testare Properties con account privato, account agenzia, utente non autenticato e amministratore.
- [ ] La migrazione `20261126000200_auren_private_property_storage.sql` rende privato il bucket immagini, limita i file a JPG/PNG/WebP da massimo 5 MB e consente link firmati solo a immagini di annunci pubblicati o al proprietario/amministratore. È preparata ma NON applicata al database operativo: applicarla soltanto dopo aver distribuito il frontend compatibile e testato la preview.
- [ ] Il database operativo non contiene ancora `consent_version` e `consent_at`: applicare la migrazione `20261124000100_auren_journal_consent.sql` solo dopo backup e approvazione; poi testare la registrazione del consenso. Non creare un branch Supabase a pagamento per lo staging.
- [ ] Testare richieste Studio da anonimo e autenticato; verificare anti-spam e gestione richieste. La newsletter resta sospesa finché la migrazione del consenso non è approvata e applicata.
- [ ] Popolare il catalogo Living con prodotti, fotografie, varianti, prezzi, SKU e disponibilità reali.
- [ ] Popolare il catalogo Studio con nomi, descrizioni e prezzi approvati dal titolare.
- [x] Preparata migrazione di hardening per impedire l'auto-promozione del profilo ad admin e limitare le richieste pubbliche ai servizi attivi.
- [ ] Applicare e collaudare le migrazioni di consenso e hardening in un progetto Supabase isolato.
- [ ] Testare tutte le policy RLS con utenti distinti e ruolo admin.
- [ ] Eseguire le migrazioni Living in un ambiente di test locale o separato e gratuito, se disponibile; mai direttamente sul database operativo. Nessun branch Supabase a pagamento.
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
- GitHub Pages non è una destinazione ammessa per ospitare un’attività online o un e-commerce secondo i limiti ufficiali del servizio; prima del lancio commerciale va scelta una piattaforma hosting compatibile. Non cambiare DNS durante questa fase.
- Non usare dati dimostrativi come annunci, prodotti, tariffe o disponibilità reali.
- Non inserire segreti nel codice frontend o nel repository.
- Non applicare migrazioni al database operativo, distribuire funzioni, attivare pagamenti reali o unire in `main` senza approvazione esplicita.
- Nessuna risorsa a pagamento deve essere attivata senza autorizzazione.
