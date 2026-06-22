// ---------------------------------------------------------------------------
// worldSvg.ts — turns a computed World (world.ts) into original, hand-authored
// SVG: extruded hex tiles, status-coloured story trees, garden-flora
// capabilities, dashed dependency roads, human-witness signposts, fresh-verdict
// blooms, and live-session wisps. Pure string building, build-time only.
// Colour lives in CSS (classes only here) so the legend can recolour / filter.
// ---------------------------------------------------------------------------

import type { World, Territory } from './world';

const f = (x: number): string => x.toFixed(1);
const esc = (s: unknown): string =>
  String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function h(s: string): number {
  let n = 2166136261;
  for (let i = 0; i < s.length; i++) { n ^= s.charCodeAt(i); n = Math.imul(n, 16777619); }
  return n >>> 0;
}
const r01 = (seed: number): number => {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// ---------- the central story tree ----------

function tree(t: Territory): string {
  if (t.withered) return witheredTree(t);
  if (t.sapling) return saplingTree();
  const R = t.crownR * (t.young ? 0.66 : 1);
  const cy = -1.62 * R;
  const jb = (i: number, bx: number, by: number, br: number) => {
    const k = h(`${t.id}:c${i}`);
    return { x: bx + (r01(k) - 0.5) * 0.12 * R, y: by + (r01(k + 1) - 0.5) * 0.1 * R, r: br * (0.93 + r01(k + 2) * 0.13) };
  };
  const lo = [
    { x: 0, y: cy, r: R },
    jb(1, -0.6 * R, cy + 0.3 * R, 0.6 * R),
    jb(2, 0.6 * R, cy + 0.3 * R, 0.6 * R),
    jb(3, -0.4 * R, cy - 0.5 * R, 0.52 * R),
    jb(4, 0.42 * R, cy - 0.48 * R, 0.54 * R),
  ];
  const hi = [jb(5, -0.16 * R, cy - 0.3 * R, 0.56 * R), jb(6, 0.3 * R, cy - 0.5 * R, 0.34 * R), jb(7, -0.5 * R, cy - 0.04 * R, 0.34 * R)];
  const trunk = `M -3.4 0 C -3 ${f(0.3 * cy)} -2.2 ${f(0.65 * cy)} -2 ${f(cy)} L 2 ${f(cy)} C 2.2 ${f(0.65 * cy)} 3 ${f(0.3 * cy)} 3.4 0 Q 0 2.2 -3.4 0 Z`;
  return (
    `<ellipse class="sh" cx="2" cy="2" rx="${f(R * 0.78)}" ry="${f(R * 0.2)}"/>` +
    `<path class="trunk" d="${trunk}"/>` +
    `<g class="lo">${lo.map((b) => `<circle cx="${f(b.x)}" cy="${f(b.y)}" r="${f(b.r)}"/>`).join('')}</g>` +
    `<g class="hi">${hi.map((b) => `<circle cx="${f(b.x)}" cy="${f(b.y)}" r="${f(b.r)}"/>`).join('')}</g>`
  );
}

function saplingTree(): string {
  return (
    `<ellipse class="sh" cx="2" cy="2" rx="9" ry="2.8"/>` +
    `<rect class="trunk" x="-1.6" y="-12" width="3.2" height="13" rx="1.4"/>` +
    `<g class="lo"><circle cx="0" cy="-17" r="8.5"/><circle cx="-4.5" cy="-14.5" r="5"/><circle cx="4.5" cy="-14.5" r="5"/></g>` +
    `<g class="hi"><circle cx="-1.5" cy="-18.5" r="4.6"/></g>`
  );
}

function witheredTree(t: Territory): string {
  const R = t.crownR;
  const cy = -1.62 * R;
  // A bare dead-tree skeleton — no leaves at all (a wasteland tree is dead, not red).
  const branches = [
    `M 0 ${f(cy + 0.1 * R)} C 1 ${f(cy - 0.4 * R)} 1 ${f(cy - 0.75 * R)} ${f(0.18 * R)} ${f(cy - 1.08 * R)}`,
    `M -0.5 ${f(cy)} C -5 ${f(cy - 0.3 * R)} -7 ${f(cy - 0.55 * R)} ${f(-0.5 * R)} ${f(cy - 0.86 * R)}`,
    `M 0.6 ${f(cy)} C 5 ${f(cy - 0.32 * R)} 7 ${f(cy - 0.58 * R)} ${f(0.52 * R)} ${f(cy - 0.8 * R)}`,
    `M ${f(-0.28 * R)} ${f(cy - 0.5 * R)} L ${f(-0.46 * R)} ${f(cy - 0.66 * R)}`,
    `M ${f(0.26 * R)} ${f(cy - 0.54 * R)} L ${f(0.46 * R)} ${f(cy - 0.7 * R)}`,
    `M ${f(0.04 * R)} ${f(cy - 0.78 * R)} L ${f(-0.12 * R)} ${f(cy - 0.96 * R)}`,
  ];
  const trunk = `M -3.4 0 C -3 ${f(0.3 * cy)} -2.2 ${f(0.65 * cy)} -2 ${f(cy)} L 2 ${f(cy)} C 2.2 ${f(0.65 * cy)} 3 ${f(0.3 * cy)} 3.4 0 Q 0 2.2 -3.4 0 Z`;
  return (
    `<ellipse class="sh" cx="2" cy="2" rx="${f(R * 0.55)}" ry="${f(R * 0.15)}"/>` +
    `<path class="trunk" d="${trunk}"/>` +
    `<g class="bare">${branches.map((d) => `<path d="${d}"/>`).join('')}</g>` +
    [-11, -4, 5, 12].map((lx, i) => `<circle class="litter" cx="${lx}" cy="${[-2, 1, -1, -3][i]}" r="1.1"/>`).join('')
  );
}

// ---------- a capability as garden flora ----------

function flora(c: { id: string; title: string; status: string; x: number; y: number; variant: number; bloom: boolean }): string {
  const dead = c.status === 'unhealthy';
  let body: string;
  if (dead) {
    body =
      `<ellipse class="bed" cx="0" cy="0.4" rx="8" ry="2.6" opacity="0.65"/>` +
      `<path class="dead" d="M 0.4 0 C 0.5 -6 0.3 -10 2.5 -11.3 C 4.3 -12.3 5.6 -10.7 5.5 -9.1"/>` +
      `<circle class="dead-head accent" cx="5.5" cy="-8.1" r="1.6"/>` +
      `<path class="dead" d="M -3.4 0 C -3.9 -5 -4.3 -8.4 -2.4 -9.9"/>` +
      `<circle class="litter" cx="-6.5" cy="-0.4" r="1"/><circle class="litter" cx="2.4" cy="1.1" r="1"/>`;
  } else if (c.variant === 0) {
    body =
      `<ellipse class="bed" cx="0" cy="0.4" rx="8.5" ry="3"/>` +
      `<path class="dark" d="M -1 0 Q -7 -3 -9 -7 Q -4.5 -5.5 -1 0 Z"/>` +
      `<path class="dark" d="M 1.5 0 Q 7.5 -2.5 9 -6 Q 5 -5 1.5 0 Z"/>` +
      `<path class="stem" d="M -4 0 C -4.4 -4 -4.8 -7 -5.2 -10"/><path class="stem" d="M 0 0 C 0.2 -5 0.3 -9 0.2 -13"/><path class="stem" d="M 4 0 C 4.5 -4 5 -6.5 5.6 -9"/>` +
      `<circle class="light" cx="-5.2" cy="-10" r="2.6"/><circle class="light" cx="5.6" cy="-9" r="2.3"/>` +
      [0, 1, 2, 3, 4].map((k) => { const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5; return `<circle class="light" cx="${f(0.2 + Math.cos(a) * 2.3)}" cy="${f(-13 + Math.sin(a) * 2.3)}" r="1.5"/>`; }).join('') +
      `<circle class="core" cx="0.2" cy="-13" r="1.3"/>`;
  } else if (c.variant === 1) {
    body =
      `<polygon class="dark" points="0,-12.5 5.5,-10.5 8.5,-5.5 7,-1 0,0.8 -7,-1 -8.5,-5.5 -5.5,-10.5"/>` +
      `<polygon class="light" points="-1,-12.5 4.5,-10.8 6,-7 0.5,-5.6 -4.8,-7.4 -4.6,-10.6"/>` +
      `<circle class="core" cx="-3.5" cy="-4.5" r="1.5"/><circle class="core" cx="2" cy="-7.5" r="1.5"/><circle class="core" cx="4.5" cy="-3.5" r="1.4"/>`;
  } else {
    body =
      `<path class="sap-trunk" d="M -1.2 0 C -1 -4 -0.8 -7 -0.6 -9.5 L 0.9 -9.5 C 1 -7 1.2 -4 1.4 0 Z"/>` +
      `<polygon class="dark" points="0,-18.5 5.4,-15.4 6.6,-10.2 3.4,-7.2 -3.4,-7.2 -6.6,-10.2 -5.4,-15.4"/>` +
      `<polygon class="light" points="-0.6,-18.3 3.8,-15.8 3.4,-12 -1.6,-11.4 -4.4,-14.2"/>`;
  }
  const bloom = c.bloom ? bloomMark(0, -5, 8) : '';
  return (
    `<g class="tw-flora st-${c.status}" transform="translate(${f(c.x)} ${f(c.y)})">` +
    `<title>${esc(c.title)} — ${esc(c.status === 'unhealthy' ? 'failing' : c.status)}</title>` +
    `<ellipse class="sh" cx="1" cy="1" rx="${dead ? 6 : 8}" ry="${dead ? 2.2 : 2.6}"/>${body}${bloom}</g>`
  );
}

// ---------- decorations / marks ----------

function conifer(x: number, y: number, ht: number, seed: number): string {
  const lean = (r01(seed) - 0.5) * 2;
  const w = ht * 0.42;
  return (
    `<g class="tw-conifer c-${seed % 3}" transform="translate(${f(x)} ${f(y)})">` +
    `<ellipse class="sh" cx="1" cy="1" rx="${f(w * 0.9)}" ry="2.2"/>` +
    `<path class="body" d="M ${f(lean)} ${f(-ht)} L ${f(w)} 0 L ${f(-w)} 0 Z"/>` +
    `<path class="snow" d="M ${f(lean)} ${f(-ht)} L ${f(lean + w * 0.45)} ${f(-ht * 0.45)} L ${f(lean - w * 0.45)} ${f(-ht * 0.45)} Z"/></g>`
  );
}

function signpost(t: Territory, tx: number, ty: number): string {
  const x = t.crownR * 0.7 + 9;
  const cls = t.sealFilled ? 'seal-filled' : 'seal-blank';
  const check = t.sealFilled ? `<path class="tick" d="M -3.2 -18 l 2.4 2.4 l 4.4 -5.2"/>` : '';
  return (
    `<g class="tw-sign ${cls}" transform="translate(${f(tx + x)} ${f(ty)})">` +
    `<title>${t.sealFilled ? 'signed off by a person' : 'awaiting a person’s sign-off'}</title>` +
    `<ellipse class="sh" cx="0.6" cy="0.8" rx="4" ry="1.6"/>` +
    `<rect class="post" x="-1.3" y="-15" width="2.6" height="15" rx="1.1"/>` +
    `<circle class="head" cx="0" cy="-18" r="6.5"/>${check}</g>`
  );
}

function bloomMark(cx: number, cy: number, rad: number): string {
  const sparks = [0, 1, 2, 3].map((i) => {
    const a = r01(h(`bloom${i}${cx}${cy}`)) * Math.PI * 2;
    const rr = rad * (0.78 + r01(h(`bs${i}${cx}`)) * 0.4);
    return `<circle class="spark" cx="${f(Math.cos(a) * rr)}" cy="${f(Math.sin(a) * rr * 0.7)}" r="${f(0.9 + r01(h(`bz${i}`)) * 0.6)}"/>`;
  }).join('');
  // The animated element (.tw-bloom) carries NO transform attribute — the
  // positioning translate sits on an outer wrapper, so the CSS pulse can't
  // clobber it.
  return `<g transform="translate(${f(cx)} ${f(cy)})"><g class="tw-bloom"><circle class="ring" r="${f(rad)}"/>${sparks}</g></g>`;
}

// ---------- a whole territory's flora layer ----------

function territoryGroup(t: Territory): string {
  // Everything is drawn in ABSOLUTE world coordinates (no group transform on
  // .tw-terr itself, so the client can add focus classes without clobbering a
  // transform). Decor, flora and the central tree are y-sorted so southern
  // (lower) art overlaps northern art correctly.
  const tx = t.treeX, ty = t.treeY;
  const R = t.crownR * (t.young ? 0.66 : 1);
  const items: { y: number; s: string }[] = [];
  for (const d of t.decor) {
    const cnt = 2 + (d.seed % 2);
    for (let i = 0; i < cnt; i++) {
      const a = r01(d.seed + i * 7) * Math.PI * 2;
      const rr = r01(d.seed + i * 13) * 14;
      const x = d.x + Math.cos(a) * rr;
      const y = d.y + Math.sin(a) * rr * 0.8 + 4;
      items.push({ y, s: conifer(x, y, 7 + r01(d.seed + i) * 4, d.seed + i) });
    }
  }
  for (const c of t.caps) items.push({ y: c.y, s: flora(c) });
  // Crown: positioning translate on the outer <g>, the swaying .tw-crown nested
  // inside so its CSS rotate can't clobber the translate.
  items.push({
    y: ty,
    s: `<g transform="translate(${f(tx)} ${f(ty)})"><g class="tw-crown" style="--sway:${(6 + (h(t.id) % 30) / 10).toFixed(1)}s;--d:${((h(t.id) % 40) / 10).toFixed(1)}s">${tree(t)}</g></g>`,
  });
  if (t.bloom && !t.sapling) {
    items.push({ y: ty + 0.2, s: `<g transform="translate(${f(tx)} ${f(ty)})">${bloomMark(0, -1.62 * R, R * 1.15)}</g>` });
  }
  if (t.witness === 'human') items.push({ y: ty + 0.3, s: signpost(t, tx, ty) });
  items.sort((a, b) => a.y - b.y);

  // session wisps: glowing markers at hashed angles around the island centre
  const wisps = t.wisps.map((w, i) => {
    const a = (r01(h(`${t.id}:${w.id}`)) * 2 - 1) * 1.2 - Math.PI / 2;
    const rr = t.radius * 0.66 + 9;
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr * 0.6 - 6;
    return `<g class="tw-wisp band-${w.band}" style="--d:${(i * 0.6).toFixed(1)}s" transform="translate(${f(t.cx + x)} ${f(t.cy + y)})"><title>${esc(w.id)} — ${esc(w.workingOn)}</title><circle class="glow" r="6.5"/><circle class="dot" r="2.7"/></g>`;
  }).join('');

  const sub = t.vis === 'healthy' ? `${t.capCount} caps · proven` : t.vis === 'unhealthy' ? `${t.capCount} caps · failing` : `${t.vis} · ${t.capCount} caps`;
  const plate =
    `<g class="tw-plate" transform="translate(${f(t.cx - t.plateW / 2)} ${f(t.labelY)})">` +
    `<rect class="bg" width="${f(t.plateW)}" height="30" rx="7"/>` +
    `<text class="ttl" x="${f(t.plateW / 2)}" y="13" text-anchor="middle">${esc(t.title)}</text>` +
    `<text class="sub" x="${f(t.plateW / 2)}" y="25" text-anchor="middle">${esc(sub)}</text></g>`;

  return (
    `<g class="tw-terr st-${t.vis}" data-id="${esc(t.id)}">` +
    items.map((it) => it.s).join('') + plate + wisps +
    `</g>`
  );
}

// ---------- the whole scene ----------

export function renderWorld(w: World): string {
  const polyD = (pts: { x: number; y: number }[]): string =>
    pts.length ? pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${f(p.x)} ${f(p.y)}`).join(' ') + ' Z' : '';

  // smoothed organic shore under each island (so it reads as one landmass)
  const coast = w.territories.map((t) =>
    t.coastPaths.length
      ? `<g class="tw-isle st-${t.vis}" data-id="${esc(t.id)}">` +
        t.coastPaths.map((d) => `<path class="tw-shore" d="${d}"/>`).join('') + `</g>`
      : '',
  ).join('');

  // relaxed Townscaper land cells, grouped per territory (status drives the palette)
  const land = w.territories.map((t, owner) => {
    const cells = w.relaxedCells.filter((c) => c.owner === owner);
    if (!cells.length) return '';
    return `<g class="tw-ground st-${t.vis}" data-id="${esc(t.id)}">` +
      cells.map((c) => `<path class="tw-cell ${c.wheat ? 'wheat' : 'v' + c.variant}" d="${polyD(c.poly)}"/>`).join('') +
      `</g>`;
  }).join('');

  const roads = w.roads.map((e) =>
    `<g class="tw-road" data-from="${esc(e.from)}" data-to="${esc(e.to)}">` +
    `<path class="bed" d="${e.d}"/><path class="line" d="${e.d}" marker-end="url(#tw-arrow)"/></g>`,
  ).join('');

  const flora = w.drawOrder.map((i) => territoryGroup(w.territories[i])).join('');

  const hits = w.territories.map((t) => {
    const top = t.treeY - (2.7 * t.crownR + 16);
    const hgt = t.labelY + 30 - top;
    const sw = t.vis === 'healthy' ? 'proven' : t.vis === 'unhealthy' ? 'needs attention' : t.vis;
    return `<rect class="tw-hit" x="${f(t.cx - t.radius)}" y="${f(top)}" width="${f(t.radius * 2)}" height="${f(hgt)}" rx="14" tabindex="0" role="button" data-id="${esc(t.id)}" aria-label="${esc(t.title)} — ${esc(sw)}. ${esc(t.outcome)}"/>`;
  }).join('');

  return (
    `<svg class="tw-svg" viewBox="0 0 ${w.width} ${w.height}" role="group" aria-roledescription="interactive map" aria-label="A map of a fictional software system, drawn as a world of trees where each tree is a story and its colour shows its health. The stories below are focusable.">` +
    `<defs>` +
    `<radialGradient id="tw-board" cx="50%" cy="40%" r="80%"><stop offset="0" stop-color="#fbf3ea"/><stop offset="1" stop-color="#edd9c9"/></radialGradient>` +
    `<filter id="tw-soft" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="5" stdDeviation="6" flood-color="#5a3f1f" flood-opacity="0.10"/></filter>` +
    `<marker id="tw-arrow" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 1.4 L 8 5 L 0 8.6 z"/></marker>` +
    `</defs>` +
    `<rect class="tw-bg" x="0" y="0" width="${w.width}" height="${w.height}"/>` +
    `<g transform="translate(${f(w.ox)} ${f(w.oy)})">` +
    `<g class="tw-coast-layer">${coast}</g>` +
    `<g class="tw-land">${land}</g>` +
    `<g class="tw-roads">${roads}</g>` +
    `<g class="tw-flora-layer">${flora}</g>` +
    `<g class="tw-hits">${hits}</g>` +
    `</g></svg>`
  );
}
