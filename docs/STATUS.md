# STATUS — TAREA 01 (motor de lógica ParkEAFIT)

Ejecutor: Hermes (DeepSeek). Fecha: 30-oct-2026.

## Estado TAREA 01

**Hecho**

| Archivo | Qué contiene |
|---|---|
| `src/data.js` | 40 celdas (34 ocupadas / 6 libres), accesos y porterías con coordenadas, 34 vehículos ya estacionados, 6 carros iniciales en fila (R 3 + 1 afuera, LV 2), guion `SCRIPT` 07:30–08:30 (27 llegadas, 13 salidas, ráfaga en Regional, 1 "sale sin estacionar", 1 con valet) e `HISTORICO` 6–20 h con `fuente: 'simulado'`. |
| `src/engine.js` | Motor puro sin DOM: estados, R1–R7, `asignarCeldas()`, `verificarInvariantes`, posición/espera/clase/ruta/resumen, valet completo, eventos + `suscribir`, `exportarJSON`/`importarJSON`, `guardarLocal`/`cargarLocal`, `avanzar`, `generarLlegada` (RNG con semilla), `reiniciar`. |
| `tests/engine.test.js` | Las 10 pruebas pedidas, con `assert` de Node, sin dependencias. |
| `src/debug.html` | Página sin estilos que carga `data.js` + `engine.js` por `<script>` clásico y permite ejecutar **todas** las acciones con botones. |
| `docs/STATUS.md` | Este reporte. |

Contrato de API: se respetan los nombres exactos de la §9 (`crear`, `state`, `llegar`, `marcarSaleSinEstacionar`,
`confirmarPorteria`, `estacionar`, `salir`, `posicion`, `estimarEspera`, `llegoAClase`, `ruta`, `resumen`,
`valetSeleccionar/valetPagar/valetEntregar/valetSolicitarCarro`, `avanzar`, `generarLlegada`, `reiniciar`,
`suscribir`, `exportarJSON`, `importarJSON`, `verificarInvariantes`, `POLITICA_TEXTO`). No se renombró ni se
cambió ninguno (`POLITICA_TEXTO` es literal el texto de la §4).

**Pruebas** (`node tests/engine.test.js`, salida real)

```
✅ 1. FIFO global: la celda va por hora de registro, sin importar el acceso
✅ 2. Orden por fila: nunca adelanta el de atrás
✅ 3. Sale sin estacionar: no recibe celda y conserva su puesto físico
✅ 4. Pasarela llena: el 5.º espera afuera y entra al liberarse un cupo
✅ 5. Sin duplicados: 200 llegadas aleatorias con salidas, invariantes siempre válidas
✅ 6. Portería: errores claros y paso correcto
✅ 7. Valet sin prioridad: compite con su hora de registro
✅ 8. Valet: pago obligatorio y flujo completo hasta LLAVES_EN_CUSTODIA
✅ 9. Estimación: "Celda inmediata" con cupo y rango 4–8 min con tasa 0.5/min
✅ 10. Determinismo: dos motores con los mismos datos dan el mismo JSON

10/10 pruebas pasaron
```

Verificación adicional hecha a mano: `src/debug.html` abierto con `file://` en un navegador real (sin errores de
consola), 45 min de avance, llegadas, portería, exportar/importar JSON y `verificarInvariantes()` en verde.

**Desviaciones de la especificación y por qué**

1. **Vehículo de valet antes de entregarse.** El modelo de la §3 no tiene estado "pre-llegada" y la §6 dice que el
   carro entra a la fila al entregarlo. `valetSeleccionar(placa, {acceso, conductor, horaClase})` crea el vehículo
   con `estado: 'AFUERA'` y `registradoEn: null` **fuera de las colas** (no ocupa puesto ni turno); al entregarlo
   se registra con R1 normal. Si la placa ya existe en el sistema, no se crea nada.
2. **Funciones extra (no se quitó ni renombró nada):** `valetDevolver(placa)` (transición `SOLICITADO → DEVUELTO`,
   la §6 no dice qué la dispara), `asignarCeldas()` expuesto (R6 lo nombra y la UI puede necesitarlo),
   `activarDebug(bool)` y `politica()`.
