# TAREA 06 — Guion de demo, presentación y README (para Hermes / DeepSeek)

> Autor: Claude (arquitecto). Ejecutor: Hermes. **Tiempo: 40 min (terminar antes de las 15:40).** Entrega: 16:20.
> En paralelo Claude Code rehace el frontend (TAREA_05). **Archivos tuyos y solo estos:**
> `tools/demo_caso.js`, `docs/DEMO_GUION.md`, `docs/PRESENTACION.md`, `README.md`.
> **No edites** `src/`, `tests/`, `index.html`, `docs/PROMPTS.md` ni `docs/STATUS.md` (los está usando Claude Code).
> Antes de empezar: `git pull` no hace falta; lee `src/engine.js`, `src/data.js`, `docs/hackathon.md` y `docs/PROMPTS.md`.

## Por qué importa
40 de los 100 puntos son **Impacto y pertinencia** + **Presentación**: usuario identificado, beneficio demostrado con un
ejemplo concreto, propósito claro, demo con un caso real, qué funciona y cuáles son las limitaciones. Hoy no hay nada de eso.

## 1. `tools/demo_caso.js` — los números de la demo salen del motor, no inventados
Script de Node (`node tools/demo_caso.js`) que usa `require('../src/data.js')` y `require('../src/engine.js')` y simula
exactamente lo que se hará en vivo, imprimiendo en cada paso: reloj, posición, delante/detrás, espera estimada,
`llegoAClase`, celda, parqueadero, `ruta().pasos`, eventos relevantes.

Caso base (ajústalo si el motor da otro resultado, pero que siga contando esta historia):
1. 07:30 — Estado inicial: parqueadero casi lleno, 6 carros en pasarela, 1 afuera en Regional.
   Mostrar que `RGL206` (Regional) recibe celda en **Idiomas** porque Principal está lleno → reparto justo y sin duplicados.
2. Avanzar hasta ~07:42 (con `setAutoPorteria(true)`). **Laura**, estudiante de Ingeniería con clase a las **08:00**,
   registra `LAU123` por Regional. La app le muestra posición, carros delante/detrás y espera estimada.
3. `llegoAClase` dice que llegará tarde → la app sugiere valet. Ella toma valet: seleccionar → pago **rechazado**
   (mostrar el error) → pago aprobado → entrega (código V-xxx) → se va a clase. **Su carro conserva su turno** (sin prioridad).
4. Avanzar hasta que el carro de Laura recibe celda, se estaciona y las llaves quedan en el casillero N.
5. Contraste: otro estudiante sin valet registrado justo antes que Laura recibe celda **antes** que ella → prueba de que el valet no da prioridad.
6. Laura pide su carro → devuelto.
Al final imprime un **resumen**: minutos que Laura habría perdido en la fila vs. minutos ahorrados para llegar a clase, celdas asignadas por acceso y espera promedio por acceso (medidor de justicia).
Si algún paso no ocurre como se espera, NO cambies el motor: ajusta el caso (otra hora, otro acceso) y anótalo.

## 2. `docs/DEMO_GUION.md` — guion de 3 minutos
- Tabla: tiempo (0:00–3:00) · quién habla · qué se hace en pantalla (clics exactos en Modo demo) · qué se dice · número que debe verse (de `demo_caso.js`).
- Incluye el **plan B**: si la UI falla, correr `node tools/demo_caso.js` y `node tests/engine.test.js` en vivo (14/14).
- Frases cortas, sin jerga. Debe nombrar explícitamente: usuario beneficiado, necesidad, beneficio concreto con número.

## 3. `docs/PRESENTACION.md` — contenido de 6 diapositivas (texto listo para pegar)
1. **Problema y usuario**: estudiante que llega en carro por Regional o Las Vegas; fila ciega, asignaciones duplicadas, tarde a clase.
2. **Solución**: ParkEAFIT — ver la fila antes de llegar, posición y espera en vivo, celda reservada al asignarse (sin duplicados),
   mapa real con zona, número y recorrido, confirmación en portería, valet opcional en 3 pasos.
3. **Política de reparto** (explicada en una frase + ejemplo `RGL206 → Idiomas`): FIFO global por hora de registro, respeta el orden de cada fila; el valet no da prioridad; motos con celdas propias.
4. **Cómo trabajamos con IA (criterio de prompting)**: roles (Claude arquitecto/revisor, Hermes motor, Claude Code frontend, Stitch diseño);
   especificaciones como contrato; **2 fallos reales y su corrección** tomados de `docs/PROMPTS.md` (ej.: contrato ambiguo `vehiculos` mapa vs. arreglo → TAREA_01B → 14/14 pruebas; frontend que ignoró Stitch e Idiomas → TAREA_05 → verificación §7).
5. **Qué funciona y limitaciones** (honesto): todo simulado y local; mapa con distribución de celdas aproximada; recorrido aproximado; estimación por tasa observada (EWMA) sin ver el futuro; motos no dibujadas; pagos simulados; un solo dispositivo.
6. **Futuro**: visión artificial para leer placas y contar la fila (la interfaz `FuenteDeSensores` ya está separada del motor), datos históricos reales para "Horas más llenas", notificaciones.

## 4. `README.md`
Reescríbelo: qué es, cómo abrirlo (doble clic en `index.html`, sin internet), cómo correr pruebas y `demo_caso.js`,
estructura de carpetas, roles de IA, limitaciones. Corto (≤ 80 líneas).

## 5. Al terminar
`node tools/demo_caso.js` sin errores. Commit **solo de tus archivos**:
`git add tools/demo_caso.js docs/DEMO_GUION.md docs/PRESENTACION.md README.md && git commit -m "docs(demo): guion, presentación y caso de demo"`.
No uses `git add -A`. Reporta en el chat: el resumen de números del caso y cualquier ajuste que hiciste.
