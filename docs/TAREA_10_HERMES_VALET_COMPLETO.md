# TAREA 10 — Valet completo, preferencia de parqueadero/celda y casos JSON (para Hermes / DeepSeek)

> Autor: Claude (arquitecto). Ejecutor: Hermes. **Entrega 16:20 → congelar a las 16:08.** Continúa sobre tu trabajo de TAREA_08 (17/17 pruebas).
> Archivos tuyos: `src/engine.js`, `tests/**`, `src/ui/valet.js`, `src/ui/valet-operador.js`, `src/ui/app.js`, `src/ui/inicio.js`, `index.html`, `docs/STATUS.md`, `docs/PROMPTS.md`.
> Claude Code terminó (TAREA_09). Nadie más edita: puedes tocar `inicio.js`, pero **no cambies `src/ui/mapa.js`**: úsalo (`App.mapas.hueco`, `vista`, `enfocar`).

## 0. Ya (1 min)
`git add -A && git commit -m "feat(valet): avance TAREA 08"` y `git tag ui-v4`. Si algo se rompe: `git checkout ui-v4 -- .`

## Orden de prioridad (si no alcanza, corta desde abajo, pero haz commit al terminar cada bloque)
A. Casos JSON + runner (§4) — **obligatorio**, es la evidencia de calidad.
B. Vista del operador del valet completa (§1).
C. Información del valet para el estudiante (§2).
D. Preferencia de parqueadero / celda (§3).

---

## 1. Vista "Valet (operador)" — la persona que trabaja de valet
Basada en `stitch_parkeafit_campus_parking_app/screen.png` + `code.html` y `design/03-valet.html` / `04-seguimiento-entrega.html`.
**Motor (agregar):**
- `valetAceptar(placa, operador)`: solo si `valet.estado === 'PAGADO'` (el estudiante pagó y se acerca). Asigna `valet.operador` (el que acepta) y pasa a `ACEPTADO`. Error claro si otro ya lo aceptó.
- `valetEntregar(placa)` (existente) ahora exige `ACEPTADO` (antes `PAGADO`): el operador **recibe** el carro.
- `valetInspeccionar(placa, {combustible, km, novedades, fotos})`: `fotos` es un **arreglo de hasta 4 imágenes** `{vista: 'Frontal'|'Trasera'|'Lat. izq.'|'Lat. der.'|'Tablero', dataUrl}`. Validar: máx. 4, `dataUrl` empieza por `data:image/`, ≤ 300 000 caracteres cada una. Mantén la validación de km y combustible.
- `valetRegistrarUbicacion(placa, {nota})`: solo con el carro `ESTACIONADO`; guarda `valet.ubicacion = {celdaId, zona, nombreZona, casillero, nota (≤ 140, ej. "Sótano, junto a la columna 12"), hora}`. Evento `VALET_UBICACION`.
- `valetListar()` incluye `ubicacion` e `inspeccion` (sin `pin`).
**UI (`valet-operador.js`):**
- Selector "Soy: Carlos Restrepo / Luisa Mejía / Andrés Gil" arriba (operador activo).
- Bandeja **"Por aceptar"** (PAGADO) con botón **Aceptar servicio** → luego **Recibir vehículo** (`valetEntregar`).
- Ficha del servicio con pasos: 1 Aceptar → 2 Recibir e inspeccionar → 3 Estacionar → 4 Dónde quedó y llaves → 5 Entregar con PIN.
- **Fotos reales**: `<input type="file" accept="image/*" capture="environment">` por vista; reduce cada imagen en un `<canvas>` a máx. 480 px de lado, JPEG calidad 0.7, y envía el `dataUrl`. Miniaturas con opción de quitar. Si no hay cámara, un botón "Usar foto de ejemplo" genera una imagen simulada en canvas (rectángulo con la vista y la placa) para la demo.
- "Dónde quedó": parqueadero + celda + mapa enfocado (`App.mapas.hueco` con `{celda, lote}`), casillero de llaves y nota libre → **Guardar ubicación**.
- Entrega: campo PIN → `valetEntregarCliente`. Todos los errores del motor en rojo; éxitos en verde.

