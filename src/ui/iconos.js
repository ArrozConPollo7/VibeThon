// Íconos de Stitch: Material Symbols servido desde src/vendor (subconjunto, sin internet).
// Si agregas un ícono, debe estar incluido en src/vendor/material-symbols.woff2.
App.icono = (nombre, tam, relleno) =>
  `<span class="material-symbols-outlined${relleno ? ' relleno' : ''}" style="font-size:${(tam || 20) / 16}rem" aria-hidden="true">${nombre}</span>`;
