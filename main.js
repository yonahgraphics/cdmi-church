/* ==========================================================
   CDMI Church: interactions
   GSAP + ScrollTrigger for scroll choreography, Lenis for smooth
   scrolling, and a canvas particle system for the motto morph.
   ========================================================== */
(() => {
  "use strict";

  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FINE_POINTER = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const rand = (a, b) => a + Math.random() * (b - a);

  // Conference: Sunday 20 Dec 2026, 09:00 East Africa Time (UTC+3)
  const CONFERENCE = Date.UTC(2026, 11, 20, 6, 0, 0);

  const hasGsap = typeof window.gsap !== "undefined";
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  $("#year").textContent = new Date().getFullYear();

  /* ---------------- Smooth scroll ---------------- */
  let lenis = null;
  if (!REDUCED && typeof window.Lenis !== "undefined" && hasGsap) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }
  const scrollToEl = (el) => {
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: -70, duration: 1.4, force: true });
    else el.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth" });
  };
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id.length < 2) return;
      const target = id === "#top" ? document.body : $(id);
      if (!target) return;
      e.preventDefault();
      closeMenu();
      scrollToEl(target);
    });
  });

  /* ---------------- Text splitting ---------------- */
  function splitChars(el) {
    const text = el.textContent;
    el.textContent = "";
    const chars = [];
    text.split(" ").forEach((word, wi, arr) => {
      const w = document.createElement("span");
      w.style.display = "inline-block";
      w.style.whiteSpace = "nowrap";
      [...word].forEach((ch) => {
        const c = document.createElement("span");
        c.className = "char";
        c.textContent = ch;
        w.appendChild(c);
        chars.push(c);
      });
      el.appendChild(w);
      if (wi < arr.length - 1) el.appendChild(document.createTextNode(" "));
    });
    return chars;
  }

  function splitWords(el) {
    const inners = [];
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
            const w = document.createElement("span");
            w.className = "w";
            const wi = document.createElement("span");
            wi.className = "wi";
            wi.textContent = part;
            w.appendChild(wi);
            frag.appendChild(w);
            inners.push(wi);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(el);
    return inners;
  }
  const style = document.createElement("style");
  style.textContent = ".w{display:inline-block;overflow:hidden;vertical-align:top;padding-bottom:.1em;margin-bottom:-.1em}.wi{display:inline-block;will-change:transform}";
  document.head.appendChild(style);

  /* ---------------- Closeable banners (return on reload only) ---------------- */
  const announce = $("#announce");
  const jubilee = $("#jubilee");
  const root = document.documentElement;

  function showAnnounce() {
    root.style.setProperty("--announce-h", announce.offsetHeight + "px");
    if (hasGsap) gsap.to(announce, { y: "0%", duration: 0.8, ease: "expo.out" });
    else announce.style.transform = "none";
  }
  function hideAnnounce() {
    root.style.setProperty("--announce-h", "0px");
    if (hasGsap) gsap.to(announce, { y: "-100%", duration: 0.6, ease: "expo.in", onComplete: () => announce.remove() });
    else announce.remove();
  }

  let lastFocus = null;
  function openJubilee() {
    lastFocus = document.activeElement;
    jubilee.hidden = false;
    lenis && lenis.stop();
    if (hasGsap) {
      gsap.fromTo(".jubilee__backdrop", { opacity: 0 }, { opacity: 1, duration: 0.6 });
      gsap.fromTo(".jubilee__card", { y: 80, rotationX: -25, scale: 0.85, opacity: 0, transformPerspective: 900 },
        { y: 0, rotationX: 0, scale: 1, opacity: 1, duration: 1.1, ease: "expo.out" });
      gsap.fromTo(".jubilee__badge", { scale: 0.3, rotation: -40 }, { scale: 1, rotation: 0, duration: 1.4, ease: "elastic.out(1, 0.6)", delay: 0.15 });
    }
    $(".close-btn", jubilee).focus({ preventScroll: true });
    confetti();
  }
  function closeJubilee() {
    if (jubilee.hidden) return;
    const done = () => { jubilee.hidden = true; lenis && lenis.start(); lastFocus && lastFocus.focus && lastFocus.focus({ preventScroll: true }); };
    if (hasGsap) {
      gsap.to(".jubilee__card", { y: 40, scale: 0.92, opacity: 0, duration: 0.45, ease: "power3.in" });
      gsap.to(".jubilee__backdrop", { opacity: 0, duration: 0.5, onComplete: done });
    } else done();
  }

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-close]");
    if (!btn) return;
    if (btn.dataset.close === "announce") hideAnnounce();
    if (btn.dataset.close === "jubilee") closeJubilee();
    if (btn.dataset.close === "drawer") closeDrawer();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closeDrawer(); closeJubilee(); closeMenu(); }
  });

  function confetti() {
    const cv = $("#confetti");
    if (!cv || REDUCED) return;
    const ctx = cv.getContext("2d");
    const r = cv.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = r.width * dpr; cv.height = r.height * dpr;
    ctx.scale(dpr, dpr);
    const colors = ["#f4c04e", "#ffde8a", "#2ad1c9", "#1e4fd8", "#ffffff"];
    const bits = Array.from({ length: 140 }, () => ({
      x: r.width / 2, y: r.height * 0.32,
      vx: rand(-7, 7), vy: rand(-11, -3), g: rand(0.16, 0.26),
      w: rand(5, 10), h: rand(3, 6), rot: rand(0, 6.28), vr: rand(-0.2, 0.2),
      c: colors[(Math.random() * colors.length) | 0], life: 1,
    }));
    let frame = 0;
    (function loop() {
      ctx.clearRect(0, 0, r.width, r.height);
      let alive = 0;
      bits.forEach((b) => {
        b.vx *= 0.985; b.vy += b.g; b.x += b.vx; b.y += b.vy; b.rot += b.vr;
        if (frame > 90) b.life -= 0.012;
        if (b.life <= 0) return;
        alive++;
        ctx.save(); ctx.globalAlpha = b.life; ctx.translate(b.x, b.y); ctx.rotate(b.rot);
        ctx.fillStyle = b.c; ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h * Math.cos(b.rot * 2)); ctx.restore();
      });
      frame++;
      if (alive && !jubilee.hidden) requestAnimationFrame(loop);
      else ctx.clearRect(0, 0, r.width, r.height);
    })();
  }

  /* ---------------- Countdown ---------------- */
  const full = $('[data-countdown="full"]');
  const pad = (n) => String(n).padStart(2, "0");
  let prev = {};
  function tick() {
    const diff = CONFERENCE - Date.now();
    const minis = $$('[data-countdown="mini"]');
    if (diff <= 0) {
      minis.forEach((m) => (m.textContent = "Happening now"));
      if (full) full.innerHTML = '<div class="countdown__unit" style="grid-column:1/-1"><b>We are gathered</b><span>Join us in prayer</span></div>';
      return false;
    }
    const d = Math.floor(diff / 864e5), h = Math.floor(diff / 36e5) % 24, m = Math.floor(diff / 6e4) % 60, s = Math.floor(diff / 1e3) % 60;
    minis.forEach((el) => (el.textContent = `${d}d ${pad(h)}h ${pad(m)}m ${pad(s)}s`));
    if (full) {
      const vals = { d: pad(d), h: pad(h), m: pad(m), s: pad(s) };
      Object.entries(vals).forEach(([k, v]) => {
        if (prev[k] === v) return;
        const b = $(`[data-u="${k}"]`, full);
        b.textContent = v;
        if (!REDUCED) { b.classList.remove("tick"); void b.offsetWidth; b.classList.add("tick"); }
      });
      prev = vals;
    }
    return true;
  }
  if (tick()) { const iv = setInterval(() => { if (!tick()) clearInterval(iv); }, 1000); }

  /* ---------------- Nav + mobile menu ---------------- */
  const nav = $("#nav"), burger = $("#burger"), menu = $("#menu");
  let menuOpen = false;
  function closeMenu() {
    if (!menuOpen) return;
    menuOpen = false;
    menu.classList.remove("is-open");
    menu.setAttribute("aria-hidden", "true");
    burger.setAttribute("aria-expanded", "false");
    lenis && lenis.start();
  }
  burger.addEventListener("click", () => {
    if (menuOpen) return closeMenu();
    menuOpen = true;
    menu.classList.add("is-open");
    menu.setAttribute("aria-hidden", "false");
    burger.setAttribute("aria-expanded", "true");
    lenis && lenis.stop();
    if (hasGsap) gsap.fromTo($$("a", menu), { y: 60, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.05, duration: 0.8, ease: "expo.out", delay: 0.2 });
  });
  let lastY = 0;
  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle("is-scrolled", y > 40);
    nav.classList.toggle("is-hidden", y > 400 && y > lastY + 2 && !menuOpen);
    if (y < lastY - 2) nav.classList.remove("is-hidden");
    lastY = y;
  };
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------------- Cursor ---------------- */
  if (FINE_POINTER && hasGsap && !REDUCED) {
    const cur = $(".cursor");
    const xTo = gsap.quickTo(cur, "x", { duration: 0.25, ease: "power3" });
    const yTo = gsap.quickTo(cur, "y", { duration: 0.25, ease: "power3" });
    window.addEventListener("mousemove", (e) => { xTo(e.clientX); yTo(e.clientY); });
    document.addEventListener("mouseover", (e) => cur.classList.toggle("is-hover", !!e.target.closest("a, button, .mcard, .sermon, .event")));
  }

  /* ---------------- Departments, events and the detail drawer ---------------- */
  const DEPTS = window.CDMI_DEPARTMENTS || [];
  const EVENTS = window.CDMI_EVENTS || [];
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const num = (i) => String(i + 1).padStart(2, "0");

  function renderDepartments() {
    const track = $("#minTrack");
    if (!track) return;
    track.innerHTML = DEPTS.map((d, i) => `
      <article class="mcard" role="button" tabindex="0" data-dept="${d.id}" aria-label="Explore ${esc(d.name)}">
        <div class="mcard__img"><img src="${d.img}" alt="" loading="lazy" /></div>
        <div class="mcard__body">
          <span class="mcard__num">${num(i)}</span>
          <h3>${esc(d.name)}</h3>
          <p class="mcard__tag">${esc(d.tagline)}</p>
          <div class="mcard__foot">
            <span class="mcard__more">Explore <i>→</i></span>
            ${d.programmes.length ? `<span class="mcard__count">${d.programmes.length} programme${d.programmes.length > 1 ? "s" : ""}</span>` : ""}
          </div>
        </div>
      </article>`).join("");
  }

  function renderEvents() {
    const list = $("#eventList");
    if (!list) return;
    list.innerHTML = EVENTS.map((e, i) => `
      <li class="event" data-fade>
        <button data-dept="${e.dept}" data-img="${e.img}">
          <span class="event__i">${num(i)}</span>
          <img class="event__thumb" src="${e.img}" alt="" loading="lazy" />
          <span class="event__name">${esc(e.name)}<small>${esc(e.by)}</small></span>
          <span class="event__by">${esc(e.by)}</span>
          <span class="event__arrow" aria-hidden="true">→</span>
        </button>
      </li>`).join("");
  }

  const drawer = $("#drawer");
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
      ? `<div class="progs"><h4>Programmes</h4>${d.programmes.map(([n, t]) => `<div class="prog"><b>${esc(n)}</b><p>${esc(t)}</p></div>`).join("")}</div>`
      : "";
    $(".drawer__panel").scrollTop = 0;
    if (hasGsap && !REDUCED) gsap.fromTo(".drawer__body > *", { y: 30, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.05, duration: 0.8, ease: "expo.out" });
  }
  function openDrawer(id) {
    const i = DEPTS.findIndex((d) => d.id === id);
    if (i < 0) return;
    drawerReturn = document.activeElement;
    drawer.hidden = false;
    lenis && lenis.stop();
    fillDrawer(i);
    if (hasGsap && !REDUCED) {
      gsap.fromTo(".drawer__backdrop", { opacity: 0 }, { opacity: 1, duration: 0.5 });
      gsap.fromTo(".drawer__panel", { xPercent: 100 }, { xPercent: 0, duration: 0.9, ease: "expo.out" });
      gsap.fromTo("#drawerImg", { scale: 1.3 }, { scale: 1, duration: 1.4, ease: "expo.out" });
    }
    $(".close-btn", drawer).focus({ preventScroll: true });
  }
  function closeDrawer() {
    if (!drawer || drawer.hidden) return;
    const done = () => { drawer.hidden = true; lenis && lenis.start(); drawerReturn && drawerReturn.focus && drawerReturn.focus({ preventScroll: true }); };
    if (hasGsap && !REDUCED) {
      gsap.to(".drawer__panel", { xPercent: 100, duration: 0.5, ease: "power3.in" });
      gsap.to(".drawer__backdrop", { opacity: 0, duration: 0.5, onComplete: done });
    } else done();
  }
  const stepDrawer = (dir) => fillDrawer((drawerIdx + dir + DEPTS.length) % DEPTS.length);
  $("#drawerPrev").addEventListener("click", () => stepDrawer(-1));
  $("#drawerNext").addEventListener("click", () => stepDrawer(1));
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-dept]");
    if (t) openDrawer(t.dataset.dept);
  });
  document.addEventListener("keydown", (e) => {
    const t = e.target.closest && e.target.closest(".mcard[data-dept]");
    if (t && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openDrawer(t.dataset.dept); }
    if (!drawer.hidden && e.key === "ArrowRight") stepDrawer(1);
    if (!drawer.hidden && e.key === "ArrowLeft") stepDrawer(-1);
  });

  function gatherPanels() {
    const panels = $$("#gpanels .gpanel");
    const activate = (p) => panels.forEach((x) => { const on = x === p; x.classList.toggle("is-active", on); x.setAttribute("aria-expanded", on); });
    panels.forEach((p) => {
      p.addEventListener("click", () => activate(p));
      p.addEventListener("focus", () => activate(p));
      if (FINE_POINTER) p.addEventListener("mouseenter", () => activate(p));
    });
  }

  function eventHover() {
    if (!FINE_POINTER || REDUCED || !hasGsap) return;
    const float = $("#eventFloat"), img = $("img", float);
    const xTo = gsap.quickTo(float, "x", { duration: 0.6, ease: "power3" });
    const yTo = gsap.quickTo(float, "y", { duration: 0.6, ease: "power3" });
    // Decide visibility from what is actually under the pointer. Checking on scroll too matters:
    // scrolling moves the list out from under a still cursor without firing any mouse event.
    let px = -1, py = -1, current = null;
    const update = () => {
      const el = px < 0 ? null : document.elementFromPoint(px, py);
      const b = el && !drawer.hidden ? null : el && el.closest("#eventList button[data-img]");
      if (b === current) return;
      current = b;
      if (b) {
        if (!img.src.endsWith(b.dataset.img)) img.src = b.dataset.img;
        gsap.to(float, { opacity: 1, scale: 1, rotation: gsap.utils.random(-6, 6), duration: 0.5, ease: "expo.out", overwrite: "auto" });
      } else {
        gsap.to(float, { opacity: 0, scale: 0.6, duration: 0.35, ease: "power3", overwrite: "auto" });
      }
    };
    window.addEventListener("mousemove", (e) => {
      px = e.clientX; py = e.clientY;
      xTo(px + 30); yTo(py - 120);
      update();
    }, { passive: true });
    window.addEventListener("scroll", update, { passive: true });
    document.documentElement.addEventListener("mouseleave", () => { px = py = -1; update(); });
  }

  /* ---------------- Particle morph (disintegrate / integrate) ---------------- */
  const Morph = (() => {
    const section = $("#morph");
    const canvas = $("#morphCanvas");
    if (!section || !canvas) return { start() {} };
    const ctx = canvas.getContext("2d");
    const caps = $$("[data-cap]");
    const bar = $("#morphBar");
    const PHRASES = [["TEACHING THE", "WHOLE TRUTH"], ["DELIVERING", "THE CAPTIVES"], ["MAKING", "DISCIPLES"], ["GO INTO ALL", "THE WORLD"]];
    const COLORS = ["#ffffff", "#f4c04e", "#2ad1c9"];
    let W = 0, H = 0, dpr = 1, N = 0;
    let keys = [];        // keyframes: [cloud, phrase0, phrase1, phrase2, burst]; each {x:Float32Array, y, z}
    let dir, col, phase, size;
    let s = 0, target = 0, visible = false, mx = 0, my = 0, cmx = 0, cmy = 0, running = false;

    function samplePhrase(lines, gap) {
      const off = document.createElement("canvas");
      off.width = W; off.height = H;
      const o = off.getContext("2d");
      const maxW = W * (W < 700 ? 0.9 : 0.8);
      let fs = Math.min(H * 0.2, 220);
      o.font = `800 ${fs}px "Bricolage Grotesque", sans-serif`;
      const widest = Math.max(...lines.map((l) => o.measureText(l).width));
      if (widest > maxW) fs *= maxW / widest;
      o.font = `800 ${fs}px "Bricolage Grotesque", sans-serif`;
      o.textAlign = "center"; o.textBaseline = "middle"; o.fillStyle = "#fff";
      const lh = fs * 0.95;
      lines.forEach((l, i) => o.fillText(l, W / 2, H * 0.47 + (i - (lines.length - 1) / 2) * lh));
      const data = o.getImageData(0, 0, W, H).data;
      const pts = [];
      for (let y = 0; y < H; y += gap) for (let x = 0; x < W; x += gap) if (data[(y * W + x) * 4 + 3] > 128) pts.push(x, y);
      // shuffle point pairs so particles travel to random letters (nicer swirl)
      for (let i = pts.length / 2 - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        [pts[i * 2], pts[j * 2]] = [pts[j * 2], pts[i * 2]];
        [pts[i * 2 + 1], pts[j * 2 + 1]] = [pts[j * 2 + 1], pts[i * 2 + 1]];
      }
      return pts;
    }

    function build() {
      const r = canvas.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      let gap = W < 700 ? 3 : 5;
      let sets;
      for (;;) {
        sets = PHRASES.map((p) => samplePhrase(p, gap));
        const most = Math.max(...sets.map((p) => p.length / 2));
        if (most < 6500 || gap > 9) break;
        gap++;
      }
      N = Math.max(...sets.map((p) => p.length / 2));
      const mk = () => ({ x: new Float32Array(N), y: new Float32Array(N), z: new Float32Array(N) });
      const cloud = mk(), burst = mk();
      const R = Math.max(W, H);
      for (let i = 0; i < N; i++) {
        const a = rand(0, Math.PI * 2), rr = Math.sqrt(Math.random()) * R * 0.75;
        cloud.x[i] = W / 2 + Math.cos(a) * rr; cloud.y[i] = H / 2 + Math.sin(a) * rr * 0.7; cloud.z[i] = rand(-900, 500);
        const b = rand(0, Math.PI * 2), br = rand(0.3, 1.2) * R;
        burst.x[i] = W / 2 + Math.cos(b) * br; burst.y[i] = H / 2 + Math.sin(b) * br; burst.z[i] = rand(-1400, 650);
      }
      const words = sets.map((pts) => {
        const k = mk(), n = pts.length / 2;
        for (let i = 0; i < N; i++) { const j = i % n; k.x[i] = pts[j * 2]; k.y[i] = pts[j * 2 + 1]; k.z[i] = 0; }
        return k;
      });
      keys = [cloud, ...words, burst];
      dir = new Float32Array(N * 3); col = new Uint8Array(N); phase = new Float32Array(N); size = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        const a = rand(0, Math.PI * 2), sp = rand(0.3, 1);
        dir[i * 3] = Math.cos(a) * sp * W * 0.35; dir[i * 3 + 1] = Math.sin(a) * sp * H * 0.45; dir[i * 3 + 2] = rand(-700, 400);
        const c = Math.random(); col[i] = c < 0.62 ? 0 : c < 0.86 ? 1 : 2;
        phase[i] = rand(0, Math.PI * 2);
        size[i] = gap * rand(0.45, 0.8);
      }
    }

    const ease = (t) => t * t * (3 - 2 * t);
    const plateau = (t) => ease(clamp((t - 0.18) / 0.64));

    function progress() {
      const r = section.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      return clamp(-r.top / (total || 1));
    }

    function frame(time) {
      if (!visible || REDUCED) { running = false; return; }
      target = progress() * (keys.length - 1);
      s += (target - s) * 0.09;
      cmx += (mx - cmx) * 0.05; cmy += (my - cmy) * 0.05;
      draw(time * 0.001);
      requestAnimationFrame(frame);
    }

    function draw(t) {
      const seg = Math.min(keys.length - 2, Math.floor(s));
      const lt = plateau(clamp(s - seg));
      const A = keys[seg], B = keys[seg + 1];
      const burst = Math.sin(Math.PI * lt);           // 0 at rest, 1 mid-transition
      const f = 900, cx = W / 2, cy = H / 2;
      const ry = cmx * 0.35, rx = cmy * 0.25;           // mouse orbit (radians)
      const cosY = Math.cos(ry), sinY = Math.sin(ry), cosX = Math.cos(rx), sinX = Math.sin(rx);
      ctx.clearRect(0, 0, W, H);
      for (let c = 0; c < 3; c++) {
        ctx.fillStyle = COLORS[c];
        for (let i = 0; i < N; i++) {
          if (col[i] !== c) continue;
          let x = A.x[i] + (B.x[i] - A.x[i]) * lt + dir[i * 3] * burst;
          let y = A.y[i] + (B.y[i] - A.y[i]) * lt + dir[i * 3 + 1] * burst;
          let z = A.z[i] + (B.z[i] - A.z[i]) * lt + dir[i * 3 + 2] * burst;
          x += Math.sin(t * 1.3 + phase[i]) * 1.1;
          y += Math.cos(t * 1.1 + phase[i]) * 1.1;
          // rotate around centre for a 3D feel
          let dx = x - cx, dy = y - cy;
          const x1 = dx * cosY - z * sinY, z1 = dx * sinY + z * cosY;
          const y1 = dy * cosX - z1 * sinX, z2 = dy * sinX + z1 * cosX;
          const p = f / (f + z2);
          if (p <= 0) continue;
          const sz = size[i] * p;
          ctx.globalAlpha = clamp(p * 0.95, 0.08, 1);
          ctx.fillRect(cx + x1 * p - sz / 2, cy + y1 * p - sz / 2, sz, sz);
        }
      }
      ctx.globalAlpha = 1;
      caps.forEach((cap, i) => {
        const o = clamp(1 - Math.abs(s - (i + 1)) * 2.6);
        cap.style.opacity = o;
        cap.style.transform = `translateY(${(1 - o) * 20}px)`;
      });
      if (bar) bar.style.transform = `scaleX(${s / (keys.length - 1)})`;
    }

    function start() {
      const go = () => {
        build();
        if (REDUCED) { s = PHRASES.length; draw(0); return; }
        new IntersectionObserver(([e]) => {
          visible = e.isIntersecting;
          if (visible && !running) { running = true; requestAnimationFrame(frame); }
        }).observe(section);
      };
      (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(go);
      let rt, lastW = window.innerWidth;
      window.addEventListener("resize", () => {
        clearTimeout(rt);
        rt = setTimeout(() => {
          // ignore mobile URL-bar height jitter; only rebuild on real size changes
          if (Math.abs(window.innerWidth - lastW) < 2 && Math.abs(canvas.getBoundingClientRect().height - H) < 120) return;
          lastW = window.innerWidth; build(); if (REDUCED) draw(0);
        }, 200);
      });
      if (FINE_POINTER) window.addEventListener("mousemove", (e) => { mx = e.clientX / window.innerWidth - 0.5; my = e.clientY / window.innerHeight - 0.5; });
    }
    return { start };
  })();

  /* ---------------- Conference tiles (image breaks apart / reassembles) ---------------- */
  const tilesEl = $("#tiles");
  let tiles = [];
  function buildTiles() {
    const r = tilesEl.getBoundingClientRect();
    const cols = r.width < 700 ? 6 : 10, rows = r.width < 700 ? 9 : 6;
    tilesEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    tilesEl.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    if (tiles.length !== cols * rows) {
      tilesEl.innerHTML = "";
      tiles = Array.from({ length: cols * rows }, () => tilesEl.appendChild(document.createElement("div")));
    }
    // cover-fit the 2000x1333 source across the whole grid
    const ar = 2000 / 1333;
    let bw = r.width, bh = r.width / ar;
    if (bh < r.height) { bh = r.height; bw = bh * ar; }
    const ox = (r.width - bw) / 2, oy = (r.height - bh) / 2;
    const tw = r.width / cols, th = r.height / rows;
    tiles.forEach((t, i) => {
      const cx = i % cols, cy = (i / cols) | 0;
      t.style.backgroundSize = `${bw}px ${bh}px`;
      t.style.backgroundPosition = `${ox - cx * tw}px ${oy - cy * th}px`;
    });
  }

  /* ---------------- Scroll choreography ---------------- */
  function initScroll() {
    if (!hasGsap || REDUCED) return;
    const vw = () => window.innerWidth, vh = () => window.innerHeight;

    // Hero: layers move at different depths; title disintegrates into flying letters
    const heroChars = $$(".hero__title .char");
    const heroTl = gsap.timeline({ scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: 1 } });
    heroTl
      .to(".hero__bg", { scale: 1.25, yPercent: 12, rotationX: 8, ease: "none" }, 0)
      .to(".hero__glow", { yPercent: -30, opacity: 0, ease: "none" }, 0)
      .to(".hero__badge", { yPercent: -160, rotationY: 200, scale: 0.6, ease: "none" }, 0)
      .to(heroChars, {
        x: () => rand(-0.6, 0.6) * vw(), y: () => rand(-0.9, 0.2) * vh(), z: () => rand(-300, 900),
        rotationX: () => rand(-180, 180), rotationY: () => rand(-180, 180), rotation: () => rand(-90, 90),
        opacity: 0, filter: "blur(8px)", stagger: { each: 0.008, from: "random" }, ease: "power1.in",
      }, 0)
      .to(".hero__sub, .hero__actions, .hero__eyebrow", { y: -80, opacity: 0, ease: "none" }, 0);

    // Generic reveals
    $$("[data-reveal]").forEach((el) => {
      const words = splitWords(el);
      gsap.from(words, { yPercent: 115, rotation: 6, duration: 1.1, ease: "expo.out", stagger: 0.05,
        scrollTrigger: { trigger: el, start: "top 86%" } });
    });
    gsap.set("[data-fade]", { y: 50, opacity: 0 });
    ScrollTrigger.batch("[data-fade]", {
      start: "top 90%",
      onEnter: (b) => gsap.to(b, { y: 0, opacity: 1, duration: 1, ease: "expo.out", stagger: 0.1, overwrite: true }),
    });

    // About image parallax
    gsap.fromTo(".about__frame img", { yPercent: -12 }, { yPercent: 0, ease: "none", scrollTrigger: { trigger: ".about", scrub: true } });
    gsap.from(".about__frame", { rotationY: -25, rotationX: 10, z: -200, opacity: 0, duration: 1.6, ease: "expo.out", scrollTrigger: { trigger: ".about", start: "top 70%" } });

    // Marquee skews with scroll
    gsap.to(".marquee", { rotate: 2, ease: "none", scrollTrigger: { trigger: ".marquee", scrub: true } });

    // Ministries: horizontal 3D scroller on wider screens
    const mm = gsap.matchMedia();
    mm.add("(min-width: 761px)", () => {
      const track = $("#minTrack");
      const dist = () => Math.max(0, track.scrollWidth - vw());
      const h = gsap.to(track, { x: () => -dist(), ease: "none",
        scrollTrigger: { trigger: ".ministries__pin", pin: true, scrub: 1, start: "top top", end: () => "+=" + dist(), invalidateOnRefresh: true } });
      $$(".mcard", track).forEach((card) => {
        gsap.fromTo(card, { rotationY: -35, z: -260, opacity: 0.3 }, { rotationY: 0, z: 0, opacity: 1, ease: "none",
          scrollTrigger: { trigger: card, containerAnimation: h, start: "left 100%", end: "left 55%", scrub: true } });
      });
    });
    mm.add("(max-width: 760px)", () => {
      gsap.from(".mcard", { x: 120, rotationY: -25, opacity: 0, stagger: 0.08, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: "#minTrack", start: "top 85%" } });
    });

    // Discipleship School: the path fills as you scroll and each step lights up
    mm.add("(min-width: 901px)", () => {
      gsap.to("#pathFill", { scaleX: 1, ease: "none", scrollTrigger: { trigger: ".path", start: "top 75%", end: "bottom 45%", scrub: 1 } });
    });
    mm.add("(max-width: 900px)", () => {
      gsap.to("#pathFill", { scaleY: 1, ease: "none", scrollTrigger: { trigger: ".path", start: "top 70%", end: "bottom 60%", scrub: 1 } });
    });
    $$(".step").forEach((st, i) => {
      ScrollTrigger.create({ trigger: st, start: "top 70%", toggleClass: { targets: st, className: "is-on" } });
      gsap.from(st, { y: 60, opacity: 0, duration: 1.1, delay: i * 0.12, ease: "expo.out", scrollTrigger: { trigger: ".path", start: "top 80%" } });
    });

    // Conference: photo shatters in from 3D space, holds, then disintegrates
    const scatter = () => ({
      x: () => rand(-0.7, 0.7) * vw(), y: () => rand(-0.6, 0.6) * vh(), z: () => rand(-1200, 600),
      rotationX: () => rand(-120, 120), rotationY: () => rand(-120, 120), rotation: () => rand(-45, 45), opacity: 0,
    });
    const conf = gsap.timeline({ scrollTrigger: { trigger: "#conference", start: "top bottom", end: "bottom top", scrub: 1.2 } });
    conf
      .fromTo(tiles, scatter(), { x: 0, y: 0, z: 0, rotationX: 0, rotationY: 0, rotation: 0, opacity: 1, ease: "power3.out", duration: 1, stagger: { amount: 0.4, from: "random" } })
      .to({}, { duration: 0.5 })
      .to(tiles, { ...scatter(), ease: "power2.in", duration: 1, stagger: { amount: 0.4, from: "center" } });
    gsap.from(".countdown__unit", { y: 60, rotationX: -70, opacity: 0, stagger: 0.1, duration: 1.2, ease: "expo.out", transformPerspective: 800, scrollTrigger: { trigger: ".countdown", start: "top 85%" } });

    // Anniversary: badge spins in 3D, giant 20 breathes
    gsap.fromTo("#annivBadge", { rotationY: -180, scale: 0.6 }, { rotationY: 20, scale: 1, ease: "none", scrollTrigger: { trigger: ".anniv", start: "top bottom", end: "center center", scrub: 1 } });
    gsap.fromTo(".anniv__big", { scale: 0.7, opacity: 0 }, { scale: 1.15, opacity: 1, ease: "none", scrollTrigger: { trigger: ".anniv", scrub: true } });
    $$("[data-count]").forEach((el) => {
      const o = { v: 0 };
      gsap.to(o, { v: +el.dataset.count, duration: 2, ease: "power2.out", onUpdate: () => (el.textContent = Math.round(o.v)), scrollTrigger: { trigger: el, start: "top 90%" } });
    });

    // Sermon cards drift at slightly different speeds
    $$(".sermon").forEach((s, i) => gsap.to(s, { y: (i % 3 - 1) * -30, ease: "none", scrollTrigger: { trigger: ".sermon-grid", scrub: true } }));

    // Footer: letters integrate from scattered dust
    const footChars = splitChars($(".footer__big [data-split]"));
    gsap.fromTo(footChars,
      { x: () => rand(-400, 400), y: () => rand(-300, 300), z: () => rand(-600, 300), rotation: () => rand(-180, 180), opacity: 0, filter: "blur(10px)" },
      { x: 0, y: 0, z: 0, rotation: 0, opacity: 1, filter: "blur(0px)", ease: "power2.out", stagger: { each: 0.02, from: "random" },
        scrollTrigger: { trigger: ".footer", start: "top bottom", end: "top 65%", scrub: 1 } });
    gsap.set(".footer__big", { perspective: 900 });
  }

  /* ---------------- Hero mouse parallax (uses CSS `translate`, independent of GSAP transforms) ---------------- */
  function heroMouse() {
    if (!FINE_POINTER || REDUCED) return;
    const layers = $$(".hero [data-depth]");
    let tx = 0, ty = 0, cx = 0, cy = 0;
    window.addEventListener("mousemove", (e) => { tx = e.clientX / innerWidth - 0.5; ty = e.clientY / innerHeight - 0.5; });
    (function loop() {
      cx += (tx - cx) * 0.06; cy += (ty - cy) * 0.06;
      if (window.scrollY < innerHeight * 1.2) layers.forEach((l) => {
        const d = +l.dataset.depth;
        l.style.translate = `${-cx * d * 120}px ${-cy * d * 80}px`;
      });
      requestAnimationFrame(loop);
    })();
  }

  /* ---------------- Tilt ---------------- */
  function tilt() {
    if (!FINE_POINTER || REDUCED || !hasGsap) return;
    $$(".tilt").forEach((el) => {
      const rx = gsap.quickTo(el, "rotationX", { duration: 0.6, ease: "power3" });
      const ry = gsap.quickTo(el, "rotationY", { duration: 0.6, ease: "power3" });
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        ry(((e.clientX - r.left) / r.width - 0.5) * 16);
        rx(-((e.clientY - r.top) / r.height - 0.5) * 16);
      });
      el.addEventListener("mouseleave", () => { rx(0); ry(0); });
    });
  }

  /* ---------------- Featured video (click to load) ---------------- */
  const feat = $("#featured");
  feat.addEventListener("click", () => {
    if ($("iframe", feat)) return;
    const f = document.createElement("iframe");
    f.src = `https://www.youtube-nocookie.com/embed/${feat.dataset.id}?autoplay=1&rel=0`;
    f.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    f.allowFullscreen = true;
    f.title = "Remember the Lord, Apostle Dr. Michael Kimuli";
    feat.appendChild(f);
  });

  /* ---------------- Boot ---------------- */
  renderDepartments();
  renderEvents();
  gatherPanels();
  const heroCharsAll = $$(".hero__title [data-split]").flatMap(splitChars);
  buildTiles();
  let rt;
  window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { buildTiles(); hasGsap && ScrollTrigger.refresh(); }, 250); });

  function intro() {
    document.body.classList.remove("is-loading");
    lenis && lenis.start();
    showAnnounce();
    Morph.start();
    heroMouse();
    tilt();
    eventHover();
    if (!hasGsap || REDUCED) { setTimeout(openJubilee, 900); return; }
    const tl = gsap.timeline();
    tl.fromTo(".hero__bg", { scale: 1.35, filter: "blur(14px)" }, { scale: 1, filter: "blur(0px)", duration: 2.2, ease: "expo.out" }, 0)
      .from(heroCharsAll, {
        x: () => rand(-500, 500), y: () => rand(-300, 300), z: () => rand(-800, 400),
        rotationX: () => rand(-180, 180), rotationY: () => rand(-180, 180), opacity: 0, filter: "blur(12px)",
        duration: 1.8, ease: "expo.out", stagger: { each: 0.025, from: "random" }, transformPerspective: 800,
      }, 0.2)
      .from(".hero__eyebrow, .hero__sub, .hero__actions", { y: 40, opacity: 0, stagger: 0.1, duration: 1.2, ease: "expo.out" }, 0.9)
      .from(".hero__badge", { scale: 0, rotationY: -270, opacity: 0, duration: 1.8, ease: "expo.out" }, 0.7)
      .add(() => { initScroll(); ScrollTrigger.refresh(); })
      .add(openJubilee, "+=0.2");
  }

  // Preloader: counts up while assets load, then wipes away
  const loader = $("#loader"), countEl = $("#loaderCount"), barEl = $("#loaderBar");
  const loaded = new Promise((res) => (document.readyState === "complete" ? res() : window.addEventListener("load", res)));
  const minTime = new Promise((res) => setTimeout(res, REDUCED ? 0 : 1400));
  const maxTime = new Promise((res) => setTimeout(res, 6000));
  let shown = 0, goal = 70;
  const counter = setInterval(() => {
    shown += (goal - shown) * 0.08 + 0.3;
    shown = Math.min(shown, goal);
    countEl.textContent = Math.round(shown);
    barEl.style.width = shown + "%";
  }, 30);
  Promise.race([Promise.all([loaded, minTime]), maxTime]).then(() => {
    goal = 100;
    setTimeout(() => {
      clearInterval(counter);
      countEl.textContent = "100"; barEl.style.width = "100%";
      if (hasGsap && !REDUCED) {
        gsap.to(loader, { clipPath: "inset(0 0 100% 0)", duration: 1.1, ease: "expo.inOut", onComplete: () => loader.remove() });
        gsap.delayedCall(0.45, intro);
      } else { loader.remove(); intro(); }
    }, 450);
  });
})();
