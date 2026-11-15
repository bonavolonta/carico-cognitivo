/* ==========================================================================
   app.js — Didactic Interactive Labs, Multi-Page Navigation, Global Search,
            Interactive Schemas & UDL UX
   Zero external dependencies | Modern Web Guidance compliant
   ========================================================================== */
(function () {
  "use strict";

  const QUIZ_KEY = [
    { q: 1, ans: "b", exp: "Miller (1956): 7 ± 2 chunk nella ritenzione immediata e decadimento 20–30 s senza reiterazione; Cowan (2001)/Sweller: 4 ± 1 elementi nella manipolazione attiva simultanea." },
    { q: 2, ans: "c", exp: "David Ausubel (1968): il singolo fattore più importante che influenza l'apprendimento sono le conoscenze che lo studente già possiede (apprendimento significativo per ancoraggio)." },
    { q: 3, ans: "c", exp: "Il carico intrinseco nasce dall'interazione tra la complessità (interattività degli elementi) del contenuto e il livello di expertise dello studente (Sweller, 1998)." },
    { q: 4, ans: "b", exp: "La capienza biologica della WM è simile tra novizi ed esperti; l'esperto richiama dalla MLT interi schemi automatizzati come singolo chunk (Sweller, 2003)." },
    { q: 5, ans: "b", exp: "Pre-training, chunking (segmentazione), sequencing graduale e verifiche continue della comprensione governano il carico cognitivo intrinseco senza eliminare l'obiettivo (van Merriënboer & Sweller, 2005)." },
    { q: 6, ans: "b", exp: "La separazione spaziale tra figura, misure e legenda genera l'Effetto dell'Attenzione Divisa (Split-Attention Effect; Landriscina, 2007; Mayer, 2021)." },
    { q: 7, ans: "b", exp: "Animazioni non pertinenti (coerenza), lettura identica di testo a schermo (ridondanza), rumore ambientale (Bonaiuti, 2014) e ritmo elevato (transitorietà) sommano carico estraneo bloccando il germane." },
    { q: 8, ans: "b", exp: "Expertise Reversal Effect (Kalyuga et al., 2003): guide dettagliate progettate per novizi diventano carico estraneo per l'esperto; occorre applicare guidance fading e differenziazione." },
    { q: 9, ans: "c", exp: "Separare la fase ideativa/argomentativa dalla revisione ortografica libera la WM dal controllo non automatizzato nella disortografia, preservando l'obiettivo storico (Cornoldi, 2007; Ianes, 1996)." },
    { q: 10, ans: "b", exp: "L'adattamento efficace rimuove le barriere (carico estraneo), mantiene intatto ed esplicito l'obiettivo cognitivo autentico e sostiene le strategie autoregolative (Ianes, 1996)." }
  ];

  function setupThemeAndReadingControls() {
    const html = document.documentElement;
    const body = document.body;
    const btnAuto = document.getElementById("theme-auto");
    const btnLight = document.getElementById("theme-light");
    const btnDark = document.getElementById("theme-dark");
    const themeBtns = [
      [btnAuto, "auto"],
      [btnLight, "light"],
      [btnDark, "dark"]
    ];

    function applyTheme(mode) {
      if (mode === "light" || mode === "dark") {
        html.setAttribute("data-theme", mode);
      } else {
        html.removeAttribute("data-theme");
        mode = "auto";
      }
      try { localStorage.setItem("cc-theme", mode); } catch (_) {}
      themeBtns.forEach(([b, m]) => {
        if (b) b.setAttribute("aria-pressed", String(m === mode));
      });
    }

    let savedTheme = "auto";
    try { savedTheme = localStorage.getItem("cc-theme") || "auto"; } catch (_) {}
    applyTheme(savedTheme);
    themeBtns.forEach(([b, m]) => {
      if (b) b.addEventListener("click", () => applyTheme(m));
    });

    const toggleReadable = document.getElementById("udl-font");
    const toggleSpacing = document.getElementById("udl-spacing");
    const toggleClean = document.getElementById("udl-clean");

    function bindBodyToggle(btn, attr, valOn, storageKey, onToggle) {
      if (!btn) return;
      let saved = false;
      try { saved = localStorage.getItem(storageKey) === "true"; } catch (_) {}
      if (saved) {
        body.setAttribute(attr, valOn);
        btn.setAttribute("aria-pressed", "true");
      } else {
        body.removeAttribute(attr);
        btn.setAttribute("aria-pressed", "false");
      }
      btn.addEventListener("click", () => {
        const cur = body.getAttribute(attr) === valOn;
        const next = !cur;
        if (next) {
          body.setAttribute(attr, valOn);
          btn.setAttribute("aria-pressed", "true");
        } else {
          body.removeAttribute(attr);
          btn.setAttribute("aria-pressed", "false");
        }
        try { localStorage.setItem(storageKey, String(next)); } catch (_) {}
        if (typeof onToggle === "function") onToggle(next);
      });
    }

    bindBodyToggle(toggleReadable, "data-font", "readable", "cc-font");
    bindBodyToggle(toggleSpacing, "data-spacing", "wide", "cc-spacing");
    bindBodyToggle(toggleClean, "data-clean-mode", "true", "cc-clean", (enabled) => {
      document.dispatchEvent(new CustomEvent("cc:clean-mode-change", { detail: { enabled } }));
    });
  }

  function setupResponsiveNavbar() {
    const topbar = document.querySelector(".topbar");
    const navRow = document.querySelector(".topbar-nav-row");
    const menuBtn = document.getElementById("menu-toggle-btn");
    const nav = document.getElementById("site-nav");
    if (!topbar || !navRow || !nav) return;

    const supportsPopover = "popover" in HTMLElement.prototype;

    function syncWideState() {
      const wide = navRow.getBoundingClientRect().width >= 1000;
      topbar.classList.toggle("is-wide", wide);
      if (supportsPopover) {
        if (wide) {
          try {
            if (typeof nav.hidePopover === "function" && nav.matches(":popover-open")) {
              nav.hidePopover();
            }
          } catch (_) {}
          nav.removeAttribute("popover");
          nav.classList.remove("is-popover-open");
          if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
        } else {
          nav.setAttribute("popover", "auto");
        }
      } else if (wide) {
        nav.classList.remove("is-popover-open");
        if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
      }
    }

    syncWideState();
    if ("ResizeObserver" in window) {
      new ResizeObserver(syncWideState).observe(navRow);
    } else {
      window.addEventListener("resize", syncWideState, { passive: true });
    }

    if (menuBtn) {
      if (supportsPopover) {
        nav.addEventListener("toggle", (e) => {
          menuBtn.setAttribute("aria-expanded", String(e.newState === "open"));
        });
      } else {
        menuBtn.removeAttribute("popovertarget");
        menuBtn.addEventListener("click", () => {
          const open = nav.classList.toggle("is-popover-open");
          menuBtn.setAttribute("aria-expanded", String(open));
        });
      }
    }
  }

  function setupScrollProgressAndSpy() {
    // Scroll Progress Fallback when animation-timeline: scroll() is unsupported
    const bar = document.querySelector(".scroll-progress-bar");
    const supportsTimeline = CSS && CSS.supports && CSS.supports("animation-timeline", "scroll()");
    if (bar && !supportsTimeline) {
      let ticking = false;
      function updateScroll() {
        const doc = document.documentElement;
        const max = Math.max(1, doc.scrollHeight - window.innerHeight);
        const ratio = Math.max(0, Math.min(1, window.scrollY / max));
        doc.style.setProperty("--scroll-progress-ratio", ratio.toFixed(4));
        ticking = false;
      }
      window.addEventListener("scroll", () => {
        if (!ticking) {
          requestAnimationFrame(updateScroll);
          ticking = true;
        }
      }, { passive: true });
      updateScroll();
    }

    // Scrollspy: native CSS scroll-target-group (:target-current) + dynamic topbar offset + deterministic fallback for hidden mobile drawer / non-Chromium browsers
    const topbarEl = document.querySelector(".topbar");
    const updateTopbarHeightVar = () => {
      if (!topbarEl) return;
      const h = Math.ceil(topbarEl.getBoundingClientRect().height);
      if (h > 0) {
        document.documentElement.style.setProperty("--topbar-height", h + "px");
      }
    };
    updateTopbarHeightVar();
    if (topbarEl && "ResizeObserver" in window) {
      new ResizeObserver(updateTopbarHeightVar).observe(topbarEl);
    } else {
      window.addEventListener("resize", updateTopbarHeightVar, { passive: true });
    }

    const sidebar = document.getElementById("sidebar-nav");
    const navLinks = Array.from(document.querySelectorAll(".toc-nav a[href^='#']"));
    const targets = navLinks
      .map((a) => ({ a, el: document.getElementById(a.getAttribute("href").slice(1)) }))
      .filter((x) => x.el);

    function isTargetVisible(el) {
      if (!el || !el.isConnected) return false;
      if (document.body.getAttribute("data-clean-mode") === "true" && el.closest(".enrichment-block:not(.keep-in-clean)")) {
        return false;
      }
      if (el.closest("[hidden]:not([hidden='until-found' i])")) return false;
      return el.getClientRects().length > 0;
    }

    function resolveActiveTargetByScroll() {
      const topbarH = topbarEl ? topbarEl.getBoundingClientRect().height : 72;
      const threshold = topbarH + 44;
      let active = null;
      let firstVisible = null;
      for (const item of targets) {
        if (!isTargetVisible(item.el)) continue;
        if (!firstVisible) firstVisible = item;
        const rect = item.el.getBoundingClientRect();
        if (rect.top <= threshold) {
          active = item;
        }
      }
      if (!active && firstVisible && window.scrollY < 260) {
        active = firstVisible;
      }
      return active ? active.a : null;
    }

    let lastAutoScrolledLink = null;
    function keepActiveTocLinkInView(activeLink, force) {
      if (!sidebar) return;
      if (!activeLink) {
        if (window.scrollY < 150) {
          lastAutoScrolledLink = null;
          if (sidebar.scrollTop > 0) sidebar.scrollTop = 0;
        }
        return;
      }
      if (!force && activeLink === lastAutoScrolledLink) return;
      if (sidebar.clientHeight <= 0 || sidebar.scrollHeight <= sidebar.clientHeight) return;
      lastAutoScrolledLink = activeLink;
      const sbRect = sidebar.getBoundingClientRect();
      const linkRect = activeLink.getBoundingClientRect();
      const pad = 28;
      const relTop = linkRect.top - sbRect.top;
      const relBottom = linkRect.bottom - sbRect.top;
      let nextScrollTop = sidebar.scrollTop;
      if (relTop < pad) {
        const delta = relTop - pad;
        nextScrollTop += Math.abs(delta) > sidebar.clientHeight * 0.6
          ? relTop - sidebar.clientHeight * 0.35
          : delta;
      } else if (relBottom > sidebar.clientHeight - pad) {
        const delta = relBottom - (sidebar.clientHeight - pad);
        nextScrollTop += Math.abs(delta) > sidebar.clientHeight * 0.6
          ? relTop - sidebar.clientHeight * 0.35
          : delta;
      } else {
        return;
      }
      const maxScroll = Math.max(0, sidebar.scrollHeight - sidebar.clientHeight);
      sidebar.scrollTop = Math.max(0, Math.min(maxScroll, Math.round(nextScrollTop)));
    }

    const supportsTargetGroup = Boolean(CSS && CSS.supports && CSS.supports("scroll-target-group: auto"));

    function syncActiveLink(forceScroll, allowFallback) {
      let currentLink = null;
      if (supportsTargetGroup) {
        try {
          const nativeCur = document.querySelector(".toc-nav a:target-current");
          if (nativeCur) {
            const hit = targets.find((x) => x.a === nativeCur);
            if (!hit || isTargetVisible(hit.el)) currentLink = nativeCur;
          }
        } catch (_) {
          currentLink = null;
        }
      }
      if (!currentLink && (allowFallback || !supportsTargetGroup)) {
        currentLink = resolveActiveTargetByScroll();
      }
      navLinks.forEach((link) => {
        const isCur = link === currentLink;
        if (!supportsTargetGroup) link.classList.toggle("target-current", isCur);
        link.setAttribute("aria-current", isCur ? "true" : "false");
      });
      keepActiveTocLinkInView(currentLink, Boolean(forceScroll));
      return currentLink;
    }

    if (targets.length) {
      syncActiveLink(false, true);
      const scheduleSync = (forceScroll) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => syncActiveLink(forceScroll, true));
        });
      };
      window.addEventListener("load", () => {
        updateTopbarHeightVar();
        scheduleSync(true);
      });
      document.addEventListener("scrollend", () => syncActiveLink(false, true), { passive: true });
      window.addEventListener("hashchange", () => scheduleSync(true));
      document.addEventListener("cc:clean-mode-change", () => scheduleSync(true));
      window.addEventListener("resize", () => scheduleSync(false), { passive: true });
      let scrollRaf = 0;
      let scrollSettleTimer = 0;
      window.addEventListener("scroll", () => {
        clearTimeout(scrollSettleTimer);
        scrollSettleTimer = setTimeout(() => syncActiveLink(false, true), 90);
        if (scrollRaf) return;
        scrollRaf = requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            scrollRaf = 0;
            syncActiveLink(false, true);
          });
        });
      }, { passive: true });
    }

    // Mobile drawer toggle
    const drawerBtn = document.getElementById("mobile-toc-toggle");
    if (drawerBtn && sidebar) {
      drawerBtn.addEventListener("click", () => {
        updateTopbarHeightVar();
        const open = sidebar.classList.toggle("is-open");
        drawerBtn.setAttribute("aria-expanded", String(open));
        if (open) {
          // Immediately resolve active TOC link (since :target-current stays empty while display:none) and scroll drawer cleanly
          syncActiveLink(true, true);
          requestAnimationFrame(() => syncActiveLink(true, true));
        }
      });
      sidebar.querySelectorAll("a").forEach((lnk) => {
        lnk.addEventListener("click", () => {
          if (window.innerWidth <= 1060) {
            sidebar.classList.remove("is-open");
            drawerBtn.setAttribute("aria-expanded", "false");
          }
        });
      });
    }
  }

  function setupDocumentSearch() {
    const input = document.getElementById("doc-search-input");
    const clearBtn = document.getElementById("doc-search-clear");
    const status = document.getElementById("doc-search-status");
    const globalBox = document.getElementById("global-search-results");
    const main = document.getElementById("main-content");
    if (!input || !main) return;

    const currentFile = (window.location.pathname.split("/").pop() || "index.html") || "index.html";

    function clearHighlights() {
      main.querySelectorAll("mark.search-hit").forEach((m) => {
        const parent = m.parentNode;
        if (!parent) return;
        parent.replaceChild(document.createTextNode(m.textContent || ""), m);
        parent.normalize();
      });
    }

    function renderGlobalResults(q) {
      if (!globalBox) return;
      globalBox.innerHTML = "";
      const index = Array.isArray(window.CC_SEARCH_INDEX) ? window.CC_SEARCH_INDEX : [];
      if (q.length < 2 || !index.length) {
        globalBox.hidden = true;
        return;
      }
      const lq = q.toLowerCase();
      const hits = index
        .filter((item) => {
          const hay = (item.title + " " + item.snippet + " " + (item.keywords || "")).toLowerCase();
          return hay.includes(lq);
        })
        .slice(0, 12);

      if (!hits.length) {
        globalBox.hidden = true;
        return;
      }

      hits.forEach((item) => {
        const a = document.createElement("a");
        a.className = "global-search-hit";
        const samePage = item.page === currentFile;
        a.href = samePage
          ? `#${item.id}`
          : `${item.page}?q=${encodeURIComponent(q)}#${item.id}`;
        const badge = document.createElement("span");
        badge.className = "global-search-hit-page";
        badge.textContent = samePage ? `${item.pageLabel} (pagina corrente)` : item.pageLabel;
        const title = document.createElement("span");
        title.textContent = item.title;
        a.appendChild(badge);
        a.appendChild(title);
        globalBox.appendChild(a);
      });
      globalBox.hidden = false;
    }

    let lastCleanState = document.body.getAttribute("data-clean-mode") === "true";

    function runSearch(opts) {
      const shouldScroll = !opts || opts.scroll !== false;
      clearHighlights();
      const q = input.value.trim();
      renderGlobalResults(q);
      if (q.length < 2) {
        if (status) status.textContent = q.length ? "Digita almeno 2 caratteri." : "";
        return;
      }

      const isCleanMode = document.body.getAttribute("data-clean-mode") === "true";
      lastCleanState = isCleanMode;
      const lowerQ = q.toLowerCase();
      const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const p = node.parentElement;
          if (!p) return NodeFilter.FILTER_REJECT;
          if (p.closest("svg, math, script, style, noscript, mark, textarea, input, button, select, option")) {
            return NodeFilter.FILTER_REJECT;
          }
          if (isCleanMode && p.closest(".enrichment-block:not(.keep-in-clean)")) {
            return NodeFilter.FILTER_REJECT;
          }
          if (p.closest("[hidden]:not([hidden='until-found' i])")) {
            return NodeFilter.FILTER_REJECT;
          }
          if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });

      const matches = [];
      let cur;
      while ((cur = walker.nextNode())) {
        if (cur.nodeValue.toLowerCase().includes(lowerQ)) {
          matches.push(cur);
        }
      }

      let highlighted = 0;
      let totalMatches = 0;
      let firstMark = null;
      for (const node of matches) {
        const text = node.nodeValue;
        const lt = text.toLowerCase();
        let idx = 0;
        while ((idx = lt.indexOf(lowerQ, idx)) !== -1) {
          totalMatches++;
          idx += q.length;
        }
        if (highlighted >= 120) continue;
        const frag = document.createDocumentFragment();
        let lastIdx = 0;
        while ((idx = lt.indexOf(lowerQ, lastIdx)) !== -1 && highlighted < 120) {
          if (idx > lastIdx) frag.appendChild(document.createTextNode(text.slice(lastIdx, idx)));
          const mk = document.createElement("mark");
          mk.className = "search-hit";
          mk.textContent = text.slice(idx, idx + q.length);
          frag.appendChild(mk);
          if (!firstMark) firstMark = mk;
          highlighted++;
          lastIdx = idx + q.length;
        }
        if (lastIdx < text.length) frag.appendChild(document.createTextNode(text.slice(lastIdx)));
        if (node.parentNode) node.parentNode.replaceChild(frag, node);
      }

      if (firstMark && shouldScroll) {
        const det = firstMark.closest("details");
        if (det) det.open = true;
        const hiddenAncestor = firstMark.closest("[hidden='until-found' i]");
        if (hiddenAncestor) {
          const tabId = hiddenAncestor.getAttribute("aria-labelledby");
          const owningTab = tabId ? document.getElementById(tabId) : null;
          if (owningTab) owningTab.click();
          else hiddenAncestor.removeAttribute("hidden");
        }
        firstMark.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      if (status) {
        status.textContent = totalMatches
          ? totalMatches > highlighted
            ? `${highlighted} evidenziate in questa pagina (su ${totalMatches})`
            : `${totalMatches} in questa pagina`
          : (globalBox && !globalBox.hidden
            ? "Nessuna occorrenza qui; vedi i risultati nelle altre pagine."
            : "Nessuna corrispondenza trovata.");
      }
    }

    let timer;
    input.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(() => runSearch({ scroll: true }), 220);
    });
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        input.value = "";
        clearHighlights();
        if (globalBox) {
          globalBox.innerHTML = "";
          globalBox.hidden = true;
        }
        if (status) status.textContent = "";
        input.focus();
      });
    }
    document.addEventListener("cc:clean-mode-change", () => runSearch({ scroll: false }));
    document.addEventListener("cc:schema-filter-change", () => runSearch({ scroll: false }));
    if ("MutationObserver" in window) {
      new MutationObserver(() => {
        const nowClean = document.body.getAttribute("data-clean-mode") === "true";
        if (nowClean !== lastCleanState) {
          lastCleanState = nowClean;
          runSearch({ scroll: false });
        }
      }).observe(document.body, { attributes: true, attributeFilter: ["data-clean-mode"] });
    }

    try {
      const urlQ = new URLSearchParams(window.location.search).get("q");
      if (urlQ && urlQ.trim().length >= 2) {
        input.value = urlQ.trim();
        runSearch({ scroll: !window.location.hash });
      }
    } catch (_) {}
  }

  function setupSchemaModal() {
    const dialog = document.getElementById("schema-modal");
    if (!dialog) return;

    const bodyEl = document.getElementById("schema-modal-body");
    const titleEl = document.getElementById("schema-modal-title");
    const capEl = document.getElementById("schema-modal-caption");
    const closeBtn = document.getElementById("schema-modal-close");
    const prevBtn = document.getElementById("schema-modal-prev");
    const nextBtn = document.getElementById("schema-modal-next");

    const allTriggers = Array.from(document.querySelectorAll("[data-schema-expand]"));
    let currentTrigger = null;
    let lastInvoker = null;

    function isTriggerVisible(el) {
      if (!el || !el.isConnected) return false;
      if (document.body.getAttribute("data-clean-mode") === "true" && el.closest(".enrichment-block:not(.keep-in-clean)")) {
        return false;
      }
      if (el.closest("[hidden]")) return false;
      return el.getClientRects().length > 0;
    }

    function getVisibleTriggers() {
      return allTriggers.filter(isTriggerVisible);
    }

    function openTrigger(btn, invoker) {
      if (!btn || !isTriggerVisible(btn)) return;
      const card = btn.closest(".schema-card");
      if (!card) return;
      currentTrigger = btn;
      if (invoker) lastInvoker = invoker;

      const cardTitle = card.querySelector(".schema-card-title");
      const cardSub = card.querySelector(".schema-card-subtitle");
      const controls = card.querySelector(".schema-controls");
      const panels = Array.from(card.querySelectorAll(".schema-panel"));

      if (titleEl) titleEl.textContent = cardTitle ? cardTitle.textContent.trim() : "Schema didattico";
      if (capEl) capEl.textContent = cardSub ? cardSub.textContent.trim() : "";
      if (bodyEl) {
        bodyEl.innerHTML = "";
        if (panels.length) {
          const stack = document.createElement("div");
          stack.style.display = "grid";
          stack.style.gap = "0.85rem";
          if (controls) {
            stack.appendChild(controls.cloneNode(true));
          }
          panels.forEach((p) => stack.appendChild(p.cloneNode(true)));
          const modalSwitches = Array.from(stack.querySelectorAll("[data-schema-switch]"));
          const modalPanels = Array.from(stack.querySelectorAll("[data-schema-panel]"));
          modalSwitches.forEach((sw) => {
            sw.addEventListener("click", () => {
              const target = sw.getAttribute("data-schema-switch");
              modalSwitches.forEach((b) => b.setAttribute("aria-pressed", String(b === sw)));
              modalPanels.forEach((mp) => {
                mp.hidden = mp.getAttribute("data-schema-panel") !== target;
              });
            });
          });
          bodyEl.appendChild(stack);
        } else {
          const svgWrap = card.querySelector(".schema-svg-wrap");
          if (svgWrap) {
            bodyEl.appendChild(svgWrap.cloneNode(true));
          } else {
            const clone = card.cloneNode(true);
            clone.querySelectorAll("button").forEach((b) => b.remove());
            bodyEl.appendChild(clone);
          }
        }
      }

      const pool = getVisibleTriggers();
      const single = pool.length <= 1;
      if (prevBtn) prevBtn.disabled = single;
      if (nextBtn) nextBtn.disabled = single;

      if (!dialog.open && typeof dialog.showModal === "function") {
        dialog.showModal();
      }
    }

    function step(delta) {
      const pool = getVisibleTriggers();
      if (pool.length <= 1) return;
      let idx = pool.indexOf(currentTrigger);
      if (idx === -1) idx = 0;
      const nextIdx = (idx + delta + pool.length) % pool.length;
      openTrigger(pool[nextIdx], null);
    }

    allTriggers.forEach((btn) => {
      btn.addEventListener("click", () => openTrigger(btn, btn));
    });

    if (closeBtn) closeBtn.addEventListener("click", () => dialog.close());
    if (prevBtn) prevBtn.addEventListener("click", () => step(-1));
    if (nextBtn) nextBtn.addEventListener("click", () => step(1));

    dialog.addEventListener("close", () => {
      if (bodyEl) bodyEl.innerHTML = "";
      if (lastInvoker && isTriggerVisible(lastInvoker) && typeof lastInvoker.focus === "function") {
        lastInvoker.focus();
      }
    });

    if (!("closedBy" in HTMLDialogElement.prototype)) {
      let pointerDownOutside = false;
      const isOutsideDialog = (e) => {
        const rect = dialog.getBoundingClientRect();
        return e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom;
      };
      dialog.addEventListener("pointerdown", (e) => {
        pointerDownOutside = e.target === dialog && isOutsideDialog(e);
      });
      dialog.addEventListener("pointerup", (e) => {
        if (pointerDownOutside && e.target === dialog && isOutsideDialog(e)) {
          dialog.close();
        }
        pointerDownOutside = false;
      });
    }

    dialog.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        step(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        step(1);
      }
    });
  }

  function setupAriaTabs() {
    document.querySelectorAll("[data-tablist]").forEach((tablist) => {
      const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
      const panels = tabs.map((t) => document.getElementById(t.getAttribute("aria-controls")));

      function activate(idx, moveFocus) {
        tabs.forEach((t, i) => {
          const sel = i === idx;
          t.setAttribute("aria-selected", String(sel));
          t.setAttribute("tabindex", sel ? "0" : "-1");
          if (panels[i]) {
            if (sel) panels[i].removeAttribute("hidden");
            else panels[i].setAttribute("hidden", "until-found");
          }
        });
        if (moveFocus && tabs[idx]) tabs[idx].focus();
      }

      panels.forEach((panel, idx) => {
        if (panel) {
          panel.addEventListener("beforematch", () => activate(idx, false));
        }
      });

      tabs.forEach((tab, idx) => {
        tab.addEventListener("click", () => activate(idx, false));
        tab.addEventListener("keydown", (e) => {
          let next = -1;
          if (e.key === "ArrowRight") next = (idx + 1) % tabs.length;
          else if (e.key === "ArrowLeft") next = (idx - 1 + tabs.length) % tabs.length;
          else if (e.key === "Home") next = 0;
          else if (e.key === "End") next = tabs.length - 1;
          if (next !== -1) {
            e.preventDefault();
            activate(next, true);
          }
        });
      });
    });
  }

  function setupChunkingAndSchemaLab() {
    // Interactive Working Memory Digit Span vs Chunked Span
    const stimulusBox = document.getElementById("wm-test-stimulus");
    const answerInput = document.getElementById("wm-test-answer");
    const checkBtn = document.getElementById("wm-test-check");
    const btnRaw = document.getElementById("wm-mode-raw");
    const btnChunk = document.getElementById("wm-mode-chunk");
    const out = document.getElementById("wm-test-result");

    if (stimulusBox && btnRaw && btnChunk && checkBtn) {
      let currentTarget = "1492191419452026";
      let timerId = null;

      function startTrial(mode) {
        clearTimeout(timerId);
        if (out) out.textContent = "Osserva per 3,5 secondi...";
        if (answerInput) { answerInput.value = ""; answerInput.disabled = true; }
        if (mode === "raw") {
          currentTarget = "839204716582";
          stimulusBox.textContent = "8  3  9  2  0  4  7  1  6  5  8  2   (12 cifre isolate!)";
        } else {
          currentTarget = "149219452026";
          stimulusBox.textContent = "1492 · 1945 · 2026   (3 chunk storici noti = stesso numero di cifre!)";
        }
        timerId = setTimeout(() => {
          stimulusBox.textContent = "••• Ora riscrivi le 12 cifre qui sotto •••";
          if (answerInput) { answerInput.disabled = false; answerInput.focus(); }
          if (out) out.textContent = "Inserisci la sequenza e verifica.";
        }, 3500);
      }

      btnRaw.addEventListener("click", () => startTrial("raw"));
      btnChunk.addEventListener("click", () => startTrial("chunk"));
      checkBtn.addEventListener("click", () => {
        if (!answerInput) return;
        const clean = answerInput.value.replace(/\D/g, "");
        if (!clean) {
          out.textContent = "Avvia prima una prova sopra!";
          return;
        }
        let correct = 0;
        for (let i = 0; i < Math.min(clean.length, currentTarget.length); i++) {
          if (clean[i] === currentTarget[i]) correct++;
        }
        out.textContent =
          clean === currentTarget
            ? `Perfetto (12/12)! Con il chunking la Memoria di Lavoro gestisce 3 unità semantiche invece di 12 elementi isolati.`
            : `Hai ricordato ${correct}/12 cifre nella posizione corretta. Nota quanto cala lo sforzo quando i dati si agganciano a schemi nella MLT!`;
      });
    }

    // Interactive Schema Unlocker (Cioccolato vs Acido Acetilsalicilico)
    const pills = Array.from(document.querySelectorAll(".chunk-pill[data-schema]"));
    const schemaSummary = document.getElementById("schema-unlock-summary");
    if (pills.length && schemaSummary) {
      pills.forEach((p) => {
        p.addEventListener("click", () => {
          const pressed = p.getAttribute("aria-pressed") === "true";
          p.setAttribute("aria-pressed", String(!pressed));
          const activeCount = pills.filter((x) => x.getAttribute("aria-pressed") === "true").length;
          const remainingSlots = Math.max(1, 6 - activeCount);
          schemaSummary.textContent =
            activeCount === 6
              ? "Tutti i 6 sub-schemi sono padroneggiati: l'intero composto diventa 1 solo chunk ('Aspirina') → Carico Intrinseco minimo!"
              : `Sub-schemi automatizzati: ${activeCount}/6 · Slot WM ancora impegnati dal novizio per decodificare la formula: ~${remainingSlots} elementi interattivi.`;
        });
      });
    }
  }

  function setupForgettingCurveLab() {
    const slider = document.getElementById("forgetting-reviews-slider");
    const label = document.getElementById("forgetting-reviews-val");
    const metric = document.getElementById("forgetting-day30-val");
    const pathEl = document.getElementById("forgetting-curve-path");
    const spacedEl = document.getElementById("forgetting-spaced-path");
    if (!slider || !pathEl || !spacedEl) return;

    function updateCurve() {
      const k = Number(slider.value);
      if (label) label.textContent = k + (k === 1 ? " ripasso distanziato" : " ripassi distanziati");

      const w = 520, h = 200, padL = 36, padB = 26, plotW = w - padL - 16, plotH = h - padB - 16;
      const toXY = (day, pct) => [
        padL + (day / 30) * plotW,
        16 + plotH * (1 - pct / 100)
      ];

      // Baseline Ebbinghaus decay (no review)
      let dBase = "";
      for (let day = 0; day <= 30; day++) {
        const ret = 15 + 85 * Math.exp(-day / 2.8);
        const [x, y] = toXY(day, ret);
        dBase += (day === 0 ? "M" : "L") + x.toFixed(1) + "," + y.toFixed(1) + " ";
      }
      pathEl.setAttribute("d", dBase.trim());

      // Spaced review boosts
      const reviewDays = [1, 3, 7, 14, 22].slice(0, k);
      let dSpaced = "";
      let halfLife = 2.8;
      let level = 100;
      for (let day = 0; day <= 30; day++) {
        if (day > 0) {
          level = 15 + (level - 15) * Math.exp(-1 / halfLife);
        }
        if (reviewDays.includes(day)) {
          level = Math.min(98, level + 55);
          halfLife *= 1.85;
        }
        const [x, y] = toXY(day, level);
        dSpaced += (day === 0 ? "M" : "L") + x.toFixed(1) + "," + y.toFixed(1) + " ";
      }
      spacedEl.setAttribute("d", dSpaced.trim());
      if (metric) metric.textContent = Math.round(level) + "% al Giorno 30";
    }

    slider.addEventListener("input", updateCurve);
    updateCurve();
  }

  function setupPaasEfficiencyLab() {
    const pA = document.getElementById("paas-pa");
    const rA = document.getElementById("paas-ra");
    const pB = document.getElementById("paas-pb");
    const rB = document.getElementById("paas-rb");
    if (!pA || !rA || !pB || !rB) return;

    const dotA = document.getElementById("paas-dot-a");
    const dotB = document.getElementById("paas-dot-b");
    const outA = document.getElementById("paas-ea-out");
    const outB = document.getElementById("paas-eb-out");
    const outVerdict = document.getElementById("paas-verdict");

    function updatePaas() {
      const paVal = Number(pA.value), raVal = Number(rA.value);
      const pbVal = Number(pB.value), rbVal = Number(rB.value);
      const ea = (paVal - raVal) / Math.SQRT2;
      const eb = (pbVal - rbVal) / Math.SQRT2;

      document.getElementById("paas-pa-val").textContent = paVal.toFixed(1);
      document.getElementById("paas-ra-val").textContent = raVal.toFixed(1);
      document.getElementById("paas-pb-val").textContent = pbVal.toFixed(1);
      document.getElementById("paas-rb-val").textContent = rbVal.toFixed(1);

      if (outA) outA.textContent = `Metodo A (CLT): E = ${ea >= 0 ? "+" : ""}${ea.toFixed(2)}`;
      if (outB) outB.textContent = `Metodo B (Tradiz.): E = ${eb >= 0 ? "+" : ""}${eb.toFixed(2)}`;

      // Plot in 280x280 centered at (140,140), range -2.5..+2.5 -> +/- 105px
      const mapPt = (r, p) => [140 + (r / 2.5) * 105, 140 - (p / 2.5) * 105];
      if (dotA) {
        const [x, y] = mapPt(raVal, paVal);
        dotA.setAttribute("cx", x.toFixed(1));
        dotA.setAttribute("cy", y.toFixed(1));
      }
      if (dotB) {
        const [x, y] = mapPt(rbVal, pbVal);
        dotB.setAttribute("cx", x.toFixed(1));
        dotB.setAttribute("cy", y.toFixed(1));
      }
      if (outVerdict) {
        const diff = ea - eb;
        outVerdict.textContent =
          Math.abs(diff) < 0.08
            ? "I due metodi mostrano efficienza equivalente."
            : diff > 0
            ? `Il Metodo A è più efficiente di ΔE = +${diff.toFixed(2)} (miglior rapporto prestazione/sforzo).`
            : `Il Metodo B risulta superiore di ΔE = +${Math.abs(diff).toFixed(2)}.`;
      }
    }

    [pA, rA, pB, rB].forEach((s) => s.addEventListener("input", updatePaas));
    updatePaas();
  }

  function setupAuditChecklist() {
    const form = document.getElementById("audit-interactive-form");
    const scoreOut = document.getElementById("audit-score-out");
    const statusOut = document.getElementById("audit-status-out");
    const resetBtn = document.getElementById("audit-reset-btn");
    const copyBtn = document.getElementById("audit-copy-btn");
    if (!form || !scoreOut) return;

    function recalc() {
      let total = 0;
      const missing = [];
      for (let i = 1; i <= 10; i++) {
        const checked = form.querySelector(`input[name="ind-${i}"]:checked`);
        const v = checked ? Number(checked.value) : 0;
        total += v;
        if (v < 1) {
          const lbl = form.querySelector(`[data-ind-title="${i}"]`);
          if (lbl) missing.push(`${i}. ${lbl.textContent.trim()} (${v === 0.5 ? "parziale" : "critico"})`);
        }
      }
      scoreOut.textContent = `${total.toFixed(1).replace(".0", "")} / 10`;
      if (statusOut) {
        statusOut.textContent =
          total >= 8.5
            ? "Scheda ben accessibile (carico cognitivo equilibrato)"
            : total >= 6
            ? "Sufficienza parziale: intervenire sugli indicatori critici"
            : "Rischio elevato di sovraccarico cognitivo: necessaria riprogettazione";
      }
      return { total, missing };
    }

    form.addEventListener("change", recalc);
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        form.reset();
        recalc();
      });
    }
    function copyTextWithFallback(text, btn, successLabel, defaultLabel) {
      const done = (ok) => {
        btn.textContent = ok ? successLabel : "Copia manuale: Ctrl/Cmd+C";
        setTimeout(() => { btn.textContent = defaultLabel; }, 2200);
      };
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        navigator.clipboard.writeText(text).then(() => done(true)).catch(() => {
          done(fallbackCopyTextarea(text));
        });
      } else {
        done(fallbackCopyTextarea(text));
      }
    }

    function fallbackCopyTextarea(text) {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand && document.execCommand("copy");
        document.body.removeChild(ta);
        return Boolean(ok);
      } catch (_) {
        return false;
      }
    }

    if (copyBtn) {
      copyBtn.addEventListener("click", () => {
        const { total, missing } = recalc();
        const report =
          `Audit Carico Cognitivo — Punteggio: ${total}/10\n` +
          (missing.length ? "Aree da riprogettare:\n- " + missing.join("\n- ") : "Tutti i 10 indicatori soddisfatti.");
        copyTextWithFallback(report, copyBtn, "Diagnosi copiata!", "Copia diagnosi audit");
      });
    }
    recalc();
  }

  function setupCopyButtons() {
    const legacyCopy = (text) => {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand && document.execCommand("copy");
        document.body.removeChild(ta);
        return Boolean(ok);
      } catch (_) {
        return false;
      }
    };
    document.querySelectorAll("[data-copy-target]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = document.getElementById(btn.getAttribute("data-copy-target"));
        if (!target) return;
        const orig = btn.textContent;
        const txt = target.innerText.trim();
        const finish = (ok) => {
          btn.textContent = ok ? "Copiato negli appunti!" : "Copia manuale: Ctrl/Cmd+C";
          setTimeout(() => { btn.textContent = orig; }, 2200);
        };
        if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
          navigator.clipboard.writeText(txt).then(() => finish(true)).catch(() => finish(legacyCopy(txt)));
        } else {
          finish(legacyCopy(txt));
        }
      });
    });
  }

  function setupInteractiveQuiz() {
    const container = document.getElementById("quiz-runner-box");
    const scoreBadge = document.getElementById("quiz-score-badge");
    const resetBtn = document.getElementById("quiz-reset-btn");
    if (!container) return;

    const answers = new Map();

    function updateScore() {
      let ok = 0;
      answers.forEach((v, q) => {
        const key = QUIZ_KEY.find((k) => k.q === q);
        if (key && key.ans === v) ok++;
      });
      if (scoreBadge) {
        scoreBadge.textContent = `Punteggio: ${ok} / ${QUIZ_KEY.length} (${answers.size} risposte date)`;
      }
    }

    container.querySelectorAll(".quiz-interactive-item").forEach((card) => {
      const qNum = Number(card.getAttribute("data-qnum"));
      const key = QUIZ_KEY.find((k) => k.q === qNum);
      const fb = card.querySelector(".quiz-feedback");
      const btns = Array.from(card.querySelectorAll(".quiz-choice-btn"));

      btns.forEach((b) => {
        b.addEventListener("click", () => {
          const choice = b.getAttribute("data-choice");
          answers.set(qNum, choice);
          btns.forEach((x) => {
            x.classList.remove("is-correct", "is-wrong");
            const xc = x.getAttribute("data-choice");
            if (key && xc === key.ans) x.classList.add("is-correct");
            else if (xc === choice) x.classList.add("is-wrong");
          });
          if (fb && key) {
            fb.hidden = false;
            fb.textContent =
              (choice === key.ans ? "Esatto! " : `Risposta attesa: ${key.ans.toUpperCase()}. `) + key.exp;
          }
          updateScore();
        });
      });
    });

    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        answers.clear();
        container.querySelectorAll(".quiz-choice-btn").forEach((b) => b.classList.remove("is-correct", "is-wrong"));
        container.querySelectorAll(".quiz-feedback").forEach((fb) => { fb.hidden = true; fb.textContent = ""; });
        updateScore();
      });
    }
    updateScore();
  }

  function setupSchemasInteractive() {
    // Category filtering on schemi-didattici.html
    const filterBtns = Array.from(document.querySelectorAll("[data-schema-filter]"));
    const cards = Array.from(document.querySelectorAll("[data-schema-cat]"));
    if (filterBtns.length && cards.length) {
      filterBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
          const cat = btn.getAttribute("data-schema-filter");
          filterBtns.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
          cards.forEach((c) => {
            const match = cat === "all" || c.getAttribute("data-schema-cat") === cat;
            c.hidden = !match;
          });
          document.dispatchEvent(new CustomEvent("cc:schema-filter-change", { detail: { category: cat } }));
        });
      });
    }

    // Multi-panel interactive switches inside every schema card
    document.querySelectorAll(".schema-card").forEach((card) => {
      const switchBtns = Array.from(card.querySelectorAll("[data-schema-switch]"));
      const panels = Array.from(card.querySelectorAll("[data-schema-panel]"));
      if (!switchBtns.length || !panels.length) return;

      switchBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
          const target = btn.getAttribute("data-schema-switch");
          switchBtns.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
          panels.forEach((p) => {
            p.hidden = p.getAttribute("data-schema-panel") !== target;
          });
        });
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    window.__ccAppLoaded = true;
    setupThemeAndReadingControls();
    setupResponsiveNavbar();
    setupScrollProgressAndSpy();
    setupDocumentSearch();
    setupSchemaModal();
    setupAriaTabs();
    setupChunkingAndSchemaLab();
    setupForgettingCurveLab();
    setupPaasEfficiencyLab();
    setupAuditChecklist();
    setupCopyButtons();
    setupInteractiveQuiz();
    setupSchemasInteractive();
  });
})();
