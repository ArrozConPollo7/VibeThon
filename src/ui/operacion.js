// Panel de portería y operación: simulación, pasarelas, mapa, portería, justicia y registro.
(function () {
  const { esc, placaHTML, icono, clases } = App;
  const MAX_EVENTOS = 50;
  const TEXTO_ESTADO = { LIBRE: 'libre', RESERVADA: 'reservada', OCUPADA: 'ocupada' };
  const NOMBRE_ESTADO = { LIBRE: 'Libre', RESERVADA: 'Reservada', OCUPADA: 'Ocupada' };
  const LOTES = [
    { id: 'N', texto: 'Principal' },
    { id: 'I', texto: 'Ingeniería' },
    { id: 'G', texto: 'Idiomas' }
  ];

  function etiquetaCarro(v) {
    if (v.valet && v.valet.estado !== 'SELECCIONADO' && !v.celdaId) return 'Valet';
    if (v.saleSinEstacionar) return 'Sale sin estacionar';
    if (v.celdaId) return `Celda ${v.celdaId}`;
    return 'Esperando celda';
  }

  function tarjetaCarro(v, primero) {
    const borde = v.celdaId ? 'border-libre-punto' : v.saleSinEstacionar ? 'border-outline' : 'border-secondary-container';
    const hora = v.registradoEn != null ? v.registradoEn : v.llegadaAfueraEn;
    return `<li class="bg-surface-container-lowest rounded-xl shadow-sm border-l-4 ${borde} p-2 flex flex-col gap-0.5 min-w-0" data-key="car-${esc(v.placa)}" data-flip="${esc(v.placa)}">
      <div>${placaHTML(v.placa)}</div>
      <span class="text-label-sm text-on-surface">${esc(etiquetaCarro(v))}</span>
      <span class="${clases.nota}">${App.hora(hora)}${primero ? ', primero' : ''}</span>
    </li>`;
  }

  function pasarela(acceso) {
    const fila = App.fila(acceso);
    const afuera = App.afuera(acceso);
    const capacidad = App.engine.resumen().accesos[acceso].capacidad;
    const huecos = Math.max(0, capacidad - fila.length);
    return `<section class="bg-surface-container-low rounded-2xl p-space-sm flex flex-col gap-space-xs min-w-0" aria-label="Pasarela ${App.NOMBRE_ACCESO[acceso]}">
      <div class="flex items-center justify-between gap-2"><h3 class="text-label-lg text-on-surface">${App.NOMBRE_ACCESO[acceso]}</h3>${App.chipMarca(`${fila.length}/${capacidad}`)}</div>
      <p class="${clases.nota} flex items-center gap-1">${icono('contactless', 18)}Portería</p>
      <ol class="flex flex-col gap-space-xs">
        ${fila.map((v, i) => tarjetaCarro(v, i === 0)).join('')}
        ${Array.from({ length: huecos }, (_, i) => `<li class="rounded-xl border border-dashed border-outline-variant p-2 text-label-sm text-on-surface-variant text-center" data-key="hueco-${acceso}-${i}">Cupo libre</li>`).join('')}
      </ol>
      <h4 class="text-label-md text-on-surface mt-1">Afuera (${afuera.length})</h4>
      ${
        afuera.length
          ? `<ol class="flex flex-col gap-space-xs">${afuera.map((v) => tarjetaCarro(v, false)).join('')}</ol>`
          : `<p class="${clases.nota}">Nadie espera afuera.</p>`
      }
    </section>`;
  }

  function infoCelda(id) {
    const celda = id && App.celdas().find((c) => c.id === id);
    if (!celda) return `<p class="${clases.nota}">Toca una celda para ver su estado y su placa.</p>`;
    return `<div class="flex flex-wrap items-center gap-2 bg-surface-container-low rounded-xl p-space-sm" aria-live="polite">
      <b class="text-label-lg text-on-surface">${esc(celda.id)}</b>
      <span class="${clases.nota}">${esc(App.nombreZona(celda.zona))}</span>
      ${App.chip(TEXTO_ESTADO[celda.estado], NOMBRE_ESTADO[celda.estado])}
      ${celda.placa ? placaHTML(celda.placa) : ''}
    </div>`;
  }

  function mapaOperacion(r) {
    const { CARRO, MOTO } = r.libresPorTipo;
    const boton = (texto, lote) =>
      `<button type="button" class="${clases.secundario}" data-accion="vistaMapa"${lote ? ` data-lote="${lote}"` : ''}>${texto}</button>`;
    return `<section class="${clases.tarjeta}">
      <h3 class="${clases.titulo}">Parqueadero en vivo: ${CARRO} ${CARRO === 1 ? 'celda libre' : 'celdas libres'} de ${r.totalPorTipo.CARRO}</h3>
      <div class="flex flex-wrap gap-space-xs" role="group" aria-label="Vista del mapa">${LOTES.map((l) => boton(l.texto, l.id)).join('')}${boton('Ver todo')}</div>
      ${App.mapas.hueco('panel', `Mapa: ${CARRO} celdas libres de ${r.totalPorTipo.CARRO}`)}
      ${App.mapas.leyenda()}
      ${infoCelda(App.ui.celdaInfo)}
      <p class="${clases.nota}">${esc(App.nombreZona('M'))}: ${MOTO} de ${r.totalPorTipo.MOTO} celdas libres. No se dibujan en el mapa.</p>
    </section>`;
  }

  function controles() {
    const { corriendo, velocidad } = App.ui.sim;
    const velocidadBoton = (n) => {
      const activo = velocidad === n;
      return `<button type="button" class="min-h-[44px] min-w-[44px] px-3 rounded-xl text-label-md ${activo ? 'bg-primary-container text-on-primary' : 'bg-surface-container text-primary-container'}" data-accion="velocidad" data-valor="${n}" aria-pressed="${activo}">x${n}</button>`;
    };
    const control = (accion, ico, texto, extra = '') =>
      `<button type="button" class="${clases.secundario}" data-accion="${accion}"${extra}>${icono(ico, 18)}${texto}</button>`;
    return `<section class="${clases.tarjeta}" aria-label="Controles de simulación">
      <h3 class="${clases.titulo}">Simulación</h3>
      <div class="flex flex-wrap items-center gap-space-xs">
        ${control('alternarSim', corriendo ? 'pause' : 'play_arrow', corriendo ? 'Pausar' : 'Iniciar reloj')}
        <div class="flex gap-1" role="group" aria-label="Velocidad">${velocidadBoton(1)}${velocidadBoton(10)}</div>
        ${control('avanzarMin', 'skip_next', 'Avanzar 1 min')}
        ${control('exportar', 'download', 'Exportar JSON')}
        ${control('reiniciar', 'restart_alt', 'Reiniciar')}
      </div>
      <div class="flex flex-wrap items-end gap-space-xs">
        <label class="${clases.etiqueta}"><span>Acceso para la llegada</span>
          <select id="generar-acceso" class="${clases.entrada}">
            ${App.ACCESOS.map((a) => `<option value="${a}">${App.NOMBRE_ACCESO[a]} · ${esc(App.nombreZona(App.loteAcceso(a)))}</option>`).join('')}
          </select>
        </label>
        ${control('generar', 'add', 'Generar llegada')}
      </div>
      ${App.interruptor(`data-accion-cambio="autoPorteria"${App.engine.state.autoPorteria ? ' checked' : ''}`, 'Portería automática')}
    </section>`;
  }

  function salidosPanel() {
    const salidos = App.vehiculos().filter((v) => v.estado === 'SALIO').length;
    const total = App.vehiculos().length;
    return `<section class="${clases.tarjeta}">
      <h3 class="${clases.titulo}">Carros que ya salieron del campus</h3>
      <p class="${clases.nota}">Salir del parqueadero los deja en la vía; 5 min después el sistema los retira solo. También puedes retirarlos de una vez.</p>
      <div class="flex flex-wrap items-center gap-space-xs">
        ${App.chip('libre', `${total} en el sistema`)}${App.chip('ocupada', `${salidos} ya salieron`)}
        <button type="button" class="${clases.secundario}" data-accion="retirarSalidos"${salidos ? '' : ' disabled'}>${icono('logout', 18)}Retirar ${salidos} carro(s) que ya salieron</button>
      </div>
    </section>`;
  }

  function placaPorteria(p) {
    if (p.editada) return p.placa;
    const primero = App.fila(p.acceso)[0];
    return primero ? primero.placa : '';
  }

  function confirmar() {
    const p = App.ui.porteria;
    const res = p.resultado;
    return `<form class="${clases.tarjeta}" data-formulario="verificar">
      <h3 class="${clases.titulo}">Confirmar en portería</h3>
      <label class="${clases.etiqueta}"><span>Acceso</span>
        <select class="${clases.entrada}" data-campo="porteria.acceso">
          ${App.ACCESOS.map((a) => `<option value="${a}"${a === p.acceso ? ' selected' : ''}>${App.NOMBRE_ACCESO[a]}</option>`).join('')}
        </select>
      </label>
      <label class="${clases.etiqueta}"><span>Placa</span>
        <input class="entrada--placa font-mono tracking-wider ${clases.entrada}" data-campo="porteria.placa" value="${esc(App.formatoPlaca(placaPorteria(p)))}" autocomplete="off" placeholder="Sin carros en fila">
      </label>
      <button type="submit" class="${clases.primario}">${icono('verified', 22)}Verificar placa y reserva</button>
      ${res ? App.aviso(res.ok ? 'ok' : 'error', `<p>${esc(res.texto)}</p>`) : ''}
    </form>`;
  }

  function medidor(r) {
    const datos = App.ACCESOS.map((a) => {
      const j = r.justicia[a] || {};
      return { acceso: a, asignadas: j.asignadas || 0, esperaPromedioMin: Math.round((j.esperaPromedioMin || 0) * 10) / 10 };
    });
    const maxAsig = Math.max(...datos.map((d) => d.asignadas), 1);
    const maxEsp = Math.max(...datos.map((d) => d.esperaPromedioMin), 1);
    const fila = (d, valor, max, unidad) => `<div class="grid grid-cols-[5.5rem_1fr_auto] items-center gap-2 text-label-sm text-on-surface">
      <span>${App.NOMBRE_ACCESO[d.acceso]}</span>
      <div class="h-2.5 rounded-full bg-surface-container-high overflow-hidden"><div class="h-full rounded-full bg-primary-container" style="width:${(valor / max) * 100}%"></div></div>
      <b>${valor}${unidad}</b>
    </div>`;
    return `<section class="${clases.tarjeta}">
      <h3 class="${clases.titulo}">Medidor de justicia</h3>
      <h4 class="text-label-md text-on-surface-variant">Celdas asignadas</h4>
      ${datos.map((d) => fila(d, d.asignadas, maxAsig, '')).join('')}
      <h4 class="text-label-md text-on-surface-variant">Espera promedio por celda</h4>
      ${datos.map((d) => fila(d, d.esperaPromedioMin, maxEsp, ' min')).join('')}
      <p class="${clases.nota}">Celdas duplicadas: <b class="text-on-surface">${celdasDuplicadas()}</b> · Asignaciones registradas: <b class="text-on-surface">${App.engine.state.asignaciones.length}</b></p>
      <p class="${clases.nota}">${esc(window.ParkEngine.POLITICA_TEXTO)}</p>
    </section>`;
  }

  // Duplicado = la misma placa en dos celdas. Con seis entradas se puede provocar; debe quedar en 0.
  function celdasDuplicadas() {
    const vistas = {};
    let dup = 0;
    App.celdas().forEach((c) => {
      if (!c.placa) return;
      if (vistas[c.placa]) dup++;
      vistas[c.placa] = true;
    });
    return dup;
  }

  function registro() {
    const eventos = App.eventos().slice(-MAX_EVENTOS).reverse();
    const total = App.eventos().length;
    return `<section class="${clases.tarjeta}">
      <h3 class="${clases.titulo}">Registro de eventos</h3>
      ${
        eventos.length
          ? `<ol class="flex flex-col gap-1.5 max-h-72 overflow-y-auto">${eventos
              .map((e, i) => `<li class="flex gap-2 text-label-sm text-on-surface" data-key="ev-${total - i}"><time class="font-mono text-on-surface-variant shrink-0">${esc(e.t)}</time><span class="min-w-0">${esc(e.mensaje)}</span></li>`)
              .join('')}</ol>`
          : `<p class="${clases.nota}">Aún no hay eventos. Genera una llegada o avanza el reloj.</p>`
      }
    </section>`;
  }

  App.pantallas.operacion = function () {
    const r = App.engine.resumen();
    return `<div class="flex flex-col gap-space-md min-w-0">
      ${App.tituloPantalla('Portería y operación', App.ui.sim.corriendo ? App.chipEnVivo('En vivo') : '')}
      ${controles()}
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-space-sm">${App.ACCESOS.map(pasarela).join('')}</div>
      ${confirmar()}
      ${salidosPanel()}
      ${mapaOperacion(r)}
      ${medidor(r)}
      ${registro()}
    </div>`;
  };

  App.acciones.alternarSim = function () {
    App.setSub('sim', { corriendo: !App.ui.sim.corriendo });
    App.reprogramarSim();
  };
  App.acciones.velocidad = function (el) {
    App.setSub('sim', { velocidad: Number(el.dataset.valor) });
    App.reprogramarSim();
  };
  App.acciones.avanzarMin = function () {
    const r = App.engine.avanzar(1);
    if (r && r.ok === false) App.resultado(r);
  };
  App.acciones.generar = function (el) {
    const select = document.getElementById('generar-acceso');
    const acceso = (el && el.dataset.acceso) || (select && select.value) || null;
    const r = App.engine.generarLlegada(acceso);
    if (!App.resultado(r)) return;
    const nombre = App.NOMBRE_ACCESO[acceso] || 'el campus';
    const afuera = r.vehiculo && r.vehiculo.estado === 'AFUERA';
    App.toast('ok', `${r.vehiculo ? r.vehiculo.placa : 'Carro'} llegó a ${nombre}${afuera ? ': pasarela llena, espera afuera' : ''}`);
  };
  App.acciones.retirarSalidos = function () {
    const r = App.engine.retirarSalidos();
    App.toast('ok', r.retirados
      ? `${r.retirados} carro(s) retirado(s): ya salieron del campus.`
      : 'No hay carros pendientes por retirar.');
    App.programarRender();
  };
  App.acciones.vistaMapa = (el) => App.mapas.vista('panel', el.dataset.lote);
  App.acciones.reiniciar = function () {
    App.reiniciarUI();
    App.mapas.reiniciar();
    App.engine.reiniciar();
    App.toast('ok', 'Simulación reiniciada a las ' + App.engine.resumen().reloj);
  };
  App.acciones.exportar = function () {
    const blob = new Blob([App.engine.exportarJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `parkeafit-registro-${App.engine.resumen().reloj.replace(':', '')}.json`;
    enlace.click();
    URL.revokeObjectURL(url);
    App.toast('ok', 'Registro exportado a tu carpeta de descargas');
  };
  App.acciones.autoPorteria = function (el) {
    const mensaje = el.checked ? 'Portería automática activada' : 'Portería automática desactivada';
    App.resultado(App.engine.setAutoPorteria(el.checked), mensaje);
    App.programarRender();
  };
  App.acciones.verificar = function () {
    const p = App.ui.porteria;
    const placa = App.normalizarPlaca(placaPorteria(p));
    const r = App.engine.confirmarPorteria(p.acceso, placa);
    const ok = App.resultado(r, r.ok ? `${placa} pasó portería rumbo a ${r.celda.id}` : '');
    const texto = ok ? `Placa y reserva coinciden: ${r.celda.id}` : r.error;
    App.setSub('porteria', { placa: '', editada: false, resultado: { ok, texto } });
  };
})();
