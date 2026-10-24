/* Personal project wiki: no build step.
   Content lives in wiki.json and content/*.md */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const view = $("#view");
  const STATUS_ORDER = ["active", "ongoing", "paused", "complete", "archived"];
  const STATUS_LABEL = { active: "Active", ongoing: "Ongoing", paused: "Paused", complete: "Complete", archived: "Archived" };
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

  let DATA = null;
  const mdCache = new Map();
  let sortState = { key: "updated", dir: "desc" };

  /* ---------- helpers ---------- */
  const esc = (s = "") => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const slugify = s => s.toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");
  const projectBySlug = slug => DATA.projects.find(p => p.slug === slug);
  const pageBySlug = slug => DATA.pages.find(p => p.slug === slug);
  const projectPath = slug => `content/projects/${slug}.md`;
  const pagePath = slug => `content/pages/${slug}.md`;
  const isExternal = url => /^https?:/i.test(url);
  const ext = url => isExternal(url) ? ' target="_blank" rel="noopener"' : "";

  function fmtDate(s, long = false) {
    if (!s) return "";
    const [y, m, d] = s.split("-").map(Number);
    const date = new Date(y, (m || 1) - 1, d || 1);
    return date.toLocaleDateString(undefined, d && long ? { year: "numeric", month: "short", day: "numeric" } : { year: "numeric", month: "short" });
  }
  const yearOf = s => (s || "").slice(0, 4);
  const statusHTML = s => `<span class="status" data-s="${esc(s)}">${esc(STATUS_LABEL[s] || s || "")}</span>`;

  async function loadMd(path) {
    if (mdCache.has(path)) return mdCache.get(path);
    let text = null;
    try {
      const res = await fetch(path, { cache: "no-cache" });
      if (res.ok) text = await res.text();
    } catch (e) { /* offline or file:// */ }
    mdCache.set(path, text);
    return text;
  }
  const loadAllDocs = () => Promise.all([
    ...DATA.projects.map(p => loadMd(projectPath(p.slug))),
    ...DATA.pages.map(p => loadMd(pagePath(p.slug)))
  ]);

  /* ---------- markdown: [[wikilinks]] + heading ids ---------- */
  marked.use({
    gfm: true,
    extensions: [{
      name: "wikilink",
      level: "inline",
      start: src => src.indexOf("[["),
      tokenizer(src) {
        const m = /^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/.exec(src);
        if (m) return { type: "wikilink", raw: m[0], slug: m[1].trim(), label: (m[2] || "").trim() };
      },
      renderer(tok) {
        const p = projectBySlug(tok.slug), pg = pageBySlug(tok.slug);
        const target = p ? `#/p/${p.slug}` : pg ? `#/page/${pg.slug}` : null;
        const label = tok.label || (p && p.title) || (pg && pg.title) || tok.slug;
        return target
          ? `<a class="wikilink" href="${target}">${esc(label)}</a>`
          : `<a class="wikilink missing" href="#/index" title="No page called ${esc(tok.slug)} yet">${esc(label)}</a>`;
      }
    }]
  });

  function renderMarkdown(md, baseRoute) {
    const tmp = document.createElement("div");
    tmp.innerHTML = marked.parse(md);
    const headings = [];
    const seen = {};
    $$("h2, h3", tmp).forEach(h => {
      let id = slugify(h.textContent) || "section";
      if (seen[id]) id += "-" + (++seen[id]); else seen[id] = 1;
      h.id = id;
      headings.push({ level: +h.tagName[1], text: h.textContent, id });
    });
    $$("pre code", tmp).forEach(el => { try { hljs.highlightElement(el); } catch (e) {} });
    $$('a[href^="http"]', tmp).forEach(a => { a.target = "_blank"; a.rel = "noopener"; });
    $$('a[href^="#"]:not([href^="#/"])', tmp).forEach(a => { a.href = `${baseRoute}/${a.getAttribute("href").slice(1)}`; });
    $$("img", tmp).forEach(img => { img.loading = "lazy"; });
    return { html: tmp.innerHTML, headings };
  }

  function tocHTML(headings, baseRoute) {
    const h2s = headings.filter(h => h.level === 2);
    if (h2s.length < 2) return "";
    return `<nav aria-label="Contents"><h2 class="label">Contents</h2><ol>${h2s.map(h => `<li><a href="${baseRoute}/${h.id}" data-sec="${h.id}">${esc(h.text)}</a></li>`).join("")}</ol></nav>`;
  }

  /* ---------- chrome ---------- */
  function buildChrome() {
    const site = DATA.site;
    $("#ident-name").textContent = site.title;
    $("#ident-loc").textContent = site.location || "";
    $("#social-links").innerHTML = (site.links || []).map(l =>
      `<a href="${esc(l.url)}"${ext(l.url)}>${esc(l.short || l.label)} <span class="arrow" aria-hidden="true">↗</span></a>`).join("");

    const groups = {};
    (site.links || []).forEach(l => (groups[l.group || "Elsewhere"] ||= []).push(l));
    const year = new Date().getFullYear();
    const extraPages = DATA.pages.filter(p => p.slug !== "about");

    const footer = $("#footer");
    footer.className = "footer ink";
    footer.innerHTML = `<div class="wrap">
      <h2>Let's connect.</h2>
      ${site.email ? `<a class="email" href="mailto:${esc(site.email)}">${esc(site.email)} <span class="arrow right" aria-hidden="true">→</span></a>` : ""}
      ${Object.keys(groups).length ? `<div class="footer-groups">${Object.entries(groups).map(([g, links]) => `
        <div><h3 class="label">${esc(g)}</h3><ul>${links.map(l => `<li><a href="${esc(l.url)}"${ext(l.url)}>${esc(l.label)} <span class="arrow" aria-hidden="true">↗</span></a></li>`).join("")}</ul></div>`).join("")}</div>` : ""}
      <div class="footer-bottom">
        <span>© ${year} ${esc(site.author || site.title)}</span>
        <nav aria-label="Footer">
          <a href="#/">Work</a><a href="#/index">Index</a><a href="#/page/about">About</a>
          ${extraPages.map(p => `<a href="#/page/${esc(p.slug)}">${esc(p.title)}</a>`).join("")}
          <button class="theme-toggle" id="theme-toggle" type="button">Dark mode</button>
        </nav>
      </div>
    </div>`;
    wireTheme();
  }

  function wireTheme() {
    const toggle = $("#theme-toggle");
    const isDark = () => {
      const t = document.documentElement.dataset.theme;
      return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    };
    const label = () => { toggle.textContent = isDark() ? "Light mode" : "Dark mode"; };
    toggle.addEventListener("click", () => {
      const next = isDark() ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem("wiki-theme", next); } catch (e) {}
      label();
    });
    label();
  }

  function setCurrentNav(key) {
    $$("[data-nav]").forEach(a => {
      if (a.dataset.nav === key) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
  }
  function setInk(on) { document.body.classList.toggle("on-ink", on); }

  /* ---------- Work (home) ---------- */
  function mediaHTML(p, cls = "") {
    const bg = p.color || "#1C1C1E";
    const inner = p.cover
      ? `<img src="${esc(p.cover)}" alt="" loading="lazy">`
      : `<div class="placeholder">${esc(p.title)}</div>`;
    return `<div class="card-media ${cls}" style="background:${esc(bg)}"><div class="card-media-inner">${inner}</div></div>`;
  }

  function workOrder() {
    // Featured first (if set), then most recently updated
    return [...DATA.projects].sort((a, b) =>
      (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || (b.updated || b.started || "").localeCompare(a.updated || a.started || ""));
  }

  function viewWork() {
    const site = DATA.site;
    const list = workOrder();
    // 4:3, 1:1, 1:1, 4:3 … gives the staggered two-column rhythm
    const shape = i => (i % 4 === 1 || i % 4 === 2) ? "square" : "wide";
    view.innerHTML = `
      <section class="hero ink">
        <div class="wrap grid12">
          <h1>${esc(site.headline || site.title)}</h1>
          ${site.intro ? `<p>${esc(site.intro)}</p>` : ""}
        </div>
      </section>
      <section class="work ink">
        <div class="wrap">
          <div class="cards">
            ${list.map((p, i) => `
              <a class="card" href="#/p/${esc(p.slug)}" data-shape="${shape(i)}">
                ${mediaHTML(p)}
                <h3>${esc(p.title)}</h3>
                ${p.summary ? `<p>${esc(p.summary)}</p>` : ""}
                <div class="card-meta label">${statusHTML(p.status)}${(p.tags || []).slice(0, 3).map(t => `<span>${esc(t)}</span>`).join("")}</div>
              </a>`).join("")}
          </div>
          <div class="work-more">
            <span>${DATA.projects.length} projects, newest first.</span>
            <a href="#/index">Browse the full index <span class="arrow right" aria-hidden="true">→</span></a>
          </div>
        </div>
      </section>`;
    setInk(true);
    document.title = site.title;
    setCurrentNav("work");
    parallax();
  }

  /* ---------- Index ---------- */
  function sortedProjects(list) {
    const { key, dir } = sortState;
    const val = p => key === "status" ? STATUS_ORDER.indexOf(p.status)
      : key === "title" ? p.title.toLowerCase()
      : key === "category" ? (p.category || "").toLowerCase()
      : (p.updated || p.started || "");
    return [...list].sort((a, b) => {
      const A = val(a), B = val(b);
      const c = A < B ? -1 : A > B ? 1 : 0;
      return dir === "asc" ? c : -c;
    });
  }

  function allTags() {
    const counts = {};
    DATA.projects.forEach(p => (p.tags || []).forEach(t => counts[t] = (counts[t] || 0) + 1));
    return Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }

  function viewIndex(activeTag = null, activeStatus = null, focusSort = null) {
    let list = DATA.projects;
    if (activeTag) list = list.filter(p => (p.tags || []).includes(activeTag));
    if (activeStatus) list = list.filter(p => p.status === activeStatus);
    const statuses = STATUS_ORDER.filter(s => DATA.projects.some(p => p.status === s));
    const th = (key, label, cls = "") => {
      const sort = sortState.key === key ? (sortState.dir === "asc" ? "ascending" : "descending") : "none";
      return `<th class="${cls}" aria-sort="${sort}"><button type="button" data-sort="${key}">${label}</button></th>`;
    };

    view.innerHTML = `
      <section class="page">
        <div class="wrap">
          <header class="page-head">
            <h1>${activeTag ? esc(activeTag) : "Index"}</h1>
            <p>${activeTag
              ? `Projects tagged ${esc(activeTag)}. <a href="#/index">Show all projects</a>`
              : `Every project in one list. Sort by any column, filter by status, or browse by tag.`}</p>
          </header>
          <div class="toolbar" role="group" aria-label="Filter by status">
            <button class="chip" type="button" data-status="" aria-pressed="${!activeStatus}">All <span class="n">${activeTag ? list.length : DATA.projects.length}</span></button>
            ${statuses.map(s => `<button class="chip" type="button" data-status="${s}" aria-pressed="${activeStatus === s}">${statusHTML(s)}</button>`).join("")}
          </div>
          ${list.length ? `<table class="catalog">
            <thead><tr><th class="t-thumb"><span class="visually-hidden">Cover</span></th>${th("title", "Project")}${th("status", "Status")}${th("category", "Category", "t-cat")}${th("updated", "Updated")}</tr></thead>
            <tbody>${sortedProjects(list).map(p => `
              <tr data-href="#/p/${esc(p.slug)}">
                <td class="t-thumb"><div class="thumb" style="background:${esc(p.color || "")}">${p.cover ? `<img src="${esc(p.cover)}" alt="" loading="lazy">` : ""}</div></td>
                <td class="t-title"><a href="#/p/${esc(p.slug)}">${esc(p.title)}</a><p>${esc(p.summary || "")}</p></td>
                <td class="t-dim">${statusHTML(p.status)}</td>
                <td class="t-dim t-cat">${esc(p.category || "")}</td>
                <td class="t-dim">${esc(fmtDate(p.updated || p.started))}</td>
              </tr>`).join("")}</tbody>
          </table>` : `<p class="empty">No projects match that filter. <a href="#/index">Show all projects</a></p>`}
          <section class="tags-block" id="tags" aria-labelledby="tags-h">
            <h2 class="label" id="tags-h">Browse by tag</h2>
            <div class="chips">${allTags().map(([t, n]) => `<a class="chip" href="#/tag/${encodeURIComponent(t)}" aria-pressed="${t === activeTag}">${esc(t)} <span class="n">${n}</span></a>`).join("")}</div>
          </section>
        </div>
      </section>`;

    $$("[data-status]", view).forEach(b => b.addEventListener("click", () => viewIndex(activeTag, b.dataset.status || null)));
    $$("[data-sort]", view).forEach(b => b.addEventListener("click", () => {
      const k = b.dataset.sort;
      const defaultDir = (k === "title" || k === "category" || k === "status") ? "asc" : "desc";
      sortState = sortState.key === k ? { key: k, dir: sortState.dir === "asc" ? "desc" : "asc" } : { key: k, dir: defaultDir };
      viewIndex(activeTag, activeStatus, k);
    }));
    $$("tr[data-href]", view).forEach(tr => tr.addEventListener("click", e => {
      if (!e.target.closest("a")) location.hash = tr.dataset.href;
    }));
    if (focusSort) $(`[data-sort="${focusSort}"]`).focus();

    setInk(false);
    document.title = `${activeTag || "Index"} | ${DATA.site.title}`;
    setCurrentNav("index");
  }

  /* ---------- Project ---------- */
  async function viewProject(slug, section) {
    const p = projectBySlug(slug);
    if (!p) return viewNotFound(`There's no project called “${slug}”.`);
    const base = `#/p/${p.slug}`;
    const md = await loadMd(projectPath(slug));
    const { html, headings } = md != null
      ? renderMarkdown(md, base)
      : { html: `<p>No write-up yet. Create <code>${esc(projectPath(slug))}</code> to add one.</p>`, headings: [] };

    const order = workOrder();
    const i = order.findIndex(x => x.slug === p.slug);
    const prev = order[(i - 1 + order.length) % order.length];
    const next = order[(i + 1) % order.length];
    const live = p.status === "active" || p.status === "ongoing";
    const timeline = p.started ? `${fmtDate(p.started)} to ${live ? "now" : fmtDate(p.updated) || "?"}` : "";
    const meta = (label, value, full = false) => value ? `<div class="${full ? "full" : ""}"><dt class="label">${label}</dt><dd>${value}</dd></div>` : "";
    const toc = tocHTML(headings, base);

    view.innerHTML = `
      <section class="p-cover ink">
        <div class="p-cover-media${p.cover ? "" : " bare"}" style="background:${esc(p.color || "#1C1C1E")}">
          ${p.cover ? `<img src="${esc(p.cover)}" alt="">` : ""}
        </div>
      </section>
      <section class="p-head ink">
        <div class="wrap grid12">
          <div class="p-title">
            <h1>${esc(p.title)}</h1>
            ${p.summary ? `<p>${esc(p.summary)}</p>` : ""}
          </div>
          <dl class="p-meta">
            ${meta("Status", statusHTML(p.status))}
            ${meta("Timeline", esc(timeline))}
            ${meta("Role", esc(p.role || ""))}
            ${meta("Category", esc(p.category || ""))}
            ${meta("Built with", (p.stack || []).length ? `<div class="chips">${p.stack.map(s => `<span>${esc(s)}</span>`).join("")}</div>` : "", true)}
            ${meta("Tags", (p.tags || []).length ? `<div class="chips">${p.tags.map(t => `<a href="#/tag/${encodeURIComponent(t)}">${esc(t)}</a>`).join("")}</div>` : "", true)}
            ${meta("Links", (p.links || []).length ? `<div class="links">${p.links.map(l => `<a href="${esc(l.url)}"${ext(l.url)}>${esc(l.label)} <span class="arrow" aria-hidden="true">↗</span></a>`).join("")}</div>` : "", true)}
          </dl>
        </div>
      </section>
      <section class="p-body${toc ? "" : " no-rail"}">
        <div class="wrap grid12">
          ${toc ? `<aside class="rail">${toc}<div id="backlinks" hidden></div></aside>` : ""}
          <article class="prose">${html}${toc ? "" : `<div id="backlinks" hidden></div>`}</article>
        </div>
      </section>
      ${(p.gallery || []).length ? `<section class="wrap gallery" aria-label="Gallery">${p.gallery.map(g => {
        const src = typeof g === "string" ? g : g.src, cap = typeof g === "string" ? "" : (g.caption || "");
        return `<figure><img src="${esc(src)}" alt="${esc(cap)}" loading="lazy">${cap ? `<figcaption>${esc(cap)}</figcaption>` : ""}</figure>`;
      }).join("")}</section>` : ""}
      <section class="wrap" style="padding-bottom:5rem">
        ${order.length > 1 ? `<nav class="p-next" aria-label="More projects">
          <a href="#/p/${esc(prev.slug)}"><span class="label">Previous</span><strong>${esc(prev.title)}</strong></a>
          <a href="#/p/${esc(next.slug)}"><span class="label">Next</span><strong>${esc(next.title)}</strong></a>
        </nav>` : ""}
        <a class="back" href="#/"><span class="arrow" aria-hidden="true">←</span> Back to work</a>
      </section>`;

    setInk(true);
    document.title = `${p.title} | ${DATA.site.title}`;
    setCurrentNav(null);
    scrollToSection(section);
    renderBacklinks(slug);
    trackSections();
  }

  async function renderBacklinks(slug) {
    await loadAllDocs();
    const re = new RegExp(`\\[\\[\\s*${slug.replace(/[-]/g, "\\-")}\\s*(\\|[^\\]]*)?\\]\\]`);
    const sources = [
      ...DATA.projects.filter(p => p.slug !== slug && re.test(mdCache.get(projectPath(p.slug)) || "")).map(p => ({ href: `#/p/${p.slug}`, title: p.title })),
      ...DATA.pages.filter(p => re.test(mdCache.get(pagePath(p.slug)) || "")).map(p => ({ href: `#/page/${p.slug}`, title: p.title }))
    ];
    const box = $("#backlinks");
    if (!box || !sources.length) return;
    box.hidden = false;
    box.className = box.closest(".prose") ? "rail" : "";
    box.innerHTML = `<h2 class="label">Linked from</h2><ul>${sources.map(s => `<li><a href="${s.href}">${esc(s.title)}</a></li>`).join("")}</ul>`;
    if (box.closest(".prose")) box.style.cssText = "position:static;margin-top:3rem;padding-top:1.5rem;border-top:1px solid var(--line)";
  }

  // Highlight the current section in the contents rail
  let sectionObserver = null;
  function trackSections() {
    if (sectionObserver) sectionObserver.disconnect();
    const links = $$(".rail [data-sec]");
    if (!links.length || !("IntersectionObserver" in window)) return;
    sectionObserver = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) links.forEach(a => a.classList.toggle("on", a.dataset.sec === e.target.id));
      });
    }, { rootMargin: "-20% 0px -70% 0px" });
    links.forEach(a => { const h = document.getElementById(a.dataset.sec); if (h) sectionObserver.observe(h); });
  }

  /* ---------- Pages ---------- */
  async function viewPage(slug, section) {
    const pg = pageBySlug(slug);
    if (!pg) return viewNotFound(`There's no page called “${slug}”.`);
    const base = `#/page/${pg.slug}`;
    const md = await loadMd(pagePath(slug));
    const { html, headings } = md != null ? renderMarkdown(md, base) : { html: "", headings: [] };

    if (slug === "about") {
      const a = DATA.about || {};
      view.innerHTML = `
        <section class="page">
          <div class="wrap">
            <h1 class="statement">${esc(a.statement || "About")}</h1>
            <div class="grid12 about-body">
              ${(a.groups || []).length ? `<div class="about-groups">${a.groups.map(g => `
                <section><h2 class="label">${esc(g.title)}</h2><ul>${(g.items || []).map(it => `
                  <li><span class="name">${esc(it.name)}</span>${it.detail ? `<span class="detail">${esc(it.detail)}</span>` : ""}</li>`).join("")}</ul></section>`).join("")}</div>` : ""}
              <article class="prose">${html}</article>
            </div>
          </div>
        </section>`;
    } else {
      if (md == null) return viewNotFound(`Create <code>${esc(pagePath(slug))}</code> to add this page.`, true);
      const toc = tocHTML(headings, base);
      view.innerHTML = `
        <section class="page p-body${toc ? "" : " no-rail"}" style="padding-top:9rem">
          <div class="wrap grid12">
            ${toc ? `<aside class="rail">${toc}</aside>` : ""}
            <article class="prose">${html}</article>
          </div>
        </section>`;
      trackSections();
    }
    setInk(false);
    document.title = `${pg.title} | ${DATA.site.title}`;
    setCurrentNav(`page:${pg.slug}`);
    scrollToSection(section);
  }

  function viewNotFound(msg, raw = false) {
    view.innerHTML = `<section class="page"><div class="wrap"><header class="page-head"><h1>Not found</h1><p>${raw ? msg : esc(msg)} <a href="#/">Go to work</a></p></header></div></section>`;
    setInk(false);
    document.title = `Not found | ${DATA.site.title}`;
    setCurrentNav(null);
  }

  function scrollToSection(id) {
    if (id) {
      const el = document.getElementById(decodeURIComponent(id));
      if (el) { el.scrollIntoView(); return; }
    }
    window.scrollTo(0, 0);
  }

  /* ---------- Search dialog ---------- */
  const dialog = $("#search-dialog");
  const input = $("#search");
  const resultsEl = $("#search-results");
  let selected = 0;

  function snippet(text, q) {
    const plain = text.replace(/```[\s\S]*?```/g, " ").replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, a, b) => b || a).replace(/[#*_>`|-]+/g, " ").replace(/\s+/g, " ");
    const i = plain.toLowerCase().indexOf(q);
    if (i < 0) return "";
    const start = Math.max(0, i - 50);
    const s = (start ? "…" : "") + plain.slice(start, i + q.length + 80) + "…";
    return esc(s).replace(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig"), m => `<mark>${m}</mark>`);
  }

  function runSearch() {
    const q = input.value.trim().toLowerCase();
    if (!q) {
      resultsEl.innerHTML = `<li class="hint">Search titles, write-ups, tags and tools.</li>`;
      return;
    }
    const items = [
      ...DATA.projects.map(p => ({ href: `#/p/${p.slug}`, title: p.title, kind: "Project", meta: [p.summary, p.category, p.status, ...(p.tags || []), ...(p.stack || [])].join(" "), body: mdCache.get(projectPath(p.slug)) || "", summary: p.summary })),
      ...DATA.pages.map(p => ({ href: `#/page/${p.slug}`, title: p.title, kind: "Page", meta: "", body: mdCache.get(pagePath(p.slug)) || "", summary: "" }))
    ];
    const results = items.map(it => {
      const score = (it.title.toLowerCase().includes(q) ? 10 : 0) + (it.meta.toLowerCase().includes(q) ? 4 : 0) + (it.body.toLowerCase().includes(q) ? 1 : 0);
      return { ...it, score };
    }).filter(r => r.score).sort((a, b) => b.score - a.score);
    selected = 0;
    resultsEl.innerHTML = results.length
      ? results.map((r, i) => `<li><a href="${r.href}" role="option" aria-selected="${i === 0}"><strong>${esc(r.title)}</strong><span class="kind label">${r.kind}</span><p>${snippet(r.body, q) || esc(r.summary || "")}</p></a></li>`).join("")
      : `<li class="hint">Nothing matches “${esc(input.value.trim())}”. Try a project name, a tag, or a tool.</li>`;
  }

  function openSearch() {
    if (dialog.open) return;
    loadAllDocs().then(runSearch);
    dialog.showModal();
    input.value = "";
    runSearch();
    input.focus();
  }
  function moveSelection(d) {
    const opts = $$("a[role=option]", resultsEl);
    if (!opts.length) return;
    selected = (selected + d + opts.length) % opts.length;
    opts.forEach((o, i) => o.setAttribute("aria-selected", String(i === selected)));
    opts[selected].scrollIntoView({ block: "nearest" });
  }

  function wireSearch() {
    $("#search-open").addEventListener("click", openSearch);
    $("#search-close").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", e => { if (e.target === dialog) dialog.close(); });
    resultsEl.addEventListener("click", e => { if (e.target.closest("a")) dialog.close(); });
    let t;
    input.addEventListener("input", () => { clearTimeout(t); t = setTimeout(runSearch, 80); });
    input.addEventListener("keydown", e => {
      if (e.key === "ArrowDown") { e.preventDefault(); moveSelection(1); }
      if (e.key === "ArrowUp") { e.preventDefault(); moveSelection(-1); }
      if (e.key === "Enter") {
        e.preventDefault();
        const opt = $$("a[role=option]", resultsEl)[selected];
        if (opt) { location.hash = opt.getAttribute("href"); dialog.close(); }
      }
    });
    document.addEventListener("keydown", e => {
      const typing = /input|textarea|select/i.test(document.activeElement.tagName);
      if ((e.key === "/" && !typing) || (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        openSearch();
      }
    });
  }

  /* ---------- Motion: card parallax + top bar state ---------- */
  let ticking = false;
  function parallax() {
    if (reduceMotion.matches) return;
    const vh = innerHeight;
    $$(".card-media-inner").forEach(el => {
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const offset = (r.top + r.height / 2 - vh / 2) / vh; // -1..1
      el.style.transform = `translate3d(0, ${(-offset * 20).toFixed(1)}px, 0)`;
    });
  }
  // Match the top bar to whatever band (dark or light) sits beneath it
  function syncTopbar() {
    const bar = $("#topbar");
    const y = bar.getBoundingClientRect().bottom - 4;
    const under = document.elementsFromPoint(innerWidth / 2, Math.max(0, y)).find(el => !bar.contains(el) && !el.closest("dialog"));
    setInk(!!(under && under.closest(".ink")));
    bar.classList.toggle("scrolled", scrollY > 24);
  }
  function onScroll() {
    syncTopbar();
    if (!ticking) { ticking = true; requestAnimationFrame(() => { parallax(); ticking = false; }); }
  }

  /* ---------- Router ---------- */
  let lastBase = null;
  async function route() {
    if (dialog.open) dialog.close();
    const [kind, arg, section] = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
    const baseKey = `${kind || ""}/${arg || ""}`;
    if (section && baseKey === lastBase) { scrollToSection(section); return; }
    lastBase = baseKey;

    if (!kind) viewWork();
    else if (kind === "index") viewIndex();
    else if (kind === "tags") { viewIndex(); $("#tags").scrollIntoView(); }
    else if (kind === "tag" && arg) viewIndex(decodeURIComponent(arg));
    else if (kind === "p" && arg) await viewProject(decodeURIComponent(arg), section);
    else if (kind === "page" && arg) await viewPage(decodeURIComponent(arg), section);
    else viewNotFound("That address doesn't match anything here.");

    onScroll();
    if (!section) $("#main").focus({ preventScroll: true });
  }

  /* ---------- Boot ---------- */
  async function boot() {
    try {
      const res = await fetch("wiki.json", { cache: "no-cache" });
      DATA = await res.json();
    } catch (e) {
      view.innerHTML = `<section class="page"><div class="wrap"><header class="page-head"><h1>Couldn't load wiki.json</h1><p>Check that the file exists and is valid JSON. If you opened index.html straight from your computer, run a local server instead (see README).</p></header></div></section>`;
      return;
    }
    DATA.projects = DATA.projects || [];
    DATA.pages = DATA.pages || [];
    DATA.site = DATA.site || { title: "Project wiki" };
    buildChrome();
    wireSearch();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", parallax);
    addEventListener("hashchange", route);
    route();
  }
  boot();
})();
