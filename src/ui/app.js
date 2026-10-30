// Armazón: barra de vistas, celular de Stitch, guía de siguiente paso y arranque de la aplicación.
(function () {
  const { esc, icono, clases } = App;
  const VISTAS = [
    { id: 'conductor', texto: 'Conductor' },
    { id: 'valet', texto: 'Valet' },
    { id: 'operacion', texto: 'Portería y operación' },
    { id: 'valetOperador', texto: 'Valet (operador)' },
    { id: 'demo', texto: 'Modo demo' }
  ];
  const TABS = [
    { id: 'inicio', texto: 'Inicio', icono: 'local_parking' },
    { id: 'turno', texto: 'Mi turno', icono: 'confirmation_number' },
    { id: 'valet', texto: 'Valet', icono: 'directions_car' }
  ];
  const HORA_FIN_GUION = 510;
  const MAX_AVISOS = 8;
  const TOAST = {
    ok: { caja: 'bg-ok-fondo border-ok-borde text-ok-texto', ico: 'text-ok-icono', nombre: 'check_circle' },
    error: { caja: 'bg-mal-fondo border-mal-borde text-mal-texto', ico: 'text-mal-icono', nombre: 'error' }
  };

  function barraSuperior(reloj) {
    return `<header class="sticky top-0 z-40 bg-surface-container-lowest/95 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] flex items-center gap-space-xs px-margin min-h-[56px]">
      <p class="flex items-center gap-1 text-label-md text-primary-container shrink-0" aria-label="Hora simulada ${esc(reloj)}">${icono('schedule', 20)}<span>${esc(reloj)}</span></p>
      <nav class="sin-barra flex-1 min-w-0 flex items-center gap-1 overflow-x-auto" aria-label="Vistas">
        ${VISTAS.map((v) => {
          const activa = App.ui.vista === v.id;
          return `<button type="button" class="shrink-0 min-h-[44px] px-3 rounded-xl text-label-md ${activa ? 'bg-primary-container text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-low'}" data-accion="irVista" data-vista="${v.id}"${activa ? ' aria-current="page"' : ''}>${v.texto}</button>`;
        }).join('')}
      </nav>
      ${window.ParkEngine.esStub ? '<span class="text-label-sm text-mal-texto">Motor de prueba</span>' : ''}
      ${App.pantallas.herramientas()}
    </header>`;
  }

  function selectorPlaca() {
    const activo = App.conductorActivo();
    const lista = App.vehiculos()
      .filter((v) => v.estado !== 'SALIO' && v.seq != null)
      .sort((a, b) => b.seq - a.seq);
    const opciones = activo && !lista.includes(activo) ? [activo, ...lista] : lista;
    return `<label class="${clases.etiqueta}"><span>Ver como</span>
      <select class="${clases.entrada}" data-accion-cambio="elegirPlaca">
        <option value=""${activo ? '' : ' selected'}>Conductor sin registrar</option>
        ${opciones.map((v) => `<option value="${esc(v.placa)}"${activo && activo.placa === v.placa ? ' selected' : ''}>${esc(v.placa)}</option>`).join('')}
      </select>
    </label>`;
  }

  // Le dice al jurado qué hacer ahora según el estado real del conductor activo.
  function siguientePaso() {
    const v = App.conductorActivo();
    const r = App.engine.resumen();
    if (!v || v.estado === 'SALIO') return 'Registra una llegada en Inicio: llena placa y nombre y pulsa Registrar llegada.';
    if (v.valet && v.valet.estado === 'SELECCIONADO') return 'Abre Valet en el celular y completa el pago.';
    if (v.valet && v.valet.estado === 'PAGADO') return 'Marca las dos casillas en Valet y confirma la entrega.';
    if (v.valet && v.valet.estado === 'LLAVES_EN_CUSTODIA') return 'Pulsa Pedir que traigan mi vehículo en Valet.';
    if (v.valet && ['SOLICITADO', 'EN_TRASLADO'].includes(v.valet.estado)) return 'El carro va hacia la bahía: avanza el reloj.';
    if (v.valet && v.valet.estado === 'LISTO_EN_BAHIA') return 'Abre Valet (operador) y escribe el PIN que muestra el estudiante para entregar el carro.';
    if (v.valet && v.valet.estado === 'DEVUELTO') return 'Pulsa Confirmar recepción del vehículo en Valet.';
    if (v.estado === 'AFUERA') return `${v.placa} espera afuera: confirma en portería a los de adelante para abrir cupo.`;
    if (v.estado === 'EN_PASARELA') {
      if (v.saleSinEstacionar) return `${v.placa} sale sin estacionar: confirma en portería a los de adelante.`;
      if (r.libres === 0 && App.engine.state.clock >= HORA_FIN_GUION) return 'Ya no hay más salidas en el guion. Pulsa Reiniciar para volver a las 07:30.';
      return `${v.placa} espera celda: inicia el reloj o pulsa Avanzar 1 min hasta que salga un carro.`;
    }
    if (v.estado === 'CELDA_ASIGNADA') {
      const primero = App.fila(v.acceso)[0];
      if (primero === v) return `${v.placa} ya es el primero: pulsa Verificar placa y reserva con acceso ${App.NOMBRE_ACCESO[v.acceso]}.`;
      if (primero && !primero.celdaId) return `${primero.placa} va adelante y aún no tiene celda: avanza el reloj.`;
      return `Confirma en portería a ${primero.placa}, que va adelante de ${v.placa} en ${App.NOMBRE_ACCESO[v.acceso]}.`;
    }
    if (v.valet) return 'El valet lleva el carro: avanza el reloj y sigue el avance en Valet.';
    if (v.estado === 'EN_RECORRIDO') return 'Pulsa Llegué a mi celda en el celular.';
    return 'Pulsa Salir del parqueadero para liberar la celda.';
  }

  function guia() {
    return `<details class="${clases.tarjeta} w-full"${App.ui.vista === 'demo' ? ' open' : ''}>
      <summary class="min-h-[28px] text-label-md text-on-surface cursor-pointer">Guía de la demo</summary>
      <div class="grid gap-space-sm md:grid-cols-[14rem_1fr] md:items-center">
        ${selectorPlaca()}
        <p class="text-body-lg text-on-surface" aria-live="polite"><b>Siguiente paso:</b> ${esc(siguientePaso())}</p>
      </div>
    </details>`;
  }

  function eventosDelConductor() {
    const v = App.conductorActivo();
    return v ? App.eventos().filter((e) => e.mensaje.includes(v.placa)) : [];
  }

  // La campana de Stitch muestra los eventos reales del conductor activo.
  function panelAvisos() {
    if (!App.ui.avisosAbierto) return '';
    const eventos = eventosDelConductor().slice(-MAX_AVISOS).reverse();
    return `<section class="absolute top-16 inset-x-3 z-30 max-h-72 overflow-y-auto ${clases.tarjeta} shadow-xl" aria-label="Notificaciones">
      <h2 class="${clases.titulo}">Notificaciones</h2>
      ${
        eventos.length
          ? `<ol class="flex flex-col gap-1.5">${eventos.map((e) => `<li class="flex gap-2 text-label-sm text-on-surface"><time class="font-mono text-on-surface-variant shrink-0">${esc(e.t)}</time><span class="min-w-0">${esc(e.mensaje)}</span></li>`).join('')}</ol>`
          : `<p class="${clases.nota}">Aún no tienes notificaciones.</p>`
      }
    </section>`;
  }

  function barraApp() {
    const pendientes = eventosDelConductor().length > (App.ui.avisosVistos || 0);
    return `<header class="relative shrink-0 z-20 bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] h-16 px-margin flex items-center justify-between">
      <div class="flex items-center gap-space-xs min-w-0">
        <span class="w-8 h-8 rounded-lg bg-primary-container text-on-primary flex items-center justify-center shrink-0">${icono('local_parking', 22)}</span>
        <div class="flex flex-col min-w-0"><span class="text-label-sm text-on-surface-variant leading-none">Campus EAFIT</span><span class="text-headline-sm text-primary-container leading-tight">ParkEAFIT</span></div>
      </div>
      <div class="flex items-center gap-space-xs">
        <button type="button" class="relative w-11 h-11 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors" data-accion="alternarAvisos" aria-expanded="${Boolean(App.ui.avisosAbierto)}" aria-label="Notificaciones">${icono('notifications', 24)}${pendientes ? '<span class="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-secondary-container"></span>' : ''}</button>
        <span class="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center shrink-0" aria-hidden="true">${icono('person', 18)}</span>
      </div>
    </header>`;
  }

  function celular() {
    const { tab, vista } = App.ui;
    const activo = App.conductorActivo();
    const hayTurno = activo && activo.estado !== 'SALIO';
    const marco = vista === 'demo'
      ? 'lg:sticky lg:top-[72px] h-[calc(100dvh-5.5rem)] w-full lg:w-[400px] shrink-0 rounded-2xl shadow-md'
      : 'h-[calc(100dvh-3.5rem)] w-full max-w-[540px] mx-auto';
    return `<div class="relative flex flex-col overflow-hidden bg-background ${marco}">
      ${barraApp()}
      ${panelAvisos()}
      <div class="flex-1 min-h-0 overflow-y-auto sin-barra px-margin py-space-md outline-none" id="celular-pantalla" tabindex="-1">${App.pantallas[tab]()}</div>
      <nav class="shrink-0 bg-surface-container-lowest/95 shadow-[0_-4px_12px_rgba(15,23,42,0.04)] pb-[env(safe-area-inset-bottom)]" aria-label="Secciones del conductor">
        <div class="flex items-center justify-around min-h-[64px] px-space-xs">
        ${TABS.map((t) => {
          const activa = tab === t.id;
          const punto = t.id === 'turno' && hayTurno ? '<span class="absolute top-2 right-1/3 w-2 h-2 rounded-full bg-secondary-container"></span>' : '';
          return `<button type="button" class="relative flex-1 flex flex-col items-center justify-center min-h-[56px] transition-colors text-label-sm ${activa ? 'text-primary-container font-semibold' : 'text-on-surface-variant'}" data-accion="irTab" data-tab="${t.id}"${activa ? ' aria-current="page"' : ''}>${icono(t.icono, 24)}<span class="mt-0.5">${t.texto}</span>${punto}</button>`;
        }).join('')}
        </div>
      </nav>
    </div>`;
  }

  // Modo demo: una sola pantalla para el jurado (estudiante + operador).
  function selectorPanelDemo() {
    const opcion = (id, texto) => {
      const activa = (App.ui.panelDemo === 'valetOperador') === (id === 'valetOperador');
      return `<button type="button" class="min-h-[44px] px-3 rounded-xl text-label-md ${activa ? 'bg-primary-container text-on-primary' : 'bg-surface-container-lowest text-on-surface-variant'}" data-accion="elegirPanelDemo" data-panel="${id}"${activa ? ' aria-current="true"' : ''}>${texto}</button>`;
    };
    return `<div class="flex flex-wrap gap-2 items-center" data-key="selector-panel-demo" role="group" aria-label="Panel del operador">
      <span class="text-label-md text-on-surface-variant">Panel derecho:</span>
      ${opcion('operacion', 'Portería y operación')}${opcion('valetOperador', 'Valet (operador)')}
    </div>`;
  }

  App.acciones.elegirPanelDemo = (el) => App.set({ panelDemo: el.dataset.panel });

  function cuerpo() {
    const { vista } = App.ui;
    if (vista === 'operacion') return `<main class="max-w-6xl mx-auto w-full p-margin">${App.pantallas.operacion()}</main>`;
    if (vista === 'valetOperador') return `<main class="max-w-6xl mx-auto w-full p-margin">${App.pantallas.valetOperador()}</main>`;
    if (vista === 'demo') {
      return `<main class="max-w-[1400px] mx-auto w-full p-margin flex flex-col gap-space-md">
        ${guia()}
        ${selectorPanelDemo()}
        <div class="flex flex-col lg:flex-row gap-space-md items-start">${celular()}<div class="flex-1 min-w-0 w-full">${App.ui.panelDemo === 'valetOperador' ? App.pantallas.valetOperador() : App.pantallas.operacion()}</div></div>
      </main>`;
    }
    return `<main class="w-full">${celular()}<div class="max-w-[540px] mx-auto p-margin">${guia()}</div></main>`;
  }

  function bienvenida() {
    if (!App.ui.bienvenida) return '';
    const paso = (ico, titulo, texto) => `<li class="flex items-start gap-space-sm">
      <span class="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-primary-container shrink-0">${icono(ico, 22)}</span>
      <div class="min-w-0"><b class="text-label-lg text-on-surface block">${titulo}</b><span class="${clases.nota}">${texto}</span></div>
    </li>`;
    return `<div class="fixed inset-0 z-50 bg-on-surface/40 backdrop-blur-sm flex items-center justify-center p-4" data-key="bienvenida" role="dialog" aria-modal="true" aria-labelledby="titulo-bienvenida">
      <div class="w-full max-w-[400px] max-h-full overflow-y-auto bg-surface-container-lowest rounded-2xl p-space-lg shadow-xl flex flex-col gap-space-md">
        <h1 class="text-headline-lg text-on-surface" id="titulo-bienvenida">Así funciona ParkEAFIT</h1>
        <ol class="flex flex-col gap-space-sm">
          ${paso('local_parking', 'Consulta', 'Mira las celdas libres y qué acceso te conviene.')}
          ${paso('confirmation_number', 'Registra', 'Marca tu llegada y sigue tu lugar en la fila.')}
          ${paso('location_on', 'Recibe celda', 'Te guiamos hasta ella, sin importar por dónde entraste.')}
        </ol>
        <button type="button" class="${clases.primario}" id="empezar-demo" data-accion="cerrarBienvenida">Empezar demo</button>
      </div>
    </div>`;
  }

  App.pantallas.shell = function () {
    return `${barraSuperior(App.engine.resumen().reloj)}${cuerpo()}${bienvenida()}`;
  };

  App.pantallas.toasts = function () {
    return App.toasts
      .map((t) => {
        const estilo = TOAST[t.tipo] || TOAST.ok;
        return `<div class="toast-entra pointer-events-auto w-full max-w-md rounded-2xl border shadow-lg p-space-sm flex items-start gap-space-xs ${estilo.caja}" data-key="${t.id}" role="${t.tipo === 'error' ? 'alert' : 'status'}">
          <span class="${estilo.ico}">${icono(estilo.nombre, 22, true)}</span>
          <p class="flex-1 min-w-0 text-label-sm">${esc(t.mensaje)}</p>
          <button type="button" class="w-7 h-7 flex items-center justify-center rounded-full" data-accion="cerrarToast" data-id="${t.id}" aria-label="Cerrar aviso">${icono('close', 18)}</button>
        </div>`;
      })
      .join('');
  };

  App.acciones.irVista = function (el) {
    const vista = el.dataset.vista;
    App.set({ vista, tab: vista === 'valet' ? 'valet' : App.ui.tab === 'valet' && vista === 'conductor' ? 'inicio' : App.ui.tab });
  };
  App.acciones.irTab = function (el) {
    const tab = el.dataset.tab;
    const vista = App.ui.vista === 'valet' && tab !== 'valet' ? 'conductor' : App.ui.vista === 'conductor' && tab === 'valet' ? 'valet' : App.ui.vista;
    App.set({ tab, vista });
  };
  App.acciones.cerrarBienvenida = function () {
    App.ui = { ...App.ui, bienvenida: false };
    App.render();
    const destino = document.getElementById('celular-pantalla');
    if (destino) destino.focus({ preventScroll: true });
  };
  App.acciones.alternarAvisos = () =>
    App.set({ avisosAbierto: !App.ui.avisosAbierto, avisosVistos: eventosDelConductor().length });
  App.acciones.cerrarToast = (el) => App.quitarToast(el.dataset.id);
  App.acciones.elegirPlaca = function (el) {
    const placa = el.value || null;
    if (placa) App.celdaVista = { ...App.celdaVista, [placa]: (App.vehiculo(placa) || {}).celdaId || null };
    App.set({ placa, fijada: true, valet: { ...App.ui.valet, dejeCarro: false, entregueLlaves: false } });
  };

  // Campos controlados: data-campo="rama.nombre" escribe en App.ui sin tocar el motor.
  // Reescribe la máscara sin mover el cursor. Borrar el espacio borra el carácter anterior.
  function formatearPlaca(el, evento, anterior) {
    const previo = App.normalizarPlaca(el.value.slice(0, el.selectionStart)).length;
    const texto = App.normalizarPlaca(el.value);
    const borroEspacio = evento.inputType === 'deleteContentBackward' && texto === anterior && previo > 0;
    const valor = borroEspacio ? texto.slice(0, previo - 1) + texto.slice(previo) : texto;
    const cursor = borroEspacio ? previo - 1 : previo;
    el.value = App.formatoPlaca(valor);
    const posicion = cursor > 3 ? cursor + 1 : cursor;
    el.setSelectionRange(posicion, posicion);
    return valor;
  }

  function actualizarCampo(el, evento) {
    const [rama, nombre] = el.dataset.campo.split('.');
    if (rama === 'calificacion') {
      App.set({ calificacion: { estrellas: 0, aspectos: [], propina: 'Sin propina', ...App.ui.calificacion, mensaje: el.value } });
      return;
    }
    let valor = el.type === 'checkbox' ? el.checked : el.value;
    if (el.classList.contains('entrada--placa')) valor = formatearPlaca(el, evento, App.ui[rama][nombre]);
    const parche = { [nombre]: valor };
    if (rama === 'form') parche.errores = { ...App.ui.form.errores, [nombre]: undefined };
    if (rama === 'porteria') {
      parche.resultado = null;
      if (nombre === 'placa') parche.editada = true;
      if (nombre === 'acceso') {
        parche.editada = false;
        parche.placa = '';
      }
    }
    App.setSub(rama, parche);
  }

  function escucharEventos() {
    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-accion]');
      if (el && !el.disabled) {
        App.sonido.play('click');
        App.acciones[el.dataset.accion](el);
      }
    });
    document.addEventListener('input', (e) => {
      if (e.target.dataset.campo) actualizarCampo(e.target, e);
    });
    document.addEventListener('change', (e) => {
      const nombre = e.target.dataset.accionCambio;
      if (nombre) App.acciones[nombre](e.target);
    });
    document.addEventListener('submit', (e) => {
      e.preventDefault();
      const nombre = e.target.dataset.formulario;
      if (nombre) App.acciones[nombre]();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && App.ui.bienvenida) App.acciones.cerrarBienvenida();
    });
  }

  function arrancar() {
    try {
      App.engine = window.ParkEngine.crear(window.ParkData);
    } catch (error) {
      console.error('No se pudo crear el motor', error);
      document.getElementById('app').innerHTML =
        '<section class="p-space-md text-on-surface" role="alert"><h1 class="text-headline-md">No se pudo iniciar ParkEAFIT</h1><p>El motor no aceptó los datos de src/data.js. Revisa esos archivos y recarga la página.</p></section>';
      return;
    }
    App.engine.suscribir(() => {
      App.mapas.sincronizar();
      App.programarRender();
    });
    escucharEventos();
    App.ui = { ...App.ui, bienvenida: true };
    App.render();
    document.getElementById('empezar-demo').focus();
  }

  arrancar();
})();
