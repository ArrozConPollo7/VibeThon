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

## Estado TAREA 03

**Motor usado:** real (`src/engine.js` + `src/data.js` con 01B). El stub queda al día con 01B como respaldo. No se editó ninguno de los dos archivos de motor.

### Hecho
- **§1 Contrato y validación:** stub en 01B; UI con `setAutoPorteria`; placa con máscara `ABC 123`, chip Carro/Moto, botón deshabilitado hasta ser válida y error del motor en toast; nombre y hora de clase validados; Zona M y libres por tipo.
- **§2 y §4 Visual y accesibilidad:** tokens en `:root`, sin hex sueltos; concepto "torre de control"; tema Claro/Oscuro/Sistema, A/A+/A++, alto contraste, reducir animaciones y silencio; preferencias aplicadas antes del primer pintado.
- **§3 Inmersión:** fila con FLIP, número que rueda, pulso de celda, ruta dibujada, revelación, confeti de 1,2 s, anillo de progreso, deslizamiento de 200 ms y sonidos con Web Audio.
- **§5 Extras:** bienvenida e indicador "En vivo".

### Diferencias con la tarea
- El mapa usa viewBox `-6 -5 112 70` y dibuja zonas alrededor de las celdas: en `data.js` hay celdas sobre y=30, así que una vía fija chocaba con ellas.
- El chip de tipo usa ícono SVG en vez del emoji del ejemplo, por coherencia con §2.
- El código `V-XXX` aparece al confirmar la entrega porque el motor real lo genera ahí.
- Paleta EAFIT aún PROVISIONAL.

### Problemas abiertos
- Tailwind sigue cargado sin clases utilitarias y deja su aviso de producción en consola (es `warning`, no error).
- La bienvenida aparece en cada recarga.

## Estado TAREA 04

**Mapa real integrado y estable.** El mapa SVG anterior se retiró. No se editaron `src/engine.js`, `src/data.js` ni `src/mapa-datos.js`.

### Hecho
- `src/ui/mapa.js` mantiene un mapa persistente por contenedor (celular y panel): `App.morf` salta los huecos `data-mapa` y el nodo se reubica con `appendChild`. No se recrea al cambiar de pestaña ni con el reloj.
- Un solo `setStatuses` por notificación, solo con celdas cambiadas. Sin lote G; las celdas M no se envían al mapa.
- Celda asignada: zoom, selección, ruta con trazo animado y pasos. Motos: tarjeta sin mapa.
- Operación: botones Principal, Ingeniería y Ver todo, tarjeta de celda al tocarla, pulso de 1,5 s al reservar sin mover la vista.
- Leyenda con texto, `aria-label` con resumen y tema sincronizado. "Reducir animaciones" también quita el zoom animado.

### Verificado (Chrome, `file://`, sin red)
- Arranque: 6 celdas reservadas coinciden con el motor.
- `RGL206` → `I-170`, con ruta y texto que explican el cambio de lote.
- Moto `ABC12D` → tarjeta de motos.
- x10 durante 2 h simuladas: mismo nodo, cero cambios de zoom, consola sin errores.
- Tema oscuro y A++ a 390 px sin scroll horizontal.

### Diferencias con la tarea
- Si la celda está en otro lote, el celular usa `showAll()` en vez de `focusLot()`: con el zoom al lote no se vería la ruta desde el acceso.
- Se retiró el tooltip anterior del mapa: la tarjeta bajo el mapa lo reemplaza. El mapa se usa con ratón o dedo; con teclado la información está en el texto y el registro.
- Se omitió el mini-mapa opcional de Inicio.

### Límites
- `src/engine.stub.js` sigue con sus celdas de prueba: si se usara, el mapa real no reflejaría sus estados. Con el motor real no se carga.
- La ruta del motor es aproximada y atraviesa edificios en el plano.

## Estado rediseño Stitch

**Fuente:** proyecto de Stitch "ParkEAFIT Campus Parking App". Exportaciones y sistema de diseño en `design/`. El sistema de `design/DESIGN.md` reemplaza el de TAREA_03 (degradado, vidrio, malla y paleta provisional). No se editaron `src/engine.js`, `src/data.js` ni `src/mapa-datos.js`.

