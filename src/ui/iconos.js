// Íconos SVG en línea, dibujados para ParkEAFIT (sin librerías externas).
App.icono = (function () {
  const trazos = {
    casa: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5V14h4v5.5"/>',
    turno: '<rect x="4" y="3.5" width="16" height="17" rx="2.5"/><path d="M8 9h8M8 13h8M8 17h4"/>',
    llave: '<circle cx="8" cy="15.5" r="4.5"/><path d="m11.2 12.3 8.3-8.3M16 7.5l2.8 2.8M13.5 10l2 2"/>',
    carro: '<path d="M4 16.5V12l2-5.5h12l2 5.5v4.5"/><path d="M3.5 12h17"/><path d="M3.5 16.5h17v2h-3v-2M6.5 16.5v2h-3v-2"/><circle cx="7.5" cy="14.3" r=".6"/><circle cx="16.5" cy="14.3" r=".6"/>',
    moto: '<circle cx="5.5" cy="16.5" r="3"/><circle cx="18.5" cy="16.5" r="3"/><path d="M5.5 16.5 10 11h5l3.5 5.5M14 7h2.5l2 9.5M10 11 8.5 8.5H6"/>',
    reloj: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5.2l3.3 2"/>',
    check: '<path d="m4.5 12.5 5 5 10-11"/>',
    alerta: '<path d="M12 4 2.8 19.5h18.4Z"/><path d="M12 10v4.5M12 17v.4"/>',
    cerrar: '<path d="m6 6 12 12M18 6 6 18"/>',
    play: '<path d="M7.5 5v14l11-7Z"/>',
    pausa: '<path d="M8 5v14M16 5v14"/>',
    paso: '<path d="M5 5v14l9-7ZM18 5v14"/>',
    mas: '<path d="M12 5v14M5 12h14"/>',
    reiniciar: '<path d="M4.5 12a7.5 7.5 0 1 0 2.4-5.5"/><path d="M4.5 4.5v4.2h4.2"/>',
    bajar: '<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>',
    parlante: '<path d="M4 9.5v5h3.5L12.5 19V5L7.5 9.5Z"/><path d="M16 9a4.5 4.5 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
    silencio: '<path d="M4 9.5v5h3.5L12.5 19V5L7.5 9.5Z"/><path d="m16 9.5 5 5M21 9.5l-5 5"/>',
    accesibilidad: '<circle cx="12" cy="4.5" r="1.8"/><path d="M4.5 8.5c5 1.3 10 1.3 15 0M12 10v5M12 15l-3.5 6M12 15l3.5 6"/>',
    pin: '<path d="M12 21s7-6.3 7-11.5a7 7 0 1 0-14 0C5 14.7 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.4"/>'
  };
  return (nombre, tam) =>
    `<svg class="icono" width="${tam || 20}" height="${tam || 20}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${trazos[nombre]}</svg>`;
})();
