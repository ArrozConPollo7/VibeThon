# Registro de prompting (criterio de evaluación: 20 pts)

Por cada prompt relevante, completar:

## Prompt N — [módulo]
- **Herramienta:** Claude / Hermes (DeepSeek) / Stitch
- **Objetivo:**
- **Prompt usado:** (pegar o enlazar archivo)
- **Resultado / fallo observado:**
- **Corrección del prompt:**
- **Cómo verificamos:** caso de prueba, esperado vs. obtenido

---

## Prompt 1 — Motor de lógica
- **Herramienta:** Hermes (DeepSeek)
- **Objetivo:** construir el motor de filas, reparto justo, reservas y valet.
- **Prompt usado:** `docs/TAREA_01_MOTOR_HERMES.md`
- **Resultado / fallo observado:** 10/10 pruebas en verde. Al integrar con el frontend falló: el motor guardaba `vehiculos` como mapa y la UI (ya sobre el contrato 01B) esperaba arreglo → `App.vehiculos(...).find is not a function`; además faltaba la validación de placas/motos y `setAutoPorteria`.
- **Corrección del prompt:** `TAREA_01B` fijó la forma de `state` y las validaciones; se aplicó al motor y las pruebas usaban conductores de 1 letra y placas `PAS01` que la nueva validación rechaza (se corrigieron los datos de prueba, no la regla).
- **Cómo verificamos:** `node tests/engine.test.js` → 14/14; prueba de humo que genera todas las pantallas del frontend con el motor real sin errores.

## Prompt 2 — Frontend
- **Herramienta:** Claude Code
- **Objetivo:** construir la interfaz completa sobre el contrato del motor, sin esperar a Hermes.
- **Prompt usado:** `docs/TAREA_02_FRONT_CLAUDE_CODE.md`
- **Resultado / fallo observado:** la interfaz quedó funcional con el stub. La revisión de capturas encontró lo que las pruebas no ven: "Confirmar en portería" bajo el pliegue en modo demo, scroll heredado al cambiar de pestaña, celdas libres poco visibles y títulos de 18 px en vez de 24.
- **Corrección del prompt:** el contrato dejó ambigüedades (nombre global de `data.js`, forma de `state`, flujo del valet, `autoPorteria`), registradas en `docs/PREGUNTAS.md`. Conviene fijarlas en la sección 9 de TAREA_01.
- **Cómo verificamos:** recorrido automatizado en Chrome sobre `file://` sin red, a 1440 y 390 px (21/21 comprobaciones: flujo completo, valet con rechazo, AFUERA, exportar, sin scroll horizontal, mínimo 14 px, consola limpia), más revisión visual de capturas.

## Prompt 3 — Rediseño inmersivo y accesibilidad
- **Herramienta:** Claude Code
- **Objetivo:** identidad EAFIT, validación de placas, motos, tema oscuro, tamaño de letra, animaciones y sonidos, sin romper el flujo.
- **Prompt usado:** `docs/TAREA_03_REDISENO_FRONT.md`
- **Resultado / fallo observado:** el motor cambió dos veces durante la tarea. Con el `data.js` real, las celdas sobre y=30 chocaban con la vía fija del mapa, y a A++ en 390 px la barra superior fija ocupaba media pantalla. Además, `ABC123`, la placa de ejemplo, está precargada como carro estacionado.
- **Corrección del prompt:** el mapa pasó a dibujarse desde las coordenadas reales y la barra dejó de ser fija en móvil. Conviene pedir en la especificación que los datos de prueba no usen las placas de ejemplo de la interfaz.
- **Cómo verificamos:** recorrido automatizado después de cada bloque en Chrome sobre `file://` sin red, con motor real y stub (placas, moto a celda M, duplicada, temas, A++ a 390 px, persistencia, objetivos de 44 px), contraste AA medido en 25 pares y revisión de capturas.

## Prompt 4 — Mapa real del campus
- **Herramienta:** Claude Code
- **Objetivo:** reemplazar el plano por el mapa real de 624 celdas sin perder estado entre renders.
- **Prompt usado:** `docs/TAREA_04_MAPA_REAL.md`
- **Resultado / fallo observado:** al llegar las celdas reales, el mapa anterior rompió el render porque no conocía los tipos `PMR` y `ECO`. Además, `ParkingMap` crea su propio DOM y `App.morf` lo habría borrado en cada render. Con una celda en otro lote, el zoom pedido ocultaba el inicio de la ruta.
- **Corrección del prompt:** nodo persistente que `morf` salta, y vista completa cuando el acceso y la celda están en lotes distintos.
- **Cómo verificamos:** 19/19 comprobaciones del mapa (reservadas contra el motor, `RGL206` → `I-170`, moto, x10 sin recrear el nodo, tema oscuro, A++ a 390 px) y 41/41 del recorrido completo.

