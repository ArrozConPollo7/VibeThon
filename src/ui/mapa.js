// Mapa real del campus. ParkingMap crea su propio DOM, así que cada mapa vive en un nodo
// persistente que App.morf no toca: el render deja un hueco y aquí se le reubica el nodo.
App.mapas = (function () {
  const ESTADO_MAPA = { LIBRE: 'free', RESERVADA: 'held', OCUPADA: 'taken' };
  const PULSO_MS = 1500;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const instancias = {};

  // Fila en vivo: las ranuras siguen la vía real de cada acceso, de la portería hacia afuera.
  // Hay dos entradas por parqueadero (Norte, Ingeniería e Idiomas).
  const VIAS = {
    REGIONAL: [[214, 240], [206, 186], [218, 86], [226, 0]],
    CALLE4: [[506, 60], [570, 28], [650, 48], [735, 76]],
    LAS_VEGAS: [[330, 1062], [363, 1023], [384, 958], [422, 833]],
    CARRERA49: [[152, 985], [158, 900], [170, 800], [184, 700]],
    GUAYABOS: [[836, 318], [858, 380], [866, 450], [870, 520]],
    LOMA: [[700, 175], [660, 140], [618, 104], [578, 70]]
  };
  // En Las Vegas y Guayabos el texto va a la izquierda: a la derecha se sale del encuadre.
  const TEXTO_CORTE = {
    REGIONAL: { dx: 20, ancla: 'start' },
    CALLE4: { dx: 20, ancla: 'start' },
    LAS_VEGAS: { dx: -20, ancla: 'end' },
    CARRERA49: { dx: 20, ancla: 'start' },
    GUAYABOS: { dx: -20, ancla: 'end' },
    LOMA: { dx: 20, ancla: 'start' }
  };
  const PASO_RANURA = 22;
  const INICIO_RANURA = 0.6;
  const SEPARACION_CORTE = 0.6;
  const MAX_FICHAS = 10;
  const RADIO = { normal: 7, activa: 10, moto: 5 };
  const ESCALA_FICHA = { inicio: 1.4 };
  const DURACION_RECORRIDO_MS = 1200;

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
    if (nombre === 'inicio') {
      App.set({ celdaInicio: celda.id });
      return;
    }
    instancias[nombre].api.select(instancias[nombre].enfocada);
  }

  function crear(nombre) {
    const host = document.createElement('div');
    host.className = 'mapa-vivo';
    const vistos = estadosActuales();
    const api = window.ParkingMap.create(host, {
      lots: window.ParkingMap.DEFAULT_LOTS,
      theme: tema(),
      initialStatus: vistos,
      onSelect: (celda) => alSeleccionar(nombre, celda)
    });
    instancias[nombre] = { host, api, vistos, enfocada: null, tema: tema(), loteFila: null, escala: ESCALA_FICHA[nombre] || 1 };
    crearCapaAccesos(instancias[nombre]);
    crearCapaFila(instancias[nombre]);
    return instancias[nombre];
  }

  // Marca las seis entradas (dos por parqueadero) sobre el plano.
  function crearCapaAccesos(inst) {
    const g = nodoSvg('g', { class: 'accesos-campus', 'aria-hidden': 'true' }, inst.host.querySelector('svg'));
    const ETIQUETA = {
      CALLE4: { dx: 10, dy: 22, ancla: 'start' },
      LOMA: { dx: -10, dy: 22, ancla: 'end' }
    };
    App.ACCESOS.forEach((acceso) => {
      const d = window.ParkData && window.ParkData.accesos ? window.ParkData.accesos[acceso] : null;
      if (!d) return;
      nodoSvg('circle', { class: 'acceso-punto', cx: d.x, cy: d.y, r: 6 }, g);
      const etiqueta = ETIQUETA[acceso] || { dx: d.x < 680 ? 10 : -10, dy: -8, ancla: d.x < 680 ? 'start' : 'end' };
      nodoSvg('text', {
        class: 'acceso-nombre',
        x: d.x + etiqueta.dx,
        y: d.y + etiqueta.dy,
        'text-anchor': etiqueta.ancla
      }, g).textContent = App.NOMBRE_ACCESO[acceso];
    });
  }

  const nodoSvg = (etiqueta, atributos, padre) => {
    const nodo = document.createElementNS(SVG_NS, etiqueta);
    Object.entries(atributos).forEach(([k, v]) => nodo.setAttribute(k, v));
    padre.appendChild(nodo);
    return nodo;
  };

  // Punto a d unidades de la portería, caminando la vía; más allá del final se queda en su extremo.
  function puntoEnVia(via, d) {
    let resto = d;
    for (let i = 1; i < via.length; i += 1) {
      const [x0, y0] = via[i - 1];
      const [x1, y1] = via[i];
      const tramo = Math.hypot(x1 - x0, y1 - y0);
      if (resto <= tramo) return { x: x0 + ((x1 - x0) * resto) / tramo, y: y0 + ((y1 - y0) * resto) / tramo };
      resto -= tramo;
    }
    const [x, y] = via[via.length - 1];
    return { x, y };
  }

  const capacidadPasarela = () => window.ParkData.capacidadPasarela || 4;

  function ranura(acceso, i) {
    const corte = i >= capacidadPasarela() ? SEPARACION_CORTE : 0;
    return puntoEnVia(VIAS[acceso], PASO_RANURA * (i + INICIO_RANURA + corte));
  }

  const trasladar = ({ x, y }) => `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;

  function crearCorte(g, acceso) {
    const d = PASO_RANURA * (capacidadPasarela() + INICIO_RANURA - 0.2);
    const { x, y } = puntoEnVia(VIAS[acceso], d);
    const corte = nodoSvg('g', { class: 'fila-corte' }, g);
    nodoSvg('line', { x1: x - 16, y1: y, x2: x + 16, y2: y }, corte);
    const { dx, ancla } = TEXTO_CORTE[acceso];
    nodoSvg('text', { x: x + dx, y: y + 5, 'text-anchor': ancla }, corte).textContent = 'Pasarela llena';
    return corte;
  }

  function crearCapaFila(inst) {
    const g = nodoSvg('g', { class: 'fila-viva', 'aria-hidden': 'true' }, inst.host.querySelector('svg'));
    const cortes = Object.fromEntries(App.ACCESOS.map((a) => [a, crearCorte(g, a)]));
    const extras = Object.fromEntries(
      App.ACCESOS.map((a) => {
        const { x, y } = ranura(a, MAX_FICHAS);
        return [a, nodoSvg('text', { class: 'fila-mas', x, y: y + 5 }, g)];
      })
    );
    inst.fila = { g, cortes, extras, fichas: new Map(), firma: '' };
  }

  function crearFicha(inst, placa, punto) {
    const nodo = nodoSvg('g', { class: 'ficha', 'data-placa': placa }, inst.fila.g);
    nodoSvg('title', {}, nodo).textContent = placa;
    const anillo = nodoSvg('circle', { class: 'ficha-anillo', r: RADIO.activa * inst.escala + 5 }, nodo);
    const cuerpo = nodoSvg('circle', { class: 'ficha-cuerpo', r: RADIO.normal * inst.escala }, nodo);
    nodoSvg('text', { class: 'ficha-tu', y: -(RADIO.activa * inst.escala + 8) }, nodo).textContent = 'Tú';
    nodo.style.transform = trasladar(punto);
    nodo.style.opacity = '0';
    nodo.getBoundingClientRect();
    nodo.style.opacity = '1';
    return { nodo, anillo, cuerpo, punto };
  }

  function pintarFicha(inst, ficha, v, activa) {
    const moto = App.tipoVehiculo(v) === 'MOTO';
    const clases = ['ficha'];
    if (activa) clases.push('ficha--activa');
    if (v.valet) clases.push('ficha--valet');
    if (v.saleSinEstacionar) clases.push('ficha--sale');
    ficha.nodo.setAttribute('class', clases.join(' '));
    const radio = activa ? RADIO.activa : moto ? RADIO.moto : RADIO.normal;
    ficha.cuerpo.setAttribute('r', radio * inst.escala);
  }

  // Sale de la fila: recorre su ruta o se aleja por la vía, y se desvanece.
  function despedirFicha(inst, placa, ficha, acceso) {
    inst.fila.fichas.delete(placa);
    const v = App.vehiculo(placa);
    const aCelda = v && v.celdaId && v.estado !== 'SALIO';
    const alejandose = v && v.estado === 'SALIO' && v.saleSinEstacionar;
    if (App.sinMovimiento() || !inst.host.isConnected || !(aCelda || alejandose)) {
      ficha.nodo.remove();
      return;
    }
    const via = VIAS[acceso || v.acceso];
    const destino = aCelda ? App.engine.ruta(placa).puntos : [{ x: via[via.length - 1][0], y: via[via.length - 1][1] }];
    const cuadros = [ficha.punto, ...destino].map((p) => ({ transform: trasladar(p), opacity: 1 }));
    cuadros[cuadros.length - 1].opacity = 0;
    ficha.nodo.style.pointerEvents = 'none';
    const animacion = ficha.nodo.animate(cuadros, { duration: DURACION_RECORRIDO_MS, fill: 'forwards' });
    animacion.onfinish = () => ficha.nodo.remove();
  }

  const firmaVehiculo = (v) => `${v.placa}:${v.saleSinEstacionar ? 1 : 0}:${v.valet ? 1 : 0}`;

  function firmaFila(activa) {
    const filas = App.ACCESOS.map((a) => [...App.fila(a), '|', ...App.afuera(a)].map((v) => (v === '|' ? v : firmaVehiculo(v))).join(','));
    return `${activa}#${filas.join('#')}`;
  }

  function actualizarFila(inst) {
    const activo = App.conductorActivo();
    const placaActiva = activo ? activo.placa : '';
    const firma = firmaFila(placaActiva);
    if (firma === inst.fila.firma) return;
    inst.fila.firma = firma;
    const vigentes = new Set();
    const accesoDe = {};
    App.ACCESOS.forEach((acceso) => {
      const lista = [...App.fila(acceso), ...App.afuera(acceso)];
      lista.slice(0, MAX_FICHAS).forEach((v, i) => {
        const punto = ranura(acceso, i);
        const previa = inst.fila.fichas.get(v.placa);
        const ficha = previa || crearFicha(inst, v.placa, punto);
        ficha.punto = punto;
        ficha.nodo.style.transform = trasladar(punto);
        pintarFicha(inst, ficha, v, v.placa === placaActiva);
        inst.fila.fichas.set(v.placa, ficha);
        vigentes.add(v.placa);
        accesoDe[v.placa] = acceso;
      });
      inst.fila.cortes[acceso].classList.toggle('fila-corte--visible', App.afuera(acceso).length > 0);
      inst.fila.extras[acceso].textContent = lista.length > MAX_FICHAS ? `+${lista.length - MAX_FICHAS}` : '';
    });
    inst.fila.fichas.forEach((ficha, placa) => {
      if (!vigentes.has(placa)) despedirFicha(inst, placa, ficha, accesoDe[placa]);
    });
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
      actualizarFila(inst);
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

  function enfocar(inst, { celda, lote, placa }) {
    if (inst.enfocada === celda) return;
    inst.enfocada = celda;
    inst.api.select(celda);
    sinZoomAnimado(() => inst.api.focusLot(lote));
    dibujarRuta(inst, App.engine.ruta(placa).puntos);
  }

  // Mientras espera celda: enfoca el acceso del conductor, sin celda ni ruta.
  function enfocarFila(inst, lote) {
    if (inst.loteFila === lote) return;
    inst.loteFila = lote;
    inst.enfocada = null;
    inst.api.select(null);
    quitarRuta(inst);
    sinZoomAnimado(() => inst.api.focusLot(lote));
  }

  // Se llama después de cada render: pone cada mapa en su hueco y aplica foco y tema.
  function montar() {
    document.querySelectorAll('[data-mapa]').forEach((hueco) => {
      const inst = instancias[hueco.dataset.mapa] || crear(hueco.dataset.mapa);
      if (inst.host.parentNode !== hueco) hueco.appendChild(inst.host);
      if (hueco.dataset.celda) {
        inst.loteFila = null;
        enfocar(inst, hueco.dataset);
      } else if (hueco.dataset.loteFila) enfocarFila(inst, hueco.dataset.loteFila);
    });
    Object.values(instancias).forEach((inst) => {
      actualizarFila(inst);
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
      inst.loteFila = null;
      inst.api.select(null);
      quitarRuta(inst);
      sinZoomAnimado(() => inst.api.showAll());
    });
  }

  const atributoFoco = ({ celda, lote, placa }) =>
    celda ? ` data-celda="${App.esc(celda)}" data-lote="${App.esc(lote)}" data-placa="${App.esc(placa)}"` : '';

  const ALTURA_MAPA = { celular: 'h-80', panel: 'h-[70vh]', inicio: 'h-[280px]', valetOperador: 'h-80' };

  function hueco(nombre, etiqueta, foco = {}) {
    return `<div class="mapa-hueco rounded-xl ${ALTURA_MAPA[nombre]}" data-key="mapa-${nombre}" data-mapa="${nombre}" role="group" aria-label="${App.esc(etiqueta)}"${atributoFoco(foco)}></div>`;
  }

  function huecoFila(nombre, etiqueta, lote) {
    return hueco(nombre, etiqueta).replace(' data-mapa=', ` data-lote-fila="${App.esc(lote)}" data-mapa=`);
  }

  // Dentro de .pm-root la leyenda hereda los mismos colores que pinta el componente.
  function leyenda() {
    const oscuro = tema() === 'dark' ? ' pm-dark' : '';
    const items = [
      ['free', 'Libre'],
      ['held', 'Reservada'],
      ['taken', 'Ocupada'],
      ['pmr', 'Movilidad reducida'],
      ['eco', 'Baja emisión'],
      ['prov', 'Proveedores']
    ];
    return `<ul class="pm-root mapa-leyenda${oscuro} flex flex-wrap gap-x-3 gap-y-1 text-label-sm text-on-surface">
      ${items.map(([clase, texto]) => `<li class="flex items-center gap-1.5"><span class="muestra muestra--${clase}"></span>${texto}</li>`).join('')}
    </ul>`;
  }

  return { montar, sincronizar, vista, reiniciar, hueco, huecoFila, leyenda };
})();
