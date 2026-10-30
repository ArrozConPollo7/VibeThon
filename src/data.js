/* ParkEAFIT — datos de prueba (todo simulado).
   Script clásico: funciona abriendo el HTML con doble clic (file://). */
(function (global) {
  'use strict';

  var RELOJ_INICIAL = 450;          // 07:30 en minutos desde medianoche
  var CAPACIDAD_PASARELA = 4;       // el 5.º vehículo espera AFUERA

  // Coordenadas reales del mapa (890×1076 px). Cada acceso llega primero a su parqueadero.
  var MAPA = (typeof module !== 'undefined' && module.exports) ? require('./mapa-datos.js') : global.ParkMapaDatos;
  if (!MAPA) throw new Error('Falta src/mapa-datos.js: cárgalo antes de src/data.js en index.html.');

  // Dos entradas por parqueadero: así se prueba la coordinación entre accesos del mismo lote
  // y el reparto justo (o duplicado) de celdas cuando llegan carros por vías distintas.
  var ACCESOS = {
    REGIONAL:  { nombre: 'Regional',     lote: 'N', x: 214, y: 240,  porteria: { x: 214, y: 240 } },
    CALLE4:    { nombre: 'Calle 4 Sur',  lote: 'N', x: 506, y: 60,   porteria: { x: 506, y: 60 } },
    LAS_VEGAS: { nombre: 'Las Vegas',    lote: 'I', x: 330, y: 1062, porteria: { x: 330, y: 1062 } },
    CARRERA49: { nombre: 'Carrera 49',   lote: 'I', x: 152, y: 985,  porteria: { x: 152, y: 985 } },
    GUAYABOS:  { nombre: 'Guayabos',     lote: 'G', x: 836, y: 318,  porteria: { x: 836, y: 318 } },
    LOMA:      { nombre: 'Loma',         lote: 'G', x: 700, y: 175,  porteria: { x: 700, y: 175 } }
  };

  var ZONAS = {
    N: { nombre: 'Parqueadero Principal' },
    I: { nombre: 'Parqueadero de Ingeniería' },
    G: { nombre: 'Parqueadero de Idiomas (Los Guayabos)' },
    M: { nombre: 'Motos · Ingeniería' }
  };

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  // --- Celdas: las 880 del mapa (Principal + Ingeniería + Idiomas) + 10 de moto ----
  // Las celdas PMR (movilidad reducida) y ECO (baja emisión) existen en el mapa pero el
  // motor no las asigna a carros generales: su tipo no coincide con CARRO ni MOTO.
  var TIPO_POR_CLASE = { general: 'CARRO', pmr: 'PMR', eco: 'ECO', prov: 'PROV' };

  function generarCeldas() {
    var celdas = MAPA.celdas.map(function (c) {
      return { id: c[0], zona: c[1], tipo: TIPO_POR_CLASE[c[2]] || 'CARRO', orden: c[3], x: c[4], y: c[5], estado: 'LIBRE', placa: null };
    });
    for (var i = 0; i < 10; i++) {
      celdas.push({ id: 'M-' + pad2(i + 1), zona: 'M', tipo: 'MOTO', orden: i + 1, x: 300 + i * 6, y: 1000, estado: 'LIBRE', placa: null });
    }
    return celdas;
  }

  // Escasez realista: casi todo ocupado a las 07:30. Libres: 11 de carro, 2 especiales, 3 de moto.
  // Con dos entradas por parqueadero hay más carros en fila, así que quedan 2 celdas libres al arrancar.
  var CELDAS_LIBRES = {
    'N-150': true, 'N-320': true, 'N-410': true, 'N-240': true, 'I-060': true, 'I-120': true, 'I-170': true, 'I-030': true,
    'G-210': true, 'G-150': true, 'G-250': true,
    'N-002': true, 'I-005': true,
    'M-04': true, 'M-08': true, 'M-10': true
  };

  function placaGenerada(n, moto) {
    var L = 'BCDFGHJKLMNPQSTVWXYZ';
    var a = L[n % 20], b = L[Math.floor(n / 20) % 20], c = moto ? 'M' : 'K';
    return moto ? c + a + b + pad2(n % 100) + 'E' : c + a + b + String(100 + (n * 7) % 900);
  }

  function construirCeldas() {
    var celdas = generarCeldas();
    var n = 0, m = 0, usadas = {};
    celdas.forEach(function (c) {
      if (CELDAS_LIBRES[c.id]) return;
      var placa;
      do { placa = c.tipo === 'MOTO' ? placaGenerada(m++, true) : placaGenerada(n++, false); } while (usadas[placa]);
      usadas[placa] = true;
      c.estado = 'OCUPADA';
      c.placa = placa;
    });
    return celdas;
  }

  var CELDAS = construirCeldas();

  function celdaPorId(id) {
    var encontrada = null;
    CELDAS.forEach(function (c) { if (c.id === id) encontrada = c; });
    return encontrada;
  }

  function placaEnCelda(id) {
    var c = celdaPorId(id);
    return c ? c.placa : null;
  }

  // --- Conductores (nombres de relleno, deterministas) -------------------
  var CONDUCTORES = [
    'Ana Gómez', 'Carlos Ruiz', 'Diana Pérez', 'Elena Mora', 'Felipe Ortiz',
    'Gina Salas', 'Hugo Vélez', 'Irene Cano', 'Jorge Mesa', 'Karina Ríos',
    'Luis Pardo', 'Marta Gil', 'Nicolás Rojas', 'Olga Duque', 'Pablo Sierra',
    'Rubén Castro', 'Sara Naranjo', 'Tomás Arango', 'Úrsula Peña', 'Valeria Londoño'
  ];

  // --- Vehículos iniciales: 34 ya estacionados + filas con gente ---------
  var PARQUEADOS = CELDAS.filter(function (c) { return c.estado === 'OCUPADA'; }).map(function (c, i) {
    return {
      placa: c.placa,
      conductor: CONDUCTORES[i % CONDUCTORES.length],
      tipo: c.tipo,
      acceso: c.zona === 'I' ? 'LAS_VEGAS' : c.zona === 'G' ? 'GUAYABOS' : 'REGIONAL',
      estado: 'ESTACIONADO',
      celdaId: c.id,
      horaClase: null
    };
  });

  // Pasarelas: REGIONAL 4 (3 en fila + 1 afuera), CALLE4 1, LAS_VEGAS 2, CARRERA49 1, GUAYABOS 1, LOMA 1.
  // Registros mezclados 07:20–07:29 y por las dos entradas de cada lote.
  var EN_FILA = [
    { placa: 'RGL201', conductor: 'Ana Gómez', acceso: 'REGIONAL', estado: 'EN_PASARELA', registradoEn: 440, horaClase: 470 },
    { placa: 'LVG202', conductor: 'Carlos Ruiz', acceso: 'LAS_VEGAS', estado: 'EN_PASARELA', registradoEn: 441, horaClase: 475 },
    { placa: 'GUY302', conductor: 'Diana Pérez', acceso: 'GUAYABOS', estado: 'EN_PASARELA', registradoEn: 442, horaClase: 468 },
    { placa: 'RGL203', conductor: 'Elena Mora', acceso: 'REGIONAL', estado: 'EN_PASARELA', registradoEn: 443, horaClase: 465 },
    { placa: 'LOM303', conductor: 'Felipe Ortiz', acceso: 'LOMA', estado: 'EN_PASARELA', registradoEn: 444, horaClase: 472 },
    { placa: 'LVG204', conductor: 'Gina Salas', acceso: 'LAS_VEGAS', estado: 'EN_PASARELA', registradoEn: 445, horaClase: 480 },
    { placa: 'CAR301', conductor: 'Hugo Vélez', acceso: 'CARRERA49', estado: 'EN_PASARELA', registradoEn: 446, horaClase: 478 },
    { placa: 'RGL205', conductor: 'Irene Cano', acceso: 'REGIONAL', estado: 'EN_PASARELA', registradoEn: 447, horaClase: 472 },
    { placa: 'CL4301', conductor: 'Jorge Mesa', acceso: 'CALLE4', estado: 'EN_PASARELA', registradoEn: 448, horaClase: 476 },
    { placa: 'RGL207', conductor: 'Karina Ríos', acceso: 'REGIONAL', estado: 'AFUERA', llegadaAfueraEn: 449, horaClase: 485 }
  ];

  var VEHICULOS_INICIALES = PARQUEADOS.concat(EN_FILA);

  // --- Guion de eventos 07:30 → 08:30 -----------------------------------
  var SCRIPT = [
    // Llegadas escalonadas de la mañana
    { t: 450, tipo: 'LLEGADA', placa: 'TRX101', conductor: 'Hugo Vélez', acceso: 'REGIONAL', horaClase: 470 },
    { t: 451, tipo: 'LLEGADA', placa: 'TRX102', conductor: 'Irene Cano', acceso: 'LAS_VEGAS', horaClase: 475 },
    { t: 452, tipo: 'LLEGADA', placa: 'TRX103', conductor: 'Jorge Mesa', acceso: 'CALLE4', horaClase: 480 },
    { t: 453, tipo: 'LLEGADA', placa: 'TRX104', conductor: 'Karina Ríos', acceso: 'CARRERA49', horaClase: 472 },
    // Salidas de carros que ya estaban estacionados
    { t: 455, tipo: 'SALIDA', placa: placaEnCelda('N-030') },
    { t: 456, tipo: 'LLEGADA', placa: 'TRX105', conductor: 'Luis Pardo', acceso: 'REGIONAL', horaClase: 468 },
    { t: 457, tipo: 'SALIDA', placa: placaEnCelda('I-040') },
    { t: 458, tipo: 'LLEGADA', placa: 'TRX106', conductor: 'Marta Gil', acceso: 'GUAYABOS', horaClase: 490 },
    { t: 459, tipo: 'LLEGADA', placa: 'TRX107', conductor: 'Nicolás Rojas', acceso: 'CALLE4', horaClase: 476 },
    // Ráfaga en REGIONAL: la pasarela se llena (>= 5 llegadas seguidas)
    { t: 461, tipo: 'LLEGADA', placa: 'TRX108', conductor: 'Olga Duque', acceso: 'REGIONAL', horaClase: 485 },
    { t: 462, tipo: 'LLEGADA', placa: 'TRX109', conductor: 'Pablo Sierra', acceso: 'LOMA', horaClase: 478 },
    { t: 462, tipo: 'SALIDA', placa: placaEnCelda('N-060') },
    { t: 463, tipo: 'LLEGADA', placa: 'TRX110', conductor: 'Rubén Castro', acceso: 'REGIONAL', horaClase: 470 },
    { t: 464, tipo: 'LLEGADA', placa: 'TRX111', conductor: 'Sara Naranjo', acceso: 'CALLE4', horaClase: 482 },
    { t: 465, tipo: 'LLEGADA', placa: 'TRX112', conductor: 'Tomás Arango', acceso: 'GUAYABOS', horaClase: 469 },
    { t: 466, tipo: 'LLEGADA', placa: 'TRX113', conductor: 'Úrsula Peña', acceso: 'CARRERA49', horaClase: 488 },
    { t: 466, tipo: 'SALIDA', placa: placaEnCelda('I-010') },
    { t: 468, tipo: 'LLEGADA', placa: 'TRX114', conductor: 'Valeria Londoño', acceso: 'REGIONAL', horaClase: 474 },
    // Un carro que sale sin estacionar (marcado al llegar)
    { t: 470, tipo: 'LLEGADA', placa: 'SNX789', conductor: 'Ana Gómez', acceso: 'REGIONAL', saleSinEstacionar: true, horaClase: 473 },
    { t: 470, tipo: 'SALIDA', placa: placaEnCelda('N-090') },
    // Dos motos: van a la Zona M y no frenan a los carros
    { t: 460, tipo: 'LLEGADA', placa: 'MOT12A', conductor: 'Sara Naranjo', acceso: 'LAS_VEGAS', horaClase: 480 },
    { t: 467, tipo: 'LLEGADA', placa: 'MOT34B', conductor: 'Tomás Arango', acceso: 'REGIONAL', horaClase: 490 },
    { t: 471, tipo: 'LLEGADA', placa: 'TRX115', conductor: 'Carlos Ruiz', acceso: 'LAS_VEGAS', horaClase: 484 },
    // Un carro con valet
    { t: 472, tipo: 'LLEGADA', placa: 'VLT001', conductor: 'Diana Pérez', acceso: 'LAS_VEGAS', valet: true, horaClase: 478 },
    { t: 474, tipo: 'SALIDA', placa: placaEnCelda('I-080') },
    { t: 474, tipo: 'LLEGADA', placa: 'TRX116', conductor: 'Elena Mora', acceso: 'LAS_VEGAS', horaClase: 492 },
    { t: 476, tipo: 'LLEGADA', placa: 'TRX117', conductor: 'Felipe Ortiz', acceso: 'LOMA', horaClase: 486 },
    { t: 478, tipo: 'SALIDA', placa: placaEnCelda('N-120') },
    { t: 478, tipo: 'LLEGADA', placa: 'TRX118', conductor: 'Gina Salas', acceso: 'REGIONAL', horaClase: 488 },
    { t: 480, tipo: 'LLEGADA', placa: 'TRX119', conductor: 'Hugo Vélez', acceso: 'LAS_VEGAS', horaClase: 495 },
    { t: 482, tipo: 'SALIDA', placa: placaEnCelda('I-025') },
    { t: 483, tipo: 'LLEGADA', placa: 'TRX120', conductor: 'Irene Cano', acceso: 'CARRERA49', horaClase: 497 },
    { t: 486, tipo: 'LLEGADA', placa: 'TRX121', conductor: 'Jorge Mesa', acceso: 'GUAYABOS', horaClase: 495 },
    { t: 486, tipo: 'SALIDA', placa: placaEnCelda('I-100') },
    { t: 490, tipo: 'LLEGADA', placa: 'TRX122', conductor: 'Karina Ríos', acceso: 'REGIONAL', horaClase: 500 },
    { t: 492, tipo: 'SALIDA', placa: placaEnCelda('N-200') },
    { t: 495, tipo: 'LLEGADA', placa: 'TRX123', conductor: 'Luis Pardo', acceso: 'LAS_VEGAS', horaClase: 505 },
    { t: 498, tipo: 'SALIDA', placa: placaEnCelda('I-140') },
    { t: 500, tipo: 'LLEGADA', placa: 'TRX124', conductor: 'Marta Gil', acceso: 'CALLE4', horaClase: 512 },
    { t: 504, tipo: 'SALIDA', placa: placaEnCelda('I-055') },
    { t: 505, tipo: 'LLEGADA', placa: 'TRX125', conductor: 'Nicolás Rojas', acceso: 'LOMA', horaClase: 515 },
    { t: 508, tipo: 'SALIDA', placa: placaEnCelda('N-015') }
  ].sort(function (a, b) { return a.t - b.t; }); // orden estable en Node/Chrome modernos

  // --- Perfil histórico (inventado, fuente simulada) --------------------
  // Forma fijada en TAREA_01B §2: mapas hora → valor.
  var HISTORICO = {
    fuente: 'simulado',
    ocupacion: { 6: 15, 7: 80, 8: 95, 9: 88, 10: 70, 11: 66, 12: 86, 13: 90, 14: 74, 15: 42, 16: 35, 17: 50, 18: 30, 19: 14, 20: 6 },
    salidasPorMin: { 6: 0.15, 7: 0.40, 8: 0.50, 9: 0.45, 10: 0.30, 11: 0.28, 12: 0.42, 13: 0.45, 14: 0.35, 15: 0.18, 16: 0.14, 17: 0.25, 18: 0.12, 19: 0.06, 20: 0.03 }
  };

  var ParkData = {
    relojInicial: RELOJ_INICIAL,
    capacidadPasarela: CAPACIDAD_PASARELA,
    accesos: ACCESOS,
    zonas: ZONAS,
    celdas: CELDAS,
    vehiculosIniciales: VEHICULOS_INICIALES,
    script: SCRIPT,
    historico: HISTORICO,
    semilla: 20261030
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = ParkData;
  else global.ParkData = ParkData;
})(typeof window !== 'undefined' ? window : this);
