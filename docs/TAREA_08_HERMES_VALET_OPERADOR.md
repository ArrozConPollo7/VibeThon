# TAREA 08 — Vista del operador del valet + backend del valet (para Hermes / DeepSeek)

> Autor: Claude (arquitecto). Ejecutor: Hermes. **Congelar a las 15:50.** Entrega: 16:20.
> Reemplaza a TAREA_06 y TAREA_07 (ya no hagas `app.html`). Claude Code terminó: ahora **tú eres el único que edita**.
> Estado actual: `index.html` + `src/ui/*` ya usan el motor real (`engine.js`), verificado 29/29 en Chrome. **No rehagas nada**: agrega.

## 0. Red de seguridad (1 min)
`git tag ui-v2` antes de empezar. Si a las 15:50 algo del flujo actual se rompe, `git checkout ui-v2 -- .` y reporta.

## 1. Objetivo
Hoy el valet solo existe desde el lado del estudiante y el motor lo mueve solo. Falta el **operador del valet**: la persona que
recibe el carro, lo inspecciona, lo estaciona, guarda las llaves, sabe **dónde quedó** y lo entrega con un PIN. Stitch ya muestra
esos datos al estudiante (`design/03-valet.html`: ticket, operador, inspección, caja de llaves; `design/04-seguimiento-entrega.html`:
estado del despacho, PIN de entrega, "Confirmar recepción"), pero hoy no tienen respaldo en el motor.

## 2. Backend — cambios en `src/engine.js` (solo agregar; no cambiar reglas R1–R7 ni el reparto)
| Función / campo | Comportamiento |
|---|---|
| `valetPagar` (existente) | además guarda en `valet`: `ticket` (`'VAL-' + 4 dígitos`), `pin` (4 dígitos), `tarifa: 8000`, `operador` (nombre de una lista fija: "Carlos Restrepo", "Luisa Mejía", "Andrés Gil"). Usa el `rng` con semilla del motor (determinista). |
| `valetInspeccionar(placa, {combustible, km, novedades, fotos})` | Solo si `valet.estado` es `ENTREGADO_A_VALET` o `EN_FILA`. Guarda `valet.inspeccion = {hora, combustible ('1/4'..'lleno'), km (número ≥ 0), novedades (texto ≤ 140), fotos (0–4)}`. Validar y devolver errores claros. Evento `VALET_INSPECCION`. |
| `estacionar(placa)` (existente) | El operador puede confirmar manualmente "Estacionado" cuando el carro está `EN_RECORRIDO`. Sigue existiendo el paso automático de `avanzar()` para la simulación. |
| `valetSolicitarCarro` (cambia el final) | `SOLICITADO` → a los 2 min `EN_TRASLADO`… **ya no** se devuelve solo. Tras 2 min más → `LISTO_EN_BAHIA` (evento). |
| `valetEntregarCliente(placa, pin)` | Solo en `LISTO_EN_BAHIA`. PIN distinto → `{ok:false, error:'PIN incorrecto. Pídele al estudiante el código de 4 dígitos.'}`. Correcto → `DEVUELTO`, libera celda y casillero (reutiliza `valetDevolver`). |
| `valetListar()` | Arreglo de copias de los vehículos con valet: `{placa, conductor, estado, ticket, operador, celdaId, zona, nombreZona, casillero, inspeccion, pin?}` ordenado por estado y hora. **No** incluir el `pin` aquí (el operador no debe verlo). |
Estados finales del valet: `SELECCIONADO, PAGADO, ENTREGADO_A_VALET, EN_FILA, ESTACIONADO, LLAVES_EN_CUSTODIA, SOLICITADO, EN_TRASLADO, LISTO_EN_BAHIA, DEVUELTO`.

**Pruebas nuevas en `tests/engine.test.js`** (las 14 actuales deben seguir pasando):
15. Inspección: antes de entregar → error; datos inválidos (km negativo, 5 fotos) → error; válida → guardada.
16. Entrega con PIN: solicitar → avanzar 4 min → `LISTO_EN_BAHIA`; PIN incorrecto → error; correcto → `DEVUELTO`, celda LIBRE y casillero liberado.
17. `valetListar()` no expone el PIN y muestra celda + casillero del carro estacionado.
Corre `node tests/engine.test.js` → 17/17 antes de tocar la UI.

