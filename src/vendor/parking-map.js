/*!
 * ParkingMap — mapa de parqueaderos EAFIT (Principal, Ingeniería, Idiomas)
 * Componente sin dependencias. Funciona con <script>, ES modules, React, Vue o Angular.
 *
 *   const map = ParkingMap.create(document.getElementById("mapa"), {
 *     onSelect: cell => console.log(cell),      // celda tocada
 *     onChange: stats => console.log(stats)     // conteos cada vez que cambia algo
 *   });
 *   map.setCellStatus("N-001", "taken");        // free | taken | held
 *   map.focusLot("N");                          // N | I | G
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.ParkingMap = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";

  /* ---------- Datos por defecto (reglamento EAFIT). Se pueden reemplazar con options.lots ---------- */
  const DEFAULT_LOTS = [
    { id: "N", name: "Principal", official: "Parqueadero norte · junto a Biblioteca",
      poly: [[428,24],[498,24],[520,88],[505,300],[488,420],[478,478],[362,478],[362,428],[428,428]],
      angle: 0, entry: [214,240], entryName: "Acceso Regional",
      mix: { pmr: 8, eco: 4, prov: 0, general: 426 }, motos: 0, labelAt: [468,-2] },
    { id: "I", name: "Ingeniería", official: "Parqueadero sur · Rueda Pelton",
      poly: [[150,940],[357,931],[342,995],[322,1066],[150,1050]],
      angle: 0, entry: [330,1062], entryName: "Acceso Las Vegas",
      mix: { pmr: 4, eco: 4, prov: 0, general: 178 }, motos: 270, labelAt: [250,924] },
    { id: "G", name: "Idiomas", official: "Parque Los Guayabos",
      poly: [[724,163],[857,256],[806,372],[664,322]],
      angle: 35, entry: [836,318], entryName: "Acceso Guayabos (calle 5 sur)",
      mix: { pmr: 4, eco: 0, prov: 3, general: 249 }, motos: 120, labelAt: [760,150] }
  ];

  const KIND_LABEL = { pmr: "Movilidad reducida", eco: "Baja emisión", prov: "Proveedores", general: "Uso general" };
  const STATUS_LABEL = { free: "Libre", taken: "Ocupada", held: "Reservada" };

  const CSS = `
.pm-root{--pm-land:#f4f2ea;--pm-campus:#fbf6dc;--pm-road:#e9a0b0;--pm-road2:#f6c79a;--pm-water:#a9cde6;--pm-green:#cfe8d4;--pm-bldg:#ddd8cf;
 --pm-fg:#17212b;--pm-muted:#5d6b78;--pm-surface:#fff;--pm-accent:#0b5fbf;
 --pm-free:#2c9a5b;--pm-taken:#c9473c;--pm-held:#e1a01a;--pm-pmr:#2f6fe0;--pm-eco:#14a39a;--pm-prov:#8a6bd1;
 position:relative;width:100%;font-family:system-ui,sans-serif}
.pm-root.pm-dark{--pm-land:#1b232b;--pm-campus:#232b25;--pm-road:#6c3a47;--pm-road2:#6b4a2c;--pm-water:#1f4560;--pm-green:#1f3a2a;--pm-bldg:#2c3540;
 --pm-fg:#e8eef3;--pm-muted:#93a3b2;--pm-surface:#18212a;--pm-accent:#5aa2ff;--pm-free:#3fc07a;--pm-taken:#e5675b;--pm-held:#f0b63a;--pm-pmr:#5d8ff0;--pm-eco:#2cc2b8;--pm-prov:#a58cec}
.pm-root svg{display:block;width:100%;height:100%;background:var(--pm-land);touch-action:manipulation}
.pm-root .pm-lbl{font:500 11px system-ui,sans-serif;fill:var(--pm-muted)}
.pm-root .pm-road-lbl{font:600 12px system-ui,sans-serif;fill:var(--pm-fg);opacity:.55}
.pm-root .pm-lot-name{font:800 13px system-ui,sans-serif;fill:var(--pm-fg);paint-order:stroke;stroke:var(--pm-surface);stroke-width:4px}
.pm-root .pm-cell{stroke:var(--pm-surface);stroke-width:.5;cursor:pointer;transition:fill .25s}
.pm-root .pm-cell:hover{stroke:var(--pm-fg);stroke-width:1.2}
.pm-root .pm-cell.pm-sel{stroke:var(--pm-fg);stroke-width:2}
@media (prefers-reduced-motion:reduce){.pm-root .pm-cell{transition:none}}`;

  function injectCSS() {
    if (document.getElementById("pm-style")) return;
    const s = document.createElement("style"); s.id = "pm-style"; s.textContent = CSS;
    document.head.appendChild(s);
  }
  const el = (t, a, p) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; };

  /* ---------- Geometría ---------- */
  function inPoly([x, y], poly) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
    }
    return c;
  }
  const rot = ([x, y], [cx, cy], a) => { const c = Math.cos(a), s = Math.sin(a), dx = x - cx, dy = y - cy; return [cx + dx * c - dy * s, cy + dx * s + dy * c]; };

  /** Genera las celdas de un parqueadero. Determinista: mismo polígono => mismos IDs. */
  function layoutLot(lot) {
    const total = lot.mix.pmr + lot.mix.eco + lot.mix.prov + lot.mix.general;
    const cx = lot.poly.reduce((a, p) => a + p[0], 0) / lot.poly.length;
    const cy = lot.poly.reduce((a, p) => a + p[1], 0) / lot.poly.length;
    const a = lot.angle * Math.PI / 180;
    const local = lot.poly.map(p => rot(p, [cx, cy], -a));
    const xs = local.map(p => p[0]), ys = local.map(p => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    for (let s = 1.6; s > 0.3; s -= 0.02) {
      const w = 7 * s, h = 13 * s, aisle = 8 * s, cells = [];
      let y = y0 + 2, row = 0;
      while (y + h < y1) {
        for (let x = x0 + 2; x + w < x1; x += w) {
          const corners = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
          if (corners.every(c => inPoly(c, local))) cells.push(corners.map(c => rot(c, [cx, cy], a)));
        }
        y += h + (row % 2 ? aisle : 0.6); row++;
      }
      if (cells.length >= total) {
        const [ex, ey] = lot.entry;
        const ctr = c => [(c[0][0] + c[2][0]) / 2, (c[0][1] + c[2][1]) / 2];
        cells.sort((p, q) => { const A = ctr(p), B = ctr(q); return Math.hypot(A[0] - ex, A[1] - ey) - Math.hypot(B[0] - ex, B[1] - ey); });
        const kinds = [...Array(lot.mix.pmr).fill("pmr"), ...Array(lot.mix.eco).fill("eco"), ...Array(lot.mix.prov).fill("prov")];
        return cells.slice(0, total).map((pts, i) => ({
          id: `${lot.id}-${String(i + 1).padStart(3, "0")}`,
          lot: lot.id,
          kind: kinds[i] || "general",
          // orden = cercanía al acceso (1 = la más cercana); útil para asignar celdas
          order: i + 1,
          center: ctr(pts).map(v => +v.toFixed(1)),
          points: pts.map(p => p.map(v => +v.toFixed(1)))
        }));
      }
    }
    return [];
  }

  /* ---------- Plano base ---------- */
  function drawBase(g) {
    const path = (d, fill, stroke, w) => el("path", { d, fill: fill || "none", stroke: stroke || "none", "stroke-width": w || 0, "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
    path("M 120 -10 L -40 1090", "none", "var(--pm-water)", 26);
    path("M 228 -10 C 200 300 120 700 72 1090", "none", "var(--pm-road)", 40);
    path("M 228 0 L 540 0 C 525 300 480 650 360 1076 L 72 1076 C 120 700 200 300 228 0 Z", "var(--pm-campus)");
    path("M 575 92 L 862 205 L 805 392 L 575 330 Z", "var(--pm-green)");
    path("M 205 240 C 180 520 160 800 150 1076", "none", "var(--pm-surface)", 9);
    path("M 205 240 L 425 240", "none", "var(--pm-surface)", 8);
    path("M 420 -10 C 600 60 760 130 900 190", "none", "var(--pm-road2)", 34);
    path("M 870 205 C 800 420 720 640 760 800 C 790 920 850 1000 870 1090", "none", "var(--pm-road2)", 30);
    path("M 560 -10 C 540 300 500 640 340 1090", "none", "var(--pm-road)", 36);
    path("M 560 330 C 650 370 760 395 860 380", "none", "var(--pm-road)", 18);
    path("M 735 1010 L 900 1060", "none", "var(--pm-surface)", 12);
    const box = (x, y, w, h, f = "var(--pm-bldg)") => el("rect", { x, y, width: w, height: h, rx: 4, fill: f }, g);
    el("ellipse", { cx: 365, cy: 110, rx: 48, ry: 92, fill: "var(--pm-green)" }, g);
    box(270,268,120,40); box(262,345,140,60); box(225,170,55,40); box(200,300,45,40);
    box(195,470,110,70); box(195,580,40,60); box(240,560,90,90,"var(--pm-green)");
    box(400,600,48,152); box(140,700,80,140); box(230,700,120,70);
    box(295,800,75,128,"var(--pm-green)"); box(160,850,120,80);
    box(590,350,70,200); box(600,630,120,90); box(620,780,120,170); box(480,800,60,40,"var(--pm-green)");
    box(760,560,110,140); box(560,140,110,70);
    const t = (x, y, s, c = "pm-lbl", r = 0) => { const e = el("text", { x, y, class: c, "text-anchor": "middle" }, g); if (r) e.setAttribute("transform", `rotate(${r} ${x} ${y})`); e.textContent = s; };
    t(365,112,"Cancha de grama"); t(332,380,"Biblioteca"); t(252,195,"Bloque 37"); t(222,322,"Bloque 35");
    t(286,612,"Parque Origen"); t(180,770,"Bloque 23"); t(332,870,"Cancha sintética"); t(424,690,"Portería","pm-lbl",-80);
    t(615,180,"Lote Los Guayabos"); t(640,450,"Rincón de Oviedo"); t(680,840,"Colegio San José"); t(815,640,"CineColombia"); t(532,822,"La Aguacatala");
    t(145,560,"Avenida Regional","pm-road-lbl",-80); t(470,650,"Avenida Las Vegas","pm-road-lbl",-74);
    t(690,95,"Calle 4 Sur","pm-road-lbl",22); t(790,560,"Carrera 43C","pm-road-lbl",-72); t(180,940,"Carrera 49","pm-road-lbl",-84);
  }

  /* ---------- API pública ---------- */
  function create(container, options = {}) {
    injectCSS();
    const lots = options.lots || DEFAULT_LOTS;
    const onSelect = options.onSelect || (() => {});
    const onChange = options.onChange || (() => {});
    const root = document.createElement("div");
    root.className = "pm-root" + (options.theme === "dark" ? " pm-dark" : "");
    container.innerHTML = ""; container.appendChild(root);

    const svg = el("svg", { viewBox: "0 0 890 1076", role: "img", "aria-label": "Mapa de parqueaderos EAFIT" }, root);
    drawBase(el("g", {}, svg));
    const gLots = el("g", {}, svg), gMarks = el("g", {}, svg);

    const cells = new Map();   // id -> {data, status, node}
    let selected = null, anim;

    const color = c => c.status === "taken" ? "var(--pm-taken)" : c.status === "held" ? "var(--pm-held)"
      : ({ pmr: "var(--pm-pmr)", eco: "var(--pm-eco)", prov: "var(--pm-prov)", general: "var(--pm-free)" })[c.data.kind];

    lots.forEach(lot => {
      el("polygon", { points: lot.poly.map(p => p.join(",")).join(" "), fill: "var(--pm-campus)", stroke: "var(--pm-held)", "stroke-width": 2 }, gLots);
      layoutLot(lot).forEach(data => {
        const node = el("polygon", { points: data.points.map(p => p.join(",")).join(" "), class: "pm-cell", "data-id": data.id }, gLots);
        const c = { data, status: (options.initialStatus && options.initialStatus[data.id]) || "free", node };
        node.style.fill = color(c);
        node.addEventListener("click", () => { select(data.id); onSelect(api.getCell(data.id)); });
        cells.set(data.id, c);
      });
      const [lx, ly] = lot.labelAt;
      el("text", { x: lx, y: ly + 16, class: "pm-lot-name", "text-anchor": "middle" }, gMarks).textContent = lot.name;
      const [ex, ey] = lot.entry;
      el("circle", { cx: ex, cy: ey, r: 9, fill: "var(--pm-accent)", stroke: "var(--pm-surface)", "stroke-width": 2.5 }, gMarks);
      el("text", { x: ex, y: ey + 4, "text-anchor": "middle", style: "font:700 11px system-ui;fill:#fff" }, gMarks).textContent = "E";
    });

    function repaint(c) { c.node.style.fill = color(c); }
    function select(id) {
      if (selected) cells.get(selected)?.node.classList.remove("pm-sel");
      selected = id;
      if (id) cells.get(id)?.node.classList.add("pm-sel");
    }
    function setView(target) {
      const from = svg.getAttribute("viewBox").split(" ").map(Number);
      cancelAnimationFrame(anim);
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) { svg.setAttribute("viewBox", target.join(" ")); return; }
      const t0 = performance.now();
      const step = t => { const k = Math.min(1, (t - t0) / 450), e = 1 - Math.pow(1 - k, 3);
        svg.setAttribute("viewBox", from.map((v, i) => (v + (target[i] - v) * e).toFixed(1)).join(" ")); if (k < 1) anim = requestAnimationFrame(step); };
      anim = requestAnimationFrame(step);
    }

    const api = {
      /** Info pública de una celda */
      getCell(id) { const c = cells.get(id); if (!c) return null; const lot = lots.find(l => l.id === c.data.lot);
        return { id, lot: c.data.lot, lotName: lot.name, kind: c.data.kind, kindLabel: KIND_LABEL[c.data.kind],
          status: c.status, statusLabel: STATUS_LABEL[c.status], order: c.data.order, entryName: lot.entryName }; },
      /** Todas las celdas (para sembrar el estado inicial en tu backend / JSON) */
      getCells() { return [...cells.values()].map(c => ({ id: c.data.id, lot: c.data.lot, kind: c.data.kind, order: c.data.order, status: c.status })); },
      getLots() { return lots.map(l => ({ id: l.id, name: l.name, official: l.official, entryName: l.entryName, mix: l.mix, motos: l.motos })); },
      /** status: "free" | "taken" | "held" */
      setCellStatus(id, status) { const c = cells.get(id); if (!c) return false; c.status = status; repaint(c); onChange(api.getStats()); return true; },
      /** Actualiza muchas celdas de una vez: { "N-001": "taken", ... } */
      setStatuses(map) { for (const id in map) { const c = cells.get(id); if (c) { c.status = map[id]; repaint(c); } } onChange(api.getStats()); },
      /** Conteos por parqueadero */
      getStats() { const out = {}; lots.forEach(l => out[l.id] = { name: l.name, total: 0, free: 0, taken: 0, held: 0 });
        cells.forEach(c => { const s = out[c.data.lot]; s.total++; s[c.status]++; }); return out; },
      /** Primera celda libre de un parqueadero, la más cercana al acceso. kind opcional. */
      firstFree(lotId, kind = "general") { let best = null;
        cells.forEach(c => { if (c.data.lot === lotId && c.status === "free" && c.data.kind === kind && (!best || c.data.order < best.data.order)) best = c; });
        return best ? api.getCell(best.data.id) : null; },
      select(id) { select(id); },
      focusLot(id) { const lot = lots.find(l => l.id === id); if (!lot) return;
        const pts = [...lot.poly, lot.entry], xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
        let x = Math.min(...xs) - 50, y = Math.min(...ys) - 50, w = Math.max(...xs) - x + 50, h = Math.max(...ys) - y + 50;
        const r = 890 / 1076; if (w / h > r) { const nh = w / r; y -= (nh - h) / 2; h = nh; } else { const nw = h * r; x -= (nw - w) / 2; w = nw; }
        setView([x, y, w, h]); },
      showAll() { setView([0, 0, 890, 1076]); },
      setTheme(t) { root.classList.toggle("pm-dark", t === "dark"); },
      destroy() { cancelAnimationFrame(anim); container.innerHTML = ""; cells.clear(); }
    };
    onChange(api.getStats());
    return api;
  }

  return { create, layoutLot, DEFAULT_LOTS };
});
