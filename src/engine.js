/* ParkEAFIT — motor de lógica puro.
   Sin DOM: este archivo no toca document ni window.
   Script clásico: expone window.ParkEngine (o module.exports para las pruebas). */
(function (global) {
  'use strict';

  var POLITICA_TEXTO = 'La celda es para quien registró primero su llegada, sin importar por qué acceso entró. El orden de cada fila siempre se respeta. El valet no da prioridad.';

  var ALPHA_TASA = 0.3;        // suavizado EWMA de la tasa de salidas
  var TASA_MINIMA = 0.05;      // salidas por minuto
  var MINUTOS_CAMINATA = 5;    // de la celda al salón
  var MINUTOS_HASTA_CELDA = 2; // recorrido portería → celda
  var CASILLEROS = 30;
  var MINUTOS_EN_CAMPUS_TRAS_SALIR = 5;   // tras salir, el carro se retira del sistema (ya va por la vía)
  var OPERADORES_VALET = ['Carlos Restrepo', 'Luisa Mejía', 'Andrés Gil'];
  var COMBUSTIBLES = ['vacío', '1/4', '1/2', '3/4', 'lleno'];
  var TARIFA_VALET = 8000;
  var RE_CARRO = /^[A-Z]{3}[0-9]{3}$/;
  var RE_MOTO = /^[A-Z]{3}[0-9]{2}[A-Z]$/;
  var RE_NOMBRE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]{2,40}$/;
  var TIPOS = ['CARRO', 'MOTO'];

  function normalizarPlaca(placa) { return String(placa || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
  function tipoDePlaca(placa) { return RE_CARRO.test(placa) ? 'CARRO' : (RE_MOTO.test(placa) ? 'MOTO' : null); }
  function tasaVacia() { return { ewma: null, ultimaEn: null, muestras: 0 }; }

  var CONDUCTORES = [
    'Ana Gómez', 'Carlos Ruiz', 'Diana Pérez', 'Elena Mora', 'Felipe Ortiz',
    'Gina Salas', 'Hugo Vélez', 'Irene Cano', 'Jorge Mesa', 'Karina Ríos',
    'Luis Pardo', 'Marta Gil', 'Nicolás Rojas', 'Olga Duque', 'Pablo Sierra',
    'Rubén Castro', 'Sara Naranjo', 'Tomás Arango', 'Úrsula Peña', 'Valeria Londoño'
  ];

  function clonar(obj) { return JSON.parse(JSON.stringify(obj)); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function pad3(n) { return n < 10 ? '00' + n : (n < 100 ? '0' + n : '' + n); }
  function redondear1(n) { return Math.round(n * 10) / 10; }

  function horaTexto(min) {
    var m = ((Math.round(min) % 1440) + 1440) % 1440;
    return pad2(Math.floor(m / 60)) + ':' + pad2(m % 60);
  }

  function crear(datos) {
    if (!datos) throw new Error('Faltan los datos de prueba (src/data.js).');

    var datosBase = clonar(datos);
    var state;
    var suscriptores = [];
    var modoDebug = false;
    var rng = null;

    // --- utilidades internas -------------------------------------------
    function capacidad() { return datosBase.capacidadPasarela || 4; }
    function nombresAcceso() { return Object.keys(datosBase.accesos || {}); }
    function filasVacias() {
      var pasarelas = {}, afuera = {};
      nombresAcceso().forEach(function (a) { pasarelas[a] = []; afuera[a] = []; });
      return { pasarelas: pasarelas, afuera: afuera };
    }
    function nombreAcceso(acceso) {
      var a = datosBase.accesos[acceso];
      return a && a.nombre ? a.nombre : acceso;
    }
    function vehiculos() {
      return state.vehiculos;
    }
    function porId(id) {
      for (var i = 0; i < state.vehiculos.length; i++) {
        if (state.vehiculos[i].id === id) return state.vehiculos[i];
      }
      return null;
    }
    function porPlaca(placa) {
      var lista = vehiculos();
      for (var i = 0; i < lista.length; i++) {
        if (lista[i].placa === placa) return lista[i];
      }
      return null;
    }
    function celdaPorId(id) {
      for (var i = 0; i < state.celdas.length; i++) {
        if (state.celdas[i].id === id) return state.celdas[i];
      }
      return null;
    }
    function celdaDe(v) { return v && v.celdaId ? celdaPorId(v.celdaId) : null; }
    function libres(tipo) {
      if (tipo) return libres().filter(function (c) { return (c.tipo || 'CARRO') === tipo; });
      return state.celdas.filter(function (c) { return c.estado === 'LIBRE'; });
    }
    function enPasarela(v) { return state.pasarelas[v.acceso].indexOf(v.id) >= 0; }
    function enAfuera(v) { return state.afuera[v.acceso].indexOf(v.id) >= 0; }

    function pushEvento(tipo, mensaje, datosEvento) {
      state.eventos.push({ t: horaTexto(state.clock), tipo: tipo, mensaje: mensaje, datos: datosEvento || null });
    }
    function notificar() {
      suscriptores.slice().forEach(function (fn) {
        try { fn(state); } catch (e) {
          if (typeof console !== 'undefined' && console.error) console.error('Suscriptor con error:', e);
        }
      });
    }
    function fallo(mensaje) {
      pushEvento('ERROR', mensaje);
      notificar();
      return { ok: false, error: mensaje };
    }

    function iniciarRng(semilla) {
      var a = (semilla || 20261030) >>> 0;
      rng = function () {
        a = (a + 0x6D2B79F5) | 0;
        var t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    // --- estado --------------------------------------------------------
    function reiniciarEstado() {
      var filas = filasVacias();
      state = {
        clock: datosBase.relojInicial,
        celdas: clonar(datosBase.celdas),
        vehiculos: [],
        pasarelas: filas.pasarelas,
        afuera: filas.afuera,
        seq: 0,
        contadorVehiculo: 0,
        contadorValet: 0,
        eventos: [],
        asignaciones: [],
        autoPorteria: false,
        tasaSalidas: { CARRO: tasaVacia(), MOTO: tasaVacia() },
        semilla: datosBase.semilla || 20261030,
        historico: datosBase.historico || { fuente: 'simulado', ocupacion: {}, salidasPorMin: {} }
      };
      iniciarRng(state.semilla);

      (datosBase.vehiculosIniciales || []).forEach(cargarVehiculoInicial);

      // Los `seq` reflejan el orden real de registro de los carros que ya están en fila.
      vehiculos().filter(function (v) { return v.registradoEn != null; })
        .sort(function (a, b) { return (a.registradoEn - b.registradoEn) || (a.id - b.id); })
        .forEach(function (v) { v.seq = ++state.seq; });

      // Estado inicial coherente: quien ya está en la pasarela con celdas libres recibe su reserva.
      asignarCeldas();
    }

    function cargarVehiculoInicial(d) {
      var v = {
        id: ++state.contadorVehiculo,
        placa: d.placa,
        conductor: d.conductor || '—',
        acceso: d.acceso,
        estado: d.estado || 'AFUERA',
        llegadaAfueraEn: d.llegadaAfueraEn != null ? d.llegadaAfueraEn : null,
        registradoEn: d.registradoEn != null ? d.registradoEn : null,
        seq: null,
        saleSinEstacionar: !!d.saleSinEstacionar,
        celdaId: d.celdaId || null,
        valet: d.valet ? clonar(d.valet) : null,
        horaClase: d.horaClase != null ? d.horaClase : null,
        etaCelda: null
      };
      v.tipo = d.tipo || tipoDePlaca(v.placa) || 'CARRO';
      state.vehiculos.push(v);
      if (v.estado === 'EN_PASARELA' || v.estado === 'CELDA_ASIGNADA') {
        state.pasarelas[v.acceso].push(v.id);
      } else if (v.estado === 'AFUERA') {
        state.afuera[v.acceso].push(v.id);
      }
      return v;
    }

    // --- reglas de fila (R1, R2) ---------------------------------------
    function entrarAPasarela(v, horaRegistro) {
      v.estado = 'EN_PASARELA';
      v.registradoEn = horaRegistro != null ? horaRegistro : state.clock;
      v.seq = ++state.seq;
      state.pasarelas[v.acceso].push(v.id);
      pushEvento('REGISTRO', v.placa + ' registró su llegada en ' + nombreAcceso(v.acceso) +
        ' (posición ' + state.pasarelas[v.acceso].length + ' de ' + capacidad() + ').',
        { placa: v.placa, acceso: v.acceso, registradoEn: v.registradoEn, seq: v.seq });
    }

    function registrarEnFila(v, horaRegistro) {
      if (state.pasarelas[v.acceso].length < capacidad()) {
        entrarAPasarela(v, horaRegistro);
      } else {
        state.afuera[v.acceso].push(v.id);
        pushEvento('LLEGADA_AFUERA', v.placa + ' espera afuera en ' + nombreAcceso(v.acceso) +
          ' (pasarela llena, ' + state.afuera[v.acceso].length + ' en la cola externa).',
          { placa: v.placa, acceso: v.acceso, posicion: state.afuera[v.acceso].length });
      }
    }

    function promoverAfuera(acceso) {
      while (state.pasarelas[acceso].length < capacidad() && state.afuera[acceso].length) {
        var id = state.afuera[acceso].shift();
        var v = porId(id);
        if (!v) continue;
        // Conserva la hora real de llegada al acceso (importante si se simuló una entrada anterior).
        entrarAPasarela(v, v.llegadaAfueraEn != null ? v.llegadaAfueraEn : state.clock);
      }
    }

    // --- reparto de celdas (R3, R4, R5, R6) ----------------------------
    function masCercana(v, disponibles) {
      var porteria = datosBase.accesos[v.acceso].porteria;
      var mejor = null;
      var mejorDist = Infinity;
      disponibles.forEach(function (c) {
        var d = Math.sqrt(Math.pow(c.x - porteria.x, 2) + Math.pow(c.y - porteria.y, 2));
        if (d < mejorDist - 1e-9 || (Math.abs(d - mejorDist) <= 1e-9 && mejor && c.id < mejor.id)) {
          mejor = c;
          mejorDist = d;
        }
      });
      return mejor;
    }

    // R4 + preferencia: la preferencia NO cambia el orden de la fila (eso lo decide asignarCeldas);
    // solo cambia cuál celda libre recibe quien ya tiene el turno.
    function elegirCelda(v, disponibles) {
      var pref = v.preferencia || null;
      v.preferenciaCumplida = 'no';
      if (pref && pref.celdaId) {
        var exacta = disponibles.filter(function (c) { return c.id === pref.celdaId; })[0];
        if (exacta) { v.preferenciaCumplida = 'celda'; return exacta; }
      }
      if (pref && pref.zona) {
        var deZona = disponibles.filter(function (c) { return c.zona === pref.zona; });
        if (deZona.length) { v.preferenciaCumplida = 'zona'; return masCercana(v, deZona); }
      }
      return masCercana(v, disponibles);
    }

    function reservarCelda(v, celda) {
      celda.estado = 'RESERVADA';
      celda.placa = v.placa;
      v.celdaId = celda.id;
      v.estado = 'CELDA_ASIGNADA';
      state.asignaciones.push({
        placa: v.placa,
        acceso: v.acceso,
        t: state.clock,
        registradoEn: v.registradoEn,
        esperaMin: state.clock - v.registradoEn
      });
      pushEvento('CELDA_RESERVADA', 'Celda ' + celda.id + ' reservada para ' + v.placa +
        ' (' + nombreAcceso(v.acceso) + ').',
        { placa: v.placa, celda: celda.id, acceso: v.acceso });
      notificar();
    }

    function liberarCelda(v) {
      var celda = celdaDe(v);
      if (celda) {
        celda.estado = 'LIBRE';
        celda.placa = null;
      }
      v.celdaId = null;
      return celda;
    }

    function asignarCeldas() {
      var total = 0;
      for (;;) {
        var candidatos = vehiculos().filter(function (v) {
          return v.estado === 'EN_PASARELA' && !v.celdaId && !v.saleSinEstacionar;
        }).sort(function (a, b) {
          return (a.registradoEn - b.registradoEn) || (a.seq - b.seq);
        });
        // FIFO global dentro de cada tipo: el primero (por hora de registro) que tenga
        // celdas libres de su tipo recibe la suya; una moto sin celda no frena a un carro.
        var elegido = null, disponibles = null;
        for (var i = 0; i < candidatos.length; i++) {
          var d = libres(candidatos[i].tipo || 'CARRO');
          if (d.length) { elegido = candidatos[i]; disponibles = d; break; }
        }
        if (!elegido) break;
        reservarCelda(elegido, elegirCelda(elegido, disponibles));
        total++;
      }
      return total;
    }

    // --- cola global de quienes necesitan celda -----------------------
    function necesitanCeldaGlobal(tipo) {
      var registrados = [];
      var afuera = [];
      vehiculos().forEach(function (v) {
        if (v.saleSinEstacionar) return;
        if (tipo && (v.tipo || 'CARRO') !== tipo) return;
        if (v.estado === 'EN_PASARELA' && !v.celdaId) registrados.push(v);
        else if (v.estado === 'AFUERA' && enAfuera(v)) afuera.push(v);
      });
      registrados.sort(function (a, b) { return (a.registradoEn - b.registradoEn) || (a.seq - b.seq); });
      afuera.sort(function (a, b) {
        return ((a.llegadaAfueraEn || 0) - (b.llegadaAfueraEn || 0)) || (a.id - b.id);
      });
      return registrados.concat(afuera);
    }

    function posicionGlobalCelda(v) {
      var idx = necesitanCeldaGlobal(v.tipo || 'CARRO').indexOf(v);
      return idx < 0 ? null : idx + 1;
    }

    // --- tasa de salidas (EWMA) ---------------------------------------
    function historicoSalidas(hora) {
      var h = state.historico || {};
      if (Array.isArray(h)) {
        var fila = null;
        h.forEach(function (f) { if (f.hora === hora) fila = f; });
        return fila ? fila.salidasPorMin : null;
      }
      return h.salidasPorMin && h.salidasPorMin[hora] != null ? h.salidasPorMin[hora] : null;
    }

    function tasaSalidasPorMin(tipo) {
      tipo = tipo || 'CARRO';
      var t = state.tasaSalidas[tipo] || tasaVacia();
      var tasa = t.ewma;
      if (tasa == null) {
        var base = historicoSalidas(Math.floor(state.clock / 60));
        tasa = base != null ? base : 0.1;
        if (tipo === 'MOTO') tasa = tasa * 0.25;   // hay 4 veces menos celdas de moto
      }
      return Math.max(TASA_MINIMA, tasa);
    }

    function registrarSalidaTasa(tipo) {
      var t = state.tasaSalidas[tipo || 'CARRO'];
      if (!t) t = state.tasaSalidas[tipo || 'CARRO'] = tasaVacia();
      if (t.ultimaEn != null && state.clock > t.ultimaEn) {
        var brecha = state.clock - t.ultimaEn;
        var muestra = 1 / brecha;              // salidas por minuto observadas
        t.ewma = t.ewma == null ? muestra : ALPHA_TASA * muestra + (1 - ALPHA_TASA) * t.ewma;
        t.muestras++;
      }
      t.ultimaEn = state.clock;
    }

    function estimarParaK(k, tipo) {
      tipo = tipo || 'CARRO';
      var L = libres(tipo).length;
      if (k <= L) return { minMin: 0, maxMin: 1, texto: 'Celda inmediata' };
      var faltan = k - L;
      var tasa = tasaSalidasPorMin(tipo);
      var t = faltan / tasa;
      var minMin = Math.floor(t * 0.8);
      var maxMin = Math.ceil(t * 1.3);
      if (maxMin <= minMin) maxMin = minMin + 1;
      return { minMin: minMin, maxMin: maxMin, texto: minMin + '\u2013' + maxMin + ' min' };
    }

    // --- acciones públicas -------------------------------------------
    function llegar(opciones) {
      opciones = opciones || {};
      var placa = normalizarPlaca(opciones.placa);
      var acceso = opciones.acceso;
      var tipo = tipoDePlaca(placa);

      if (!placa) return fallo('La placa es obligatoria.');
      if (!tipo) return fallo('Placa inválida. Carro: ABC123 · Moto: ABC12D.');
      if (!state.pasarelas[acceso]) {
        return fallo('Acceso desconocido. Elige uno de los seis accesos del campus.');
      }
      // Hora de llegada simulada: permite registrar una entrada anterior (por ejemplo 06:00)
      // sin mover el reloj. Se usa como hora de registro para el orden FIFO.
      var horaLlegada = opciones.horaLlegada;
      if (horaLlegada != null && horaLlegada !== '') {
        horaLlegada = Number(horaLlegada);
        if (!(horaLlegada >= 360 && horaLlegada <= state.clock)) {
          return fallo('La hora de llegada debe estar entre 06:00 y la hora actual (' + horaTexto(state.clock) + ').');
        }
      } else {
        horaLlegada = state.clock;
      }
      var conductor = String(opciones.conductor == null ? '' : opciones.conductor).trim().replace(/\s+/g, ' ');
      if (conductor && !RE_NOMBRE.test(conductor)) {
        return fallo('Nombre inválido: usa solo letras y espacios (2 a 40 caracteres).');
      }
      var horaClase = opciones.horaClase;
      if (horaClase != null && horaClase !== '') {
        horaClase = Number(horaClase);
        if (!(horaClase >= 360 && horaClase <= 1320)) return fallo('La hora de clase debe estar entre 06:00 y 22:00.');
        if (horaClase <= horaLlegada) {
          return fallo('La hora de clase debe ser posterior a tu hora de llegada (' + horaTexto(horaLlegada) + ').');
        }
      } else {
        horaClase = null;
      }
      var existente = porPlaca(placa);
      if (existente && existente.estado !== 'SALIO') {
        return fallo('La placa ' + placa + ' ya está en el sistema.');
      }

      // Preferencia de parqueadero/celda: no da prioridad, solo elige mejor cuando llega el turno.
      var preferencia = null;
      if (opciones.preferencia) {
        var pZona = opciones.preferencia.zona || null;
        var pCelda = opciones.preferencia.celdaId || null;
        if (pZona && !datosBase.zonas[pZona]) return fallo('Parqueadero preferido inválido.');
        if (pCelda) {
          var celdaPref = celdaPorId(pCelda);
          if (!celdaPref) return fallo('La celda preferida ' + pCelda + ' no existe.');
          if (celdaPref.tipo && celdaPref.tipo !== tipo) return fallo('La celda ' + pCelda + ' no es de tu tipo de vehículo.');
          pZona = pZona || celdaPref.zona;
        }
        preferencia = { zona: pZona, celdaId: pCelda };
      }

      var v = {
        id: ++state.contadorVehiculo,
        placa: placa,
        conductor: conductor || 'Conductor',
        tipo: tipo,
        acceso: acceso,
        estado: 'AFUERA',
        llegadaAfueraEn: horaLlegada,
        registradoEn: null,
        seq: null,
        saleSinEstacionar: !!opciones.saleSinEstacionar,
        celdaId: null,
        valet: opciones.valet ? { codigo: null, estado: 'SELECCIONADO', casillero: null, pagado: false } : null,
        horaClase: horaClase,
        preferencia: preferencia,
        preferenciaCumplida: null,
        etaCelda: null
      };
      state.vehiculos.push(v);

      pushEvento('LLEGADA_AFUERA', placa + ' llegó por ' + nombreAcceso(acceso) +
        (horaLlegada < state.clock ? ' a las ' + horaTexto(horaLlegada) : '') + '.',
        { placa: placa, acceso: acceso, horaLlegada: horaLlegada });

      if (opciones.valetPendiente) {
        // Vehículo de valet que todavía no se entrega: no entra a la fila.
        pushEvento('VALET_SELECCIONADO', placa + ' inició el servicio de valet (aún sin entrar a la fila).',
          { placa: placa });
      } else {
        registrarEnFila(v, horaLlegada);
      }

      asignarCeldas();
      notificar();
      return { ok: true, vehiculo: v };
    }

    function marcarSaleSinEstacionar(placa, valor) {
      var v = porPlaca(placa);
      if (!v) return fallo('Placa no registrada: ' + placa + '.');
      if (v.estado === 'SALIO') return fallo('El vehículo ' + placa + ' ya salió.');
      if (v.estado === 'ESTACIONADO' || v.estado === 'EN_RECORRIDO') {
        return fallo('Solo se puede marcar antes de estacionar.');
      }
      v.saleSinEstacionar = !!valor;
      if (v.saleSinEstacionar && v.celdaId) {
        var liberada = liberarCelda(v);
        if (v.estado === 'CELDA_ASIGNADA') v.estado = 'EN_PASARELA';
        pushEvento('SALE_SIN_ESTACIONAR', placa + ' ya no necesita celda; se libera ' + liberada.id + '.',
          { placa: placa, celda: liberada.id });
      } else {
        pushEvento('SALE_SIN_ESTACIONAR', placa + (v.saleSinEstacionar
          ? ' saldrá sin estacionar; conserva su lugar en la fila.'
          : ' sí necesita celda.'), { placa: placa });
      }
      asignarCeldas();
      notificar();
      return { ok: true };
    }

    function confirmarPorteria(acceso, placa) {
      var v = porPlaca(placa);
      if (!v || v.acceso !== acceso || !(v.estado === 'EN_PASARELA' || v.estado === 'CELDA_ASIGNADA')) {
        pushEvento('PORTERIA_ERROR', 'Placa ' + placa + ' no registrada en la pasarela ' + nombreAcceso(acceso) + '.',
          { placa: placa, acceso: acceso });
        notificar();
        return { ok: false, error: 'Placa no registrada en esta pasarela.' };
      }
      var primeroId = state.pasarelas[acceso][0];
      if (primeroId !== v.id) {
        pushEvento('PORTERIA_ERROR', 'La placa ' + placa + ' no es la primera de la fila de ' + nombreAcceso(acceso) + '.',
          { placa: placa, acceso: acceso });
        notificar();
        return { ok: false, error: 'Este vehículo aún no es el primero de la fila.' };
      }
      if (!v.celdaId) {
        pushEvento('PORTERIA_ERROR', 'La placa ' + placa + ' no tiene celda asignada todavía.', { placa: placa });
        notificar();
        return { ok: false, error: 'Aún no tiene celda asignada. Debe esperar.' };
      }

      var celda = celdaDe(v);
      state.pasarelas[acceso].splice(0, 1);
      v.estado = 'EN_RECORRIDO';
      v.etaCelda = state.clock + MINUTOS_HASTA_CELDA;
      pushEvento('PORTERIA_OK', 'Portería ' + nombreAcceso(acceso) + ' confirmó ' + placa +
        '; va a la celda ' + v.celdaId + '.',
        { placa: placa, celda: v.celdaId, acceso: acceso });

      promoverAfuera(acceso);
      asignarCeldas();
      notificar();
      return { ok: true, celda: clonar(celda), ruta: ruta(placa) };
    }

    function estacionar(placa) {
      var v = porPlaca(placa);
      if (!v) return fallo('Placa no registrada: ' + placa + '.');
      if (v.estado !== 'EN_RECORRIDO') {
        return fallo('El vehículo ' + placa + ' no está en recorrido hacia su celda.');
      }
      var celda = celdaDe(v);
      if (!celda) return fallo('El vehículo ' + placa + ' no tiene una celda válida asignada.');

      celda.estado = 'OCUPADA';
      v.estado = 'ESTACIONADO';
      v.etaCelda = null;
      pushEvento('ESTACIONADO', placa + ' estacionado en la celda ' + celda.id + '.',
        { placa: placa, celda: celda.id });

      if (v.valet) {
        if (v.valet.estado === 'EN_FILA' || v.valet.estado === 'ENTREGADO_A_VALET') {
          v.valet.estado = 'ESTACIONADO';
          var casillero = casilleroLibre();
          if (casillero) {
            v.valet.casillero = casillero;
            v.valet.estado = 'LLAVES_EN_CUSTODIA';
            pushEvento('VALET_LLAVES', 'Llaves de ' + placa + ' en custodia en el casillero ' + casillero + '.',
              { placa: placa, casillero: casillero });
          }
        }
      }

      asignarCeldas();
      notificar();
      return { ok: true, celda: clonar(celda) };
    }

    function salir(placa) {
      var v = porPlaca(placa);
      if (!v) return fallo('Placa no registrada: ' + placa + '.');
      if (v.estado === 'SALIO') return fallo('El vehículo ' + placa + ' ya salió.');

      var acceso = v.acceso;

      if (v.estado === 'AFUERA') {
        return fallo('El vehículo ' + placa + ' aún no ha cruzado la línea de registro.');
      }

      if (v.estado === 'EN_PASARELA' || v.estado === 'CELDA_ASIGNADA') {
        if (!v.saleSinEstacionar) {
          return fallo('El vehículo ' + placa + ' no puede salir sin estacionar: marca "sale sin estacionar".');
        }
        if (state.pasarelas[acceso][0] !== v.id) {
          return fallo('Solo el primer vehículo de la pasarela puede salir.');
        }
        state.pasarelas[acceso].splice(0, 1);
        v.estado = 'SALIO';
        v.salioEn = state.clock;
        pushEvento('SALE_SIN_ESTACIONAR', placa + ' salió sin estacionar desde ' + nombreAcceso(acceso) + '.',
          { placa: placa, acceso: acceso });
        promoverAfuera(acceso);
        asignarCeldas();
        notificar();
        return { ok: true };
      }

      if (v.estado === 'EN_RECORRIDO') {
        return fallo('El vehículo ' + placa + ' está en recorrido hacia su celda; no puede salir.');
      }

      var celda = liberarCelda(v);
      v.estado = 'SALIO';
      v.salioEn = state.clock;
      registrarSalidaTasa(v.tipo || 'CARRO');
      pushEvento('SALIDA', placa + ' salió; ' + (celda ? 'celda ' + celda.id + ' libre.' : 'sin celda asociada.'),
        { placa: placa, celda: celda ? celda.id : null });
      if (v.valet && v.valet.casillero) v.valet.casillero = null;
      if (v.valet && v.valet.estado === 'SOLICITADO') v.valet.estado = 'DEVUELTO';

      asignarCeldas();
      notificar();
      return { ok: true };
    }

    // --- retiro de carros que ya salieron del campus -------------------
    function salidos() {
      return vehiculos().filter(function (v) { return v.estado === 'SALIO'; });
    }

    // Manual (panel de operación): retira del sistema todos los que ya salieron.
    function retirarSalidos() {
      var antes = vehiculos().length;
      state.vehiculos = vehiculos().filter(function (v) { return v.estado !== 'SALIO'; });
      var retirados = antes - state.vehiculos.length;
      if (retirados) {
        pushEvento('SALIDA_CAMPUS', retirados + ' vehículo(s) retirado(s) del sistema: ya salieron del campus.',
          { retirados: retirados });
        notificar();
      }
      return { ok: true, retirados: retirados, enSistema: state.vehiculos.length };
    }

    // Automático (reloj): los que salieron hace 5 min o más ya van por la vía y no se muestran.
    function purgarSalidos() {
      var retirados = 0;
      state.vehiculos = vehiculos().filter(function (v) {
        if (v.estado !== 'SALIO') return true;
        var desde = v.salioEn != null ? v.salioEn : 0;
        if (state.clock - desde < MINUTOS_EN_CAMPUS_TRAS_SALIR) return true;
        retirados++;
        return false;
      });
      if (retirados) {
        pushEvento('SALIDA_CAMPUS', retirados + ' vehículo(s) salieron del campus y se retiraron del sistema.',
          { retirados: retirados });
      }
      return retirados;
    }

    // --- cálculos para la interfaz ------------------------------------
    function posicion(placa) {
      var v = porPlaca(placa);
      if (!v) return null;
      var fila = state.pasarelas[v.acceso];
      var cola = state.afuera[v.acceso];
      var res = {
        acceso: v.acceso,
        estado: v.estado,
        posicionEnPasarela: null,
        delante: null,
        detras: null,
        afueraDelante: null,
        posicionGlobalCelda: posicionGlobalCelda(v)
      };

      var idx = fila.indexOf(v.id);
      if (idx >= 0) {
        res.posicionEnPasarela = idx + 1;
        res.delante = idx;
        res.detras = fila.length - 1 - idx;
      } else {
        var ia = cola.indexOf(v.id);
        if (ia >= 0) {
          res.afueraDelante = ia;
          res.delante = ia + fila.length;
          res.detras = cola.length - 1 - ia;
        }
      }
      return res;
    }

    function estimarEspera(placa) {
      var v = porPlaca(placa);
      if (!v) return { error: 'Placa no registrada: ' + placa + '.' };
      if (v.saleSinEstacionar) return { minMin: null, maxMin: null, texto: 'No necesitas celda' };
      if (v.estado === 'ESTACIONADO') return { minMin: 0, maxMin: 0, texto: 'Ya estás estacionado' };

      var k = posicionGlobalCelda(v);
      if (k == null) return { minMin: null, maxMin: null, texto: 'Sin estimación disponible' };

      var est = estimarParaK(k, v.tipo || 'CARRO');
      est.k = k;
      est.tipo = v.tipo || 'CARRO';
      est.libres = libres(est.tipo).length;
      est.tasa = redondear1(tasaSalidasPorMin(est.tipo));
      return est;
    }

    function llegoAClase(placa) {
      var v = porPlaca(placa);
      if (!v) return { error: 'Placa no registrada: ' + placa + '.' };
      if (v.horaClase == null) {
        return { aTiempo: null, margenMin: null, sugerirValet: false, texto: 'Sin hora de clase registrada' };
      }
      var est = estimarEspera(placa);
      var maxMin = est.maxMin != null ? est.maxMin : 0;
      var llegada = state.clock + maxMin + MINUTOS_CAMINATA;
      var margen = v.horaClase - llegada;
      return {
        aTiempo: margen >= 0,
        margenMin: margen,
        sugerirValet: margen < 0,
        texto: margen >= 0
          ? 'Llegas ' + margen + ' min antes de clase.'
          : 'Llegas ' + Math.abs(margen) + ' min tarde. El valet te puede ayudar.'
      };
    }

    function ruta(placa) {
      var v = porPlaca(placa);
      if (!v) return null;
      var acceso = datosBase.accesos[v.acceso];
      var porteria = acceso.porteria;
      var puntos = [{ x: acceso.x, y: acceso.y }];
      if (porteria.x !== acceso.x || porteria.y !== acceso.y) puntos.push({ x: porteria.x, y: porteria.y });
      var pasos = ['Avanza a la portería ' + acceso.nombre + '.'];

      var celda = celdaDe(v);
      if (!celda) {
        pasos.push('Espera tu celda en la pasarela.');
        return { puntos: puntos, pasos: pasos, lote: null };
      }

      var zona = datosBase.zonas[celda.zona] || { nombre: 'Zona ' + celda.zona };
      var mismoLote = acceso.lote ? acceso.lote === celda.zona : true;
      // Recorrido aproximado: de la portería se baja por la vía interna (eje x de la portería)
      // hasta la altura de la celda y luego se entra al parqueadero.
      puntos.push({ x: porteria.x, y: celda.y });
      puntos.push({ x: celda.x, y: celda.y });
      pasos.push(mismoLote
        ? 'Entra al ' + zona.nombre + '.'
        : 'Sigue por la vía interna hasta el ' + zona.nombre + '.');
      pasos.push('Busca la celda ' + celda.id + (celda.orden ? ' (n.º ' + celda.orden + ' desde la entrada)' : '') + '.');
      return { puntos: puntos, pasos: pasos, lote: celda.zona };
    }

    function resumen() {
      var lista = necesitanCeldaGlobal('CARRO');
      // Solo cuentan las celdas asignables (carro y moto); PMR/ECO se informan aparte.
      var L = libres('CARRO').length + libres('MOTO').length;
      var accesos = {};
      var justicia = {};
      var nombres = Object.keys(state.pasarelas);
      var mejor = null;

      nombres.forEach(function (nombre) {
        var afuera = state.afuera[nombre].length;
        // Estimación para un carro nuevo: registrados que necesitan celda + los que
        // esperan afuera en ese acceso + él mismo.
        var registradosQueNecesitan = lista.filter(function (v) { return v.estado === 'EN_PASARELA'; }).length;
        var k = registradosQueNecesitan + 1 + afuera;
        var est = estimarParaK(k, 'CARRO');

        accesos[nombre] = {
          enPasarela: state.pasarelas[nombre].length,
          capacidad: capacidad(),
          afuera: afuera,
          esperaTexto: est.texto,
          esperaMin: est.minMin,
          esperaMax: est.maxMin,
          recomendado: false
        };
        if (!mejor || est.maxMin < mejor.maxMin ||
            (est.maxMin === mejor.maxMin && est.minMin < mejor.minMin)) {
          mejor = { nombre: nombre, minMin: est.minMin, maxMin: est.maxMin };
        }

        var regs = state.asignaciones.filter(function (a) { return a.acceso === nombre; });
        var suma = regs.reduce(function (s, a) { return s + a.esperaMin; }, 0);
        justicia[nombre] = {
          asignadas: regs.length,
          esperaPromedioMin: regs.length ? redondear1(suma / regs.length) : 0
        };
      });
      if (mejor) accesos[mejor.nombre].recomendado = true;

      var total = state.celdas.filter(function (c) {
        var t = c.tipo || 'CARRO'; return t === 'CARRO' || t === 'MOTO';
      }).length;
      return {
        reloj: horaTexto(state.clock),
        libres: L,
        total: total,
        ocupacionPct: total ? Math.round(((total - L) / total) * 100) : 0,
        libresPorTipo: { CARRO: libres('CARRO').length, MOTO: libres('MOTO').length },
        totalPorTipo: {
          CARRO: state.celdas.filter(function (c) { return (c.tipo || 'CARRO') === 'CARRO'; }).length,
          MOTO: state.celdas.filter(function (c) { return c.tipo === 'MOTO'; }).length
        },
        accesos: accesos,
        justicia: justicia,
        historico: clonar(state.historico)
      };
    }

    // --- valet ---------------------------------------------------------
    function cuatroDigitos() {
      return String(Math.floor(rng() * 9000) + 1000);
    }

    function valetAceptar(placa, operador) {
      var v = porPlaca(placa);
      if (!v) return fallo('Placa no registrada: ' + placa + '.');
      if (!v.valet) return fallo('La placa ' + placa + ' no tiene servicio de valet.');
      if (operador && OPERADORES_VALET.indexOf(operador) < 0) return fallo('Operador desconocido.');
      if (v.valet.estado === 'ACEPTADO' || v.valet.estado === 'ENTREGADO_A_VALET' || v.valet.estado === 'EN_FILA') {
        return fallo('Ese servicio ya fue aceptado por ' + (v.valet.operador || 'otro operador') + '.');
      }
      if (v.valet.estado !== 'PAGADO') return fallo('Todavía no se puede aceptar (estado ' + v.valet.estado + ').');
      v.valet.estado = 'ACEPTADO';
      v.valet.operador = operador || v.valet.operador || OPERADORES_VALET[0];
      v.valet.aceptadoEn = state.clock;
      pushEvento('VALET_ACEPTADO', v.valet.operador + ' aceptó el servicio de ' + placa + '.',
        { placa: placa, operador: v.valet.operador });
      notificar();
      return { ok: true, valet: clonar(v.valet) };
    }

    function valetRegistrarUbicacion(placa, datos) {
      datos = datos || {};
      var v = porPlaca(placa);
      if (!v) return fallo('Placa no registrada: ' + placa + '.');
      if (!v.valet) return fallo('La placa ' + placa + ' no tiene servicio de valet.');
      if (v.estado !== 'ESTACIONADO') return fallo('Solo se registra la ubicación cuando el carro ya está estacionado.');
      var nota = String(datos.nota == null ? '' : datos.nota).trim();
      if (nota.length > 140) return fallo('La nota no puede pasar de 140 caracteres.');
      var celda = celdaDe(v);
      v.valet.ubicacion = {
        celdaId: v.celdaId,
        zona: celda ? celda.zona : null,
        nombreZona: celda && datosBase.zonas[celda.zona] ? datosBase.zonas[celda.zona].nombre : null,
        casillero: v.valet.casillero || null,
        nota: nota,
        hora: state.clock
      };
      pushEvento('VALET_UBICACION', 'Ubicación de ' + placa + ' registrada: ' + v.celdaId +
        (v.valet.casillero ? ', llaves en caja ' + v.valet.casillero : '') + (nota ? ' — ' + nota : '') + '.',
        { placa: placa, celda: v.celdaId, casillero: v.valet.casillero });
      notificar();
      return { ok: true, ubicacion: clonar(v.valet.ubicacion) };
    }

    function valetInspeccionar(placa, datos) {
      datos = datos || {};
      var v = porPlaca(placa);
      if (!v) return fallo('Placa no registrada: ' + placa + '.');
      if (!v.valet) return fallo('La placa ' + placa + ' no tiene servicio de valet.');
      if (['ENTREGADO_A_VALET', 'EN_FILA', 'ESTACIONADO', 'LLAVES_EN_CUSTODIA'].indexOf(v.valet.estado) < 0) {
        return fallo('Solo se inspecciona desde que recibes el vehículo (estado ' + v.valet.estado + ').');
      }
      var combustible = String(datos.combustible == null ? '' : datos.combustible).trim();
      if (COMBUSTIBLES.indexOf(combustible) < 0) {
        return fallo('Combustible inválido: usa ' + COMBUSTIBLES.join(', ') + '.');
      }
      var km = Number(datos.km);
      if (!isFinite(km) || km < 0) {
        return fallo('Los kilómetros deben ser un número mayor o igual a 0.');
      }
      var novedades = String(datos.novedades == null ? '' : datos.novedades).trim();
      if (novedades.length > 140) {
        return fallo('Las novedades no pueden pasar de 140 caracteres.');
      }
      var VISTAS_FOTO = ['Frontal', 'Trasera', 'Lat. izq.', 'Lat. der.', 'Tablero'];
      var fotos = datos.fotos == null ? [] : datos.fotos;
      if (!Array.isArray(fotos)) return fallo('Las fotos deben ser un arreglo de hasta 4 imágenes.');
      if (fotos.length > 4) return fallo('Máximo 4 fotos por inspección.');
      for (var i = 0; i < fotos.length; i++) {
        var f = fotos[i] || {};
        if (VISTAS_FOTO.indexOf(f.vista) < 0) return fallo('Foto ' + (i + 1) + ': vista inválida (usa ' + VISTAS_FOTO.join(', ') + ').');
        if (typeof f.dataUrl !== 'string' || f.dataUrl.indexOf('data:image/') !== 0) {
          return fallo('Foto ' + (i + 1) + ': la imagen debe venir como dataUrl.');
        }
        if (f.dataUrl.length > 300000) return fallo('Foto ' + (i + 1) + ': supera el tamaño permitido (300 KB).');
      }
      v.valet.inspeccion = {
        hora: state.clock,
        combustible: combustible,
        km: km,
        novedades: novedades,
        fotos: clonar(fotos)
      };
      pushEvento('VALET_INSPECCION', 'Inspección de ' + placa + ' registrada: ' + combustible + ', ' + km + ' km' +
        (novedades ? ', novedades: ' + novedades : ', sin novedades') + ' (' + fotos.length + '/4 fotos).',
        { placa: placa, combustible: combustible, km: km, fotos: fotos.length });
      notificar();
      return { ok: true, inspeccion: clonar(v.valet.inspeccion) };
    }

    function valetEntregarCliente(placa, pin) {
      var v = porPlaca(placa);
      if (!v) return fallo('Placa no registrada: ' + placa + '.');
      if (!v.valet) return fallo('La placa ' + placa + ' no tiene servicio de valet.');
      if (v.valet.estado !== 'LISTO_EN_BAHIA') {
        return fallo('El vehículo todavía no está listo en bahía (estado ' + v.valet.estado + ').');
      }
      if (String(pin == null ? '' : pin).trim() !== String(v.valet.pin)) {
        return fallo('PIN incorrecto. Pídele al estudiante el código de 4 dígitos.');
      }
      valetDevolver(placa);
      v.valet.estado = 'DEVUELTO';
      pushEvento('VALET_ENTREGADO_CLIENTE', 'Vehículo ' + placa + ' entregado al estudiante con PIN correcto.',
        { placa: placa });
      notificar();
      return { ok: true };
    }

    function valetListar() {
      var orden = ['PAGADO', 'ACEPTADO', 'ENTREGADO_A_VALET', 'EN_FILA', 'EN_RECORRIDO', 'ESTACIONADO',
        'LLAVES_EN_CUSTODIA', 'SOLICITADO', 'EN_TRASLADO', 'LISTO_EN_BAHIA', 'DEVUELTO'];
      return vehiculos().filter(function (v) { return !!v.valet; })
        .sort(function (a, b) {
          var d = orden.indexOf(a.valet.estado) - orden.indexOf(b.valet.estado);
          return d !== 0 ? d : ((a.valet.pagadoEn || 0) - (b.valet.pagadoEn || 0));
        })
        .map(function (v) {
          var celda = celdaDe(v);
          return {
            placa: v.placa,
            conductor: v.conductor,
            estado: v.valet.estado,
            estadoVehiculo: v.estado,
            acceso: v.acceso,
            ticket: v.valet.ticket || null,
            operador: v.valet.operador || null,
            tarifa: v.valet.tarifa || null,
            celdaId: v.celdaId,
            zona: celda ? celda.zona : null,
            nombreZona: celda && datosBase.zonas[celda.zona] ? datosBase.zonas[celda.zona].nombre : null,
            casillero: v.valet.casillero || null,
            inspeccion: v.valet.inspeccion ? clonar(v.valet.inspeccion) : null,
            ubicacion: v.valet.ubicacion ? clonar(v.valet.ubicacion) : null,
            preferencia: v.preferencia ? clonar(v.preferencia) : null,
            preferenciaCumplida: v.preferenciaCumplida || null,
            pagadoEn: v.valet.pagadoEn != null ? v.valet.pagadoEn : null,
            enCustodiaMin: v.valet.pagadoEn != null ? (state.clock - v.valet.pagadoEn) : null
          };
        });
    }

    function casilleroLibre() {
      var usados = {};
      vehiculos().forEach(function (v) {
        if (v.valet && v.valet.casillero) usados[v.valet.casillero] = true;
      });
      for (var n = 1; n <= CASILLEROS; n++) {
        if (!usados[n]) return n;
      }
      return null;
    }

    function valetSeleccionar(placa, opciones) {
      opciones = opciones || {};
      var v = porPlaca(placa);
      if (!v || v.estado === 'SALIO') {
        if (!opciones.acceso) return fallo('Primero registra tu llegada.');
        var creada = llegar({
          placa: placa,
          conductor: opciones.conductor,
          acceso: opciones.acceso,
          horaClase: opciones.horaClase,
          valet: true,
          valetPendiente: true
        });
        if (!creada.ok) return creada;
        v = creada.vehiculo;
      } else if (!v.valet) {
        v.valet = { codigo: null, estado: 'SELECCIONADO', casillero: null, pagado: false };
      } else if (v.valet.pagado) {
        return fallo('El valet de ' + placa + ' ya está pagado.');
      }
      v.valet.estado = 'SELECCIONADO';
      pushEvento('VALET_SELECCIONADO', placa + ' seleccionó el servicio de valet.',
        { placa: placa });
      notificar();
      return { ok: true, valet: clonar(v.valet) };
    }

    function valetPagar(placa, metodo) {
      var v = porPlaca(placa);
      if (!v) return fallo('Placa no registrada: ' + placa + '.');
      if (!v.valet) return fallo('Primero selecciona el servicio de valet.');
      if (metodo === 'RECHAZO') return fallo('Pago rechazado. Intenta con otro método.');
      if (v.valet.pagado) return fallo('El valet de ' + placa + ' ya fue pagado.');

      v.valet.pagado = true;
      v.valet.estado = 'PAGADO';
      v.valet.metodo = metodo || 'EFECTIVO';
      v.valet.pagadoEn = state.clock;
      v.valet.tarifa = TARIFA_VALET;
      v.valet.ticket = v.valet.ticket || ('VAL-' + cuatroDigitos());
      v.valet.pin = v.valet.pin || cuatroDigitos();
      v.valet.operador = v.valet.operador || OPERADORES_VALET[Math.floor(rng() * OPERADORES_VALET.length)];
      pushEvento('VALET_PAGADO', 'Valet pagado para ' + placa + ' con ' + v.valet.metodo +
        ' — ticket ' + v.valet.ticket + ', operador ' + v.valet.operador + '.',
        { placa: placa, metodo: v.valet.metodo, ticket: v.valet.ticket, operador: v.valet.operador, tarifa: TARIFA_VALET });
      notificar();
      return { ok: true, valet: clonar(v.valet) };
    }

    function valetEntregar(placa) {
      var v = porPlaca(placa);
      if (!v) return fallo('Placa no registrada: ' + placa + '.');
      if (!v.valet) return fallo('Primero selecciona el servicio de valet.');
      if (!v.valet.pagado) return fallo('Primero completa el pago del valet.');
      if (v.valet.estado === 'PAGADO') return fallo('Primero un operador debe aceptar el servicio.');
      if (v.valet.estado !== 'ACEPTADO') return fallo('El valet de ' + placa + ' ya fue recibido.');

      v.valet.estado = 'ENTREGADO_A_VALET';
      v.valet.codigo = 'V-' + pad3(++state.contadorValet);
      pushEvento('VALET_ENTREGADO', 'Vehículo ' + placa + ' entregado al valet con el código ' + v.valet.codigo + '.',
        { placa: placa, codigo: v.valet.codigo });

      // El carro entra a la fila normal de su acceso: misma R3, sin prioridad.
      if (!enPasarela(v) && !enAfuera(v)) registrarEnFila(v);
      v.valet.estado = 'EN_FILA';

      asignarCeldas();
      notificar();
      return { ok: true, valet: clonar(v.valet) };
    }

    function valetSolicitarCarro(placa) {
      var v = porPlaca(placa);
      if (!v) return fallo('Placa no registrada: ' + placa + '.');
      if (!v.valet) return fallo('La placa ' + placa + ' no tiene servicio de valet.');
      if (v.valet.estado !== 'LLAVES_EN_CUSTODIA') {
        return fallo('El valet de ' + placa + ' todavía no tiene las llaves en custodia (estado ' + v.valet.estado + ').');
      }
      v.valet.estado = 'SOLICITADO';
      v.valet.devolverEn = state.clock + 2;      // 2 min de traslado interno
      v.valet.trasladoEn = null;
      pushEvento('VALET_SOLICITADO', 'El cliente de ' + placa + ' solicitó su carro (casillero ' + v.valet.casillero + ').',
        { placa: placa, casillero: v.valet.casillero });
      notificar();
      return { ok: true };
    }

    function valetDevolver(placa) {
      var v = porPlaca(placa);
      if (!v) return fallo('Placa no registrada: ' + placa + '.');
      if (!v.valet) return fallo('La placa ' + placa + ' no tiene servicio de valet.');
      if (['SOLICITADO', 'EN_TRASLADO', 'LISTO_EN_BAHIA'].indexOf(v.valet.estado) < 0) {
        return fallo('El carro de ' + placa + ' no está solicitado.');
      }
      var casillero = v.valet.casillero;
      v.valet.devolverEn = null;
      if (v.estado === 'ESTACIONADO') {
        salir(placa);                       // libera la celda; deja valet en DEVUELTO
      }
      v.valet.estado = 'DEVUELTO';
      v.valet.casillero = null;
      pushEvento('VALET_DEVUELTO', 'Vehículo ' + placa + ' devuelto al cliente; se libera el casillero ' + casillero + '.',
        { placa: placa, casillero: casillero });
      notificar();
      return { ok: true };
    }

    // --- simulación ----------------------------------------------------
    function porteriaAutomatica() {
      Object.keys(state.pasarelas).forEach(function (acceso) {
        var id = state.pasarelas[acceso][0];
        if (id == null) return;
        var v = porId(id);
        if (v && v.celdaId) confirmarPorteria(acceso, v.placa);
      });
    }

    function devolucionesValet() {
      vehiculos().forEach(function (v) {
        if (!v.valet) return;
        if (v.valet.estado === 'SOLICITADO' && v.valet.devolverEn != null && state.clock >= v.valet.devolverEn) {
          v.valet.estado = 'EN_TRASLADO';
          v.valet.trasladoEn = state.clock + 2;   // 2 min más hasta la bahía
          pushEvento('VALET_TRASLADO', 'El operador saca el vehículo ' + v.placa +
            '; va en traslado a la bahía.', { placa: v.placa, casillero: v.valet.casillero });
        } else if (v.valet.estado === 'EN_TRASLADO' && v.valet.trasladoEn != null &&
                   state.clock >= v.valet.trasladoEn) {
          v.valet.estado = 'LISTO_EN_BAHIA';
          v.valet.trasladoEn = null;
          pushEvento('VALET_LISTO', 'Vehículo ' + v.placa + ' listo en bahía; esperando el PIN del estudiante.',
            { placa: v.placa });
        }
      });
    }

    function llegadasACelda() {
      vehiculos().slice().forEach(function (v) {
        if (v.estado === 'EN_RECORRIDO' && v.etaCelda != null && state.clock >= v.etaCelda) {
          estacionar(v.placa);
        }
      });
    }

    function ejecutarGuion() {
      (datosBase.script || []).forEach(function (ev) {
        if (ev.t !== state.clock) return;
        if (ev.tipo === 'LLEGADA') {
          llegar({
            placa: ev.placa,
            conductor: ev.conductor,
            acceso: ev.acceso,
            horaClase: ev.horaClase != null && ev.horaClase > state.clock ? ev.horaClase : null,
            valet: ev.valet,
            saleSinEstacionar: ev.saleSinEstacionar
          });
        } else if (ev.tipo === 'SALIDA') {
          salir(ev.placa);
        }
      });
    }

    function avanzar(minutos) {
      var n = Math.floor(Number(minutos) || 0);
      if (n <= 0) return fallo('Debes avanzar al menos 1 minuto.');
      for (var i = 0; i < n; i++) {
        state.clock += 1;
        ejecutarGuion();
        if (state.autoPorteria) porteriaAutomatica();
        llegadasACelda();
        devolucionesValet();
        purgarSalidos();
        asignarCeldas();
      }
      if (modoDebug) verificarInvariantes();
      notificar();
      return { ok: true, clock: state.clock, reloj: horaTexto(state.clock) };
    }

    function placaAleatoria() {
      var letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      var placa;
      do {
        placa = '';
        for (var i = 0; i < 3; i++) placa += letras[Math.floor(rng() * letras.length)];
        for (var j = 0; j < 3; j++) placa += Math.floor(rng() * 10);
      } while (porPlaca(placa) && porPlaca(placa).estado !== 'SALIO');
      return placa;
    }

    function generarLlegada(acceso) {
      var nombres = nombresAcceso();
      var acc = acceso && state.pasarelas[acceso]
        ? acceso
        : nombres[Math.floor(rng() * nombres.length)];
      return llegar({
        placa: placaAleatoria(),
        conductor: CONDUCTORES[Math.floor(rng() * CONDUCTORES.length)],
        acceso: acc,
        horaClase: state.clock + 10 + Math.floor(rng() * 40)
      });
    }

    function reiniciar() {
      reiniciarEstado();
      notificar();
      return { ok: true, clock: state.clock, reloj: horaTexto(state.clock) };
    }

    // --- eventos, suscripción, persistencia ----------------------------
    function suscribir(fn) {
      if (typeof fn !== 'function') return function () {};
      suscriptores.push(fn);
      return function desuscribir() {
        var i = suscriptores.indexOf(fn);
        if (i >= 0) suscriptores.splice(i, 1);
      };
    }

    function exportarJSON() {
      return JSON.stringify({
        version: 1,
        clock: state.clock,
        celdas: state.celdas,
        vehiculos: state.vehiculos,
        pasarelas: state.pasarelas,
        afuera: state.afuera,
        seq: state.seq,
        contadorVehiculo: state.contadorVehiculo,
        contadorValet: state.contadorValet,
        eventos: state.eventos,
        asignaciones: state.asignaciones,
        autoPorteria: state.autoPorteria,
        tasaSalidas: state.tasaSalidas
      });
    }

    function importarJSON(texto) {
      try {
        var d = JSON.parse(texto);
        if (!d || !d.celdas || !d.vehiculos) throw new Error('El JSON no tiene el formato del motor.');
        state.clock = d.clock;
        state.celdas = d.celdas;
        state.vehiculos = Array.isArray(d.vehiculos) ? d.vehiculos
          : Object.keys(d.vehiculos).map(function (k) { return d.vehiculos[k]; });
        var filas = filasVacias();
        state.pasarelas = filas.pasarelas;
        state.afuera = filas.afuera;
        Object.keys(d.pasarelas || {}).forEach(function (acceso) {
          if (!state.pasarelas[acceso]) return;
          state.pasarelas[acceso] = d.pasarelas[acceso] || [];
          state.afuera[acceso] = (d.afuera && d.afuera[acceso]) || [];
        });
        state.seq = d.seq;
        state.contadorVehiculo = d.contadorVehiculo || 0;
        state.contadorValet = d.contadorValet || 0;
        state.eventos = d.eventos || [];
        state.asignaciones = d.asignaciones || [];
        state.autoPorteria = !!d.autoPorteria;
        state.tasaSalidas = d.tasaSalidas && d.tasaSalidas.CARRO ? d.tasaSalidas : { CARRO: tasaVacia(), MOTO: tasaVacia() };
        if (modoDebug) verificarInvariantes();
        notificar();
        return { ok: true };
      } catch (e) {
        return { ok: false, error: 'No se pudo importar el JSON: ' + e.message };
      }
    }

    function guardarLocal(clave) {
      try {
        if (typeof localStorage === 'undefined') return { ok: false, error: 'localStorage no está disponible.' };
        localStorage.setItem(clave || 'parkEAFIT.estado', exportarJSON());
        return { ok: true };
      } catch (e) {
        return { ok: false, error: 'No se pudo guardar: ' + e.message };
      }
    }

    function cargarLocal(clave) {
      try {
        if (typeof localStorage === 'undefined') return { ok: false, error: 'localStorage no está disponible.' };
        var crudo = localStorage.getItem(clave || 'parkEAFIT.estado');
        if (!crudo) return { ok: false, error: 'No hay estado guardado.' };
        return importarJSON(crudo);
      } catch (e) {
        return { ok: false, error: 'No se pudo cargar: ' + e.message };
      }
    }

    // --- invariantes ---------------------------------------------------
    function verificarInvariantes(estadoExterno) {
      var s = estadoExterno || state;
      var celdaPorPlaca = {};

      s.celdas.forEach(function (c) {
        if (c.estado === 'LIBRE') {
          if (c.placa) throw new Error('La celda ' + c.id + ' está LIBRE pero tiene la placa ' + c.placa + '.');
          return;
        }
        if (!c.placa) throw new Error('La celda ' + c.id + ' está ' + c.estado + ' sin placa.');
        if (celdaPorPlaca[c.placa]) {
          throw new Error('La placa ' + c.placa + ' ocupa dos celdas (' + celdaPorPlaca[c.placa] + ' y ' + c.id + ').');
        }
        celdaPorPlaca[c.placa] = c.id;
      });

      var celdasPorVehiculo = {};
      Object.keys(s.vehiculos).forEach(function (id) {
        var v = s.vehiculos[id];
        if (!v.celdaId) return;
        if (celdasPorVehiculo[v.placa]) {
          throw new Error('La placa ' + v.placa + ' tiene dos celdas asignadas.');
        }
        celdasPorVehiculo[v.placa] = v.celdaId;

        var celda = null;
        s.celdas.forEach(function (c) { if (c.id === v.celdaId) celda = c; });
        if (!celda) throw new Error('El vehículo ' + v.placa + ' apunta a la celda inexistente ' + v.celdaId + '.');
        if ((celda.tipo || 'CARRO') !== (v.tipo || 'CARRO')) {
          throw new Error('El vehículo ' + v.placa + ' (' + (v.tipo || 'CARRO') + ') tiene la celda ' + celda.id +
            ' de tipo ' + (celda.tipo || 'CARRO') + '.');
        }
        if ((celda.estado !== 'RESERVADA' && celda.estado !== 'OCUPADA') || celda.placa !== v.placa) {
          throw new Error('La celda ' + celda.id + ' del vehículo ' + v.placa +
            ' no está RESERVADA/OCUPADA con su placa.');
        }
      });

      var cap = capacidad();
      Object.keys(s.pasarelas).forEach(function (acceso) {
        if (s.pasarelas[acceso].length > cap) {
          throw new Error('La pasarela ' + acceso + ' tiene ' + s.pasarelas[acceso].length +
            ' vehículos (máximo ' + cap + ').');
        }
      });

      return true;
    }

    // --- api -----------------------------------------------------------
    reiniciarEstado();

    var api = {
      llegar: llegar,
      marcarSaleSinEstacionar: marcarSaleSinEstacionar,
      confirmarPorteria: confirmarPorteria,
      estacionar: estacionar,
      salir: salir,
      retirarSalidos: retirarSalidos,
      posicion: posicion,
      estimarEspera: estimarEspera,
      llegoAClase: llegoAClase,
      ruta: ruta,
      resumen: resumen,
      valetSeleccionar: valetSeleccionar,
      valetPagar: valetPagar,
      valetEntregar: valetEntregar,
      valetSolicitarCarro: valetSolicitarCarro,
      valetDevolver: valetDevolver,
      valetAceptar: valetAceptar,
      valetRegistrarUbicacion: valetRegistrarUbicacion,
      valetInspeccionar: valetInspeccionar,
      valetEntregarCliente: valetEntregarCliente,
      valetListar: valetListar,
      avanzar: avanzar,
      generarLlegada: generarLlegada,
      reiniciar: reiniciar,
      suscribir: suscribir,
      exportarJSON: exportarJSON,
      importarJSON: importarJSON,
      guardarLocal: guardarLocal,
      cargarLocal: cargarLocal,
      verificarInvariantes: verificarInvariantes,
      asignarCeldas: asignarCeldas,
      setAutoPorteria: function (valor) {
        state.autoPorteria = !!valor;
        pushEvento('PORTERIA_AUTO', 'Portería automática ' + (state.autoPorteria ? 'activada.' : 'desactivada.'), {});
        if (state.autoPorteria) porteriaAutomatica();
        notificar();
        return { ok: true, autoPorteria: state.autoPorteria };
      },
      activarDebug: function (valor) { modoDebug = !!valor; return modoDebug; },
      politica: function () { return POLITICA_TEXTO; }
    };

    Object.defineProperty(api, 'state', {
      get: function () { return state; },
      enumerable: true
    });

    return api;
  }

  var ParkEngine = {
    crear: crear,
    POLITICA_TEXTO: POLITICA_TEXTO,
    normalizarPlaca: normalizarPlaca,
    tipoDePlaca: tipoDePlaca,
    horaTexto: horaTexto
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = ParkEngine;
  else global.ParkEngine = ParkEngine;
})(typeof window !== 'undefined' ? window : this);
