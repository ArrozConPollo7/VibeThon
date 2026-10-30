// Armazón: barra superior, vistas, guía de siguiente paso y arranque de la aplicación.
(function () {
  const { esc, icono, placaHTML } = App;
  const VISTAS = [
    { id: 'conductor', texto: 'Conductor' },
    { id: 'valet', texto: 'Valet' },
    { id: 'operacion', texto: 'Portería y operación' },
    { id: 'demo', texto: 'Modo demo' }
  ];
  const TABS = [
    { id: 'inicio', texto: 'Inicio', icono: 'casa' },
    { id: 'turno', texto: 'Mi turno', icono: 'turno' },
    { id: 'valet', texto: 'Valet', icono: 'llave' }
  ];
  const HORA_FIN_GUION = 510;

  function barraSuperior(reloj) {
    return `<header class="barra-sup">
      <div class="marca"><span class="marca-signo" aria-hidden="true">P</span><span>ParkEAFIT</span></div>
      <p class="reloj" aria-label="Hora simulada ${esc(reloj)}">${icono('reloj', 18)}<span>${esc(reloj)}</span></p>
      ${App.ui.sim.corriendo ? '<span class="vivo">En vivo</span>' : ''}
      <nav class="vistas" aria-label="Vistas">
        ${VISTAS.map(
          (v) =>
            `<button type="button" class="vista${App.ui.vista === v.id ? ' vista--activa' : ''}" data-accion="irVista" data-vista="${v.id}"${App.ui.vista === v.id ? ' aria-current="page"' : ''}>${v.texto}</button>`
        ).join('')}
      </nav>
      ${window.ParkEngine.esStub ? '<span class="badge-stub">Motor de prueba</span>' : ''}
      ${App.pantallas.herramientas()}
    </header>`;
  }

  function selectorPlaca() {
    const activo = App.conductorActivo();
    const lista = App.vehiculos()
      .filter((v) => v.estado !== 'SALIO' && v.seq != null)
      .sort((a, b) => b.seq - a.seq);
    const opciones = activo && !lista.includes(activo) ? [activo, ...lista] : lista;
    return `<label class="selector"><span>Ver como</span>
      <select class="entrada" data-accion-cambio="elegirPlaca">
        <option value=""${activo ? '' : ' selected'}>Conductor sin registrar</option>
        ${opciones.map((v) => `<option value="${esc(v.placa)}"${activo && activo.placa === v.placa ? ' selected' : ''}>${esc(v.placa)}</option>`).join('')}
      </select>
    </label>`;
  }

  // Le dice al jurado qué hacer ahora según el estado real del conductor activo.
  function siguientePaso() {
    const v = App.conductorActivo();
    const r = App.engine.resumen();
    if (!v || v.estado === 'SALIO') return 'Registra una llegada en Inicio: llena placa y nombre y pulsa Registrar llegada.';
    if (v.valet && v.valet.estado === 'SELECCIONADO') return 'Abre Valet en el celular y completa el pago.';
    if (v.valet && v.valet.estado === 'PAGADO') return 'Marca las dos casillas en Valet y confirma la entrega.';
    if (v.valet && v.valet.estado === 'LLAVES_EN_CUSTODIA') return 'Pulsa Solicitar mi carro en Valet.';
    if (v.estado === 'AFUERA') return `${v.placa} espera afuera: confirma en portería a los de adelante para abrir cupo.`;
    if (v.estado === 'EN_PASARELA') {
      if (v.saleSinEstacionar) return `${v.placa} sale sin estacionar: confirma en portería a los de adelante.`;
      if (r.libres === 0 && App.engine.state.clock >= HORA_FIN_GUION) return 'Ya no hay más salidas en el guion. Pulsa Reiniciar para volver a las 07:30.';
      return `${v.placa} espera celda: inicia el reloj o pulsa Avanzar 1 min hasta que salga un carro.`;
    }
    if (v.estado === 'CELDA_ASIGNADA') {
      const primero = App.fila(v.acceso)[0];
      if (primero === v) return `${v.placa} ya es el primero: pulsa Verificar placa y reserva con acceso ${App.NOMBRE_ACCESO[v.acceso]}.`;
      if (primero && !primero.celdaId) return `${primero.placa} va adelante y aún no tiene celda: avanza el reloj.`;
      return `Confirma en portería a ${primero.placa}, que va adelante de ${v.placa} en ${App.NOMBRE_ACCESO[v.acceso]}.`;
    }
    if (v.valet) return 'El valet lleva el carro: avanza el reloj y sigue el avance en Valet.';
    if (v.estado === 'EN_RECORRIDO') return 'Pulsa Llegué a mi celda en el celular.';
    return 'Pulsa Salir del parqueadero para liberar la celda.';
  }

  function guia() {
    return `<div class="guia">
      ${selectorPlaca()}
      <p class="guia-paso" aria-live="polite"><b>Siguiente paso:</b> ${esc(siguientePaso())}</p>
    </div>`;
  }

  function celular(tabForzada) {
    const tab = tabForzada || App.ui.tab;
    return `<div class="celular">
      <div class="celular-pantalla" id="celular-pantalla">${App.pantallas[tab]()}</div>
      <nav class="tabs" aria-label="Secciones del conductor">
        ${TABS.map(
          (t) =>
            `<button type="button" class="tab${tab === t.id ? ' tab--activa' : ''}" data-accion="irTab" data-tab="${t.id}"${tab === t.id ? ' aria-current="page"' : ''}>${icono(t.icono, 22)}<span>${t.texto}</span></button>`
        ).join('')}
      </nav>
    </div>`;
  }

  function cuerpo() {
    const { vista } = App.ui;
    if (vista === 'operacion') return `<main class="contenido contenido--panel">${App.pantallas.operacion()}</main>`;
    if (vista === 'demo') {
      return `<main class="contenido">${guia()}<div class="demo">${celular()}<div class="demo-panel">${App.pantallas.operacion()}</div></div></main>`;
    }
    return `<main class="contenido contenido--conductor">${guia()}${celular()}</main>`;
  }

  function bienvenida() {
    if (!App.ui.bienvenida) return '';
    return `<div class="bienvenida" data-key="bienvenida" role="dialog" aria-modal="true" aria-labelledby="titulo-bienvenida">
      <div class="bienvenida-caja">
        <h1 id="titulo-bienvenida">Así funciona ParkEAFIT</h1>
        <ol class="bienvenida-pasos">
          <li>${icono('casa', 28)}<b>Consulta</b><span>Mira las celdas libres y qué acceso te conviene.</span></li>
          <li>${icono('turno', 28)}<b>Registra</b><span>Marca tu llegada y sigue tu lugar en la fila.</span></li>
          <li>${icono('pin', 28)}<b>Recibe celda</b><span>Te guiamos hasta ella, sin importar por dónde entraste.</span></li>
        </ol>
        <button type="button" class="boton boton--primario" id="empezar-demo" data-accion="cerrarBienvenida">Empezar demo</button>
      </div>
    </div>`;
  }

  App.pantallas.shell = function () {
    return `${barraSuperior(App.engine.resumen().reloj)}${cuerpo()}${bienvenida()}`;
  };

  App.pantallas.toasts = function () {
    return App.toasts
      .map(
        (t) => `<div class="toast toast--${t.tipo}" data-key="${t.id}" role="${t.tipo === 'error' ? 'alert' : 'status'}">
          ${icono(t.tipo === 'error' ? 'alerta' : 'check')}
          <p>${esc(t.mensaje)}</p>
          <button type="button" data-accion="cerrarToast" data-id="${t.id}" aria-label="Cerrar aviso">${icono('cerrar', 18)}</button>
        </div>`
      )
      .join('');
  };

  App.acciones.irVista = function (el) {
    const vista = el.dataset.vista;
    App.set({ vista, tab: vista === 'valet' ? 'valet' : App.ui.tab === 'valet' && vista === 'conductor' ? 'inicio' : App.ui.tab });
  };
  App.acciones.irTab = function (el) {
    const tab = el.dataset.tab;
    const vista = App.ui.vista === 'valet' && tab !== 'valet' ? 'conductor' : App.ui.vista === 'conductor' && tab === 'valet' ? 'valet' : App.ui.vista;
    App.set({ tab, vista });
  };
  App.acciones.cerrarBienvenida = function () {
    App.ui = { ...App.ui, bienvenida: false };
    App.render();
    const destino = document.querySelector('.tab--activa');
    if (destino) destino.focus({ preventScroll: true });
  };
  App.acciones.cerrarToast = (el) => App.quitarToast(el.dataset.id);
  App.acciones.elegirPlaca = function (el) {
    const placa = el.value || null;
    if (placa) App.celdaVista = { ...App.celdaVista, [placa]: (App.vehiculo(placa) || {}).celdaId || null };
    App.set({ placa, fijada: true, valet: { ...App.ui.valet, dejeCarro: false, entregueLlaves: false } });
  };

  // Campos controlados: data-campo="rama.nombre" escribe en App.ui sin tocar el motor.
  // Reescribe la máscara sin mover el cursor. Borrar el espacio borra el carácter anterior.
  function formatearPlaca(el, evento, anterior) {
    const previo = App.normalizarPlaca(el.value.slice(0, el.selectionStart)).length;
    const texto = App.normalizarPlaca(el.value);
    const borroEspacio = evento.inputType === 'deleteContentBackward' && texto === anterior && previo > 0;
    const valor = borroEspacio ? texto.slice(0, previo - 1) + texto.slice(previo) : texto;
    const cursor = borroEspacio ? previo - 1 : previo;
    el.value = App.formatoPlaca(valor);
    const posicion = cursor > 3 ? cursor + 1 : cursor;
    el.setSelectionRange(posicion, posicion);
    return valor;
  }

  function actualizarCampo(el, evento) {
    const [rama, nombre] = el.dataset.campo.split('.');
    let valor = el.type === 'checkbox' ? el.checked : el.value;
    if (el.classList.contains('entrada--placa')) valor = formatearPlaca(el, evento, App.ui[rama][nombre]);
    const parche = { [nombre]: valor };
    if (rama === 'form') parche.errores = { ...App.ui.form.errores, [nombre]: undefined };
    if (rama === 'porteria') {
      parche.resultado = null;
      if (nombre === 'placa') parche.editada = true;
      if (nombre === 'acceso') {
        parche.editada = false;
        parche.placa = '';
      }
    }
    App.setSub(rama, parche);
  }

  function escucharEventos() {
    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-accion]');
      if (el && !el.disabled) {
        App.sonido.play('click');
        App.acciones[el.dataset.accion](el);
      }
    });
    document.addEventListener('input', (e) => {
      if (e.target.dataset.campo) actualizarCampo(e.target, e);
    });
    document.addEventListener('change', (e) => {
      const nombre = e.target.dataset.accionCambio;
      if (nombre) App.acciones[nombre](e.target);
    });
    document.addEventListener('submit', (e) => {
      e.preventDefault();
      const nombre = e.target.dataset.formulario;
      if (nombre) App.acciones[nombre]();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && App.ui.bienvenida) App.acciones.cerrarBienvenida();
    });
  }

  function arrancar() {
    try {
      App.engine = window.ParkEngine.crear(window.ParkData);
    } catch (error) {
      console.error('No se pudo crear el motor', error);
      document.getElementById('app').innerHTML =
        '<section class="tarjeta fallo" role="alert"><h1 class="titulo-seccion">No se pudo iniciar ParkEAFIT</h1><p>El motor no aceptó los datos de src/data.js. Revisa esos archivos y recarga la página.</p></section>';
      return;
    }
    App.engine.suscribir(() => {
      App.mapas.sincronizar();
      App.programarRender();
    });
    escucharEventos();
    App.ui = { ...App.ui, bienvenida: true };
    App.render();
    document.getElementById('empezar-demo').focus();
  }

  arrancar();
})();
