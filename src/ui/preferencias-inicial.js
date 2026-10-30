// Se carga en <head>, antes del CSS, para aplicar las preferencias antes del primer pintado.
window.ParkPrefs = (function () {
  const CLAVE = 'parkeafit-prefs';
  const PORCENTAJE_LETRA = { 1: '100%', 2: '115%', 3: '130%' };
  const BASE = { tema: 'sistema', letra: 1, contraste: false, reducir: false, silencio: false };

  function leer() {
    try {
      return { ...BASE, ...JSON.parse(localStorage.getItem(CLAVE) || '{}') };
    } catch (error) {
      return { ...BASE };
    }
  }

  function guardar(prefs) {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(prefs));
    } catch (error) {
      // Sin localStorage las preferencias duran solo esta sesión.
    }
  }

  function aplicar(prefs) {
    const raiz = document.documentElement;
    const oscuro = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const temaFijo = prefs.tema === 'dark' || prefs.tema === 'light';
    raiz.dataset.theme = temaFijo ? prefs.tema : oscuro ? 'dark' : 'light';
    raiz.dataset.letra = String(prefs.letra);
    raiz.dataset.contraste = prefs.contraste ? 'alto' : 'normal';
    raiz.dataset.movimiento = prefs.reducir || sinMovimiento ? 'reducido' : 'normal';
    raiz.style.fontSize = PORCENTAJE_LETRA[prefs.letra] || '100%';
  }

  aplicar(leer());
  return { leer, guardar, aplicar };
})();
