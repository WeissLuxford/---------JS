const P = {
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.5 4.5-7 8-7s7 2.5 8 7"/>',
  swords: '<path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M16 16l4 4"/><path d="M19 21l2-2"/><path d="M14.5 6.5L18 3h3v3l-3.5 3.5"/><path d="M5 14l4 4"/><path d="M7 17l-3 3"/><path d="M3 19l2 2"/>',
  book: '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16v4M17 18h4"/>',
  pact: '<circle cx="12" cy="12" r="9"/><path d="M12 21L6.7 4.7 20.6 14.8H3.4L17.3 4.7z"/>',
  bag: '<path d="M6 8h12l1 13H5z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/><path d="M9 12h6"/>',
  scroll: '<path d="M15 12h-5"/><path d="M15 8h-5"/><path d="M19 17V5a2 2 0 0 0-2-2H4"/><path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3"/>',
  feather: '<path d="M12.7 19a2 2 0 0 0 1.4-.6l6.2-6.2a6 6 0 0 0-8.5-8.5L5.6 9.9A2 2 0 0 0 5 11.3V18a1 1 0 0 0 1 1z"/><path d="M16 8L2 22"/><path d="M17.5 15H9"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  next: '<path d="M9 5l7 7-7 7"/>',
  down: '<path d="M5 9l7 7 7-7"/>',
  dots: '<circle cx="5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="19" cy="12" r="1.4" fill="currentColor"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/><path d="M10 11v6M14 11v6"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  campfire: '<path d="M12 3c2 3 4 4.5 4 7.5a4 4 0 0 1-8 0c0-1.5.8-2.5 1.5-3.3.3 1.3 1 2 2 2.3C11 7.5 11.5 5 12 3z"/><path d="M4 21l16-4M20 21L4 17"/>',
  d20: '<path d="M12 2l8.7 5v10L12 22l-8.7-5V7z"/><path d="M12 7l4.5 8h-9z"/><path d="M12 2v5M3.3 7l4.2 8M20.7 7l-4.2 8M7.5 15L12 22l4.5-7"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  heart: '<path d="M12 20s-8-4.6-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.4 12 20 12 20z"/>',
  boot: '<path d="M7 3h5v8l6 2.5a3 3 0 0 1 2 2.8V18H4v-4l3-2z"/><path d="M4 18v3h16v-3"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  range: '<path d="M4 20l2-2M8 16l2-2M12 12l2-2M16 8l4-4"/><path d="M15 4h5v5"/>',
  area: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".8" fill="currentColor"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M10 2h4M12 2v3"/>',
  drop: '<path d="M12 3c3 4 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-7 6-11z"/>',
  spiral: '<path d="M12 12a1.5 1.5 0 1 1 1.5 1.5A3 3 0 1 1 15 10.5a4.5 4.5 0 1 1-6 6A6 6 0 1 1 18 9"/>',
  candle: '<path d="M10 9h4v11h-4z"/><path d="M12 3c1.5 2 1.5 3.5 0 5-1.5-1.5-1.5-3 0-5z"/><path d="M6 21h12"/>',
  target: '<circle cx="12" cy="12" r="7"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
  archive: '<path d="M3 4h18v4H3zM5 8v12h14V8M10 12h4"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  camera: '<rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="12" cy="13" r="3.5"/><path d="M8 6l1.5-2h5L16 6"/>',
  snow: '<path d="M12 2v20M4.5 6.5l15 11M19.5 6.5l-15 11"/><path d="M9.5 3.5L12 6l2.5-2.5M9.5 20.5L12 18l2.5 2.5"/>',
  flame: '<path d="M12 22a7 7 0 0 0 7-7c0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-2 2-5 5-5 8a7 7 0 0 0 7 7z"/>',
  force: '<path d="M12 2v6M12 16v6M2 12h6M16 12h6M5 5l4 4M15 15l4 4M19 5l-4 4M9 15l-4 4"/>',
  skull: '<path d="M12 3a8 8 0 0 0-8 8c0 3 1.5 4.5 3 5.5V20h10v-3.5c1.5-1 3-2.5 3-5.5a8 8 0 0 0-8-8z"/><circle cx="9" cy="11" r="1.6"/><circle cx="15" cy="11" r="1.6"/><path d="M10 20v-2M14 20v-2"/>',
  hammer: '<path d="M13 3l6 6-2.5 2.5-6-6z"/><path d="M12.5 8.5L4 17l3 3 8.5-8.5"/>',
  dagger: '<path d="M20 3l-1 4-8 8-2-2 8-8z"/><path d="M7 11l6 6M5 17l2 2M3 21l3-3"/>',
  axe: '<path d="M14 3c3.5.5 6.5 3.5 7 7l-4.5 1L13 7.5z"/><path d="M15 9L4 20"/>',
  flask: '<path d="M9 3h6M10 3v6L5 19a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2l-5-10V3"/><path d="M7.5 15h9"/>',
  brain: '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 3 3h3V4z"/><path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-3 3h-3"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
  wave: '<path d="M2 10c2-4 4-4 6 0s4 4 6 0 4-4 6 0"/><path d="M2 16c2-4 4-4 6 0s4 4 6 0 4-4 6 0"/>',
  wand: '<path d="M4 20L15 9"/><path d="M14 8l2 2"/><path d="M18 2v3M16.5 3.5h3M21 6v2M20 7h2M19 10.5l1 1"/><path d="M15.5 4.5l.5-.5M12 5l1 1"/>',
  ring: '<circle cx="12" cy="14" r="6"/><path d="M9 6l3-3 3 3-3 2z"/>',
  amulet: '<path d="M5 3c0 5 3 8 7 9 4-1 7-4 7-9"/><path d="M12 12v1"/><path d="M12 13l3 3.5-3 4.5-3-4.5z"/>',
  cloak: '<path d="M9 3h6l1 3 4 15H4L8 6z"/><path d="M9 3c0 2 1 3 3 3s3-1 3-3"/><path d="M12 6v15"/>',
  glove: '<path d="M7 21v-6L5 11a1.5 1.5 0 0 1 2.6-1.5L9 11V5a1.5 1.5 0 0 1 3 0v5V4a1.5 1.5 0 0 1 3 0v6V5.5a1.5 1.5 0 0 1 3 0V15l-2 6z"/>',
  helmet: '<path d="M4 15a8 8 0 0 1 16 0v3H4z"/><path d="M12 7v11M4 15h6M14 15h6"/>',
  bow: '<path d="M6 3c7 2 10 7 12 14"/><path d="M6 3l12 14"/><path d="M4 21l8-8"/><path d="M4 21v-3M4 21h3"/>',
  staff: '<path d="M6 21L16 7"/><circle cx="17.5" cy="5.5" r="2.5"/><path d="M14 4l-1-1M21 9l-1-1M20 3l1-1"/>',
  orb: '<circle cx="12" cy="10" r="6.5"/><path d="M9 8a3 3 0 0 1 3-2"/><path d="M7 18h10l-1.5 3h-7z"/>',
  key: '<circle cx="7.5" cy="12" r="4"/><path d="M11.5 12H21M17 12v3M20 12v2"/>',
  map: '<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>',
  letter: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  torch: '<path d="M10 11h4l-1 10h-2z"/><path d="M12 2c2 2 3 3.5 3 5.5a3 3 0 0 1-6 0C9 6 10 5 12 2z"/>',
  bottle: '<path d="M10 2h4v4l2 3v12H8V9l2-3z"/><path d="M8 13h8"/>',
  crown: '<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/><path d="M5 19h14"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  tent: '<path d="M3 20L12 4l9 16z"/><path d="M12 4v16M9 20l3-6 3 6"/>',
  pickaxe: '<path d="M4 9c4-5 12-5 16 0"/><path d="M12 7L5 21"/>',
  lute: '<circle cx="9" cy="15" r="5"/><path d="M12.5 11.5L20 4"/><path d="M18 2l4 4"/><circle cx="9" cy="15" r="1.3"/>',
  crystal: '<path d="M12 2l5 6-5 14-5-14z"/><path d="M7 8h10M12 2v20"/>',
  claw: '<path d="M5 20c0-6 2-11 6-15"/><path d="M10 20c0-5 1.5-9 5-12"/><path d="M15 20c0-4 1-7 4-9"/>',
  web: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="6.5"/><path d="M12 2v20M2 12h20M5 5l14 14M19 5L5 19"/>',
  wind: '<path d="M3 8h11a3 3 0 1 0-3-3"/><path d="M3 12h16a3 3 0 1 1-3 3"/><path d="M3 16h7"/>',
  rock: '<path d="M3 19l3-8 5-4 6 2 4 10z"/><path d="M11 7l1 6 5-4M6 11l6 2"/>',
  leaf: '<path d="M5 19C5 9 11 4 20 4c0 9-5 15-15 15z"/><path d="M5 19l9-9"/>',
  paw: '<circle cx="7" cy="9" r="1.8"/><circle cx="11" cy="6" r="1.8"/><circle cx="15" cy="6.5" r="1.8"/><circle cx="18" cy="10" r="1.8"/><path d="M8 17a4 4 0 0 1 8-2c1.5 1 1.5 4-1 4.5-1.5.3-2.5-.5-3-.5s-1.5.8-3 .5C7 19 7 17.5 8 17z"/>',
  wings: '<path d="M12 9c-2-4-6-5-10-4 1 4 4 7 10 8"/><path d="M12 9c2-4 6-5 10-4-1 4-4 7-10 8"/><path d="M12 9v10"/>',
  portal: '<ellipse cx="12" cy="12" rx="6" ry="9"/><ellipse cx="12" cy="12" rx="3" ry="5.5"/>',
  chain: '<rect x="2" y="8" width="10" height="8" rx="4"/><rect x="12" y="8" width="10" height="8" rx="4"/>',
  bomb: '<circle cx="11" cy="14" r="7"/><path d="M15 8l2-2M17 6c1-2 3-2 4-3"/>',
  pistol: '<path d="M3 8h17v4H11l-1 3H7l-1 6H3l1-6z"/><path d="M9 12l.5 2"/>',
  goggles: '<circle cx="7" cy="13" r="4"/><circle cx="17" cy="13" r="4"/><path d="M11 13h2M3 13H2M22 13h-1M4 10l2-3h12l2 3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  anchor: '<circle cx="12" cy="5" r="2"/><path d="M12 7v14M8 11h8"/><path d="M4 14c0 4 4 7 8 7s8-3 8-7"/>',
  music: '<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  sword: '<path d="M20 3l-1 4L8 18l-2-2L17 5z"/><path d="M5 13l6 6M4 20l2.5-2.5"/>',
  armor: '<path d="M8 3l4 2 4-2 4 3-2 4v10H6V10L4 6z"/><path d="M12 5v15M8 13h8"/>',
  gem: '<path d="M6 3h12l3 6-9 12L3 9z"/><path d="M3 9h18M9 3l3 6 3-6M12 9v12"/>',
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>',
  potion: '<path d="M10 3h4M10.5 3v4.5a6.5 6.5 0 1 0 3 0V3"/><path d="M6 14h12"/>',
  arrow: '<path d="M4 20L18 6"/><path d="M13 5h6v6"/><path d="M4 15v5h5"/>',
  coin: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/>',
  pouch: '<path d="M8 6h8l-1.5 3c3 1.5 4.5 4 4.5 7a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4c0-3 1.5-5.5 4.5-7z"/><path d="M9 6L8 3h8l-1 3"/>',
  horns: '<path d="M6 3c-2 3-1.5 7 3 8.5M18 3c2 3 1.5 7-3 8.5"/><circle cx="12" cy="15.5" r="5"/>',
  sigil: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/><circle cx="12" cy="12" r="4"/>',
  gear: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9L7 7M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"/>',
  people: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.5-5.5 6.5-5.5s5.7 2 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5c2 .7 3.2 2.5 3.5 5.5"/>',
  flag: '<path d="M5 21V4M5 4h12l-2.5 4L17 12H5"/>',
  cloud: '<path d="M7 18a5 5 0 0 1-.5-10A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9z"/>',
  cloudOff: '<path d="M7 18a5 5 0 0 1-.5-10A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9z"/><path d="M3 3l18 18"/>',
  hourglass: '<path d="M6 3h12M6 21h12M7 3v2a5 5 0 0 0 5 5 5 5 0 0 1 5 5v6M17 3v2a5 5 0 0 1-5 5 5 5 0 0 0-5 5v6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  hand: '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12M11 11V4a1.5 1.5 0 0 1 3 0v7M14 11V5.5a1.5 1.5 0 0 1 3 0V13c0 4-2.5 8-6.5 8S5 18 4 15l-1-3a1.5 1.5 0 0 1 2.7-1.2L8 14"/>',
  mask: '<path d="M3 6c3-1.5 6-1.5 9 0 3-1.5 6-1.5 9 0v5c0 5-4 8-9 9-5-1-9-4-9-9z"/><path d="M7 11c1-.8 2-.8 3 0M14 11c1-.8 2-.8 3 0M9 16c2 1 4 1 6 0"/>',
  monocle: '<circle cx="10" cy="10" r="6"/><circle cx="10" cy="10" r="3" opacity=".6"/><path d="M14.5 14.5L20 21"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  battery: '<rect x="4" y="7" width="14" height="10" rx="2"/><path d="M18 10h2v4h-2M9 9l-2 3h4l-2 3"/>',
  mug: '<path d="M5 8h11v9a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z"/><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8 3c0 1.5 1 1.5 1 3M12 3c0 1.5 1 1.5 1 3"/>',
  rope: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5"/><path d="M20 12c0 4-2 7-6 9"/>',
  lantern: '<path d="M9 5h6M12 2v3M8 8h8l1 9H7z"/><path d="M7 17h10v3H7z"/><path d="M12 10.5c1 1 1 2.5 0 3.5-1-1-1-2.5 0-3.5z"/>',
  bread: '<path d="M4 12a8 5 0 0 1 16 0v6H4z"/><path d="M9 9l1 3M13 8.5l1 3"/>',
  notebook: '<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M9 3v18M12 8h4M12 12h4"/>',
  medkit: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V4h6v3M12 10.5v6M9 13.5h6"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18.5h2"/>',
  tablet: '<rect x="4.5" y="2.5" width="15" height="19" rx="2"/><path d="M11 18.5h2"/>',
  monitor: '<rect x="2.5" y="4" width="19" height="12.5" rx="1.5"/><path d="M8.5 20.5h7M12 16.5v4"/>',
  signature: '<path d="M3 17c2.5-6 5-9 6.5-9 2 0-1.5 9 .5 9 1.5 0 2.5-4 4-4 1.2 0 .8 3 2 3 .8 0 1.6-1 2.5-1.8"/><path d="M3 21h18"/>'
};

