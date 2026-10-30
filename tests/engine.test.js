/* Pruebas del motor de ParkEAFIT.
   Ejecutar con:  node tests/engine.test.js
   Sin librerías: solo assert de Node. */
'use strict';

var assert = require('assert');
var ParkData = require('../src/data.js');
var ParkEngine = require('../src/engine.js');

var pasadas = 0;
var total = 0;

function prueba(nombre, fn) {
  total++;
  try {
    fn();
    pasadas++;
    console.log('✅ ' + nombre);
  } catch (e) {
    console.log('❌ ' + nombre + ' → ' + e.message);
  }
}

/* Data mínima y controlable para las pruebas. */
function datos(opciones) {
  opciones = opciones || {};
  var nCeldas = opciones.nCeldas != null ? opciones.nCeldas : 6;
  var celdas = [];
  var i;

  for (i = 1; i <= nCeldas; i++) {
    celdas.push({
      id: 'A-' + (i < 10 ? '0' : '') + i,
      zona: 'A',
      x: 10 + i * 3,
      y: 20,
      estado: 'LIBRE',
      placa: null
    });
  }

  var iniciales = (opciones.iniciales || []).map(function (v) { return Object.assign({}, v); });
  iniciales.forEach(function (v) {
    if (!v.celdaId) return;
    celdas.forEach(function (c) {
      if (c.id === v.celdaId) { c.estado = 'OCUPADA'; c.placa = v.placa; }
    });
  });

  return {
    relojInicial: opciones.relojInicial != null ? opciones.relojInicial : 440,
    capacidadPasarela: 4,
    accesos: {
      REGIONAL: { nombre: 'Regional', x: 0, y: 30, porteria: { x: 8, y: 30 } },
      LAS_VEGAS: { nombre: 'Las Vegas', x: 100, y: 30, porteria: { x: 92, y: 30 } }
    },
    zonas: { A: { nombre: 'Zona A', x: 15 }, B: { nombre: 'Zona B', x: 50 }, C: { nombre: 'Zona C', x: 84 } },
    celdas: celdas,
    vehiculosIniciales: iniciales,
    script: opciones.script || [],
    historico: opciones.historico || ParkData.HISTORICO,
    semilla: 12345
  };
}

/* Vehículos ya estacionados que ocupan celdas (para liberar cupos en las pruebas). */
function parqueado(placa, celdaId, acceso) {
  return { placa: placa, conductor: 'Prueba', acceso: acceso || 'REGIONAL', estado: 'ESTACIONADO', celdaId: celdaId };
}

/* ---------------------------------------------------------------------- */
prueba('1. FIFO global: la celda va por hora de registro, sin importar el acceso', function () {
  var e = ParkEngine.crear(datos({
    nCeldas: 4,
    iniciales: [parqueado('AAA111', 'A-01'), parqueado('BBB222', 'A-02'), parqueado('CCC333', 'A-03'), parqueado('DDD444', 'A-04')]
  }));

  e.llegar({ placa: 'TRX100', conductor: 'R', acceso: 'REGIONAL' });   // 07:20
  e.avanzar(1);
  e.llegar({ placa: 'TRX200', conductor: 'LV', acceso: 'LAS_VEGAS' }); // 07:21
  e.avanzar(2);
  e.llegar({ placa: 'TRX300', conductor: 'R', acceso: 'REGIONAL' });   // 07:23

  assert.strictEqual(e.state.celdas.filter(function (c) { return c.estado === 'LIBRE'; }).length, 0,
    'no debe haber celdas libres antes de liberar cupos');

  var buscar = function (placa) {
    return Object.keys(e.state.vehiculos).map(function (k) { return e.state.vehiculos[k]; })
      .filter(function (v) { return v.placa === placa; })[0];
  };

  e.salir('AAA111');
  assert.ok(buscar('TRX100').celdaId, 'el de REGIONAL (07:20) debe recibir la primera celda');
  e.salir('BBB222');
  var lv = buscar('TRX200');
  var r2 = buscar('TRX300');

  assert.ok(lv.celdaId, 'el de LAS_VEGAS (07:21) debe recibir la segunda celda');
  assert.strictEqual(r2.celdaId, null, 'el segundo de REGIONAL (07:23) no debe recibir celda');
});

