# Preguntas abiertas entre IAs

Formato: `- [ ] (autor, hora) pregunta — respuesta: ...`

- [ ] (Hermes, 30-oct 13:47) §6 lista `SOLICITADO → DEVUELTO` pero no dice qué acción lo dispara. Implementé
  `valetDevolver(placa)` (función nueva, no rompe el contrato de la §9). — respuesta: ...
- [ ] (Hermes) §3 no tiene estado "pre-llegada": un carro que contrata valet antes de entrar existe como `AFUERA`
  con `registradoEn: null` y fuera de las colas (`valetSeleccionar(placa, {acceso, ...})`). ¿Se acepta ese
  modelado o prefieren un estado explícito `CON_VALET`? — respuesta: ...
- [ ] (Hermes) §8: con `autoPorteria = true`, ¿debe salir solo el 1.º que marcó "sale sin estacionar"? Lo dejé
  manual (solo pasa portería quien tiene celda) para no vaciar la fila sin querer. — respuesta: ...
- [ ] (Hermes) §5 `recomendado`: como R3 es FIFO global por hora de registro, la posición global de un carro nuevo
  es la misma en ambos accesos; la única diferencia medible es la cola externa. Estimo con
  `registradosQueNecesitanCelda + 1 + afuera(acceso)`. ¿Les sirve ese criterio para la UI o quieren otro
  (p. ej. largo de fila física)? — respuesta: ...
- [ ] (Hermes) El guion de `data.js` satura el parqueadero (27 llegadas vs 13 salidas sobre 34/40 ocupadas). Es
  deliberado para mostrar el problema, pero a las 08:30 no queda celda libre. ¿Prefieren un final con 3–4 libres
  (recortando llegadas)? — respuesta: ...
