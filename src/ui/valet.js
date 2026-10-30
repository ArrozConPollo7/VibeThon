// Ruta de valet (Stitch 03, 04 y 05): los 3 pasos del reto, seguimiento de entrega y calificación.
(function () {
  const { esc, icono, placaHTML, clases } = App;
  const PRECIO = '$8.000';
  const PASOS = ['Selección y pago', 'Entrega del vehículo', 'Estacionamiento y llaves'];
  const METODOS = [
    { id: 'TARJETA', texto: 'Tarjeta', ico: 'credit_card' },
    { id: 'NEQUI', texto: 'Nequi', ico: 'account_balance_wallet' },
    { id: 'RECHAZO', texto: 'Simular rechazo', ico: 'error' }
  ];
  const ORDEN_VALET = ['ENTREGADO_A_VALET', 'EN_FILA', 'ESTACIONADO', 'LLAVES_EN_CUSTODIA', 'SOLICITADO', 'EN_TRASLADO', 'LISTO_EN_BAHIA', 'DEVUELTO'];
  const NO_APLICA = ['CELDA_ASIGNADA', 'EN_RECORRIDO', 'ESTACIONADO', 'SALIO'];
  const EN_ENTREGA = ['SOLICITADO', 'EN_TRASLADO', 'LISTO_EN_BAHIA', 'DEVUELTO'];
  const ASPECTOS = [
    { texto: 'Puntualidad en entrega', ico: 'bolt' },
    { texto: 'Cuidado del vehículo', ico: 'verified_user' },
    { texto: 'Amabilidad del operador', ico: 'sentiment_satisfied' },
    { texto: 'Facilidad de acceso', ico: 'directions_car' }
  ];
  const PROPINAS = ['$2.000', '$5.000', '$10.000', 'Sin propina'];
  const TEXTO_ESTRELLAS = { 1: 'Podría mejorar', 2: 'Aceptable', 3: 'Buen servicio', 4: 'Muy buen servicio', 5: '¡Excelente servicio!' };
  const ESTRELLAS = 5;
  const MENSAJE_MAX = 200;
  const CALIFICACION_VACIA = { estrellas: 0, aspectos: [], propina: 'Sin propina', mensaje: '' };

  const calificacion = () => App.ui.calificacion || CALIFICACION_VACIA;
  const finalizadas = () => App.ui.valetFinalizados || [];
  const porteria = (v) => `Portería ${App.NOMBRE_ACCESO[v.acceso]}`;

  function pasoActual(v) {
    if (!v.valet || v.valet.estado === 'SELECCIONADO') return 1;
    return v.valet.estado === 'PAGADO' ? 2 : 3;
  }

  function indicador(paso) {
    const pasos = PASOS.map((titulo, i) => ({
      titulo,
      ico: 'schedule',
      estado: i + 1 < paso ? 'hecho' : i + 1 === paso ? 'actual' : 'pendiente'
    }));
    return `<section class="${clases.tarjeta}">${App.stepper(pasos, 'Pasos del valet')}</section>`;
  }

  const aviso = () =>
    App.aviso('atencion', '<p>El valet no da prioridad: tu carro conserva su turno por hora de llegada. Lo que ganas es tu tiempo para llegar a clase.</p>');

  function puntoEntrega(v) {
    return `<div class="flex items-center gap-space-xs p-space-sm bg-surface-container rounded-xl">
      <span class="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center shrink-0 text-on-primary">${icono('pin_drop', 20)}</span>
      <div class="flex flex-col min-w-0"><span class="text-label-md text-on-surface">Bahía de entrega: ${porteria(v)}</span><span class="${clases.nota}">Bahía de valet del acceso</span></div>
    </div>`;
  }

  function pasoPago() {
    const { metodo } = App.ui.valet;
    const opcion = (m) => {
      const activa = metodo === m.id;
      return `<label class="flex items-center gap-3 min-h-[48px] p-3 rounded-xl cursor-pointer text-label-md text-on-surface transition-colors ${activa ? 'bg-surface-container-high' : 'bg-surface-container-low'}">
        <input type="radio" class="w-4 h-4 accent-[#1e3a8a]" name="metodo" data-campo="valet.metodo" value="${m.id}"${activa ? ' checked' : ''}>
        <span class="text-primary-container">${icono(m.ico, 20)}</span><span>${m.texto}</span>
      </label>`;
    };
    return `<section class="${clases.tarjeta}">
      <div class="flex items-center justify-between gap-2"><h2 class="${clases.titulo}">Valet estándar</h2><span class="text-label-md text-primary-container">${PRECIO} COP</span></div>
      <fieldset class="flex flex-col gap-space-xs"><legend class="${clases.nota} mb-1.5">Método de pago</legend>${METODOS.map(opcion).join('')}</fieldset>
      <button type="button" class="${clases.primario}" data-accion="pagarValet">${icono('credit_card', 22)}Pagar y reservar</button>
    </section>`;
  }

  function pasoEntrega(v) {
    const { dejeCarro, entregueLlaves } = App.ui.valet;
    const listo = dejeCarro && entregueLlaves;
    const casilla = (campo, marcada, texto) =>
      `<label class="flex items-center gap-3 min-h-[44px] text-label-md text-on-surface cursor-pointer"><input type="checkbox" class="w-5 h-5 accent-[#1e3a8a]" data-campo="valet.${campo}"${marcada ? ' checked' : ''}><span>${texto}</span></label>`;
    return `<section class="${clases.tarjeta}">
      <h2 class="${clases.titulo}">Punto de entrega</h2>
      ${puntoEntrega(v)}
      <p class="${clases.nota}">Recibes tu código V-XXX al confirmar la entrega.</p>
      ${casilla('dejeCarro', dejeCarro, 'Dejé el carro')}
      ${casilla('entregueLlaves', entregueLlaves, 'Entregué las llaves')}
      <button type="button" class="${clases.primario}" data-accion="entregarValet"${listo ? '' : ' disabled'}>${icono('vpn_key', 22)}Confirmar entrega</button>
      ${listo ? '' : `<p class="${clases.nota} text-center">Disponible cuando marques las dos casillas.</p>`}
    </section>`;
  }

  function tarjetaVehiculo(v, chip) {
    const hora = App.hora(v.registradoEn != null ? v.registradoEn : v.llegadaAfueraEn);
    return `<section class="relative overflow-hidden ${clases.tarjeta}">
      <div class="absolute top-0 left-0 right-0 h-1 bg-secondary-container"></div>
      <div class="flex flex-wrap items-start justify-between gap-space-xs">
        <div class="flex flex-col gap-1">${placaHTML(v.placa, true)}
          <p class="${clases.nota}">Ticket: <span class="font-semibold text-primary-container">${esc(v.valet.ticket || v.valet.codigo || 'pendiente')}</span></p>
          <p class="${clases.nota}">Operador: <span class="font-semibold text-on-surface">${esc(v.valet.operador || 'por asignar')}</span>${v.valet.tarifa ? ` · $${v.valet.tarifa.toLocaleString('es-CO')} COP` : ''}</p></div>
        ${chip}
      </div>
      <div class="grid grid-cols-2 gap-space-xs">
        <div class="bg-surface-container-low rounded-xl p-2.5 flex flex-col"><span class="${clases.nota}">Ingreso</span><span class="text-headline-sm text-on-surface">${hora}</span></div>
        <div class="bg-surface-container-low rounded-xl p-2.5 flex flex-col"><span class="${clases.nota}">Seguridad</span>
          <span class="flex items-center gap-1 text-primary-container text-label-sm">${icono('vpn_key', 18)}${v.valet.casillero ? `Casillero ${esc(v.valet.casillero)}` : 'Llaves con el valet'}</span></div>
      </div>
    </section>`;
  }

  function pasoCustodia(v) {
    const { estado, casillero } = v.valet;
    const indice = ORDEN_VALET.indexOf(estado);
    const hitos = [
      { titulo: 'Recibido', detalle: 'El valet tiene tu carro', ico: 'check', hecho: indice >= 0 },
      { titulo: 'En fila', detalle: 'Conserva tu turno por hora de llegada', ico: 'schedule', hecho: indice >= 1 },
      { titulo: v.celdaId && indice >= 2 ? `Estacionado en ${esc(v.celdaId)}` : 'Estacionado', ico: 'local_parking', hecho: indice >= 2 },
      { titulo: casillero ? `Llaves en casillero ${esc(casillero)}` : 'Llaves en casillero', ico: 'vpn_key', hecho: indice >= 3 }
    ];
    const ultimo = hitos.reduce((acum, h, i) => (h.hecho ? i : acum), 0);
    const pasos = hitos.map((h, i) => ({ ...h, estado: i === ultimo ? 'actual' : h.hecho ? 'hecho' : 'pendiente' }));
    const puedeSolicitar = estado === 'LLAVES_EN_CUSTODIA';
    const chip = puedeSolicitar ? App.chip('libre', 'Custodia activa') : App.chip('reservada', 'En proceso');
    return `<div class="flex flex-col gap-space-md">
      ${tarjetaVehiculo(v, chip)}
      <section class="${clases.tarjeta}"><h2 class="${clases.titulo}">Sigue tu carro</h2>${App.stepper(pasos, 'Estado del valet')}</section>
      <section class="${clases.tarjeta}"><h2 class="${clases.titulo}">Punto de entrega</h2>${puntoEntrega(v)}</section>
      <div class="flex flex-col items-center gap-2">
        <button type="button" class="${clases.primario}" data-accion="solicitarCarro"${puedeSolicitar ? '' : ' disabled'}>${icono('directions_car', 22)}Pedir que traigan mi vehículo</button>
        ${puedeSolicitar ? '' : `<p class="${clases.nota} text-center">Disponible cuando tus llaves estén en el casillero.</p>`}
      </div>
    </div>`;
  }

  // PIN real del motor; si el servicio aún no se pagó, se muestra un marcador.
  function pinEntrega(placa) {
    const v = App.vehiculo(placa);
    if (v && v.valet && v.valet.pin) return v.valet.pin;
    return '····';
  }

  function pantallaSeguimiento(v) {
    const devuelto = v.valet.estado === 'DEVUELTO';
    const faltan = v.valet.devolverEn != null ? Math.max(0, v.valet.devolverEn - App.engine.state.clock) : 0;
    const pasos = [
      { titulo: 'Solicitud recibida', detalle: 'Procesada por el sistema de parqueaderos', estado: 'hecho' },
      { titulo: 'Retiro de llaves', detalle: v.valet.casillero ? `Casillero ${esc(v.valet.casillero)}` : 'Llaves retiradas', estado: 'hecho' },
      { titulo: 'Vehículo en camino', detalle: devuelto ? 'Traslado terminado' : 'El valet lleva tu carro a la bahía', estado: devuelto ? 'hecho' : 'actual', ico: 'directions_car' },
      { titulo: 'Listo en bahía de entrega', detalle: devuelto ? 'Ya puedes recibirlo' : 'Pendiente', estado: devuelto ? 'actual' : 'pendiente', ico: 'location_on' }
    ];
    return `<div class="${clases.pantalla}" data-key="p-seguimiento">
      ${App.aviso('ok', `<p class="text-label-md">${devuelto ? 'Tu vehículo llegó' : 'Solicitud confirmada'}</p><p>${devuelto ? `Te espera en ${porteria(v)}` : `Tu vehículo va en camino a ${porteria(v)}`}</p>`)}
      ${App.tituloPantalla('Seguimiento de entrega', devuelto ? App.chip('libre', 'Listo') : App.chip('reservada', `En traslado ~${faltan} min`), `Valet · Ticket ${esc(v.valet.codigo || '')}`)}
      <section class="${clases.tarjeta} gap-space-md">
        <div class="flex items-center justify-between bg-surface-container-low rounded-xl p-space-sm">
          <div class="flex flex-col"><span class="${clases.nota}">Tiempo estimado de llegada</span>
            <div class="flex items-baseline gap-1"><span class="text-headline-lg text-primary-container">${faltan}</span><span class="${clases.nota}">min simulados</span></div></div>
          <span class="w-11 h-11 rounded-full bg-surface-container-highest flex items-center justify-center text-primary-container">${icono('schedule', 24)}</span>
        </div>
        <div class="flex flex-col gap-space-xs"><span class="text-label-md text-on-surface">Estado del despacho</span>${App.stepper(pasos, 'Estado del despacho')}</div>
        ${puntoEntrega(v)}
      </section>
      ${v.valet.inspeccion ? `<section class="${clases.tarjeta}">
        <h2 class="${clases.titulo}">Inspección al recibir</h2>
        <div class="grid grid-cols-2 gap-space-xs">
          <div class="bg-surface-container-low rounded-xl p-2.5 flex flex-col"><span class="${clases.nota}">Combustible</span><span class="text-label-lg text-on-surface">${esc(v.valet.inspeccion.combustible)}</span></div>
          <div class="bg-surface-container-low rounded-xl p-2.5 flex flex-col"><span class="${clases.nota}">Kilometraje</span><span class="text-label-lg text-on-surface">${v.valet.inspeccion.km.toLocaleString('es-CO')} km</span></div>
        </div>
        <p class="${clases.nota}">${v.valet.inspeccion.fotos}/4 fotos · ${v.valet.inspeccion.novedades ? esc(v.valet.inspeccion.novedades) : 'sin novedades'}</p>
      </section>` : ''}
      <section class="${clases.tarjeta}">
        <div class="flex flex-wrap items-center justify-between gap-2"><span class="${clases.nota}">Vehículo en entrega</span>${placaHTML(v.placa, true)}</div>
        <div class="bg-surface-container-low rounded-xl p-space-md flex flex-col items-center gap-1 text-center">
          <span class="${clases.nota}">Código PIN de entrega</span>
          <div class="flex items-center gap-2"><span class="text-headline-lg text-primary-container tracking-widest font-bold">${pinEntrega(v.placa)}</span><span class="text-primary-container">${icono('lock', 20)}</span></div>
          <p class="${clases.nota} mt-1">Muéstralo al operador del valet: es tu código de entrega.</p>
        </div>
      </section>
      <div class="flex flex-col gap-space-xs">
        <button type="button" class="${clases.primario}" data-accion="confirmarRecepcion"${devuelto ? '' : ' disabled'}>${icono('verified', 22)}Confirmar recepción del vehículo</button>
        <p class="${clases.nota} text-center">${devuelto ? 'Presiona este botón cuando hayas verificado tu vehículo.' : 'Disponible cuando tu vehículo llegue a la bahía.'}</p>
      </div>
    </div>`;
  }

  function pantallaCalificacion(v) {
    const c = calificacion();
    const estrellas = Array.from({ length: ESTRELLAS }, (_, i) => {
      const n = i + 1;
      const llena = n <= c.estrellas;
      return `<button type="button" class="w-12 h-12 flex items-center justify-center rounded-xl hover:bg-surface-container-low transition-colors ${llena ? 'text-secondary-container' : 'text-outline-variant'}" data-accion="calificar" data-valor="${n}" aria-label="${n} de ${ESTRELLAS} estrellas" aria-pressed="${n === c.estrellas}">${icono('star', 36, llena)}</button>`;
    }).join('');
    const aspecto = ({ texto, ico }) => {
      const activo = c.aspectos.includes(texto);
      return `<button type="button" class="min-h-[44px] px-3.5 py-2 rounded-full text-label-md flex items-center gap-1.5 transition-colors ${activo ? 'bg-surface-container-highest text-primary-container' : 'bg-surface-container-low text-on-surface-variant'}" data-accion="alternarAspecto" data-valor="${texto}" aria-pressed="${activo}">${icono(ico, 18)}<span>${texto}</span></button>`;
    };
    const propina = (texto) => {
      const activa = c.propina === texto;
      return `<button type="button" class="min-h-[48px] rounded-xl text-label-md transition-all ${activa ? 'bg-primary-container text-on-primary shadow-sm' : 'bg-surface-container-low text-on-surface'}" data-accion="elegirPropina" data-valor="${texto}" aria-pressed="${activa}">${texto}</button>`;
    };
    return `<div class="${clases.pantalla}" data-key="p-calificacion">
      ${App.aviso('ok', `<p class="text-label-md">Vehículo entregado con éxito</p><p>${porteria(v)} · ${esc(v.valet.codigo || '')}</p>`)}
      ${App.tituloPantalla('Calificar servicio', '', 'Tu opinión nos ayuda a mantener los estándares de movilidad EAFIT.')}
      <section class="${clases.tarjeta} items-center text-center">
        <h2 class="text-label-md text-on-surface-variant">¿Cómo estuvo tu experiencia hoy?</h2>
        <div class="flex flex-wrap items-center justify-center gap-1" role="group" aria-label="Calificación">${estrellas}</div>
        ${c.estrellas ? `<span class="px-4 py-1 rounded-full bg-surface-container-low text-label-md text-on-surface">${TEXTO_ESTRELLAS[c.estrellas]}</span>` : ''}
      </section>
      <section class="${clases.tarjeta}">
        <div class="flex items-center justify-between"><h2 class="text-label-md text-on-surface">Aspectos para destacar</h2><span class="${clases.nota}">Opcional</span></div>
        <div class="flex flex-wrap gap-2 pt-1">${ASPECTOS.map(aspecto).join('')}</div>
      </section>
      <section class="${clases.tarjeta}">
        <h2 class="text-label-lg text-on-surface">Propina voluntaria</h2>
        <div class="grid grid-cols-2 gap-2">${PROPINAS.map(propina).join('')}</div>
      </section>
      <section class="${clases.tarjeta}">
        <label class="text-label-md text-on-surface flex items-center justify-between" for="mensaje-valet"><span>Mensaje para el valet</span><span class="${clases.nota}">Opcional</span></label>
        <textarea id="mensaje-valet" rows="3" class="w-full bg-surface-container-low rounded-xl p-space-sm text-body-lg text-on-surface placeholder:text-on-surface-variant resize-none" data-campo="calificacion.mensaje" maxlength="${MENSAJE_MAX}" placeholder="Deja una felicitación, comentario o sugerencia">${esc(c.mensaje)}</textarea>
        <p class="${clases.nota} text-right">${c.mensaje.length}/${MENSAJE_MAX}</p>
      </section>
      <div class="flex flex-col gap-space-xs">
        <button type="button" class="${clases.primario}" data-accion="enviarCalificacion"${c.estrellas ? '' : ' disabled'}>Enviar calificación y finalizar${icono('arrow_forward', 20)}</button>
        ${c.estrellas ? '' : `<p class="${clases.nota} text-center">Disponible cuando elijas las estrellas.</p>`}
        <button type="button" class="min-h-[44px] text-label-md text-on-surface-variant hover:text-on-surface" data-accion="omitirCalificacion">Omitir por ahora</button>
      </div>
    </div>`;
  }

  App.pantallas.valet = function () {
    const v = App.conductorActivo();
    const irInicio = `<button type="button" class="${clases.primario}" data-accion="irTab" data-tab="inicio">Ir a Inicio</button>`;
    if (!v) {
      return App.pantallas.vacio('Valet opcional', 'Aún no te has registrado. Ve a Inicio y marca "Quiero usar valet".', irInicio);
    }
    if (finalizadas().includes(v.placa)) {
      return App.pantallas.vacio('Servicio finalizado', `El valet de ${esc(v.placa)} terminó. Registra una nueva llegada cuando regreses.`, irInicio);
    }
    if (!v.valet && NO_APLICA.includes(v.estado)) {
      return App.pantallas.vacio('El valet ya no aplica', `${esc(v.placa)} ya tiene celda. El valet se pide antes de recibirla.`, irInicio);
    }
    if (v.valet && App.ui.valetRecibido === v.placa) return pantallaCalificacion(v);
    if (v.valet && EN_ENTREGA.includes(v.valet.estado)) return pantallaSeguimiento(v);
    const paso = pasoActual(v);
    const contenido = paso === 1 ? pasoPago() : paso === 2 ? pasoEntrega(v) : pasoCustodia(v);
    const chip = paso === 3 ? App.chip('libre', 'En servicio') : '';
    return `<div class="${clases.pantalla}" data-key="p-valet">
      ${App.tituloPantalla('Servicio valet', chip, 'Entrega y recepción asistida en campus EAFIT')}
      ${indicador(paso)}
      ${aviso()}
      <div data-key="valet-paso-${paso}" class="pantalla--entra">${contenido}</div>
    </div>`;
  };

  const conActivo = (fn) => () => {
    const v = App.conductorActivo();
    if (v) fn(v);
  };

  const finalizar = conActivo((v) => {
    App.set({
      valetFinalizados: [...finalizadas(), v.placa],
      valetRecibido: null,
      calificacion: CALIFICACION_VACIA,
      tab: 'inicio'
    });
  });

  App.acciones.pagarValet = conActivo((v) => {
    if (!v.valet && !App.resultado(App.engine.valetSeleccionar(v.placa))) return;
    const r = App.engine.valetPagar(v.placa, App.ui.valet.metodo);
    App.resultado(r, `Pago aprobado por ${PRECIO}`);
    App.programarRender();
  });
  App.acciones.entregarValet = conActivo((v) => {
    const r = App.engine.valetEntregar(v.placa);
    const ok = App.resultado(r, r.ok ? `${v.placa} quedó en manos del valet. Tu código es ${r.valet.codigo}` : '');
    if (ok) App.setSub('valet', { dejeCarro: false, entregueLlaves: false });
  });
  App.acciones.solicitarCarro = conActivo((v) => {
    const ok = App.resultado(App.engine.valetSolicitarCarro(v.placa), 'Solicitud recibida: tu vehículo viene en camino');
    if (ok) App.set({ placa: v.placa, fijada: true });
  });
  App.acciones.confirmarRecepcion = conActivo((v) => {
    App.toast('ok', `Recibiste ${v.placa}. Cuéntanos cómo te fue`);
    App.set({ valetRecibido: v.placa });
  });
  App.acciones.calificar = (el) => App.set({ calificacion: { ...calificacion(), estrellas: Number(el.dataset.valor) } });
  App.acciones.alternarAspecto = function (el) {
    const c = calificacion();
    const texto = el.dataset.valor;
    const aspectos = c.aspectos.includes(texto) ? c.aspectos.filter((a) => a !== texto) : [...c.aspectos, texto];
    App.set({ calificacion: { ...c, aspectos } });
  };
  App.acciones.elegirPropina = (el) => App.set({ calificacion: { ...calificacion(), propina: el.dataset.valor } });
  App.acciones.enviarCalificacion = function () {
    const { estrellas, propina } = calificacion();
    App.toast('ok', `Gracias: calificaste con ${estrellas} de ${ESTRELLAS}. Propina: ${propina}`);
    finalizar();
  };
  App.acciones.omitirCalificacion = finalizar;
})();
