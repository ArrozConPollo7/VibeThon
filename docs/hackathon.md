# VibeThon — notas del evento

## Reto
Parqueadero compartido de EAFIT (accesos Regional y Las Vegas): visibilidad de la espera,
reparto justo de celdas entre accesos y valet opcional. Todo simulado y local.

## Entrega
Hoy 30-oct-2026, ~16:20. Criterios (20 pts c/u): Funcionalidad, UI/UX, Calidad del prompting,
Impacto y pertinencia, Presentación.

## Stack
Un solo HTML + Tailwind (exportado de Stitch) + JavaScript clásico (sin módulos, funciona con file://).
Motor puro en `src/engine.js`, datos en `src/data.js`.

## Decisiones
- 30-oct 13:30 — Reparto FIFO global por hora de registro — explicable, respeta el orden de cada fila.
- 30-oct 13:30 — El valet no da prioridad: el carro conserva su turno por hora de registro — exigido por el reto.
- 30-oct 13:30 — Visión artificial solo como propuesta futura; datos de prueba simulados — el reto simula las cámaras.
- 30-oct 13:30 — La estimación de espera no lee eventos futuros del guion — evita resultados "con trampa".
