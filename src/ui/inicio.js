// Pantalla 5.1 del conductor: estado del parqueadero y registro de llegada.
(function () {
  const { esc } = App;

  function ocupacion(r) {
    const libres = r.libresPorTipo;
    return `<section class="tarjeta">
      <h2 class="titulo-seccion">¿Cómo está el parqueadero ahora?</h2>
      <p class="cifra"><strong>${libres.CARRO}</strong> de ${r.totalPorTipo.CARRO} celdas de carro libres</p>
      <p class="libres-moto">${App.icono('moto', 18)}<b>${libres.MOTO}</b> de ${r.totalPorTipo.MOTO} celdas de moto libres</p>
      <div class="barra" role="img" aria-label="Ocupación del ${r.ocupacionPct} por ciento">
        <span style="width:${r.ocupacionPct}%"></span>
      </div>
      <p class="nota">${r.ocupacionPct}% ocupado a las ${esc(r.reloj)}</p>
    </section>`;
  }

  function tarjetaAcceso(acceso, datos) {
    const lleno = datos.enPasarela >= datos.capacidad;
    return `<button type="button" class="acceso${App.ui.form.acceso === acceso ? ' acceso--activo' : ''}" data-accion="elegirAcceso" data-acceso="${acceso}" aria-pressed="${App.ui.form.acceso === acceso}">
      <span class="acceso-nombre">${App.NOMBRE_ACCESO[acceso]}</span>
      ${datos.recomendado ? '<span class="etiqueta-recomendado">Recomendado</span>' : ''}
      <span class="acceso-dato"><b>${datos.enPasarela}/${datos.capacidad}</b> en pasarela${lleno ? ' (llena)' : ''}</span>
      <span class="acceso-dato"><b>${datos.afuera}</b> esperando afuera</span>
      <span class="acceso-dato">Espera: <b>${esc(datos.esperaTexto)}</b></span>
    </button>`;
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
    return `<div class="pantalla" data-key="p-inicio">
      ${ocupacion(r)}
      <div class="accesos">${App.ACCESOS.map((a) => tarjetaAcceso(a, r.accesos[a])).join('')}</div>
      ${graficoHoras(r)}
      ${formulario(accesoElegido)}
    </div>
    <div class="cta-fija">
      <button type="submit" form="form-llegada" class="boton boton--primario"${placaValida ? '' : ' disabled'}>Registrar llegada</button>
      ${placaValida ? '' : '<button type="button" class="enlace" data-accion="irFormulario">Escribe tu placa para continuar</button>'}
    </div>`;
  };

  function validar(f) {
    const errores = {};
    if (!App.RE_NOMBRE.test(f.nombre.trim())) errores.nombre = 'Escribe tu nombre: de 2 a 40 letras y espacios.';
    const hora = minutosDe(f.horaClase);
    if (hora != null && hora <= App.engine.state.clock) {
      errores.horaClase = `La clase debe ser después de las ${App.hora(App.engine.state.clock)}.`;
    }
    return errores;
  }

  function minutosDe(textoHora) {
    if (!textoHora) return null;
    const [h, m] = textoHora.split(':').map(Number);
    return h * 60 + m;
  }

  function mensajeRegistro(v) {
    const p = App.engine.posicion(v.placa);
    const nombre = App.NOMBRE_ACCESO[v.acceso];
    if (v.estado === 'AFUERA') return `Pasarela llena: esperas afuera, ${p.afueraDelante} delante en ${nombre}`;
    return `Registrado en la pasarela ${nombre}, posición ${p.posicionEnPasarela}`;
  }

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
