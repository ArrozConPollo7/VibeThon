---
name: ParkEAFIT Mobility
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#444651'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#757682'
  outline-variant: '#c5c5d3'
  surface-tint: '#4059aa'
  primary: '#00236f'
  on-primary: '#ffffff'
  primary-container: '#1e3a8a'
  on-primary-container: '#90a8ff'
  inverse-primary: '#b6c4ff'
  secondary: '#735c00'
  on-secondary: '#ffffff'
  secondary-container: '#fed01b'
  on-secondary-container: '#6f5900'
  tertiary: '#003211'
  on-tertiary: '#ffffff'
  tertiary-container: '#004b1d'
  on-tertiary-container: '#44c365'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b6c4ff'
  on-primary-fixed: '#00164e'
  on-primary-fixed-variant: '#264191'
  secondary-fixed: '#ffe083'
  secondary-fixed-dim: '#eec200'
  on-secondary-fixed: '#231b00'
  on-secondary-fixed-variant: '#574500'
  tertiary-fixed: '#7ffc97'
  tertiary-fixed-dim: '#62df7d'
  on-tertiary-fixed: '#002109'
  on-tertiary-fixed-variant: '#005320'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  label-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 18px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1rem
  space-xs: 0.5rem
  space-sm: 0.75rem
  space-md: 1rem
  space-lg: 1.25rem
  space-xl: 1.5rem
---

## Brand & Style

Este sistema de diseño está concebido para resolver la movilidad y la gestión de estacionamiento en el campus universitario bajo una estética funcional, ágil y de alta confiabilidad. Combina la sobriedad institucional con la inmediatez operativa necesaria al conducir o buscar plaza en tiempo real. 

El estilo visual responde a un enfoque **Corporate / Modern** adaptado a interfaces móviles utilitarias:
- **Claridad cognitiva inmediata:** Reducción drástica del ruido visual mediante superficies blancas elevadas, jerarquía tipográfica sin ambigüedades y estados cromáticos reconocibles a simple vista.
- **Tono institucional y dinámico:** El azul marino profundo transmite rigor y orden universitario, mientras que el acento amarillo aporta agilidad táctica y enfoque en llamadas clave o alertas de reserva.
- **Ergonomía vehicular:** Objetos de interacción táctil sobredimensionados (alturas mínimas de 48px), texto de alta legibilidad y retroalimentación inmediata apta para manipulación rápida antes o después de conducir.

## Colors

La paleta cromática está estructurada para optimizar el contraste lumínico diurno y garantizar accesibilidad visual (mínimo ratio WCAG 2.1 AA en texto y componentes interactivos).

### Roles Principales
- **Primario (`#1E3A8A`):** Azul institucional. Reservado para acciones principales de primer orden, encabezados clave y elementos de navegación activos.
- **Acento / Secundario (`#FACC15`):** Amarillo vibrante. Utilizado exclusivamente para llamadas de atención secundarias, resaltes de turnos y estados pendientes o reservados. Sobre este color, el texto interactivo debe ser `#0F172A` para cumplir estándares de contraste.
- **Éxito / Terciario (`#16A34A`):** Verde operativo. Indica plazas libres, confirmaciones de ingreso y cobros exitosos.
- **Alerta / Destructivo (`#DC2626`):** Rojo de advertencia. Reservado para errores de escaneo, infracciones, ocupación crítica o cancelaciones inmediatas.
- **Texto Principal (`#0F172A`):** Azul pizarra profundo con alto contraste sobre fondos claros.
- **Texto Secundario / Desactivado (`#64748B`):** Gris neutro para metadatos, bordes sutiles y plazas ocupadas.

### Fondos y Superficies
- **Lienzo Global (`#F8FAFC`):** Fondo neutro frío que reduce el encandilamiento en pantalla completa.
- **Superficie de Tarjeta (`#FFFFFF`):** Blanco puro para contenedores de información modular, brindando separación nítida frente al lienzo.

### Estados de Plazas de Parqueadero
- **Libre:** Fondo `#DCFCE7`, borde `#86EFAC`, texto `#166534`.
- **Reservada:** Fondo `#FEF9C3`, borde `#FDE047`, texto `#854D0E`.
- **Ocupada:** Fondo `#F1F5F9`, borde `#CBD5E1`, texto `#475569`.

## Typography

El sistema tipográfico utiliza **Inter** en toda la jerarquía de la interfaz, garantizando legibilidad en pantallas móviles de diversa densidad y en ángulos oblicuos cuando el teléfono está colocado en soportes para automóvil.

