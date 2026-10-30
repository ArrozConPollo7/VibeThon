// Tokens de design/DESIGN.md para Tailwind. Cada color apunta a una variable CSS de styles.css,
// así el modo oscuro solo redefine variables y las clases funcionan iguales en ambos temas.
(function () {
  const TOKENS = [
    'surface', 'surface-dim', 'surface-bright', 'surface-container-lowest', 'surface-container-low',
    'surface-container', 'surface-container-high', 'surface-container-highest', 'surface-variant',
    'on-surface', 'on-surface-variant', 'inverse-surface', 'inverse-on-surface', 'outline', 'outline-variant',
    'surface-tint', 'primary', 'on-primary', 'primary-container', 'on-primary-container', 'inverse-primary',
    'secondary', 'on-secondary', 'secondary-container', 'on-secondary-container', 'secondary-fixed',
    'on-secondary-fixed', 'on-secondary-fixed-variant', 'tertiary', 'on-tertiary', 'tertiary-container',
    'on-tertiary-container', 'tertiary-fixed', 'on-tertiary-fixed-variant', 'error', 'on-error',
    'error-container', 'on-error-container', 'background', 'on-background',
    'libre-fondo', 'libre-borde', 'libre-texto', 'libre-punto',
    'reservada-fondo', 'reservada-borde', 'reservada-texto', 'reservada-punto',
    'ocupada-fondo', 'ocupada-borde', 'ocupada-texto', 'ocupada-punto',
    'ok-fondo', 'ok-borde', 'ok-texto', 'ok-icono',
    'aviso-fondo', 'aviso-borde', 'aviso-texto', 'aviso-icono',
    'mal-fondo', 'mal-borde', 'mal-texto', 'mal-icono'
  ];
  const colores = Object.fromEntries(TOKENS.map((t) => [t, `rgb(var(--${t}) / <alpha-value>)`]));

  // Tamaños en rem para que A, A+ y A++ escalen también los títulos.
  const texto = (rem, alto, peso, espacio) => [
    `${rem}rem`,
    { lineHeight: `${alto}rem`, fontWeight: peso, ...(espacio ? { letterSpacing: espacio } : {}) }
  ];

  window.tailwind.config = {
    theme: {
      extend: {
        colors: colores,
        borderRadius: { DEFAULT: '0.25rem', lg: '0.5rem', xl: '0.75rem', '2xl': '1rem', full: '9999px' },
        spacing: {
          gutter: '1rem', margin: '1rem', 'space-xs': '0.5rem', 'space-sm': '0.75rem',
          'space-md': '1rem', 'space-lg': '1.25rem', 'space-xl': '1.5rem'
        },
        fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
        fontSize: {
          'headline-lg': texto(1.5, 2, '700', '-0.02em'),
          'headline-md': texto(1.25, 1.75, '600', '-0.01em'),
          'headline-sm': texto(1.125, 1.625, '600', '-0.01em'),
          'body-lg': texto(1, 1.5, '400'),
          'body-md': texto(1, 1.5, '500'),
          'label-lg': texto(1, 1.25, '600'),
          'label-md': texto(0.875, 1.125, '600', '0.01em'),
          'label-sm': texto(0.875, 1.125, '500')
        }
      }
    }
  };
})();
