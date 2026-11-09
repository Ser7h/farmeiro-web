/* Símbolos vetoriais originais para os controles do mapa. */
const glyphs = {
  map: '<path d="m3 5 6-2 6 3 6-2v15l-6 2-6-3-6 2zM9 3v15m6-12v15"/>',
  field: '<path d="m2 15 9-11 11 5-9 12zM6 16l9-10m-5 13 9-11"/>',
  wallet: '<path d="M20 8V5a2 2 0 0 0-2-2L5 6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h15V8H5m16 4h-5v5h5z"/>',
  book: '<path d="M5 3h14v18H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm3 0v18m3-13h5m-5 4h4"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18m-13 5h3"/>',
  pin: '<path d="M19 10c0 6-7 11-7 11s-7-5-7-11a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
  farm: '<path d="M2 11 7 5l5-3 5 3 5 6M4 10v11h16V10M8 21v-8h8v8m-8-7 8 7m0-7-8 7M11 7h2"/>',
  leaf: '<path d="M20 3C9 3 3 7 5 14s13 7 15-11ZM3 21l11-11"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  bolt: '<path d="m13 2-9 12h7l-1 8 10-13h-7z"/>',
  arrow: '<path d="M4 12h16m-7-7 7 7-7 7"/>',
  right: '<path d="m9 5 7 7-7 7"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 5 2c-1 1-2 1-2 3m0 3h.01"/>',
  save: '<path d="M4 3h13l4 4v14H3V4zM7 3v6h9V3M7 21v-8h10v8"/>',
  close: '<path d="m5 5 14 14M19 5 5 19"/>',
  plus: '<path d="M4 12h16M12 4v16"/>',
  minus: '<path d="M4 12h16"/>',
  target:
    '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 1v4m0 14v4M1 12h4m14 0h4"/>',
  layers: '<path d="m2 8 10-5 10 5-10 5zM2 12l10 5 10-5M2 16l10 5 10-5"/>',
  water: '<path d="M12 2s-7 8-7 13a7 7 0 1 0 14 0c0-5-7-13-7-13ZM8 15c0 2 1 3 3 3"/>',
  hill: '<path d="m2 18 8-12 6 9 3-5 4 8ZM7 11l3 1 2-2"/>',
  road: '<path d="m7 3-5 18m15-18 5 18M12 3v3m0 4v4m0 4v3"/>',
  tree: '<path d="m12 2 7 9h-3l5 6h-8v5h-2v-5H3l5-6H5z"/>',
  check: '<path d="m3 12 6 6L21 5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  sound: '<path d="M3 9h4l5-5v16l-5-5H3zM16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  mute: '<path d="M3 9h4l5-5v16l-5-5H3zM16 9l6 6m0-6-6 6"/>',
  truck:
    '<path d="M2 5h12v12H2zM14 9h4l4 4v4h-8"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
  tractor:
    '<circle cx="7" cy="16" r="4"/><circle cx="18" cy="18" r="3"/><path d="M2 6h9m-7 0v7m6-7 3 8h5v-4m-4 8h-3"/>',
  person: '<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  flag: '<path d="M5 22V3m0 1c5-4 9 4 14 0v10c-5 4-9-4-14 0"/>',
  cube: '<path d="m12 2 9 5v10l-9 5-9-5V7zM3 7l9 5 9-5m-9 5v10"/>',
  sprout: '<path d="M12 21v-8m0 2C5 15 3 11 3 6c6 0 9 2 9 9Zm0-3c0-6 4-9 9-9 0 6-2 9-9 9Z"/>',
  file: '<path d="M5 2h9l5 5v15H5zM14 2v6h5M8 13h8m-8 4h7"/>',
  rewind: '<path d="M3 5v6h6m-6 0a9 9 0 1 1 1 7"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  compare: '<path d="M3 7h17m-4-4 4 4-4 4M21 17H4m4-4-4 4 4 4"/>',
  dropper: '<path d="m5 16 9-9 3 3-9 9-5 2zM13 5l6 6m-4-8 6 6"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-3 6-5 2 2-6z"/>',
  pause: '<path d="M8 4v16M16 4v16"/>',
};
function ic(name, size = 18) {
  return (
    '<svg width="' +
    size +
    '" height="' +
    size +
    '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    (glyphs[name] || "") +
    "</svg>"
  );
}
