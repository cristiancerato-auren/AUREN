# AUREN Visual Editor

## Accesso
Apri `admin-design.html` dopo aver effettuato l'accesso con un account il cui profilo Supabase ha `account_type = 'admin'`. Il collegamento è disponibile anche dalla navigazione di `admin.html`.

## Funzioni incluse nella prima versione
- Modifica dei colori principali, sfondo, accento e superfici delle schede.
- Scelta del font tra famiglie di sistema supportate.
- Modifica del titolo e del testo hero della homepage.
- Riordino delle sezioni homepage con drag-and-drop e pulsanti su/giù.
- Nascondere/mostrare le sezioni esistenti.
- Creazione e rimozione di un massimo di 12 blocchi editoriali personalizzati.
- Salvataggio della configurazione in Supabase, con lettura pubblica della sola chiave homepage e scrittura riservata agli amministratori via RLS.

## Attivazione
La migrazione `20261127000100_auren_visual_site_editor.sql` crea `public.site_settings`. È versionata ma NON applicata al progetto live. Prima va verificata in ambiente di sviluppo/preview, poi applicata al progetto operativo solo con approvazione esplicita. Finché la tabella non esiste, l'editor si apre in modalità anteprima ma non può salvare online.

## Limiti consapevoli della prima versione
- L'editor controlla la homepage e i suoi blocchi editoriali, non ogni pagina interna.
- Non permette di modificare direttamente il markup arbitrario o inserire HTML/script.
- Le immagini e le schede immobiliari continuano a essere gestite nei rispettivi pannelli.
- Il pulsante di salvataggio scrive configurazione nel database; la pubblicazione del codice/nuove funzionalità resta gestita tramite GitHub e Netlify.
