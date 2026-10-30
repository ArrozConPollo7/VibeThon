// Motor de prueba de ParkEAFIT.
// Implementa la API de la sección 9 de docs/TAREA_01_MOTOR_HERMES.md con datos falsos pero coherentes.
// Solo se activa si src/engine.js (Hermes) no definió window.ParkEngine.
if (!window.ParkEngine) {
  (function () {
    const CAPACIDAD = 4;
    const PORTERIAS = { REGIONAL: { x: 8, y: 30 }, LAS_VEGAS: { x: 92, y: 30 } };
    const ACCESOS = { REGIONAL: { x: 0, y: 30 }, LAS_VEGAS: { x: 100, y: 30 } };
    const NOMBRE_ACCESO = { REGIONAL: 'Regional', LAS_VEGAS: 'Las Vegas' };
    const LIBRES_INICIALES = ['A-07', 'A-15', 'B-03', 'B-11', 'C-02', 'C-06', 'M-03', 'M-06', 'M-09'];
    const FILAS_Y = [10, 19, 41, 50];
    const FILAS_MOTO_Y = [7, 13, 19, 41, 47];
    const RE_CARRO = /^[A-Z]{3}[0-9]{3}$/;
    const RE_MOTO = /^[A-Z]{3}[0-9]{2}[A-Z]$/;
    const RE_NOMBRE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]{2,40}$/;
    const FACTOR_TASA_MOTO = 0.3;
    const POLITICA_TEXTO =
      'La celda es para quien registró primero su llegada, sin importar por qué acceso entró. El orden de cada fila siempre se respeta. El valet no da prioridad.';

    const HISTORICO = {
      fuente: 'simulado',
      ocupacion: { 6: 30, 7: 78, 8: 95, 9: 88, 10: 70, 11: 74, 12: 90, 13: 92, 14: 80, 15: 55, 16: 50, 17: 62, 18: 45, 19: 30, 20: 18 },
      salidasPorMin: { 6: 0.1, 7: 0.2, 8: 0.3, 9: 0.4, 10: 0.5, 11: 0.5, 12: 0.7, 13: 0.6, 14: 0.5, 15: 0.5, 16: 0.5, 17: 0.4, 18: 0.6, 19: 0.6, 20: 0.7 }
    };

    function crearCeldas() {
      const zona = (letra, cantidad, columnas) =>
        Array.from({ length: cantidad }, (_, i) => {
          const fila = Math.floor(i / (cantidad / 4));
          const col = i % (cantidad / 4);
          return { id: `${letra}-${String(i + 1).padStart(2, '0')}`, zona: letra, tipo: 'CARRO', x: columnas[col], y: FILAS_Y[fila] };
        });
      const motos = Array.from({ length: 10 }, (_, i) => ({
        id: `M-${String(i + 1).padStart(2, '0')}`,
        zona: 'M',
        tipo: 'MOTO',
        x: i < 5 ? 62 : 66.5,
        y: FILAS_MOTO_Y[i % 5]
      }));
      const celdas = [
        ...zona('A', 20, [15, 20, 25, 30, 35]),
        ...zona('B', 12, [45, 51, 57]),
        ...zona('C', 8, [73, 80]),
        ...motos
      ];
      return celdas.map((c, i) => {
        const libre = LIBRES_INICIALES.includes(c.id);
        return { ...c, estado: libre ? 'LIBRE' : 'OCUPADA', placa: libre ? null : `OCP${String(100 + i)}` };
      });
    }

    const CARROS_INICIALES = [
      { placa: 'JKL204', conductor: 'Conductor simulado', acceso: 'REGIONAL', t: 440 },
      { placa: 'MNP318', conductor: 'Conductor simulado', acceso: 'LAS_VEGAS', t: 441 },
      { placa: 'QRS452', conductor: 'Conductor simulado', acceso: 'REGIONAL', t: 443 },
      { placa: 'TUV567', conductor: 'Conductor simulado', acceso: 'LAS_VEGAS', t: 445 },
      { placa: 'WXY681', conductor: 'Conductor simulado', acceso: 'REGIONAL', t: 447 },
      { placa: 'BCD795', conductor: 'Conductor simulado', acceso: 'REGIONAL', t: 448 },
      { placa: 'EFG893', conductor: 'Conductor simulado', acceso: 'REGIONAL', t: 449 }
    ];

    function crearGuion() {
      const llegadas = Array.from({ length: 25 }, (_, i) => ({
        t: 453 + Math.floor(i * 2.2),
        tipo: 'LLEGADA',
        placa: i % 10 === 4 ? `MOT${10 + i}A` : `SIM${String(100 + i)}`,
        conductor: 'Conductor simulado',
        acceso: i % 3 === 2 ? 'LAS_VEGAS' : 'REGIONAL'
      }));
      const salidas = Array.from({ length: 12 }, (_, i) => ({
        t: 452 + i * 5,
        tipo: 'SALIDA',
        tipoCelda: i % 4 === 3 ? 'MOTO' : 'CARRO'
      }));
      return [...llegadas, ...salidas].sort((a, b) => a.t - b.t);
    }

    function crearEstado() {
      return {
        clock: 450,
        seq: 0,
        autoPorteria: false,
        semilla: 7,
        celdas: crearCeldas(),
        vehiculos: [],
        eventos: [],
        tasaSalidas: null,
        salidasMinuto: 0,
        guion: crearGuion()
      };
    }

    const formatoHora = (min) =>
      `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
    const error = (mensaje) => ({ ok: false, error: mensaje });

    function crear() {
      let s = crearEstado();
      const suscriptores = new Set();
      const notificar = () => suscriptores.forEach((fn) => fn(s));
      const evento = (tipo, mensaje, datos) => {
        s.eventos.push({ t: formatoHora(s.clock), tipo, mensaje, datos: datos || null });
      };
      const buscar = (placa) => s.vehiculos.find((v) => v.placa === placa);
      const fila = (acceso) =>
        s.vehiculos
          .filter((v) => v.acceso === acceso && (v.estado === 'EN_PASARELA' || v.estado === 'CELDA_ASIGNADA'))
          .sort((a, b) => a.seq - b.seq);
      const afuera = (acceso) =>
        s.vehiculos
          .filter((v) => v.acceso === acceso && v.estado === 'AFUERA')
          .sort((a, b) => a.llegadaAfueraEn - b.llegadaAfueraEn);
      const registrar = (v) => {
        v.estado = 'EN_PASARELA';
        v.registradoEn = s.clock;
        v.seq = ++s.seq;
      };

      function asignarCeldas() {
        const pendientes = s.vehiculos
          .filter((v) => v.estado === 'EN_PASARELA' && !v.saleSinEstacionar && !v.celdaId)
          .sort((a, b) => a.seq - b.seq);
        pendientes.forEach((v) => {
          const libres = s.celdas.filter((c) => c.estado === 'LIBRE' && c.tipo === v.tipo);
          if (!libres.length) return;
          const p = PORTERIAS[v.acceso];
          const distancia = (c) => Math.hypot(c.x - p.x, c.y - p.y);
          const celda = [...libres].sort((a, b) => distancia(a) - distancia(b) || a.id.localeCompare(b.id))[0];
          celda.estado = 'RESERVADA';
          celda.placa = v.placa;
          v.celdaId = celda.id;
          v.estado = 'CELDA_ASIGNADA';
          v.asignadaEn = s.clock;
          evento('CELDA_RESERVADA', `Celda ${celda.id} reservada para ${v.placa} (${NOMBRE_ACCESO[v.acceso]})`);
        });
      }

      function llenarPasarela(acceso) {
        while (fila(acceso).length < CAPACIDAD && afuera(acceso).length) {
          const v = afuera(acceso)[0];
          registrar(v);
          evento('REGISTRO', `${v.placa} entró a la pasarela ${NOMBRE_ACCESO[acceso]}`);
        }
      }

      function llegarInterno(datos) {
        const placa = String(datos.placa || '').trim().toUpperCase().replace(/[\s-]/g, '');
        if (!RE_CARRO.test(placa) && !RE_MOTO.test(placa)) return error('Placa inválida. Carro: ABC123 · Moto: ABC12D.');
        if (s.vehiculos.some((v) => v.placa === placa && v.estado !== 'SALIO')) return error(`La placa ${placa} ya está en el sistema.`);
        if (!RE_NOMBRE.test(datos.conductor || '')) return error('Nombre inválido: usa de 2 a 40 letras y espacios.');
        if (!ACCESOS[datos.acceso]) return error('Acceso inválido.');
        const hora = datos.horaClase;
        if (hora != null && (hora < 360 || hora > 1320 || hora <= s.clock)) return error('La hora de clase debe ser posterior a la hora actual.');
        const v = {
          id: `v${s.vehiculos.length + 1}`,
          placa,
          conductor: datos.conductor,
          tipo: RE_MOTO.test(placa) ? 'MOTO' : 'CARRO',
          acceso: datos.acceso,
          estado: 'AFUERA',
          llegadaAfueraEn: s.clock,
          registradoEn: null,
          seq: null,
          saleSinEstacionar: false,
          celdaId: null,
          valet: datos.valet ? { codigo: null, estado: 'SELECCIONADO', casillero: null, pagado: false } : null,
          horaClase: datos.horaClase == null ? null : datos.horaClase
        };
        s.vehiculos.push(v);
        if (fila(v.acceso).length < CAPACIDAD) {
          registrar(v);
          evento('REGISTRO', `${v.placa} registró su llegada en ${NOMBRE_ACCESO[v.acceso]}`);
        } else {
          evento('LLEGADA_AFUERA', `${v.placa} espera afuera de ${NOMBRE_ACCESO[v.acceso]}`);
        }
        return { ok: true, vehiculo: v };
      }

      function liberarCelda(v) {
        const celda = s.celdas.find((c) => c.id === v.celdaId);
        if (celda) {
          celda.estado = 'LIBRE';
          celda.placa = null;
        }
        s.salidasMinuto += 1;
      }

      function confirmarInterno(acceso, placa) {
        const v = buscar(placa);
        const lista = fila(acceso);
        if (!v || !lista.includes(v)) {
          evento('PORTERIA_ERROR', `Portería ${NOMBRE_ACCESO[acceso]}: ${placa || 'sin placa'} no está en la pasarela`);
          return error('Placa no registrada en esta pasarela.');
        }
        if (lista[0] !== v) {
          evento('PORTERIA_ERROR', `Portería ${NOMBRE_ACCESO[acceso]}: ${placa} aún no es el primero`);
          return error('Este vehículo aún no es el primero de la fila.');
        }
        if (!v.celdaId) {
          evento('PORTERIA_ERROR', `Portería ${NOMBRE_ACCESO[acceso]}: ${placa} no tiene celda`);
          return error('Aún no tiene celda asignada. Debe esperar.');
        }
        v.estado = 'EN_RECORRIDO';
        v.recorridoDesde = s.clock;
        evento('PORTERIA_OK', `Portería ${NOMBRE_ACCESO[acceso]} confirmó ${placa} hacia ${v.celdaId}`);
        llenarPasarela(acceso);
        asignarCeldas();
        return { ok: true, celda: s.celdas.find((c) => c.id === v.celdaId), ruta: ruta(placa) };
      }

      function estacionarInterno(v) {
        const celda = s.celdas.find((c) => c.id === v.celdaId);
        celda.estado = 'OCUPADA';
        v.estado = 'ESTACIONADO';
        evento('ESTACIONADO', `${v.placa} estacionó en ${v.celdaId}`);
        if (v.valet) v.valet.estado = 'ESTACIONADO';
      }

      function tick() {
        s.clock += 1;
        s.salidasMinuto = 0;
        s.guion.filter((e) => e.t === s.clock).forEach((e) => {
          if (e.tipo === 'LLEGADA') llegarInterno(e);
          const ocupadaSinCarro = s.celdas.find(
            (c) => c.estado === 'OCUPADA' && c.tipo === e.tipoCelda && !s.vehiculos.some((v) => v.celdaId === c.id)
          );
          if (e.tipo === 'SALIDA' && ocupadaSinCarro) {
            evento('SALIDA', `${ocupadaSinCarro.placa} salió y liberó ${ocupadaSinCarro.id}`);
            ocupadaSinCarro.estado = 'LIBRE';
            ocupadaSinCarro.placa = null;
            s.salidasMinuto += 1;
          }
        });
        s.vehiculos.forEach((v) => {
          if (v.estado === 'EN_RECORRIDO' && s.clock - v.recorridoDesde >= 2 && v.valet) estacionarInterno(v);
          if (v.valet && v.valet.estado === 'ESTACIONADO' && v.estado === 'ESTACIONADO') {
            v.valet.estado = 'LLAVES_EN_CUSTODIA';
            v.valet.casillero = 1 + (v.seq * 7) % 30;
            evento('VALET_LLAVES', `Llaves de ${v.placa} en casillero ${v.valet.casillero}`);
          }
          if (v.valet && v.valet.estado === 'SOLICITADO' && s.clock - v.valet.solicitadoEn >= 2) {
            v.valet.estado = 'DEVUELTO';
            v.estado = 'SALIO';
            liberarCelda(v);
            evento('SALIDA', `${v.placa} fue devuelto por el valet`);
          }
        });
        if (s.autoPorteria) {
          Object.keys(PORTERIAS).forEach((acceso) => {
            const primero = fila(acceso)[0];
            if (primero && primero.celdaId) confirmarInterno(acceso, primero.placa);
          });
        }
        const muestra = s.salidasMinuto;
        s.tasaSalidas = s.tasaSalidas == null ? muestra : 0.3 * muestra + 0.7 * s.tasaSalidas;
        asignarCeldas();
      }

      function posicion(placa) {
        const v = buscar(placa);
        if (!v) return null;
        const lista = fila(v.acceso);
        const idx = lista.indexOf(v);
        const fuera = afuera(v.acceso);
        const idxAfuera = fuera.indexOf(v);
        const necesitan = s.vehiculos
          .filter((o) => o.tipo === v.tipo && ['AFUERA', 'EN_PASARELA'].includes(o.estado) && !o.saleSinEstacionar)
          .sort((a, b) => (a.seq || 1e9) - (b.seq || 1e9) || a.llegadaAfueraEn - b.llegadaAfueraEn);
        const k = necesitan.indexOf(v);
        return {
          acceso: v.acceso,
          estado: v.estado,
          posicionEnPasarela: idx >= 0 ? idx + 1 : null,
          delante: idx >= 0 ? idx : idxAfuera >= 0 ? idxAfuera + lista.length : 0,
          detras: idx >= 0 ? lista.length - idx - 1 + fuera.length : idxAfuera >= 0 ? fuera.length - idxAfuera - 1 : 0,
          afueraDelante: idxAfuera >= 0 ? idxAfuera : 0,
          posicionGlobalCelda: k >= 0 ? k + 1 : null
        };
      }

      function tasaActual(tipo) {
        const hora = Math.floor(s.clock / 60);
        const base = s.tasaSalidas == null ? HISTORICO.salidasPorMin[hora] || 0.3 : s.tasaSalidas;
        return Math.max(base * (tipo === 'MOTO' ? FACTOR_TASA_MOTO : 1), 0.05);
      }

      function esperaPara(k, tipo) {
        const libres = s.celdas.filter((c) => c.estado === 'LIBRE' && c.tipo === tipo).length;
        if (k <= libres) return { minMin: 0, maxMin: 1, texto: 'Celda inmediata' };
        const t = (k - libres) / tasaActual(tipo);
        const minMin = Math.floor(t * 0.8);
        const maxMin = Math.ceil(t * 1.3);
        return { minMin, maxMin, texto: `${minMin}–${maxMin} min` };
      }

      function estimarEspera(placa) {
        const v = buscar(placa);
        if (!v) return { minMin: 0, maxMin: 0, texto: 'Sin datos' };
        if (v.saleSinEstacionar) return { minMin: 0, maxMin: 0, texto: 'No necesitas celda' };
        if (v.celdaId) return { minMin: 0, maxMin: 0, texto: 'Ya tienes celda' };
        return esperaPara(posicion(placa).posicionGlobalCelda || 1, v.tipo);
      }

      function llegoAClase(placa) {
        const v = buscar(placa);
        if (!v || v.horaClase == null) return null;
        const margenMin = v.horaClase - (s.clock + estimarEspera(placa).maxMin + 5);
        return { aTiempo: margenMin >= 0, margenMin, sugerirValet: margenMin < 0 };
      }

      function ruta(placa) {
        const v = buscar(placa);
        if (!v || !v.celdaId) return { puntos: [], pasos: [] };
        const c = s.celdas.find((x) => x.id === v.celdaId);
        const lado = c.y < 30 ? 'izquierda' : 'derecha';
        const acceso = ACCESOS[v.acceso];
        const porteria = PORTERIAS[v.acceso];
        return {
          puntos: [acceso, porteria, { x: c.x, y: 30 }, { x: c.x, y: c.y }],
          pasos: [
            `Avanza a portería ${NOMBRE_ACCESO[v.acceso]}`,
            `Sigue recto hacia la Zona ${c.zona}`,
            `Celda ${c.id} a tu ${lado}`
          ]
        };
      }

      function resumenAcceso(acceso) {
        const necesitan = s.vehiculos.filter(
          (v) => v.tipo === 'CARRO' && ['AFUERA', 'EN_PASARELA'].includes(v.estado) && !v.saleSinEstacionar
        ).length;
        return {
          enPasarela: fila(acceso).length,
          capacidad: CAPACIDAD,
          afuera: afuera(acceso).length,
          esperaTexto: esperaPara(necesitan + 1 + afuera(acceso).length, 'CARRO').texto,
          recomendado: false
        };
      }

      function justicia(acceso) {
        const asignados = s.vehiculos.filter((v) => v.acceso === acceso && v.asignadaEn != null);
        const suma = asignados.reduce((total, v) => total + (v.asignadaEn - v.registradoEn), 0);
        return {
          asignadas: asignados.length,
          esperaPromedioMin: asignados.length ? Math.round((suma / asignados.length) * 10) / 10 : 0
        };
      }

      function resumen() {
        const libres = s.celdas.filter((c) => c.estado === 'LIBRE').length;
        const total = s.celdas.length;
        const libresDe = (tipo) => s.celdas.filter((c) => c.estado === 'LIBRE' && c.tipo === tipo).length;
        const regional = resumenAcceso('REGIONAL');
        const vegas = resumenAcceso('LAS_VEGAS');
        const cargaR = regional.enPasarela + regional.afuera;
        const cargaV = vegas.enPasarela + vegas.afuera;
        return {
          reloj: formatoHora(s.clock),
          libres,
          total,
          libresPorTipo: { CARRO: libresDe('CARRO'), MOTO: libresDe('MOTO') },
          totalPorTipo: {
            CARRO: s.celdas.filter((c) => c.tipo === 'CARRO').length,
            MOTO: s.celdas.filter((c) => c.tipo === 'MOTO').length
          },
          ocupacionPct: Math.round(((total - libres) / total) * 100),
          accesos: {
            REGIONAL: { ...regional, recomendado: cargaR <= cargaV },
            LAS_VEGAS: { ...vegas, recomendado: cargaV < cargaR }
          },
          justicia: { REGIONAL: justicia('REGIONAL'), LAS_VEGAS: justicia('LAS_VEGAS') },
          historico: HISTORICO
        };
      }

      const conNotificacion = (fn) => (...args) => {
        const resultado = fn(...args);
        asignarCeldas();
        notificar();
        return resultado;
      };

      const engine = {
        get state() {
          return s;
        },
        llegar: conNotificacion(llegarInterno),
        marcarSaleSinEstacionar: conNotificacion((placa, valor) => {
          const v = buscar(placa);
          if (!v) return error('Placa no registrada.');
          if (v.celdaId && valor) return error('Ya tienes celda asignada: pasa por portería.');
          v.saleSinEstacionar = valor;
          if (valor) evento('SALE_SIN_ESTACIONAR', `${placa} saldrá sin estacionar`);
          return { ok: true };
        }),
        confirmarPorteria: conNotificacion(confirmarInterno),
        estacionar: conNotificacion((placa) => {
          const v = buscar(placa);
          if (!v || v.estado !== 'EN_RECORRIDO') return error('Primero debes pasar por portería.');
          estacionarInterno(v);
          return { ok: true };
        }),
        salir: conNotificacion((placa) => {
          const v = buscar(placa);
          if (!v) return error('Placa no registrada.');
          if (v.estado === 'ESTACIONADO') {
            liberarCelda(v);
          } else if (!(v.saleSinEstacionar && fila(v.acceso)[0] === v)) {
            return error('Solo puedes salir cuando seas el primero de la fila.');
          }
          v.estado = 'SALIO';
          evento('SALIDA', `${placa} salió del parqueadero`);
          llenarPasarela(v.acceso);
          return { ok: true };
        }),
        posicion,
        estimarEspera,
        llegoAClase,
        ruta,
        resumen,
        valetSeleccionar: conNotificacion((placa) => {
          const v = buscar(placa);
          if (!v) return error('Primero registra tu llegada.');
          if (!['AFUERA', 'EN_PASARELA'].includes(v.estado)) return error('El valet solo se pide antes de recibir celda.');
          v.valet = v.valet || { codigo: null, estado: 'SELECCIONADO', casillero: null, pagado: false };
          return { ok: true };
        }),
        valetPagar: conNotificacion((placa, metodo) => {
          const v = buscar(placa);
          if (!v || !v.valet) return error('Primero selecciona el valet.');
          if (metodo === 'RECHAZO') {
            evento('ERROR', `Pago de valet rechazado para ${placa}`);
            return error('Pago rechazado. Intenta con otro método.');
          }
          v.valet.pagado = true;
          v.valet.estado = 'PAGADO';
          v.valet.codigo = `V-${String(100 + v.seq * 13).slice(-3)}`;
          evento('VALET_PAGADO', `Valet pagado para ${placa}`);
          return { ok: true, codigo: v.valet.codigo };
        }),
        valetEntregar: conNotificacion((placa) => {
          const v = buscar(placa);
          if (!v || !v.valet || !v.valet.pagado) return error('Primero completa el pago del valet.');
          v.valet.estado = 'EN_FILA';
          evento('VALET_ENTREGADO', `${placa} entregado al valet (${v.valet.codigo})`);
          return { ok: true };
        }),
        valetSolicitarCarro: conNotificacion((placa) => {
          const v = buscar(placa);
          if (!v || !v.valet || v.valet.estado !== 'LLAVES_EN_CUSTODIA') return error('Tu carro aún no está listo para devolverse.');
          v.valet.estado = 'SOLICITADO';
          v.valet.solicitadoEn = s.clock;
          return { ok: true };
        }),
        avanzar(min) {
          for (let i = 0; i < min; i += 1) tick();
          notificar();
          return { ok: true };
        },
        generarLlegada(acceso) {
          s.semilla = (s.semilla * 1103515245 + 12345) % 2147483648;
          const letras = 'BCDFGHJKLMNPRSTVWXYZ';
          const n = s.semilla;
          const placa = `${letras[n % 20]}${letras[(n >> 5) % 20]}${letras[(n >> 10) % 20]}${String(100 + (n >> 15) % 900)}`;
          const destino = acceso || (n % 2 ? 'REGIONAL' : 'LAS_VEGAS');
          return engine.llegar({ placa, conductor: 'Llegada simulada', acceso: destino });
        },
        setAutoPorteria(valor) {
          s.autoPorteria = Boolean(valor);
          notificar();
          return { ok: true };
        },
        reiniciar() {
          s = crearEstado();
          sembrar();
          notificar();
          return { ok: true };
        },
        suscribir(fn) {
          suscriptores.add(fn);
          return () => suscriptores.delete(fn);
        },
        exportarJSON: () => JSON.stringify(s, null, 2),
        importarJSON(texto) {
          s = JSON.parse(texto);
          notificar();
          return { ok: true };
        },
        verificarInvariantes: () => true
      };

      function sembrar() {
        CARROS_INICIALES.forEach((c) => {
          const reloj = s.clock;
          s.clock = c.t;
          llegarInterno(c);
          s.clock = reloj;
        });
        s.eventos = [];
        asignarCeldas();
      }

      sembrar();
      return engine;
    }

    window.ParkEngine = { crear, POLITICA_TEXTO, esStub: true };
  })();
}
