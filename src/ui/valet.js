// Ruta de valet: los 3 pasos del reto, más Seguimiento de Entrega y Calificación de Stitch.
(function () {
  const { esc, icono, placaHTML } = App;
  const PRECIO = '$8.000';
  const PASOS = ['Selección y pago', 'Entrega del vehículo', 'Estacionamiento y llaves'];
  const METODOS = [
    { id: 'TARJETA', texto: 'Tarjeta' },
    { id: 'NEQUI', texto: 'Nequi' },
    { id: 'RECHAZO', texto: 'Simular rechazo' }
  ];
  const ORDEN_VALET = ['ENTREGADO_A_VALET', 'EN_FILA', 'ESTACIONADO', 'LLAVES_EN_CUSTODIA', 'SOLICITADO', 'DEVUELTO'];
  const NO_APLICA = ['CELDA_ASIGNADA', 'EN_RECORRIDO', 'ESTACIONADO', 'SALIO'];
  const EN_ENTREGA = ['SOLICITADO', 'DEVUELTO'];
  const ASPECTOS = ['Puntualidad en entrega', 'Cuidado del vehículo', 'Amabilidad del operador', 'Facilidad de acceso'];
  const PROPINAS = ['$2.000', '$5.000', '$10.000', 'Sin propina'];
  const ESTRELLAS = 5;
  const MENSAJE_MAX = 200;
  const CALIFICACION_VACIA = { estrellas: 0, aspectos: [], propina: 'Sin propina', mensaje: '' };

  const calificacion = () => App.ui.calificacion || CALIFICACION_VACIA;
  const finalizadas = () => App.ui.valetFinalizados || [];

  function pasoActual(v) {
    if (!v.valet || v.valet.estado === 'SELECCIONADO') return 1;
    return v.valet.estado === 'PAGADO' ? 2 : 3;
  }

  function indicador(paso) {
    return `<ol class="pasos">
      ${PASOS.map((texto, i) => {
        const n = i + 1;
        const clase = n < paso ? 'paso--hecho' : n === paso ? 'paso--actual' : '';
        return `<li class="paso ${clase}"${n === paso ? ' aria-current="step"' : ''}>
          <span class="paso-num">${n < paso ? icono('check', 16) : n}</span><span>${texto}</span>
        </li>`;
      }).join('')}
    </ol>`;
  }

  const aviso = '<p class="aviso-valet">El valet no da prioridad: tu carro conserva su turno por hora de llegada. Lo que ganas es tu tiempo para llegar a clase.</p>';

  function pasoPago() {
    const { metodo } = App.ui.valet;
    return `<section class="tarjeta">
      <div class="bloque-cab"><h2 class="titulo-seccion">Valet estándar</h2><b class="precio">${PRECIO}</b></div>
      <fieldset class="metodos"><legend>Método de pago</legend>
        ${METODOS.map(
          (m) => `<label class="opcion${metodo === m.id ? ' opcion--activa' : ''}"><input type="radio" name="metodo" data-campo="valet.metodo" value="${m.id}"${metodo === m.id ? ' checked' : ''}><span>${m.texto}</span></label>`
        ).join('')}
      </fieldset>
      <button type="button" class="boton boton--primario" data-accion="pagarValet">Pagar y reservar</button>
    </section>`;
  }

  function pasoEntrega(v) {
    const { dejeCarro, entregueLlaves } = App.ui.valet;
    const listo = dejeCarro && entregueLlaves;
    return `<section class="tarjeta">
      <h2 class="titulo-seccion">Punto de entrega</h2>
      <p class="punto-entrega">${icono('pin')}<span><b>Portería ${App.NOMBRE_ACCESO[v.acceso]}</b><br>Bahía de valet del acceso</span></p>
      ${v.valet.codigo ? `<p class="codigo-valet">${esc(v.valet.codigo)}</p><p class="nota">Dile este código al valet.</p>` : '<p class="nota">Recibes tu código V-XXX al confirmar la entrega.</p>'}
      <label class="casilla"><input type="checkbox" data-campo="valet.dejeCarro"${dejeCarro ? ' checked' : ''}><span>Dejé el carro</span></label>
      <label class="casilla"><input type="checkbox" data-campo="valet.entregueLlaves"${entregueLlaves ? ' checked' : ''}><span>Entregué las llaves</span></label>
      <button type="button" class="boton boton--primario" data-accion="entregarValet"${listo ? '' : ' disabled'}>Confirmar entrega</button>
      ${listo ? '' : '<p class="nota">Disponible cuando marques las dos casillas.</p>'}
    </section>`;
  }

  function tarjetaVehiculo(v, chip) {
    return `<section class="ticket">
      <div class="valet-cab">
        ${placaHTML(v.placa)}
        ${chip}
      </div>
      <p class="valet-ticket">Ticket: <b>${esc(v.valet.codigo || 'pendiente')}</b></p>
      <dl class="datos-valet">
        <div><dt>Ingreso</dt><dd>${App.hora(v.registradoEn != null ? v.registradoEn : v.llegadaAfueraEn)}</dd></div>
        <div><dt>Seguridad</dt><dd>${v.valet.casillero ? `Casillero ${esc(v.valet.casillero)}` : 'Llaves con el valet'}</dd></div>
      </dl>
    </section>`;
  }

  function pasoCustodia(v) {
    const estado = v.valet.estado;
    const indice = ORDEN_VALET.indexOf(estado);
    const hitos = [
      { texto: 'Recibido', hecho: indice >= 0 },
      { texto: 'En fila', hecho: indice >= 1 },
      { texto: v.celdaId && indice >= 2 ? `Estacionado en ${esc(v.celdaId)}` : 'Estacionado', hecho: indice >= 2 },
      { texto: v.valet.casillero ? `Llaves en casillero ${esc(v.valet.casillero)}` : 'Llaves en casillero', hecho: indice >= 3 }
    ];
    const ultimo = hitos.reduce((acum, h, i) => (h.hecho ? i : acum), 0);
    const puedeSolicitar = estado === 'LLAVES_EN_CUSTODIA';
    const chip = puedeSolicitar ? '<span class="chip chip--libre">Custodia activa</span>' : '<span class="chip chip--reservada">En proceso</span>';
    return `${tarjetaVehiculo(v, chip)}
      <section class="tarjeta">
        <h2 class="titulo-seccion">Sigue tu carro</h2>
        <ol class="linea" aria-label="Estado del valet">
          ${hitos
            .map((h, i) => {
              const clase = i === ultimo ? 'linea-paso--actual' : h.hecho ? 'linea-paso--hecho' : '';
              return `<li class="linea-paso ${clase}">${h.texto}</li>`;
            })
            .join('')}
        </ol>
      </section>
      <section class="tarjeta">
        <h2 class="titulo-seccion">Punto de entrega</h2>
        <p class="punto-entrega">${icono('pin')}<span><b>Portería ${App.NOMBRE_ACCESO[v.acceso]}</b><br>Bahía de valet del acceso</span></p>
      </section>
      <button type="button" class="boton boton--primario" data-accion="solicitarCarro"${puedeSolicitar ? '' : ' disabled'}>${icono('carro', 20)}Pedir que traigan mi vehículo</button>
      ${puedeSolicitar ? '' : '<p class="nota nota--centro">Disponible cuando tus llaves estén en el casillero.</p>'}`;
  }

  // PIN simulado y estable: se deriva de la placa porque el motor no maneja uno.
  function pinEntrega(placa) {
    const n = [...placa].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 9000, 7);
    return String(1000 + n);
  }

  function pantallaSeguimiento(v) {
    const devuelto = v.valet.estado === 'DEVUELTO';
    const hito = (titulo, detalle, clase, ico) => `<li class="despacho ${clase}">
        <span class="despacho-icono">${icono(ico, 18)}</span>
        <div><b>${titulo}</b><p>${detalle}</p></div>
      </li>`;
    return `<div class="pantalla" data-key="p-seguimiento">
      <section class="banner-celda">
        <span class="banner-icono">${icono('check', 22)}</span>
        <div><p class="banner-titulo">${devuelto ? 'Tu vehículo llegó' : 'Solicitud confirmada'}</p>
        <p>${devuelto ? `Te espera en Portería ${App.NOMBRE_ACCESO[v.acceso]}` : `Tu vehículo va en camino a Portería ${App.NOMBRE_ACCESO[v.acceso]}`}</p></div>
      </section>
      ${App.tituloPantalla('Seguimiento de entrega', devuelto ? '<span class="chip chip--libre">Listo</span>' : '<span class="chip chip--reservada">En traslado</span>', `Valet, ticket ${esc(v.valet.codigo || '')}`)}
      <section class="tarjeta">
        <div class="eta"><div><p class="nota">Tiempo estimado de llegada</p><p class="cifra"><strong>${devuelto ? '0' : '2'}</strong> min simulados</p></div>${icono('reloj', 26)}</div>
        <h2 class="titulo-bloque">Estado del despacho</h2>
        <ol class="despachos">
          ${hito('Solicitud recibida', 'Procesada por el sistema de parqueaderos', 'despacho--hecho', 'check')}
          ${hito('Retiro de llaves', v.valet.casillero ? `Casillero ${esc(v.valet.casillero)}` : 'Llaves retiradas', 'despacho--hecho', 'check')}
          ${hito('Vehículo en camino', devuelto ? 'Traslado terminado' : 'El valet lleva tu carro a la bahía', devuelto ? 'despacho--hecho' : 'despacho--actual', devuelto ? 'check' : 'carro')}
          ${hito('Listo en bahía de entrega', devuelto ? 'Ya puedes recibirlo' : 'Pendiente', devuelto ? 'despacho--actual' : '', 'pin')}
        </ol>
      </section>
      <section class="tarjeta">
        <div class="bloque-cab"><p class="nota">Vehículo en entrega</p>${placaHTML(v.placa)}</div>
        <div class="pin-entrega">
          <p class="nota">Código PIN de entrega</p>
          <p class="pin-numero">${pinEntrega(v.placa)}</p>
          <p class="nota">Muestra este código al valet para autorizar la entrega de llaves.</p>
        </div>
      </section>
      <button type="button" class="boton boton--primario" data-accion="confirmarRecepcion"${devuelto ? '' : ' disabled'}>${icono('check', 20)}Confirmar recepción del vehículo</button>
      <p class="nota nota--centro">${devuelto ? 'Presiona este botón cuando hayas verificado tu vehículo.' : 'Disponible cuando tu vehículo llegue a la bahía.'}</p>
    </div>`;
  }

  function pantallaCalificacion(v) {
    const c = calificacion();
    const estrellas = Array.from({ length: ESTRELLAS }, (_, i) => {
      const n = i + 1;
      return `<button type="button" class="estrella${n <= c.estrellas ? ' estrella--activa' : ''}" data-accion="calificar" data-valor="${n}" aria-label="${n} de ${ESTRELLAS} estrellas" aria-pressed="${n === c.estrellas}">${icono('estrella', 34)}</button>`;
    }).join('');
    const aspecto = (texto) => {
      const activo = c.aspectos.includes(texto);
      return `<button type="button" class="chip-opcion${activo ? ' chip-opcion--activa' : ''}" data-accion="alternarAspecto" data-valor="${texto}" aria-pressed="${activo}">${texto}</button>`;
    };
    const propina = (texto) =>
      `<button type="button" class="propina${c.propina === texto ? ' propina--activa' : ''}" data-accion="elegirPropina" data-valor="${texto}" aria-pressed="${c.propina === texto}">${texto}</button>`;
    return `<div class="pantalla" data-key="p-calificacion">
      <section class="banner-celda">
        <span class="banner-icono">${icono('check', 22)}</span>
        <div><p class="banner-titulo">Vehículo entregado con éxito</p>
        <p>Portería ${App.NOMBRE_ACCESO[v.acceso]}, ${esc(v.valet.codigo || '')}</p></div>
      </section>
      ${App.tituloPantalla('Calificar servicio', '', 'Tu opinión nos ayuda a mejorar el valet.')}
      <section class="tarjeta calificacion">
        <h2 class="titulo-bloque">¿Cómo estuvo tu experiencia hoy?</h2>
        <div class="estrellas" role="group" aria-label="Calificación">${estrellas}</div>
      </section>
      <section class="tarjeta">
        <div class="bloque-cab"><h2 class="titulo-bloque">Aspectos para destacar</h2><span class="nota">Opcional</span></div>
        <div class="chips">${ASPECTOS.map(aspecto).join('')}</div>
      </section>
      <section class="tarjeta">
        <h2 class="titulo-bloque">Propina voluntaria</h2>
        <div class="propinas">${PROPINAS.map(propina).join('')}</div>
      </section>
      <section class="tarjeta">
        <div class="bloque-cab"><h2 class="titulo-bloque">Mensaje para el valet</h2><span class="nota">Opcional</span></div>
        <label class="solo-lector" for="mensaje-valet">Mensaje para el valet</label>
        <textarea id="mensaje-valet" class="entrada area" data-campo="calificacion.mensaje" maxlength="${MENSAJE_MAX}" placeholder="Deja un comentario o sugerencia">${esc(c.mensaje)}</textarea>
        <p class="nota contador">${c.mensaje.length}/${MENSAJE_MAX}</p>
      </section>
      <button type="button" class="boton boton--primario" data-accion="enviarCalificacion"${c.estrellas ? '' : ' disabled'}>Enviar calificación y finalizar</button>
      ${c.estrellas ? '' : '<p class="nota nota--centro">Disponible cuando elijas las estrellas.</p>'}
      <button type="button" class="enlace" data-accion="omitirCalificacion">Omitir por ahora</button>
    </div>`;
  }

  App.pantallas.valet = function () {
    const v = App.conductorActivo();
    const irInicio = '<button type="button" class="boton boton--primario" data-accion="irTab" data-tab="inicio">Ir a Inicio</button>';
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
    const chip = paso === 3 ? '<span class="chip chip--libre">En servicio</span>' : '';
    return `<div class="pantalla" data-key="p-valet">
      ${App.tituloPantalla('Servicio valet', chip, 'Entrega y recepción asistida en campus EAFIT')}
      ${indicador(paso)}
      ${aviso}
      <div data-key="valet-paso-${paso}" class="pantalla--entra valet-paso">${contenido}</div>
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
    const actual = App.vehiculo(v.placa);
    const codigo = r.codigo || (actual && actual.valet && actual.valet.codigo) || '';
    App.resultado(r, `Pago aprobado por ${PRECIO}.${codigo ? ` Tu código es ${codigo}` : ''}`);
    App.programarRender();
  });
  App.acciones.entregarValet = conActivo((v) => {
    const ok = App.resultado(App.engine.valetEntregar(v.placa), `${v.placa} quedó en manos del valet`);
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
