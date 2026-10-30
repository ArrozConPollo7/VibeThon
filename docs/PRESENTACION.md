# Presentación — ParkEAFIT (6 diapositivas, ~2 min + demo 3 min)

## 1. El problema y a quién afecta
- **Usuario:** estudiante que llega en carro a EAFIT por **Regional** o **Las Vegas**.
- Hace fila **sin saber** cuánto esperará ni si habrá celda.
- Los dos accesos comparten un parqueadero **sin coordinación** → asignaciones injustas o duplicadas.
- Resultado: estudiantes atrapados en la fila y **tarde a clase**.

## 2. ParkEAFIT
- **Antes de llegar:** celdas libres, espera por acceso, acceso recomendado, horas más llenas.
- **En la fila:** posición, carros delante y detrás, espera estimada y aviso "¿llegas a clase?".
- **Al asignar:** la celda se **reserva y se comparte al instante** (cero duplicados); parqueadero, número y recorrido en el **mapa real del campus** (880 celdas, 3 parqueaderos).
- **En portería:** se confirma placa + reserva.
- **Valet opcional en 3 pasos:** selección y pago → entrega → estacionamiento y llaves.

## 3. Reparto justo (una frase)
> "La celda es para quien registró primero su llegada, sin importar por qué acceso entró. El orden de cada fila siempre se respeta. El valet no da prioridad."
- Ejemplo real: `RGL206` entra por Regional y recibe `G-210` en Idiomas porque Principal está lleno.
- Quien sale sin estacionar no consume celda pero conserva su lugar. Motos con celdas propias.

## 4. Cómo construimos con IA (calidad del prompting)
- **Roles:** Claude = arquitecto y revisor (especificaciones, contratos, revisión) · Hermes (DeepSeek) = motor y lógica · Claude Code = interfaz · Stitch = diseño.
- **Método:** cada tarea es un documento con objetivo, requisitos del reto, restricciones, contrato de API y **criterios de verificación** (`docs/TAREA_*.md`).
- **Fallo → corrección → comprobación** (de `docs/PROMPTS.md`):
  1. El contrato no fijaba la forma del estado: el motor guardaba vehículos como mapa y la interfaz esperaba lista → la app se rompía al integrar. **Corrección:** `TAREA_01B` fijó el contrato y agregó validación de placas. **Comprobación:** 14/14 pruebas + todas las pantallas con el motor real.
  2. La primera interfaz ignoró el diseño de Stitch y el parqueadero de Idiomas. **Corrección:** `TAREA_05` con Stitch como fuente de verdad y los 3 parqueaderos. **Comprobación:** recorrido automatizado 29/29 en Chrome sin internet.

## 5. Qué funciona y limitaciones
**Funciona:** flujo completo del conductor, reparto FIFO entre accesos sin duplicados, pasarela llena / espera afuera, salir sin estacionar, portería, valet en 3 pasos con pago rechazado, motos, mapa real, accesibilidad (modo oscuro, tamaño de letra, reducir animaciones), funciona sin internet. Pruebas automáticas del motor.
**Limitaciones (honestas):**
- Todo es **simulado y local** (cámaras, llegadas, salidas y pagos); un solo dispositivo.
- La distribución interna de celdas del mapa y el recorrido son **aproximados**.
- La espera se estima con la tasa de salidas observada, sin mirar el futuro; **en picos subestima**: a Laura le estimó 13–23 min y esperó ~46.
- Las motos no se dibujan en el mapa; "Horas más llenas" usa datos simulados.

## 6. Siguiente paso
- **Visión artificial:** leer placas en la línea de registro y contar la fila externa (el motor ya recibe los eventos de una fuente separada, lista para cámaras).
- Historial real para "Horas más llenas" y mejor estimación en horas pico.
- Notificaciones: "sal ahora de casa" según la ocupación prevista.
