// Pantalla Inicio (Stitch: "Disponibilidad de Celdas") con el registro de llegada.
(function () {
  const { esc, icono } = App;
  const SECTORES = {
    CARRO: [
      { zona: 'N', acceso: 'REGIONAL', detalle: 'Acceso Regional' },
      { zona: 'I', acceso: 'LAS_VEGAS', detalle: 'Acceso Las Vegas' }
    ],
    MOTO: [{ zona: 'M', detalle: 'Celdas de moto' }]
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
    return `<section class="tarjeta">
      <div class="ocupacion">
        <div>
          <p class="nota">Ocupación general</p>
          <p class="cifra"><strong>${c.libres}</strong> ${c.libres === 1 ? 'celda libre' : 'celdas libres'}</p>
          <p class="nota">De ${c.total} celdas de ${tipo === 'MOTO' ? 'moto' : 'carro'}</p>
        </div>
        ${App.anillo(ocupadoPct, `Ocupación del ${ocupadoPct} por ciento`, `${ocupadoPct}%`)}
      </div>
      <div class="barra-apilada" role="img" aria-label="${c.libres} libres, ${c.reservadas} reservadas, ${c.ocupadas} ocupadas">
        <span class="seg-libre" style="width:${pct(c.libres)}%"></span>
        <span class="seg-reservada" style="width:${pct(c.reservadas)}%"></span>
        <span class="seg-ocupada" style="width:${pct(c.ocupadas)}%"></span>
      </div>
      <ul class="conteos">
        <li><span class="punto punto--libre"></span>${c.libres} libres</li>
        <li><span class="punto punto--reservada"></span>${c.reservadas} reservadas</li>
        <li><span class="punto punto--ocupada"></span>${c.ocupadas} ocupadas</li>
      </ul>
    </section>`;
  }

  function selectorTipo(tipo) {
    const opcion = (id, texto, ico) =>
      `<button type="button" class="tipo${tipo === id ? ' tipo--activo' : ''}" data-accion="elegirTipo" data-tipo="${id}" aria-pressed="${tipo === id}">${icono(ico, 20)}${texto}</button>`;
    return `<section aria-label="Tipo de vehículo">
      <h2 class="titulo-bloque">Tipo de vehículo</h2>
      <div class="tipos">${opcion('CARRO', 'Automóvil', 'carro')}${opcion('MOTO', 'Moto', 'moto')}</div>
    </section>`;
  }

  function chipsConteo(c) {
    return `<div class="chips">
      <span class="chip chip--libre">${c.libres} libres</span>
      <span class="chip chip--reservada">${c.reservadas} reservadas</span>
      <span class="chip chip--ocupada">${c.ocupadas} ocupadas</span>
    </div>`;
  }

  function sector(s, tipo, r) {
    const c = conteo(celdasDe(tipo, s.zona));
    const datos = s.acceso ? r.accesos[s.acceso] : null;
    const interior = `<span class="sector-cab">
        <span class="sector-icono">${icono(tipo === 'MOTO' ? 'moto' : 'pin', 22)}</span>
        <span class="sector-texto"><b>${esc(App.nombreZona(s.zona))}</b><small>${s.detalle}</small></span>
        ${datos && datos.recomendado ? '<span class="chip chip--marca">Recomendado</span>' : ''}
      </span>
      ${chipsConteo(c)}
      ${
        datos
          ? `<span class="sector-fila">Pasarela <b>${datos.enPasarela}/${datos.capacidad}</b>${datos.enPasarela >= datos.capacidad ? ' (llena)' : ''}, <b>${datos.afuera}</b> afuera, espera <b>${esc(datos.esperaTexto)}</b></span>`
          : ''
      }`;
    if (!s.acceso) return `<div class="tarjeta sector">${interior}</div>`;
    const activo = App.ui.form.acceso === s.acceso;
    return `<button type="button" class="tarjeta sector${activo ? ' sector--activo' : ''}" data-accion="elegirAcceso" data-acceso="${s.acceso}" aria-pressed="${activo}">${interior}</button>`;
  }

  function sectores(tipo, r) {
    const lista = SECTORES[tipo];
    return `<section aria-label="Sectores del campus">
      <div class="bloque-cab"><h2 class="titulo-bloque">Sectores del campus</h2><span class="nota">${lista.length} ${lista.length === 1 ? 'sector' : 'sectores'}</span></div>
      <div class="sectores">${lista.map((s) => sector(s, tipo, r)).join('')}</div>
    </section>`;
  }

  function graficoHoras(r) {
    const horaActual = Math.floor(App.engine.state.clock / 60);
    const datos = App.historico(r.historico);
    const pico = Math.max(...datos.map((d) => d.pct), 1);
    const descripcion = datos.map((d) => `${d.hora}:00 ${d.pct}%`).join(', ');
    return `<section class="tarjeta">
      <h2 class="titulo-seccion">Horas más llenas</h2>
      <div class="horas" role="img" aria-label="Ocupación promedio por hora: ${descripcion}">
        ${datos
          .map(
            (d) => `<div class="hora${d.hora === horaActual ? ' hora--actual' : ''}">
              <span class="hora-barra" style="height:${Math.round((d.pct / pico) * 100)}%"></span>
              <span class="hora-texto">${d.hora % 3 === 0 ? d.hora : ''}</span>
            </div>`
          )
          .join('')}
      </div>
      <p class="nota">La barra azul es la hora actual. Datos simulados.</p>
    </section>`;
  }

  function campoError(nombre) {
    const mensaje = App.ui.form.errores[nombre];
    return mensaje ? `<p class="error-campo" id="error-${nombre}">${esc(mensaje)}</p>` : '';
  }

  function formulario(accesoElegido) {
    const f = App.ui.form;
    const tipo = App.tipoPlaca(f.placa);
    return `<form class="tarjeta formulario" id="form-llegada" data-formulario="registrar" novalidate>
      <h2 class="titulo-seccion">Registra tu llegada</h2>
      <p class="nota">Hazlo al cruzar la línea de entrada.</p>
      <label class="campo"><span>Placa</span>
        <input name="placa" data-campo="form.placa" value="${esc(App.formatoPlaca(f.placa))}" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABC 123" class="entrada entrada--placa" aria-describedby="ayuda-placa"${tipo || !f.placa ? '' : ' aria-invalid="true"'}>
      </label>
      <p class="ayuda-placa" id="ayuda-placa" aria-live="polite">${tipo ? App.chipTipo(tipo) : `<span class="${f.placa ? 'error-campo' : 'nota'}">Carro: ABC123 · Moto: ABC12D</span>`}</p>
      <label class="campo"><span>Nombre</span>
        <input name="nombre" data-campo="form.nombre" value="${esc(f.nombre)}" autocomplete="off" placeholder="Tu nombre" class="entrada"${f.errores.nombre ? ' aria-invalid="true" aria-describedby="error-nombre"' : ''}>
      </label>
      ${campoError('nombre')}
      <label class="campo"><span>Acceso</span>
        <select class="entrada" data-campo="form.acceso">
          ${App.ACCESOS.map((a) => `<option value="${a}"${a === accesoElegido ? ' selected' : ''}>${App.NOMBRE_ACCESO[a]}</option>`).join('')}
        </select>
      </label>
      <label class="campo"><span>¿A qué hora es tu clase? (opcional)</span>
        <input type="time" name="horaClase" data-campo="form.horaClase" value="${esc(f.horaClase)}" class="entrada"${f.errores.horaClase ? ' aria-invalid="true" aria-describedby="error-horaClase"' : ''}>
      </label>
      ${campoError('horaClase')}
      <label class="casilla">
        <input type="checkbox" data-campo="form.valet"${f.valet ? ' checked' : ''}>
        <span>Quiero usar valet</span>
      </label>
    </form>`;
  }

  App.pantallas.inicio = function () {
    const r = App.engine.resumen();
    const recomendado = App.ACCESOS.find((a) => r.accesos[a].recomendado) || 'REGIONAL';
    const accesoElegido = App.ui.form.acceso || recomendado;
    const placaValida = Boolean(App.tipoPlaca(App.ui.form.placa));
    const tipo = tipoVista();
    return `<div class="pantalla" data-key="p-inicio">
      ${App.tituloPantalla('Disponibilidad de celdas', App.ui.sim.corriendo ? '<span class="chip chip--marca">En vivo</span>' : '', 'Campus EAFIT Medellín')}
      ${ocupacion(tipo)}
      ${selectorTipo(tipo)}
      ${sectores(tipo, r)}
      ${graficoHoras(r)}
      ${formulario(accesoElegido)}
    </div>
    <div class="cta-fija">
      <button type="submit" form="form-llegada" class="boton boton--primario"${placaValida ? '' : ' disabled'}>${icono('turno', 20)}Registrar llegada</button>
      ${placaValida ? '' : '<button type="button" class="enlace" data-accion="irFormulario">Escribe tu placa para continuar</button>'}
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
    const hora = minutosDe(f.horaClase);
    if (hora != null && hora <= App.engine.state.clock) {
      errores.horaClase = `La clase debe ser después de las ${App.hora(App.engine.state.clock)}.`;
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
      horaClase: minutosDe(f.horaClase),
      valet: f.valet
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
      form: { ...f, placa: '', nombre: '', horaClase: '', valet: false, errores: {} }
    });
  };
})();