## 2. Información del valet para el estudiante (`valet.js`)
- Tarjeta del operador como en Stitch: **avatar** (círculo con iniciales y color por nombre, generado en SVG — **no** fotos de personas reales), nombre, "Valet EAFIT Movilidad · verificado", calificación fija simulada (ej. 4.9) y "Caseta Valet · Ext. #4500".
- Ticket, tarifa real del motor, estado en vivo, **PIN de entrega** grande, punto de entrega.
- **Inspección**: combustible, km, novedades y **miniaturas de las fotos** que subió el operador (tocar → ampliar en un modal accesible).
- **Dónde quedó tu carro**: parqueadero, celda, nota y casillero (de `valet.ubicacion`) + mapa.
- Antes de que un operador acepte: "Buscando un operador…".

## 3. Preferencia de parqueadero o celda — sin romper la justicia
Regla (explícala en la UI con esta frase): **"Tu preferencia no te adelanta en la fila: cuando llegue tu turno, te damos esa celda o ese parqueadero si están libres; si no, la más cercana."**
**Motor:** `llegar({..., preferencia: {zona?: 'N'|'I'|'G', celdaId?: 'N-150'}})`. Validar que la zona exista y que la celda exista y sea del tipo del vehículo.
En `asignarCeldas()` el **orden de quién recibe sigue siendo FIFO global**; solo cambia **qué celda** recibe: 1) `celdaId` preferida si está LIBRE; 2) la más cercana a su portería dentro de la `zona` preferida; 3) la más cercana en general. La preferencia nunca bloquea ni retrasa a nadie.
Guarda `v.preferencia` y `v.preferenciaCumplida` (`'celda'|'zona'|'no'`) al asignar; `estimarEspera` no cambia.
**UI (Inicio):** selector "Parqueadero preferido: Cualquiera / Principal / Ingeniería / Idiomas" y en el mapa de Inicio, al tocar una celda **libre** de carro, botón **"Preferir esta celda"** (rellena la preferencia del formulario; no reserva). Mostrar la preferencia elegida en el formulario y luego en Mi turno ("Preferiste N-150 → recibiste N-150" o "…no estaba libre, recibiste I-060").

## 4. Casos de ejemplo en JSON + runner (obligatorio)
- `tests/casos.json`: arreglo de casos `{ "id", "titulo", "datos": "demo" | {celdas personalizadas…}, "pasos": [ { "accion": "llegar", "args": {...}, "espera": {"ok": true} }, { "accion": "avanzar", "args": 3 }, { "accion": "valetPagar", "args": ["LAU123", "RECHAZO"], "espera": {"ok": false, "error": "Pago rechazado. Intenta con otro método."} }, { "verificar": {"placa": "LAU123", "estado": "EN_PASARELA", "celdaId": "N-150", "valet.estado": "ACEPTADO"} } ] }`.
- `tests/casos.test.js`: ejecuta cada caso sobre un motor nuevo, llama `verificarInvariantes()` después de cada paso, compara `espera`/`verificar` (rutas con puntos, p. ej. `valet.estado`) e imprime `✅/❌ id — título` y al final `X/Y casos pasaron` (código de salida 1 si falla alguno).
- **Mínimo 15 casos**, cubriendo: placas válidas/ inválidas/ minúsculas/ duplicadas; nombre y hora de clase inválidos; FIFO entre accesos; orden por fila; pasarela llena y entrada desde afuera; sale sin estacionar; portería (no es el primero, sin celda, correcto); motos sin bloqueo cruzado; preferencia de celda cumplida, de zona cumplida y no cumplida (sin perder turno); valet completo feliz (pagar → aceptar → recibir → inspeccionar con fotos → estacionar → ubicación → solicitar → bahía → PIN correcto); valet errores (recibir sin aceptar, inspección con 5 fotos, PIN incorrecto, aceptar dos veces); valet sin prioridad; determinismo del guion.
- Las 17 pruebas de `engine.test.js` deben seguir pasando. Agrega en `README` o `STATUS` el comando `node tests/casos.test.js`.

## 5. Verificación final (antes de las 16:08)
1. `node tests/engine.test.js` y `node tests/casos.test.js` → todo en verde (pega la salida en `STATUS.md`).
2. Doble clic en `index.html` sin internet; consola limpia.
3. Recorrido con 2 vistas en Modo demo (celular = estudiante, panel = operador): estudiante paga con valet → operador acepta, recibe, sube 2 fotos, ve dónde quedó, guarda nota → estudiante ve operador, inspección con fotos y ubicación → solicita → operador entrega con PIN.
4. Estudiante prefiere Idiomas y una celda libre: el resultado se explica en Mi turno.
5. Flujo sin valet sigue funcionando.
Commit `feat(valet): operador completo, preferencias y casos JSON` y avisa en el chat. **No hagas push** (lo hace el equipo).
