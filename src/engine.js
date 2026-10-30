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
    function nombreAcceso(acceso) {
      var a = datosBase.accesos[acceso];
      return a && a.nombre ? a.nombre : acceso;
    }
    function vehiculos() {
      return Object.keys(state.vehiculos).map(function (id) { return state.vehiculos[id]; });
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
    function libres() {
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
      state = {
        clock: datosBase.relojInicial,
        celdas: clonar(datosBase.celdas),
        vehiculos: {},
        pasarelas: { REGIONAL: [], LAS_VEGAS: [] },
        afuera: { REGIONAL: [], LAS_VEGAS: [] },
        seq: 0,
        contadorVehiculo: 0,
        contadorValet: 0,
        eventos: [],
        asignaciones: [],
        autoPorteria: false,
        tasaSalidas: { ewma: null, ultimaEn: null, muestras: 0 },
        semilla: datosBase.semilla || 20261030,
        historico: datosBase.historico || []
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
      state.vehiculos[v.id] = v;
      if (v.estado === 'EN_PASARELA' || v.estado === 'CELDA_ASIGNADA') {
        state.pasarelas[v.acceso].push(v.id);
      } else if (v.estado === 'AFUERA') {
        state.afuera[v.acceso].push(v.id);
      }
      return v;
    }

    // --- reglas de fila (R1, R2) ---------------------------------------
    function entrarAPasarela(v) {
      v.estado = 'EN_PASARELA';
      v.registradoEn = state.clock;
      v.seq = ++state.seq;
      state.pasarelas[v.acceso].push(v.id);
      pushEvento('REGISTRO', v.placa + ' registró su llegada en ' + nombreAcceso(v.acceso) +
        ' (posición ' + state.pasarelas[v.acceso].length + ' de ' + capacidad() + ').',
        { placa: v.placa, acceso: v.acceso, registradoEn: v.registradoEn, seq: v.seq });
    }

    function registrarEnFila(v) {
      if (state.pasarelas[v.acceso].length < capacidad()) {
        entrarAPasarela(v);
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
        var v = state.vehiculos[id];
        if (!v) continue;
        entrarAPasarela(v);
      }
    }

    // --- reparto de celdas (R3, R4, R5, R6) ----------------------------
    function elegirCelda(v, disponibles) {
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
        var disponibles = libres();
        if (!candidatos.length || !disponibles.length) break;
        reservarCelda(candidatos[0], elegirCelda(candidatos[0], disponibles));
        total++;
      }
      return total;
    }

    // --- cola global de quienes necesitan celda -----------------------
    function necesitanCeldaGlobal() {
      var registrados = [];
      var afuera = [];
      vehiculos().forEach(function (v) {
        if (v.saleSinEstacionar) return;
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
      var idx = necesitanCeldaGlobal().indexOf(v);
      return idx < 0 ? null : idx + 1;
    }

    // --- tasa de salidas (EWMA) ---------------------------------------
    function tasaSalidasPorMin() {
      var tasa = state.tasaSalidas.ewma;
      if (tasa == null) {
        var hora = Math.floor(state.clock / 60);
        var fila = null;
        (state.historico || []).forEach(function (f) { if (f.hora === hora) fila = f; });
        tasa = fila ? fila.salidasPorMin : 0.1;
      }
      return Math.max(TASA_MINIMA, tasa);
    }

    function registrarSalidaTasa() {
      var t = state.tasaSalidas;
      if (t.ultimaEn != null && state.clock > t.ultimaEn) {
        var brecha = state.clock - t.ultimaEn;
        var muestra = 1 / brecha;              // salidas por minuto observadas
        t.ewma = t.ewma == null ? muestra : ALPHA_TASA * muestra + (1 - ALPHA_TASA) * t.ewma;
        t.muestras++;
      }
      t.ultimaEn = state.clock;
    }

    function estimarParaK(k) {
      var L = libres().length;
      if (k <= L) return { minMin: 0, maxMin: 1, texto: 'Celda inmediata' };
      var faltan = k - L;
      var tasa = tasaSalidasPorMin();
      var t = faltan / tasa;
      var minMin = Math.floor(t * 0.8);
      var maxMin = Math.ceil(t * 1.3);
      if (maxMin <= minMin) maxMin = minMin + 1;
      return { minMin: minMin, maxMin: maxMin, texto: minMin + '\u2013' + maxMin + ' min' };
    }

    // --- acciones públicas -------------------------------------------
    function llegar(opciones) {
      opciones = opciones || {};
      var placa = String(opciones.placa || '').trim().toUpperCase();
      var acceso = opciones.acceso;

      if (!placa) return fallo('La placa es obligatoria.');
      if (!state.pasarelas[acceso]) return fallo('Acceso desconocido: ' + acceso + '.');
      var existente = porPlaca(placa);
      if (existente && existente.estado !== 'SALIO') {
        return fallo('La placa ' + placa + ' ya está en el sistema.');
      }

      var v = {
        id: ++state.contadorVehiculo,
        placa: placa,
        conductor: opciones.conductor || '—',
        acceso: acceso,
        estado: 'AFUERA',
        llegadaAfueraEn: state.clock,
        registradoEn: null,
        seq: null,
        saleSinEstacionar: !!opciones.saleSinEstacionar,
        celdaId: null,
        valet: opciones.valet ? { codigo: null, estado: 'SELECCIONADO', casillero: null, pagado: false } : null,
        horaClase: opciones.horaClase != null ? opciones.horaClase : null,
        etaCelda: null
      };
      state.vehiculos[v.id] = v;

      pushEvento('LLEGADA_AFUERA', placa + ' llegó por ' + nombreAcceso(acceso) + '.',
        { placa: placa, acceso: acceso });

      if (opciones.valetPendiente) {
        // Vehículo de valet que todavía no se entrega: no entra a la fila.
        pushEvento('VALET_SELECCIONADO', placa + ' inició el servicio de valet (aún sin entrar a la fila).',
          { placa: placa });
      } else {
        registrarEnFila(v);
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
      registrarSalidaTasa();
      pushEvento('SALIDA', placa + ' salió; ' + (celda ? 'celda ' + celda.id + ' libre.' : 'sin celda asociada.'),
        { placa: placa, celda: celda ? celda.id : null });
      if (v.valet && v.valet.casillero) v.valet.casillero = null;
      if (v.valet && v.valet.estado === 'SOLICITADO') v.valet.estado = 'DEVUELTO';

      asignarCeldas();
      notificar();
      return { ok: true };
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

      var est = estimarParaK(k);
      est.k = k;
      est.libres = libres().length;
      est.tasa = redondear1(tasaSalidasPorMin());
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
      var puntos = [{ x: acceso.x, y: acceso.y }, { x: porteria.x, y: porteria.y }];
      var pasos = ['Avanza a la portería ' + acceso.nombre + '.'];

      var celda = celdaDe(v);
      if (!celda) {
        pasos.push('Espera tu celda en la pasarela.');
        return { puntos: puntos, pasos: pasos };
      }

      var zona = datosBase.zonas[celda.zona] || { nombre: 'Zona ' + celda.zona, x: 50 };
      puntos.push({ x: zona.x, y: 30 });
      puntos.push({ x: celda.x, y: 30 });
      puntos.push({ x: celda.x, y: celda.y });
      pasos.push('Sigue recto hacia la ' + zona.nombre + '.');
      var lado = celda.x < 50 ? 'izquierda' : (celda.x > 50 ? 'derecha' : 'centro');
      pasos.push('Celda ' + celda.id + ' a tu ' + lado + '.');
      return { puntos: puntos, pasos: pasos };
    }

    function resumen() {
      var lista = necesitanCeldaGlobal();
      var L = libres().length;
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
        var est = estimarParaK(k);

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

      var total = state.celdas.length;
      return {
        reloj: horaTexto(state.clock),
        libres: L,
        total: total,
        ocupacionPct: total ? Math.round(((total - L) / total) * 100) : 0,
        accesos: accesos,
        justicia: justicia,
        historico: clonar(state.historico)
      };
    }

    // --- valet ---------------------------------------------------------
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
      if (!v) {
        if (!opciones.acceso) return fallo('Placa no registrada: ' + placa + '.');
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
      pushEvento('VALET_PAGADO', 'Valet pagado para ' + placa + ' con ' + v.valet.metodo + '.',
        { placa: placa, metodo: v.valet.metodo });
      notificar();
      return { ok: true, valet: clonar(v.valet) };
    }

    function valetEntregar(placa) {
      var v = porPlaca(placa);
      if (!v) return fallo('Placa no registrada: ' + placa + '.');
      if (!v.valet) return fallo('Primero selecciona el servicio de valet.');
      if (!v.valet.pagado) return fallo('Primero completa el pago del valet.');
      if (v.valet.estado !== 'PAGADO') return fallo('El valet de ' + placa + ' ya fue entregado.');

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
      pushEvento('VALET_SOLICITADO', 'El cliente de ' + placa + ' solicitó su carro (casillero ' + v.valet.casillero + ').',
        { placa: placa, casillero: v.valet.casillero });
      notificar();
      return { ok: true };
    }

    function valetDevolver(placa) {
      var v = porPlaca(placa);
      if (!v) return fallo('Placa no registrada: ' + placa + '.');
      if (!v.valet) return fallo('La placa ' + placa + ' no tiene servicio de valet.');
      if (v.valet.estado !== 'SOLICITADO') {
        return fallo('El carro de ' + placa + ' no está solicitado.');
      }
      v.valet.estado = 'DEVUELTO';
      pushEvento('VALET_DEVUELTO', 'Vehículo ' + placa + ' devuelto al cliente; se libera el casillero ' + v.valet.casillero + '.',
        { placa: placa, casillero: v.valet.casillero });
      v.valet.casillero = null;
      notificar();
      return { ok: true };
    }

    // --- simulación ----------------------------------------------------
    function porteriaAutomatica() {
      Object.keys(state.pasarelas).forEach(function (acceso) {
        var id = state.pasarelas[acceso][0];
        if (id == null) return;
        var v = state.vehiculos[id];
        if (v && v.celdaId) confirmarPorteria(acceso, v.placa);
      });
    }

    function llegadasACelda() {
      vehiculos().forEach(function (v) {
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
            horaClase: ev.horaClase,
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
      var acc = acceso && state.pasarelas[acceso]
        ? acceso
        : (rng() < 0.5 ? 'REGIONAL' : 'LAS_VEGAS');
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
        state.vehiculos = d.vehiculos;
        state.pasarelas = d.pasarelas;
        state.afuera = d.afuera;
        state.seq = d.seq;
        state.contadorVehiculo = d.contadorVehiculo || 0;
        state.contadorValet = d.contadorValet || 0;
        state.eventos = d.eventos || [];
        state.asignaciones = d.asignaciones || [];
        state.autoPorteria = !!d.autoPorteria;
        state.tasaSalidas = d.tasaSalidas || { ewma: null, ultimaEn: null, muestras: 0 };
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
    horaTexto: horaTexto
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = ParkEngine;
  else global.ParkEngine = ParkEngine;
})(typeof window !== 'undefined' ? window : this);
