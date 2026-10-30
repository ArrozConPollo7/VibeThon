// Panel de accesibilidad: tema, tamaño de letra, contraste, movimiento y sonido.
(function () {
  const { icono } = App;
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

  App.prefs = window.ParkPrefs.leer();

  App.cambiarPrefs = function (parche) {
    App.prefs = { ...App.prefs, ...parche };
    window.ParkPrefs.guardar(App.prefs);
    window.ParkPrefs.aplicar(App.prefs);
    App.programarRender();
  };

  function segmentos(nombre, opciones) {
    return `<div class="segmentos">${opciones
      .map(
        (o) => `<button type="button" class="segmento" data-accion="elegirPref" data-pref="${nombre}" data-valor="${o.id}" aria-pressed="${String(App.prefs[nombre]) === String(o.id)}"${o.etiqueta ? ` aria-label="${o.etiqueta}"` : ''}>${o.texto}</button>`
      )
      .join('')}</div>`;
  }

  function interruptor(pref, texto) {
    return `<label class="interruptor">
      <input type="checkbox" data-accion-cambio="alternarPref" data-pref="${pref}"${App.prefs[pref] ? ' checked' : ''}>
      <span class="interruptor-pista" aria-hidden="true"></span><span>${texto}</span>
    </label>`;
  }

  App.pantallas.herramientas = function () {
    const abierto = App.ui.panelA11y;
    const { silencio } = App.prefs;
    return `<div class="herramientas">
      <button type="button" class="boton-icono" data-accion="alternarSilencio" aria-pressed="${silencio}" aria-label="${silencio ? 'Activar sonidos' : 'Silenciar sonidos'}">${icono(silencio ? 'silencio' : 'parlante', 22)}</button>
      <button type="button" class="boton-icono" id="abrir-a11y" data-accion="alternarPanelA11y" aria-expanded="${Boolean(abierto)}" aria-controls="panel-a11y" aria-label="Accesibilidad">${icono('accesibilidad', 22)}</button>
    </div>`;
  };

  App.pantallas.panelA11y = function () {
    if (!App.ui.panelA11y) return '';
    return `<section class="panel-a11y" id="panel-a11y" data-key="panel-a11y" aria-label="Accesibilidad">
      <h2>Accesibilidad</h2>
      <fieldset><legend>Tema</legend>${segmentos('tema', TEMAS)}</fieldset>
      <fieldset><legend>Tamaño de letra</legend>${segmentos('letra', LETRAS)}</fieldset>
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
