// Hand-drawn 16x16 pixel-style icons, kept as SVG strings so the same
// picture can be used as an <img> and as a CSS mask (for the selection tint).

const svg = (body: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">${body}</svg>`,
  )}`;

export const icons = {
  showcase: svg(
    '<rect x="1" y="1" width="14" height="14" fill="#000"/>' +
      '<rect x="2" y="2" width="12" height="2" fill="#000e94"/>' +
      '<rect x="12" y="2" width="1" height="1" fill="#fff"/>' +
      '<rect x="2" y="4" width="12" height="10" fill="#fff"/>' +
      '<rect x="5" y="6" width="6" height="2" fill="#000"/>' +
      '<rect x="7" y="8" width="2" height="5" fill="#000"/>',
  ),
  oregon: svg(
    '<path d="M3 3h9v1h1v5H2V4h1z" fill="#000"/>' +
      '<path d="M4 4h7v1h1v3H3V5h1z" fill="#f4f0e0"/>' +
      '<rect x="5" y="4" width="1" height="4" fill="#9a9480"/>' +
      '<rect x="8" y="4" width="1" height="4" fill="#9a9480"/>' +
      '<rect x="1" y="9" width="14" height="2" fill="#7a2e12"/>' +
      '<rect x="2" y="11" width="4" height="4" fill="#000"/><rect x="3" y="12" width="2" height="2" fill="#d8d8d8"/>' +
      '<rect x="10" y="11" width="4" height="4" fill="#000"/><rect x="11" y="12" width="2" height="2" fill="#d8d8d8"/>',
  ),
  doom: svg(
    '<rect x="1" y="2" width="14" height="12" fill="#1c1c1c"/>' +
      '<rect x="2" y="3" width="12" height="10" fill="#3a3a3a"/>' +
      '<rect x="5" y="4" width="6" height="7" fill="#0b6b2a"/>' +
      '<rect x="6" y="5" width="4" height="5" fill="#29c45a"/>' +
      '<rect x="7" y="6" width="2" height="2" fill="#000"/>' +
      '<rect x="3" y="11" width="1" height="1" fill="#e01010"/>' +
      '<rect x="12" y="11" width="1" height="1" fill="#e01010"/>',
  ),
  scrabble: svg(
    '<path d="M3 1h7l3 3v11H3z" fill="#000"/>' +
      '<path d="M4 2h5v3h3v9H4z" fill="#fff"/>' +
      '<path d="M7 6h2v1h1v2h1v4h-2v-2H7v2H5V9h1V7h1zm0 3v1h2V9z" fill="#d40000"/>',
  ),
  fiveletters: svg(
    '<rect x="1" y="1" width="14" height="14" fill="#000"/>' +
      '<rect x="2" y="2" width="12" height="12" fill="#85ec8c"/>' +
      '<rect x="2" y="2" width="12" height="1" fill="#d4ffd6"/>' +
      '<path d="M4 4h2v5l1-2h2l1 2V4h2v8h-2l-2-3-2 3H4z" fill="#000"/>',
  ),
  credits: svg(
    '<path d="M3 1h10v14H3z" fill="#000"/>' +
      '<path d="M4 2h8v12H4z" fill="#fff"/>' +
      '<rect x="6" y="3" width="4" height="1" fill="#000"/>' +
      '<rect x="5" y="5" width="3" height="1" fill="#000"/><rect x="9" y="5" width="2" height="1" fill="#000"/>' +
      '<rect x="5" y="7" width="2" height="1" fill="#000"/><rect x="8" y="7" width="3" height="1" fill="#000"/>' +
      '<rect x="5" y="9" width="3" height="1" fill="#000"/><rect x="9" y="9" width="2" height="1" fill="#000"/>' +
      '<rect x="5" y="11" width="2" height="1" fill="#000"/><rect x="8" y="11" width="3" height="1" fill="#000"/>',
  ),
  aboutsite: svg(
    // blueprint sheet: a flow of three boxes joined by arrows
    '<rect x="2" y="1" width="12" height="14" fill="#000"/><rect x="3" y="2" width="10" height="12" fill="#2f6fd6"/>' +
      '<rect x="5" y="3" width="6" height="2" fill="#fff"/><rect x="7" y="5" width="2" height="1" fill="#fff"/>' +
      '<rect x="5" y="6" width="6" height="2" fill="#fff"/><rect x="7" y="8" width="2" height="1" fill="#fff"/>' +
      '<rect x="5" y="9" width="6" height="2" fill="#fff"/><rect x="4" y="12" width="8" height="1" fill="#bcd4f6"/>',
  ),
  resume: svg(
    // pixel printer: paper sheet on top, grey body with a slot and a green light
    '<rect x="4" y="1" width="8" height="6" fill="#000"/><rect x="5" y="2" width="6" height="5" fill="#fff"/>' +
      '<rect x="6" y="3" width="4" height="1" fill="#000e94"/><rect x="6" y="5" width="3" height="1" fill="#000"/>' +
      '<rect x="1" y="7" width="14" height="6" fill="#000"/><rect x="2" y="8" width="12" height="4" fill="#bbbfc3"/>' +
      '<rect x="2" y="8" width="12" height="1" fill="#fff"/><rect x="3" y="10" width="7" height="1" fill="#000"/>' +
      '<rect x="12" y="10" width="1" height="1" fill="#1fae3a"/>' +
      '<rect x="3" y="13" width="10" height="2" fill="#000"/><rect x="4" y="13" width="8" height="1" fill="#fff"/>',
  ),
  startFlag: svg(
    '<rect x="1" y="2" width="6" height="5" fill="#e8291c"/>' +
      '<rect x="8" y="2" width="6" height="5" fill="#1fae3a"/>' +
      '<rect x="1" y="8" width="6" height="5" fill="#1b4fd6"/>' +
      '<rect x="8" y="8" width="6" height="5" fill="#f3c419"/>' +
      '<rect x="7" y="2" width="1" height="11" fill="#000"/><rect x="1" y="7" width="13" height="1" fill="#000"/>',
  ),
  speaker: svg(
    '<path d="M2 6h3l4-4v12l-4-4H2z" fill="#000"/>' +
      '<path d="M3 7h2l3-3v8l-3-3H3z" fill="#f3d81c"/>' +
      '<rect x="11" y="5" width="1" height="6" fill="#000"/><rect x="13" y="3" width="1" height="10" fill="#000"/>',
  ),
  computer: svg(
    '<rect x="2" y="1" width="12" height="9" fill="#000"/>' +
      '<rect x="3" y="2" width="10" height="7" fill="#bbbfc3"/>' +
      '<rect x="4" y="3" width="8" height="5" fill="#008080"/>' +
      '<rect x="6" y="10" width="4" height="1" fill="#000"/>' +
      '<rect x="1" y="11" width="14" height="4" fill="#000"/>' +
      '<rect x="2" y="12" width="12" height="2" fill="#bbbfc3"/>' +
      '<rect x="10" y="12" width="3" height="1" fill="#1fae3a"/>',
  ),
};

export type IconName = keyof typeof icons;
