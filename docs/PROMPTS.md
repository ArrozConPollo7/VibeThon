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
- **Resultado / fallo observado:** 10/10 pruebas en verde al primer ciclo (una prueba falló por un índice de
  vehículo en el propio test, no por el motor). El contrato de la §9 se respetó sin renombrar nada; las
  ambigüedades quedaron como desviaciones documentadas en `docs/STATUS.md` y preguntas en `docs/PREGUNTAS.md`.
- **Corrección del prompt:** no hizo falta reescribir el prompt; sí faltó en la especificación (a) el estado de un
  carro con valet antes de entregarse, (b) qué dispara `SOLICITADO → DEVUELTO` y (c) el criterio de `recomendado`
  cuando el reparto es FIFO global (ambos accesos quedan en la misma posición global).
- **Cómo verificamos:** `node tests/engine.test.js` → `10/10 pruebas pasaron`; y `src/debug.html` abierto con
  `file://` (avance de 45 min, llegadas, portería, exportar/importar, invariantes) sin errores de consola.
