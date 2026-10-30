// Componentes del sistema de Stitch (DESIGN.md §Components), compartidos por todas las pantallas.
(function () {
  const { esc, icono } = App;

  const CHIP = {
    libre: 'bg-libre-fondo border-libre-borde text-libre-texto',
    reservada: 'bg-reservada-fondo border-reservada-borde text-reservada-texto',
    ocupada: 'bg-ocupada-fondo border-ocupada-borde text-ocupada-texto'
  };
  const PUNTO = { libre: 'bg-libre-punto', reservada: 'bg-reservada-punto', ocupada: 'bg-ocupada-punto' };
  const AVISO = {
    ok: { caja: 'bg-ok-fondo border-ok-borde text-ok-texto', ico: 'text-ok-icono', nombre: 'check_circle' },
    atencion: { caja: 'bg-aviso-fondo border-aviso-borde text-aviso-texto', ico: 'text-aviso-icono', nombre: 'warning' },
    error: { caja: 'bg-mal-fondo border-mal-borde text-mal-texto', ico: 'text-mal-icono', nombre: 'error' }
  };

  const clases = {
    tarjeta: 'bg-surface-container-lowest rounded-2xl p-space-md shadow-sm flex flex-col gap-space-sm min-w-0',
    pantalla: 'flex flex-col gap-space-md w-full',
    titulo: 'text-headline-sm text-on-surface',
    nota: 'text-label-sm text-on-surface-variant',
    primario:
      'w-full min-h-[52px] px-4 py-2 rounded-2xl bg-primary-container text-on-primary text-label-lg shadow-md flex items-center justify-center gap-2 transition-all hover:bg-primary active:scale-[0.99] disabled:bg-surface-container-high disabled:text-on-surface-variant disabled:shadow-none disabled:cursor-not-allowed',
    secundario:
      'min-h-[44px] px-3 py-2 rounded-xl bg-surface-container text-primary-container text-label-md flex items-center justify-center gap-1.5 transition-colors hover:bg-surface-container-high disabled:opacity-60',
    entrada:
      'w-full min-h-[48px] px-3 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface text-body-lg placeholder:text-on-surface-variant focus:border-primary-container focus:ring-2 focus:ring-surface-container-high focus:outline-none',
    etiqueta: 'flex flex-col gap-1.5 text-label-md text-on-surface',
    error: 'text-label-sm text-mal-icono'
  };
  App.clases = clases;

  App.chip = (estado, texto) =>
    `<span class="min-h-[28px] px-2.5 rounded-full border text-label-md inline-flex items-center gap-1.5 ${CHIP[estado]}"><span class="w-1.5 h-1.5 rounded-full ${PUNTO[estado]}"></span>${texto}</span>`;

  App.chipMarca = (texto) =>
    `<span class="min-h-[28px] px-2.5 rounded-full bg-surface-container-high text-primary-container text-label-md inline-flex items-center">${texto}</span>`;

  App.chipEnVivo = (texto) => `<span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container text-primary-container text-label-sm">
      <span class="pulso h-2 w-2 rounded-full bg-secondary-container"></span>${texto}</span>`;

  App.chipTipo = (tipo) =>
    `<span class="inline-flex items-center gap-1 text-label-sm text-on-surface-variant">${icono(tipo === 'MOTO' ? 'two_wheeler' : 'directions_car', 18)}${App.TIPO_TEXTO[tipo]}</span>`;

  App.placaHTML = (placa, grande) =>
    `<span class="font-mono font-bold tracking-wider text-on-surface bg-surface-container px-2 py-0.5 rounded ${grande ? 'text-headline-sm' : 'text-label-md'}">${esc(App.formatoPlaca(placa))}</span>`;

  App.tituloPantalla = (titulo, chip, subtitulo) =>
    `<header class="flex flex-col gap-1">
      <div class="flex flex-wrap items-center justify-between gap-space-xs"><h1 class="text-headline-lg text-on-surface">${titulo}</h1>${chip || ''}</div>
      ${subtitulo ? `<p class="text-body-md text-on-surface-variant">${subtitulo}</p>` : ''}
    </header>`;

  // Indicador radial de Stitch: el círculo mide 100 unidades, así stroke-dasharray es el porcentaje.
  const CIRCULO = 'M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831';
  App.anillo = (pct, etiqueta, texto) =>
    `<div class="relative w-16 h-16 shrink-0 flex items-center justify-center" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="${etiqueta}">
      <svg class="w-full h-full -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
        <path class="text-surface-container-high" d="${CIRCULO}" fill="none" stroke="currentColor" stroke-width="3.5"/>
        <path class="text-primary-container" d="${CIRCULO}" fill="none" stroke="currentColor" stroke-dasharray="${pct}, 100" stroke-linecap="round" stroke-width="3.5"/>
      </svg>
      <span class="absolute text-label-md text-primary-container">${texto}</span>
    </div>`;

  App.aviso = (tipo, contenido) => {
    const a = AVISO[tipo];
    return `<section class="rounded-2xl border p-space-sm flex items-start gap-space-xs ${a.caja}"${tipo === 'error' ? ' role="alert"' : ''}>
      <span class="${a.ico}">${icono(a.nombre, 22, true)}</span><div class="min-w-0 flex-1 text-label-sm">${contenido}</div>
    </section>`;
  };

  // Stepper de 04-seguimiento: pasos = [{ titulo, detalle, estado: hecho|actual|pendiente, ico }]
  App.stepper = (pasos, etiqueta) => {
    const paso = (p) => {
      const hecho = p.estado === 'hecho';
      const actual = p.estado === 'actual';
      const disco = hecho
        ? `<span class="w-7 h-7 rounded-full bg-tertiary-container text-on-tertiary flex items-center justify-center shrink-0">${icono('check', 16, true)}</span>`
        : actual
          ? `<span class="w-7 h-7 rounded-full bg-secondary-container text-[#131b2e] flex items-center justify-center shrink-0 shadow-sm">${icono(p.ico || 'schedule', 18)}</span>`
          : `<span class="w-7 h-7 rounded-full bg-surface-container text-on-surface-variant flex items-center justify-center shrink-0">${icono(p.ico || 'schedule', 16)}</span>`;
      return `<li class="flex items-start gap-3${p.estado === 'pendiente' ? ' opacity-60' : ''}"${actual ? ' aria-current="step"' : ''}>
        ${disco}
        <div class="flex flex-col min-w-0 flex-1">
          <span class="text-label-md ${actual ? 'text-primary-container' : 'text-on-surface'}">${p.titulo}</span>
          ${p.detalle ? `<span class="text-label-sm text-on-surface-variant">${p.detalle}</span>` : ''}
        </div>
      </li>`;
    };
    return `<ol class="flex flex-col gap-3" aria-label="${etiqueta}">${pasos.map(paso).join('')}</ol>`;
  };

  // Muesca perforada del ticket de 02-mi-turno.
  App.cortePerforado = () =>
    `<div class="relative w-full h-6 flex items-center bg-surface-container-lowest overflow-hidden" aria-hidden="true">
      <div class="w-4 h-8 rounded-r-full bg-background -ml-2 shrink-0"></div>
      <div class="flex-1 mx-2 border-t-2 border-dashed border-outline-variant"></div>
      <div class="w-4 h-8 rounded-l-full bg-background -mr-2 shrink-0"></div>
    </div>`;

  App.interruptor = (atributos, texto) =>
    `<label class="flex items-center gap-3 min-h-[44px] cursor-pointer text-label-md text-on-surface">
      <input type="checkbox" class="peer sr-only" ${atributos}>
      <span class="relative w-11 h-6 rounded-full bg-outline-variant peer-checked:bg-primary-container peer-focus-visible:outline peer-focus-visible:outline-2 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:rounded-full after:bg-surface-container-lowest after:transition-transform peer-checked:after:translate-x-5 shrink-0" aria-hidden="true"></span>
      <span>${texto}</span>
    </label>`;
})();