### Pantallas
- **Aplicadas de Stitch:** Inicio, Mi turno (ticket y QR), Servicio valet, Seguimiento de entrega y Calificar servicio.
- **Hechas con ese estilo:** turno en espera, celda asignada con mapa, pago del valet, entrega del valet, tarjeta de motos, portería y operación.
- **Orden del valet:** pago → entrega → custodia → seguimiento → calificación.

### Contenido de Stitch que no se usó
Los datos salen del motor; lo que no existe en él se quitó en vez de simularlo:
- Sectores Idiomas y Carpooling, y vehículo Bicicleta: fuera del reto.
- Valet a $6.000: se mantiene $8.000 de TAREA_02. **Confirmar el precio.**
- Conductor con nombre, modelo del carro, fotos de inspección, combustible, kilometraje y calificación del operador: el motor no los tiene.
- Tarifa por hora, EafitPay, pago al salir, pico y placa, Bloque 26: sin datos ni reglas.
- Campana, perfil, llamar, mensaje y "Otro valor" de propina: no tendrían función.

### Simulado solo en la interfaz
- La calificación y la propina no se guardan en el motor ni se exportan.
- El PIN de entrega se deriva de la placa.
- "2 min simulados" repite la regla del motor para devolver el carro.

### Límite
`src/engine.stub.js` no tiene las zonas reales: con el stub, Inicio mostraría los sectores vacíos. Con el motor real no se activa.

## Estado TAREA 05

Capa visual rehecha desde `design/` (Stitch). `engine.js`, `data.js`, `mapa-datos.js`, `tests/` y `parking-map.js` no se tocaron. Respaldo: tag `ui-v1`.

### Qué cambió
- `DESIGN.md` pasó a variables CSS (`styles.css`) y a `tailwind.config` (`src/ui/tailwind-config.js`); el modo oscuro solo redefine variables.
- Todas las pantallas usan clases de Tailwind y los componentes de `src/ui/componentes.js`.
- Íconos: Material Symbols local en `src/vendor/material-symbols.woff2` (subconjunto de 11 KB). Un ícono nuevo exige regenerar ese archivo.
- Mapa con los 3 parqueaderos; sector Idiomas en Inicio y botón Idiomas en operación; leyenda con Proveedores.
- En pantallas de menos de 1024 px la vista inicial es Conductor; en escritorio, Modo demo.

### Verificación §7
Recorrido automatizado en Chrome sobre `file://` y sin red: 29 de 29 comprobaciones. `tests/engine.test.js`: 14 de 14.
1. Carga sin badge "Motor de prueba", sin peticiones externas y con consola limpia.
2. `ABC123` en Regional: posición y espera, celda, mapa con zoom y ruta, portería, estacionar y salir.
3. `RGL206` recibe `G-210`: el mapa enfoca Idiomas y los pasos lo nombran.
4. Moto `ABC12D` con tarjeta de motos. `AB1234` da error en línea y la placa duplicada, error del motor.
5. Valet con pago rechazado y luego aprobado, hasta casillero, devolución y calificación.
6. Pasarela llena con "Generar llegada": "Esperas afuera".
7. Play x10 durante 2 minutos reales: el mismo nodo SVG, cero cambios de estructura.
8. Oscuro + A++ a 390 px: sin desbordes en 7 pantallas. Comparación visual contra `01-inicio` y `02-mi-turno`; las demás pantallas se revisaron por capturas propias, no lado a lado.

### Decisiones y diferencias con Stitch
- Los chips de estado usan los colores de `DESIGN.md` (verde, amarillo, gris); el HTML de Stitch los pinta azules.
- Se mantiene fuera lo que el motor no tiene: Bicicleta, Carpooling, Bloque 26, conductor con nombre, fotos, tarifa, EafitPay. **Sigue pendiente confirmar el precio del valet ($8.000).**
- El logo remoto de Stitch se reemplazó por el ícono `local_parking`, porque depende de internet.
- La campana ahora funciona: muestra los eventos del conductor activo. El avatar es decorativo.
- El QR no tiene la cuenta regresiva "anti-captura": el código es simulado y fijo por placa.
- El aviso de producción del Tailwind local se filtra en `index.html`: sin eso, §7.1 no daría consola limpia.
- Mi turno enfoca el parqueadero de la celda con `focusLot`, como pide §5; "Ruta completa" abre todo el campus cuando la ruta cruza parqueaderos.

