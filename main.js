/* ==========================================================
   CDMI Church: interactions
   No libraries. IntersectionObserver for reveals, one
   requestAnimationFrame loop for scroll-linked motion.
   ========================================================== */
(() => {
  "use strict";

  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FINE = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const num = (i) => String(i + 1).padStart(2, "0");
  const root = document.documentElement;

  // Conference: Sunday 20 Dec 2026, 09:00 East Africa Time (UTC+3)
  const CONFERENCE = Date.UTC(2026, 11, 20, 6, 0, 0);

  const DEPTS = window.CDMI_DEPARTMENTS || [];
  const EVENTS = window.CDMI_EVENTS || [];
  const SERMONS = window.CDMI_SERMONS || [];
  const TESTIMONIES = window.CDMI_TESTIMONIES || [];

  $("#year").textContent = new Date().getFullYear();

  /* ---------------- Render content from data.js ---------------- */
  $("#minGrid").innerHTML = DEPTS.map((d, i) => `
    <button class="mcard" data-in style="--d:${(i % 3) * 0.08}s" data-dept="${d.id}" aria-label="Learn more about ${esc(d.name)}">
      <div class="mcard__img"><img src="${d.img}" alt="" loading="lazy" /></div>
      <div class="mcard__body">
        <h3>${esc(d.name)}</h3>
        <p>${esc(d.tagline)}</p>
        <span class="mcard__more">Learn more <i class="arw">→</i></span>
      </div>
    </button>`).join("");

  $("#eventGrid").innerHTML = EVENTS.map((e, i) => `
    <button class="ecard" data-in data-tilt style="--d:${(i % 4) * 0.08}s" data-dept="${e.dept}" aria-label="${esc(e.name)}, hosted by ${esc(e.by)}">
      <img src="${e.img}" alt="" loading="lazy" />
      <div><small>${esc(e.by)}</small><b>${esc(e.name)}</b></div>
    </button>`).join("");

  // Sermons: featured + filterable grid
  const yt = (id) => `https://www.youtube.com/watch?v=${id}`;
  const [feat, ...rest] = SERMONS;
  if (feat) {
    $("#featured").innerHTML = `
      <button class="featured__player" data-in data-id="${feat.id}" aria-label="Play ${esc(feat.title)}">
        <img src="${feat.img}" alt="" />
        <span class="play"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span>
      </button>
      <div class="featured__info" data-in>
        <p class="kicker kicker--light">Featured message</p>
        <h3>${esc(feat.title)}</h3>
        <p class="featured__meta"><span>${esc(feat.speaker)}</span>${feat.scripture ? `<em>${esc(feat.scripture)}</em>` : ""}</p>
        <div class="row">
          <button class="btn btn--light" data-play>Watch now</button>
          <a class="btn btn--glass" href="${yt(feat.id)}" target="_blank" rel="noopener">Open on YouTube</a>
        </div>
      </div>`;
    const player = $(".featured__player");
    const play = () => {
      if (player.querySelector("iframe")) return;
      player.insertAdjacentHTML("beforeend", `<iframe src="https://www.youtube-nocookie.com/embed/${feat.id}?autoplay=1&rel=0" title="${esc(feat.title)}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`);
    };
    player.addEventListener("click", play);
    $("[data-play]").addEventListener("click", play);
  }
  $("#sermonGrid").innerHTML = rest.map((s) => `
    <a class="sermon" data-in href="${yt(s.id)}" target="_blank" rel="noopener" data-topic="${esc(s.topic)}" data-speaker="${esc(s.speaker)}">
      <div class="sermon__img"><img src="${s.img}" alt="" loading="lazy" /></div>
      <h4>${esc(s.title)}</h4><p>${esc(s.speaker)}${s.scripture ? " · " + esc(s.scripture) : ""}</p>
    </a>`).join("");
  const topics = [...new Set(rest.map((s) => s.topic).filter(Boolean))];
  const speakers = [...new Set(rest.map((s) => s.speaker).filter(Boolean))];
  const chip = (label, key, val, on) => `<button class="chip" data-key="${key}" data-val="${esc(val)}" aria-pressed="${on}">${esc(label)}</button>`;
  $("#filters").innerHTML = chip("All", "", "", true) + topics.map((t) => chip(t, "topic", t, false)).join("") + speakers.map((s) => chip(s, "speaker", s, false)).join("");
  $("#filters").addEventListener("click", (e) => {
    const c = e.target.closest(".chip");
    if (!c) return;
    $$(".chip").forEach((x) => x.setAttribute("aria-pressed", x === c));
    $$(".sermon").forEach((s) => { s.hidden = c.dataset.key ? s.dataset[c.dataset.key] !== c.dataset.val : false; });
  });

  // Testimonies: real stories when provided, otherwise an invitation
  $("#testimonyList").innerHTML = TESTIMONIES.length
    ? `<div class="t-grid">${TESTIMONIES.map((t) => `<figure class="tcard" data-in><p>“${esc(t.text)}”</p><b>${esc(t.name)}</b></figure>`).join("")}</div>`
    : `<div class="t-invite" data-in>
        <blockquote>“They overcame him by the blood of the Lamb, and by the word of their testimony.”<cite>Revelation 12:11</cite></blockquote>
        <div><p>Has God answered a prayer, healed you or turned something around? Tell us. Your story could be the encouragement someone else needs.</p>
        <a class="btn btn--accent" href="https://www.instagram.com/cdmi_church/" target="_blank" rel="noopener">Share your story</a></div>
      </div>`;

  /* ---------------- Word-by-word statement ---------------- */
  $$("[data-words]").forEach((el) => {
    const walk = (node) => [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((p) => {
          if (!p) return;
          if (/^\s+$/.test(p)) return frag.appendChild(document.createTextNode(" "));
          const s = document.createElement("span"); s.className = "wd"; s.textContent = p; frag.appendChild(s);
        });
        n.replaceWith(frag);
      } else walk(n);
    });
    walk(el);
  });

  /* ---------------- Reveals ---------------- */
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add("is-in");
    io.unobserve(e.target);
  }), { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
  $$("[data-in], [data-lines]").forEach((el) => (REDUCED ? el.classList.add("is-in") : io.observe(el)));
  // Hero reveals immediately
  requestAnimationFrame(() => $$(".hero [data-lines], .hero [data-in]").forEach((el, i) => { el.style.setProperty("--d", 0.35 + i * 0.12 + "s"); el.classList.add("is-in"); }));

  // Count-up stats
  const countIO = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    countIO.unobserve(e.target);
    const end = +e.target.dataset.count, t0 = performance.now();
    const step = (t) => { const p = clamp((t - t0) / 1600); e.target.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); };
    REDUCED ? (e.target.textContent = end) : requestAnimationFrame(step);
  }), { threshold: 0.6 });
  $$("[data-count]").forEach((el) => countIO.observe(el));

  /* ---------------- Closeable banners (return on reload only) ---------------- */
  const announce = $("#announce"), jubilee = $("#jubilee"), drawer = $("#drawer");
  const setAnnounceH = () => root.style.setProperty("--announce-h", announce && announce.isConnected ? announce.offsetHeight + "px" : "0px");
  setAnnounceH();
  addEventListener("resize", setAnnounceH);
  if (window.ResizeObserver && announce) new ResizeObserver(setAnnounceH).observe(announce);
  document.fonts && document.fonts.ready.then(setAnnounceH);

  let lastFocus = null;
  const lockScroll = (on) => { document.body.style.overflow = on ? "hidden" : ""; };
  function openJubilee() {
    lastFocus = document.activeElement;
    jubilee.hidden = false;
    lockScroll(true);
    $(".x", jubilee).focus({ preventScroll: true });
    confetti();
  }
  function closeJubilee() {
    if (jubilee.hidden) return;
    jubilee.hidden = true;
    lockScroll(false);
    lastFocus && lastFocus.focus && lastFocus.focus({ preventScroll: true });
  }
  setTimeout(openJubilee, 1800);

  document.addEventListener("click", (e) => {
    const c = e.target.closest("[data-close]");
    if (c) {
      if (c.dataset.close === "announce") { announce.remove(); setAnnounceH(); }
      if (c.dataset.close === "jubilee") closeJubilee();
      if (c.dataset.close === "drawer") closeDrawer();
      return;
    }
    const d = e.target.closest("[data-dept]");
    if (d) openDrawer(d.dataset.dept);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closeDrawer(); closeJubilee(); closeMenu(); }
  });

  function confetti() {
    const cv = $("#confetti");
    if (!cv || REDUCED) return;
    const ctx = cv.getContext("2d"), r = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = r.width * dpr; cv.height = r.height * dpr; ctx.scale(dpr, dpr);
    const colors = ["#c39a45", "#ecdcb8", "#7d1f2e", "#0f1729"];
    const R = (a, b) => a + Math.random() * (b - a);
    const bits = Array.from({ length: 90 }, () => ({ x: r.width / 2, y: r.height * 0.3, vx: R(-6, 6), vy: R(-10, -3), g: R(0.16, 0.24), w: R(5, 9), h: R(3, 5), rot: R(0, 6.3), vr: R(-0.2, 0.2), c: colors[(Math.random() * 4) | 0], life: 1 }));
    let f = 0;
    (function loop() {
      ctx.clearRect(0, 0, r.width, r.height);
      let alive = 0;
      bits.forEach((b) => {
        b.vx *= 0.985; b.vy += b.g; b.x += b.vx; b.y += b.vy; b.rot += b.vr;
        if (f > 80) b.life -= 0.014;
        if (b.life <= 0) return;
        alive++;
        ctx.save(); ctx.globalAlpha = b.life; ctx.translate(b.x, b.y); ctx.rotate(b.rot);
        ctx.fillStyle = b.c; ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h * Math.cos(b.rot * 2)); ctx.restore();
      });
      f++;
      if (alive && !jubilee.hidden) requestAnimationFrame(loop); else ctx.clearRect(0, 0, r.width, r.height);
    })();
  }

  /* ---------------- Countdown ---------------- */
  const full = $('[data-countdown="full"]');
  const pad = (n) => String(n).padStart(2, "0");
  function tick() {
    const diff = CONFERENCE - Date.now();
    const minis = $$('[data-countdown="mini"]');
    if (diff <= 0) {
      minis.forEach((m) => (m.textContent = "Happening now"));
      if (full) full.innerHTML = '<div style="grid-column:1/-1"><b>We are gathered</b><span>Join us in prayer</span></div>';
      return false;
    }
    const d = Math.floor(diff / 864e5), h = Math.floor(diff / 36e5) % 24, m = Math.floor(diff / 6e4) % 60, s = Math.floor(diff / 1e3) % 60;
    minis.forEach((el) => (el.textContent = `${d}d ${pad(h)}h ${pad(m)}m to go`));
    if (full) Object.entries({ d: pad(d), h: pad(h), m: pad(m), s: pad(s) }).forEach(([k, v]) => { const b = $(`[data-u="${k}"]`, full); if (b.textContent !== v) b.textContent = v; });
    return true;
  }
  if (tick()) { const iv = setInterval(() => { if (!tick()) clearInterval(iv); }, 1000); }

  /* ---------------- Mobile menu ---------------- */
  const burger = $("#burger"), menu = $("#menu");
  function closeMenu() {
    if (menu.hidden) return;
    menu.hidden = true;
    burger.setAttribute("aria-expanded", "false");
    burger.setAttribute("aria-label", "Open menu");
    lockScroll(false);
  }
  burger.addEventListener("click", () => {
    if (!menu.hidden) return closeMenu();
    menu.hidden = false;
    burger.setAttribute("aria-expanded", "true");
    burger.setAttribute("aria-label", "Close menu");
    lockScroll(true);
  });
  $$("a", menu).forEach((a) => a.addEventListener("click", closeMenu));

  /* ---------------- Drawer ---------------- */
  let drawerIdx = -1, drawerReturn = null;
  function fillDrawer(i) {
    const d = DEPTS[i];
    drawerIdx = i;
    $("#drawerImg").src = d.img;
    $("#drawerNum").textContent = `Ministry ${num(i)} of ${DEPTS.length}`;
    $("#drawerTitle").textContent = d.name;
    $("#drawerTag").textContent = d.tagline;
    $("#drawerText").innerHTML = d.text.map((t) => `<p>${esc(t)}</p>`).join("");
    $("#drawerProgs").innerHTML = d.programmes.length
      ? `<div class="progs"><h4>Programmes</h4>${d.programmes.map(([n, t]) => `<div class="prog"><b>${esc(n)}</b><p>${esc(t)}</p></div>`).join("")}</div>` : "";
    $(".drawer__panel").scrollTop = 0;
  }
  function openDrawer(id) {
    const i = DEPTS.findIndex((d) => d.id === id);
    if (i < 0) return;
    drawerReturn = document.activeElement;
    drawer.classList.remove("is-closing");
    drawer.hidden = false;
    lockScroll(true);
    fillDrawer(i);
    $(".x", drawer).focus({ preventScroll: true });
  }
  function closeDrawer() {
    if (drawer.hidden || drawer.classList.contains("is-closing")) return;
    const done = () => { drawer.hidden = true; drawer.classList.remove("is-closing"); lockScroll(false); drawerReturn && drawerReturn.focus && drawerReturn.focus({ preventScroll: true }); };
    if (REDUCED) return done();
    drawer.classList.add("is-closing");
    setTimeout(done, 430);
  }
  const stepDrawer = (dir) => fillDrawer((drawerIdx + dir + DEPTS.length) % DEPTS.length);
  $("#drawerPrev").addEventListener("click", () => stepDrawer(-1));
  $("#drawerNext").addEventListener("click", () => stepDrawer(1));

  /* ---------------- Event card tilt (desktop only, max 4deg) ---------------- */
  if (FINE && !REDUCED) {
    $$("[data-tilt]").forEach((c) => {
      c.addEventListener("mousemove", (e) => {
        const r = c.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        c.style.transition = "transform .15s linear";
        c.style.transform = `rotateY(${x * 8}deg) rotateX(${-y * 8}deg) translateY(-4px)`;
      });
      c.addEventListener("mouseleave", () => { c.style.transition = ""; c.style.transform = ""; });
    });
  }

  /* ---------------- One scroll loop ---------------- */
  const nav = $("#nav");
  const parallax = $$("[data-parallax]");
  const cols = $$(".gallery__col");
  const gallery = $(".gallery");
  const stack = $$(".stack__card");
  stack.forEach((c, i) => c.style.setProperty("--i", i));
  const words = $$(".statement .wd");
  const statement = $(".statement");

  let lastY = scrollY, ticking = false;
  function frame() {
    ticking = false;
    const y = scrollY, vh = innerHeight;

    // Nav: hide going down, show going up
    if (Math.abs(y - lastY) > 4) {
      nav.classList.toggle("is-hidden", y > lastY && y > 300 && menu.hidden);
      lastY = y;
    }
    if (REDUCED) return;

    // Image parallax: move gently against the scroll
    parallax.forEach((img) => {
      const box = img.parentElement.getBoundingClientRect();
      if (box.bottom < 0 || box.top > vh) return;
      const p = (box.top + box.height / 2 - vh / 2) / vh;
      img.style.transform = `translate3d(0, ${(-p * 100 * +img.dataset.parallax) - 8}%, 0)`;
    });

    // Gallery columns at different speeds
    if (gallery) {
      const g = gallery.getBoundingClientRect();
      if (g.bottom > 0 && g.top < vh) {
        const p = (g.top + g.height / 2 - vh / 2) / vh;
        cols.forEach((c) => (c.style.transform = `translate3d(0, ${p * +c.dataset.speed * 1000}px, 0)`));
      }
    }

    // Stacked cards: earlier cards shrink and dim as the next one covers them
    stack.forEach((c, i) => {
      const next = stack[i + 1];
      if (!next) return;
      const a = c.getBoundingClientRect(), b = next.getBoundingClientRect();
      const p = clamp(1 - (b.top - a.top) / a.height);
      c.style.transform = `scale(${1 - p * 0.06})`;
      c.style.filter = `brightness(${1 - p * 0.35})`;
    });

    // Word-by-word statement
    if (statement) {
      const r = statement.getBoundingClientRect();
      const p = clamp((vh * 0.85 - r.top) / (r.height + vh * 0.35));
      const n = Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle("on", i < n));
    }
  }
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);
  frame();
})();