3. **Eventos extra:** `VALET_SELECCIONADO`, `VALET_SOLICITADO`, `VALET_DEVUELTO`. La §7 pedía tipos *mínimos*;
   todos los de la lista existen con ese nombre.
4. **`estimarEspera` fuera de la cola:** si el carro ya está estacionado devuelve `{minMin:0,maxMin:0,texto:'Ya estás
   estacionado'}`; si no participa de la cola de celdas, `{texto:'Sin estimación disponible'}`. La §5 no lo cubría.
5. **`resumen()`:** se agregaron `esperaMin`, `esperaMax` y `accesos.*.afuera` (aditivos; las claves pedidas están).
   `recomendado` estima con `registradosQueNecesitanCelda + 1 + afuera(acceso)`: como R3 es FIFO global, la única
   diferencia real entre accesos es la cola externa de cada uno. Es una aproximación, no una simulación.
6. **Tasa EWMA:** la muestra es `1 / (minutos desde la salida anterior)` (salidas por minuto), `alpha = 0.3`; se
   necesita la 2.ª salida para tener valor. Antes de eso se usa `HISTORICO.salidasPorMin` de la hora simulada.
7. **`posicion().delante` para quien está AFUERA** incluye los 4 de la pasarela (así lo pedía la §5).
8. **`autoPorteria`** solo hace pasar al 1.º de la fila **con celda**; no saca automáticamente a quien marcó "sale
   sin estacionar" (esa salida queda manual para no vaciar la demo sin querer).
9. **Marcar "sale sin estacionar" después de tener celda** libera la celda y devuelve el carro a `EN_PASARELA`
   (misma posición física). La §4 solo describía el caso previo a la asignación.
10. **Valet:** `ESTACIONADO → LLAVES_EN_CUSTODIA` ocurre dentro de `estacionar()` (dos eventos: `ESTACIONADO` y
    `VALET_LLAVES`) porque no hay paso de UI intermedio; el casillero es el primero libre de 1–30.
11. **Celdas iniciales ocupadas:** además de las 34 celdas `OCUPADA` se crean sus vehículos (`ESTACIONADO` con
    `celdaId`), si no las salidas del guion no se podrían ejecutar por placa a través de la API.
12. **Estado inicial:** `crear()` reparte celdas de una vez para que la UI arranque coherente (a las 07:30 hay
    6 libres y 5 carros en pasarela: quedan 5 reservas y 1 libre). El carro que espera afuera en Regional
    (`RGL206`) solo entra cuando la pasarela libera un cupo, tal como dice R1 y como pide el juego de datos.
13. **El guion satura el parqueadero a propósito** (34 ocupadas + 27 llegadas − 13 salidas > 40 celdas): sobre las
    08:15 quedan ~14 carros en cola externa y esperas de 25–45 min. Es el problema que el producto explica; si se
    quiere una demo más holgada, se recortan llegadas en `SCRIPT` (`src/data.js`).
14. **`SCRIPT` se ordena por `t`** al construirse (`sort` estable), para que el orden de ejecución sea el del reloj.

**Dudas abiertas:** ver `docs/PREGUNTAS.md` (valet `SOLICITADO → DEVUELTO`, estado pre-llegada del valet,
`autoPorteria` con "sale sin estacionar", criterio exacto de `recomendado`).

**Cómo probar a mano**

1. Abrir `src/debug.html` con doble clic (funciona en `file://`, sin servidor).
2. Arriba: reloj, celdas libres y ocupación. "Avanzar 1/5/15/30 min" corre la simulación; "portería automática"
   deja que el motor haga pasar a los que ya tienen celda.
3. "Llegada manual": placa, acceso, hora de clase, valet y "sale sin estacionar" → Llegar.
4. En la tabla de vehículos, por cada placa: **Portería** (la valida como 1.º de la fila), **Sale sin
   estacionar**, **Salir**, **Estacionar**, botones de valet (seleccionar → pagar → entregar → solicitar →
   devolver) y **Ver espera / ruta** (muestra estimación, posición y ruta).
5. "Verificar invariantes" debe responder ✅ siempre; el registro de eventos muestra el porqué de cada cambio.
6. "Exportar a la caja" / "Importar desde la caja" mueven el estado completo en JSON; "Guardar/Cargar
   localStorage" solo funciona servido por http(s) (en `file://` algunos navegadores lo bloquean; el motor lo
   reporta como error, no rompe).