export const ICON_NAMES = Object.keys(P).filter(k => !/^(back|next|down|dots|plus|minus|close|edit|trash|check|history|download|upload|archive|copy|link|camera|cloud|cloudOff|menu|search|phone|tablet|monitor|signature|info|range|area|timer|\d+)$/.test(k));

export function icon(name, cls = "") {
  const body = P[name] || P.sparkle;
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

const DIE_SHAPES = {
  4: { poly: "20,4 37,34 3,34", lines: "", ty: 28 },
  6: { poly: "6,6 34,6 34,34 6,34", lines: "M6 6l5 5h18l5-5M11 11v18l-5 5M29 11v18l5 5M11 29h18", ty: 25 },
  8: { poly: "20,3 36,20 20,37 4,20", lines: "M4 20h32", ty: 18 },
  10: { poly: "20,3 36,17 20,37 4,17", lines: "M4 17l16 6 16-6M20 23v14", ty: 19 },
  12: { poly: "20,3 37,15 31,35 9,35 3,15", lines: "M20 9l9 6-3 11H14l-3-11z", ty: 23 },
  20: { poly: "20,2 36,11 36,29 20,38 4,29 4,11", lines: "M20 9l10 17H10zM20 2v7M4 11l6 15M36 11l-6 15M10 26l10 12 10-12", ty: 23 }
};

export function die(faces, color = "#cbbfa8", label) {
  const f = DIE_SHAPES[faces] ? faces : 20;
  const s = DIE_SHAPES[f];
  const text = label ?? f;
  return `<svg class="die" viewBox="0 0 40 40" aria-hidden="true"><defs><linearGradient id="dg${f}${color.slice(1)}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".95"/><stop offset="1" stop-color="${color}" stop-opacity=".45"/></linearGradient></defs><polygon points="${s.poly}" fill="url(#dg${f}${color.slice(1)})" stroke="rgba(255,255,255,.55)" stroke-width="1.2" stroke-linejoin="round"/>${s.lines ? `<path d="${s.lines}" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="1"/>` : ""}<text x="20" y="${s.ty}" text-anchor="middle" dominant-baseline="middle" font-size="11" font-weight="700" fill="rgba(20,14,10,.85)">${text}</text></svg>`;
}

export function actionMark(shape, color) {
  if (shape === "triangle") return `<svg class="am" viewBox="0 0 12 12"><polygon points="6,1 11,11 1,11" fill="${color}"/></svg>`;
  if (shape === "diamond") return `<svg class="am" viewBox="0 0 12 12"><polygon points="6,0.5 11.5,6 6,11.5 0.5,6" fill="${color}"/></svg>`;
  if (shape === "ring") return `<svg class="am" viewBox="0 0 12 12"><circle cx="6" cy="6" r="4" fill="none" stroke="${color}" stroke-width="1.6"/></svg>`;
  if (shape === "clock") return `<svg class="am" viewBox="0 0 12 12"><circle cx="6" cy="6" r="4.6" fill="none" stroke="${color}" stroke-width="1.4"/><path d="M6 3.5V6l1.8 1.2" stroke="${color}" stroke-width="1.3" fill="none"/></svg>`;
  return `<svg class="am" viewBox="0 0 12 12"><circle cx="6" cy="6" r="5" fill="${color}"/></svg>`;
}

export function slotMark(color = "#8fd6ff") {
  return `<svg class="am" viewBox="0 0 12 12"><rect x="2" y="2" width="8" height="8" rx="1.5" transform="rotate(45 6 6)" fill="${color}"/></svg>`;
}

export const PORTRAIT_PLACEHOLDER = `<svg class="ph" viewBox="0 0 100 120" aria-hidden="true"><defs><radialGradient id="phg" cx=".5" cy=".35" r=".7"><stop offset="0" stop-color="#3a2d22"/><stop offset="1" stop-color="#140f0b"/></radialGradient></defs><rect width="100" height="120" fill="url(#phg)"/><path d="M30 26c-6 8-5 18 6 22M70 26c6 8 5 18-6 22" fill="none" stroke="#7a6243" stroke-width="3" stroke-linecap="round"/><circle cx="50" cy="52" r="17" fill="#2a2018" stroke="#7a6243" stroke-width="2"/><path d="M18 118c3-24 16-36 32-36s29 12 32 36" fill="#2a2018" stroke="#7a6243" stroke-width="2"/></svg>`;
