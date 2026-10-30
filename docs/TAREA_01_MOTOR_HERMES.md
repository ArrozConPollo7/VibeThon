# TAREA 01 — Motor de lógica de ParkEAFIT (para Hermes / DeepSeek)

> Autor de la especificación: Claude (arquitecto). Ejecutor: Hermes (DeepSeek).
> Tiempo disponible: ~60 min. Entrega real del proyecto: hoy, 16:20.
> Lee TODO este documento antes de escribir código. Si algo es ambiguo, NO inventes:
> escribe la duda en `docs/PREGUNTAS.md` y sigue con lo demás.

---

## 0. Contexto en 5 líneas

En EAFIT, los accesos **Regional** y **Las Vegas** comparten un mismo parqueadero sin coordinación.
Los estudiantes hacen fila sin saber cuánto esperarán ni si habrá celda, hay asignaciones
duplicadas o injustas entre accesos y muchos llegan tarde a clase. ParkEAFIT da visibilidad de
la espera, asigna celdas de forma justa entre accesos y ofrece un valet opcional.
**Todo es simulado** (cámaras, registro, llegadas, salidas y pagos). Se ejecuta localmente, sin base de datos ni nube.

## 1. Qué debes entregar en esta tarea

Solo la **lógica** (el diseño visual lo hace otra persona en Stitch y se integra después):

| Archivo | Contenido |
|---|---|
| `src/data.js` | Datos de prueba: celdas, zonas, accesos, carros iniciales, guion de eventos, perfil histórico |
| `src/engine.js` | Motor puro: estado, reglas, eventos. **Sin DOM, sin `document`, sin `window` dentro de la lógica** |
| `tests/engine.test.js` | Pruebas que corren con `node tests/engine.test.js` (sin librerías, usar `assert`) |
| `src/debug.html` | Página MUY simple (sin estilos elaborados) que carga data.js + engine.js y permite ejecutar todas las acciones con botones, para verificar a mano |
| `docs/STATUS.md` | Tu reporte final (ver sección 10) |

### Restricciones técnicas obligatorias

