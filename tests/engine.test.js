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

  e.llegar({ placa: 'TRX100', conductor: 'Regional', acceso: 'REGIONAL' });   // 07:20
  e.avanzar(1);
  e.llegar({ placa: 'TRX200', conductor: 'Las Vegas', acceso: 'LAS_VEGAS' }); // 07:21
  e.avanzar(2);
  e.llegar({ placa: 'TRX300', conductor: 'Regional', acceso: 'REGIONAL' });   // 07:23

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

  e.llegar({ placa: 'FIL101', conductor: 'Ana', acceso: 'REGIONAL' });
  e.avanzar(1);
  e.llegar({ placa: 'FIL102', conductor: 'Beto', acceso: 'REGIONAL' });
  e.avanzar(1);
  e.llegar({ placa: 'FIL103', conductor: 'Caro', acceso: 'REGIONAL' });

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

  e.llegar({ placa: 'NEC101', conductor: 'Ana', acceso: 'REGIONAL' });
  e.avanzar(1);
  e.llegar({ placa: 'SNE102', conductor: 'Beto', acceso: 'REGIONAL' });
  e.avanzar(1);
  e.llegar({ placa: 'NEC103', conductor: 'Caro', acceso: 'REGIONAL' });

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

  ['PAS101', 'PAS102', 'PAS103', 'PAS104', 'PAS105'].forEach(function (p) {
    e.llegar({ placa: p, conductor: 'Xime', acceso: 'REGIONAL' });
  });

  var quinto = Object.keys(e.state.vehiculos).map(function (k) { return e.state.vehiculos[k]; })
    .filter(function (v) { return v.placa === 'PAS105'; })[0];

  assert.strictEqual(e.state.pasarelas.REGIONAL.length, 4, 'la pasarela admite 4');
  assert.strictEqual(e.state.afuera.REGIONAL.length, 1, 'el 5.º queda afuera');
  assert.strictEqual(quinto.estado, 'AFUERA');
  assert.strictEqual(quinto.registradoEn, null, 'no tiene hora de registro mientras espera afuera');

  assert.strictEqual(e.confirmarPorteria('REGIONAL', 'PAS101').ok, true);
  assert.strictEqual(quinto.estado, 'EN_PASARELA', 'entra al liberarse el cupo');
  assert.strictEqual(quinto.registradoEn, e.state.clock, 'se registra en el minuto de entrada');
  assert.ok(quinto.seq > 0, 'recibe un seq nuevo');
  assert.strictEqual(e.state.afuera.REGIONAL.length, 0);
});

prueba('5. Sin duplicados: 200 llegadas aleatorias con salidas, invariantes siempre válidas', function () {
  var e = ParkEngine.crear(datos({ nCeldas: 20 }));
  e.setAutoPorteria(true);

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

  e.llegar({ placa: 'POR101', conductor: 'Ana', acceso: 'REGIONAL' });
  e.avanzar(1);
  e.llegar({ placa: 'POR102', conductor: 'Beto', acceso: 'REGIONAL' });

  assert.strictEqual(e.confirmarPorteria('REGIONAL', 'ZZZ999').error, 'Placa no registrada en esta pasarela.');
  assert.strictEqual(e.confirmarPorteria('REGIONAL', 'POR102').error, 'Este vehículo aún no es el primero de la fila.');
  assert.strictEqual(e.confirmarPorteria('REGIONAL', 'POR101').ok, true);
  assert.strictEqual(e.state.vehiculos.filter(function (v) { return v.placa === 'POR101'; })[0].estado, 'EN_RECORRIDO');

  // Sin celda asignada (no hay celdas libres)
  var e2 = ParkEngine.crear(datos({ nCeldas: 1, iniciales: [parqueado('OCC111', 'A-01')] }));
  e2.llegar({ placa: 'SIN101', conductor: 'Caro', acceso: 'REGIONAL' });
  assert.strictEqual(e2.confirmarPorteria('REGIONAL', 'SIN101').error, 'Aún no tiene celda asignada. Debe esperar.');
});

