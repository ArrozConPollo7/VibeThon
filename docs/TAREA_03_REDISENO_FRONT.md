# TAREA 03 — Rediseño inmersivo, accesibilidad y validación (para Claude Code)

> Autor: Claude (arquitecto). Ejecutor: Claude Code. **Tiempo máximo: 45 min (hasta ~15:00).** Entrega: 16:20.
> Lee antes `docs/TAREA_01B_AJUSTES_MOTOR.md` (contrato actualizado) y las respuestas en `docs/PREGUNTAS.md`.
> Regla de oro: **no romper lo que ya funciona.** Después de cada bloque, recorre el flujo completo. Si algo se rompe y no lo arreglas en 5 min, reviértelo.

## Prioridad (si el tiempo no alcanza, corta desde abajo)
1. Contrato 01B en el stub + validación de placas/motos (§1) — **obligatorio**
2. Sistema visual nuevo + modo oscuro + tamaño de letra (§2, §4) — **obligatorio**
3. Animaciones clave (§3.1)
4. Sonidos (§3.2)
5. Detalles extra (§5)

---

## 1. Datos y validación
- Actualiza `src/engine.stub.js` al contrato de **TAREA_01B** (ParkData, `setAutoPorteria`, valet, motos con Zona M, validaciones con los mismos mensajes de error). Cambia la UI para usar `engine.setAutoPorteria()`.
- Campo placa:
  - Se convierte a mayúsculas mientras se escribe, sin espacios ni guiones, máx. 6 caracteres.
  - Máscara visual tipo placa colombiana (fondo amarillo, texto negro, borde) con el formato `ABC 123`.
  - Detecta el tipo en vivo y muestra un chip "🚗 Carro" o "🏍️ Moto" (con texto, no solo emoji).
  - Mensaje en línea mientras es inválida: "Carro: ABC123 · Moto: ABC12D". Botón "Registrar llegada" deshabilitado hasta que sea válida.
  - **Aun así, mostrar el error que devuelva el motor** (doble validación: la UI orienta, el motor decide).
- Nombre: solo letras y espacios. Hora de clase: posterior al reloj simulado.
- Mapa y resumen muestran la Zona M y "libres por tipo". Las pantallas de turno/espera usan el tipo del vehículo.

## 2. Sistema visual (identidad EAFIT, moderno)
- **Paleta EAFIT en variables CSS** en `:root` para poder ajustarla en 1 minuto:
  ```css
  --eafit-azul: #00205B;      /* azul institucional (PROVISIONAL: confirmar contra el logo/manual) */
  --eafit-azul-2: #0B3B8C;
  --eafit-acento: #F5B400;    /* acento cálido (PROVISIONAL) */
  --eafit-cian: #00A3E0;      /* acento tecnológico para datos en vivo */
  --ok: #16A34A; --error: #DC2626; --fondo; --superficie; --texto; --texto-2; --borde;
  ```
  Los colores exactos se confirmarán; **todo el CSS debe usar las variables**, nunca hex sueltos.
- Concepto: **"torre de control"**. Encabezado con degradado azul EAFIT, superficies con efecto vidrio (`backdrop-filter: blur`) sobre un fondo con malla sutil, tarjetas con borde luminoso fino al estar activas, números grandes con tipografía tabular.
- Jerarquía: el dato principal de cada pantalla (posición, celda, libres) es el elemento más grande y se lee en < 2 s.
- Íconos SVG coherentes (mismo grosor de trazo). Nada de emojis como único indicador.
- Contraste AA en ambos temas (verificar texto sobre vidrio y sobre degradado).

## 3. Inmersión
### 3.1 Animaciones (CSS + `requestAnimationFrame`, sin librerías)
- **Fila viva:** los carros de cada pasarela son fichas que se deslizan hacia adelante cuando alguien avanza (transición de `transform`).
- **Número de posición** que "rueda" al cambiar (contador animado).
- **Asignación de celda:** la celda pulsa en el mapa, se dibuja la ruta (`stroke-dashoffset`) y aparece la tarjeta "¡Tienes celda!" con una revelación suave + confeti ligero (canvas, máx. 1,2 s).
- Anillo de progreso circular para la espera estimada.
- Transiciones entre pantallas del celular (deslizar 200 ms).
- **Respetar `prefers-reduced-motion`** y el interruptor "Reducir animaciones": en ese caso, sin movimiento, solo cambios de opacidad.

### 3.2 Sonidos (Web Audio API, generados por código — sin archivos, funcionan sin internet)
- `App.sonido.play('avance'|'celda'|'ok'|'error'|'click')`:
  - avance: tic suave · celda: acorde ascendente de 3 notas · ok: campanita · error: tono grave corto · click: muy sutil.
- Volumen bajo por defecto (0.25). Botón de silencio visible en la barra superior (ícono de parlante). Estado guardado en `localStorage` (con try/catch).
- El `AudioContext` se crea en la primera interacción del usuario (los navegadores bloquean el audio automático).
- Nunca sonido en bucle ni en cada tic del reloj simulado.

## 4. Accesibilidad (panel "Accesibilidad" desde un ícono en la barra superior)
- **Tema:** Claro / Oscuro / Sistema (`prefers-color-scheme`). Usa `data-theme` en `<html>` y redefine las variables.
- **Tamaño de letra:** A / A+ / A++ (100 % / 115 % / 130 %) cambiando `font-size` de `html`; todo en `rem`. Verificar que nada se desborda a 130 % en 390 px.
- **Alto contraste** (opcional si hay tiempo): bordes y textos más fuertes, sin vidrio.
- Reducir animaciones y Silenciar sonidos (también en este panel).
- Toasts y cambios de posición anunciados con `aria-live="polite"`; errores con `role="alert"`.
- Navegación completa con teclado, foco visible (anillo en el color acento), `aria-label` en botones de solo ícono, objetivos táctiles ≥ 44 px.
- Preferencias guardadas en `localStorage` y aplicadas antes del primer pintado (evitar destello de tema).

## 5. Extras (solo si sobra tiempo)
- Pantalla de bienvenida de 1 paso en Modo demo: "Así funciona ParkEAFIT" con 3 íconos (Consulta → Registra → Recibe celda) y botón "Empezar demo".
- Indicador "En vivo" pulsante junto al reloj cuando la simulación corre.

## 6. Verificación antes de reportar
Repetir el recorrido de la §8 de TAREA_02, más:
- Placas: ABC123 ✅, ABC12D ✅ (moto → celda M), AB1234 ❌, ABC1234 ❌, placa duplicada ❌ con mensaje del motor.
- Tema oscuro y claro en las 4 vistas; tamaño A++ a 390 px sin desbordes.
- Reducir animaciones y silencio funcionan y persisten al recargar.
- Consola limpia, funciona sin internet.

Actualiza `docs/STATUS.md` (`## Estado TAREA 03`) y agrega en `docs/PROMPTS.md` un "Prompt 3" con un fallo observado y su corrección.