## Prompt 5 — Rediseño con las pantallas de Stitch
- **Herramienta:** Stitch → Claude Code
- **Objetivo:** aplicar las 5 pantallas de Stitch y construir las faltantes con el mismo estilo.
- **Prompt usado:** instrucción directa del usuario; diseños en `design/`.
- **Resultado / fallo observado:** Stitch rellenó las pantallas con datos que contradicen el reto (sector Idiomas, Carpooling, valet a $6.000, conductor y fotos inventados) y con botones sin función. Las URL de descarga directa devolvieron 401: había que usar `download_file`.
- **Corrección del prompt:** tomar de Stitch el orden y el estilo, y los datos del motor. Conviene darle a Stitch el alcance del reto antes de generar.
- **Cómo verificamos:** recorrido automatizado con el flujo de valet hasta la calificación, mapa, temas, A++ a 390 px y sin red, más comparación de capturas contra los diseños.

## Prompt 5 — Frontend definitivo basado en Stitch
- **Herramienta:** Claude (arquitecto) → Claude Code
- **Objetivo:** rehacer toda la capa visual siguiendo `design/` y conectar cada dato y botón al motor.
- **Prompt usado:** `docs/TAREA_05_FRONT_STITCH.md`.
- **Resultado / fallo observado:** la versión anterior no siguió Stitch ni incluyó Idiomas.
- **Corrección del prompt:** ese documento fija a `design/` como fuente de verdad, exige funcionar sin internet y los 3 parqueaderos, y define una vuelta atrás a `ui-v1`.
- **Cómo verificamos:** §7 de la tarea con un recorrido automatizado en Chrome sin red (29 de 29), 14 pruebas del motor y comparación con capturas de Stitch. Ver `docs/STATUS.md`.

## Prompt 1B — Ajustes del contrato del motor
- **Herramienta:** Claude (arquitecto) → Hermes
- **Fallo observado:** la especificación original no fijaba el nombre global de los datos, la forma de `state` ni el flujo del valet, y tenía un error (3 en pasarela + 1 afuera con capacidad 4). Claude Code lo detectó al construir contra el contrato.
- **Corrección del prompt:** `docs/TAREA_01B_AJUSTES_MOTOR.md` fija esos puntos y agrega validación de placas (carro/moto) en el motor.
- **Cómo verificamos:** pruebas 11–13 en `tests/engine.test.js` y recorrido en la UI con el motor real.

## Prompt 8 — Valet del operador
- **Herramienta:** Hermes (DeepSeek)
- **Objetivo:** dar respaldo en el motor a la vista del operador del valet (ticket, inspección, ubicación, PIN).
- **Prompt usado:** `docs/TAREA_08_HERMES_VALET_OPERADOR.md` (+ referencia `stitch_parkeafit_campus_parking_app/`).
- **Resultado / fallo observado:** el valet de Stitch mostraba ticket, operador, inspección y PIN sin respaldo en
  el motor (`pinEntrega` se inventaba el PIN desde la placa y el precio estaba escrito a mano). Al ejecutar, el
  flujo se detenía porque el carro con valet entra 5.º a la pasarela y nadie confirmaba portería.
- **Corrección del prompt:** la tarea; además se agregó el botón "Recibir vehículo" (sin él la inspección no tenía
  por dónde empezar) y el mensaje de resultado por acción.
- **Cómo verificamos:** §4 de la tarea (17/17, `file://`, flujo estudiante→operador→PIN con `LAU123`/`I-040`).

## Prompt 10 — Valet completo, preferencias y casos JSON
- **Herramienta:** Hermes (DeepSeek)
- **Objetivo:** operador del valet de punta a punta, información para el estudiante y preferencia de celda sin
  romper la justicia; evidencia de calidad con casos JSON.
- **Prompt usado:** `docs/TAREA_10_HERMES_VALET_COMPLETO.md`.
- **Resultado / fallo observado:** el valet de Stitch prometía fotos, ubicación y PIN sin respaldo en el motor; el
  operador no existía como rol (nadie "aceptaba" el servicio). Al ejecutar, los casos JSON destaparon dos errores
  propios: el runner no validaba nombres de conductor de una letra y una placa de caso (`PAS05`) no cumplía el
  formato.
- **Corrección del prompt:** la tarea; en el código, `fotos` pasó de número a arreglo de imágenes y hubo que
  actualizar las pruebas 8/15/16/17 por el estado `ACEPTADO`.
- **Cómo verificamos:** `node tests/engine.test.js` (17/17), `node tests/casos.test.js` (18/18) y recorrido en
  `index.html` con `file://` (ver §5 en STATUS).