### Reglas de Aplicación
- **Límite de Legibilidad Estricto:** Ningún elemento visual ni cadena de texto del sistema puede tener un tamaño inferior a 14px (`text-sm`). Quedan prohibidas las fuentes a 11px o 12px para asegurar legibilidad a conductores y peatones.
- **Títulos (`headline-lg`, 24px Bold):** Uso exclusivo en encabezados principales de pantalla, totales de pago o confirmaciones de plaza asignada.
- **Subtítulos (`headline-md` y `headline-sm`, 18px–20px SemiBold):** Encabezados de tarjetas, títulos de zona (ej. *Bloque 18*, *Ingenierías*) y resúmenes de servicio.
- **Cuerpo (`body-lg` / `body-md`, 16px Regular / Medium):** Texto corrido, detalles de horarios, tarifas y descripciones operativas.
- **Etiquetas y Botones (`label-lg` y `label-md`, 14px–16px SemiBold / Medium):** Botones de acción, contadores, chips de disponibilidad y pestañas de la barra de navegación.

## Layout & Spacing

El diseño prioriza un flujo vertical fluido enfocado en dispositivos móviles (360px a 430px de ancho de viewport), complementado con adaptación elástica para tabletas.

### Cuadrícula y Contenedores
- **Móvil (360px - 599px):** Cuadrícula fluida de 4 columnas con márgenes laterales fijos de `1rem` (16px) y medianiles (`gutter`) de `1rem` (16px). Todo el contenido principal se expande al ancho del contenedor seguro.
- **Tableta y Pantallas Mayores (≥600px):** Contenedor centralizado con ancho máximo de lectura de `540px` para preservar la experiencia ergonómica de uso con una sola mano y evitar tarjetas desproporcionadamente alargadas.

### Ritmo Espacial
- **Separación entre bloques apilados:** Las tarjetas y grupos de información secuenciales mantienen una separación constante de `space-md` (16px).
- **Áreas seguras (Safe Areas):** La pantalla reserva `space-xl` (24px) en la zona superior para la barra de estado y un margen inferior dinámico que asegura que ningún contenido quede oculto tras la barra de navegación fija de tres accesos.

## Elevation & Depth

La tridimensionalidad se construye combinando **tonal layers** (superficies blancas sobre el lienzo `#F8FAFC`) con **sombras ambientales suaves**. Se descartan bordes negros duros o sombras difusas con saturación excesiva.

### Niveles de Elevación
1. **Nivel 0 (Lienzo Base):** Superficie de fondo en `#F8FAFC`. Sin sombras.
2. **Nivel 1 (Tarjetas y Contenedores Pasivos):** Superficie `#FFFFFF` con sombra sutil:
   - `box-shadow: 0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.05)`
   - Opcionalmente reforzado por un borde perimetral tenue en `#E2E8F0` de 1px.
3. **Nivel 2 (Tarjetas Interactivas y Módulos de Estado Activo):**
   - `box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.07), 0 2px 4px -2px rgba(15, 23, 42, 0.05)`
4. **Nivel 3 (Barra de Navegación Fija Inferior):**
   - `box-shadow: 0 -4px 12px 0 rgba(15, 23, 42, 0.04)`
   - Borde superior continuo de 1px en `#E2E8F0` para delimitar el área háptica.
5. **Nivel 4 (Toasts y Modales de Alerta):**
   - `box-shadow: 0 10px 15px -3px rgba(15, 23, 42, 0.1), 0 4px 6px -4px rgba(15, 23, 42, 0.08)`

## Shapes

La identidad geométrica emplea un radio de curvatura suave y moderno que humaniza la experiencia y favorece el contacto táctil en pantallas móviles:
- **Tarjetas y Paneles Principales:** `16px` (`rounded-2xl`). Genera bloques contenidos, amigables y delimitados.
- **Botones de Acción Primaria:** `12px` a `16px` (`rounded-xl` o `rounded-2xl`). Unificación con la geometría de las tarjetas.
- **Chips de Estado y Píldoras:** Forma completa de píldora (`9999px` / `rounded-full`) para diferenciar claramente los indicadores de estado respecto a los contenedores estructurales rectangulares.
- **Campos de Entrada de Datos:** `12px` (`rounded-xl`) para un encaje proporcional dentro de las tarjetas.

## Components