prueba('2. Orden por fila: nunca adelanta el de atrás', function () {
  var e = ParkEngine.crear(datos({
    nCeldas: 4,
    iniciales: [parqueado('AAA111', 'A-01'), parqueado('BBB222', 'A-02'), parqueado('CCC333', 'A-03'), parqueado('DDD444', 'A-04')]
  }));

  e.llegar({ placa: 'FIL101', conductor: 'A', acceso: 'REGIONAL' });
  e.avanzar(1);
  e.llegar({ placa: 'FIL102', conductor: 'B', acceso: 'REGIONAL' });
  e.avanzar(1);
  e.llegar({ placa: 'FIL103', conductor: 'C', acceso: 'REGIONAL' });

  e.salir('AAA111'); // 1 celda libre
  var v = function (placa) {
    return Object.keys(e.state.vehiculos).map(function (k) { return e.state.vehiculos[k]; })
      .filter(function (x) { return x.placa === placa; })[0];
  };
  assert.ok(v('FIL101').celdaId, 'la celda debe ir al primero de la fila');
  assert.strictEqual(v('FIL102').celdaId, null);
  assert.strictEqual(v('FIL103').celdaId, null);

  e.salir('BBB222');
  assert.ok(v('FIL102').celdaId, 'la segunda celda debe ir al segundo de la fila');
  assert.strictEqual(v('FIL103').celdaId, null, 'el tercero sigue esperando');
});

prueba('3. Sale sin estacionar: no recibe celda y conserva su puesto físico', function () {
  var e = ParkEngine.crear(datos({
    nCeldas: 4,
    iniciales: [parqueado('AAA111', 'A-01'), parqueado('BBB222', 'A-02'), parqueado('CCC333', 'A-03'), parqueado('DDD444', 'A-04')]
  }));

  var buscar = function (placa) {
    return Object.keys(e.state.vehiculos).map(function (k) { return e.state.vehiculos[k]; })
      .filter(function (x) { return x.placa === placa; })[0];
  };

  e.llegar({ placa: 'NEC101', conductor: 'A', acceso: 'REGIONAL' });
  e.avanzar(1);
  e.llegar({ placa: 'SNE102', conductor: 'B', acceso: 'REGIONAL' });
  e.avanzar(1);
  e.llegar({ placa: 'NEC103', conductor: 'C', acceso: 'REGIONAL' });

  assert.strictEqual(e.marcarSaleSinEstacionar('SNE102', true).ok, true);
  assert.strictEqual(e.posicion('SNE102').posicionEnPasarela, 2, 'conserva su puesto en la fila');

  e.salir('AAA111');
  assert.ok(buscar('NEC101').celdaId, 'la celda va al primero que sí la necesita');
  assert.strictEqual(buscar('SNE102').celdaId, null, 'el que sale sin estacionar no recibe celda');

  e.salir('BBB222');
  assert.ok(buscar('NEC103').celdaId, 'la siguiente celda salta al que sí la necesita');

  assert.strictEqual(e.confirmarPorteria('REGIONAL', 'NEC101').ok, true, 'el primero pasa portería');
  assert.strictEqual(e.posicion('SNE102').posicionEnPasarela, 1, 'ahora el de "sale sin estacionar" es el primero');
  var err = e.confirmarPorteria('REGIONAL', 'SNE102');
  assert.strictEqual(err.ok, false);
  assert.strictEqual(err.error, 'Aún no tiene celda asignada. Debe esperar.');
  assert.strictEqual(e.salir('SNE102').ok, true, 'sale sin estacionar cuando es el primero');
  assert.strictEqual(buscar('SNE102').estado, 'SALIO');
});

