/* ParkEAFIT — datos de prueba (todo simulado).
   Script clásico: funciona abriendo el HTML con doble clic (file://). */
(function (global) {
  'use strict';

  var RELOJ_INICIAL = 450;          // 07:30 en minutos desde medianoche
  var CAPACIDAD_PASARELA = 4;       // el 5.º vehículo espera AFUERA

  var ACCESOS = {
    REGIONAL: { nombre: 'Regional', x: 0, y: 30, porteria: { x: 8, y: 30 } },
    LAS_VEGAS: { nombre: 'Las Vegas', x: 100, y: 30, porteria: { x: 92, y: 30 } }
  };

  var ZONAS = {
    A: { nombre: 'Zona A', x: 15 },
    B: { nombre: 'Zona B', x: 50 },
    C: { nombre: 'Zona C', x: 84 }
  };

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  // --- Celdas (cuadrícula 0..100 x 0..60) --------------------------------
  function generarCeldas() {
    var celdas = [];
    var xsA = [6, 12, 18, 24], ysA = [6, 18, 30, 42, 54];
    var xsB = [42, 50, 58], ysB = [10, 22, 34, 46];
    var xsC = [72, 80, 88, 96], ysC = [12, 30];
    var i;

    for (i = 0; i < 20; i++) {
      celdas.push({ id: 'A-' + pad2(i + 1), zona: 'A', x: xsA[i % 4], y: ysA[Math.floor(i / 4)], estado: 'LIBRE', placa: null });
    }
    for (i = 0; i < 12; i++) {
      celdas.push({ id: 'B-' + pad2(i + 1), zona: 'B', x: xsB[i % 3], y: ysB[Math.floor(i / 3)], estado: 'LIBRE', placa: null });
    }
    for (i = 0; i < 8; i++) {
      celdas.push({ id: 'C-' + pad2(i + 1), zona: 'C', x: xsC[i % 4], y: ysC[Math.floor(i / 4)], estado: 'LIBRE', placa: null });
    }
    return celdas;
  }

  var PLACAS_OCUPADAS = [
    'JKL102', 'MNO334', 'PQR556', 'STU778', 'VWX990', 'ABC123', 'DEF456', 'GHI789',
    'JMN234', 'PQS567', 'TVW890', 'XYZ012', 'BCD345', 'EFG678', 'HIJ901', 'KLM234',
    'NOP567', 'QRS890', 'TUV123', 'WXY456', 'ZAB789', 'CDE012', 'FGH345', 'IJK678',
    'LMN901', 'OPQ234', 'RST567', 'UVW890', 'XYA123', 'BCF456', 'DEH789', 'FGK012',
    'HJM345', 'KNP678'
  ];

  var CELDAS_LIBRES = { 'A-07': true, 'A-15': true, 'B-03': true, 'B-11': true, 'C-02': true, 'C-06': true };

  function construirCeldas() {
    var celdas = generarCeldas();
    var n = 0;
    celdas.forEach(function (c) {
      if (CELDAS_LIBRES[c.id]) return;               // 6 libres
      c.estado = 'OCUPADA';
      c.placa = PLACAS_OCUPADAS[n++];                // 34 ocupadas
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
      acceso: c.zona === 'A' ? 'REGIONAL' : (c.zona === 'C' ? 'LAS_VEGAS' : (i % 2 === 0 ? 'REGIONAL' : 'LAS_VEGAS')),
      estado: 'ESTACIONADO',
      celdaId: c.id,
      horaClase: null
    };
  });

  // Pasarelas: REGIONAL 3 + 1 afuera, LAS_VEGAS 2. Registros mezclados 07:20–07:29.
  var EN_FILA = [
    { placa: 'RGL201', conductor: 'Ana Gómez', acceso: 'REGIONAL', estado: 'EN_PASARELA', registradoEn: 440, horaClase: 470 },
    { placa: 'LVG202', conductor: 'Carlos Ruiz', acceso: 'LAS_VEGAS', estado: 'EN_PASARELA', registradoEn: 441, horaClase: 475 },
    { placa: 'RGL203', conductor: 'Diana Pérez', acceso: 'REGIONAL', estado: 'EN_PASARELA', registradoEn: 443, horaClase: 465 },
    { placa: 'LVG204', conductor: 'Elena Mora', acceso: 'LAS_VEGAS', estado: 'EN_PASARELA', registradoEn: 445, horaClase: 480 },
    { placa: 'RGL205', conductor: 'Felipe Ortiz', acceso: 'REGIONAL', estado: 'EN_PASARELA', registradoEn: 447, horaClase: 472 },
    { placa: 'RGL206', conductor: 'Gina Salas', acceso: 'REGIONAL', estado: 'AFUERA', llegadaAfueraEn: 448, horaClase: 478 }
  ];

  var VEHICULOS_INICIALES = PARQUEADOS.concat(EN_FILA);

  // --- Guion de eventos 07:30 → 08:30 -----------------------------------
  var SCRIPT = [
    // Llegadas escalonadas de la mañana
    { t: 450, tipo: 'LLEGADA', placa: 'TRX101', conductor: 'Hugo Vélez', acceso: 'REGIONAL', horaClase: 470 },
    { t: 451, tipo: 'LLEGADA', placa: 'TRX102', conductor: 'Irene Cano', acceso: 'LAS_VEGAS', horaClase: 475 },
    { t: 452, tipo: 'LLEGADA', placa: 'TRX103', conductor: 'Jorge Mesa', acceso: 'REGIONAL', horaClase: 480 },
    { t: 453, tipo: 'LLEGADA', placa: 'TRX104', conductor: 'Karina Ríos', acceso: 'LAS_VEGAS', horaClase: 472 },
    // Salidas de carros que ya estaban estacionados
    { t: 455, tipo: 'SALIDA', placa: placaEnCelda('A-01') },
    { t: 456, tipo: 'LLEGADA', placa: 'TRX105', conductor: 'Luis Pardo', acceso: 'REGIONAL', horaClase: 468 },
    { t: 457, tipo: 'SALIDA', placa: placaEnCelda('B-05') },
    { t: 458, tipo: 'LLEGADA', placa: 'TRX106', conductor: 'Marta Gil', acceso: 'LAS_VEGAS', horaClase: 490 },
    { t: 459, tipo: 'LLEGADA', placa: 'TRX107', conductor: 'Nicolás Rojas', acceso: 'REGIONAL', horaClase: 476 },
    // Ráfaga en REGIONAL: la pasarela se llena (>= 5 llegadas seguidas)
    { t: 461, tipo: 'LLEGADA', placa: 'TRX108', conductor: 'Olga Duque', acceso: 'REGIONAL', horaClase: 485 },
    { t: 462, tipo: 'LLEGADA', placa: 'TRX109', conductor: 'Pablo Sierra', acceso: 'REGIONAL', horaClase: 478 },
    { t: 462, tipo: 'SALIDA', placa: placaEnCelda('A-09') },
    { t: 463, tipo: 'LLEGADA', placa: 'TRX110', conductor: 'Rubén Castro', acceso: 'REGIONAL', horaClase: 470 },
    { t: 464, tipo: 'LLEGADA', placa: 'TRX111', conductor: 'Sara Naranjo', acceso: 'REGIONAL', horaClase: 482 },
    { t: 465, tipo: 'LLEGADA', placa: 'TRX112', conductor: 'Tomás Arango', acceso: 'REGIONAL', horaClase: 469 },
    { t: 466, tipo: 'LLEGADA', placa: 'TRX113', conductor: 'Úrsula Peña', acceso: 'REGIONAL', horaClase: 488 },
    { t: 466, tipo: 'SALIDA', placa: placaEnCelda('C-01') },
    { t: 468, tipo: 'LLEGADA', placa: 'TRX114', conductor: 'Valeria Londoño', acceso: 'REGIONAL', horaClase: 474 },
    // Un carro que sale sin estacionar (marcado al llegar)
    { t: 470, tipo: 'LLEGADA', placa: 'SNX789', conductor: 'Ana Gómez', acceso: 'REGIONAL', saleSinEstacionar: true, horaClase: 473 },
    { t: 470, tipo: 'SALIDA', placa: placaEnCelda('A-13') },
    { t: 471, tipo: 'LLEGADA', placa: 'TRX115', conductor: 'Carlos Ruiz', acceso: 'LAS_VEGAS', horaClase: 484 },
    // Un carro con valet
    { t: 472, tipo: 'LLEGADA', placa: 'VLT001', conductor: 'Diana Pérez', acceso: 'LAS_VEGAS', valet: true, horaClase: 478 },
    { t: 474, tipo: 'SALIDA', placa: placaEnCelda('B-07') },
    { t: 474, tipo: 'LLEGADA', placa: 'TRX116', conductor: 'Elena Mora', acceso: 'LAS_VEGAS', horaClase: 492 },
    { t: 476, tipo: 'LLEGADA', placa: 'TRX117', conductor: 'Felipe Ortiz', acceso: 'LAS_VEGAS', horaClase: 486 },
    { t: 478, tipo: 'SALIDA', placa: placaEnCelda('A-17') },
    { t: 478, tipo: 'LLEGADA', placa: 'TRX118', conductor: 'Gina Salas', acceso: 'REGIONAL', horaClase: 488 },
    { t: 480, tipo: 'LLEGADA', placa: 'TRX119', conductor: 'Hugo Vélez', acceso: 'LAS_VEGAS', horaClase: 495 },
    { t: 482, tipo: 'SALIDA', placa: placaEnCelda('C-05') },
    { t: 483, tipo: 'LLEGADA', placa: 'TRX120', conductor: 'Irene Cano', acceso: 'REGIONAL', horaClase: 497 },
    { t: 486, tipo: 'LLEGADA', placa: 'TRX121', conductor: 'Jorge Mesa', acceso: 'LAS_VEGAS', horaClase: 495 },
    { t: 486, tipo: 'SALIDA', placa: placaEnCelda('B-09') },
    { t: 490, tipo: 'LLEGADA', placa: 'TRX122', conductor: 'Karina Ríos', acceso: 'REGIONAL', horaClase: 500 },
    { t: 492, tipo: 'SALIDA', placa: placaEnCelda('A-19') },
    { t: 495, tipo: 'LLEGADA', placa: 'TRX123', conductor: 'Luis Pardo', acceso: 'LAS_VEGAS', horaClase: 505 },
    { t: 498, tipo: 'SALIDA', placa: placaEnCelda('B-01') },
    { t: 500, tipo: 'LLEGADA', placa: 'TRX124', conductor: 'Marta Gil', acceso: 'REGIONAL', horaClase: 512 },
    { t: 504, tipo: 'SALIDA', placa: placaEnCelda('C-07') },
    { t: 505, tipo: 'LLEGADA', placa: 'TRX125', conductor: 'Nicolás Rojas', acceso: 'LAS_VEGAS', horaClase: 515 },
    { t: 508, tipo: 'SALIDA', placa: placaEnCelda('A-05') }
  ].sort(function (a, b) { return a.t - b.t; }); // orden estable en Node/Chrome modernos

  // --- Perfil histórico (inventado, fuente simulada) --------------------
  var HISTORICO = [
    { hora: 6, ocupacionPct: 12, salidasPorMin: 0.15 },
    { hora: 7, ocupacionPct: 45, salidasPorMin: 0.40 },
    { hora: 8, ocupacionPct: 82, salidasPorMin: 0.50 },
    { hora: 9, ocupacionPct: 74, salidasPorMin: 0.45 },
    { hora: 10, ocupacionPct: 61, salidasPorMin: 0.30 },
    { hora: 11, ocupacionPct: 58, salidasPorMin: 0.28 },
    { hora: 12, ocupacionPct: 76, salidasPorMin: 0.42 },
    { hora: 13, ocupacionPct: 79, salidasPorMin: 0.45 },
    { hora: 14, ocupacionPct: 68, salidasPorMin: 0.35 },
    { hora: 15, ocupacionPct: 41, salidasPorMin: 0.18 },
    { hora: 16, ocupacionPct: 33, salidasPorMin: 0.14 },
    { hora: 17, ocupacionPct: 47, salidasPorMin: 0.25 },
    { hora: 18, ocupacionPct: 29, salidasPorMin: 0.12 },
    { hora: 19, ocupacionPct: 12, salidasPorMin: 0.06 },
    { hora: 20, ocupacionPct: 5, salidasPorMin: 0.03 }
  ].map(function (f) { return { hora: f.hora, ocupacionPct: f.ocupacionPct, salidasPorMin: f.salidasPorMin, fuente: 'simulado' }; });

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
