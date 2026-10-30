# TAREA 04 — Integrar el mapa real del campus (para Claude Code)

> Autor: Claude (arquitecto). Ejecutor: Claude Code. **Tiempo máximo: 35 min.** Entrega final: 16:20.
> Si estás en medio de TAREA_03, termina el bloque actual, recorre el flujo y luego empieza esta.
> Regla de oro: no romper lo que funciona. Si el mapa nuevo no queda estable en 25 min, deja el mapa SVG anterior
> funcionando y anota el bloqueo en `docs/STATUS.md`.

## 0. Qué cambió en el motor (ya hecho por Claude, no lo toques)
- `src/vendor/parking-map.js`: componente del mapa (SVG, sin dependencias, funciona con `file://`). Doc: `docs/parkeafit-mapa/parkeafit-mapa/README.md`.
- `src/mapa-datos.js`: celdas reales generadas del componente. **Ya está en `index.html` antes de `src/data.js`; no lo quites.**
- `src/data.js` ahora usa **624 celdas reales**: lote **`N` = Parqueadero Principal** (acceso Regional) y **`I` = Parqueadero de Ingeniería** (acceso Las Vegas), más 10 celdas de moto `M-01..M-10` (no se dibujan en el mapa).
  - `celda.zona` es `'N' | 'I' | 'M'`; `celda.tipo` es `'CARRO' | 'MOTO' | 'PMR' | 'ECO'` (PMR y ECO existen pero el motor no las asigna); `celda.orden` = cercanía a la entrada; `x, y` en coordenadas del mapa (890×1076).
  - Nombres de zona: `ParkData.zonas[zona].nombre` ("Parqueadero Principal", "Parqueadero de Ingeniería", "Motos · Ingeniería"). **Elimina cualquier texto "Zona A/B/C"** de la UI.
  - Es **un solo parqueadero compartido**: un carro de Regional puede recibir celda en Ingeniería si es lo más cercano libre (eso es el reto). `ruta(placa)` devuelve `{ puntos (coordenadas del mapa), pasos, lote }`.
  - `resumen().total` y `libres` cuentan solo celdas asignables (carro + moto). `resumen().libresPorTipo`/`totalPorTipo` siguen igual.
- El parqueadero `G` (Guayabos / Idiomas) **no** está en el reto (tercer acceso): no se dibuja.

## 1. Montaje (lo más importante)
`ParkingMap.create(contenedor, ...)` crea su propio DOM. La UI re-renderiza con `App.morf`, que **destruiría el mapa** en cada cambio. Por eso:
- Crea el mapa **una sola vez por contenedor** y mantenlo vivo: un nodo persistente que `morf` no toque (por ejemplo, un `<div data-mapa-persistente>` que el diff salte, o montarlo fuera del árbol re-renderizado y moverlo con `appendChild` al hueco correspondiente después de cada render).
- Usa los 3 lotes (`ParkingMap.DEFAULT_LOTS`): Principal, Ingeniería e Idiomas.
- Sincroniza en cada notificación del motor (`engine.suscribir`) con **un solo** `setStatuses(...)` que solo incluya celdas que cambiaron: `LIBRE→'free'`, `RESERVADA→'held'`, `OCUPADA→'taken'`. Ignora las `M-xx` (no existen en el mapa).
- Tema: `setTheme('dark'|'light')` según la preferencia de accesibilidad, también al cambiarla.

## 2. Dónde va el mapa
1. **Celda asignada (celular):** reemplaza el plano SVG anterior. Al asignarse la celda: `focusLot(ruta.lote)` y `select(celdaId)`. Dibuja la ruta de `engine.ruta(placa).puntos` como `<polyline>` dentro del `<svg>` del componente (mismo sistema de coordenadas 890×1076), en color acento, con animación de trazo (`stroke-dashoffset`) que respete "Reducir animaciones". Debajo: pasos de `ruta().pasos`. Si la celda es de moto (`zona === 'M'`), muestra una tarjeta "Motos · Ingeniería — celda M-04" en vez del mapa.
2. **Portería y operación (escritorio):** el mapa del campus completo reemplaza el plano del centro. `onSelect(celda)` muestra un tooltip/tarjeta con id, parqueadero, estado y placa (búscala en `engine.state.celdas`). Botones "Principal", "Ingeniería", "Ver todo" (`focusLot` / `showAll`). Al reservarse una celda nueva, destácala 1,5 s (pulso) sin mover la vista del operador.
3. **Inicio (opcional, si sobra tiempo):** mini-mapa no interactivo con libres por parqueadero.

## 3. Detalles de UX
- Leyenda visible: Libre, Reservada, Ocupada, Movilidad reducida, Baja emisión (con texto, no solo color).
- Tarjeta de motos con `libresPorTipo.MOTO / totalPorTipo.MOTO`.
- Altura: ~320 px en el celular, ~70 vh en escritorio. Sin scroll horizontal a 390 px. El zoom/tap del componente debe seguir funcionando con el dedo.
- Accesibilidad: el contenedor con `aria-label` que resuma ("Mapa: 3 celdas libres de 614. Tu celda: I-060"). Para lectores de pantalla, la información clave también va en texto fuera del mapa.
- Rendimiento: no recrees el mapa al cambiar de pestaña ni en cada tic del reloj.

## 4. Verificación antes de reportar
- Arranque: 6 carros en pasarela; las celdas reservadas (amarillo) coinciden con `engine.state.celdas`.
- Registrar un carro en Regional → al recibir celda el mapa hace zoom al lote correcto, resalta la celda y dibuja la ruta.
- Un carro de Regional que recibe celda en Ingeniería (pasa en el estado inicial con `RGL206` → `I-170`): la ruta y el texto lo explican.
- Moto `ABC12D` → tarjeta de motos, sin errores.
- Play x10 durante 2 min simulados: el mapa se actualiza sin parpadeos ni recrearse; consola limpia.
- Modo oscuro y A++ a 390 px.
- Abrir con doble clic sin internet.

Actualiza `docs/STATUS.md` (`## Estado TAREA 04`) y agrega "Prompt 4" en `docs/PROMPTS.md` con un fallo observado y su corrección. Haz commit al terminar (`feat(ui): ...`).
