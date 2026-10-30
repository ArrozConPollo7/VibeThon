// Mapa real del campus. ParkingMap crea su propio DOM, así que cada mapa vive en un nodo
// persistente que App.morf no toca: el render deja un hueco y aquí se le reubica el nodo.
App.mapas = (function () {
  const ESTADO_MAPA = { LIBRE: 'free', RESERVADA: 'held', OCUPADA: 'taken' };
  const LOTE_FUERA_DEL_RETO = 'G';
  const PULSO_MS = 1500;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const instancias = {};

  const tema = () => document.documentElement.dataset.theme;

  function estadosActuales() {
    const estados = {};
    App.celdas().forEach((c) => {
      if (c.zona !== 'M') estados[c.id] = ESTADO_MAPA[c.estado];
    });
    return estados;
  }

  // El componente solo mira prefers-reduced-motion; también debe obedecer "Reducir animaciones".
  function sinZoomAnimado(accion) {
    if (!App.sinMovimiento()) {
      accion();
      return;
    }
    const original = window.matchMedia;
    window.matchMedia = () => ({ matches: true });
    accion();
    window.matchMedia = original;
  }

  function alSeleccionar(nombre, celda) {
    if (nombre === 'panel') {
      App.set({ celdaInfo: celda.id });
      return;
    }
    instancias[nombre].api.select(instancias[nombre].enfocada);
  }

  function crear(nombre) {
    const host = document.createElement('div');
    host.className = 'mapa-vivo';
    const vistos = estadosActuales();
    const api = window.ParkingMap.create(host, {
      lots: window.ParkingMap.DEFAULT_LOTS.filter((l) => l.id !== LOTE_FUERA_DEL_RETO),
      theme: tema(),
      initialStatus: vistos,
      onSelect: (celda) => alSeleccionar(nombre, celda)
    });
    instancias[nombre] = { host, api, vistos, enfocada: null, tema: tema() };
    return instancias[nombre];
  }

  function pulsar(inst, id) {
    const nodo = inst.host.querySelector(`[data-id="${id}"]`);
    if (!nodo) return;
    nodo.classList.add('celda-pulso');
    setTimeout(() => nodo.classList.remove('celda-pulso'), PULSO_MS);
  }

  function sincronizar() {
    const actuales = estadosActuales();
    Object.entries(instancias).forEach(([nombre, inst]) => {
      const cambios = {};
      Object.keys(actuales).forEach((id) => {
        if (actuales[id] !== inst.vistos[id]) cambios[id] = actuales[id];
      });
      if (!Object.keys(cambios).length) return;
      inst.api.setStatuses(cambios);
      inst.vistos = actuales;
      if (nombre !== 'panel') return;
      Object.keys(cambios)
        .filter((id) => cambios[id] === 'held')
        .forEach((id) => pulsar(inst, id));
    });
  }

  function quitarRuta(inst) {
    inst.host.querySelectorAll('.ruta, .ruta-casco').forEach((n) => n.remove());
  }

  function dibujarRuta(inst, puntos) {
    quitarRuta(inst);
    const svg = inst.host.querySelector('svg');
    const trazo = (puntos || []).map((p) => `${p.x},${p.y}`).join(' ');
    ['ruta-casco', 'ruta'].forEach((clase) => {
      const linea = document.createElementNS(SVG_NS, 'polyline');
      linea.setAttribute('class', clase);
      linea.setAttribute('points', trazo);
      linea.setAttribute('pathLength', '100');
      svg.appendChild(linea);
    });
  }

  function enfocar(inst, { celda, lote, placa, verTodo }) {
    if (inst.enfocada === celda) return;
    inst.enfocada = celda;
    inst.api.select(celda);
    sinZoomAnimado(() => (verTodo === 'si' ? inst.api.showAll() : inst.api.focusLot(lote)));
    dibujarRuta(inst, App.engine.ruta(placa).puntos);
  }

  // Se llama después de cada render: pone cada mapa en su hueco y aplica foco y tema.
  function montar() {
    document.querySelectorAll('[data-mapa]').forEach((hueco) => {
      const inst = instancias[hueco.dataset.mapa] || crear(hueco.dataset.mapa);
      if (inst.host.parentNode !== hueco) hueco.appendChild(inst.host);
      if (hueco.dataset.celda) enfocar(inst, hueco.dataset);
    });
    Object.values(instancias).forEach((inst) => {
      if (inst.tema === tema()) return;
      inst.tema = tema();
      inst.api.setTheme(inst.tema);
    });
  }

  function vista(nombre, lote) {
    const inst = instancias[nombre];
    if (!inst) return;
    sinZoomAnimado(() => (lote ? inst.api.focusLot(lote) : inst.api.showAll()));
  }

  function reiniciar() {
    Object.values(instancias).forEach((inst) => {
      inst.enfocada = null;
      inst.api.select(null);
      quitarRuta(inst);
      sinZoomAnimado(() => inst.api.showAll());
    });
  }

  const atributoFoco = ({ celda, lote, placa, verTodo }) =>
    celda
      ? ` data-celda="${App.esc(celda)}" data-lote="${App.esc(lote)}" data-placa="${App.esc(placa)}" data-ver-todo="${verTodo ? 'si' : 'no'}"`
      : '';

  function hueco(nombre, etiqueta, foco = {}) {
    return `<div class="mapa-hueco mapa-hueco--${nombre}" data-key="mapa-${nombre}" data-mapa="${nombre}" role="group" aria-label="${App.esc(etiqueta)}"${atributoFoco(foco)}></div>`;
  }

  // Dentro de .pm-root la leyenda hereda los mismos colores que pinta el componente.
  function leyenda() {
    const oscuro = tema() === 'dark' ? ' pm-dark' : '';
    const items = [
      ['free', 'Libre'],
      ['held', 'Reservada'],
      ['taken', 'Ocupada'],
      ['pmr', 'Movilidad reducida'],
      ['eco', 'Baja emisión']
    ];
    return `<ul class="pm-root mapa-leyenda${oscuro}">
      ${items.map(([clase, texto]) => `<li><span class="muestra muestra--${clase}"></span>${texto}</li>`).join('')}
    </ul>`;
  }

  return { montar, sincronizar, vista, reiniciar, hueco, leyenda };
})();
