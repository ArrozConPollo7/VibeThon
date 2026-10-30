# TAREA 05 — Frontend definitivo basado en Stitch (para Claude Code)

> Autor: Claude (arquitecto). Ejecutor: Claude Code. **Tiempo máximo: 50 min (congelar a las 15:45).** Entrega: 16:20.
> Reemplaza a TAREA_03 y TAREA_04 en lo visual. La lógica NO se reescribe.

## 0. Antes de tocar nada (2 min) — red de seguridad
```
git add -A && git commit -m "wip(ui): versión previa a TAREA 05"
git tag ui-v1
```
Si a las 15:45 la versión nueva no pasa la verificación (§6), vuelve con `git checkout ui-v1 -- index.html src/ui` y reporta.

## 1. Qué es "desde cero" y qué NO
- **Desde cero:** toda la capa visual (`index.html`, `src/ui/*`, estilos). La versión anterior fue un rediseño propio que ignoró Stitch: **eso es lo que se corrige**.
- **NO se toca:** `src/engine.js`, `src/data.js`, `src/mapa-datos.js`, `tests/`, `src/vendor/parking-map.js`. Contrato de API: TAREA_01 §9 + TAREA_01B. Puedes reutilizar la lógica de UI que ya funciona (`core.js`: `morf`, toasts, suscripción; validación de placas; accesibilidad; sonidos) adaptándola al nuevo marcado.

## 2. Fuente de verdad del diseño: Stitch
- Archivos locales en `design/`: `01-inicio.html`, `02-mi-turno.html`, `03-valet.html`, `04-seguimiento-entrega.html`, `05-calificacion.html` y **`DESIGN.md` (tokens)**. Ábrelos y léelos completos antes de escribir código.
- Si está configurado el MCP de Stitch, úsalo solo para consultar pantallas que falten; **nunca** copies la API key a ningún archivo del repo.
- Reproduce fielmente: estructura de cada pantalla, jerarquía, tarjetas, barra inferior, íconos, tipografía, colores y radios de `DESIGN.md`. Convierte los tokens de `DESIGN.md` en un `tailwind.config` (con `src/vendor/tailwind.js`, que ya está local) **y** en variables CSS, para que el modo oscuro solo redefina variables.
- **Inspirarse ≠ copiar ciego:** el HTML de Stitch tiene datos inventados y botones sin función. Cada dato visible debe venir del motor y cada botón debe hacer lo que dice (criterio de evaluación).

## 3. Funciona sin internet (obligatorio)
Stitch carga Google Fonts (Inter y **Material Symbols**). En la demo puede no haber red:
- Inter ya está en `src/vendor/inter-variable.woff2`.
- Descarga el `woff2` de Material Symbols Outlined a `src/vendor/` y decláralo con `@font-face`; si no se puede, reemplaza los íconos usados por SVG en línea (`src/ui/iconos.js`).
- Nada de `<script>`/`<link>` a CDNs. Sigue siendo scripts clásicos (sin `type="module"`), doble clic en `index.html`.

## 4. Pantallas (mapeo Stitch → app)
| Stitch | Pantalla en la app | Datos/acciones del motor |
|---|---|---|
| 01-inicio | Inicio: consulta previa + registro | `resumen()` (libres, accesos, recomendado, `historico.ocupacion` "Horas más llenas", `libresPorTipo`), formulario con placa validada (carro `ABC123` / moto `ABC12D`, chip de tipo), hora de clase, valet → `llegar()` |
| 02-mi-turno | Mi turno | `posicion()`, `estimarEspera()`, `llegoAClase()` (alerta + "Usar valet"), "Saldré sin estacionar" → `marcarSaleSinEstacionar()`, política `ParkEngine.POLITICA_TEXTO`, línea de estados |
| *(nueva, mismo estilo)* | **Celda asignada + mapa** | celda, `ruta()` (pasos y polilínea), QR simulado, botones `estacionar()` / `salir()` |
| 03-valet | Valet paso 1–2 (selección y pago, entrega) | `valetSeleccionar`, `valetPagar` (incluye "Simular rechazo"), `valetEntregar` |
| 04-seguimiento-entrega | Valet paso 3 (estacionamiento y llaves) | estados del valet en vivo, casillero, `valetSolicitarCarro()` |
| 05-calificacion | Solo si sobra tiempo, tras `DEVUELTO` | local, sin motor |
| *(nueva, mismo estilo, escritorio)* | **Portería y operación** + **Modo demo** (celular a la izquierda, panel a la derecha) | controles de simulación, pasarelas y afuera, mapa, confirmar portería → `confirmarPorteria()`, medidor de justicia, registro de eventos, `setAutoPorteria()`, exportar JSON |

Las pantallas nuevas deben parecer parte del mismo sistema de Stitch (mismos componentes y tokens).

## 5. Mapa real (los 3 parqueaderos)
- Componente `src/vendor/parking-map.js` con **`ParkingMap.DEFAULT_LOTS` completo: Principal (N), Ingeniería (I) e Idiomas (G)**. El motor ya usa las 880 celdas (`celda.zona` = `N|I|G|M`, nombres en `ParkData.zonas`). Motos `M-xx` no se dibujan: tarjeta aparte.
- Montaje persistente (crear una vez; `morf` no debe destruirlo). Sincronizar con un `setStatuses` de solo cambios: `LIBRE→free`, `RESERVADA→held`, `OCUPADA→taken`. `setTheme` según el tema.
- Celda asignada: `focusLot(ruta.lote)`, `select(celdaId)` y polilínea de `ruta().puntos` (coordenadas 890×1076) animada.
- Operación: campus completo, `onSelect` → tarjeta con celda, parqueadero, estado y placa; botones Principal / Ingeniería / Idiomas / Ver todo.
- Leyenda con texto: Libre, Reservada, Ocupada, Movilidad reducida, Baja emisión, Proveedores.

## 6. Conservar (ya pedidos antes)
Modo oscuro / claro / sistema · tamaño de letra A, A+, A++ · reducir animaciones · sonidos Web Audio con silencio (volumen bajo) · `aria-live` · foco visible · toasts verdes/rojos con el mensaje del motor · estados vacíos con texto · paleta en variables.

## 7. Verificación (antes de las 15:45)
1. Doble clic en `index.html` sin internet: carga, sin badge "Motor de prueba", consola limpia.
2. Inicio → registrar `ABC123` en Regional → Mi turno con posición y espera → recibe celda → mapa con zoom, celda y ruta → portería → estacionar → salir.
3. `RGL206` (estado inicial) recibe `G-210` en Idiomas: el mapa y los pasos lo muestran.
4. Moto `ABC12D` → tarjeta de motos. Placas `AB1234` y duplicada → error en línea y del motor.
5. Valet completo con pago rechazado y luego aprobado, hasta "Llaves en casillero N" y devolución.
6. Pasarela llena con "Generar llegada" → estado "Esperas afuera".
7. Play x10 dos minutos: mapa sin parpadeos ni recrearse.
8. Oscuro + A++ a 390 px: sin desbordes. Compara lado a lado con `design/*.html`: misma apariencia.

Actualiza `docs/STATUS.md` (`## Estado TAREA 05`), agrega "Prompt 5" en `docs/PROMPTS.md` (fallo observado: la versión anterior no siguió Stitch ni incluyó Idiomas; corrección: este documento; verificación: §7) y haz commit `feat(ui): frontend definitivo basado en Stitch`.
