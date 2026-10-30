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

## Prompt 1B — Ajustes del contrato del motor
- **Herramienta:** Claude (arquitecto) → Hermes
- **Fallo observado:** la especificación original no fijaba el nombre global de los datos, la forma de `state` ni el flujo del valet, y tenía un error (3 en pasarela + 1 afuera con capacidad 4). Claude Code lo detectó al construir contra el contrato.
- **Corrección del prompt:** `docs/TAREA_01B_AJUSTES_MOTOR.md` fija esos puntos y agrega validación de placas (carro/moto) en el motor.
- **Cómo verificamos:** pruebas 11–13 en `tests/engine.test.js` y recorrido en la UI con el motor real.
