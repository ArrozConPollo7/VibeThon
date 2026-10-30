// Pantalla Mi turno (Stitch 02-mi-turno): espera en fila, ticket con celda, mapa y ruta.
(function () {
  const { esc, placaHTML, icono, clases } = App;
  const ESTADOS_LINEA = ['Registrado', 'Celda asignada', 'Portería', 'En recorrido', 'Estacionado'];

  function indiceEstado(v) {
    if (v.estado === 'ESTACIONADO') return 4;
    if (v.estado === 'EN_RECORRIDO') return 3;
    if (v.estado === 'CELDA_ASIGNADA') return App.fila(v.acceso)[0] === v ? 2 : 1;
    return 0;
  }

  function lineaEstados(v) {
    const actual = indiceEstado(v);
    const pasos = ESTADOS_LINEA.map((titulo, i) => ({
      titulo,
      estado: i < actual ? 'hecho' : i === actual ? 'actual' : 'pendiente'
    }));
    return `<section class="${clases.tarjeta}"><h2 class="${clases.titulo}">Tu recorrido</h2>${App.stepper(pasos, 'Estado de tu turno')}</section>`;
  }

  const horaRegistro = (v) => (v.registradoEn != null ? v.registradoEn : v.llegadaAfueraEn);

  function ticket(v, acento, cuerpo) {
    const dato = (titulo, valor) => `<div class="flex flex-col min-w-0">
        <span class="${clases.nota}">${titulo}</span>
        <span class="text-label-md text-on-surface truncate">${valor}</span>
      </div>`;
    return `<article aria-label="Ticket digital de parqueo" class="relative flex flex-col bg-surface-container-lowest rounded-2xl shadow-md overflow-hidden">
      <div class="h-1.5 w-full ${acento}"></div>
      <div class="p-space-md flex flex-wrap items-center justify-between gap-2 bg-surface-container-low">
        <div class="flex items-center gap-space-xs min-w-0">
          <div class="w-8 h-8 rounded-xl bg-primary-container flex items-center justify-center text-on-primary shrink-0">${icono('local_parking', 20)}</div>
          <div class="flex flex-col min-w-0">
            <span class="text-label-md text-on-surface leading-tight">ParkEAFIT Pass</span>
            <span class="${clases.nota}">Ticket #TK-${v.seq == null ? 'pendiente' : esc(v.seq)}</span>
          </div>
        </div>
        <div class="flex flex-col items-end gap-0.5">${placaHTML(v.placa)}${App.chipTipo(App.tipoVehiculo(v))}</div>
      </div>
      ${cuerpo}
      <div class="p-space-md bg-surface-container-low grid grid-cols-3 gap-2 text-left">
        ${dato('Registro', App.hora(horaRegistro(v)))}${dato('Acceso', App.NOMBRE_ACCESO[v.acceso])}${dato('Conductor', esc(v.conductor))}
      </div>
    </article>`;
  }

  function tiempoTranscurrido(v) {
    const minutos = Math.max(0, App.engine.state.clock - horaRegistro(v));
    return `<div class="flex flex-wrap items-center justify-between gap-2 bg-surface-container-lowest rounded-2xl p-space-md shadow-sm">
      <div class="flex items-center gap-space-xs text-on-surface-variant"><span class="text-primary-container">${icono('timer', 22)}</span><span class="text-label-md">Tiempo transcurrido:</span></div>
      <div class="flex items-baseline gap-1"><span class="text-headline-md text-primary-container font-bold tracking-tight">${minutos}</span><span class="${clases.nota}">min</span></div>
    </div>`;
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
      return `<section class="${clases.tarjeta}"><h2 class="${clases.titulo}">Sales sin estacionar</h2>
        <p class="${clases.nota}">No necesitas celda. Avanzas con la fila y sales cuando seas el primero.</p></section>`;
    }
    const progreso = progresoCelda(v.placa, p.posicionGlobalCelda || 1);
    return `<section class="${clases.tarjeta}">
      <div class="flex items-center justify-between gap-space-sm">
        <div class="min-w-0">
          <h2 class="${clases.nota}">Espera para recibir celda</h2>
          <p class="text-headline-lg text-primary-container">${esc(espera.texto)}</p>
        </div>
        ${App.anillo(progreso, 'Avance hacia tu celda', `${progreso}%`)}
      </div>
      <p class="${clases.nota}">Vas ${p.posicionGlobalCelda || 1}.º entre ${App.tipoVehiculo(v) === 'MOTO' ? 'las motos' : 'los carros'} que esperan celda en ambos accesos.</p>
    </section>`;
  }

  function alertaClase(v) {
    const clase = App.engine.llegoAClase(v.placa);
    if (!clase || !clase.sugerirValet || v.valet || v.saleSinEstacionar) return '';
    return App.aviso(
      'error',
      `<p class="text-label-md">Podrías llegar tarde a tu clase de las ${App.hora(v.horaClase)}</p>
      <p class="mt-1">${esc(clase.texto)} Con valet dejas el carro aquí y caminas ya. Tu carro conserva su turno.</p>
      <button type="button" class="${clases.primario} mt-2" data-accion="usarValet">${icono('directions_car', 22)}Usar valet</button>`
    );
  }

  function interruptorSalida(v) {
    const primero = App.fila(v.acceso)[0] === v;
    const boton = !v.saleSinEstacionar
      ? ''
      : primero
        ? `<button type="button" class="${clases.primario}" data-accion="salir">${icono('logout', 22)}Salir del parqueadero</button>`
        : `<button type="button" class="${clases.primario}" disabled>${icono('logout', 22)}Salir del parqueadero</button><p class="${clases.nota} text-center">Disponible cuando seas el primero de la fila.</p>`;
    return `<section class="${clases.tarjeta}">
      ${App.interruptor(`data-accion-cambio="saleSinEstacionar"${v.saleSinEstacionar ? ' checked' : ''}`, 'Saldré sin estacionar')}
      <p class="${clases.nota}">No ocuparás celda, pero conservas tu lugar hasta salir.</p>
      ${boton}
    </section>`;
  }

  function politica() {
    return `<details class="${clases.tarjeta}">
      <summary class="min-h-[28px] text-label-md text-on-surface cursor-pointer">¿Cómo se reparten las celdas?</summary>
      <p class="text-body-lg text-on-surface-variant">${esc(window.ParkEngine.POLITICA_TEXTO)}</p>
    </details>`;
  }

  function mapaFila(v) {
    const lote = App.loteAcceso(v.acceso);
    if (!lote) return '';
    return `<section class="${clases.tarjeta}">
      <h2 class="${clases.titulo}">Tu lugar en la fila</h2>
      ${App.mapas.huecoFila('celular', `Mapa del acceso ${App.NOMBRE_ACCESO[v.acceso]} con la fila en vivo`, lote)}
      <p class="${clases.nota}">"Tú" marca tu carro en la fila de ${App.NOMBRE_ACCESO[v.acceso]}.</p>
    </section>`;
  }

  function pantallaEspera(v) {
    const p = App.engine.posicion(v.placa) || { delante: 0, detras: 0, posicionEnPasarela: null };
    const afuera = v.estado === 'AFUERA';
    const numero = afuera ? p.delante + 1 : p.posicionEnPasarela || p.delante + 1;
    const vehiculos = (n) => `${n} ${n === 1 ? 'vehículo' : 'vehículos'}`;
    const cuerpo = `<div class="p-space-md flex flex-col items-center gap-1 text-center" aria-live="polite" aria-atomic="true">
        <p class="${clases.nota}">Posición</p>
        <p class="text-[4rem] leading-none font-bold text-primary-container" data-key="pos-${numero}">${numero}</p>
        <p class="text-body-md text-on-surface-variant">${vehiculos(p.delante)} delante · ${p.detras} detrás</p>
      </div>`;
    const chip = afuera ? App.chip('reservada', 'Esperas afuera') : App.chip('libre', 'Turno activo');
    return `<div class="${clases.pantalla}" data-key="p-espera">
      ${App.tituloPantalla('Mi turno y acceso', chip)}
      ${afuera ? App.aviso('atencion', '<p><b>Pasarela llena: esperas afuera.</b> Entras cuando se libere un cupo.</p>') : ''}
      ${tiempoTranscurrido(v)}
      ${ticket(v, 'bg-secondary-container', cuerpo)}
      ${alertaClase(v)}
      ${mapaFila(v)}
      ${esperaBloque(v, p)}
      ${interruptorSalida(v)}
      ${politica()}
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
    return `<svg class="codigo w-44 h-44 rounded-lg" viewBox="-1 -1 23 23" role="img" aria-label="Código simulado de la placa ${esc(placa)}">
      <rect class="codigo-fondo" x="-1" y="-1" width="23" height="23"/>${celdas}${ojo(0, 0)}${ojo(14, 0)}${ojo(0, 14)}
    </svg>`;
  }

  function accionCelda(v) {
    if (v.valet && v.valet.estado !== 'SELECCIONADO' && v.valet.estado !== 'PAGADO') {
      return `<p class="${clases.nota} text-center">El valet lleva tu carro. Sigue el avance en la pestaña Valet.</p>
        <button type="button" class="${clases.primario}" data-accion="irTab" data-tab="valet">${icono('directions_car', 22)}Ver mi valet</button>`;
    }
    if (v.estado === 'CELDA_ASIGNADA') {
      const primero = App.fila(v.acceso)[0] === v;
      const orden = App.fila(v.acceso).indexOf(v) + 1;
      return `<button type="button" class="${clases.primario}" disabled>${icono('schedule', 22)}Esperando portería…</button>
        <p class="${clases.nota} text-center">${primero ? 'Eres el primero de la fila: muestra tu código en portería.' : `Vas ${orden}.º en la fila. Disponible cuando seas el primero y portería te confirme.`}</p>`;
    }
    if (v.estado === 'EN_RECORRIDO') {
      return `<button type="button" class="${clases.primario}" data-accion="estacionar">${icono('local_parking', 22)}Llegué a mi celda</button>`;
    }
    return `<button type="button" class="${clases.primario}" data-accion="salir">${icono('logout', 22)}Salir del parqueadero</button>`;
  }

  function pasosRuta(ruta) {
    return `<ol class="list-decimal pl-5 flex flex-col gap-1 text-body-lg text-on-surface">${(ruta.pasos || []).map((p) => `<li>${esc(p)}</li>`).join('')}</ol>`;
  }

  function tarjetaMotos(v, ruta) {
    const r = App.engine.resumen();
    return `<section class="${clases.tarjeta}">
      <div class="flex items-center gap-space-xs"><span class="text-primary-container">${icono('two_wheeler', 24)}</span><h2 class="${clases.titulo}">${esc(App.nombreZona('M'))}, celda ${esc(v.celdaId)}</h2></div>
      <p class="${clases.nota}">${r.libresPorTipo.MOTO} de ${r.totalPorTipo.MOTO} celdas de moto libres. Esta zona no aparece en el mapa del campus.</p>
      ${pasosRuta(ruta)}
    </section>`;
  }

  function planoCelda(v, celda, ruta) {
    if (celda && celda.zona === 'M') return tarjetaMotos(v, ruta);
    const r = App.engine.resumen();
    const otroLote = Boolean(App.loteAcceso(v.acceso)) && App.loteAcceso(v.acceso) !== ruta.lote;
    const etiqueta = `Mapa: ${r.libresPorTipo.CARRO} celdas libres de ${r.totalPorTipo.CARRO}. Tu celda: ${v.celdaId}`;
    return `<section class="${clases.tarjeta}" id="plano-celda">
      <h2 class="${clases.titulo}">Ruta en campus</h2>
      ${App.mapas.hueco('celular', etiqueta, { celda: v.celdaId, lote: ruta.lote, placa: v.placa })}
      <div class="grid grid-cols-2 gap-space-xs" role="group" aria-label="Vista del mapa">
        <button type="button" class="${clases.secundario}" data-accion="vistaCelular" data-lote="${esc(ruta.lote)}">${icono('location_on', 18)}Mi celda</button>
        <button type="button" class="${clases.secundario}" data-accion="vistaCelular">${icono('route', 18)}Ruta completa</button>
      </div>
      ${App.mapas.leyenda()}
      ${otroLote ? `<p class="${clases.nota}">Entraste por ${App.NOMBRE_ACCESO[v.acceso]}, pero el parqueadero es uno solo: la celda que te tocaba por orden de llegada está en ${esc(App.nombreZona(ruta.lote))}.</p>` : ''}
      ${pasosRuta(ruta)}
    </section>`;
  }

  function pantallaCelda(v) {
    const celda = App.celdas().find((c) => c.id === v.celdaId);
    const ruta = App.engine.ruta(v.placa) || {};
    const estacionado = v.estado === 'ESTACIONADO';
    const asignada = v.estado === 'CELDA_ASIGNADA';
    const chip = estacionado ? App.chip('libre', 'Estacionado') : App.chip('libre', 'Turno activo');
    const banner = estacionado
      ? { titulo: 'Estás en tu celda', texto: 'Cuando quieras salir, usa el botón de abajo.' }
      : v.estado === 'EN_RECORRIDO'
        ? { titulo: 'Ticket validado en portería', texto: `Ingreso autorizado por Portería ${App.NOMBRE_ACCESO[v.acceso]}` }
        : { titulo: '¡Tienes celda!', texto: `Reservada para ${esc(v.placa)}` };
    const cuerpo = `<div class="p-space-md flex justify-between items-end gap-2 bg-surface-container-lowest">
        <div class="min-w-0 flex-1"><span class="${clases.nota} block">Ubicación en campus</span><span class="text-headline-sm text-on-surface">${esc(App.nombreZona(celda ? celda.zona : ''))}</span></div>
        <div class="text-right shrink-0"><span class="${clases.nota} block">Celda asignada</span><span class="inline-block px-3 py-1 bg-surface-container-high rounded-xl text-primary-container font-bold text-headline-sm">${esc(v.celdaId)}</span></div>
      </div>
      ${
        asignada
          ? `${App.cortePerforado()}
      <div class="p-space-md flex flex-col items-center gap-space-xs bg-surface-container-lowest">
        <div class="bg-white p-3 rounded-2xl shadow-sm">${codigoSimulado(v.placa)}</div>
        <p class="${clases.nota} text-center"><b class="text-on-surface">Muéstralo en portería.</b> Código simulado de la placa.</p>
      </div>`
          : ''
      }`;
    return `<div class="${clases.pantalla}" data-key="p-celda-${esc(v.celdaId)}">
      ${App.aviso('ok', `<p class="text-label-md">${banner.titulo}</p><p>${banner.texto}</p>`)}
      ${App.tituloPantalla('Mi turno y acceso', chip)}
      ${tiempoTranscurrido(v)}
      ${ticket(v, 'bg-libre-punto', cuerpo)}
      ${planoCelda(v, celda, ruta)}
      ${accionCelda(v)}
      ${lineaEstados(v)}
    </div>`;
  }

  function vacio(titulo, texto, boton) {
    return `<div class="${clases.pantalla}" data-key="p-vacio"><section class="${clases.tarjeta} items-center text-center py-space-xl">
      <span class="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center text-primary-container">${icono('directions_car', 32)}</span>
      <h2 class="${clases.titulo}">${titulo}</h2>
      <p class="text-body-lg text-on-surface-variant">${texto}</p>
      ${boton}
    </section></div>`;
  }

  App.pantallas.vacio = vacio;

  App.pantallas.turno = function () {
    const v = App.conductorActivo();
    const irInicio = `<button type="button" class="${clases.primario}" data-accion="irTab" data-tab="inicio">Ir a Inicio</button>`;
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

  App.acciones.vistaCelular = (el) => App.mapas.vista('celular', el.dataset.lote);
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