**Lo que sigue (fuera de esta tarea):** integrar el HTML de Stitch con este contrato, y decidir en `docs/PREGUNTAS.md`
los puntos abiertos del valet.

---

## Estado TAREA 02 (frontend)

**Motor usado:** stub (`src/engine.stub.js`). `src/engine.js` y `src/data.js` aún no existen, así que la integración con el motor real **no está probada**.

### Qué funciona
Verificado en Chrome con `file://`, sin red, a 1440 px y 390 px:
- Vistas Conductor, Valet, Portería y operación y Modo demo (por defecto), con guía "Siguiente paso".
- Flujo completo: registrar → posición → celda → portería → estacionar → salir.
- Valet completo, incluido el pago rechazado.
- Pasarela llena y estado AFUERA con "Generar llegada".
- Validación de placa, toasts verdes y rojos, estados vacíos.
- Play/Pausa, x1/x10, Avanzar 1 min, Exportar JSON, Reiniciar.
- Sin scroll horizontal, texto mínimo de 14 px, Inter local cargada sin internet.

### Qué falta
- Probar contra el motor real cuando Hermes entregue y resolver las preguntas de `docs/PREGUNTAS.md`.
- Con `src/engine.js` o `src/data.js` ausentes, Chrome registra un `ERR_FILE_NOT_FOUND` por cada archivo. Desaparece cuando Hermes los entregue.

### Decisiones y diferencias con la tarea
- **Tailwind** se carga localmente como pide la tarea, pero los estilos están en `src/ui/styles.css`; ninguna pantalla usa clases utilitarias. El archivo `src/vendor/tailwind.js` solo aporta su reset.
- **Modo demo:** "Confirmar en portería" va encima del mapa para que el botón se vea sin scroll a 1440×900.
- **Inicio:** "Registrar llegada" queda fijo abajo para que el siguiente paso siempre se vea.
- **Portería automática:** es la única escritura directa de la UI sobre `engine.state` (ver PREGUNTAS).
- **"Generar llegada"** son dos botones, uno por acceso.
- **Guion del stub:** termina en 08:30. Después no salen más carros y la guía indica Reiniciar.

### Cómo probar
Abrir `index.html` con doble clic y seguir la línea "Siguiente paso". El badge "Motor de prueba" indica que corre el stub; desaparece con el motor real.

---

## Integración motor + frontend (Claude, 30-oct 14:30)

- **Pull:** fallaba porque había cambios locales sin commit (docs y frontend) y Git en Windows/Linux veía `README.md`,
  `AGENTS.md` y `.gitignore` como modificados solo por finales de línea (CRLF). Se guardaron copias, se hizo
  fast-forward a `1a5b96c` y se agregó `.gitattributes` (`* text=auto`) para que no vuelva a pasar.
- **TAREA 01B aplicada al motor por Claude** (no por Hermes, para no tener tres IAs editando a la vez):
  `state.vehiculos` como arreglo, `engine.setAutoPorteria()`, `HISTORICO` como mapas hora→valor,
  Regional 4 en pasarela + 1 afuera, validación de placa (carro `ABC123` / moto `ABC12D`, normaliza espacios y
  minúsculas), nombre, acceso, hora de clase, placa duplicada, **Zona M con 10 celdas de moto** (7 ocupadas),
  reparto FIFO por tipo (una moto sin celda no frena a un carro), tasas y estimación por tipo, `libresPorTipo`
  en `resumen()`, devolución automática del valet 2 min después de `valetSolicitarCarro` (libera la celda),
  invariante de tipo de celda, 2 motos en el guion.
- **Pruebas:** `node tests/engine.test.js` → **14/14** (10 originales ajustadas + 11–14 nuevas).
- **Humo de integración:** las 4 vistas × 3 pestañas del frontend se generan sin errores con el motor real en
  4 momentos (inicio, registrado, +25 min, valet), registro → celda → portería automática → estacionado,
  valet con pago rechazado y aprobado. El badge "Motor de prueba" ya no aparece.
- `src/debug.html` actualizado al nuevo `state`.
