// Pantalla Inicio (Stitch 01-inicio): disponibilidad por sector y registro de llegada.
(function () {
  const { esc, icono, clases } = App;
  const SECTORES = {
    CARRO: [
      { zona: 'N', detalle: 'Entradas: Regional y Calle 4 Sur', ico: 'local_library' },
      { zona: 'I', detalle: 'Entradas: Las Vegas y Carrera 49', ico: 'precision_manufacturing' },
      { zona: 'G', detalle: 'Entradas: Guayabos y Loma', ico: 'translate' }
    ],
    MOTO: [{ zona: 'M', detalle: 'Celdas de moto', ico: 'two_wheeler' }]
  };
  const LOTES = [
    { zona: 'N', texto: 'Principal' },
    { zona: 'I', texto: 'Ingeniería' },
    { zona: 'G', texto: 'Idiomas' }
  ];
  const ESTADOS_CELDA = {
    LIBRE: { chip: 'libre', texto: 'Libre' },
    RESERVADA: { chip: 'reservada', texto: 'Reservada' },
    OCUPADA: { chip: 'ocupada', texto: 'Ocupada' }
  };

  const tipoVista = () => App.ui.tipoVista || 'CARRO';

  function conteo(celdas) {
    const de = (estado) => celdas.filter((c) => c.estado === estado).length;
    return { libres: de('LIBRE'), reservadas: de('RESERVADA'), ocupadas: de('OCUPADA'), total: celdas.length };
  }

  const celdasDe = (tipo, zona) =>
    App.celdas().filter((c) => c.tipo === tipo && (!zona || c.zona === zona));

  function ocupacion(tipo) {
    const c = conteo(celdasDe(tipo));
    const pct = (n) => (c.total ? (n / c.total) * 100 : 0);
    const ocupadoPct = Math.round(pct(c.ocupadas + c.reservadas));
    const leyenda = (punto, texto) =>
      `<span class="text-label-sm flex items-center gap-1.5"><span class="w-2 h-2 rounded-full ${punto}"></span>${texto}</span>`;
    return `<section class="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex flex-col gap-space-md">
      <div class="flex items-start justify-between gap-space-xs">
        <div class="min-w-0">
          <span class="text-label-sm text-on-surface-variant block">Ocupación general</span>
          <span class="text-headline-lg text-primary-container">${c.libres} ${c.libres === 1 ? 'celda libre' : 'celdas libres'}</span>
          <p class="text-body-md text-on-surface-variant mt-0.5">De ${c.total} celdas de ${tipo === 'MOTO' ? 'moto' : 'carro'}</p>
        </div>
        ${App.anillo(ocupadoPct, `Ocupación del ${ocupadoPct} por ciento`, `${ocupadoPct}%`)}
      </div>
      <div class="flex flex-col gap-1.5">
        <div class="w-full h-2.5 rounded-full bg-surface-container-low flex overflow-hidden" role="img" aria-label="${c.libres} libres, ${c.reservadas} reservadas, ${c.ocupadas} ocupadas">
          <div class="h-full bg-libre-punto" style="width:${pct(c.libres)}%"></div>
          <div class="h-full bg-secondary-container" style="width:${pct(c.reservadas)}%"></div>
          <div class="h-full bg-outline-variant" style="width:${pct(c.ocupadas)}%"></div>
        </div>
        <div class="flex flex-wrap justify-between gap-x-3 text-on-surface-variant">
          ${leyenda('bg-libre-punto', `${c.libres} libres`)}${leyenda('bg-secondary-container', `${c.reservadas} reservadas`)}${leyenda('bg-outline-variant', `${c.ocupadas} ocupadas`)}
        </div>
      </div>
    </section>`;
  }

  function selectorTipo(tipo) {
    const opcion = (id, texto, ico) => {
      const activo = tipo === id;
      return `<button type="button" class="shrink-0 min-h-[44px] px-4 py-2 rounded-xl text-label-md flex items-center gap-1.5 shadow-sm ${activo ? 'bg-primary-container text-on-primary' : 'bg-surface-container-lowest text-on-surface-variant'}" data-accion="elegirTipo" data-tipo="${id}" aria-pressed="${activo}">${icono(ico, 18)}${texto}</button>`;
    };
    return `<section class="flex flex-col gap-space-xs" aria-label="Tipo de vehículo">
      <h2 class="text-label-md text-on-surface">Tipo de vehículo</h2>
      <div class="flex flex-wrap items-center gap-space-xs">${opcion('CARRO', 'Automóvil', 'directions_car')}${opcion('MOTO', 'Moto', 'two_wheeler')}</div>
    </section>`;
  }

  // Una fila por entrada: así se ve la coordinación entre las dos entradas de cada parqueadero.
  function accesoFila(acceso, r) {
    const d = r.accesos[acceso] || {};
    const activo = App.ui.form.acceso === acceso;
    const llena = (d.enPasarela || 0) >= (d.capacidad || 0);
    return `<button type="button" class="w-full min-h-[44px] rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-left ${activo ? 'bg-surface-container-high ring-1 ring-primary-container' : 'bg-surface-container-lowest'}" data-accion="elegirAcceso" data-acceso="${acceso}" aria-pressed="${activo}">
      <span class="flex items-center gap-2 min-w-0"><span class="text-primary-container">${icono('contactless', 18)}</span><span class="text-label-md text-on-surface">${esc(App.NOMBRE_ACCESO[acceso])}</span>${d.recomendado ? App.chipMarca('Recomendado') : ''}</span>
      <span class="${clases.nota}">Pasarela <b class="text-on-surface">${d.enPasarela || 0}/${d.capacidad || 0}</b>${llena ? ' (llena)' : ''} · <b class="text-on-surface">${d.afuera || 0}</b> afuera · ${esc(d.esperaTexto || '')}</span>
    </button>`;
  }

  function sector(s, tipo, r) {
    const c = conteo(celdasDe(tipo, s.zona));
    const accesos = tipo === 'CARRO' ? App.accesosDeLote(s.zona) : [];
    return `<article class="${clases.tarjeta}">
      <span class="flex items-start justify-between gap-space-xs w-full">
        <span class="flex items-center gap-space-xs min-w-0">
          <span class="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-primary-container shrink-0">${icono(s.ico, 22)}</span>
          <span class="min-w-0 flex flex-col"><span class="text-label-lg text-on-surface">${esc(App.nombreZona(s.zona))}</span><span class="text-label-sm text-on-surface-variant">${s.detalle}</span></span>
        </span>
      </span>
      <span class="flex items-center gap-2 pt-1 flex-wrap">
        ${App.chip('libre', `${c.libres} libres`)}${App.chip('reservada', `${c.reservadas} reservadas`)}${App.chip('ocupada', `${c.ocupadas} ocupadas`)}
      </span>
      ${accesos.length
        ? `<div class="flex flex-col gap-1.5 pt-1" role="group" aria-label="Entradas de ${esc(App.nombreZona(s.zona))}">${accesos.map((a) => accesoFila(a, r)).join('')}</div>`
        : `<span class="${clases.nota}">${s.detalle}</span>`}
    </article>`;
  }

  function sectores(tipo, r) {
    const lista = SECTORES[tipo];
    return `<section class="flex flex-col gap-space-md" aria-label="Sectores del campus">
      <div class="flex items-center justify-between gap-2"><h2 class="${clases.titulo}">Sectores del campus</h2><span class="${clases.nota}">${lista.length} ${lista.length === 1 ? 'sector' : 'sectores'}</span></div>
      ${lista.map((s) => sector(s, tipo, r)).join('')}
    </section>`;
  }

  function infoCelda(id) {
    const celda = id && App.celdas().find((c) => c.id === id);
    if (!celda) return `<p class="${clases.nota}">Toca una celda para ver su estado.</p>`;
    const estado = ESTADOS_CELDA[celda.estado];
    return `<div class="flex flex-wrap items-center gap-2 bg-surface-container-low rounded-xl p-space-sm" aria-live="polite">
      <b class="text-label-lg text-on-surface">${esc(celda.id)}</b>
      <span class="${clases.nota}">${esc(App.nombreZona(celda.zona))}</span>
      ${App.chip(estado.chip, estado.texto)}
    </div>`;
  }

  function mapaCampus() {
    const boton = (l) => {
      const c = conteo(celdasDe('CARRO', l.zona));
      return `<button type="button" class="${clases.secundario} flex-col !gap-0" data-accion="vistaInicio" data-lote="${l.zona}"><span>${l.texto}</span><span class="text-label-sm text-on-surface-variant">${c.libres} ${c.libres === 1 ? 'libre' : 'libres'} de ${c.total}</span></button>`;
    };
    return `<section class="${clases.tarjeta}" aria-label="Mapa del parqueadero">
      <h2 class="${clases.titulo}">Mapa del parqueadero</h2>
      <p class="${clases.nota}">Las celdas se asignan en orden de llegada para que sea justo entre accesos. Aquí ves cómo está el parqueadero ahora.</p>
      ${App.mapas.hueco('inicio', 'Mapa de consulta de los tres parqueaderos del campus')}
      <div class="grid grid-cols-2 gap-space-xs" role="group" aria-label="Vista del mapa">
        ${LOTES.map(boton).join('')}
        <button type="button" class="${clases.secundario}" data-accion="vistaInicio">Ver todo</button>
      </div>
      ${App.mapas.leyenda()}
      ${infoCelda(App.ui.celdaInicio)}
    </section>`;
  }

  function graficoHoras(r) {
    const horaActual = Math.floor(App.engine.state.clock / 60);
    const datos = App.historico(r.historico);
    const pico = Math.max(...datos.map((d) => d.pct), 1);
    const descripcion = datos.map((d) => `${d.hora}:00 ${d.pct}%`).join(', ');
    return `<section class="${clases.tarjeta}">
      <h2 class="${clases.titulo}">Horas más llenas</h2>
      <div class="flex items-end gap-0.5 h-28" role="img" aria-label="Ocupación promedio por hora: ${descripcion}">
        ${datos
          .map(
            (d) => `<div class="flex-1 min-w-0 h-full flex flex-col justify-end items-center gap-1">
              <span class="w-full rounded-t ${d.hora === horaActual ? 'bg-primary-container' : 'bg-surface-container-high'}" style="height:${Math.round((d.pct / pico) * 100)}%"></span>
              <span class="h-[1.125rem] text-label-sm text-on-surface-variant">${d.hora % 3 === 0 ? d.hora : ''}</span>
            </div>`
          )
          .join('')}
      </div>
      <p class="${clases.nota}">La barra azul es la hora actual. Datos simulados.</p>
    </section>`;
  }

  function campoError(nombre) {
    const mensaje = App.ui.form.errores[nombre];
    return mensaje ? `<p class="${clases.error}" id="error-${nombre}">${esc(mensaje)}</p>` : '';
  }

  function formulario(accesoElegido) {
    const f = App.ui.form;
    const tipo = App.tipoPlaca(f.placa);
    return `<form class="${clases.tarjeta}" id="form-llegada" data-formulario="registrar" novalidate>
      <h2 class="${clases.titulo}">Registra tu llegada</h2>
      <p class="${clases.nota}">Hazlo al cruzar la línea de entrada.</p>
      <label class="${clases.etiqueta}"><span>Placa</span>
        <input name="placa" data-campo="form.placa" value="${esc(App.formatoPlaca(f.placa))}" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABC 123" class="entrada--placa font-mono tracking-wider ${clases.entrada}" aria-describedby="ayuda-placa"${tipo || !f.placa ? '' : ' aria-invalid="true"'}>
      </label>
      <p id="ayuda-placa" aria-live="polite">${tipo ? App.chipTipo(tipo) : `<span class="${f.placa ? clases.error : clases.nota}">Carro: ABC123 · Moto: ABC12D</span>`}</p>
      <label class="${clases.etiqueta}"><span>Nombre</span>
        <input name="nombre" data-campo="form.nombre" value="${esc(f.nombre)}" autocomplete="off" placeholder="Tu nombre" class="${clases.entrada}"${f.errores.nombre ? ' aria-invalid="true" aria-describedby="error-nombre"' : ''}>
      </label>
      ${campoError('nombre')}
      <label class="${clases.etiqueta}"><span>Acceso</span>
        <select class="${clases.entrada}" data-campo="form.acceso">
          ${App.ACCESOS.map((a) => `<option value="${a}"${a === accesoElegido ? ' selected' : ''}>${App.NOMBRE_ACCESO[a]}</option>`).join('')}
        </select>
      </label>
      <label class="${clases.etiqueta}"><span>Parqueadero preferido</span>
        <select class="${clases.entrada}" data-campo="form.preferenciaZona">
          <option value=""${!f.preferenciaZona && !f.preferenciaCelda ? ' selected' : ''}>Cualquiera</option>
          <option value="N"${f.preferenciaZona === 'N' ? ' selected' : ''}>Principal</option>
          <option value="I"${f.preferenciaZona === 'I' ? ' selected' : ''}>Ingeniería</option>
          <option value="G"${f.preferenciaZona === 'G' ? ' selected' : ''}>Idiomas</option>
        </select>
      </label>
      ${f.preferenciaCelda ? `<p class="${clases.nota}">Celda preferida: <b>${esc(f.preferenciaCelda)}</b> · <button type="button" class="underline" data-accion="quitarPreferenciaCelda">quitar</button></p>` : ''}
      <p class="${clases.nota}">Tu preferencia no te adelanta en la fila: cuando llegue tu turno, te damos esa celda o ese parqueadero si están libres; si no, la más cercana.</p>
      <label class="${clases.etiqueta}"><span>Hora de llegada (opcional)</span>
        <input type="time" name="horaLlegada" data-campo="form.horaLlegada" value="${esc(f.horaLlegada)}" min="06:00" class="${clases.entrada}"${f.errores.horaLlegada ? ' aria-invalid="true" aria-describedby="error-horaLlegada"' : ''}>
      </label>
      ${campoError('horaLlegada')}
      <p class="${clases.nota}">Vacía = ahora (${App.hora(App.engine.state.clock)}). Puedes simular una entrada desde las 06:00; esa hora ordena tu lugar en la fila.</p>
      <label class="${clases.etiqueta}"><span>¿A qué hora es tu clase? (opcional)</span>
        <input type="time" name="horaClase" data-campo="form.horaClase" value="${esc(f.horaClase)}" class="${clases.entrada}"${f.errores.horaClase ? ' aria-invalid="true" aria-describedby="error-horaClase"' : ''}>
      </label>
      ${campoError('horaClase')}
      <label class="flex items-center gap-3 min-h-[44px] text-label-md text-on-surface cursor-pointer">
        <input type="checkbox" class="w-5 h-5 accent-[#1e3a8a]" data-campo="form.valet"${f.valet ? ' checked' : ''}>
        <span>Quiero usar valet</span>
      </label>
    </form>`;
  }

  function tips() {
    return `<section class="bg-surface-container-low rounded-2xl p-space-md flex flex-col gap-space-xs">
      <div class="flex items-center gap-2 text-primary-container">${icono('info', 20)}<h2 class="text-label-md">Cómo se reparten las celdas</h2></div>
      <p class="text-body-lg text-on-surface">${esc(window.ParkEngine.POLITICA_TEXTO)}</p>
    </section>`;
  }

  App.acciones.quitarPreferenciaCelda = () => App.setSub('form', { preferenciaCelda: '' });

  // Tocar una celda libre en el mapa de Inicio permite preferirla (no la reserva).
  App.acciones.preferirCelda = function () {
    const id = App.ui.celdaPreferida;
    if (!id) return;
    App.setSub('form', { preferenciaCelda: id });
    App.toast('ok', 'Celda ' + id + ' agregada como preferencia. No queda reservada.');
  };

  App.pantallas.inicio = function () {
    const r = App.engine.resumen();
    const recomendado = App.ACCESOS.find((a) => r.accesos[a].recomendado) || 'REGIONAL';
    const accesoElegido = App.ui.form.acceso || recomendado;
    const placaValida = Boolean(App.tipoPlaca(App.ui.form.placa));
    const tipo = tipoVista();
    return `<div class="${clases.pantalla}" data-key="p-inicio">
      ${App.tituloPantalla('Disponibilidad de celdas', App.ui.sim.corriendo ? App.chipEnVivo('En vivo') : '', 'Campus EAFIT Medellín')}
      ${ocupacion(tipo)}
      ${selectorTipo(tipo)}
      ${sectores(tipo, r)}
      ${mapaCampus()}
      ${graficoHoras(r)}
      ${tips()}
      ${formulario(accesoElegido)}
      <div class="flex flex-col items-center gap-space-xs">
        <button type="submit" form="form-llegada" class="${clases.primario}"${placaValida ? '' : ' disabled'}>${icono('confirmation_number', 22)}Registrar llegada</button>
        ${placaValida ? '' : `<button type="button" class="min-h-[44px] text-label-md text-primary-container underline" data-accion="irFormulario">Escribe tu placa para continuar</button>`}
      </div>
    </div>`;
  };

  function minutosDe(textoHora) {
    if (!textoHora) return null;
    const [h, m] = textoHora.split(':').map(Number);
    return h * 60 + m;
  }

  function validar(f) {
    const errores = {};
    if (!App.RE_NOMBRE.test(f.nombre.trim())) errores.nombre = 'Escribe tu nombre: de 2 a 40 letras y espacios.';
    const ahora = App.engine.state.clock;
    const llegada = minutosDe(f.horaLlegada);
    if (llegada != null && (llegada < 360 || llegada > ahora)) {
      errores.horaLlegada = `La llegada debe estar entre las 06:00 y las ${App.hora(ahora)}.`;
    }
    const referencia = llegada != null ? llegada : ahora;
    const hora = minutosDe(f.horaClase);
    if (hora != null && hora <= referencia) {
      errores.horaClase = `La clase debe ser después de las ${App.hora(referencia)}.`;
    }
    return errores;
  }

  function mensajeRegistro(v) {
    const p = App.engine.posicion(v.placa);
    const nombre = App.NOMBRE_ACCESO[v.acceso];
    if (v.estado === 'AFUERA') return `Pasarela llena: esperas afuera, ${p.afueraDelante} delante en ${nombre}`;
    return `Registrado en la pasarela ${nombre}, posición ${p.posicionEnPasarela}`;
  }

  App.acciones.elegirTipo = (el) => App.set({ tipoVista: el.dataset.tipo });
  App.acciones.vistaInicio = (el) => App.mapas.vista('inicio', el.dataset.lote);

  App.acciones.irFormulario = function () {
    const campo = document.querySelector('#form-llegada [name="placa"]');
    if (campo) campo.focus();
  };

  App.acciones.elegirAcceso = function (el) {
    App.setSub('form', { acceso: el.dataset.acceso });
  };

  App.acciones.registrar = function () {
    const f = App.ui.form;
    const errores = validar(f);
    if (Object.keys(errores).length) {
      App.setSub('form', { errores });
      requestAnimationFrame(() => {
        const primero = Object.keys(errores)[0];
        const campo = document.querySelector(`#form-llegada [name="${primero}"]`);
        if (campo) campo.focus();
      });
      return;
    }
    const acceso = f.acceso || App.ACCESOS.find((a) => App.engine.resumen().accesos[a].recomendado) || 'REGIONAL';
    const r = App.engine.llegar({
      placa: f.placa,
      conductor: f.nombre.trim(),
      acceso,
      horaLlegada: minutosDe(f.horaLlegada),
      horaClase: minutosDe(f.horaClase),
      valet: f.valet,
      preferencia: (f.preferenciaZona || f.preferenciaCelda)
        ? { zona: f.preferenciaZona || null, celdaId: f.preferenciaCelda || null }
        : null
    });
    if (!App.resultado(r)) return;
    App.toast('ok', mensajeRegistro(r.vehiculo));
    const { placa } = r.vehiculo;
    App.celdaVista = { ...App.celdaVista, [placa]: null };
    const { [placa]: _posicionAnterior, ...maxPosicion } = App.ui.maxPosicion;
    App.set({
      placa,
      fijada: true,
      maxPosicion,
      tab: f.valet ? 'valet' : 'turno',
      form: { ...f, placa: '', nombre: '', horaLlegada: '', horaClase: '', valet: false, preferenciaZona: '', preferenciaCelda: '', errores: {} }
    });
  };
})();
