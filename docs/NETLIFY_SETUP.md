# Netlify Free — collegamento e preview AUREN

## Scopo
Pubblicare una preview del ramo `auren-living-development` su un URL temporaneo Netlify, senza toccare `aurenliving.it`, DNS Aruba o il sito attuale.

## Costi e protezioni
- Scegli esclusivamente il piano **Free — $0**.
- Il piano Free attuale include 300 crediti mensili con limite rigido; non abilita la ricarica automatica. Quando i crediti si esauriscono, le funzioni a consumo si fermano fino al rinnovo.
- Non selezionare Personal, Pro, add-on, credit pack o auto-recharge.
- Non inserire una carta per questa preview e non confermare upgrade.

## Procedura
1. Apri Netlify e accedi con il tuo account, oppure crea un account gratuito.
2. Scegli **Add new site / Import an existing project** e collega GitHub.
3. Seleziona il repository pubblico `cristiancerato-auren/AUREN`.
4. Imposta il branch di deploy su `auren-living-development`.
5. Build command: lascia vuoto.
6. Publish directory: `.` (radice del repository).
7. Conferma il deploy soltanto sul piano Free.
8. Apri l'URL temporaneo `*.netlify.app` e verifica homepage, Properties, Studio, Journal, Living, account e pagine admin.

## Verifiche prima di qualsiasi DNS
- Controlla che la console browser non mostri errori JavaScript o CSP.
- Verifica che `_headers` applichi CSP, HSTS, X-Content-Type-Options, Referrer-Policy e Permissions-Policy.
- Verifica che account e admin non vengano memorizzati in cache e siano marcati noindex.
- Non inviare annunci, richieste, newsletter o dati personali reali dalla preview: la versione attuale usa il progetto Supabase operativo.
- Non modificare la sezione Domains e non inserire `aurenliving.it` in Netlify durante questo test.

## Sequenza per il futuro passaggio
Il bucket immagini live è ancora pubblico. Prima di applicare la migrazione privata:
1. verificare il frontend firmato nella preview;
2. concordare il momento di rilascio e preparare un rollback;
3. applicare `20261126000200_auren_private_property_storage.sql` al progetto Supabase operativo;
4. distribuire il frontend compatibile;
5. solo dopo i test, valutare il cambio DNS con approvazione esplicita.

Non eseguire la migrazione Storage mentre il vecchio frontend pubblico è ancora quello servito ai visitatori.