## 3. Frontend
**3.1 Nueva vista "Valet (operador)"** — `src/ui/valet-operador.js` + entrada en el selector de vistas de `src/ui/app.js` (junto a "Portería y operación") y su `<script>` en `index.html`. Mismo estilo Stitch (componentes de `src/ui/componentes.js`, tokens de `DESIGN.md`).
- **Columna izquierda — Servicios** agrupados por estado: Por recibir (PAGADO) · Recibidos/en fila · Estacionados · Solicitados/en traslado · Listos en bahía. Cada tarjeta: placa (`App.placaHTML`), conductor, ticket, tiempo en custodia.
- **Detalle del servicio seleccionado:**
  1. *Recepción e inspección*: checklist Frontal / Trasera / Lat. izq. / Lat. der. / Tablero (cuenta como `fotos`), combustible (selector), km, novedades → **Guardar inspección** (`valetInspeccionar`).
  2. *Dónde quedó*: parqueadero + celda + **mapa** con `focusLot` y `select` de su celda (reutiliza el montaje persistente de `src/ui/mapa.js`); casillero de llaves grande ("Caja de llaves 12"). Si está `EN_RECORRIDO`: botón **Confirmar estacionado** (`estacionar`).
  3. *Entrega*: si `LISTO_EN_BAHIA`, campo PIN de 4 dígitos + **Entregar al estudiante** (`valetEntregarCliente`). Error del motor en rojo.
- Estado vacío: "No hay servicios de valet activos. Genera uno desde la vista Conductor."

**3.2 Lado del estudiante** (`src/ui/valet.js`, ajustar sin rehacer):
- Mostrar `ticket`, `operador`, `tarifa` real (quitar el "$8.000" fijo si está escrito a mano) y la inspección cuando exista (combustible, km, novedades, n.º de fotos), como en `design/03-valet.html`.
- Seguimiento (`design/04-seguimiento-entrega.html`): línea de estados con `EN_TRASLADO` y `LISTO_EN_BAHIA`; **PIN de entrega** grande con el texto "Muéstralo al operador del valet"; ya no esperar `DEVUELTO` automático.
- Agrega `EN_TRASLADO` y `LISTO_EN_BAHIA` a `ORDEN_VALET` / `EN_ENTREGA` en `valet.js`.

**3.3 Modo demo:** agrega un selector en el panel derecho para alternar entre "Portería y operación" y "Valet (operador)", así el jurado ve en una sola pantalla al estudiante y al operador.

## 4. Verificación (antes de las 15:50)
1. `node tests/engine.test.js` → 17/17.
2. Doble clic en `index.html` sin internet, consola limpia, sin badge "Motor de prueba".
3. Estudiante: registrar `LAU123` con valet → pago rechazado → aprobado (ve ticket, operador, PIN).
4. Operador: recibe, inspecciona (error con km negativo; luego válido) → el estudiante ve la inspección.
5. Play x10 hasta que tiene celda → operador ve parqueadero, celda en el mapa y casillero; "Confirmar estacionado" si aplica.
6. Estudiante solicita su carro → operador lo ve en traslado → listo en bahía → PIN incorrecto (error) → PIN correcto → DEVUELTO; la celda vuelve a Libre en el mapa.
7. El flujo sin valet (TAREA_05 §7 puntos 2–4) sigue funcionando.
8. Oscuro + A++ a 390 px en la vista nueva.

## 5. Cierre
Agrega en `docs/STATUS.md` `## Estado TAREA 08` (resultado de cada punto de la §4) y en `docs/PROMPTS.md` un "Prompt 8"
(fallo observado: el valet de Stitch mostraba datos sin respaldo en el motor; corrección: esta tarea; verificación: §4).
Commits pequeños: `feat(engine): valet del operador…` (tras 17/17) y luego `feat(ui): vista del operador del valet`.
