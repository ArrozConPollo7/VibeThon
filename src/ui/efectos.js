// Sonidos generados con Web Audio y confeti ligero en canvas. Sin archivos ni librerías.
(function () {
  const VOLUMEN = 0.25;
  const SONIDOS = {
    click: [{ f: 1200, d: 0.03, g: 0.2 }],
    avance: [{ f: 660, d: 0.07, g: 0.6 }],
    ok: [{ f: 1046, d: 0.28, g: 0.7 }],
    error: [{ f: 170, d: 0.24, g: 1, onda: 'square' }],
    celda: [
      { f: 523, d: 0.16, g: 0.8 },
      { f: 659, d: 0.16, g: 0.8, t: 0.12 },
      { f: 784, d: 0.32, g: 0.8, t: 0.24 }
    ]
  };
  const DURACION_CONFETI_MS = 1200;
  const PIEZAS_CONFETI = 70;
  let contexto = null;

  // Los navegadores bloquean el audio hasta que la persona interactúa.
  function crearContexto() {
    if (contexto) return;
    const Contexto = window.AudioContext || window.webkitAudioContext;
    if (Contexto) contexto = new Contexto();
  }
  document.addEventListener('pointerdown', crearContexto, { once: true });
  document.addEventListener('keydown', crearContexto, { once: true });

  function nota({ f, d, g, t = 0, onda = 'sine' }) {
    const inicio = contexto.currentTime + t;
    const oscilador = contexto.createOscillator();
    const ganancia = contexto.createGain();
    oscilador.type = onda;
    oscilador.frequency.value = f;
    ganancia.gain.setValueAtTime(g * VOLUMEN, inicio);
    ganancia.gain.exponentialRampToValueAtTime(0.0001, inicio + d);
    oscilador.connect(ganancia).connect(contexto.destination);
    oscilador.start(inicio);
    oscilador.stop(inicio + d);
  }

  App.sonido = {
    play(nombre) {
      if (!contexto || App.prefs.silencio || !SONIDOS[nombre]) return;
      if (contexto.state === 'suspended') contexto.resume();
      SONIDOS[nombre].forEach(nota);
    }
  };

  App.confeti = function () {
    if (App.sinMovimiento()) return;
    const lienzo = document.createElement('canvas');
    lienzo.className = 'confeti';
    lienzo.setAttribute('aria-hidden', 'true');
    lienzo.width = window.innerWidth;
    lienzo.height = window.innerHeight;
    document.body.appendChild(lienzo);
    const ctx = lienzo.getContext('2d');
    const estilos = getComputedStyle(document.documentElement);
    const colores = ['--secondary-container', '--primary-container', '--libre-punto', '--surface-tint'].map(
      (c) => `rgb(${estilos.getPropertyValue(c).trim()})`
    );
    const piezas = Array.from({ length: PIEZAS_CONFETI }, (_, i) => ({
      x: lienzo.width * Math.random(),
      y: -20 - Math.random() * lienzo.height * 0.3,
      vx: (Math.random() - 0.5) * 2.4,
      vy: 3 + Math.random() * 4,
      tam: 5 + Math.random() * 5,
      color: colores[i % colores.length]
    }));
    const inicio = performance.now();
    function cuadro(ahora) {
      const avance = (ahora - inicio) / DURACION_CONFETI_MS;
      if (avance >= 1) {
        lienzo.remove();
        return;
      }
      ctx.clearRect(0, 0, lienzo.width, lienzo.height);
      ctx.globalAlpha = 1 - avance * avance;
      piezas.forEach((p) => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x + p.vx * avance * 60, p.y + p.vy * avance * 60, p.tam, p.tam * 0.6);
      });
      requestAnimationFrame(cuadro);
    }
    requestAnimationFrame(cuadro);
  };
})();