prueba('7. Valet sin prioridad: compite con su hora de registro', function () {
  var e = ParkEngine.crear(datos({
    nCeldas: 2,
    iniciales: [parqueado('AAA111', 'A-01'), parqueado('BBB222', 'A-02')]
  }));

  e.llegar({ placa: 'NOR101', conductor: 'Ana', acceso: 'REGIONAL' });
  e.avanzar(1);
  e.llegar({ placa: 'VAL101', conductor: 'Beto', acceso: 'REGIONAL', valet: true });
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
  e.llegar({ placa: 'VLT101', conductor: 'Ana', acceso: 'REGIONAL', valet: true });

  assert.strictEqual(e.valetEntregar('VLT101').error, 'Primero completa el pago del valet.');
  assert.strictEqual(e.valetPagar('VLT101', 'RECHAZO').error, 'Pago rechazado. Intenta con otro método.');
  assert.strictEqual(e.valetPagar('VLT101', 'TARJETA').ok, true);
  assert.strictEqual(e.valetEntregar('VLT101').error, 'Primero un operador debe aceptar el servicio.');
  assert.strictEqual(e.valetAceptar('VLT101', 'Carlos Restrepo').ok, true);
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
  e0.llegar({ placa: 'ESP101', conductor: 'Ana', acceso: 'REGIONAL' });
  assert.ok(e0.state.celdas.filter(function (c) { return c.estado === 'LIBRE'; }).length >= 1);

  // (b) k = 3 con L = 0 y tasa 0.5/min → faltan 3 → t = 6 min → 4–8
  var e = ParkEngine.crear(datos({
    nCeldas: 1,
    iniciales: [parqueado('OCC111', 'A-01')]
  }));
  e.state.tasaSalidas.CARRO.ewma = 0.5;
  e.llegar({ placa: 'EST101', conductor: 'Ana', acceso: 'REGIONAL' });
  e.avanzar(1);
  e.llegar({ placa: 'EST102', conductor: 'Beto', acceso: 'REGIONAL' });
  e.llegar({ placa: 'EST103', conductor: 'Caro', acceso: 'REGIONAL' });
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

/* --- Pruebas TAREA 01B (validación y motos) — agregadas por Claude ------------------ */
function datosMixtos(carrosLibres, motosLibres) {
  var d = datos({ nCeldas: 0 });
  d.celdas = [];
  var i;
  for (i = 0; i < carrosLibres; i++) d.celdas.push({ id: 'A-0' + (i + 1), zona: 'A', tipo: 'CARRO', x: 10 + i, y: 10, estado: 'LIBRE', placa: null });
  for (i = 0; i < motosLibres; i++) d.celdas.push({ id: 'M-0' + (i + 1), zona: 'M', tipo: 'MOTO', x: 40 + i, y: 56, estado: 'LIBRE', placa: null });
  d.zonas.M = { nombre: 'Zona M (motos)', x: 50 };
  return d;
}

prueba('11. Placas: carro ABC123 y moto ABC12D; el resto se rechaza', function () {
  var e = ParkEngine.crear(datosMixtos(5, 5));
  assert.strictEqual(e.llegar({ placa: 'ABC123', conductor: 'Ana', acceso: 'REGIONAL' }).vehiculo.tipo, 'CARRO');
  assert.strictEqual(e.llegar({ placa: 'ABC12D', conductor: 'Beto', acceso: 'REGIONAL' }).vehiculo.tipo, 'MOTO');
  assert.strictEqual(e.llegar({ placa: 'abc 124', conductor: 'Caro', acceso: 'LAS_VEGAS' }).vehiculo.placa, 'ABC124');
  ['AB1234', 'ABC1234', '123ABC', 'ABCD12', ''].forEach(function (p) {
    var r = e.llegar({ placa: p, conductor: 'Ana', acceso: 'REGIONAL' });
    assert.strictEqual(r.ok, false, 'debió rechazar ' + p);
  });
  assert.strictEqual(e.llegar({ placa: 'XYZ999', conductor: 'Ana', acceso: 'REGIONAL' }).ok, true);
  assert.strictEqual(e.llegar({ placa: 'XYZ998', conductor: 'R2D2', acceso: 'REGIONAL' }).ok, false, 'nombre con números');
  assert.strictEqual(e.llegar({ placa: 'XYZ997', conductor: 'Ana', acceso: 'OTRO' }).ok, false, 'acceso inválido');
  assert.strictEqual(e.llegar({ placa: 'XYZ996', conductor: 'Ana', acceso: 'REGIONAL', horaClase: 100 }).ok, false, 'hora de clase pasada');
});

prueba('12. Placa duplicada activa → error', function () {
  var e = ParkEngine.crear(datosMixtos(5, 0));
  e.llegar({ placa: 'DUP123', conductor: 'Ana', acceso: 'REGIONAL' });
  var r = e.llegar({ placa: 'DUP123', conductor: 'Ana', acceso: 'LAS_VEGAS' });
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.error, 'La placa DUP123 ya está en el sistema.');
});

prueba('13. Motos: solo celdas M; una moto sin celda no bloquea a un carro', function () {
  var e = ParkEngine.crear(datosMixtos(1, 0));       // 1 celda de carro, 0 de moto
  e.llegar({ placa: 'MOT12A', conductor: 'Ana', acceso: 'REGIONAL' });   // primera en llegar
  e.avanzar(1);
  e.llegar({ placa: 'CAR123', conductor: 'Beto', acceso: 'LAS_VEGAS' });
  var moto = e.state.vehiculos.filter(function (v) { return v.placa === 'MOT12A'; })[0];
  var carro = e.state.vehiculos.filter(function (v) { return v.placa === 'CAR123'; })[0];
  assert.strictEqual(moto.celdaId, null, 'la moto no recibe celda de carro');
  assert.strictEqual(carro.celdaId, 'A-01', 'el carro no queda bloqueado por la moto');
  var e2 = ParkEngine.crear(datosMixtos(0, 1));
  e2.llegar({ placa: 'CAR124', conductor: 'Ana', acceso: 'REGIONAL' });
  assert.strictEqual(e2.state.vehiculos[0].celdaId, null, 'el carro no recibe celda de moto');
  e2.llegar({ placa: 'MOT12B', conductor: 'Beto', acceso: 'REGIONAL' });
  assert.strictEqual(e2.state.vehiculos[1].celdaId, 'M-01');
  e2.verificarInvariantes();
});

prueba('14. Datos de la demo: dos entradas por parqueadero; 60 min de guion sin romper invariantes', function () {
  var e = ParkEngine.crear(ParkData);
  assert.deepStrictEqual(Object.keys(e.state.pasarelas).sort(),
    ['CALLE4', 'CARRERA49', 'GUAYABOS', 'LAS_VEGAS', 'LOMA', 'REGIONAL'],
    'debe haber 6 accesos, dos por parqueadero');
  assert.strictEqual(e.state.pasarelas.REGIONAL.length, 3);
  assert.strictEqual(e.state.afuera.REGIONAL.length, 1);
  assert.strictEqual(e.state.pasarelas.CALLE4.length, 1, 'la segunda entrada del Principal tiene su propia fila');
  e.activarDebug(true);
  e.setAutoPorteria(true);
  e.avanzar(60);
  e.verificarInvariantes();
  var motos = e.state.vehiculos.filter(function (v) { return v.placa === 'MOT12A' || v.placa === 'MOT34B'; });
  assert.strictEqual(motos.length, 2, 'las dos motos del guion llegaron');
  motos.forEach(function (m) { if (m.celdaId) assert.strictEqual(m.celdaId.charAt(0), 'M'); });
});

prueba('15. Inspección del operador: exige recepción y datos válidos', function () {
  var e = ParkEngine.crear(datos({ nCeldas: 2 }));
  e.llegar({ placa: 'INS123', conductor: 'Laura', acceso: 'REGIONAL', valet: true });
  e.valetPagar('INS123', 'TARJETA');

  // antes de entregar el carro al operador no se puede inspeccionar
  assert.strictEqual(e.valetInspeccionar('INS123', { combustible: '1/2', km: 1000, fotos: [] }).ok, false);

  e.valetAceptar('INS123', 'Luisa Mejía');
  assert.strictEqual(e.valetEntregar('INS123').ok, true);
  assert.strictEqual(e.valetInspeccionar('INS123', { combustible: '1/2', km: -5, fotos: [] }).error,
    'Los kilómetros deben ser un número mayor o igual a 0.');
  var cinco = ['Frontal', 'Trasera', 'Lat. izq.', 'Lat. der.', 'Tablero'].map(function (vista) {
    return { vista: vista, dataUrl: 'data:image/jpeg;base64,AAAA' };
  });
  assert.strictEqual(e.valetInspeccionar('INS123', { combustible: '1/2', km: 900, fotos: cinco }).error,
    'Máximo 4 fotos por inspección.');
  assert.strictEqual(e.valetInspeccionar('INS123', {
    combustible: '1/2', km: 900, fotos: [{ vista: 'Frontal', dataUrl: 'http://x/foto.jpg' }]
  }).ok, false);
  assert.strictEqual(e.valetInspeccionar('INS123', { combustible: 'medio', km: 900, fotos: [] }).ok, false);

  var ok = e.valetInspeccionar('INS123', {
    combustible: '3/4', km: 48320, novedades: 'Rayón leve en la puerta derecha',
    fotos: ['Frontal', 'Trasera', 'Lat. izq.', 'Tablero'].map(function (vista) {
      return { vista: vista, dataUrl: 'data:image/jpeg;base64,AAAA' };
    })
  });
  assert.strictEqual(ok.ok, true);
  var v = e.state.vehiculos.filter(function (x) { return x.placa === 'INS123'; })[0];
  assert.strictEqual(v.valet.inspeccion.combustible, '3/4');
  assert.strictEqual(v.valet.inspeccion.km, 48320);
  assert.strictEqual(v.valet.inspeccion.fotos.length, 4);
  assert.strictEqual(v.valet.inspeccion.fotos[0].vista, 'Frontal');
  assert.strictEqual(v.valet.inspeccion.novedades, 'Rayón leve en la puerta derecha');
  assert.ok(v.valet.inspeccion.hora > 0, 'la inspección guarda la hora simulada');
  assert.ok(e.state.eventos.some(function (ev) { return ev.tipo === 'VALET_INSPECCION'; }));
});

prueba('16. Entrega con PIN: traslado → bahía → PIN incorrecto → DEVUELTO con celda y casillero libres', function () {
  var e = ParkEngine.crear(datos({ nCeldas: 2 }));
  e.llegar({ placa: 'PIN123', conductor: 'Laura', acceso: 'REGIONAL', valet: true });
  var pago = e.valetPagar('PIN123', 'NEQUI');
  var v = e.state.vehiculos.filter(function (x) { return x.placa === 'PIN123'; })[0];
  assert.ok(/^VAL-\d{4}$/.test(pago.valet.ticket), 'ticket VAL-XXXX');
  assert.ok(/^\d{4}$/.test(v.valet.pin), 'PIN de 4 dígitos');
  assert.strictEqual(v.valet.tarifa, 8000);
  assert.ok(['Carlos Restrepo', 'Luisa Mejía', 'Andrés Gil'].indexOf(v.valet.operador) >= 0);

  e.valetAceptar('PIN123', 'Andrés Gil');
  e.valetEntregar('PIN123');
  e.confirmarPorteria('REGIONAL', 'PIN123');
  e.estacionar('PIN123');
  assert.strictEqual(v.valet.estado, 'LLAVES_EN_CUSTODIA');
  var casillero = v.valet.casillero;
  assert.ok(casillero >= 1 && casillero <= 30);

  assert.strictEqual(e.valetSolicitarCarro('PIN123').ok, true);
  e.avanzar(2);
  assert.strictEqual(v.valet.estado, 'EN_TRASLADO', 'a los 2 min sale en traslado');
  e.avanzar(2);
  assert.strictEqual(v.valet.estado, 'LISTO_EN_BAHIA', 'a los 2 min más está en bahía');
  assert.ok(e.state.eventos.some(function (ev) { return ev.tipo === 'VALET_LISTO'; }));

  var malo = e.valetEntregarCliente('PIN123', '0000' === v.valet.pin ? '1111' : '0000');
  assert.strictEqual(malo.ok, false);
  assert.strictEqual(malo.error, 'PIN incorrecto. Pídele al estudiante el código de 4 dígitos.');

  assert.strictEqual(e.valetEntregarCliente('PIN123', v.valet.pin).ok, true);
  assert.strictEqual(v.valet.estado, 'DEVUELTO');
  assert.strictEqual(v.valet.casillero, null, 'el casillero se libera');
  assert.strictEqual(e.state.celdas.filter(function (c) { return c.placa === 'PIN123'; }).length, 0,
    'la celda vuelve a LIBRE');
  assert.ok(e.state.celdas.some(function (c) { return c.estado === 'LIBRE'; }));
  e.verificarInvariantes();
});

prueba('17. valetListar(): sin PIN, con celda, parqueadero y casillero', function () {
  var e = ParkEngine.crear(datos({ nCeldas: 2 }));
  e.llegar({ placa: 'LIS123', conductor: 'Laura', acceso: 'REGIONAL', valet: true });
  e.valetPagar('LIS123', 'PSE');
  e.valetAceptar('LIS123', 'Carlos Restrepo');
  e.valetEntregar('LIS123');
  e.confirmarPorteria('REGIONAL', 'LIS123');
  e.estacionar('LIS123');

  var lista = e.valetListar();
  assert.strictEqual(lista.length, 1);
  var item = lista[0];
  assert.strictEqual(item.placa, 'LIS123');
  assert.strictEqual(item.estado, 'LLAVES_EN_CUSTODIA');
  assert.strictEqual(item.celdaId, 'A-01');
  assert.strictEqual(item.zona, 'A');
  assert.strictEqual(item.nombreZona, 'Zona A');
  assert.ok(item.casillero >= 1 && item.casillero <= 30);
  assert.strictEqual(item.operador !== null, true);
  assert.strictEqual(item.pin, undefined, 'el operador no debe ver el PIN');
  assert.strictEqual(JSON.stringify(item).indexOf('"pin"'), -1, 'ni dentro del JSON');

  // la lista es una copia: tocarla no cambia el motor
  item.casillero = 999;
  assert.notStrictEqual(e.valetListar()[0].casillero, 999);
});

prueba('18. Hora de llegada simulada (06:00) y clase posterior a la llegada', function () {
  var e = ParkEngine.crear(datos({ nCeldas: 2, iniciales: [parqueado('AAA111', 'A-01'), parqueado('BBB222', 'A-02')] }));
  var r = e.llegar({ placa: 'SIX123', conductor: 'Madrugador', acceso: 'REGIONAL', horaLlegada: 360, horaClase: 405 });
  assert.ok(r.ok, 'una llegada a las 06:00 es válida');
  assert.strictEqual(r.vehiculo.registradoEn, 360, 'la hora de registro es la hora de llegada');
  assert.strictEqual(e.posicion('SIX123').posicionGlobalCelda, 1);

  e.avanzar(1);
  e.llegar({ placa: 'LTE123', conductor: 'Tarde', acceso: 'LAS_VEGAS' });
  assert.strictEqual(e.posicion('SIX123').posicionGlobalCelda, 1, 'el de las 06:00 conserva el primer turno');
  assert.strictEqual(e.posicion('LTE123').posicionGlobalCelda, 2);

  e.salir('AAA111');
  var de = function (placa) { return e.state.vehiculos.filter(function (x) { return x.placa === placa; })[0]; };
  assert.ok(de('SIX123').celdaId, 'la primera celda es para quien llegó a las 06:00');
  assert.strictEqual(de('LTE123').celdaId, null);

  assert.strictEqual(e.llegar({ placa: 'FUT123', conductor: 'Ana', acceso: 'REGIONAL', horaLlegada: 500 }).ok, false,
    'no se puede registrar una llegada futura');
  assert.strictEqual(e.llegar({ placa: 'OLD123', conductor: 'Ana', acceso: 'REGIONAL', horaLlegada: 300 }).ok, false,
    'la llegada no puede ser antes de las 06:00');
  assert.strictEqual(e.llegar({ placa: 'CLS123', conductor: 'Ana', acceso: 'REGIONAL', horaLlegada: 360, horaClase: 360 }).ok, false,
    'la clase debe ser posterior a la llegada');
});

prueba('19. Retiro manual de carros que ya salieron del campus', function () {
  var e = ParkEngine.crear(datos({ nCeldas: 2, iniciales: [parqueado('AAA111', 'A-01'), parqueado('BBB222', 'A-02')] }));
  e.llegar({ placa: 'RET123', conductor: 'Ana', acceso: 'REGIONAL' });
  e.salir('AAA111');
  var v = e.state.vehiculos.filter(function (x) { return x.placa === 'RET123'; })[0];
  assert.ok(v.celdaId, 'recibió la celda liberada');
  e.confirmarPorteria('REGIONAL', 'RET123');
  e.estacionar('RET123');
  e.salir('RET123');
  assert.strictEqual(v.estado, 'SALIO');
  var r = e.retirarSalidos();
  assert.strictEqual(r.retirados, 2, 'retira los dos carros que ya salieron');
  assert.strictEqual(e.state.vehiculos.filter(function (x) { return x.placa === 'RET123'; }).length, 0);
  assert.ok(e.llegar({ placa: 'RET123', conductor: 'Ana', acceso: 'REGIONAL' }).ok, 'la placa puede volver al campus');
});

prueba('20. Purga automática: 5 min después de salir el carro deja el sistema', function () {
  var e = ParkEngine.crear(datos({ nCeldas: 1, iniciales: [parqueado('AAA111', 'A-01')] }));
  e.llegar({ placa: 'AUT123', conductor: 'Ana', acceso: 'REGIONAL' });
  e.salir('AAA111');
  e.confirmarPorteria('REGIONAL', 'AUT123');
  e.estacionar('AUT123');
  e.avanzar(1);
  e.salir('AUT123');
  e.avanzar(4);
  assert.strictEqual(e.state.vehiculos.filter(function (x) { return x.placa === 'AUT123'; }).length, 1,
    'a los 4 min todavía aparece saliendo');
  e.avanzar(1);
  assert.strictEqual(e.state.vehiculos.filter(function (x) { return x.placa === 'AUT123'; }).length, 0,
    'a los 5 min ya salió del campus');
});

prueba('21. Dos entradas del mismo parqueadero: FIFO justo y cero celdas duplicadas', function () {
  var base = datos({ nCeldas: 1, iniciales: [parqueado('AAA111', 'A-01')] });
  base.accesos.NORTE = { nombre: 'Norte', x: 50, y: 10, porteria: { x: 50, y: 10 } };
  var e = ParkEngine.crear(base);
  assert.ok(e.llegar({ placa: 'NRT111', conductor: 'Uno', acceso: 'NORTE' }).ok);
  e.avanzar(1);
  assert.ok(e.llegar({ placa: 'REG111', conductor: 'Dos', acceso: 'REGIONAL' }).ok);
  e.salir('AAA111');
  var de = function (placa) { return e.state.vehiculos.filter(function (x) { return x.placa === placa; })[0]; };
  assert.ok(de('NRT111').celdaId, 'la celda va para el primero, sin importar la entrada');
  assert.strictEqual(de('REG111').celdaId, null, 'el segundo de la fila no adelanta');
  e.verificarInvariantes();
  var porPlaca = {};
  e.state.celdas.forEach(function (c) {
    if (!c.placa) return;
    assert.ok(!porPlaca[c.placa], 'la placa ' + c.placa + ' no puede ocupar dos celdas');
    porPlaca[c.placa] = true;
  });
});

prueba('22. Valet: se puede completar el acta después de estacionar', function () {
  var e = ParkEngine.crear(datos({ nCeldas: 2, iniciales: [parqueado('AAA111', 'A-01'), parqueado('BBB222', 'A-02')] }));
  e.llegar({ placa: 'VAL123', conductor: 'Ana', acceso: 'REGIONAL', valet: true });
  e.valetSeleccionar('VAL123');
  e.valetPagar('VAL123', 'TARJETA');
  e.valetAceptar('VAL123', 'Luisa Mejía');
  e.valetEntregar('VAL123');
  e.salir('AAA111');
  assert.ok(e.valetListar()[0].celdaId, 'recibió celda');
  e.confirmarPorteria('REGIONAL', 'VAL123');
  e.estacionar('VAL123');
  var item = e.valetListar()[0];
  assert.strictEqual(item.estado, 'LLAVES_EN_CUSTODIA');
  var foto = { vista: 'Frontal', dataUrl: 'data:image/jpeg;base64,AAAA' };
  var r = e.valetInspeccionar('VAL123', { combustible: '1/2', km: 40000, novedades: 'Rayón leve', fotos: [foto] });
  assert.ok(r.ok, 'la inspección se guarda con el carro estacionado: ' + (r.error || ''));
  assert.strictEqual(e.valetListar()[0].inspeccion.fotos.length, 1);
});

console.log('\n' + pasadas + '/' + total + ' pruebas pasaron');
if (pasadas !== total) process.exitCode = 1;
