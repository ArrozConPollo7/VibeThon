# TAREA 02 — Frontend de ParkEAFIT (para Claude Code)

> Autor: Claude (arquitecto). Ejecutor: Claude Code. Tiempo: ~75 min. Entrega final: hoy 16:20.
> En paralelo, Hermes (DeepSeek) construye el motor según `docs/TAREA_01_MOTOR_HERMES.md`.
> **Lee primero `AGENTS.md`, `docs/hackathon.md` y la sección 9 de `docs/TAREA_01_MOTOR_HERMES.md` (contrato de API).**

## 0. Objetivo

Construir la interfaz completa y pulida de ParkEAFIT: un prototipo local que el jurado usa en vivo.
Se califica (20 pts c/u): que se entienda cómo iniciar y continuar, contraste y legibilidad,
navegación consistente, que **cada acción informe su resultado o error**, y una demo que no se bloquee.

## 1. Archivos (propiedad exclusiva — no toques los de Hermes)

| Tuyos | De Hermes (NO editar) |
|---|---|
| `index.html`, `src/ui/*.js`, `src/ui/styles.css`, `src/engine.stub.js`, `src/vendor/*` | `src/engine.js`, `src/data.js`, `tests/*` |

## 2. Restricciones técnicas

1. Debe abrir con **doble clic en `index.html` (file://)**: sin `type="module"`, sin `import/export`, sin npm ni build.
   Scripts clásicos que comparten un objeto global `window.App`.
2. **Funciona sin internet:** descarga Tailwind Play CDN (`https://cdn.tailwindcss.com`) a `src/vendor/tailwind.js`
   y cárgalo localmente. Fuente Inter: si no se puede incluir, usar `system-ui` como respaldo.
3. Orden de carga en `index.html`:
   ```html
   <script src="src/vendor/tailwind.js"></script>
   <script src="src/data.js"></script>          <!-- de Hermes, puede no existir aún -->
   <script src="src/engine.js"></script>        <!-- de Hermes, puede no existir aún -->
   <script src="src/engine.stub.js"></script>   <!-- tuyo: solo se activa si window.ParkEngine no existe -->
   <script src="src/ui/*.js"></script>          <!-- tus módulos, uno por uno -->
   ```
4. **`src/engine.stub.js`**: implementa la API EXACTA de la sección 9 de TAREA_01 con datos falsos
   pero coherentes (el estado cambia con las acciones). Así construyes y pruebas la UI sin esperar a Hermes.
   Debe empezar con `if (!window.ParkEngine) { ... }` y mostrar un badge discreto "Motor de prueba" en la UI cuando esté activo.
5. La UI **nunca** cambia el estado directamente: solo llama funciones del motor y re-renderiza vía `engine.suscribir(render)`.
6. Todo resultado `{ok:false, error}` del motor se muestra en un toast rojo; los `{ok:true}` en un toast verde con un mensaje concreto.

## 3. Sistema de diseño

- App: **ParkEAFIT**. Idioma: español, tono claro y cercano (tutear).
- Colores: primario `#1E3A8A`, acento `#FACC15`, éxito `#16A34A`, alerta `#DC2626`, fondo `#F8FAFC`, texto `#0F172A`, gris `#64748B`. Contraste AA mínimo.
- Tipografía: Inter/system-ui. Títulos 24px bold, cuerpo 16px, mínimo 14px.
- Tarjetas blancas, `rounded-2xl`, sombra suave. **Un solo botón primario por pantalla**, grande, ancho completo en móvil.
- Chips de estado de celda: Libre (verde), Reservada (amarillo), Ocupada (gris). Nunca solo color: incluir texto o ícono.
- Íconos: SVG en línea (sin librerías externas).
- Animaciones sutiles (150–250 ms) al cambiar posición, al asignar celda (resaltar) y en toasts.
- Botones deshabilitados con explicación ("Disponible cuando seas el primero de la fila").

## 4. Estructura de la app

Barra superior fija con: logo ParkEAFIT, reloj simulado, selector de vista
**[Conductor] [Valet] [Portería y operación] [Modo demo]**, y el badge "Motor de prueba" si aplica.

**Modo demo (vista por defecto):** a la izquierda un marco de celular (390×780) con la app del conductor;
a la derecha el panel de operación. Así el jurado ve en una sola pantalla cómo una acción en portería
cambia lo que ve el estudiante. Es el corazón de la presentación.

Navegación del celular: barra inferior con **Inicio · Mi turno · Valet**.
El conductor "activo" se elige con un selector de placa arriba del celular (para la demo); por defecto, el último en llegar.

## 5. Pantallas del conductor (celular)

**5.1 Inicio — "¿Cómo está el parqueadero ahora?"** (antes del registro)
- Tarjeta grande: celdas libres "6 de 40" + barra de ocupación.
- Dos tarjetas por acceso (Regional / Las Vegas): carros en pasarela "3/4", esperando afuera, espera estimada. Etiqueta **"Recomendado"** en la de menor espera.
- Gráfico de barras por hora (6:00–20:00) "Horas más llenas", hora actual resaltada, nota "Datos simulados". Hecho con divs/SVG, sin librerías.
- Formulario corto: placa, nombre, acceso (preseleccionado el recomendado), "¿A qué hora es tu clase?" (opcional), casilla "Quiero usar valet".
- Botón primario: **"Registrar llegada"** (simula cruzar la línea) → toast con resultado ("Registrado en la pasarela Regional, posición 3" o "Pasarela llena: esperas afuera, 2 delante") y navega a Mi turno.
- Validación: placa con formato `ABC123` o `ABC12D`; error en línea si no cumple.

**5.2 Mi turno**
- Encabezado: placa, acceso, hora de registro.
- Número grande: **"Posición 3"** y "2 carros delante · 4 detrás". Si está AFUERA: banner amarillo "Pasarela llena: esperas afuera".
- Espera estimada para recibir celda ("5–8 min") con barra de progreso.
- Si `llegoAClase` dice que no llega: alerta roja "Podrías llegar tarde a tu clase de las 8:00" + botón **"Usar valet"**.
- Interruptor "Saldré sin estacionar" con la explicación "No ocuparás celda, pero conservas tu lugar hasta salir".
- Desplegable "¿Cómo se reparten las celdas?" con `ParkEngine.POLITICA_TEXTO`.
- Línea de estados: Registrado → Celda asignada → Portería → En recorrido → Estacionado (el actual resaltado).
- Cuando cambia a CELDA_ASIGNADA: transición animada a la pantalla 5.3.

**5.3 Celda asignada**
- Banner verde "¡Tienes celda!" · **Zona B · Celda B-03** · "Reservada para ABC123".
- Mapa SVG visto desde arriba (viewBox 0 0 100 60): accesos, porterías, las 40 celdas con color por estado, la ruta de `engine.ruta()` como línea amarilla animada y la celda destino resaltada.
- Pasos numerados de `ruta().pasos`.
- QR simulado (patrón SVG generado a partir de la placa; no hace falta un QR real) con "Muéstralo en portería".
- Botón primario según el estado: "Esperando portería…" (deshabilitado) → "Llegué a mi celda" (llama `estacionar`) → "Salir del parqueadero" (llama `salir`).

## 6. Valet (celular) — 3 pasos obligatorios

Indicador de pasos arriba: **1 Selección y pago · 2 Entrega del vehículo · 3 Estacionamiento y llaves**.
Aviso fijo: "El valet no da prioridad: tu carro conserva su turno por hora de llegada. Lo que ganas es tu tiempo para llegar a clase."
1. Tarjeta "Valet estándar $8.000", método de pago (Tarjeta / Nequi / **"Simular rechazo"**), botón "Pagar y reservar" → toast.
2. Punto de entrega del acceso, código **V-XXX** grande, checklist "Dejé el carro" / "Entregué las llaves", botón "Confirmar entrega" (deshabilitado hasta marcar ambos).
3. Línea de tiempo con los estados del valet (Recibido → En fila → Estacionado en B-03 → Llaves en casillero 12) que avanza con el motor, y botón "Solicitar mi carro".

## 7. Portería y operación (escritorio)

- **Controles de simulación:** Play/Pausa, velocidad x1 / x10, "Avanzar 1 min", "Generar llegada" (Regional / Las Vegas), "Reiniciar", "Exportar registro (JSON)" (descarga con Blob), interruptor "Portería automática".
- **Columna izquierda:** las dos pasarelas como filas verticales (capacidad 4 visible), tarjetas de carro con placa, hora de registro y etiqueta de estado (Esperando celda / Celda B-03 / Sale sin estacionar / Valet). Sección "Afuera" debajo de cada una.
- **Centro:** mapa SVG de las 40 celdas (mismo componente que 5.3), con tooltip de placa.
- **Derecha:**
  - "Confirmar en portería": selector de acceso + campo de placa (prellenado con el 1.º de la fila) + botón "Verificar placa y reserva" → verde "Placa y reserva coinciden: B-03" o rojo con el error del motor.
  - **Medidor de justicia:** celdas asignadas y espera promedio por acceso, en barras comparativas, con el texto de la política.
  - **Registro de eventos** en vivo (más recientes arriba, máx. 50, con hora simulada).

## 8. Calidad mínima (verificar antes de reportar)

- Recorrer el flujo completo sin errores en la consola: registrar → ver posición → recibir celda → portería → estacionar → salir.
- Recorrer el valet completo, incluido el pago rechazado.
- Llenar una pasarela con "Generar llegada" y ver el estado AFUERA.
- Ninguna pantalla vacía sin explicación: estados vacíos con texto ("Aún no te has registrado. Ve a Inicio para registrar tu llegada.").
- Probar a 390 px y a 1440 px de ancho.
- Funciona sin internet (desconectar y recargar).

## 9. Al terminar

Escribir en `docs/STATUS.md` una sección `## Estado TAREA 02 (frontend)`: qué funciona, qué falta,
si se usó el motor real o el stub, y cualquier diferencia encontrada entre el contrato y `src/engine.js`
(anotarla también en `docs/PREGUNTAS.md`; **no edites el motor de Hermes**).

## 10. Fuera de alcance

Backend, base de datos, npm, visión artificial real, cuentas de usuario, mapas reales de EAFIT.
