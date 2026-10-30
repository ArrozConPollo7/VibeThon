// Valet (operador): el operador acepta, recibe e inspecciona el carro, lo estaciona, registra dónde quedó
// y lo entrega con el PIN del estudiante. Toda la verdad está en el motor (App.engine).
(function () {
  const { esc, icono, placaHTML, clases } = App;
  const OPERADORES = ['Carlos Restrepo', 'Luisa Mejía', 'Andrés Gil'];
  const VISTAS_FOTO = ['Frontal', 'Trasera', 'Lat. izq.', 'Lat. der.', 'Tablero'];
  const GRUPOS = [
    { id: 'aceptar', titulo: 'Por aceptar', estados: ['PAGADO'], icono: 'inbox' },
    { id: 'recibir', titulo: 'Aceptados · por recibir', estados: ['ACEPTADO'], icono: 'front_hand' },
    { id: 'fila', titulo: 'Recibidos / en fila', estados: ['ENTREGADO_A_VALET', 'EN_FILA', 'EN_RECORRIDO'], icono: 'queue' },
    { id: 'estacionados', titulo: 'Estacionados', estados: ['ESTACIONADO', 'LLAVES_EN_CUSTODIA'], icono: 'local_parking' },
    { id: 'solicitados', titulo: 'Solicitados / en traslado', estados: ['SOLICITADO', 'EN_TRASLADO'], icono: 'schedule' },
    { id: 'bahia', titulo: 'Listos en bahía', estados: ['LISTO_EN_BAHIA'], icono: 'flag' }
  ];
  const TEXTO_ESTADO = {
    PAGADO: 'Pagado, esperando operador',
    ACEPTADO: 'Aceptado',
    ENTREGADO_A_VALET: 'Recibido',
    EN_FILA: 'En fila',
    EN_RECORRIDO: 'Yendo a su celda',
    ESTACIONADO: 'Estacionado',
    LLAVES_EN_CUSTODIA: 'Llaves en custodia',
    SOLICITADO: 'Solicitado',
    EN_TRASLADO: 'En traslado',
    LISTO_EN_BAHIA: 'Listo en bahía',
    DEVUELTO: 'Entregado'
  };
  const PASOS = ['Aceptar', 'Recibir', 'Estacionar', 'Ubicación y llaves', 'Entregar con PIN'];
  const PASO_DE = {
    PAGADO: 0, ACEPTADO: 1, ENTREGADO_A_VALET: 1, EN_FILA: 1, EN_RECORRIDO: 2,
    ESTACIONADO: 3, LLAVES_EN_CUSTODIA: 3, SOLICITADO: 4, EN_TRASLADO: 4, LISTO_EN_BAHIA: 4
  };
  const u = () => App.ui.valetOperador || {};
  const operadorActivo = () => u().operador || OPERADORES[0];
  const fotosBorrador = () => u().fotos || {};

  function minutosTexto(min) {
    if (min == null) return '—';
    if (min < 60) return `${min} min`;
    return `${Math.floor(min / 60)} h ${min % 60} min`;
  }

  function pasosHTML(item) {
    const actual = PASO_DE[item.estado] != null ? PASO_DE[item.estado] : 0;
    const hitos = PASOS.map((t, i) => ({ titulo: t, estado: i < actual ? 'hecho' : i === actual ? 'actual' : 'pendiente' }));
    return App.stepper(hitos, 'Pasos del servicio');
  }

  function tarjeta(item, activa) {
    const borde = activa ? 'ring-2 ring-primary-container' : 'hover:bg-surface-container';
    return `<button type="button" class="w-full text-left p-space-sm rounded-xl bg-surface-container-lowest ${borde} flex flex-col gap-1" data-accion="valetSelOperador" data-placa="${esc(item.placa)}"${activa ? ' aria-current="true"' : ''}>
      <div class="flex items-center justify-between gap-2">${placaHTML(item.placa)}<span class="text-[11px] uppercase tracking-wide text-on-surface-variant">${esc(TEXTO_ESTADO[item.estado] || item.estado)}</span></div>
      <span class="text-label-md text-on-surface">${esc(item.conductor || '—')}</span>
      <span class="text-[12px] text-on-surface-variant flex flex-wrap gap-x-3">
        <span>Ticket ${esc(item.ticket || '—')}</span><span>En custodia ${minutosTexto(item.enCustodiaMin)}</span>
      </span>
    </button>`;
  }

  function columna(lista, sel) {
    if (!lista.length) {
      return `<div class="p-space-md rounded-xl bg-surface-container-low text-on-surface-variant text-body-md">
        No hay servicios de valet activos. Genera uno desde la vista Conductor.
      </div>`;
    }
    return GRUPOS.map((g) => {
      const items = lista.filter((i) => g.estados.includes(i.estado));
      if (!items.length) return '';
      return `<section class="flex flex-col gap-space-xs" data-key="grupo-${g.id}">
        <h3 class="text-label-lg text-on-surface flex items-center gap-2">${icono(g.icono, 18)} ${g.titulo}
          <span class="text-[12px] px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">${items.length}</span></h3>
        ${items.map((i) => tarjeta(i, i.placa === sel)).join('')}
      </section>`;
    }).join('');
  }

  function miniaturas(placa) {
    const fotos = fotosBorrador();
    return VISTAS_FOTO.map((vista) => {
      const dataUrl = fotos[vista];
      return `<div class="flex flex-col gap-1 p-2 rounded-xl bg-surface-container-lowest">
        <span class="text-[11px] uppercase tracking-wide text-on-surface-variant">${vista}</span>
        ${dataUrl
          ? `<img src="${dataUrl}" alt="Foto ${vista} del vehículo ${esc(placa)}" class="w-full h-20 object-cover rounded-lg">
             <button type="button" class="text-[12px] text-mal-texto underline min-h-[32px]" data-accion="valetQuitarFoto" data-vista="${vista}">Quitar</button>`
          : `<label class="text-[12px] text-primary-container cursor-pointer min-h-[44px] flex items-center">
               Subir foto<input type="file" accept="image/*" capture="environment" class="sr-only" data-foto data-vista="${vista}" data-placa="${esc(placa)}">
             </label>
             <button type="button" class="text-[12px] text-on-surface-variant underline min-h-[32px]" data-accion="valetFotoEjemplo" data-vista="${vista}" data-placa="${esc(placa)}">Usar foto de ejemplo</button>`}
      </div>`;
    }).join('');
  }

  function inspeccion(item) {
    const i = item.inspeccion;
    if (i) {
      return `<div class="p-space-sm rounded-xl bg-ok-fondo border border-ok-borde text-ok-texto flex flex-col gap-2">
        <b class="text-label-md">Inspección registrada</b>
        <span>Combustible ${esc(i.combustible)} · ${i.km.toLocaleString('es-CO')} km · ${(i.fotos || []).length}/4 fotos</span>
        ${i.novedades ? `<span>Novedades: ${esc(i.novedades)}</span>` : '<span>Sin novedades</span>'}
        ${(i.fotos || []).length ? `<div class="grid grid-cols-4 gap-1">${i.fotos.map((f) => `<img src="${f.dataUrl}" alt="Foto ${esc(f.vista)}" class="w-full h-14 object-cover rounded-md">`).join('')}</div>` : ''}
      </div>`;
    }
    if (!['ENTREGADO_A_VALET', 'EN_FILA'].includes(item.estado) && item.estado !== 'ACEPTADO') {
      return `<p class="text-body-md text-on-surface-variant">Recibe el vehículo para poder inspeccionarlo.</p>`;
    }
    return `<div class="flex flex-col gap-space-sm" data-key="inspeccion">
      <p class="text-label-md text-on-surface">Fotos del acta (máx. 4; se reducen a 480 px en el navegador)</p>
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">${miniaturas(item.placa)}</div>
      <div class="grid grid-cols-2 gap-2">
        <label class="text-label-md text-on-surface">Combustible
          <select id="op-combustible" class="w-full min-h-[44px] mt-1 rounded-lg bg-surface-container-lowest border border-outline-variant px-2">
            ${['vacío', '1/4', '1/2', '3/4', 'lleno'].map((c) => `<option value="${c}"${c === '1/2' ? ' selected' : ''}>${c}</option>`).join('')}
          </select>
        </label>
        <label class="text-label-md text-on-surface">Kilómetros
          <input id="op-km" type="number" min="0" value="48000" class="w-full min-h-[44px] mt-1 rounded-lg bg-surface-container-lowest border border-outline-variant px-2">
        </label>
      </div>
      <label class="text-label-md text-on-surface">Novedades (máx. 140)
        <input id="op-novedades" maxlength="140" placeholder="Ej.: rayón en la puerta derecha" class="w-full min-h-[44px] mt-1 rounded-lg bg-surface-container-lowest border border-outline-variant px-2">
      </label>
      <button type="button" class="min-h-[44px] rounded-xl bg-primary-container text-on-primary text-label-md" data-accion="valetGuardarInspeccion" data-placa="${esc(item.placa)}">Guardar inspección</button>
    </div>`;
  }

  function dondeQuedo(item) {
    const ub = item.ubicacion;
    const filas = [
      ['Parqueadero', (ub && ub.nombreZona) || item.nombreZona || '—'],
      ['Celda', (ub && ub.celdaId) || item.celdaId || 'Sin celda todavía'],
      ['Caja de llaves', (ub && ub.casillero) ? 'Caja ' + ub.casillero : (item.casillero ? 'Caja ' + item.casillero : 'Sin llaves en custodia')]
    ];
    const foco = item.celdaId ? { celda: item.celdaId, lote: item.zona } : {};
    const puedeGuardar = item.estado === 'ESTACIONADO' || item.estado === 'LLAVES_EN_CUSTODIA';
    return `<div class="flex flex-col gap-space-sm" data-key="donde">
      <dl class="grid grid-cols-1 gap-1">
        ${filas.map(([k, v]) => `<div class="flex justify-between gap-2 border-b border-outline-variant/40 py-1">
          <dt class="text-body-md text-on-surface-variant">${k}</dt><dd class="text-label-lg text-on-surface">${esc(v)}</dd></div>`).join('')}
      </dl>
      ${item.celdaId ? App.mapas.hueco('valetOperador', `Mapa: celda ${item.celdaId} en ${item.nombreZona || 'el parqueadero'}`, foco) : ''}
      ${item.estado === 'EN_RECORRIDO' ? `<button type="button" class="min-h-[44px] rounded-xl bg-primary-container text-on-primary text-label-md" data-accion="valetConfirmarEstacionado" data-placa="${esc(item.placa)}">Confirmar estacionado</button>` : ''}
      ${puedeGuardar ? `<label class="text-label-md text-on-surface">Nota de ubicación (máx. 140)
          <input id="op-nota" maxlength="140" value="${esc(ub && ub.nota || '')}" placeholder="Ej.: Sótano, junto a la columna 12" class="w-full min-h-[44px] mt-1 rounded-lg bg-surface-container-lowest border border-outline-variant px-2">
        </label>
        <button type="button" class="min-h-[44px] rounded-xl bg-primary-container text-on-primary text-label-md" data-accion="valetGuardarUbicacion" data-placa="${esc(item.placa)}">Guardar ubicación</button>` : ''}
      ${ub ? `<p class="${clases.nota}">Guardada a las ${App.hora(ub.hora)}${ub.nota ? ' — ' + esc(ub.nota) : ''}</p>` : ''}
    </div>`;
  }

  function entrega(item) {
    if (item.estado !== 'LISTO_EN_BAHIA') {
      return `<p class="text-body-md text-on-surface-variant">La entrega con PIN se habilita cuando el carro está listo en bahía.</p>`;
    }
    return `<div class="flex flex-col gap-space-sm" data-key="entrega">
      <label class="text-label-md text-on-surface">PIN que muestra el estudiante
        <input id="op-pin" inputmode="numeric" maxlength="4" placeholder="0000" class="w-full min-h-[44px] mt-1 rounded-lg bg-surface-container-lowest border border-outline-variant px-2 text-center text-headline-sm tracking-[0.4em]">
      </label>
      <button type="button" class="min-h-[44px] rounded-xl bg-primary-container text-on-primary text-label-md" data-accion="valetEntregarCliente" data-placa="${esc(item.placa)}">Entregar al estudiante</button>
    </div>`;
  }

  function detalle(item) {
    const mensaje = u().mensaje;
    const aviso = mensaje ? `<div class="p-space-sm rounded-xl ${mensaje.ok ? 'bg-ok-fondo border border-ok-borde text-ok-texto' : 'bg-mal-fondo border border-mal-borde text-mal-texto'} text-body-md" role="status">${esc(mensaje.texto)}</div>` : '';
    const aceptar = item.estado === 'PAGADO'
      ? `<button type="button" class="min-h-[44px] rounded-xl bg-primary-container text-on-primary text-label-md" data-accion="valetAceptar" data-placa="${esc(item.placa)}">Aceptar servicio (${esc(operadorActivo())})</button>`
      : '';
    const recibir = item.estado === 'ACEPTADO'
      ? `<button type="button" class="min-h-[44px] rounded-xl bg-primary-container text-on-primary text-label-md" data-accion="valetRecibir" data-placa="${esc(item.placa)}">Recibir vehículo (genera código V-XXX)</button>`
      : '';
    return `<div class="flex flex-col gap-space-md" data-key="detalle-valet">
      ${aviso}
      <header class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2">${placaHTML(item.placa, true)}<span class="text-label-lg text-on-surface">${esc(item.conductor || '—')}</span></div>
        <span class="text-[12px] uppercase tracking-wide text-on-surface-variant">${esc(TEXTO_ESTADO[item.estado] || item.estado)}</span>
      </header>
      <p class="text-body-md text-on-surface-variant">Ticket <b class="text-on-surface">${esc(item.ticket || '—')}</b> · Operador ${esc(item.operador || 'sin asignar')} · Tarifa ${item.tarifa ? '$' + item.tarifa.toLocaleString('es-CO') : '—'}</p>
      ${pasosHTML(item)}
      <h3 class="text-label-lg text-on-surface">1. Aceptar · 2. Recibir e inspeccionar</h3>
      ${aceptar}${recibir}
      ${inspeccion(item)}
      <h3 class="text-label-lg text-on-surface">3. Dónde quedó y llaves</h3>
      ${dondeQuedo(item)}
      <h3 class="text-label-lg text-on-surface">4. Entregar</h3>
      ${entrega(item)}
    </div>`;
  }

  App.pantallas.valetOperador = function () {
    const lista = App.engine.valetListar();
    const activos = lista.filter((i) => i.estado !== 'DEVUELTO');
    const sel = u().placa && activos.some((i) => i.placa === u().placa) ? u().placa : (activos[0] || {}).placa;
    const item = lista.filter((i) => i.placa === sel)[0];
    const selector = `<label class="text-label-md text-on-surface-variant flex items-center gap-2">Soy:
      <select class="min-h-[44px] rounded-lg bg-surface-container-lowest border border-outline-variant px-2 text-on-surface" data-campo="valetOperador.operador">
        ${OPERADORES.map((o) => `<option value="${o}"${o === operadorActivo() ? ' selected' : ''}>${o}</option>`).join('')}
      </select></label>`;

    return `<div class="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-space-md items-start" data-key="valet-operador">
      <div class="flex flex-col gap-space-md">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="text-headline-sm text-on-surface">Valet · operador</h2>
          <span class="text-[12px] px-2 py-1 rounded-full bg-surface-container-high text-on-surface-variant">${activos.length} activos</span>
        </div>
        ${selector}
        ${columna(activos, sel)}
      </div>
      <div class="p-space-md rounded-2xl bg-surface-container-low">
        ${item ? detalle(item) : `<p class="text-body-md text-on-surface-variant">Selecciona un servicio de la izquierda.</p>`}
      </div>
    </div>`;
  };

  App.acciones.valetSelOperador = (el) =>
    App.set({ valetOperador: { ...u(), placa: el.dataset.placa, mensaje: null, fotos: {} } });

  function responder(r, okTexto) {
    return App.set({
      valetOperador: { ...u(), mensaje: r && r.ok === false ? { ok: false, texto: r.error } : { ok: true, texto: okTexto } }
    });
  }

  App.acciones.valetAceptar = function (el) {
    const r = App.engine.valetAceptar(el.dataset.placa, operadorActivo());
    responder(r, 'Servicio aceptado. Recibe el vehículo cuando llegue.');
  };

  App.acciones.valetRecibir = function (el) {
    const r = App.engine.valetEntregar(el.dataset.placa);
    responder(r, 'Vehículo recibido. Ya puedes inspeccionarlo.');
  };

  App.acciones.valetGuardarInspeccion = function (el) {
    const fotos = fotosBorrador();
    const marcadas = Object.keys(fotos).map((vista) => ({ vista, dataUrl: fotos[vista] })).slice(0, 4);
    const r = App.engine.valetInspeccionar(el.dataset.placa, {
      combustible: document.getElementById('op-combustible').value,
      km: Number(document.getElementById('op-km').value),
      novedades: document.getElementById('op-novedades').value,
      fotos: marcadas
    });
    if (r && r.ok) App.ui.valetOperador = { ...u(), fotos: {} };
    responder(r, 'Inspección guardada con ' + marcadas.length + ' foto(s).');
  };

  App.acciones.valetConfirmarEstacionado = function (el) {
    responder(App.engine.estacionar(el.dataset.placa), 'Vehículo estacionado.');
  };

  App.acciones.valetGuardarUbicacion = function (el) {
    const nota = (document.getElementById('op-nota') || {}).value || '';
    responder(App.engine.valetRegistrarUbicacion(el.dataset.placa, { nota }), 'Ubicación y llaves guardadas.');
  };

  App.acciones.valetEntregarCliente = function (el) {
    const pin = (document.getElementById('op-pin') || {}).value || '';
    responder(App.engine.valetEntregarCliente(el.dataset.placa, pin), 'Vehículo entregado al estudiante.');
  };

  App.acciones.valetQuitarFoto = function (el) {
    const fotos = { ...fotosBorrador() };
    delete fotos[el.dataset.vista];
    App.set({ valetOperador: { ...u(), fotos } });
  };

  // Reduce la imagen a 480 px de lado, JPEG 0.7, y la guarda como dataUrl del borrador.
  function guardarFoto(vista, dataUrl) {
    App.set({ valetOperador: { ...u(), fotos: { ...fotosBorrador(), [vista]: dataUrl } } });
  }

  function reducir(archivo, vista) {
    const lector = new FileReader();
    lector.onload = () => {
      const img = new Image();
      img.onload = () => {
        const lado = 480;
        const escala = Math.min(1, lado / Math.max(img.width, img.height));
        const lienzo = document.createElement('canvas');
        lienzo.width = Math.round(img.width * escala);
        lienzo.height = Math.round(img.height * escala);
        lienzo.getContext('2d').drawImage(img, 0, 0, lienzo.width, lienzo.height);
        guardarFoto(vista, lienzo.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = () => App.set({ valetOperador: { ...u(), mensaje: { ok: false, texto: 'No se pudo leer la imagen.' } } });
      img.src = lector.result;
    };
    lector.onerror = () => App.set({ valetOperador: { ...u(), mensaje: { ok: false, texto: 'No se pudo leer el archivo.' } } });
    lector.readAsDataURL(archivo);
  }

  document.addEventListener('change', (evento) => {
    const input = evento.target.closest('[data-foto]');
    if (!input || !input.files || !input.files[0]) return;
    reducir(input.files[0], input.dataset.vista);
  });

  App.acciones.valetFotoEjemplo = function (el) {
    const placa = el.dataset.placa;
    const vista = el.dataset.vista;
    const lienzo = document.createElement('canvas');
    lienzo.width = 480;
    lienzo.height = 320;
    const ctx = lienzo.getContext('2d');
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, 480, 320);
    ctx.strokeStyle = '#f5b400';
    ctx.lineWidth = 6;
    ctx.strokeRect(24, 24, 432, 272);
    ctx.fillStyle = '#f5b400';
    ctx.font = 'bold 40px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(vista, 240, 150);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px system-ui, sans-serif';
    ctx.fillText(placa, 240, 210);
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText('Foto simulada · ' + App.engine.resumen().reloj, 240, 250);
    guardarFoto(vista, lienzo.toDataURL('image/jpeg', 0.7));
  };
})();
