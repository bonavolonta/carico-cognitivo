# Carico Cognitivo, Architettura della Memoria e Accessibilità — Edizione Web Didattica

Versione web statica, interattiva e pubblicabile direttamente su **GitHub Pages** della dispensa scientifica:
`DISPENSA_CARICO_COGNITIVO_E_ACCESSIBILITA.md` (Corso di Specializzazione TFA Sostegno — Università degli Studi di Cagliari, *Didattica speciale: approccio metacognitivo e cooperativo*, Prof. Gianmarco Bonavolontà).

## Garanzia di Integrità dei Contenuti
Tutti i contenuti testuali, le citazioni, gli esempi disciplinari, le tabelle, le formule, i quesiti a scelta multipla con soluzioni analitiche e la bibliografia scientifica sono riportati **integralmente e senza alcuna alterazione**. Gli apparati visivi, gli schemi vettoriali SVG, il simulatore 3D WebGL, le slide del corso e i laboratori interattivi sono affiancati al testo in blocchi chiaramente contraddistinti (e disattivabili in lettura con il pulsante **Solo testo dispensa**).

## Caratteristiche Didattiche e Tecniche
- **100% autonomo (Zero-CDN):** funziona senza connessione esterna e direttamente su GitHub Pages, server locale o doppio clic su `index.html`.
- **Simulatore 3D WebGL (con fallback automatico isometrico Canvas2D):** modello interattivo dell'architettura cognitiva umana (Doppi Canali CTML, Collo di Bottiglia `4±1`, Memoria di Lavoro con carichi Intrinseco / Estraneo / Germane, Rete di Schemi MLT) con 7 scenari didattici pronti (*Acido Acetilsalicilico novizio vs esperto*, *Expertise Reversal Effect*, *Split-Attention*, *Effetto Modalità*, *Underload*).
- **Laboratori Didattici Interattivi:** prova pratica di Memoria di Lavoro & Chunking, Curva dell'Oblio di Ebbinghaus vs Pratica Distribuita, Calcolatore di Efficienza dell'Apprendimento (Paas & van Merriënboer, 1993), Checklist di Auditing in 10 Indicatori esportabile, Quiz interattivo con feedback immediato, Galleria filtrabile di 36 slide reali del corso con lightbox ingrandibile.
- **Accessibilità UDL:** supporto nativo tema Chiaro / Scuro / Auto, ingrandimento OS del testo (`text-scale`), font ad alta leggibilità, interlinea estesa, navigazione completa da tastiera e ricerca istantanea nel documento.

## Pubblicazione su GitHub Pages
1. Carica l'intero contenuto di questa cartella in un repository GitHub (o in una sottocartella / branch dedicata `main` o `gh-pages`).
2. Il file `.nojekyll` già incluso evita elaborazioni Jekyll superflue.
3. Su GitHub, apri **Settings → Pages**, seleziona il branch (`main`) e la cartella radice (`/ (root)` oppure la cartella caricata) e salva: il sito sarà online in ~60 secondi.

## Anteprima Locale
```bash
python3 -m http.server 8080
```
Poi apri `http://localhost:8080/`.