## Estado TAREA 09

Mapa de consulta en Inicio y fila en vivo sobre el mapa. Archivos: `mapa.js`, `inicio.js`, `turno.js`, `styles.css`; `operacion.js` no necesitó cambios porque su mapa recibe la capa automáticamente. Respaldo: tag `ui-v3`.

### Qué cambió
- Inicio: mapa de los 3 parqueaderos, solo para consultar, con "N libres de M" por parqueadero. Tocar una celda muestra id, parqueadero y estado, sin reservar.
- Capa `fila-viva` en cada mapa: una ficha por vehículo en pasarela y afuera, máximo 10 por acceso y "+N" si hay más. Línea "Pasarela llena" cuando hay carros afuera.
- Al pasar portería, la ficha recorre `ruta().puntos` y se desvanece. Si sale sin estacionar, se aleja por la vía.
- Mi turno: mientras espera, mapa enfocado en su acceso con la ficha marcada "Tú".
- `mapa.js` solo agrega; `App.mapas` suma `huecoFila`.

### Decisiones
- Las vías siguen los trazos reales del plano. Las Vegas va por la Avenida Las Vegas hacia el noreste, no hacia el oeste como sugería la tarea: al oeste las fichas quedaban sobre el parqueadero de Ingeniería.
- En Inicio las fichas son 1,4 veces más grandes porque el campus completo cabe en 280 px.

### Verificación §4
Chrome sobre `file://` y sin red. TAREA 09: 12 de 12. TAREA 05 §7: 29 de 29, con Play x10 de 15 s en esta corrida. Motor: 14 de 14. Se revisaron capturas de Regional y Las Vegas, en claro y en oscuro.

## Estado TAREA 08

Motor: `src/engine.js` (solo se agregó; R1–R7 y el reparto intactos). UI: `src/ui/valet-operador.js` nueva +
ganchos en `app.js` e `index.html` + ajustes en `valet.js`. No se tocó `mapa.js`, `inicio.js`, `turno.js`,
`operacion.js` ni `styles.css` (TAREA 09 de Claude Code).

| Función nueva / cambiada | Estado |
|---|---|
| `valetPagar` → `ticket` `VAL-XXXX`, `pin`, `tarifa 8000`, `operador` (lista fija, con el `rng` semilla) | ✅ |
| `valetInspeccionar(placa, {combustible, km, novedades, fotos})` + evento `VALET_INSPECCION` | ✅ |
| `valetSolicitarCarro` → `EN_TRASLADO` (2 min) → `LISTO_EN_BAHIA` (2 min más); ya no se devuelve solo | ✅ |
| `valetEntregarCliente(placa, pin)` (PIN incorrecto con el mensaje pedido) | ✅ |
| `valetListar()` (sin `pin`, con celda/zona/nombreZona/casillero/inspección, ordenado por estado y hora) | ✅ |

### Verificación §4 (30-oct, a las 16:20)

1. **`node tests/engine.test.js` → 17/17** ✅ (las 14 anteriores siguen pasando; nuevas: inspección, entrega con PIN
   y `valetListar`).
2. **Doble clic en `index.html`** ✅ `file://` sin internet, consola sin errores (`window.__errs` vacío) y sin badge
   "Motor de prueba".
3. **Estudiante `LAU123` con valet** ✅ pago aprobado con `TARJETA`; el ticket muestra `VAL-8916`, operador
   `Luisa Mejía` y `$8.000` reales del motor. El rechazo (`RECHAZO`) está cubierto por la prueba 8; en la UI usa el
   mismo `valetPagar` que ya existía.
4. **Operador recibe e inspecciona** ✅ botón "Recibir vehículo" → `valetEntregar` (`EN_FILA`); km `-5` →
   "Los kilómetros deben ser un número mayor o igual a 0."; inspección válida (`3/4`, 48.320 km, novedades, 4/4
   fotos) → guardada y visible en el detalle. El bloque "Inspección al recibir" quedó en `valet.js` para el
   estudiante (no recorrí ese clic completo: el estudiante no estaba seleccionado en la vista).