prueba('4. Pasarela llena: el 5.º espera afuera y entra al liberarse un cupo', function () {
  var e = ParkEngine.crear(datos({ nCeldas: 2 }));

  ['PAS01', 'PAS02', 'PAS03', 'PAS04', 'PAS05'].forEach(function (p) {
    e.llegar({ placa: p, conductor: 'X', acceso: 'REGIONAL' });
  });

  var quinto = Object.keys(e.state.vehiculos).map(function (k) { return e.state.vehiculos[k]; })
    .filter(function (v) { return v.placa === 'PAS05'; })[0];

  assert.strictEqual(e.state.pasarelas.REGIONAL.length, 4, 'la pasarela admite 4');
  assert.strictEqual(e.state.afuera.REGIONAL.length, 1, 'el 5.º queda afuera');
  assert.strictEqual(quinto.estado, 'AFUERA');
  assert.strictEqual(quinto.registradoEn, null, 'no tiene hora de registro mientras espera afuera');

  assert.strictEqual(e.confirmarPorteria('REGIONAL', 'PAS01').ok, true);
  assert.strictEqual(quinto.estado, 'EN_PASARELA', 'entra al liberarse el cupo');
  assert.strictEqual(quinto.registradoEn, e.state.clock, 'se registra en el minuto de entrada');
  assert.ok(quinto.seq > 0, 'recibe un seq nuevo');
  assert.strictEqual(e.state.afuera.REGIONAL.length, 0);
});

prueba('5. Sin duplicados: 200 llegadas aleatorias con salidas, invariantes siempre válidas', function () {
  var e = ParkEngine.crear(datos({ nCeldas: 20 }));
  e.state.autoPorteria = true;

  var i;
  for (i = 0; i < 200; i++) {
    e.generarLlegada(i % 2 === 0 ? 'REGIONAL' : 'LAS_VEGAS');
    e.verificarInvariantes();

    if (i % 3 === 0) {
      e.avanzar(1);
      e.verificarInvariantes();
    }
    if (i % 5 === 0) {
      var estacionados = Object.keys(e.state.vehiculos).map(function (k) { return e.state.vehiculos[k]; })
        .filter(function (v) { return v.estado === 'ESTACIONADO'; });
      if (estacionados.length) {
        assert.strictEqual(e.salir(estacionados[0].placa).ok, true);
        e.verificarInvariantes();
      }
    }
  }

  // Ninguna celda puede estar reservada/ocupada por dos placas.
  var vistas = {};
  e.state.celdas.forEach(function (c) {
    if (c.estado === 'LIBRE') return;
    assert.ok(!vistas[c.placa], 'la placa ' + c.placa + ' aparece en dos celdas');
    vistas[c.placa] = c.id;
  });
});

prueba('6. Portería: errores claros y paso correcto', function () {
  var e = ParkEngine.crear(datos({ nCeldas: 3 }));

  e.llegar({ placa: 'POR101', conductor: 'A', acceso: 'REGIONAL' });
  e.avanzar(1);
  e.llegar({ placa: 'POR102', conductor: 'B', acceso: 'REGIONAL' });

  assert.strictEqual(e.confirmarPorteria('REGIONAL', 'ZZZ999').error, 'Placa no registrada en esta pasarela.');
  assert.strictEqual(e.confirmarPorteria('REGIONAL', 'POR102').error, 'Este vehículo aún no es el primero de la fila.');
  assert.strictEqual(e.confirmarPorteria('REGIONAL', 'POR101').ok, true);
  assert.strictEqual(e.state.vehiculos[1].estado, 'EN_RECORRIDO');

  // Sin celda asignada (no hay celdas libres)
  var e2 = ParkEngine.crear(datos({ nCeldas: 1, iniciales: [parqueado('OCC111', 'A-01')] }));
  e2.llegar({ placa: 'SIN101', conductor: 'C', acceso: 'REGIONAL' });
  assert.strictEqual(e2.confirmarPorteria('REGIONAL', 'SIN101').error, 'Aún no tiene celda asignada. Debe esperar.');
});