### 1. Botones Primarios
- **Propósito:** Ejecutar la acción principal de la pantalla (ej. "Reservar plaza", "Confirmar ingreso", "Pagar estacionamiento"). Solo se permite un botón primario por pantalla.
- **Estructura:** Ancho completo (`w-full`), altura fija de entre `48px` y `52px`.
- **Estilos:** Fondo azul `#1E3A8A`, texto `#FFFFFF` en `label-lg` (`16px`, font-semibold), radio `16px` (`rounded-2xl`). 
- **Estados:**
  - *Hover/Pressed:* Fondo `#172554`.
  - *Deshabilitado:* Fondo `#E2E8F0`, texto `#94A3B8`, cursor inactivo.

### 2. Tarjetas de Información
- **Estructura:** Fondo blanco `#FFFFFF`, radio de `16px` (`rounded-2xl`), padding interno de `16px` a `20px` (`space-md` a `space-lg`).
- **Sombra:** Nivel 1 o Nivel 2 (`shadow-sm` o `shadow-md`), complementado con borde de 1px en `#F1F5F9`.
- **Distribución interna:** Cabecera con título de sector en 18px SemiBold, chip de disponibilidad alineado a la derecha, y cuerpo de datos con etiquetas en 14px e iconos auxiliares.

### 3. Chips de Estado (Disponibilidad)
- **Estructura:** Altura de `28px`, padding horizontal de `10px`, radio `rounded-full`, tipografía `14px` SemiBold (`label-md`). Indicador de micro-punto (bullet) de 6px a la izquierda del texto.
- **Variantes:**
  - **Libre:** Fondo `#DCFCE7`, borde 1px `#86EFAC`, texto `#166534`. Micro-punto `#16A34A`.
  - **Reservada:** Fondo `#FEF9C3`, borde 1px `#FDE047`, texto `#854D0E`. Micro-punto `#CA8A04`.
  - **Ocupada:** Fondo `#F1F5F9`, borde 1px `#CBD5E1`, texto `#475569`. Micro-punto `#64748B`.

### 4. Barra de Navegación Inferior (Bottom Bar)
- **Estructura:** Fijada en la base (`bottom: 0`, `left: 0`, `right: 0`), altura de `64px` más el margen inferior de área segura (`env(safe-area-inset-bottom)`). Fondo `#FFFFFF`, borde superior `#E2E8F0`, elevación Nivel 3.
- **Distribución:** 3 accesos equidistantes estructurados en columnas:
  1. **Inicio:** Icono de cuadrícula/mapa con etiqueta "Inicio".
  2. **Mi turno:** Icono de reloj/tique con etiqueta "Mi turno". Si hay reserva activa, incluye un indicador puntual en `#FACC15`.
  3. **Valet:** Icono de llave/servicio con etiqueta "Valet".
- **Estado Activo:** Icono y etiqueta en `#1E3A8A` con tipografía de `14px` SemiBold.
- **Estado Inactivo:** Icono y etiqueta en `#64748B` con tipografía de `14px` Regular.

### 5. Campos de Entrada (Input Fields)
- **Estructura:** Altura `48px`, borde 1px `#CBD5E1`, fondo `#FFFFFF`, radio de `12px` (`rounded-xl`), texto `#0F172A` en `16px` (`text-base`).
- **Etiqueta:** `14px` SemiBold en `#0F172A`, dispuesta siempre arriba del input con margen inferior de `6px`.
- **Foco:** Borde `#1E3A8A` de 2px con anillo exterior sutil (`ring-2 ring-blue-100`).

### 6. Banners de Retroalimentación y Toasts
- **Ubicación:** Desplegables flotantes en el margen superior (`top: 16px`), centrados con ancho `calc(100% - 32px)`.
- **Estilos y Contraste AA:**
  - **Confirmación / Éxito:** Fondo `#F0FDF4`, borde `#86EFAC` de 1px, texto `#14532D`, icono `#16A34A`.
  - **Advertencia / Reserva Próxima:** Fondo `#FEFCE8`, borde `#FDE047` de 1px, texto `#713F12`, icono `#CA8A04`.
  - **Alerta / Error:** Fondo `#FEF2F2`, borde `#FCA5A5` de 1px, texto `#7F1D1D`, icono `#DC2626`.
- **Tipografía:** Título en `14px` Bold, descripción en `14px` Regular.

### 7. Tarjeta de Turno Activo (Componente Específico)
- **Diseño:** Tarjeta destacada con borde superior reforzado de 4px en `#FACC15` (o `#16A34A` según corresponda), conteniendo número de turno o código QR centrado para lectura por barrera, matrícula del vehículo en formato monoespaciado grande (`18px` SemiBold) y tiempo restante estimado en tipografía `24px` Bold.