5. **Play hasta tener celda** ✅ `LAU123` recibió `I-040` (parqueadero de Ingeniería, aunque entró por Regional),
   mapa montado en el detalle (`[data-mapa]` = 1), "Caja de llaves 1" y estado `LLAVES_EN_CUSTODIA`. El botón
   "Confirmar estacionado" aparece solo cuando el carro está `EN_RECORRIDO`; en esta corrida el paso automático de
   `avanzar()` lo estacionó antes, así que el botón no se pulsó (el camino manual queda disponible).
6. **Solicitar → traslado → bahía → PIN** ✅ a los 2 min `EN_TRASLADO`, a los 4 min `LISTO_EN_BAHIA`; PIN `0000` →
   "PIN incorrecto. Pídele al estudiante el código de 4 dígitos."; PIN real → `DEVUELTO`, casillero liberado y la
   celda vuelve a LIBRE (`celdas con LAU123` = 0, libres +1).
7. **Flujo sin valet** ✅ las 14 pruebas previas pasan y no se modificó `operacion.js` ni el armazón; la vista
   "Portería y operación" sigue renderizando en el mismo `index.html`.
8. **Oscuro + A++ a 390 px** ⏳ no verificado en esta corrida (queda para la revisión de Claude Code).

**Desviaciones / notas**

- El `<select>` de vista usa `valetOperador` como id (la vista "Valet" del estudiante ya existía con `valet`).
- La inspección cuenta las casillas marcadas (frontal/trasera/lat. izq./lat. der.) como `fotos`, con tope de 4;
  "Tablero" es una foto extra que no suma (el motor rechaza más de 4).
- En `valet.js` el PIN ya no se deriva de la placa: si el motor no lo tiene (servicio sin pagar) se muestra `····`.
- El mensaje de resultado de las acciones vive en `App.ui.valetOperador.mensaje` (no hay API de toasts reutilizable
  sin tocar `app.js` más de lo necesario).
- **Congelamiento:** se hizo a las 16:20, no a las 15:50, porque `TAREA_08` llegó al repo a las 15:31 (antes solo
  existían TAREA_01…04). El motor quedó congelado a las 15:47 (`4044157`, 17/17).

## Integración TAREA 08 + TAREA 09

`origin/main` (TAREA 08) quedó integrado en `feat/frontend` por merge; el único conflicto fue este archivo y se conservaron ambas secciones.

### Corregido al integrar
- Abrir el detalle del operador rompía el render (`TypeError` en `enfocar`): `valet-operador.js` no pasaba `placa` al mapa.
- `App.mapas` no tenía altura para el mapa `valetOperador` (682 px y clase `undefined`).
- Íconos `inbox`, `queue` y `flag` fuera de la fuente local: se habrían visto como texto. Se usan íconos que sí están.
- Textos de 11 y 12 px en el operador: ahora 14 px, como exige `DESIGN.md`.
- Estudiante con el carro en bahía: seguía viendo "En traslado ~0 min". Ahora distingue traslado, bahía esperando PIN y entregado.
- La guía de la demo no explicaba el paso del PIN.

### Verificación
Chrome sobre `file://` y sin red. Motor: 17 de 17. Operador del valet: 12 de 12, incluido el pendiente oscuro + A++ a 390 px. TAREA 09: 12 de 12. TAREA 05 §7: 29 de 29, con Play x10 de 15 s; esa prueba entrega el carro llamando a `valetEntregarCliente` con el PIN.

## Estado TAREA 10

Orden ejecutado: **A** (casos JSON + runner) → **B** (operador completo) → **C** (info del valet para el
estudiante) → **D** (preferencia de parqueadero/celda). Commit por bloque y `git tag ui-v4` antes de empezar.

### A — Casos de ejemplo (obligatorio)
`tests/casos.json` (**18 casos**) + `tests/casos.test.js` (runner sin dependencias): crea un motor nuevo por caso,
ejecuta `pasos`, valida `espera` y `verificar` con rutas con puntos (p. ej. `valet.estado`) y llama
`verificarInvariantes()` tras cada paso. Comando: `node tests/casos.test.js`.

```
node tests/engine.test.js → 17/17 pruebas pasaron
node tests/casos.test.js  → 18/18 casos pasaron
```

