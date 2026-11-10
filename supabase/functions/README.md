# AUREN Living — checkout server-side

Queste funzioni sono preparate nel ramo `auren-living-development`. **Non sono distribuite nel progetto Supabase e non elaborano pagamenti reali.**

## Funzioni

- `create-living-checkout`: valida i dati ricevuti, identifica l'utente se autenticato, chiama la funzione SQL transazionale che blocca le quantità e ricalcola prezzi e totali dal catalogo, crea una sessione Stripe Checkout e registra il suo ID.
- `stripe-living-webhook`: verifica la firma Stripe sul corpo HTTP originale, conferma l'ordine solo dopo l'evento di pagamento riuscito e rilascia le quantità quando la sessione scade.
- La funzione SQL `create_living_order_reservation` è concessa solo a `service_role`; il browser non può creare ordini o modificare prezzi.
- `release_living_order_reservation` è idempotente: un ordine non pending non restituisce nuovamente le quantità.

## Segreti richiesti per una futura distribuzione

Configurare esclusivamente come Supabase Edge Function secrets, mai nel repository o nel browser:

- `STRIPE_SECRET_KEY` — chiave Stripe **test** durante il collaudo.
- `STRIPE_WEBHOOK_SECRET` — segreto endpoint webhook Stripe.
- `SUPABASE_SERVICE_ROLE_KEY` — chiave service role del progetto.
- `SUPABASE_URL` — URL progetto.
- `SITE_URL` — origine HTTPS del sito, ad esempio `https://aurenliving.it`.

La funzione checkout usa anche la sessione utente opzionale nell'header Authorization. L'acquisto guest è possibile con email e indirizzo di spedizione validi.

## Sequenza di attivazione (non ancora eseguita)

1. Eseguire un backup verificato del database e provare la migrazione su un ambiente di test isolato.
2. Applicare la migrazione commerce solo dopo revisione e approvazione esplicita.
3. Configurare Stripe in modalità test e i segreti Supabase.
4. Distribuire le due Edge Functions e registrare l'URL webhook Stripe per gli eventi:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.expired`
5. Collegare il pulsante checkout del frontend alla funzione e testare pagamenti riusciti, annullati, scaduti, ripetuti e disponibilità concorrente.
6. Solo dopo i test, valutare l'attivazione live e la pubblicazione.

## Limiti da completare prima della vendita reale

- Spedizioni e relativi costi sono attualmente impostati a zero: non attivare vendite finché non sono configurati e mostrati al cliente.
- La funzione checkout richiede email e indirizzo di spedizione; non gestisce ancora imposte, fatturazione, resi o rimborsi.
- Serve un processo di riconciliazione per sessioni Stripe pagate ma webhook temporaneamente non recapitati.
- La UI checkout, la pagina di conferma ordine e le email transazionali non sono ancora collegate.
- Prima della pubblicazione servono test end-to-end, revisione sicurezza e verifica degli obblighi legali e fiscali.

Non distribuire le funzioni e non applicare la migrazione al progetto live finché i punti sopra non sono stati verificati.
