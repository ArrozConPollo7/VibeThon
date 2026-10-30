// Valet (operador): recibe el carro, lo inspecciona, lo estaciona, guarda llaves y lo entrega con PIN.
// Solo lee y acciona a través de App.engine; el motor es el que manda (doble validación).
(function () {
  const GRUPOS = [
    { id: 'recibir', titulo: 'Por recibir', estados: ['PAGADO'], icono: 'vpn_key' },
    { id: 'fila', titulo: 'Recibidos / en fila', estados: ['ENTREGADO_A_VALET', 'EN_FILA', 'EN_RECORRIDO'], icono: 'directions_car' },
    { id: 'estacionados', titulo: 'Estacionados', estados: ['ESTACIONADO', 'LLAVES_EN_CUSTODIA'], icono: 'local_parking' },
    { id: 'solicitados', titulo: 'Solicitados / en traslado', estados: ['SOLICITADO', 'EN_TRASLADO'], icono: 'schedule' },
    { id: 'bahia', titulo: 'Listos en bahía', estados: ['LISTO_EN_BAHIA'], icono: 'pin_drop' }
  ];
  const COMBUSTIBLES = ['vacío', '1/4', '1/2', '3/4', 'lleno'];
  const TEXTO_ESTADO = {
    PAGADO: 'Pagado, esperando recepción',
    ENTREGADO_A_VALET: 'Recibido por el operador',
    EN_FILA: 'En fila del parqueadero',
    EN_RECORRIDO: 'Yendo a su celda',
    ESTACIONADO: 'Estacionado',
    LLAVES_EN_CUSTODIA: 'Llaves en custodia',
    SOLICITADO: 'Solicitado por el estudiante',
    EN_TRASLADO: 'En traslado a la bahía',
    LISTO_EN_BAHIA: 'Listo para entregar',
    DEVUELTO: 'Entregado'
  };
  const estado = () => (App.ui.valetOperador || {});

  function minutosTexto(min) {
    if (min == null) return '—';
    if (min < 60) return `${min} min`;
    return `${Math.floor(min / 60)} h ${min % 60} min`;
  }

  function tarjeta(item, activa) {
    const chip = '<span class="text-label-sm text-on-surface-variant">' + App.esc(TEXTO_ESTADO[item.estado] || item.estado) + '</span>';
    const borde = activa ? 'ring-2 ring-primary-container' : 'hover:bg-surface-container';
    return `<button type="button" class="w-full text-left p-space-sm rounded-xl bg-surface-container-lowest ${borde} flex flex-col gap-1" data-accion="valetSelOperador" data-placa="${App.esc(item.placa)}"${activa ? ' aria-current="true"' : ''}>
      <div class="flex items-center justify-between gap-2">${App.placaHTML(item.placa)}${chip}</div>
      <span class="text-label-md text-on-surface">${App.esc(item.conductor || '—')}</span>
      <span class="text-label-sm text-on-surface-variant flex flex-wrap gap-x-3">
        <span>Ticket ${App.esc(item.ticket || '—')}</span>
        <span>En custodia ${minutosTexto(item.enCustodiaMin)}</span>
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
        <h3 class="text-label-lg text-on-surface flex items-center gap-2">${App.icono(g.icono, 18)} ${g.titulo}
          <span class="text-label-sm px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">${items.length}</span></h3>
        ${items.map((i) => tarjeta(i, i.placa === sel)).join('')}
      </section>`;
    }).join('');
  }

  function casilla(id, etiqueta, marcada) {
    return `<label class="flex items-center gap-2 text-body-md text-on-surface">
      <input type="checkbox" data-check="${id}" class="w-5 h-5 rounded"${marcada ? ' checked' : ''}> ${etiqueta}
    </label>`;
  }

  function inspeccion(item) {
    const i = item.inspeccion;
    const puede = ['ENTREGADO_A_VALET', 'EN_FILA'].includes(item.estado);
    if (i) {
      return `<div class="p-space-sm rounded-xl bg-ok-fondo border border-ok-borde text-ok-texto flex flex-col gap-1">
        <b class="text-label-md">Inspección registrada</b>
        <span>Combustible ${App.esc(i.combustible)} · ${i.km} km · ${i.fotos}/4 fotos</span>
        ${i.novedades ? `<span>Novedades: ${App.esc(i.novedades)}</span>` : '<span>Sin novedades</span>'}
      </div>`;
    }
    if (!puede) {
      return `<p class="text-body-md text-on-surface-variant">La inspección se registra al recibir el vehículo.</p>`;
    }
    return `<div class="flex flex-col gap-space-sm" data-key="inspeccion">
      <p class="text-label-md text-on-surface">Checklist de fotos (cuenta como fotos del acta, máx. 4)</p>
      <div class="grid grid-cols-2 gap-2">
        ${casilla('frontal', 'Frontal', true)}${casilla('trasera', 'Trasera', true)}
        ${casilla('izq', 'Lat. izq.', true)}${casilla('der', 'Lat. der.', true)}
      </div>
      ${casilla('tablero', 'Tablero (foto extra)', false)}
      <div class="grid grid-cols-2 gap-2">
        <label class="text-label-md text-on-surface">Combustible
          <select id="op-combustible" class="w-full min-h-[44px] mt-1 rounded-lg bg-surface-container-lowest border border-outline-variant px-2">
            ${COMBUSTIBLES.map((c) => `<option value="${c}"${c === '1/2' ? ' selected' : ''}>${c}</option>`).join('')}
          </select>
        </label>
        <label class="text-label-md text-on-surface">Kilómetros
          <input id="op-km" type="number" min="0" value="48000" class="w-full min-h-[44px] mt-1 rounded-lg bg-surface-container-lowest border border-outline-variant px-2">
        </label>
      </div>
      <label class="text-label-md text-on-surface">Novedades (máx. 140)
        <input id="op-novedades" maxlength="140" placeholder="Ej.: rayón en la puerta derecha" class="w-full min-h-[44px] mt-1 rounded-lg bg-surface-container-lowest border border-outline-variant px-2">
      </label>
      <button type="button" class="min-h-[44px] rounded-xl bg-primary-container text-on-primary text-label-md" data-accion="valetGuardarInspeccion" data-placa="${App.esc(item.placa)}">Guardar inspección</button>
    </div>`;
  }

  function dondeQuedo(item) {
    const filas = [
      ['Parqueadero', item.nombreZona || '—'],
      ['Celda', item.celdaId || 'Sin celda todavía'],
      ['Caja de llaves', item.casillero ? 'Caja ' + item.casillero : 'Sin llaves en custodia']
    ];
    const foco = item.celdaId ? { celda: item.celdaId, lote: item.zona, placa: item.placa } : {};
    return `<div class="flex flex-col gap-space-sm" data-key="donde">
      <dl class="grid grid-cols-1 gap-1">
        ${filas.map(([k, v]) => `<div class="flex justify-between gap-2 border-b border-outline-variant/40 py-1">
          <dt class="text-body-md text-on-surface-variant">${k}</dt><dd class="text-label-lg text-on-surface">${App.esc(v)}</dd></div>`).join('')}
      </dl>
      ${item.celdaId ? App.mapas.hueco('valetOperador', `Mapa: celda ${item.celdaId} en ${item.nombreZona || 'el parqueadero'}`, foco) : ''}
      ${item.estado === 'EN_RECORRIDO' ? `<button type="button" class="min-h-[44px] rounded-xl bg-primary-container text-on-primary text-label-md" data-accion="valetConfirmarEstacionado" data-placa="${App.esc(item.placa)}">Confirmar estacionado</button>` : ''}
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
      <button type="button" class="min-h-[44px] rounded-xl bg-primary-container text-on-primary text-label-md" data-accion="valetEntregarCliente" data-placa="${App.esc(item.placa)}">Entregar al estudiante</button>
    </div>`;
  }

  function detalle(item) {
    const mensaje = estado().mensaje;
    const aviso = mensaje ? `<div class="p-space-sm rounded-xl ${mensaje.ok ? 'bg-ok-fondo border border-ok-borde text-ok-texto' : 'bg-mal-fondo border border-mal-borde text-mal-texto'} text-body-md" role="status">${App.esc(mensaje.texto)}</div>` : '';
    return `<div class="flex flex-col gap-space-md" data-key="detalle-valet">
      ${aviso}
      <header class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2">${App.placaHTML(item.placa, true)}<span class="text-label-lg text-on-surface">${App.esc(item.conductor || '—')}</span></div>
        <span class="text-label-sm text-on-surface-variant">${App.esc(TEXTO_ESTADO[item.estado] || item.estado)}</span>
      </header>
      <p class="text-body-md text-on-surface-variant">Ticket <b class="text-on-surface">${App.esc(item.ticket || '—')}</b> · Operador ${App.esc(item.operador || '—')} · Tarifa ${item.tarifa ? '$' + item.tarifa.toLocaleString('es-CO') : '—'}</p>
      <h3 class="text-label-lg text-on-surface">1. Recepción e inspección</h3>
      ${item.estado === 'PAGADO' ? `<button type="button" class="min-h-[44px] rounded-xl bg-primary-container text-on-primary text-label-md" data-accion="valetRecibir" data-placa="${App.esc(item.placa)}">Recibir vehículo (genera código V-XXX)</button>` : ''}
      ${inspeccion(item)}
      <h3 class="text-label-lg text-on-surface">2. Dónde quedó</h3>
      ${dondeQuedo(item)}
      <h3 class="text-label-lg text-on-surface">3. Entrega</h3>
      ${entrega(item)}
    </div>`;
  }

  App.pantallas.valetOperador = function () {
    const lista = App.engine.valetListar();
    const activos = lista.filter((i) => i.estado !== 'DEVUELTO');
    const sel = estado().placa && lista.some((i) => i.placa === estado().placa && i.estado !== 'DEVUELTO')
      ? estado().placa
      : (activos[0] || {}).placa;
    const item = lista.filter((i) => i.placa === sel)[0];

    return `<div class="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-space-md items-start" data-key="valet-operador">
      <div class="flex flex-col gap-space-md">
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-headline-sm text-on-surface">Valet · operador</h2>
          <span class="text-label-sm px-2 py-1 rounded-full bg-surface-container-high text-on-surface-variant">${activos.length} activos</span>
        </div>
        ${columna(activos, sel)}
      </div>
      <div class="p-space-md rounded-2xl bg-surface-container-low">
        ${item ? detalle(item) : `<p class="text-body-md text-on-surface-variant">Selecciona un servicio de la izquierda.</p>`}
      </div>
    </div>`;
  };

  App.acciones.valetSelOperador = (el) =>
    App.set({ valetOperador: { placa: el.dataset.placa, mensaje: null } });

  function responder(r, okTexto) {
    return App.set({
      valetOperador: {
        ...(App.ui.valetOperador || {}),
        mensaje: r && r.ok === false ? { ok: false, texto: r.error } : { ok: true, texto: okTexto }
      }
    });
  }

  App.acciones.valetRecibir = function (el) {
    const r = App.engine.valetEntregar(el.dataset.placa);
    responder(r, 'Vehículo recibido. Ya puedes inspeccionarlo.');
  };

  App.acciones.valetGuardarInspeccion = function (el) {
    const marcadas = document.querySelectorAll('[data-check]:checked').length;
    const km = Number(document.getElementById('op-km').value);
    const r = App.engine.valetInspeccionar(el.dataset.placa, {
      combustible: document.getElementById('op-combustible').value,
      km,
      novedades: document.getElementById('op-novedades').value,
      fotos: Math.min(marcadas, 4)
    });
    responder(r, 'Inspección guardada.');
  };

  App.acciones.valetConfirmarEstacionado = function (el) {
    const r = App.engine.estacionar(el.dataset.placa);
    responder(r, 'Vehículo estacionado.');
  };

  App.acciones.valetEntregarCliente = function (el) {
    const pin = document.getElementById('op-pin').value;
    const r = App.engine.valetEntregarCliente(el.dataset.placa, pin);
    responder(r, 'Vehículo entregado al estudiante.');
  };
})();
