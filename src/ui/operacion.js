// Panel de portería y operación (sección 7 de la tarea).
(function () {
  const { esc, placaHTML, icono } = App;
  const MAX_EVENTOS = 50;

  function etiquetaCarro(v) {
    if (v.valet && v.valet.estado !== 'SELECCIONADO' && !v.celdaId) return 'Valet';
    if (v.saleSinEstacionar) return 'Sale sin estacionar';
    if (v.celdaId) return `Celda ${v.celdaId}`;
    return 'Esperando celda';
  }

  function tarjetaCarro(v, primero) {
    const estado = v.celdaId ? ' carro--celda' : v.saleSinEstacionar ? ' carro--sale' : '';
    const hora = v.registradoEn != null ? v.registradoEn : v.llegadaAfueraEn;
    return `<li class="carro${estado}${primero ? ' carro--primero' : ''}" data-key="car-${esc(v.placa)}" data-flip="${esc(v.placa)}">
      ${placaHTML(v.placa)}
      <span class="carro-dato">${esc(etiquetaCarro(v))}</span>
      <span class="carro-hora">${App.hora(hora)}${primero ? ', primero' : ''}</span>
    </li>`;
  }

  function pasarela(acceso) {
    const fila = App.fila(acceso);
    const afuera = App.afuera(acceso);
    const capacidad = 4;
    const huecos = Math.max(0, capacidad - fila.length);
    return `<section class="pasarela" aria-label="Pasarela ${App.NOMBRE_ACCESO[acceso]}">
      <h3 class="pasarela-titulo">${App.NOMBRE_ACCESO[acceso]} <span>${fila.length}/${capacidad}</span></h3>
      <p class="pasarela-porteria">Portería</p>
      <ol class="carril">
        ${fila.map((v, i) => tarjetaCarro(v, i === 0)).join('')}
        ${Array.from({ length: huecos }, (_, i) => `<li class="hueco" data-key="hueco-${acceso}-${i}">Cupo libre</li>`).join('')}
      </ol>
      <h4 class="afuera-titulo">Afuera (${afuera.length})</h4>
      ${
        afuera.length
          ? `<ol class="afuera">${afuera.map((v) => tarjetaCarro(v, false)).join('')}</ol>`
          : '<p class="nota">Nadie espera afuera.</p>'
      }
    </section>`;
  }

  function infoCelda(id) {
    const celda = id && App.celdas().find((c) => c.id === id);
    if (!celda) return '<p class="nota">Toca una celda para ver su estado y su placa.</p>';
    const estado = { LIBRE: 'Libre', RESERVADA: 'Reservada', OCUPADA: 'Ocupada' }[celda.estado];
    return `<p class="info-celda" aria-live="polite"><b>${esc(celda.id)}</b> en ${esc(App.nombreZona(celda.zona))}: ${estado}${celda.placa ? ` ${placaHTML(celda.placa)}` : ''}</p>`;
  }

  function mapaOperacion(r) {
    const { CARRO, MOTO } = r.libresPorTipo;
    const boton = (texto, lote) => `<button type="button" class="control" data-accion="vistaMapa"${lote ? ` data-lote="${lote}"` : ''}>${texto}</button>`;
    return `<section class="tarjeta operacion-mapa">
      <h3 class="titulo-seccion">Parqueadero en vivo: ${CARRO} ${CARRO === 1 ? 'celda libre' : 'celdas libres'} de ${r.totalPorTipo.CARRO}</h3>
      <div class="mapa-vistas" role="group" aria-label="Vista del mapa">${boton('Principal', 'N')}${boton('Ingeniería', 'I')}${boton('Ver todo')}</div>
      ${App.mapas.hueco('panel', `Mapa: ${CARRO} celdas libres de ${r.totalPorTipo.CARRO}`)}
      ${App.mapas.leyenda()}
      ${infoCelda(App.ui.celdaInfo)}
      <p class="nota">${esc(App.nombreZona('M'))}: ${MOTO} de ${r.totalPorTipo.MOTO} celdas libres. No se dibujan en el mapa.</p>
    </section>`;
  }

  function controles() {
    const { corriendo, velocidad } = App.ui.sim;
    const velocidadBoton = (n) =>
      `<button type="button" class="control${velocidad === n ? ' control--activo' : ''}" data-accion="velocidad" data-valor="${n}" aria-pressed="${velocidad === n}">x${n}</button>`;
    return `<section class="controles" aria-label="Controles de simulación">
      <button type="button" class="control" data-accion="alternarSim">${icono(corriendo ? 'pausa' : 'play', 18)}${corriendo ? 'Pausar' : 'Iniciar reloj'}</button>
      <div class="control-grupo" role="group" aria-label="Velocidad">${velocidadBoton(1)}${velocidadBoton(10)}</div>
      <button type="button" class="control" data-accion="avanzarMin">${icono('paso', 18)}Avanzar 1 min</button>
      <button type="button" class="control" data-accion="generar" data-acceso="REGIONAL">${icono('mas', 18)}Llegada Regional</button>
      <button type="button" class="control" data-accion="generar" data-acceso="LAS_VEGAS">${icono('mas', 18)}Llegada Las Vegas</button>
      <label class="interruptor interruptor--control">
        <input type="checkbox" data-accion-cambio="autoPorteria"${App.engine.state.autoPorteria ? ' checked' : ''}>
        <span class="interruptor-pista" aria-hidden="true"></span><span>Portería automática</span>
      </label>
      <button type="button" class="control" data-accion="exportar">${icono('bajar', 18)}Exportar registro (JSON)</button>
      <button type="button" class="control" data-accion="reiniciar">${icono('reiniciar', 18)}Reiniciar</button>
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
    return `<form class="tarjeta" data-formulario="verificar">
      <h3 class="titulo-seccion">Confirmar en portería</h3>
      <label class="campo"><span>Acceso</span>
        <select class="entrada" data-campo="porteria.acceso">
          ${App.ACCESOS.map((a) => `<option value="${a}"${a === p.acceso ? ' selected' : ''}>${App.NOMBRE_ACCESO[a]}</option>`).join('')}
        </select>
      </label>
      <label class="campo"><span>Placa</span>
        <input class="entrada entrada--placa" data-campo="porteria.placa" value="${esc(App.formatoPlaca(placaPorteria(p)))}" autocomplete="off" placeholder="Sin carros en fila">
      </label>
      <button type="submit" class="boton boton--primario">Verificar placa y reserva</button>
      ${res ? `<p class="veredicto veredicto--${res.ok ? 'ok' : 'error'}" role="status">${icono(res.ok ? 'check' : 'alerta', 18)}${esc(res.texto)}</p>` : ''}
    </form>`;
  }

  function medidor(r) {
    const datos = App.ACCESOS.map((a) => {
      const j = r.justicia[a] || {};
      return { acceso: a, asignadas: j.asignadas || 0, esperaPromedioMin: Math.round((j.esperaPromedioMin || 0) * 10) / 10 };
    });
    const maxAsig = Math.max(...datos.map((d) => d.asignadas), 1);
    const maxEsp = Math.max(...datos.map((d) => d.esperaPromedioMin), 1);
    const fila = (d, valor, max, unidad) => `<div class="medida">
      <span>${App.NOMBRE_ACCESO[d.acceso]}</span>
      <div class="barra"><span style="width:${(valor / max) * 100}%"></span></div>
      <b>${valor}${unidad}</b>
    </div>`;
    return `<section class="tarjeta">
      <h3 class="titulo-seccion">Medidor de justicia</h3>
      <h4 class="subtitulo">Celdas asignadas</h4>
      ${datos.map((d) => fila(d, d.asignadas, maxAsig, '')).join('')}
      <h4 class="subtitulo">Espera promedio por celda</h4>
      ${datos.map((d) => fila(d, d.esperaPromedioMin, maxEsp, ' min')).join('')}
      <p class="nota">${esc(window.ParkEngine.POLITICA_TEXTO)}</p>
    </section>`;
  }

  function registro() {
    const eventos = App.eventos().slice(-MAX_EVENTOS).reverse();
    const total = App.eventos().length;
    return `<section class="tarjeta registro">
      <h3 class="titulo-seccion">Registro de eventos</h3>
      ${
        eventos.length
          ? `<ol class="eventos">${eventos
              .map((e, i) => `<li data-key="ev-${total - i}"><time>${esc(e.t)}</time><span>${esc(e.mensaje)}</span></li>`)
              .join('')}</ol>`
          : '<p class="nota">Aún no hay eventos. Genera una llegada o avanza el reloj.</p>'
      }
    </section>`;
  }

  App.pantallas.operacion = function () {
    const r = App.engine.resumen();
    return `<div class="operacion">
      ${controles()}
      <div class="operacion-filas"><div class="pasarelas">${App.ACCESOS.map(pasarela).join('')}</div></div>
      ${mapaOperacion(r)}
      <div class="operacion-confirmar">${confirmar()}</div>
      <div class="operacion-medidor">${medidor(r)}</div>
      <div class="operacion-registro">${registro()}</div>
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
    const nombre = App.NOMBRE_ACCESO[el.dataset.acceso];
    const r = App.engine.generarLlegada(el.dataset.acceso);
    if (!App.resultado(r)) return;
    const afuera = r.vehiculo && r.vehiculo.estado === 'AFUERA';
    App.toast('ok', `${r.vehiculo ? r.vehiculo.placa : 'Carro'} llegó a ${nombre}${afuera ? ': pasarela llena, espera afuera' : ''}`);
  };
  App.acciones.vistaMapa = (el) => App.mapas.vista('panel', el.dataset.lote);
  App.acciones.reiniciar = function () {
    App.reiniciarUI();
    App.mapas.reiniciar();
    App.engine.reiniciar();
    App.toast('ok', 'Simulación reiniciada a las 07:30');
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