Cobertura: placas válidas/minúsculas/inválidas/duplicadas, nombre y hora de clase inválidos, FIFO entre accesos,
orden por fila, pasarela llena + entrada desde afuera, sale sin estacionar, portería (no es el primero, sin celda,
placa ajena), motos sin bloqueo cruzado, preferencia de celda cumplida, de parqueadero cumplida, no cumplida sin
perder turno (dos variantes), valet feliz completo, valet con errores de orden/validación y determinismo del guion.

### B — Motor del valet del operador
`valetAceptar(placa, operador)` (`PAGADO → ACEPTADO`, rechaza a un segundo operador), `valetEntregar` ahora exige
`ACEPTADO`, `valetInspeccionar` con `fotos` como arreglo de hasta 4 `{vista, dataUrl}` (valida vista, prefijo
`data:image/` y ≤ 300 000 caracteres), `valetRegistrarUbicacion(placa, {nota})` (solo `ESTACIONADO`, nota ≤ 140,
evento `VALET_UBICACION`) y `valetListar()` con `ubicacion`, `preferencia` y `preferenciaCumplida` (sin `pin`).

### B — Vista "Valet (operador)"
`src/ui/valet-operador.js`: selector "Soy: Carlos Restrepo / Luisa Mejía / Andrés Gil", bandeja **Por aceptar**,
ficha con stepper de 5 pasos (Aceptar → Recibir → Estacionar → Ubicación y llaves → Entregar con PIN),
**fotos reales** (`<input type=file accept="image/*" capture="environment">` reducidas a 480 px / JPEG 0.7 en
`<canvas>`, miniaturas con "Quitar" y botón **"Usar foto de ejemplo"** que dibuja la vista + la placa en canvas),
"dónde quedó" con mapa (`App.mapas.hueco`, sin tocar `mapa.js`), casillero, nota y **Guardar ubicación**, y entrega
con PIN. Errores del motor en rojo, éxitos en verde.

### C — Lado del estudiante (`valet.js`)
Tarjeta del operador con **avatar SVG de iniciales** (color derivado del nombre, sin fotos de personas), "Valet
EAFIT Movilidad · verificado", "★ 4.9 · Caseta Valet · Ext. #4500"; "Buscando un operador…" mientras está `PAGADO`;
ticket, operador y tarifa reales; inspección con **miniaturas** ampliables en modal accesible (`role=dialog`,
cierre por clic/botón, foco al abrir); bloque **"Dónde quedó tu carro"** (parqueadero, celda, nota, casillero,
mapa); PIN grande con "Muéstralo al operador del valet"; `ORDEN_VALET`/`EN_ENTREGA` con `ACEPTADO`, `EN_TRASLADO`
y `LISTO_EN_BAHIA`.

### D — Preferencia de parqueadero / celda
Motor: `llegar({..., preferencia: {zona, celdaId}})` valida zona, celda existente y tipo; `elegirCelda` cumple
`celdaId` → zona (más cercana dentro de la zona) → más cercana general, **sin alterar el orden FIFO**; guarda
`preferenciaCumplida: 'celda' | 'zona' | 'no'`. UI: selector "Parqueadero preferido" en el formulario de Inicio,
chip con la celda preferida y su "quitar", la frase de justicia y el texto en Mi turno.

### Verificación §5 (al congelar, 15:56)

| # | Punto | Resultado |
|---|---|---|
| 1 | `engine.test.js` + `casos.test.js` | ✅ 17/17 y 18/18 |
| 2 | Doble clic, sin internet, consola limpia | ✅ `window.__errs` vacío en las tres vistas |
| 3 | Recorrido demo estudiante ↔ operador | ✅ verificado por partes: aceptar → recibir → fotos de ejemplo → inspección guardada con 2 fotos; ficha del estudiante con operador, avatar, ticket y tarifa. ⏳ no se hizo el clic completo con subida de archivo real (la sesión de prueba no tiene cámara) ni la entrega final en la misma corrida |
| 4 | Preferencia de Idiomas / celda libre | ✅ el formulario guarda la preferencia y el motor la aplica (casos 11–13, 18); en la demo `LAU321` entró a la cola externa, así que aún no había celda que asignar |
| 5 | Flujo sin valet | ✅ 17 pruebas previas + `operacion.js`/`mapa.js` sin cambios |

**Pendientes / desviaciones**
- Falta el botón **"Preferir esta celda"** dentro del mapa de Inicio: requiere enganchar la selección de celda de
  `mapa.js` (archivo que no debía tocarse); quedó el selector de parqueadero y el chip de celda preferida.
