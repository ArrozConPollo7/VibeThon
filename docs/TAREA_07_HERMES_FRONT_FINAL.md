# TAREA 07 — Frontend completo e integrado (para Hermes / DeepSeek)

> Autor: Claude (arquitecto). Ejecutor: Hermes. **Congelar a las 15:45.** Entrega: 16:20.
> **Reemplaza a TAREA_06** (si la empezaste, déjala; los documentos de demo los hará Claude).
> Claude Code está construyendo en paralelo otra versión (TAREA_05) en `index.html` y `src/ui/`. Para no pisarse,
> **tú trabajas en archivos separados** y a las 15:45 el equipo elige la mejor versión.

## 0. Tus archivos (exclusivos) y los prohibidos
| Puedes crear/editar | NO tocar (ni formatear, ni mover) |
|---|---|
| `app.html` (raíz), `src/app/**` (tus JS y CSS), `docs/STATUS_HERMES_FRONT.md` | `index.html`, `src/ui/**`, `src/engine.js`, `src/data.js`, `src/mapa-datos.js`, `src/vendor/**`, `tests/**`, `docs/PROMPTS.md`, `docs/STATUS.md` |
Puedes **leer** y **cargar** (con `<script src>`) archivos de `src/vendor/`, `src/engine.js`, `src/data.js` y `src/mapa-datos.js`.
Commit solo de tus archivos: `git add app.html src/app docs/STATUS_HERMES_FRONT.md` (nunca `git add -A`).

## 1. Base: combinar Stitch + lo que ya hizo Claude Code
- **Apariencia = Stitch.** Lee completos `design/01-inicio.html`, `02-mi-turno.html`, `03-valet.html`, `04-seguimiento-entrega.html`, `05-calificacion.html` y `design/DESIGN.md` (tokens). Reproduce su estructura, componentes, colores, tipografía, radios y barra inferior.
- **Funcionalidad = la versión de Claude Code etiquetada `ui-v1`.** Léela sin modificar el árbol de trabajo:
  `git show ui-v1:src/ui/core.js` (también `app.js`, `inicio.js`, `turno.js`, `valet.js`, `operacion.js`, `mapa.js`, `accesibilidad.js`, `efectos.js`, `preferencias-inicial.js`, `styles.css`).
  Copia y adapta a `src/app/` lo que ya resuelve bien: render con `morf` (diff de DOM), toasts, suscripción al motor,
  validación de placa con máscara, montaje persistente del mapa, accesibilidad (tema, tamaño de letra, reducir animaciones),
  sonidos Web Audio, Modo demo y panel de operación.
- El resultado: **las pantallas de Stitch con datos reales del motor y todas las funciones de `ui-v1`.**

