// Panel de accesibilidad: tema, tamaño de letra, contraste, movimiento y sonido.
(function () {
  const { icono, clases } = App;
  const TEMAS = [
    { id: 'light', texto: 'Claro' },
    { id: 'dark', texto: 'Oscuro' },
    { id: 'sistema', texto: 'Sistema' }
  ];
  const LETRAS = [
    { id: 1, texto: 'A', etiqueta: 'Tamaño de letra normal' },
    { id: 2, texto: 'A+', etiqueta: 'Tamaño de letra grande' },
    { id: 3, texto: 'A++', etiqueta: 'Tamaño de letra muy grande' }
  ];
  const BOTON_ICONO =
    'w-11 h-11 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors';

  App.prefs = window.ParkPrefs.leer();

  App.cambiarPrefs = function (parche) {
    App.prefs = { ...App.prefs, ...parche };
    window.ParkPrefs.guardar(App.prefs);
    window.ParkPrefs.aplicar(App.prefs);
    App.programarRender();
  };

  function segmentos(nombre, opciones) {
    return `<div class="grid grid-cols-3 gap-1 p-1 rounded-xl bg-surface-container-low">${opciones
      .map((o) => {
        const activo = String(App.prefs[nombre]) === String(o.id);
        return `<button type="button" class="min-h-[44px] rounded-lg text-label-md ${activo ? 'bg-primary-container text-on-primary shadow-sm' : 'text-on-surface-variant'}" data-accion="elegirPref" data-pref="${nombre}" data-valor="${o.id}" aria-pressed="${activo}"${o.etiqueta ? ` aria-label="${o.etiqueta}"` : ''}>${o.texto}</button>`;
      })
      .join('')}</div>`;
  }

  const interruptor = (pref, texto) =>
    App.interruptor(`data-accion-cambio="alternarPref" data-pref="${pref}"${App.prefs[pref] ? ' checked' : ''}`, texto);

  App.pantallas.herramientas = function () {
    const abierto = App.ui.panelA11y;
    const { silencio } = App.prefs;
    return `<div class="flex items-center shrink-0">
      <button type="button" class="${BOTON_ICONO}" data-accion="alternarSilencio" aria-pressed="${silencio}" aria-label="${silencio ? 'Activar sonidos' : 'Silenciar sonidos'}">${icono(silencio ? 'volume_off' : 'volume_up', 22)}</button>
      <button type="button" class="${BOTON_ICONO}" id="abrir-a11y" data-accion="alternarPanelA11y" aria-expanded="${Boolean(abierto)}" aria-controls="panel-a11y" aria-label="Accesibilidad">${icono('accessibility_new', 22)}</button>
    </div>`;
  };

  App.pantallas.panelA11y = function () {
    if (!App.ui.panelA11y) return '';
    const leyenda = 'text-label-md text-on-surface mb-1.5';
    return `<section class="fixed top-16 right-4 left-4 sm:left-auto sm:w-80 z-50 max-h-[calc(100dvh-5rem)] overflow-y-auto bg-surface-container-lowest rounded-2xl p-space-md shadow-xl flex flex-col gap-space-sm" id="panel-a11y" data-key="panel-a11y" aria-label="Accesibilidad">
      <h2 class="${clases.titulo}">Accesibilidad</h2>
      <fieldset><legend class="${leyenda}">Tema</legend>${segmentos('tema', TEMAS)}</fieldset>
      <fieldset><legend class="${leyenda}">Tamaño de letra</legend>${segmentos('letra', LETRAS)}</fieldset>
      ${interruptor('contraste', 'Alto contraste')}
      ${interruptor('reducir', 'Reducir animaciones')}
      ${interruptor('silencio', 'Silenciar sonidos')}
    </section>`;
  };

  App.acciones.alternarPanelA11y = () => App.set({ panelA11y: !App.ui.panelA11y });
  App.acciones.alternarSilencio = () => App.cambiarPrefs({ silencio: !App.prefs.silencio });
  App.acciones.elegirPref = function (el) {
    const { pref, valor } = el.dataset;
    App.cambiarPrefs({ [pref]: pref === 'letra' ? Number(valor) : valor });
  };
  App.acciones.alternarPref = (el) => App.cambiarPrefs({ [el.dataset.pref]: el.checked });

  // "Sistema" sigue al sistema operativo también mientras la app está abierta.
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (App.prefs.tema === 'sistema') window.ParkPrefs.aplicar(App.prefs);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && App.ui.panelA11y) {
      App.set({ panelA11y: false });
      document.getElementById('abrir-a11y').focus();
    }
  });
  document.addEventListener('click', (e) => {
    if (App.ui.panelA11y && !e.target.closest('#panel-a11y, #abrir-a11y')) App.set({ panelA11y: false });
  });
})();
