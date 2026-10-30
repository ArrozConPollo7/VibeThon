/* Runner de los casos de ejemplo (tests/casos.json).
   Ejecutar con:  node tests/casos.test.js
   Sin librerías. Cada caso corre sobre un motor nuevo y verifica invariantes tras cada paso. */
'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var ParkData = require('../src/data.js');
var ParkEngine = require('../src/engine.js');

var casos = JSON.parse(fs.readFileSync(path.join(__dirname, 'casos.json'), 'utf8'));

/* Datos controlables para los casos: por defecto 6 celdas de carro en la zona A. */
function datos(opciones) {
  opciones = opciones || {};
  var celdas = [];
  var i;
  var nCeldas = opciones.nCeldas != null ? opciones.nCeldas : 6;
  var nCeldasOtra = opciones.nCeldasOtra != null ? opciones.nCeldasOtra : 0;   // zona I
  var nMotos = opciones.nCeldasMoto != null ? opciones.nCeldasMoto : 0;

  for (i = 1; i <= nCeldas; i++) {
    celdas.push({ id: 'A-' + (i < 10 ? '0' : '') + i, zona: 'A', tipo: 'CARRO', x: 10 + i * 3, y: 20, estado: 'LIBRE', placa: null });
  }
  for (i = 1; i <= nCeldasOtra; i++) {
    celdas.push({ id: 'I-' + (i < 10 ? '0' : '') + i, zona: 'I', tipo: 'CARRO', x: 200 + i * 3, y: 60, estado: 'LIBRE', placa: null });
  }
  for (i = 1; i <= nMotos; i++) {
    celdas.push({ id: 'M-' + (i < 10 ? '0' : '') + i, zona: 'M', tipo: 'MOTO', x: 0, y: 0, estado: 'LIBRE', placa: null });
  }

  (opciones.iniciales || []).forEach(function (v) {
    celdas.forEach(function (c) {
      if (c.id === v.celdaId) { c.estado = 'OCUPADA'; c.placa = v.placa; }
    });
  });

  return {
    relojInicial: 440,
    capacidadPasarela: 4,
    accesos: {
      REGIONAL: { nombre: 'Regional', x: 0, y: 30, porteria: { x: 8, y: 30 } },
      LAS_VEGAS: { nombre: 'Las Vegas', x: 100, y: 30, porteria: { x: 92, y: 30 } }
    },
    zonas: { A: { nombre: 'Principal', x: 15 }, I: { nombre: 'Ingeniería', x: 200 }, M: { nombre: 'Motos', x: 5 } },
    celdas: celdas,
    vehiculosIniciales: opciones.iniciales || [],
    script: [],
    historico: ParkData.HISTORICO,
    semilla: 777
  };
}

function valorEn(obj, ruta) {
  return String(ruta).split('.').reduce(function (acc, clave) {
    return acc == null ? acc : acc[clave];
  }, obj);
}

function buscar(engine, placa) {
  var v = engine.state.vehiculos.filter(function (x) { return x.placa === placa; })[0];
  assert.ok(v, 'no existe el vehículo ' + placa);
  return v;
}

var pasadas = 0;

casos.forEach(function (caso) {
  try {
    var base = caso.datos === 'demo' ? ParkData : datos(caso.datos);
    var engine = ParkEngine.crear(base);
    engine.activarDebug(true);

    (caso.pasos || []).forEach(function (paso, indice) {
      var contexto = 'paso ' + (indice + 1) + ' (' + paso.accion + ')';
      var resultado;
      if (paso.accion === '__determinismo') {
        var a = ParkEngine.crear(caso.datos === 'demo' ? ParkData : datos(caso.datos));
        var b = ParkEngine.crear(caso.datos === 'demo' ? ParkData : datos(caso.datos));
        a.avanzar(paso.minutos || 60);
        b.avanzar(paso.minutos || 60);
        assert.strictEqual(a.exportarJSON(), b.exportarJSON(), 'los dos motores deben dar el mismo JSON');
        return;
      }
      if (paso.accion) {
        var args = paso.args === undefined ? [] : (Array.isArray(paso.args) ? paso.args : [paso.args]);
        args = args.map(function (a) {
          if (a && typeof a === 'object' && a.$pin) return buscar(engine, a.$pin).valet.pin;
          return a;
        });
        assert.strictEqual(typeof engine[paso.accion], 'function', contexto + ': no existe la acción ' + paso.accion);
        resultado = engine[paso.accion].apply(null, args);
        engine.verificarInvariantes();
      }
      if (paso.espera) {
        Object.keys(paso.espera).forEach(function (clave) {
          assert.deepStrictEqual(valorEn(resultado, clave), paso.espera[clave],
            contexto + ': esperaba ' + clave + ' = ' + JSON.stringify(paso.espera[clave]) +
            ' y obtuve ' + JSON.stringify(valorEn(resultado, clave)));
        });
      }
      if (paso.verificar) {
        var v = buscar(engine, paso.verificar.placa);
        Object.keys(paso.verificar).forEach(function (clave) {
          if (clave === 'placa') return;
          assert.deepStrictEqual(valorEn(v, clave), paso.verificar[clave],
            contexto + ': ' + paso.verificar.placa + '.' + clave + ' esperaba ' +
            JSON.stringify(paso.verificar[clave]) + ' y obtuve ' + JSON.stringify(valorEn(v, clave)));
        });
      }
    });

    pasadas++;
    console.log('✅ ' + caso.id + ' — ' + caso.titulo);
  } catch (e) {
    console.log('❌ ' + caso.id + ' — ' + caso.titulo + ' → ' + e.message);
  }
});

console.log('\n' + pasadas + '/' + casos.length + ' casos pasaron');
if (pasadas !== casos.length) process.exitCode = 1;