prueba('7. Valet sin prioridad: compite con su hora de registro', function () {
  var e = ParkEngine.crear(datos({
    nCeldas: 2,
    iniciales: [parqueado('AAA111', 'A-01'), parqueado('BBB222', 'A-02')]
  }));

  e.llegar({ placa: 'NOR101', conductor: 'A', acceso: 'REGIONAL' });
  e.avanzar(1);
  e.llegar({ placa: 'VAL101', conductor: 'B', acceso: 'REGIONAL', valet: true });
  assert.strictEqual(e.valetPagar('VAL101', 'NEQUI').ok, true);

  e.salir('AAA111');
  var v = function (placa) {
    return Object.keys(e.state.vehiculos).map(function (k) { return e.state.vehiculos[k]; })
      .filter(function (x) { return x.placa === placa; })[0];
  };
  assert.ok(v('NOR101').celdaId, 'la celda va al que registró primero, sin valet');
  assert.strictEqual(v('VAL101').celdaId, null, 'el valet no adelanta');

  e.salir('BBB222');
  assert.ok(v('VAL101').celdaId, 'después sí recibe su celda');
});

prueba('8. Valet: pago obligatorio y flujo completo hasta LLAVES_EN_CUSTODIA', function () {
  var e = ParkEngine.crear(datos({ nCeldas: 2 }));
  e.llegar({ placa: 'VLT101', conductor: 'A', acceso: 'REGIONAL', valet: true });

  assert.strictEqual(e.valetEntregar('VLT101').error, 'Primero completa el pago del valet.');
  assert.strictEqual(e.valetPagar('VLT101', 'RECHAZO').error, 'Pago rechazado. Intenta con otro método.');
  assert.strictEqual(e.valetPagar('VLT101', 'TARJETA').ok, true);
  var entrega = e.valetEntregar('VLT101');
  assert.strictEqual(entrega.ok, true);
  assert.ok(/^V-\d{3}$/.test(entrega.valet.codigo), 'código con formato V-XXX');

  assert.strictEqual(e.confirmarPorteria('REGIONAL', 'VLT101').ok, true);
  assert.strictEqual(e.estacionar('VLT101').ok, true);

  var v = Object.keys(e.state.vehiculos).map(function (k) { return e.state.vehiculos[k]; })
    .filter(function (x) { return x.placa === 'VLT101'; })[0];
  assert.strictEqual(v.valet.estado, 'LLAVES_EN_CUSTODIA');
  assert.ok(v.valet.casillero >= 1 && v.valet.casillero <= 30, 'casillero entre 1 y 30');
});

prueba('9. Estimación: "Celda inmediata" con cupo y rango 4–8 min con tasa 0.5/min', function () {
  // (a) parqueadero vacío con celdas libres: un carro nuevo entra de una
  var e0 = ParkEngine.crear(datos({ nCeldas: 3 }));
  assert.strictEqual(e0.resumen().accesos.REGIONAL.esperaTexto, 'Celda inmediata');
  e0.llegar({ placa: 'ESP101', conductor: 'A', acceso: 'REGIONAL' });
  assert.ok(e0.state.celdas.filter(function (c) { return c.estado === 'LIBRE'; }).length >= 1);

  // (b) k = 3 con L = 0 y tasa 0.5/min → faltan 3 → t = 6 min → 4–8
  var e = ParkEngine.crear(datos({
    nCeldas: 1,
    iniciales: [parqueado('OCC111', 'A-01')]
  }));
  e.state.tasaSalidas.ewma = 0.5;
  e.llegar({ placa: 'EST101', conductor: 'A', acceso: 'REGIONAL' });
  e.avanzar(1);
  e.llegar({ placa: 'EST102', conductor: 'B', acceso: 'REGIONAL' });
  e.llegar({ placa: 'EST103', conductor: 'C', acceso: 'REGIONAL' });
  var est = e.estimarEspera('EST103');
  assert.strictEqual(est.k, 3);
  assert.strictEqual(est.texto, '4\u20138 min');

  // (c) quien sale sin estacionar no tiene estimación
  e.marcarSaleSinEstacionar('EST101', true);
  assert.strictEqual(e.estimarEspera('EST101').texto, 'No necesitas celda');
});

prueba('10. Determinismo: dos motores con los mismos datos dan el mismo JSON', function () {
  var a = ParkEngine.crear(ParkData);
  var b = ParkEngine.crear(ParkData);
  a.avanzar(60);
  b.avanzar(60);
  assert.strictEqual(a.state.clock, 510);
  assert.strictEqual(a.exportarJSON(), b.exportarJSON());
});

console.log('\n' + pasadas + '/' + total + ' pruebas pasaron');
if (pasadas !== total) process.exitCode = 1;
