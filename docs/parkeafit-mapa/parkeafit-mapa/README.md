# Mapa de parqueaderos ParkEAFIT

Componente que dibuja el campus EAFIT con los 3 parqueaderos de la app, celda por celda (880 celdas de carro).

| Archivo | Para qué sirve |
|---|---|
| `parking-map.js` | El componente. No tiene dependencias. |
| `index.html` | Demo funcionando. Ábrela con doble clic. |
| `celdas.json` | Las 880 celdas con su ID, tipo y orden. Sirve como estado inicial del backend. |
| `parqueaderos.json` | Capacidades, polígonos y accesos de cada parqueadero (fuente: reglamento EAFIT). |

## Parqueaderos

| ID | Nombre en la app | Nombre oficial | Celdas carro | Acceso |
|---|---|---|---|---|
| `N` | Principal | Parqueadero norte | 438 (8 PMR, 4 baja emisión) | Regional |
| `I` | Ingeniería | Parqueadero sur | 186 (4 PMR, 4 baja emisión) | Las Vegas |
| `G` | Idiomas | Parque Los Guayabos | 256 (4 PMR, 3 proveedores) | Calle 5 Sur |

Los IDs de las celdas son `N-001`, `I-042`, `G-256`… y **siempre son los mismos**. El número indica la cercanía al acceso: `N-001` es la celda más cercana a la entrada.

## 1. Instalación

Copia `parking-map.js` a tu proyecto (por ejemplo `public/` o `src/lib/`).

### HTML / JS puro
```html
<div id="mapa" style="height:80vh"></div>
<script src="parking-map.js"></script>
<script>
  const map = ParkingMap.create(document.getElementById("mapa"), {
    onSelect: celda => console.log(celda),   // el usuario tocó una celda
    onChange: stats => console.log(stats)    // cambió algún estado
  });
</script>
```

### React (Vite / Next)
```jsx
import { useEffect, useRef } from "react";
import ParkingMap from "./lib/parking-map.js";

export default function Mapa({ estados, onSelect }) {
  const ref = useRef(null);
  const map = useRef(null);

  useEffect(() => {
    map.current = ParkingMap.create(ref.current, { onSelect });
    return () => map.current.destroy();
  }, []);

  useEffect(() => { if (estados) map.current.setStatuses(estados); }, [estados]);

  return <div ref={ref} style={{ height: "80vh" }} />;
}
```
En Next.js, carga el componente con `dynamic(() => import("./Mapa"), { ssr: false })` porque usa el DOM.

## 2. API

| Método | Qué hace |
|---|---|
| `setCellStatus(id, estado)` | Cambia una celda. Estados: `"free"`, `"taken"`, `"held"` (reservada). |
| `setStatuses({ "N-001": "taken", ... })` | Cambia muchas celdas a la vez. Úsalo al cargar el estado inicial o en cada tick de la simulación. |
| `firstFree(lotId, tipo?)` | Devuelve la celda libre más cercana al acceso. Base de la asignación justa. |
| `getStats()` | Libres, ocupadas y reservadas por parqueadero. |
| `getCell(id)` / `getCells()` | Información de una o de todas las celdas. |
| `focusLot("N")` / `showAll()` | Zoom animado a un parqueadero o al campus completo. |
| `select(id)` | Resalta una celda (por ejemplo, la que se le asignó al estudiante). |
| `setTheme("dark")` | Modo oscuro. |
| `destroy()` | Limpia el componente. |

Opciones de `create`: `onSelect`, `onChange`, `theme`, `initialStatus` (objeto id→estado) y `lots` (para reemplazar los datos de los parqueaderos).

## 3. Conectarlo con la simulación del reto

El mapa solo pinta. La lógica (cola, asignación, valet) va en tu capa de datos:

```js
// 1. Estado inicial: celdas.json + condiciones iniciales de la organización
const { celdas } = await fetch("celdas.json").then(r => r.json());
const estado = Object.fromEntries(celdas.map(c => [c.id, "free"]));
// ...aplicar aquí las condiciones iniciales del reto...
map.setStatuses(estado);

// 2. Por cada evento de la simulación (llegada / salida)
function procesarEvento(ev) {
  if (ev.tipo === "llegada") {
    const lot = ev.acceso === "Regional" ? "N" : "I";
    const celda = map.firstFree(lot) || map.firstFree(lot === "N" ? "I" : "N");
    if (celda) map.setCellStatus(celda.id, "taken");
    // si no hay celda: va a la cola
  }
  if (ev.tipo === "salida") map.setCellStatus(ev.celdaId, "free");
}
```

Si el JSON se carga con `fetch`, la app tiene que servirse desde un servidor local (`npx serve` o `npm run dev`). Si se abre con doble clic, el navegador bloquea `fetch` de archivos locales.

## 4. Si la organización entrega otras capacidades

Cambia el `mix` del parqueadero en `DEFAULT_LOTS` (dentro de `parking-map.js`) o pásalo con la opción `lots`. Las celdas se recalculan solas para caber en la misma forma. Si cambias capacidades, vuelve a generar `celdas.json`:

```bash
node -e 'const P=require("./parking-map.js");const c=P.DEFAULT_LOTS.flatMap(l=>P.layoutLot(l).map(({id,lot,kind,order,center})=>({id,lot,kind,order,center,status:"free"})));require("fs").writeFileSync("celdas.json",JSON.stringify({total:c.length,celdas:c},null,1))'
```

## Notas

- Las coordenadas están en el sistema de la imagen original (890×1076 px). La forma de cada parqueadero sigue el plano; la distribución interna de las celdas es aproximada.
- Ingeniería tiene además 270 celdas de moto y Guayabos 120. No se dibujan.
- Fuente: [Reglamento de ingreso vehicular EAFIT](https://www.eafit.edu.co/reglamento-ingreso-peatonal-vehicular).
