/* ParkEAFIT — caso de demo reproducible: los números de la presentación salen del motor.
   Uso: node tools/demo_caso.js */
var ParkData = require('../src/data.js');
var ParkEngine = require('../src/engine.js');
var e = ParkEngine.crear(ParkData);
var H = ParkEngine.horaTexto;
function v(p) { return e.state.vehiculos.filter(function (x) { return x.placa === p; })[0]; }
function linea(t) { console.log('\n[' + H(e.state.clock) + '] ' + t); }
function estado(p) {
  var x = v(p), pos = e.posicion(p), est = e.estimarEspera(p), cl = e.llegoAClase(p);
  console.log('   ' + p + ' · ' + x.estado + (x.celdaId ? ' · celda ' + x.celdaId : '') +
    (pos && pos.posicionEnPasarela ? ' · posición ' + pos.posicionEnPasarela + ' (' + pos.delante + ' delante, ' + pos.detras + ' detrás)' : '') +
    (pos && pos.afueraDelante != null ? ' · AFUERA, ' + pos.delante + ' delante' : '') +
    (est && est.texto ? ' · espera ' + est.texto : '') + (cl && cl.texto && cl.aTiempo != null ? ' · ' + cl.texto : '') +
    (x.valet ? ' · valet ' + x.valet.estado + (x.valet.casillero ? ' casillero ' + x.valet.casillero : '') : ''));
}

linea('Estado inicial');
var r = e.resumen();
console.log('   Libres: ' + r.libres + ' de ' + r.total + ' (carro ' + r.libresPorTipo.CARRO + ', moto ' + r.libresPorTipo.MOTO + ')');
['REGIONAL', 'LAS_VEGAS'].forEach(function (a) {
  console.log('   ' + a + ': pasarela ' + r.accesos[a].enPasarela + '/4, afuera ' + r.accesos[a].afuera + ', espera ' + r.accesos[a].esperaTexto);
});
var rg = v('RGL206');
console.log('   Reparto justo: RGL206 entró por Regional y recibió ' + rg.celdaId + ' → ' + e.ruta('RGL206').pasos.join(' '));

e.setAutoPorteria(true);
e.avanzar(11);
linea('Mateo (sin valet) registra MAT456 por Regional, clase 08:30');
console.log('   ' + JSON.stringify(e.llegar({ placa: 'MAT456', conductor: 'Mateo Ríos', acceso: 'REGIONAL', horaClase: 510 }).ok));
e.avanzar(1);
linea('Laura registra LAU123 por Regional, clase 08:00');
var res = e.llegar({ placa: 'LAU123', conductor: 'Laura Gómez', acceso: 'REGIONAL', horaClase: 480 });
console.log('   ok=' + res.ok + (res.error ? ' ' + res.error : ''));
estado('MAT456'); estado('LAU123');
var cl = e.llegoAClase('LAU123');
console.log('   ¿Llega a clase? ' + JSON.stringify(cl));

linea('Laura usa valet');
console.log('   seleccionar: ' + JSON.stringify(e.valetSeleccionar('LAU123')).slice(0, 80));
console.log('   pagar RECHAZO: ' + JSON.stringify(e.valetPagar('LAU123', 'RECHAZO')));
console.log('   pagar NEQUI: ok=' + e.valetPagar('LAU123', 'NEQUI').ok);
var ent = e.valetEntregar('LAU123');
console.log('   entregar: ok=' + ent.ok + ' código ' + (ent.valet && ent.valet.codigo));
var entregaEn = e.state.clock;
console.log('   Laura camina a clase: llega a las ' + H(entregaEn + 5) + ' (5 min a pie) para su clase de las 08:00.');

var asignadoMat = null, asignadoLau = null, i;
for (i = 0; i < 90; i++) {
  e.avanzar(1);
  if (!asignadoMat && v('MAT456').celdaId) { asignadoMat = e.state.clock; linea('MAT456 recibe ' + v('MAT456').celdaId); }
  if (!asignadoLau && v('LAU123').celdaId) { asignadoLau = e.state.clock; linea('LAU123 (valet) recibe ' + v('LAU123').celdaId); }
  if (v('LAU123').valet.estado === 'LLAVES_EN_CUSTODIA') break;
}
estado('LAU123');
console.log('   Pasos: ' + (v('LAU123').celdaId ? e.ruta('LAU123').pasos.join(' ') : '—'));

linea('Resumen para la presentación');
var esperaLau = asignadoLau != null ? asignadoLau - entregaEn : null;
console.log('   Mateo (registró 1 min antes) recibió celda a las ' + (asignadoMat ? H(asignadoMat) : '—') +
  '; Laura (valet) a las ' + (asignadoLau ? H(asignadoLau) : '—') + ' → el valet NO dio prioridad: ' + (asignadoMat != null && asignadoLau != null && asignadoMat <= asignadoLau));
console.log('   Sin valet Laura habría esperado ~' + esperaLau + ' min en la fila y llegaría a clase a las ' +
  (asignadoLau ? H(asignadoLau + 2 + 5) : '—') + '; con valet llegó a las ' + H(entregaEn + 5) + '.');
var j = e.resumen().justicia;
console.log('   Medidor de justicia: Regional ' + j.REGIONAL.asignadas + ' celdas, espera prom. ' + j.REGIONAL.esperaPromedioMin +
  ' min · Las Vegas ' + j.LAS_VEGAS.asignadas + ' celdas, espera prom. ' + j.LAS_VEGAS.esperaPromedioMin + ' min');
e.verificarInvariantes();
console.log('   Invariantes: OK (ninguna celda duplicada)');
