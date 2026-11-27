# AUREN Living — checkout server-side

Queste funzioni sono preparate nel ramo `auren-living-development`. **Non sono distribuite nel progetto Supabase e non elaborano pagamenti reali.**

## Funzioni

- `create-living-checkout`: valida i dati ricevuti, identifica l'utente se autenticato, chiama la funzione SQL transazionale che blocca le quantità e ricalcola prezzi e totali dal catalogo, crea una sessione Stripe Checkout e registra il suo ID.
- `stripe-living-webhook`: verifica la firma Stripe sul corpo HTTP originale, conferma l'ordine solo dopo l'evento di pagamento riuscito, invia la conferma email con protezione dai duplicati e rilascia le quantità quando la sessione scade.
- `send-living-order-email`: richiede una sessione utente valida e verifica il ruolo admin prima di inviare l'email di spedizione.
- La funzione SQL `create_living_order_reservation` è concessa solo a `service_role`; il browser non può creare ordini o modificare prezzi.
- `release_living_order_reservation` è idempotente: un ordine non pending non restituisce nuovamente le quantità.

## Segreti richiesti per una futura distribuzione

Configurare esclusivamente come Supabase Edge Function secrets, mai nel repository o nel browser:

- `STRIPE_SECRET_KEY` — chiave Stripe **test** durante il collaudo.
- `STRIPE_WEBHOOK_SECRET` — segreto endpoint webhook Stripe.
- `SUPABASE_SERVICE_ROLE_KEY` — chiave service role del progetto.
- `SUPABASE_URL` — URL progetto.
- `SITE_URL` — origine HTTPS del sito, ad esempio `https://aurenliving.it`.
- `RESEND_API_KEY` — chiave Resend, solo come secret server-side.
- `LIVING_ORDER_EMAIL_FROM` — mittente su un dominio verificato in Resend (non usare un mittente non verificato).
- Le tariffe di spedizione sono gestite nella tabella `living_shipping_zones`: Italia, Europa, Regno Unito e Svizzera, America, Asia e Oceania, Resto del mondo. Ogni zona resta disattivata finché un amministratore non inserisce e attiva una tariffa verificata.

La funzione checkout usa anche la sessione utente opzionale nell'header Authorization. L'acquisto guest è possibile con email e indirizzo di spedizione validi.

## Sequenza di attivazione (non ancora eseguita)

1. Eseguire un backup verificato del database e provare la migrazione su un ambiente di test isolato.
2. Applicare la migrazione commerce solo dopo revisione e approvazione esplicita.
3. Configurare Stripe in modalità test, Resend e i segreti Supabase (`RESEND_API_KEY`, `LIVING_ORDER_EMAIL_FROM`). Verificare il dominio mittente prima dei test.
4. Distribuire le tre Edge Functions e registrare l'URL webhook Stripe per gli eventi:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.expired`
5. Collegare il pulsante checkout del frontend alle funzioni e testare pagamenti riusciti, annullati, scaduti, ripetuti, email duplicate e invii di spedizione.
6. Solo dopo i test, valutare l'attivazione live e la pubblicazione.

## Limiti da completare prima della vendita reale

- Le tariffe delle sei zone devono essere definite, verificate con il corriere e comunicate al cliente; le zone non configurate restano disabilitate lato server.
- La funzione checkout richiede email e indirizzo di spedizione; non gestisce ancora imposte, fatturazione, resi o rimborsi.
- Serve un processo di riconciliazione per sessioni Stripe pagate ma webhook temporaneamente non recapitati.
- La conferma ordine e le email transazionali sono predisposte nel codice ma non ancora distribuite né collaudate; la pagina di conferma ordine resta da completare.
- Prima della pubblicazione servono test end-to-end, revisione sicurezza e verifica degli obblighi legali e fiscali.

Non distribuire le funzioni e non applicare la migrazione al progetto live finché i punti sopra non sono stati verificati.
