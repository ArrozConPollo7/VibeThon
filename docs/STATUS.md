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
