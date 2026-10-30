// Núcleo de la interfaz: estado de la vista, lectura del motor, re-render y toasts.
// La UI nunca cambia el estado del motor directamente: llama sus funciones y re-renderiza.
window.App = (function () {
  const NOMBRE_ACCESO = { REGIONAL: 'Regional', LAS_VEGAS: 'Las Vegas' };
  const ACCESOS = ['REGIONAL', 'LAS_VEGAS'];
  const RE_CARRO = /^[A-Z]{3}[0-9]{3}$/;
  const RE_MOTO = /^[A-Z]{3}[0-9]{2}[A-Z]$/;
  const RE_NOMBRE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]{2,40}$/;
  const LARGO_PLACA = 6;
  const TIPO_TEXTO = { CARRO: 'Carro', MOTO: 'Moto' };
  const PASOS_SIM_MS = { 1: 3000, 10: 300 };
  const MAX_TOASTS = 3;

  const estadoInicial = () => ({
    vista: 'demo',
    tab: 'inicio',
    placa: null,
    fijada: false,
    form: { placa: '', nombre: '', acceso: null, horaClase: '', valet: false, errores: {} },
    valet: { metodo: 'TARJETA', dejeCarro: false, entregueLlaves: false },
    porteria: { acceso: 'REGIONAL', placa: '', editada: false, resultado: null },
    sim: { corriendo: false, velocidad: 1 },
    maxPosicion: {}
  });

  const App = {
    NOMBRE_ACCESO,
    ACCESOS,
    RE_NOMBRE,
    TIPO_TEXTO,
    ui: estadoInicial(),
    engine: null,
    pantallas: {},
    acciones: {},
    toasts: [],
    celdaVista: {}
  };

  // Devuelve una copia de ui con el parche aplicado, sin mutar el objeto anterior.
  App.set = function (parche) {
    App.ui = { ...App.ui, ...parche };
    App.programarRender();
  };
  App.setSub = function (rama, parche) {
    App.set({ [rama]: { ...App.ui[rama], ...parche } });
  };

  App.esc = (texto) =>
    String(texto == null ? '' : texto).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

  App.hora = function (min) {
    if (min == null) return '';
    return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
  };

  // La placa se guarda sin separadores; la máscara ABC 123 es solo visual.
  App.normalizarPlaca = (texto) =>
    String(texto || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, LARGO_PLACA);
  App.formatoPlaca = (placa) => (placa.length > 3 ? `${placa.slice(0, 3)} ${placa.slice(3)}` : placa);
  App.tipoPlaca = (placa) => (RE_CARRO.test(placa) ? 'CARRO' : RE_MOTO.test(placa) ? 'MOTO' : null);
  App.tipoVehiculo = (v) => v.tipo || App.tipoPlaca(v.placa) || 'CARRO';
  App.chipTipo = (tipo) =>
    `<span class="chip-tipo">${App.icono(tipo === 'MOTO' ? 'moto' : 'carro', 18)}${TIPO_TEXTO[tipo]}</span>`;
  App.nombreZona = (zona) => {
    const zonas = window.ParkData ? window.ParkData.zonas : {};
    return zonas[zona] ? zonas[zona].nombre : `Zona ${zona}`;
  };
  App.loteAcceso = (acceso) => (window.ParkData ? window.ParkData.accesos[acceso].lote : null);

  App.tituloPantalla = (titulo, chip, subtitulo) =>
    `<header class="cab-pantalla"><h1>${titulo}</h1>${chip || ''}${subtitulo ? `<p>${subtitulo}</p>` : ''}</header>`;

  const RADIO_ANILLO = 40;
  App.anillo = function (pct, etiqueta, texto) {
    const circunferencia = 2 * Math.PI * RADIO_ANILLO;
    return `<div class="anillo-caja" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="${etiqueta}">
      <svg class="anillo" viewBox="0 0 100 100" aria-hidden="true">
        <circle class="anillo-pista" cx="50" cy="50" r="${RADIO_ANILLO}"/>
        <circle class="anillo-valor" cx="50" cy="50" r="${RADIO_ANILLO}" stroke-dasharray="${circunferencia}" stroke-dashoffset="${circunferencia * (1 - pct / 100)}"/>
      </svg><span>${texto}</span>
    </div>`;
  };

  App.placaHTML = (placa, grande) =>
    `<span class="placa${grande ? ' placa--grande' : ''}">${App.esc(placa)}</span>`;

  // Lecturas del motor (forma fijada en TAREA_01B §2).
  App.vehiculos = () => App.engine.state.vehiculos;
  App.vehiculo = (placa) => App.vehiculos().find((v) => v.placa === placa) || null;
  App.celdas = () => App.engine.state.celdas;
  App.eventos = () => App.engine.state.eventos;
  App.fila = (acceso) =>
    App.vehiculos()
      .filter((v) => v.acceso === acceso && (v.estado === 'EN_PASARELA' || v.estado === 'CELDA_ASIGNADA'))
      .sort((a, b) => a.registradoEn - b.registradoEn || a.seq - b.seq);
  App.afuera = (acceso) =>
    App.vehiculos()
      .filter((v) => v.acceso === acceso && v.estado === 'AFUERA')
      .sort((a, b) => a.llegadaAfueraEn - b.llegadaAfueraEn);

  App.conductorActivo = function () {
    const { placa, fijada } = App.ui;
    if (fijada) return placa ? App.vehiculo(placa) : null;
    const activos = App.vehiculos().filter((v) => v.estado !== 'SALIO' && v.seq != null);
    return activos.sort((a, b) => b.seq - a.seq)[0] || null;
  };

  App.historico = (historico) =>
    Array.from({ length: 15 }, (_, i) => ({ hora: i + 6, pct: Number(historico.ocupacion[i + 6]) || 0 }));

  App.toast = function (tipo, mensaje, sonido) {
    App.sonido.play(sonido || tipo);
    const id = `t${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    App.toasts = [...App.toasts, { id, tipo, mensaje }].slice(-MAX_TOASTS);
    App.programarRender();
    setTimeout(() => App.quitarToast(id), tipo === 'error' ? 6000 : 4000);
  };
  App.quitarToast = function (id) {
    App.toasts = App.toasts.filter((t) => t.id !== id);
    App.programarRender();
  };

  // Traduce la respuesta del motor a un toast. Devuelve true si la acción salió bien.
  App.resultado = function (r, mensajeOk) {
    if (!r || r.ok === false) {
      App.toast('error', (r && r.error) || 'No se pudo completar la acción. Intenta de nuevo.');
      return false;
    }
    if (mensajeOk) App.toast('ok', mensajeOk);
    return true;
  };

  // Morfeo de DOM: conserva foco, scroll, <details> abiertos y animaciones entre renders.
  const clave = (n) => (n.nodeType === 1 ? n.getAttribute('data-key') : null);
  const compatible = (a, b) => a.nodeType === b.nodeType && a.nodeName === b.nodeName && !clave(a);

  function morfNodo(viejo, nuevo) {
    if (viejo.nodeType !== 1) {
      if (viejo.nodeValue !== nuevo.nodeValue) viejo.nodeValue = nuevo.nodeValue;
      return;
    }
    [...viejo.attributes].forEach((a) => {
      if (!nuevo.hasAttribute(a.name) && a.name !== 'open') viejo.removeAttribute(a.name);
    });
    [...nuevo.attributes].forEach((a) => {
      if (a.name !== 'open' && viejo.getAttribute(a.name) !== a.value) viejo.setAttribute(a.name, a.value);
    });
    if (viejo.hasAttribute('data-mapa')) return;
    if (viejo.nodeName === 'INPUT') {
      if (viejo.type === 'checkbox' || viejo.type === 'radio') viejo.checked = nuevo.hasAttribute('checked');
      else if (viejo.value !== (nuevo.getAttribute('value') || '')) viejo.value = nuevo.getAttribute('value') || '';
      return;
    }
    if (viejo.nodeName === 'TEXTAREA') {
      if (viejo.value !== nuevo.value) viejo.value = nuevo.value;
      return;
    }
    morfHijos(viejo, nuevo);
    if (viejo.nodeName === 'SELECT') {
      const marcada = nuevo.querySelector('option[selected]');
      if (marcada) viejo.value = marcada.value;
    }
  }

  function morfHijos(padre, nuevoPadre) {
    const conClave = new Map();
    [...padre.childNodes].forEach((n) => {
      if (clave(n)) conClave.set(clave(n), n);
    });
    let cursor = padre.firstChild;
    [...nuevoPadre.childNodes].forEach((n) => {
      const k = clave(n);
      const par = k ? conClave.get(k) : cursor && compatible(cursor, n) ? cursor : null;
      if (!par) {
        padre.insertBefore(n, cursor);
        return;
      }
      if (par === cursor) cursor = cursor.nextSibling;
      else padre.insertBefore(par, cursor);
      morfNodo(par, n);
    });
    while (cursor) {
      const siguiente = cursor.nextSibling;
      padre.removeChild(cursor);
      cursor = siguiente;
    }
  }

  App.morf = function (raiz, html) {
    const plantilla = document.createElement('template');
    plantilla.innerHTML = html;
    morfHijos(raiz, plantilla.content);
  };

  // Anima el desplazamiento de los carros en la fila (técnica FLIP).
  App.sinMovimiento = () => document.documentElement.dataset.movimiento === 'reducido';
  const posicionesFlip = (raiz) =>
    new Map([...raiz.querySelectorAll('[data-flip]')].map((el) => [el.dataset.flip, el.getBoundingClientRect()]));

  function animarFlip(raiz, antes) {
    if (App.sinMovimiento()) return;
    raiz.querySelectorAll('[data-flip]').forEach((el) => {
      const previo = antes.get(el.dataset.flip);
      if (!previo) return;
      const ahora = el.getBoundingClientRect();
      const dy = previo.top - ahora.top;
      const dx = previo.left - ahora.left;
      if (Math.abs(dy) < 1 && Math.abs(dx) < 1) return;
      el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], {
        duration: 220,
        easing: 'ease-out'
      });
    });
  }

  let renderPendiente = false;
  let fallaAvisada = false;
  App.programarRender = function () {
    if (renderPendiente) return;
    renderPendiente = true;
    requestAnimationFrame(() => {
      renderPendiente = false;
      App.render();
    });
  };

  App.render = function () {
    if (!App.engine) return;
    try {
      App.vigilarCelda();
      const raiz = document.getElementById('app');
      const antes = posicionesFlip(raiz);
      App.morf(raiz, App.pantallas.shell());
      App.morf(document.getElementById('panel-raiz'), App.pantallas.panelA11y());
      App.mapas.montar();
      // La bienvenida es modal: el resto no recibe foco mientras esté abierta.
      raiz.querySelectorAll(':scope > header, :scope > main').forEach((el) => {
        el.inert = Boolean(App.ui.bienvenida);
      });
      App.volverArribaSiCambiaTab();
      animarFlip(raiz, antes);
      fallaAvisada = false;
    } catch (error) {
      console.error('No se pudo actualizar la pantalla', error);
      if (!fallaAvisada) App.toast('error', 'No se pudo actualizar la pantalla. Pulsa Reiniciar para continuar.');
      fallaAvisada = true;
    }
    App.morf(document.getElementById('toasts'), App.pantallas.toasts());
  };

  // Cada pantalla del celular empieza arriba, también si el cambio de pestaña vino de una acción.
  let tabAnterior = null;
  App.volverArribaSiCambiaTab = function () {
    if (tabAnterior !== null && tabAnterior !== App.ui.tab) {
      const pantalla = document.getElementById('celular-pantalla');
      if (pantalla) pantalla.scrollTop = 0;
      if (window.matchMedia('(max-width: 640px)').matches) window.scrollTo(0, 0);
    }
    tabAnterior = App.ui.tab;
  };

  let filaVista = { placa: null, indice: -1 };

  // Avisa cuando el conductor activo recibe celda, aunque esté en otra pestaña.
  App.vigilarCelda = function () {
    const v = App.conductorActivo();
    if (!v) return;
    const previa = App.celdaVista[v.placa];
    if (v.celdaId && previa === null) {
      App.toast('ok', `¡Tienes celda! ${v.celdaId} reservada para ${v.placa}`, 'celda');
      App.confeti();
    }
    App.celdaVista = { ...App.celdaVista, [v.placa]: v.celdaId || null };
    const fila = App.fila(v.acceso).indexOf(v);
    if (filaVista.placa === v.placa && fila >= 0 && fila < filaVista.indice) App.sonido.play('avance');
    filaVista = { placa: v.placa, indice: fila };
  };

  // Simulación: la UI solo marca el ritmo; el motor no usa temporizadores.
  let temporizador = null;
  App.reprogramarSim = function () {
    clearInterval(temporizador);
    temporizador = null;
    if (App.ui.sim.corriendo) {
      temporizador = setInterval(() => {
        const r = App.engine.avanzar(1);
        if (r && r.ok === false) {
          App.resultado(r);
          App.setSub('sim', { corriendo: false });
          App.reprogramarSim();
        }
      }, PASOS_SIM_MS[App.ui.sim.velocidad]);
    }
  };

  App.reiniciarUI = function () {
    const { vista } = App.ui;
    App.ui = { ...estadoInicial(), vista };
    App.celdaVista = {};
    App.toasts = [];
    App.reprogramarSim();
  };

  return App;
})();