## 2. Restricciones técnicas
- Abrir con **doble clic en `app.html`** (file://), **sin internet**: scripts clásicos (sin `type="module"`, sin `import`), sin CDNs.
  Tailwind: `src/vendor/tailwind.js` (local) con un `tailwind.config` generado de `DESIGN.md`. Fuentes: `src/vendor/inter-variable.woff2`
  y `src/vendor/material-symbols.woff2` vía `@font-face` (si el segundo no funciona, íconos SVG en línea).
- Orden de carga en `app.html`: `src/vendor/tailwind.js` → `src/mapa-datos.js` → `src/data.js` → `src/engine.js` → `src/vendor/parking-map.js` → tus `src/app/*.js`.
- **No uses `src/engine.stub.js`.** Motor: `ParkEngine.crear(window.ParkData)`.
- La UI nunca escribe en `engine.state`: solo llama funciones del motor y se re-renderiza con `engine.suscribir`.
- Todo `{ok:false, error}` → toast rojo con el mensaje del motor; todo `{ok:true}` → toast verde concreto.

## 3. Contrato del motor (resumen; detalle en TAREA_01 §9 y TAREA_01B)
`llegar({placa, conductor, acceso, horaClase?, valet?})`, `marcarSaleSinEstacionar(placa, bool)`, `confirmarPorteria(acceso, placa)`,
`estacionar(placa)`, `salir(placa)`, `posicion(placa)`, `estimarEspera(placa)`, `llegoAClase(placa)`, `ruta(placa)` → `{puntos, pasos, lote}`,
`resumen()` → `{reloj, libres, total, ocupacionPct, libresPorTipo, totalPorTipo, accesos{REGIONAL,LAS_VEGAS}, justicia, historico{ocupacion}}`,
`valetSeleccionar/valetPagar(placa, metodo|'RECHAZO')/valetEntregar/valetSolicitarCarro`, `avanzar(min)`, `generarLlegada(acceso)`,
`reiniciar()`, `setAutoPorteria(bool)`, `exportarJSON()`, `suscribir(fn)`, `ParkEngine.POLITICA_TEXTO`.
`state`: `vehiculos[]` (placa, tipo CARRO|MOTO, acceso, estado, registradoEn, celdaId, valet{estado, codigo, casillero}, horaClase),
`celdas[]` (id, zona N|I|G|M, tipo CARRO|MOTO|PMR|ECO|PROV, estado LIBRE|RESERVADA|OCUPADA, placa, x, y), `pasarelas`, `afuera`, `eventos[]`, `clock` (minutos).
Nombres de parqueadero: `ParkData.zonas[zona].nombre`. Horas: `ParkEngine.horaTexto(min)`.
Comprueba cualquier duda leyendo `src/engine.js`; no supongas.

## 4. Pantallas
| Stitch | Pantalla | Debe mostrar / hacer |
|---|---|---|
| 01-inicio | Inicio | celdas libres (carro y moto), tarjetas Regional / Las Vegas con pasarela n/4, afuera, espera y "Recomendado"; "Horas más llenas" (`historico.ocupacion`, nota "datos simulados"); formulario: placa (mayúsculas, máscara, chip Carro/Moto, error en línea, carro `ABC123` / moto `ABC12D`), nombre, acceso, hora de clase, casilla valet → **Registrar llegada** |
| 02-mi-turno | Mi turno | posición grande, delante/detrás, banner "Esperas afuera" si aplica, espera estimada con anillo de progreso, alerta "Podrías llegar tarde" + **Usar valet**, interruptor "Saldré sin estacionar", desplegable con la política, línea de estados |
| nueva (estilo Stitch) | Celda asignada | "¡Tienes celda!", parqueadero + celda, **mapa** con `focusLot`, `select` y ruta animada (`ruta().puntos`, coordenadas 890×1076), pasos, QR simulado, botón según estado: Esperando portería → Llegué a mi celda → Salir. Moto: tarjeta "Motos · Ingeniería" en vez del mapa |
| 03-valet | Valet pasos 1–2 | indicador de 3 pasos, aviso "El valet no da prioridad…", pago Tarjeta/Nequi/**Simular rechazo**, entrega con código V-xxx y checklist |
| 04-seguimiento-entrega | Valet paso 3 | estados en vivo (En fila → Estacionado en X → Llaves en casillero N), **Solicitar mi carro**, Devuelto |
| 05-calificacion | Calificación (si sobra tiempo) | tras DEVUELTO, local |
| nueva (escritorio) | Portería y operación | Play/Pausa, x1/x10, Avanzar 1 min, Generar llegada por acceso, Reiniciar, Exportar JSON, Portería automática; pasarelas y afuera; **mapa del campus** (Principal, Ingeniería, Idiomas; botones de zoom y "Ver todo"; `onSelect` con placa y estado); Confirmar en portería; medidor de justicia; registro de eventos |
| nueva | **Modo demo (vista por defecto)** | celular (390×780) a la izquierda + panel de operación a la derecha |

**Mapa:** `ParkingMap.create(contenedor, { lots: ParkingMap.DEFAULT_LOTS })` **una sola vez** por contenedor, en un nodo que el diff no destruya.
Sincronizar en cada notificación con un `setStatuses` de solo cambios (`LIBRE→free`, `RESERVADA→held`, `OCUPADA→taken`; omitir `M-xx`). `setTheme` según el tema.
Leyenda con texto: Libre, Reservada, Ocupada, Movilidad reducida, Baja emisión, Proveedores.

**Accesibilidad y experiencia:** tema claro/oscuro/sistema, letra A/A+/A++, reducir animaciones, silencio de sonidos (volumen bajo, sin bucles),
`aria-live` en posición y toasts, foco visible, objetivos ≥ 44 px, estados vacíos con texto, botones deshabilitados con explicación.

## 5. Orden de trabajo (por si no alcanza el tiempo)
1. `app.html` + carga del motor + Modo demo con Inicio → Mi turno → Celda asignada (mapa) funcionando. **Commit.**
2. Portería y operación. **Commit.**
3. Valet completo. **Commit.**
4. Accesibilidad y sonidos. **Commit.**
5. Calificación y pulido.

## 6. Verificación (antes de las 15:45)
1. Doble clic en `app.html` sin internet; consola sin errores.
2. Registrar `ABC123` por Regional → posición y espera → celda → mapa con zoom, celda y ruta → Confirmar en portería → Llegué → Salir.
3. Estado inicial: `RGL206` tiene celda `G-210` en Idiomas y el mapa la muestra.
4. Moto `ABC12D` → tarjeta de motos. `AB1234` y placa duplicada → error.
5. Valet: pago rechazado → aprobado → entrega → llaves en casillero → solicitar → devuelto.
6. Generar llegadas hasta llenar una pasarela → "Esperas afuera".
7. Play x10 dos minutos: el mapa se actualiza sin recrearse.
8. Oscuro + A++ a 390 px sin desbordes; apariencia igual a `design/*.html`.

Escribe `docs/STATUS_HERMES_FRONT.md` con qué funciona, qué no y el resultado de cada punto de la §6.