- `tests/casos.json` usa un constructor de datos propio del runner (celdas de carro en `A-*`, otra zona `I-*` y
  motos `M-*`) para mantener los casos legibles; `"datos": "demo"` usa el juego real de 624 celdas.
- El estado `ACEPTADO` obligó a actualizar las pruebas 8, 15, 16 y 17 (ahora llaman `valetAceptar` antes de
  `valetEntregar`).

---

## Cambios de la revisión de demo (30-oct, tarde)

Pedido de JuanD: entrada desde las 06:00, valet con fotos y entrega real, reclamar el carro desde la vista del
estudiante, retirar del sistema los carros que ya salieron del campus y **dos entradas por parqueadero**.

### Motor (`src/engine.js`, `src/data.js`)

- **Seis accesos** (dos por parqueadero): `REGIONAL`/`CALLE4` (N), `LAS_VEGAS`/`CARRERA49` (I),
  `GUAYABOS`/`LOMA` (G). `reiniciarEstado()` arma pasarelas y colas externas desde `datos.accesos`, no desde una
  lista fija. El guion y la fila inicial reparten carros por las seis entradas.
- **Hora de llegada simulada:** `llegar({..., horaLlegada})` acepta de 06:00 a la hora actual y la usa como
  `registradoEn`, así una entrada de las 06:00 conserva el primer turno del FIFO. La hora de clase ahora se valida
  contra la llegada (no contra el reloj).
- **Retiro de salidos:** `retirarSalidos()` (manual) y purga automática 5 min después de `salir`; ambos dejan
  evento `SALIDA_CAMPUS`. `/tests/` nuevos: llegada 06:00, retiro manual, purga automática, dos entradas del mismo
  lote sin duplicados y acta del valet después de estacionar.
- `valetInspeccionar` acepta el acta desde que el operador recibe el carro, incluso ya estacionado
  (`ESTACIONADO` / `LLAVES_EN_CUSTODIA`).

### Interfaz

- `core.js` deriva `App.ACCESOS` y `App.NOMBRE_ACCESO` de `ParkData`; nada de listas de dos accesos.
- **Inicio:** cada parqueadero muestra sus dos entradas con pasarela, cola externa y recomendación; el formulario
  tiene "Hora de llegada (opcional)" y seis opciones de acceso.
- **Valet (operador):** se corrigió el `TypeError` que tumbaba el render al enfocar el mapa (`ruta()` recibía
  `undefined`); las fotos siguen disponibles después de estacionar y se pueden reemplazar; se agregaron
  "Pasar portería", "Confirmar estacionado" y **"Traer el carro a bahía"** para que la entrega con PIN no dependa
  de que el estudiante la pida. Los íconos que no estaban en el subconjunto (`inbox`, `queue`, `flag`,
  `front_hand`) se cambiaron por otros presentes.
- **Estudiante:** "Reclamar mi vehículo" en Mi turno (además de la pestaña Valet) y, en custodia, "Dónde quedó tu
  carro" y el acta con miniaturas ampliables.
- **Portería y operación:** seis pasarelas, selector de acceso para generar llegadas, tarjeta de carros que ya
  salieron con retiro manual y contador de celdas duplicadas (debe quedar en 0).
- Mapa: capa con las seis entradas rotuladas y fila viva por cada acceso.

### Verificación

```
node tests/engine.test.js → 22/22 pruebas pasaron
node tests/casos.test.js  → 20/20 casos pasaron
```

En Chrome sobre `file://` (sin red): llegada `SIX001` por Calle 4 Sur a las 06:00 (`registradoEn 360`, primera en
FIFO), 6 pasarelas y 6 entradas en Inicio/Operación/Mapa, flujo completo del operador (aceptar → recibir → 4 fotos
→ portería → estacionar → ubicación → traer a bahía → PIN → `DEVUELTO`), "Reclamar mi vehículo" en Mi turno,
retiro de 32 salidos, 60 min con autoPortería sin romper invariantes y 390 px sin desbordes.

**Límites:** el guion sigue saturando el parqueadero a propósito; la estimación por acceso es la global del FIFO
(no promete una celda en el lote de esa entrada). La purga automática usa 5 min; el botón del panel es inmediato.
