# TAREA 01B — Ajustes al contrato del motor (para Hermes / DeepSeek)

> Complementa `TAREA_01_MOTOR_HERMES.md`. Si ya empezaste, aplica estos cambios encima. Donde haya conflicto, **manda este archivo**.
> Origen: preguntas de Claude Code en `docs/PREGUNTAS.md` (14:00) y nuevos requisitos de validación.

## 1. Nombre global de los datos
`src/data.js` expone **`window.ParkData`** (y `module.exports = ParkData` en Node).
`ParkEngine.crear(window.ParkData)`.

## 2. Forma de `engine.state` (fija)
```js
state = {
  clock: 450,                 // minutos desde medianoche
  vehiculos: [ ... ],         // ARREGLO (no mapa)
  celdas: [ ... ],            // ARREGLO
  eventos: [ ... ],           // más antiguo primero
  autoPorteria: false,
  seq: 0
}
```
`ParkData.HISTORICO = { fuente:'simulado', ocupacion: {6:20, 7:85, ...}, salidasPorMin: {6:0.2, 7:0.4, ...} }` (mapas hora → valor).

## 3. Nueva función
`engine.setAutoPorteria(bool)` → `{ok:true}`. La UI no debe escribir `state` directamente.

## 4. Corrección de datos iniciales (error de la especificación)
Con capacidad 4, "3 en pasarela + 1 afuera" no es posible. Usar: **REGIONAL: 4 en pasarela + 1 afuera**; LAS_VEGAS: 2 en pasarela.

## 5. `crear()` SÍ ejecuta `asignarCeldas()` al iniciar
Por eso la pantalla de inicio arranca con menos de 6 celdas libres. Es correcto: la demo muestra cola desde el comienzo.

## 6. Flujo del valet (aclaración)
- `valetSeleccionar(placa)` exige que la placa **ya esté registrada** (AFUERA o EN_PASARELA). Si no → error `"Primero registra tu llegada."`.
- `llegar({..., valet:true})` deja `valet = { estado:'SELECCIONADO', pagado:false }`.
- `valetEntregar(placa)` **no** vuelve a llamar `llegar()`: el carro conserva su lugar. Solo cambia `valet.estado` a ENTREGADO_A_VALET → EN_FILA.
- Con valet, el paso EN_RECORRIDO → ESTACIONADO lo hace `avanzar()` a los 2 min (el conductor ya no está). Luego LLAVES_EN_CUSTODIA en el mismo minuto.
- `valetSolicitarCarro(placa)` → SOLICITADO; `avanzar()` lo pasa a DEVUELTO 2 min después y el vehículo a SALIO (libera la celda).

## 7. NUEVO — Validación de datos en el motor (no solo en la UI)
- `placa` se normaliza (trim + mayúsculas, sin espacios ni guiones) y se valida:
  - **Carro:** `/^[A-Z]{3}[0-9]{3}$/` → ej. `ABC123`
  - **Moto:** `/^[A-Z]{3}[0-9]{2}[A-Z]$/` → ej. `ABC12D`
  - Otra cosa → `{ok:false, error:"Placa inválida. Carro: ABC123 · Moto: ABC12D."}`
- El tipo se **deduce de la placa**: `vehiculo.tipo = 'CARRO' | 'MOTO'`.
- Placa ya activa (cualquier estado distinto de SALIO) → `{ok:false, error:"La placa ABC123 ya está en el sistema."}`.
- `conductor`: 2–40 caracteres, solo letras y espacios (con tildes y ñ). Si no → error claro.
- `acceso` fuera de los dos válidos → error.
- `horaClase` (opcional) entre 360 y 1320 y mayor que `clock`; si no → error.
- Nunca confiar en la UI: estas validaciones viven en `llegar()`.

## 8. NUEVO — Motos
- Agregar **Zona M: M-01..M-10** (celdas de moto, cerca del centro, `tipo:'MOTO'`). Las celdas A/B/C tienen `tipo:'CARRO'`. Estado inicial: 7 de 10 ocupadas.
- Regla R3 se aplica **por tipo**: una moto solo recibe celda M; un carro solo A/B/C. Ambos siguen FIFO global por `(registradoEn, seq)` dentro de su tipo.
- Una moto esperando celda NO bloquea la asignación de un carro (y viceversa).
- La fila física sigue siendo la misma (R2): una moto con celda espera detrás de quien tenga adelante en la pasarela.
- `resumen()` agrega `libresPorTipo: {CARRO, MOTO}`; `estimarEspera` usa celdas y tasas del tipo del vehículo.
- Incluir 2 motos en el guion de eventos.

## 9. Pruebas adicionales
11. Placas válidas e inválidas (ABC123 ✅, ABC12D ✅, AB1234 ❌, abc 123 → normaliza a ABC123 ✅, ABC1234 ❌).
12. Placa duplicada activa → error.
13. Moto no recibe celda de carro; carro no recibe celda M; una moto sin celda no bloquea a un carro.

Reporta en `docs/STATUS.md` → `## Estado TAREA 01/01B (motor)`.