1. **Debe funcionar abriendo el HTML con doble clic (`file://`).** Por eso:
   - NO usar `import`/`export` de ES modules ni `type="module"` (fallan con file://).
   - Usar scripts clásicos que expongan un objeto global, con este patrón al final de cada archivo:
     ```js
     if (typeof module !== 'undefined' && module.exports) module.exports = ParkEngine;
     else window.ParkEngine = ParkEngine;
     ```
2. JavaScript puro (ES2020). Sin npm, sin frameworks, sin dependencias.
3. Toda mutación del estado pasa por funciones del motor y registra un evento (sección 7).
4. Determinista: el reloj es **simulado** (no usar `Date.now()` para la lógica; usar `state.clock`).
5. Comentarios y textos visibles en **español**.

---

## 2. Datos de prueba (`src/data.js`)

```
Reloj inicial: 07:30 (guardar como minutos desde medianoche: 450)
Capacidad de cada pasarela: 4 vehículos (el 5.º espera AFUERA)
Accesos: "REGIONAL", "LAS_VEGAS"

Celdas: 40 en total
  Zona A: A-01..A-20  (cerca de REGIONAL)
  Zona B: B-01..B-12  (centro)
  Zona C: C-01..C-08  (cerca de LAS_VEGAS)
Estado inicial: 34 OCUPADAS, 6 LIBRES → libres: A-07, A-15, B-03, B-11, C-02, C-06
```

Cada celda: `{ id, zona, x, y, estado: 'LIBRE'|'RESERVADA'|'OCUPADA', placa: null|string }`.
Coordenadas en una cuadrícula de 0..100 × 0..60 (zona A a la izquierda, B al centro, C a la derecha).
Accesos con coordenadas: REGIONAL `{x:0, y:30}`, LAS_VEGAS `{x:100, y:30}`, y una portería por acceso
(`{x:8,y:30}` y `{x:92,y:30}`).

**Carros iniciales** (para que la demo no arranque vacía), con placas tipo `ABC123`:
- REGIONAL: 3 en pasarela + 1 afuera.
- LAS_VEGAS: 2 en pasarela + 0 afuera.
- Escalonar sus horas de registro entre 07:20 y 07:29 y **mezclar** entre accesos
  (ej. R 07:20, LV 07:21, R 07:23, LV 07:25, R 07:27).

**Guion de eventos** `SCRIPT`: lista ordenada `{ t: minuto, tipo: 'LLEGADA'|'SALIDA', ... }`
para 07:30–08:30, con ~25 llegadas (repartidas en ambos accesos, con ráfagas en 07:40–07:55)
y ~12 salidas de carros estacionados. Incluir:
- 1 carro que marca "saldrá sin estacionar".
- 1 carro con valet.
- 1 momento en que una pasarela se llena (≥5 llegadas seguidas al mismo acceso).

**Perfil histórico** `HISTORICO`: ocupación promedio (%) por hora de 6 a 20, inventada pero
creíble (pico 7–9 y 12–14, valle 15–16, bajo después de 18). Marcar con `fuente: 'simulado'`.
También la tasa histórica de salidas (carros/min) por hora: `salidasPorMin`.

---

## 3. Modelo de vehículo

```js
{
  id, placa, conductor,
  acceso: 'REGIONAL'|'LAS_VEGAS',
  estado,                 // ver máquina de estados
  llegadaAfueraEn: min|null,
  registradoEn: min|null, // hora en que CRUZÓ LA LÍNEA (entra a la pasarela)
  seq: number|null,       // contador global incremental asignado al registrarse (desempate)
  saleSinEstacionar: false,
  celdaId: null,
  valet: null | { codigo, estado, casillero, pagado },
  horaClase: min|null
}
```

### Máquina de estados (transiciones permitidas, ninguna otra)

```
AFUERA → EN_PASARELA            (hay cupo en la pasarela de su acceso)
EN_PASARELA → CELDA_ASIGNADA    (el motor le asigna celda)
CELDA_ASIGNADA → EN_RECORRIDO   (portería confirma placa + reserva y además es el 1.º de su pasarela)
EN_RECORRIDO → ESTACIONADO      (llega a su celda)
ESTACIONADO → SALIO             (sale del parqueadero, libera la celda)
EN_PASARELA (saleSinEstacionar) → SALIO  (solo cuando es el 1.º de su pasarela)
```

Una transición inválida **no lanza excepción hacia la UI**: retorna
`{ ok:false, error:'Mensaje claro en español' }`. Las válidas retornan `{ ok:true, ... }`.

---

## 4. Reglas de negocio (CRÍTICAS — se califican)

**R1. Registro.** Al llegar, si la pasarela del acceso tiene < 4 vehículos, el carro pasa a
EN_PASARELA con `registradoEn = clock` y `seq = ++contador`. Si no, queda AFUERA en una cola FIFO de ese acceso.
Cuando una pasarela libera un cupo, entra automáticamente el primero de AFUERA de ese acceso
(y en ese momento se registra: `registradoEn = clock`).

**R2. Orden físico.** Dentro de la pasarela nadie retrocede ni se sale. Solo puede salir de la
pasarela el **primero** de la fila de ese acceso (hacia portería o hacia la salida).

**R3. Política de reparto entre accesos = FIFO GLOBAL por hora de registro.**
Las celdas libres se asignan, una por una, al vehículo EN_PASARELA que **necesita celda**
(`saleSinEstacionar === false` y sin celda) con menor `(registradoEn, seq)`, **sin importar el acceso**.
- NO alternar uno y uno entre accesos (round-robin). NO dar prioridad al acceso con fila más larga.
- NO asignar celda a quien marcó `saleSinEstacionar` (pero conserva su lugar físico).
- El valet NO da prioridad: un carro con valet compite exactamente igual (por su `registradoEn`).
- Esta política respeta automáticamente el orden de cada fila. Escribe una prueba que lo verifique.
- Exponer el texto de la política: `ParkEngine.POLITICA_TEXTO =
  "La celda es para quien registró primero su llegada, sin importar por qué acceso entró. El orden de cada fila siempre se respeta. El valet no da prioridad."`

**R4. Elección de celda.** Entre las celdas LIBRES, elegir la de menor distancia euclidiana a la
portería del acceso del vehículo. Desempate: id alfabético.

**R5. Reserva atómica y compartida.** Asignar = en la misma función síncrona: celda pasa a
RESERVADA con `placa`, el vehículo guarda `celdaId`, se registra el evento `CELDA_RESERVADA`
y se notifica a los suscriptores. **Una celda nunca puede estar reservada/ocupada por dos placas.**
Agregar `verificarInvariantes(state)` que lance error si: hay celdas duplicadas por placa,
una placa con dos celdas, más de 4 carros en una pasarela, o un vehículo con celda cuyo
`celdaId` no apunta a una celda RESERVADA/OCUPADA con su placa. Llamarla al final de cada acción en modo debug.

**R6. Asignación automática.** Ejecutar `asignarCeldas()` después de: registro, cambio de
`saleSinEstacionar`, salida de un carro (celda liberada) y avance del reloj.

**R7. Confirmación en portería.** `confirmarPorteria(acceso, placa)`:
- Error si la placa no es el 1.º de esa pasarela → `"Este vehículo aún no es el primero de la fila."`
- Error si no tiene celda → `"Aún no tiene celda asignada. Debe esperar."`
- Error si la placa no existe → `"Placa no registrada en esta pasarela."`
- OK → EN_RECORRIDO, libera cupo de pasarela (entra el siguiente de AFUERA) y devuelve `{ ok:true, celda, ruta }`.

---

## 5. Cálculos para la interfaz

**`posicion(vehiculoId)`** → 
```js
{ acceso, estado, posicionEnPasarela /*1-based o null*/, delante, detras,
  afueraDelante /*si está AFUERA*/, posicionGlobalCelda /*k entre los que necesitan celda*/ }
```
- `delante`/`detras`: carros en su misma pasarela (en AFUERA: delante = los de afuera antes + 4 de la pasarela).
- `posicionGlobalCelda`: cuántos vehículos que necesitan celda (en ambos accesos, incluidos los AFUERA en orden de llegada) van antes que él + 1.

**`estimarEspera(vehiculoId)`** → `{ minMin, maxMin, texto }`:
- `k = posicionGlobalCelda`, `L = celdas LIBRES`.
- Si `k <= L` → `{0, 1, "Celda inmediata"}`.
- Si no: `faltan = k - L`; `tasa = EWMA de salidas reales observadas` (alpha 0.3, por minuto);
  si aún no hay datos, usar `HISTORICO.salidasPorMin` de la hora actual. Tasa mínima 0.05.
  `t = faltan / tasa` → `minMin = floor(t*0.8)`, `maxMin = ceil(t*1.3)`, texto `"5–8 min"`.
- **PROHIBIDO** leer eventos futuros del `SCRIPT` para estimar. Sería trampa.
- Si `saleSinEstacionar` → `{texto:"No necesitas celda"}`.

**`llegoAClase(vehiculoId)`** → si tiene `horaClase`: compara `clock + maxMin + 5 (caminar)` con
`horaClase`. Retorna `{ aTiempo: bool, margenMin, sugerirValet: !aTiempo }`.

**`resumen()`** para la pantalla de inicio y el panel:
```js
{ reloj:"07:42", libres, total, ocupacionPct,
  accesos: { REGIONAL:{ enPasarela, capacidad:4, afuera, esperaTexto, recomendado:bool }, LAS_VEGAS:{...} },
  justicia: { REGIONAL:{ asignadas, esperaPromedioMin }, LAS_VEGAS:{...} },
  historico: HISTORICO }
```
`recomendado` = el acceso donde un carro nuevo tendría menor espera estimada.
`esperaPromedioMin` = promedio de (hora de asignación − registradoEn) por acceso.

**`ruta(vehiculoId)`** → `{ puntos:[{x,y},...], pasos:["Avanza a portería Regional", "Sigue recto hacia la Zona B", "Celda B-03 a tu izquierda"] }`.
Ruta simple: acceso → portería → (x de la zona, y=30) → (x de la celda, y=30) → celda. No hace falta un algoritmo de caminos.

---

## 6. Valet (servicio adicional, ruta obligatoria de 3 pasos)

Estados de `vehiculo.valet.estado`:
```
1. Selección y pago:          SELECCIONADO → PAGADO
2. Entrega del vehículo:      ENTREGADO_A_VALET   (código V-XXX)
3. Estacionamiento y llaves:  EN_FILA → ESTACIONADO → LLAVES_EN_CUSTODIA (casillero N) → SOLICITADO → DEVUELTO
```
Funciones: `valetSeleccionar(placa)`, `valetPagar(placa, metodo)` (pago simulado; si `metodo === 'RECHAZO'`
devolver error `"Pago rechazado. Intenta con otro método."` para poder mostrar un error en la demo),
`valetEntregar(placa)`, `valetSolicitarCarro(placa)`.
- Al entregarlo, el carro entra a la fila normal de su acceso (`llegar(...)`) con `valet` presente:
  **misma regla R3, sin prioridad**. La reserva del valet asegura el servicio, no un puesto.
- Cuando su vehículo llegue a ESTACIONADO, el valet pasa a ESTACIONADO y luego a LLAVES_EN_CUSTODIA con un casillero libre (1–30).
- No se puede entregar sin pagar → error `"Primero completa el pago del valet."`.

---

## 7. Eventos, suscripción y persistencia

- `state.eventos`: arreglo `{ t:"07:42", tipo, mensaje, datos }`. Tipos mínimos:
  `LLEGADA_AFUERA, REGISTRO, CELDA_RESERVADA, PORTERIA_OK, PORTERIA_ERROR, ESTACIONADO, SALIDA,
  SALE_SIN_ESTACIONAR, VALET_PAGADO, VALET_ENTREGADO, VALET_LLAVES, ERROR`.
  `mensaje` en español legible para mostrarlo en el registro del panel
  (ej. `"Celda B-03 reservada para ABC123 (Las Vegas)"`).
- `suscribir(fn)`: llama `fn(state)` tras cada cambio. Devuelve función para desuscribir.
- `exportarJSON()` → string con estado + eventos. `importarJSON(str)`.
- `guardarLocal()` / `cargarLocal()`: usan `localStorage` **solo si existe** (`typeof localStorage !== 'undefined'`) y envuelven en try/catch.

## 8. Simulación

- `avanzar(minutos)`: incrementa `clock` minuto a minuto; en cada minuto ejecuta los eventos del
  `SCRIPT` con `t === clock`; simula que los carros EN_RECORRIDO llegan a su celda 2 min después
  (→ ESTACIONADO); y que el 1.º de cada pasarela con celda pasa portería automáticamente si
  `state.autoPorteria === true` (por defecto `false`, para poder hacerlo a mano en la demo).
- `generarLlegada(acceso?)`: llegada aleatoria con placa aleatoria (semilla fija para reproducibilidad).
- `reiniciar()`: vuelve al estado inicial de `data.js`.
- Velocidad (x1/x10) y play/pausa los maneja la UI con `setInterval` llamando `avanzar(1)`; el motor no usa timers.

## 9. API pública final (contrato — la UI dependerá de estos nombres EXACTOS)

```
ParkEngine.crear(data) → engine
engine.state
engine.llegar({placa, conductor, acceso, horaClase?, valet?}) → {ok, vehiculo|error}
engine.marcarSaleSinEstacionar(placa, bool) → {ok|error}
engine.confirmarPorteria(acceso, placa) → {ok, celda, ruta | error}
engine.estacionar(placa) → {ok|error}
engine.salir(placa) → {ok|error}
engine.posicion(placa) / engine.estimarEspera(placa) / engine.llegoAClase(placa)
engine.ruta(placa) / engine.resumen()
engine.valetSeleccionar / valetPagar / valetEntregar / valetSolicitarCarro (placa, ...)
engine.avanzar(min) / engine.generarLlegada(acceso?) / engine.reiniciar()
engine.suscribir(fn) / engine.exportarJSON() / engine.importarJSON(str)
engine.verificarInvariantes()
ParkEngine.POLITICA_TEXTO
```
Identificar vehículos por **placa** en toda la API pública.

## 10. Pruebas obligatorias (`tests/engine.test.js`)

Cada prueba con un nombre en español e imprimiendo ✅/❌. Al final: "X/Y pruebas pasaron".

1. **FIFO global:** R registra 07:20, LV 07:21, R 07:23, 2 celdas libres → las celdas van a R(07:20) y LV(07:21), no a los dos de R.
2. **Orden por fila:** dentro del mismo acceso nunca recibe celda alguien de atrás antes que el de adelante (excepto si el de adelante sale sin estacionar).
3. **Sale sin estacionar:** no recibe celda; la siguiente celda va al siguiente que sí la necesita; conserva su posición física y sale solo cuando es 1.º.
4. **Pasarela llena:** el 5.º carro de un acceso queda AFUERA; al pasar uno por portería, entra y recibe `registradoEn` nuevo.
5. **Sin duplicados:** 200 llegadas aleatorias + salidas en ambos accesos → `verificarInvariantes()` nunca falla.
6. **Portería:** placa que no es la 1.ª → error; sin celda → error; correcta → EN_RECORRIDO.
7. **Valet sin prioridad:** carro con valet registrado después de otro sin valet recibe celda después.
8. **Valet:** entregar sin pagar → error; flujo completo termina en LLAVES_EN_CUSTODIA con casillero.
9. **Estimación:** con k ≤ libres → "Celda inmediata"; con k > libres y tasa 0.5/min y faltan 3 → rango 4–8 min aprox.
10. **Determinismo:** dos motores con los mismos datos y `avanzar(60)` producen el mismo `exportarJSON()`.

## 11. Al terminar: `docs/STATUS.md`

```
## Estado TAREA 01
- Hecho: ...
- Pruebas: X/Y (pegar salida de node tests/engine.test.js)
- Desviaciones de la especificación y por qué: ...
- Dudas abiertas: (ver PREGUNTAS.md)
- Cómo probar a mano: abrir src/debug.html y ...
```

## 12. Fuera de alcance (NO hacer)

- Estilos visuales, pantallas finales, Tailwind (lo trae Stitch).
- Visión artificial real, backend, base de datos, npm.
- Cambiar nombres de la API de la sección 9.
