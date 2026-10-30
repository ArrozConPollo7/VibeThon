// Ruta de valet en 3 pasos (sección 6 de la tarea).
(function () {
  const { esc, icono } = App;
  const PRECIO = '$8.000';
  const PASOS = ['Selección y pago', 'Entrega del vehículo', 'Estacionamiento y llaves'];
  const METODOS = [
    { id: 'TARJETA', texto: 'Tarjeta' },
    { id: 'NEQUI', texto: 'Nequi' },
    { id: 'RECHAZO', texto: 'Simular rechazo' }
  ];
  const ORDEN_VALET = ['ENTREGADO_A_VALET', 'EN_FILA', 'ESTACIONADO', 'LLAVES_EN_CUSTODIA', 'SOLICITADO', 'DEVUELTO'];
  const NO_APLICA = ['CELDA_ASIGNADA', 'EN_RECORRIDO', 'ESTACIONADO', 'SALIO'];

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

  const aviso = `<p class="aviso-valet">El valet no da prioridad: tu carro conserva su turno por hora de llegada. Lo que ganas es tu tiempo para llegar a clase.</p>`;

  function pasoPago() {
    const { metodo } = App.ui.valet;
    return `<section class="tarjeta">
      <h2 class="titulo-seccion">Valet estándar</h2>
      <p class="cifra"><strong>${PRECIO}</strong></p>
      <fieldset class="metodos"><legend>Método de pago</legend>
        ${METODOS.map(
          (m) => `<label class="metodo"><input type="radio" name="metodo" data-campo="valet.metodo" value="${m.id}"${metodo === m.id ? ' checked' : ''}><span>${m.texto}</span></label>`
        ).join('')}
      </fieldset>
      <button type="button" class="boton boton--primario" data-accion="pagarValet">Pagar y reservar</button>
    </section>`;
  }

  function pasoEntrega(v) {
    const { dejeCarro, entregueLlaves } = App.ui.valet;
    const listo = dejeCarro && entregueLlaves;
    return `<section class="tarjeta">
      <h2 class="titulo-seccion">Entrega tu carro</h2>
      <p>${icono('pin')} Bahía de valet del acceso ${App.NOMBRE_ACCESO[v.acceso]}</p>
      ${v.valet.codigo ? `<p class="codigo-valet">${esc(v.valet.codigo)}</p><p class="nota">Dile este código al valet.</p>` : '<p class="nota">Recibes tu código V-XXX al confirmar la entrega.</p>'}
      <label class="casilla"><input type="checkbox" data-campo="valet.dejeCarro"${dejeCarro ? ' checked' : ''}><span>Dejé el carro</span></label>
      <label class="casilla"><input type="checkbox" data-campo="valet.entregueLlaves"${entregueLlaves ? ' checked' : ''}><span>Entregué las llaves</span></label>
      <button type="button" class="boton boton--primario" data-accion="entregarValet"${listo ? '' : ' disabled'}>Confirmar entrega</button>
      ${listo ? '' : '<p class="nota">Disponible cuando marques las dos casillas.</p>'}
    </section>`;
  }

  function pasoCustodia(v) {
    const estado = v.valet.estado;
    const indice = ORDEN_VALET.indexOf(estado);
    const hitos = [
      { texto: 'Recibido', hecho: indice >= 0 },
      { texto: 'En fila', hecho: indice >= 1 },
      { texto: v.celdaId && indice >= 2 ? `Estacionado en ${esc(v.celdaId)}` : 'Estacionado', hecho: indice >= 2 },
      { texto: v.valet.casillero ? `Llaves en casillero ${v.valet.casillero}` : 'Llaves en casillero', hecho: indice >= 3 }
    ];
    const ultimo = hitos.reduce((acum, h, i) => (h.hecho ? i : acum), 0);
    const puedeSolicitar = estado === 'LLAVES_EN_CUSTODIA';
    const nota = {
      SOLICITADO: 'Tu carro viene en camino a la bahía de valet.',
      DEVUELTO: 'Carro devuelto. Gracias por usar valet.'
    }[estado] || 'Disponible cuando tus llaves estén en el casillero.';
    return `<section class="tarjeta">
      <h2 class="titulo-seccion">Sigue tu carro</h2>
      ${v.valet.codigo ? `<p class="codigo-valet">${esc(v.valet.codigo)}</p>` : ''}
      <ol class="linea" aria-label="Estado del valet">
        ${hitos
          .map((h, i) => {
            const clase = i === ultimo ? 'linea-paso--actual' : h.hecho ? 'linea-paso--hecho' : '';
            return `<li class="linea-paso ${clase}">${h.texto}</li>`;
          })
          .join('')}
      </ol>
      <button type="button" class="boton boton--primario" data-accion="solicitarCarro"${puedeSolicitar ? '' : ' disabled'}>Solicitar mi carro</button>
      ${puedeSolicitar ? '' : `<p class="nota">${nota}</p>`}
    </section>`;
  }

  App.pantallas.valet = function () {
    const v = App.conductorActivo();
    const irInicio = '<button type="button" class="boton boton--primario" data-accion="irTab" data-tab="inicio">Ir a Inicio</button>';
    if (!v) {
      return App.pantallas.vacio('Valet opcional', 'Aún no te has registrado. Ve a Inicio y marca "Quiero usar valet".', irInicio);
    }
    if (!v.valet && NO_APLICA.includes(v.estado)) {
      return App.pantallas.vacio('El valet ya no aplica', `${esc(v.placa)} ya tiene celda. El valet se pide antes de recibirla.`, irInicio);
    }
    const paso = pasoActual(v);
    const contenido = paso === 1 ? pasoPago() : paso === 2 ? pasoEntrega(v) : pasoCustodia(v);
    return `<div class="pantalla" data-key="p-valet">
      ${indicador(paso)}
      ${aviso}
      <div data-key="valet-paso-${paso}" class="pantalla--entra">${contenido}</div>
    </div>`;
  };

  const conActivo = (fn) => () => {
    const v = App.conductorActivo();
    if (v) fn(v);
  };

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
    App.resultado(App.engine.valetSolicitarCarro(v.placa), 'Solicitud recibida: tu carro viene en camino');
    App.programarRender();
  });
})();
