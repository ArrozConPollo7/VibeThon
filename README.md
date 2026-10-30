# VibeThon — ParkEAFIT

Parqueadero compartido de EAFIT (accesos Regional y Las Vegas): visibilidad de la espera, reparto justo de
celdas y valet opcional. Todo simulado y local: un HTML + JavaScript clásico, sin npm, sin backend.

## Estructura

```
.
├── AGENTS.md                 # convenciones de trabajo y protocolo entre IAs
├── docs/                     # reto, decisiones, tareas, preguntas, status
├── src/data.js               # datos de prueba (celdas, accesos, guion, histórico)
├── src/engine.js             # motor puro: filas, celdas, valet, eventos (sin DOM)
├── src/debug.html            # verificación manual del motor (sin estilos)
└── tests/engine.test.js      # 10 pruebas con assert de Node
```

## Cómo probar

```bash
node tests/engine.test.js      # 17/17 pruebas
node tests/casos.test.js       # 18/18 casos de ejemplo
```

Verificación manual: abrir `src/debug.html` con doble clic (funciona en `file://`) y usar los botones de avance,
llegadas, portería, valet e invariantes. Detalle en `docs/STATUS.md`.

## Estado

| Fase | Alcance | Estado |
|---|---|---|
| 0 | Andamiaje del repo y convenciones | ✅ |
| 1 | Motor de lógica (TAREA 01) | ✅ ver `docs/STATUS.md` |
| 2 | Front / integración con el diseño | ⏳ |