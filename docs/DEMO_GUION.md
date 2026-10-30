# Guion de demo — ParkEAFIT (3 minutos)

> Números verificados con el motor real: `node tools/demo_caso.js` (corre el mismo caso y los imprime).
> Antes de empezar: abrir `index.html` (doble clic), vista **Modo demo**, pulsar **Reiniciar** (reloj 07:30). Sonido bajo.
> Roles: **P** = presenta (habla) · **O** = opera el computador.

| Tiempo | Quién | En pantalla (clics exactos) | Qué se dice | Debe verse |
|---|---|---|---|---|
| 0:00 | P | Modo demo, reloj 07:30 | "Son las 7:30. Hoy un estudiante que llega en carro a EAFIT hace fila sin saber cuánto esperará, ni si habrá celda, y llega tarde a clase. ParkEAFIT le da esa información antes y durante la fila." | Parqueadero casi lleno |
| 0:15 | P | Celular → **Inicio** | "Antes de llegar, Laura ve cuántas celdas quedan y cuánto se espera en cada acceso. La app le recomienda el acceso con menos espera." | Libres por tipo, tarjetas Regional (4/4 + 1 afuera) y Las Vegas, "Horas más llenas" |
| 0:30 | O | Panel: **Portería automática** ON → **Play x10** → **Pausa** en 07:41 | "Avanzamos la simulación; las llegadas y salidas son las del guion de eventos." | Reloj 07:41 |
| 0:40 | O | Celular: registrar **MAT456**, "Mateo Ríos", Regional, clase 08:30 | "Mateo llega un minuto antes que Laura y NO usa valet. Lo usaremos para comparar." | Mateo en pasarela |
| 0:50 | O | **Avanzar 1 min** → registrar **LAU123**, "Laura Gómez", Regional, clase **08:00** | "Laura cruza la línea a las 7:42: queda registrada con placa, acceso y hora." | **Pasarela llena: esperas afuera, 5 delante**, espera **13–23 min** |
| 1:05 | P | Mi turno | "La app le dice su posición, cuántos hay delante y detrás, y que **llegará 10 minutos tarde**. Le sugiere el valet." | Alerta roja + botón **Usar valet** |
| 1:15 | O | **Usar valet** → método **Simular rechazo** → Pagar | "Si el pago falla, la app lo dice claro." | Toast rojo "Pago rechazado…" |
| 1:22 | O | Nequi → **Pagar y reservar** → marcar las 2 casillas → **Confirmar entrega** | "Paso 1 selección y pago, paso 2 entrega del vehículo. Laura se va a clase y llega a las **7:47**." | Código **V-001** |
| 1:35 | P | Señalar el aviso del valet | "Importante: **el valet no da prioridad**. Su carro conserva el turno por hora de llegada." | Aviso fijo |
| 1:45 | O | **Play x10** hasta 08:02 → Pausa | "Mateo, que llegó antes, recibe celda primero: **I-025 en Ingeniería**, aunque entró por Regional, porque es un solo parqueadero compartido." | Celda reservada (amarillo) en el mapa, ruta |
| 2:05 | O | **Play x10** hasta 08:28 → Pausa | "Después el valet recibe la celda de Laura: **N-015**. Paso 3: estacionamiento y llaves en el **casillero 1**." | Línea de tiempo del valet, celda en el mapa |
| 2:20 | P | Panel: **medidor de justicia** | "Así repartimos: la celda es para quien registró primero, sin importar el acceso. Regional 12 celdas con 12 min de espera promedio; Las Vegas 9 con 12,9. Cada reserva se comparte de inmediato: cero duplicados." | Barras por acceso |
| 2:35 | P | — | "**Beneficio concreto:** sin valet, Laura habría estado ~46 minutos en la fila y llegado a clase a las 8:35. Con ParkEAFIT llegó a las 7:47." | — |
| 2:50 | P | — | "Todo es simulado y local; las limitaciones están en el README." | — |

## Detalles que pueden preguntar
- **Reparto entre accesos:** FIFO global por hora de registro (`ParkEngine.POLITICA_TEXTO`). Ejemplo inicial: `RGL206` entra por Regional y recibe `G-210` en Idiomas porque Principal está lleno.
- **"Saldré sin estacionar":** no ocupa celda pero conserva su lugar en la fila hasta salir.
- **Portería:** "Confirmar en portería" valida placa + reserva y solo deja pasar al primero de la fila.
- **Motos:** placa `ABC12D` → celdas de moto; una moto esperando no frena a un carro.

## Plan B (si la interfaz falla)
1. `node tests/engine.test.js` → todas las pruebas en verde (reparto FIFO, sin duplicados, portería, valet sin prioridad…).
2. `node tools/demo_caso.js` → el mismo caso de Laura con todos los números.
3. Mostrar capturas de las pantallas.
