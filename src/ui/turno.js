// Pantalla Mi turno (Stitch: "Mi Turno y Acceso"): espera en fila y ticket con celda asignada.
(function () {
  const { esc, placaHTML, icono } = App;
  const ESTADOS_LINEA = ['Registrado', 'Celda asignada', 'Portería', 'En recorrido', 'Estacionado'];

  function indiceEstado(v) {
    if (v.estado === 'ESTACIONADO') return 4;
    if (v.estado === 'EN_RECORRIDO') return 3;
    if (v.estado === 'CELDA_ASIGNADA') return App.fila(v.acceso)[0] === v ? 2 : 1;
    return 0;
  }

  function lineaEstados(v) {
    const actual = indiceEstado(v);
    return `<section class="tarjeta"><h2 class="titulo-seccion">Tu recorrido</h2>
      <ol class="linea" aria-label="Estado de tu turno">
      ${ESTADOS_LINEA.map((texto, i) => {
        const clase = i < actual ? 'linea-paso--hecho' : i === actual ? 'linea-paso--actual' : '';
        return `<li class="linea-paso ${clase}"${i === actual ? ' aria-current="step"' : ''}>${texto}</li>`;
      }).join('')}
      </ol></section>`;
  }

  const horaRegistro = (v) => (v.registradoEn != null ? v.registradoEn : v.llegadaAfueraEn);

  function ticket(v, cuerpo) {
    return `<section class="ticket">
      <header class="ticket-cab">
        <span class="marca-signo" aria-hidden="true">P</span>
        <div class="ticket-id"><b>ParkEAFIT Pass</b><span>Ticket #TK-${v.seq == null ? 'pendiente' : esc(v.seq)}</span></div>
        <div class="ticket-vehiculo">${placaHTML(v.placa)}${App.chipTipo(App.tipoVehiculo(v))}</div>
      </header>
      ${cuerpo}
      <dl class="ticket-pie">
        <div><dt>Registro</dt><dd>${App.hora(horaRegistro(v))}</dd></div>
        <div><dt>Acceso</dt><dd>${App.NOMBRE_ACCESO[v.acceso]}</dd></div>
        <div><dt>Conductor</dt><dd>${esc(v.conductor)}</dd></div>
      </dl>
    </section>`;
  }

  function tiempoTranscurrido(v) {
    const minutos = Math.max(0, App.engine.state.clock - horaRegistro(v));
    return `<section class="tarjeta tiempo">
      ${icono('reloj', 22)}<span>Tiempo transcurrido</span><b>${minutos} min</b>
    </section>`;
  }

  // Progreso relativo a la peor posición que ha tenido este carro.
  function progresoCelda(placa, k) {
    const mayor = Math.max(App.ui.maxPosicion[placa] || 0, k);
    if (mayor !== App.ui.maxPosicion[placa]) App.ui.maxPosicion = { ...App.ui.maxPosicion, [placa]: mayor };
    return Math.round(((mayor - k + 1) / (mayor + 1)) * 100);
  }

  function esperaBloque(v, p) {
    const espera = App.engine.estimarEspera(v.placa) || { texto: 'Sin datos' };
    if (v.saleSinEstacionar) {
      return `<section class="tarjeta"><h2 class="titulo-seccion">Sales sin estacionar</h2>
        <p>No necesitas celda. Avanzas con la fila y sales cuando seas el primero.</p></section>`;
    }
    const progreso = progresoCelda(v.placa, p.posicionGlobalCelda || 1);
    return `<section class="tarjeta">
      <h2 class="titulo-seccion">Espera para recibir celda</h2>
      <div class="anillo-bloque">${App.anillo(progreso, 'Avance hacia tu celda', `${progreso}%`)}<p class="cifra"><strong>${esc(espera.texto)}</strong></p></div>
      <p class="nota">Vas ${p.posicionGlobalCelda || 1}.º entre ${App.tipoVehiculo(v) === 'MOTO' ? 'las motos' : 'los carros'} que esperan celda en ambos accesos.</p>
    </section>`;
  }

  function alertaClase(v) {
    const clase = App.engine.llegoAClase(v.placa);
    if (!clase || !clase.sugerirValet || v.valet || v.saleSinEstacionar) return '';
    return `<section class="aviso aviso--error" role="alert">
      ${icono('alerta')}
      <div><p><b>Podrías llegar tarde a tu clase de las ${App.hora(v.horaClase)}</b></p>
      <p>Con valet dejas el carro aquí y caminas ya. Tu carro conserva su turno.</p>
      <button type="button" class="boton boton--primario boton--aviso" data-accion="usarValet">Usar valet</button></div>
    </section>`;
  }

  function interruptorSalida(v) {
    const primero = App.fila(v.acceso)[0] === v;
    const boton = !v.saleSinEstacionar
      ? ''
      : primero
        ? '<button type="button" class="boton boton--primario" data-accion="salir">Salir del parqueadero</button>'
        : '<button type="button" class="boton boton--primario" disabled>Salir del parqueadero</button><p class="nota">Disponible cuando seas el primero de la fila.</p>';
    return `<section class="tarjeta">
      <label class="interruptor">
        <input type="checkbox" data-accion-cambio="saleSinEstacionar"${v.saleSinEstacionar ? ' checked' : ''}>
        <span class="interruptor-pista" aria-hidden="true"></span>
        <span>Saldré sin estacionar</span>
      </label>
      <p class="nota">No ocuparás celda, pero conservas tu lugar hasta salir.</p>
      ${boton}
    </section>`;
  }

  function pantallaEspera(v) {
    const p = App.engine.posicion(v.placa) || { delante: 0, detras: 0, posicionEnPasarela: null };
    const afuera = v.estado === 'AFUERA';
    const numero = afuera ? p.delante + 1 : p.posicionEnPasarela || p.delante + 1;
    const vehiculos = (n) => `${n} ${n === 1 ? 'vehículo' : 'vehículos'}`;
    const cuerpo = `<div class="posicion" aria-live="polite" aria-atomic="true">
        <p class="posicion-rotulo">Posición</p>
        <div class="posicion-marco"><p class="posicion-numero" data-key="pos-${numero}">${numero}</p></div>
        <p>${vehiculos(p.delante)} delante · ${p.detras} detrás</p>
      </div>`;
    const chip = afuera ? '<span class="chip chip--reservada">Afuera</span>' : '<span class="chip chip--marca">En fila</span>';
    return `<div class="pantalla" data-key="p-espera">
      ${App.tituloPantalla('Mi turno y acceso', chip)}
      ${afuera ? `<section class="aviso aviso--atencion">${icono('alerta')}<p><b>Pasarela llena: esperas afuera.</b> Entras cuando se libere un cupo.</p></section>` : ''}
      ${tiempoTranscurrido(v)}
      ${ticket(v, cuerpo)}
      ${alertaClase(v)}
      ${esperaBloque(v, p)}
      ${interruptorSalida(v)}
      <details class="tarjeta desplegable">
        <summary>¿Cómo se reparten las celdas?</summary>
        <p>${esc(window.ParkEngine.POLITICA_TEXTO)}</p>
      </details>
      ${lineaEstados(v)}
    </div>`;
  }

  function codigoSimulado(placa) {
    const lado = 21;
    let semilla = [...placa].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
    const enOjo = (x, y) => (x < 7 && y < 7) || (x >= lado - 7 && y < 7) || (x < 7 && y >= lado - 7);
    const ojo = (ox, oy) =>
      `<rect x="${ox}" y="${oy}" width="7" height="7"/><rect class="codigo-fondo" x="${ox + 1}" y="${oy + 1}" width="5" height="5"/><rect x="${ox + 2}" y="${oy + 2}" width="3" height="3"/>`;
    let celdas = '';
    for (let y = 0; y < lado; y += 1) {
      for (let x = 0; x < lado; x += 1) {
        semilla = (semilla * 1664525 + 1013904223) >>> 0;
        if (!enOjo(x, y) && semilla >>> 31) celdas += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
      }
    }
    return `<svg class="codigo" viewBox="-1 -1 23 23" role="img" aria-label="Código simulado de la placa ${esc(placa)}">
      <rect class="codigo-fondo" x="-1" y="-1" width="23" height="23"/>${celdas}${ojo(0, 0)}${ojo(14, 0)}${ojo(0, 14)}
    </svg>`;
  }

  function accionCelda(v) {
    if (v.valet && v.valet.estado !== 'SELECCIONADO' && v.valet.estado !== 'PAGADO') {
      return `<p class="nota">El valet lleva tu carro. Sigue el avance en la pestaña Valet.</p>
        <button type="button" class="boton boton--primario" data-accion="irTab" data-tab="valet">Ver mi valet</button>`;
    }
    if (v.estado === 'CELDA_ASIGNADA') {
      const primero = App.fila(v.acceso)[0] === v;
      const orden = App.fila(v.acceso).indexOf(v) + 1;
      return `<button type="button" class="boton boton--primario" disabled>Esperando portería…</button>
        <p class="nota nota--centro">${primero ? 'Eres el primero de la fila: muestra tu código en portería.' : `Vas ${orden}.º en la fila. Disponible cuando seas el primero y portería te confirme.`}</p>`;
    }
    if (v.estado === 'EN_RECORRIDO') {
      return '<button type="button" class="boton boton--primario" data-accion="estacionar">Llegué a mi celda</button>';
    }
    return '<button type="button" class="boton boton--primario" data-accion="salir">Salir del parqueadero</button>';
  }

  function tarjetaMotos(v) {
    const r = App.engine.resumen();
    return `<section class="tarjeta">
      <h2 class="titulo-seccion">${esc(App.nombreZona('M'))}, celda ${esc(v.celdaId)}</h2>
      <p class="nota">${r.libresPorTipo.MOTO} de ${r.totalPorTipo.MOTO} celdas de moto libres. Esta zona no aparece en el mapa del campus.</p>
    </section>`;
  }

  function planoCelda(v, celda, ruta) {
    const pasos = `<ol class="pasos-ruta">${(ruta.pasos || []).map((p) => `<li>${esc(p)}</li>`).join('')}</ol>`;
    if (celda && celda.zona === 'M') return `${tarjetaMotos(v)}<section class="tarjeta">${pasos}</section>`;
    const r = App.engine.resumen();
    const otroLote = Boolean(App.loteAcceso(v.acceso)) && App.loteAcceso(v.acceso) !== ruta.lote;
    const etiqueta = `Mapa: ${r.libresPorTipo.CARRO} celdas libres de ${r.totalPorTipo.CARRO}. Tu celda: ${v.celdaId}`;
    return `<section class="tarjeta tarjeta--plano">
      <h2 class="titulo-seccion">Ruta en campus</h2>
      ${App.mapas.hueco('celular', etiqueta, { celda: v.celdaId, lote: ruta.lote, placa: v.placa, verTodo: otroLote })}
      ${App.mapas.leyenda()}
      ${otroLote ? `<p class="nota">Entraste por ${App.NOMBRE_ACCESO[v.acceso]}, pero el parqueadero es uno solo: la celda que te tocaba por orden de llegada está en ${esc(App.nombreZona(ruta.lote))}.</p>` : ''}
      ${pasos}
    </section>`;
  }

  function pantallaCelda(v) {
    const celda = App.celdas().find((c) => c.id === v.celdaId);
    const ruta = App.engine.ruta(v.placa) || {};
    const estacionado = v.estado === 'ESTACIONADO';
    const asignada = v.estado === 'CELDA_ASIGNADA';
    const chip = estacionado ? '<span class="chip chip--libre">Estacionado</span>' : '<span class="chip chip--libre">Turno activo</span>';
    const cuerpo = `<div class="ticket-celda">
        <div><p class="nota">Ubicación en campus</p><b>${esc(App.nombreZona(celda ? celda.zona : ''))}</b></div>
        <div class="ticket-celda-id"><p class="nota">Celda asignada</p><span class="celda-grande">${esc(v.celdaId)}</span></div>
      </div>
      ${
        asignada
          ? `<div class="ticket-corte" aria-hidden="true"></div>
      <div class="ticket-codigo">${codigoSimulado(v.placa)}<p><b>Muéstralo en portería</b><br>Lleva este código a la vista al llegar.</p></div>`
          : ''
      }`;
    return `<div class="pantalla" data-key="p-celda-${esc(v.celdaId)}">
      <section class="banner-celda">
        <span class="banner-icono">${icono('check', 22)}</span>
        <div><p class="banner-titulo">${estacionado ? 'Estás en tu celda' : '¡Tienes celda!'}</p>
        <p>${estacionado ? 'Cuando quieras salir, usa el botón de abajo.' : `Reservada para ${esc(v.placa)}`}</p></div>
      </section>
      ${App.tituloPantalla('Mi turno y acceso', chip)}
      ${tiempoTranscurrido(v)}
      ${ticket(v, cuerpo)}
      ${planoCelda(v, celda, ruta)}
      ${accionCelda(v)}
      ${lineaEstados(v)}
    </div>`;
  }

  function vacio(titulo, texto, boton) {
    return `<div class="pantalla" data-key="p-vacio"><section class="tarjeta vacio">
      ${icono('carro', 32)}
      <h2 class="titulo-seccion">${titulo}</h2>
      <p>${texto}</p>
      ${boton}
    </section></div>`;
  }

  App.pantallas.vacio = vacio;

  App.pantallas.turno = function () {
    const v = App.conductorActivo();
    const irInicio = '<button type="button" class="boton boton--primario" data-accion="irTab" data-tab="inicio">Ir a Inicio</button>';
    if (!v) return vacio('Sin turno todavía', 'Aún no te has registrado. Ve a Inicio para registrar tu llegada.', irInicio);
    if (v.estado === 'SALIO') {
      return vacio('Saliste del parqueadero', `${esc(v.placa)} ya no está en la fila. Registra una nueva llegada cuando regreses.`, irInicio);
    }
    return v.celdaId ? pantallaCelda(v) : pantallaEspera(v);
  };

  const conActivo = (fn) => () => {
    const v = App.conductorActivo();
    if (v) fn(v);
  };

  App.acciones.estacionar = conActivo((v) => {
    App.resultado(App.engine.estacionar(v.placa), `Listo: ${v.placa} quedó estacionado en ${v.celdaId}`);
  });
  App.acciones.salir = conActivo((v) => {
    App.resultado(App.engine.salir(v.placa), `${v.placa} salió del parqueadero`);
  });
  App.acciones.usarValet = conActivo((v) => {
    if (App.resultado(App.engine.valetSeleccionar(v.placa), 'Valet seleccionado: completa el pago')) App.set({ tab: 'valet' });
  });
  App.acciones.saleSinEstacionar = function (el) {
    const v = App.conductorActivo();
    if (!v) return;
    const mensaje = el.checked ? 'Saldrás sin estacionar: conservas tu lugar en la fila' : 'Volviste a pedir celda';
    App.resultado(App.engine.marcarSaleSinEstacionar(v.placa, el.checked), mensaje);
    App.programarRender();
  };
})();
