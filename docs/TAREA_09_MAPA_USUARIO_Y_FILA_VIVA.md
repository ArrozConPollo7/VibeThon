# TAREA 09 — Mapa para el estudiante + fila en vivo animada (para Claude Code)

> Autor: Claude (arquitecto). Ejecutor: Claude Code. **Congelar a las 15:55.** Entrega 16:20.
> En paralelo Hermes hace TAREA_08 (valet) y edita `src/engine.js`, `tests/`, `src/ui/valet.js`, `src/ui/app.js`,
> `index.html` y crea `src/ui/valet-operador.js`. **Tú no tocas esos archivos.** Los tuyos: `src/ui/mapa.js`,
> `src/ui/inicio.js`, `src/ui/turno.js`, `src/ui/operacion.js`, `src/ui/styles.css`. No crees archivos nuevos
> (exigirían editar `index.html`). En `mapa.js` **solo agrega**: no cambies la firma de `hueco`, `vista`, `enfocar`,
> `leyenda`, `reiniciar`, que Hermes reutiliza.
> Antes de empezar: `git tag ui-v3`. Si a las 15:55 no está estable, `git checkout ui-v3 -- src/ui/mapa.js src/ui/inicio.js src/ui/turno.js src/ui/operacion.js src/ui/styles.css`.

## Decisión de producto (no implementar elección de celda)
El estudiante **NO** reserva una celda ni un parqueadero específico. El reto exige asignar celdas de forma justa entre
accesos; si cada quien elige, el FIFO global se rompe y vuelven los conflictos. El mapa del estudiante es **para consultar**.
Texto en la UI (junto al mapa): "Las celdas se asignan en orden de llegada para que sea justo entre accesos. Aquí ves cómo está el parqueadero ahora."

## 1. Mapa en Inicio (antes de registrarse)
- En `inicio.js`, debajo de las tarjetas de acceso: mapa del campus completo (los 3 parqueaderos) con el hueco persistente de `App.mapas`
  (nueva instancia, p. ej. `'inicio'`), altura ~280 px en celular.
- Botones Principal / Ingeniería / Idiomas / Ver todo; por parqueadero: "N libres de M" (contar desde `engine.state.celdas` por `zona`, solo tipo CARRO).
- Tocar una celda: tarjeta corta con id, parqueadero y estado (sin botón de reservar). Leyenda existente.

## 2. Fila en vivo animada sobre el mapa (Inicio, Mi turno y Operación)
Capa nueva en `mapa.js`, `<g class="fila-viva">` agregada **una vez** al `<svg>` de cada instancia, encima de las celdas, y
actualizada en `sincronizar()` (que ya corre en cada notificación del motor).
- **Fichas**: un carro (círculo o ícono pequeño, r≈7) por vehículo en `state.pasarelas[acceso]` y `state.afuera[acceso]`, con `data-placa`.
  Colores: normal primario; **el vehículo del estudiante activo** en acento y más grande con anillo pulsante; valet con borde amarillo;
  "sale sin estacionar" con borde punteado; moto más pequeña.
- **Posición**: ranuras a lo largo de la vía de cada acceso. Pasarela = 4 ranuras desde el punto del acceso hacia afuera; "Afuera" = las siguientes,
  separadas por una línea de corte con texto "Pasarela llena". Puntos de acceso: Regional `(214,240)`, Las Vegas `(330,1062)`.
  Dirección inicial sugerida: Regional hacia el norte por la vía (x≈220, y decreciendo); Las Vegas hacia el oeste (x decreciendo, y≈1062).
  **Ajusta las direcciones mirando una captura** para que las fichas queden sobre la vía, no sobre edificios ni dentro de los parqueaderos.
  Máx. 10 fichas visibles por acceso; si hay más, una etiqueta "+N".
- **Animación**: cada ficha es un `<g>` con `transform` y `transition: transform 500ms ease` (por placa, reutilizar el nodo; nunca recrear la capa).
  - Llega un carro: aparece al final con fundido.
  - Avanza la fila: se desliza a la ranura siguiente.
  - **Pasa portería** (`EN_RECORRIDO`): la ficha recorre `engine.ruta(placa).puntos` hasta su celda (≈1,2 s, en tramos) y se desvanece; la celda pasa a ocupada.
  - Sale sin estacionar: se aleja por la vía y se desvanece.
  - Con "Reducir animaciones": sin desplazamientos, cambios instantáneos.
- `aria-hidden="true"` en la capa (la información ya está en texto). Tooltip con la placa al pasar el mouse (operación).
- Rendimiento: solo `transform`/`opacity`; nada por cada tic si no hubo cambios.

## 3. Mi turno
Mientras el estudiante espera (sin celda), muestra el mapa enfocado en su acceso con su ficha resaltada en la fila
("Tú" sobre la ficha). Cuando recibe celda, el comportamiento actual (zoom, celda, ruta) se mantiene.

## 4. Verificación (antes de las 15:55)
1. Inicio: mapa visible a 390 px, libres por parqueadero correctos, tocar celda muestra tarjeta sin reservar.
2. Modo demo + Play x10: las fichas aparecen, avanzan y van a su celda; la de Laura (`LAU123`) se ve destacada en Mi turno.
3. Pasarela llena: fichas extra después de la línea "Pasarela llena".
4. Reducir animaciones: sin movimiento. Modo oscuro: fichas visibles.
5. Consola limpia, sin internet; el mapa no se recrea (mismo nodo `<svg>`).
6. El flujo completo de TAREA_05 §7 sigue pasando.
Escribe `## Estado TAREA 09` en `docs/STATUS.md` (solo agrega una sección al final) y commit solo de tus archivos.
