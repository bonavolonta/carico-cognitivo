# Carico Cognitivo, Apprendimento Multimediale e Accessibilità Didattica

Portale web multipagina statico, autonomo e accessibile dedicato alla **Teoria del Carico Cognitivo (CLT)**, alla **Teoria Cognitiva dell'Apprendimento Multimediale (CTML)**, alla **metacognizione** e alla **progettazione didattica inclusiva (UDL / BES)**.

Zero dipendenze esterne o CDN: tutte le risorse HTML, CSS, JavaScript e gli schemi vettoriali SVG sono autocontenuti per il funzionamento immediato sia in locale (`file://` o server HTTP statico) sia su **GitHub Pages**.

---

## Struttura del Sito (6 Pagine Navigate)

| Pagina | Contenuti Principali |
| :--- | :--- |
| [`index.html`](index.html) | **Fondamenti** — Capitoli 1, 2 e 3: inquadramento epistemologico (Ianes, EBE, Embodied Mind), architettura della memoria umana (WM, MLT, curva dell'oblio, Ausubel, schemi mentali, organizzatori grafici), tripartizione CLT e laboratori interattivi (*Chunking*, *Curva dell'Oblio*, *Efficienza Paas*). |
| [`multimedialita.html`](multimedialita.html) | **Multimedialità** — Capitoli 4 e 5: principi CTML di Mayer, riduzione del carico estraneo, gestione dell'intrinseco, potenziamento del rilevante, *Expertise Reversal Effect*, *Backward Fading*, ciclo EEF e regia verbale con *Wait Time*. |
| [`inclusione.html`](inclusione.html) | **Inclusione** — Capitolo 6: profili funzionali e vulnerabilità al sovraccarico (DSA, ADHD, Disabilità Intellettiva / FIL), educazione all'autoregolazione cognitiva degli studenti e raccordo tra CLT, strumenti compensativi e *Universal Design for Learning (UDL)*. |
| [`laboratori.html`](laboratori.html) | **Laboratori & 3D** — **Simulatore 3D WebGL / Canvas 2D** in tempo reale (`sim3d.js`) e Capitolo 7 (7.1–7.3): protocollo di *Think-Aloud* e 4 laboratori operativi *Prima / Dopo* (Infanzia, Primaria, Secondaria I grado, Secondaria II grado). |
| [`schemi-didattici.html`](schemi-didattici.html) | **Schemi Didattici** — **Atlante interattivo di 14 schemi HTML/SVG originali** con doppia vista comparativa, espansione in finestra modale, filtri per area teorica, autoverifiche lampo e fallback autonomo per consultazione/embed standalone. |
| [`valutazione-risorse.html`](valutazione-risorse.html) | **Valutazione & Risorse** — Sezione 7.4 (*Griglia di Audit a 10 indicatori*, *Diario DAM*, *Prompt IA P03* con copia rapida) e Capitolo 8 (*Test interattivo di autovalutazione a 10 quesiti* con chiave analitica, mappa delle risorse e bibliografia scientifica completa). |

---

## Funzionalità Principali

- **Navigazione multipagina accessibile**: barra superiore sticky con menu responsivo (`popover="auto"` su mobile, barra orizzontale su desktop), *breadcrumb* di percorso, indice contestuale laterale con *scrollspy* e paginazione *Precedente / Successiva*.
- **Ricerca globale e locale**: barra di ricerca nella sidebar che interroga l'indice trasversale su tutte le 6 pagine (`search-index.js`) ed evidenzia in tempo reale le occorrenze nella pagina attiva.
- **Controlli UDL persistenti**: selettore *Font Leggibile*, *Spaziatura +*, modalità *Solo Testo* e tema *Auto / Chiaro / Scuro* salvati in `localStorage` tra una pagina e l'altra.
- **Zero asset raster pesanti**: tutti i modelli concettuali sono resi tramite codice HTML semantico e diagrammi SVG accessibili (`role="img"`, alto contrasto in tema chiaro, scuro e `forced-colors`).

---

## Pubblicazione su GitHub Pages

1. Assicurati che il file `.nojekyll` resti nella radice pubblicata.
2. Verifica tutti i file in locale prima del push (`node --check app.js`, `node --check sim3d.js`, controllo link interni e zero risorse esterne).
3. Esegui il commit e il push verso il ramo configurato su GitHub Pages (`main` o `docs/`).
