// =====================================================================
//  CONTAGIUM — cenários em camadas (parallax), cada um ligado a uma raça
//  Cemitério (zumbi) · Floresta da lua cheia (lobisomem) · Castelo carmesim (vampiro) · Catedral (humanos e bruxos)
//  Tudo é desenhado em "pixels grandes" (escalaPixel) para combinar com o pacote 16px.
// =====================================================================
(() => {
'use strict';
const C = window.CONFIG;
const TW = 2400;                 // largura de cada "faixa" de cenário (se repete na horizontal)
const P = () => C.cenario.escalaPixel || 3;

const INFO = {
  cemiterio: { nome: 'Cemitério dos Esquecidos', emoji: '🧟' },
  floresta: { nome: 'Floresta da Lua Cheia', emoji: '🐺' },
  castelo: { nome: 'Castelo Carmesim', emoji: '🧛' },
  igreja: { nome: 'Catedral da Última Luz', emoji: '🧙' },
};

// ---------------------------------------------------------------- utilidades
function aleatorio(semente) {
  let a = semente >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const r = (c, x, y, w, h, cor) => { c.fillStyle = cor; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
// desenha algo que pode "vazar" pela borda da faixa nos dois lados (para a repetição ficar contínua)
function laco(lw, x, larg, f) { f(x); if (x + larg > lw) f(x - lw); if (x < 0) f(x + lw); }

function circulo(c, cx, cy, raio, cor) {
  c.fillStyle = cor;
  for (let y = -raio; y <= raio; y++) {
    const w = Math.round(Math.sqrt(raio * raio - y * y));
    c.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1);
  }
}
function lua(c, cx, cy, raio, cor, sombra, halo) {
  c.globalAlpha = 0.18; circulo(c, cx, cy, raio + 6, halo);
  c.globalAlpha = 0.3; circulo(c, cx, cy, raio + 3, halo);
  c.globalAlpha = 1; circulo(c, cx, cy, raio, cor);
  // crateras
  const rnd = aleatorio(raio * 31);
  for (let i = 0; i < 6; i++) circulo(c, cx + (rnd() - 0.5) * raio * 1.2, cy + (rnd() - 0.5) * raio * 1.2, 1 + Math.floor(rnd() * 2), sombra);
}
function pinheiro(c, x, base, h, cor, realce) {
  r(c, x - 1, base - 3, 2, 3, '#120d14');
  for (let y = 0; y < h; y++) {
    const t = y / h, dente = (y % 7) / 7;
    const w = Math.max(1, Math.round(t * h * 0.42 * (0.7 + 0.3 * dente)));
    r(c, x - w, base - 3 - h + y, w * 2 + 1, 1, cor);
    if (realce && y % 7 > 3) r(c, x + w - 1, base - 3 - h + y, 1, 1, realce);
  }
}
function arvoreSeca(c, x, base, h, cor, rnd) {
  r(c, x, base - h, 3, h, cor);
  const galhos = 3 + Math.floor(rnd() * 3);
  for (let i = 0; i < galhos; i++) {
    const gy = base - h + 4 + Math.floor(rnd() * h * 0.5), lado = rnd() < 0.5 ? -1 : 1, len = 4 + Math.floor(rnd() * 8);
    for (let k = 0; k < len; k++) r(c, x + 1 + lado * k, gy - Math.floor(k * 0.6), 1, 1, cor);
  }
}
function chao(c, lw, lh, gy, rnd, borda, terra, pinta) {
  r(c, 0, gy, lw, lh - gy, terra);
  r(c, 0, gy, lw, 2, borda);
  for (let x = 0; x < lw; x++) if (rnd() < 0.35) r(c, x, gy - 1, 1, 1, borda);
  for (let i = 0; i < lw * (lh - gy) * 0.06; i++) r(c, Math.floor(rnd() * lw), gy + 3 + Math.floor(rnd() * (lh - gy)), 1 + Math.floor(rnd() * 2), 1, pinta);
}

// ---------------------------------------------------------------- cenas
// Cada cena: camadas (desenhadas uma vez) + "ambiente" (coisas animadas, desenhadas a cada quadro).
// vel = quanto a camada se move com a câmera (0 = parada, 1 = junto com o chão)
const CENAS = {};

CENAS.cemiterio = {
  camadas: [
    { vel: 0.04, desenhar(c, lw, lh, gy) { lua(c, 70, gy - 62, 9, '#c9d6b8', '#9fb08f', '#b8e0a0'); } },
    { vel: 0.25, desenhar(c, lw, lh, gy, rnd, pack) {
      const s = pack.silhueta; if (!s) return;
      c.globalAlpha = C.cenario.opacidadeSilhueta; c.filter = C.cenario.filtro;
      const hs = s.height - 120, esc = 0.5;
      for (let x = 0; x < lw; x += s.width * esc) c.drawImage(s, 0, 120, s.width, hs, x, gy + 3 - hs * esc, s.width * esc, hs * esc);
      c.globalAlpha = 1; c.filter = 'none';
    } },
    { vel: 1, desenhar(c, lw, lh, gy, rnd, pack) {
      c.filter = C.cenario.filtro;
      const peca = (n, x, base) => { const im = pack[n]; if (im) laco(lw, x, im.width, xx => c.drawImage(im, xx, base - im.height)); };
      const objs = [['graveStone', 6], ['gravestone2', 5], ['cruz', 4], ['cerca', 3], ['tree', 1.2], ['zombieHand', 2], ['stone3', 1.5], ['stone4', 1.5], ['stone2', 2], ['grass1', 4], ['grass2', 4], ['flower3', 2], ['shovel', 0.6]];
      const tot = objs.reduce((s, o) => s + o[1], 0);
      let x = 4;
      while (x < lw - 8) {
        let k = rnd() * tot, n = 'grass1'; for (const [nn, p] of objs) { if ((k -= p) <= 0) { n = nn; break; } }
        const base = gy + 2;
        if (n === 'cruz') { peca('gravestoneBot', x, base); peca('gravestoneTop', x, base - 10); }
        else if (n === 'cerca') { const q = 2 + Math.floor(rnd() * 3); peca('fenceL', x, base); for (let i = 1; i <= q; i++) peca('fenceM', x + i * 16, base); peca('fenceR', x + (q + 1) * 16, base); x += (q + 1) * 16; }
        else peca(n, x, base);
        x += (24 + rnd() * 30) / (C.cenario.densidade || 1);
      }
      for (let tx = 0; tx < lw; tx += 16) { if (pack.groundM1) c.drawImage(pack.groundM1, tx, gy); for (let ty = gy + 16; ty < lh; ty += 16) { const t = rnd() < 0.5 ? pack.groundM2 : pack.groundM3; if (t) c.drawImage(t, tx, ty); } }
      c.filter = 'none';
    } },
  ],
  ambiente(seed) {
    const rnd = aleatorio(seed), fogos = [];
    for (let i = 0; i < 7; i++) fogos.push({ x: rnd() * TW, y: rnd(), f: rnd() * 6, v: 4 + rnd() * 8 });
    return { fogos };
  },
  animar(ctx, a, t, cam, W, gyR, p) { // fogos-fátuos verdes flutuando
    for (const f of a.fogos) {
      const x = posTela(f.x + t * f.v, 1, cam, W), y = gyR - 20 - f.y * 50 + Math.sin(t * 1.3 + f.f) * 6;
      const brilho = 0.45 + 0.35 * Math.sin(t * 2 + f.f);
      for (const xx of x) { ctx.globalAlpha = brilho * 0.35; ctx.fillStyle = '#9bff9b'; ctx.fillRect(xx - p, y - p, p * 3, p * 3); ctx.globalAlpha = brilho; ctx.fillRect(xx, y, p, p); }
    }
    ctx.globalAlpha = 1;
  },
};

CENAS.floresta = {
  camadas: [
    { vel: 0.03, desenhar(c, lw, lh, gy) { lua(c, 120, gy - 58, 13, '#f3efd2', '#d2cba4', '#fff7c0'); } },
    { vel: 0.2, desenhar(c, lw, lh, gy, rnd) { for (let x = 0; x < lw; x += 5 + rnd() * 6) { const h = 22 + rnd() * 22; laco(lw, x, 20, xx => pinheiro(c, xx, gy + 2, h, '#221d3a')); } } },
    { vel: 0.5, desenhar(c, lw, lh, gy, rnd) { for (let x = 0; x < lw; x += 10 + rnd() * 14) { const h = 30 + rnd() * 26; laco(lw, x, 26, xx => pinheiro(c, xx, gy + 2, h, '#16122a', '#2c2950')); } } },
    { vel: 1, desenhar(c, lw, lh, gy, rnd) {
      chao(c, lw, lh, gy, rnd, '#23312c', '#15111d', '#1e1828');
      for (let x = 6; x < lw - 6; x += 18 + rnd() * 30) {
        const k = rnd();
        if (k < 0.25) { r(c, x, gy - 4, 6, 5, '#2b2030'); r(c, x, gy - 5, 6, 1, '#3b2c3e'); }                                  // toco
        else if (k < 0.45) { r(c, x, gy - 3, 2, 3, '#d9d2c3'); r(c, x - 1, gy - 4, 4, 1, '#9e2b3c'); r(c, x + 3, gy - 2, 1, 2, '#d9d2c3'); r(c, x + 2, gy - 3, 3, 1, '#9e2b3c'); } // cogumelos
        else if (k < 0.6) { r(c, x, gy - 2, 5, 2, '#3a3448'); r(c, x + 1, gy - 3, 3, 1, '#4a4358'); }                          // pedra
        else if (k < 0.72) { r(c, x, gy - 1, 7, 1, '#cfc8b6'); r(c, x + 1, gy - 2, 1, 1, '#cfc8b6'); r(c, x + 5, gy - 2, 1, 1, '#cfc8b6'); } // ossos
        else if (k < 0.82) { arvoreSeca(c, x, gy, 18 + rnd() * 10, '#1f1726', rnd); for (let i = 0; i < 3; i++) r(c, x + i, gy - 9 - i * 2, 1, 4, '#5b1a24'); } // árvore com marcas de garra
        else { for (let i = 0; i < 4; i++) r(c, x + i * 2, gy - 1 - (i % 2) * 2, 1, 2 + (i % 2) * 2, '#2e4a3c'); }            // samambaia
      }
    } },
  ],
  ambiente(seed) {
    const rnd = aleatorio(seed), vagalumes = [], nuvens = [];
    for (let i = 0; i < 16; i++) vagalumes.push({ x: rnd() * TW, y: rnd(), f: rnd() * 6 });
    for (let i = 0; i < 2; i++) nuvens.push({ x: rnd() * TW, y: rnd() * 10, w: 30 + rnd() * 20 });
    return { vagalumes, nuvens };
  },
  animar(ctx, a, t, cam, W, gyR, p) {
    for (const n of a.nuvens) for (const xx of posTela(n.x + t * 6, 0.03, cam, W)) {
      ctx.globalAlpha = 0.5; ctx.fillStyle = '#1a1630';
      ctx.fillRect(xx, gyR - 190 + n.y * p, n.w * p, 4 * p); ctx.fillRect(xx + 6 * p, gyR - 194 + n.y * p, (n.w - 14) * p, 4 * p);
    }
    for (const v of a.vagalumes) {
      const piscar = Math.max(0, Math.sin(t * 1.7 + v.f * 3));
      for (const xx of posTela(v.x + Math.sin(t * 0.5 + v.f) * 20, 0.8, cam, W)) {
        const y = gyR - 12 - v.y * 70 + Math.cos(t * 0.8 + v.f) * 8;
        ctx.globalAlpha = piscar * 0.3; ctx.fillStyle = '#e6ff7a'; ctx.fillRect(xx - p, y - p, p * 3, p * 3);
        ctx.globalAlpha = piscar; ctx.fillRect(xx, y, p, p);
      }
    }
    ctx.globalAlpha = 1;
  },
};

CENAS.castelo = {
  camadas: [
    { vel: 0.03, desenhar(c, lw, lh, gy) { lua(c, 230, gy - 60, 11, '#b3233a', '#7e1426', '#ff4a5f'); } },
    { vel: 0.18, desenhar(c, lw, lh, gy, rnd, pack, extra) {
      // silhueta do castelo
      const cor = '#1b1020', base = gy + 4, janelas = extra.janelas = [];
      const torre = (x, w, h, telhado) => {
        r(c, x, base - h, w, h, cor);
        for (let i = 0; i < w; i += 2) r(c, x + i, base - h - 2, 1, 2, cor);                       // ameias
        if (telhado) for (let y = 0; y < w + 4; y++) { const ww = Math.max(0, Math.round((w + 2) * (y / (w + 4)) / 2)); r(c, x + w / 2 - ww, base - h - (w + 4) + y, ww * 2, 1, cor); }
        for (let y = base - h + 5; y < base - 6; y += 9) if (rnd() < 0.6) janelas.push({ x: x + Math.floor(w / 2) - 1, y, f: rnd() * 6 });
      };
      let x = 10;
      while (x < lw - 60) {
        const larg = 70 + rnd() * 50;
        r(c, x, base - 22, larg, 22, cor);                                        // muralha
        for (let i = 0; i < larg; i += 3) r(c, x + i, base - 24, 2, 2, cor);
        torre(x - 4, 10, 40 + rnd() * 10, true);
        torre(x + larg * 0.45, 14, 55 + rnd() * 10, true);
        torre(x + larg - 6, 9, 34 + rnd() * 8, rnd() < 0.5);
        x += larg + 40 + rnd() * 60;
      }
    } },
    { vel: 0.55, desenhar(c, lw, lh, gy, rnd) {
      // grade de ferro e estandartes vermelhos
      for (let x = 0; x < lw; x += 3) { r(c, x, gy - 14, 1, 16, '#150d18'); r(c, x, gy - 15, 1, 1, '#2a1a2c'); }
      r(c, 0, gy - 12, lw, 1, '#150d18'); r(c, 0, gy - 4, lw, 1, '#150d18');
      for (let x = 20; x < lw - 20; x += 60 + rnd() * 50) laco(lw, x, 10, xx => {
        r(c, xx, gy - 34, 2, 36, '#2a1c28');                                        // poste
        r(c, xx + 2, gy - 32, 7, 14, '#7a1222'); r(c, xx + 2, gy - 32, 7, 1, '#a11b30'); // estandarte
        r(c, xx + 3, gy - 18, 2, 2, '#7a1222'); r(c, xx + 6, gy - 18, 2, 2, '#7a1222');
        r(c, xx + 4, gy - 28, 3, 3, '#c8a24a');                                     // brasão
      });
    } },
    { vel: 1, desenhar(c, lw, lh, gy, rnd, pack, extra) {
      // piso de pedra
      r(c, 0, gy, lw, lh - gy, '#1c1622');
      for (let y = gy; y < lh; y += 4) { const off = ((y - gy) / 4) % 2 ? 3 : 0; for (let x = off; x < lw; x += 7) r(c, x, y, 1, 4, '#141019'); r(c, 0, y, lw, 1, '#141019'); }
      r(c, 0, gy, lw, 1, '#3a2c3c');
      const velas = extra.velas = [];
      for (let x = 10; x < lw - 10; x += 22 + rnd() * 30) {
        const k = rnd();
        if (k < 0.3) { const w = 6 + rnd() * 10; r(c, x, gy + 1, w, 2, '#5c0b18'); r(c, x + 1, gy + 1, w - 2, 1, '#8c1426'); }            // poça de sangue
        else if (k < 0.45) { r(c, x, gy - 6, 5, 6, '#3b2418'); r(c, x, gy - 4, 5, 1, '#5a3a22'); r(c, x + 5, gy - 2, 4, 1, '#6e0f22'); }   // barril de vinho vazando
        else if (k < 0.6) { r(c, x + 1, gy - 4, 1, 3, '#c8a24a'); r(c, x, gy - 5, 3, 1, '#c8a24a'); r(c, x, gy - 1, 3, 1, '#c8a24a'); r(c, x, gy - 6, 3, 1, '#8c1426'); } // taça com vinho
        else if (k < 0.8) { r(c, x + 2, gy - 12, 1, 12, '#3a2c3c'); r(c, x, gy - 12, 5, 1, '#3a2c3c'); r(c, x - 1, gy - 13, 1, 2, '#e8dcc0'); r(c, x + 2, gy - 15, 1, 2, '#e8dcc0'); r(c, x + 5, gy - 13, 1, 2, '#e8dcc0'); velas.push({ x: x - 1, y: gy - 15 }, { x: x + 2, y: gy - 17 }, { x: x + 5, y: gy - 15 }); } // candelabro
        else { for (let i = 0; i < 4; i++) { r(c, x + i * 2, gy - 3 - (i % 2), 2, 2, '#9e1830'); r(c, x + i * 2, gy - 1, 1, 1, '#24331f'); } }   // rosas vermelhas
      }
    } },
  ],
  ambiente(seed) {
    const rnd = aleatorio(seed), morcegos = [];
    for (let i = 0; i < 6; i++) morcegos.push({ x: rnd() * TW, y: rnd(), v: 25 + rnd() * 30, f: rnd() * 6 });
    return { morcegos };
  },
  animar(ctx, a, t, cam, W, gyR, p, extras) {
    // janelas tremeluzindo em vermelho
    const jan = extras[1] && extras[1].janelas || [];
    for (const j of jan) for (const xx of posTela(j.x * p, 0.18, cam, W)) {
      const b = 0.55 + 0.45 * Math.sin(t * 3 + j.f) * Math.sin(t * 1.7 + j.f * 2);
      ctx.globalAlpha = Math.max(0.2, b); ctx.fillStyle = '#ff3b4e'; ctx.fillRect(xx, j.y * p, p * 2, p * 3);
    }
    // chamas das velas
    const velas = extras[3] && extras[3].velas || [];
    for (const v of velas) for (const xx of posTela(v.x * p, 1, cam, W)) {
      const fl = Math.sin(t * 9 + v.x) > 0 ? 1 : 0;
      ctx.globalAlpha = 0.25; ctx.fillStyle = '#ffb347'; ctx.fillRect(xx - p, v.y * p - p * 2, p * 3, p * 3);
      ctx.globalAlpha = 1; ctx.fillStyle = fl ? '#ffd27a' : '#ff9a3c'; ctx.fillRect(xx, v.y * p - p * (1 + fl), p, p * (1 + fl));
    }
    // morcegos voando
    for (const m of a.morcegos) for (const xx of posTela(m.x + t * m.v, 0.4, cam, W)) {
      const y = gyR - 120 - m.y * 70 + Math.sin(t * 2 + m.f) * 10, asa = Math.sin(t * 14 + m.f) > 0;
      ctx.globalAlpha = 1; ctx.fillStyle = '#0d0810';
      ctx.fillRect(xx, y, p * 2, p);
      ctx.fillRect(xx - p * 2, y + (asa ? -p : p), p * 2, p); ctx.fillRect(xx + p * 2, y + (asa ? -p : p), p * 2, p);
    }
    ctx.globalAlpha = 1;
  },
};

CENAS.igreja = {
  camadas: [
    { vel: 0.03, desenhar(c, lw, lh, gy) { lua(c, 110, gy - 66, 7, '#e9e6f5', '#bfbad6', '#ffffff'); } },
    { vel: 0.18, desenhar(c, lw, lh, gy, rnd, pack, extra) {
      const cor = '#191427', base = gy + 4, vitrais = extra.vitrais = [];
      let x = 30;
      while (x < lw - 80) {
        const larg = 60 + rnd() * 30;
        r(c, x, base - 30, larg, 30, cor);                                                      // nave
        for (let y = 0; y < 14; y++) { const w = Math.round((larg / 2) * (y / 14)); r(c, x + larg / 2 - w, base - 44 + y, w * 2, 1, cor); } // telhado
        const tx = x + larg + 2;
        r(c, tx, base - 62, 12, 62, cor);                                                       // torre do sino
        for (let y = 0; y < 16; y++) { const w = Math.round(7 * (y / 16)); r(c, tx + 6 - w, base - 78 + y, w * 2, 1, cor); }
        r(c, tx + 5, base - 86, 2, 8, cor); r(c, tx + 3, base - 83, 6, 2, cor);                 // cruz
        vitrais.push({ x: x + larg / 2 - 4, y: base - 26, w: 8, h: 12, rosa: true });
        for (let i = 8; i < larg - 8; i += 12) if (Math.abs(i - larg / 2) > 8) vitrais.push({ x: x + i, y: base - 22, w: 3, h: 9 });
        vitrais.push({ x: tx + 4, y: base - 50, w: 4, h: 8 });
        x += larg + 70 + rnd() * 80;
      }
      for (const v of vitrais) {                                                                // vitrais (desenho fixo; o brilho é animado)
        const cores = ['#d9a43a', '#7a4bc2', '#3a6fd1', '#c23a5a'];
        for (let yy = 0; yy < v.h; yy++) for (let xx = 0; xx < v.w; xx++) r(c, v.x + xx, v.y + yy, 1, 1, cores[(xx + yy * 2) % cores.length]);
        if (v.rosa) r(c, v.x + v.w / 2 - 1, v.y + v.h / 2 - 1, 2, 2, '#fff1b0');
      }
    } },
    { vel: 0.55, desenhar(c, lw, lh, gy, rnd, pack, extra) {
      const lanternas = extra.lanternas = [];
      for (let x = 0; x < lw; x += 34) laco(lw, x, 30, xx => {                                 // arcos de pedra
        r(c, xx, gy - 22, 4, 24, '#221c30'); r(c, xx + 26, gy - 22, 4, 24, '#221c30');
        for (let i = 0; i < 26; i++) { const yy = Math.round(Math.sin((i / 26) * Math.PI) * 6); r(c, xx + 2 + i, gy - 24 - yy, 1, 3, '#221c30'); }
      });
      for (let x = 15; x < lw; x += 68) { r(c, x, gy - 30, 1, 30, '#2a2338'); r(c, x - 1, gy - 34, 3, 4, '#3a3048'); lanternas.push({ x, y: gy - 33 }); }
    } },
    { vel: 1, desenhar(c, lw, lh, gy, rnd, pack, extra) {
      r(c, 0, gy, lw, lh - gy, '#1d1826');                                                      // calçamento
      for (let y = gy + 1; y < lh; y += 3) for (let x = (y % 2) * 2; x < lw; x += 5) r(c, x, y, 4, 2, rnd() < 0.5 ? '#25202f' : '#221c2b');
      r(c, 0, gy, lw, 1, '#3d3450');
      const velas = extra.velas = [];
      for (let x = 12; x < lw - 12; x += 26 + rnd() * 34) {
        const k = rnd();
        if (k < 0.35) { const n = 2 + Math.floor(rnd() * 3); for (let i = 0; i < n; i++) { const h = 2 + Math.floor(rnd() * 4); r(c, x + i * 2, gy - h, 1, h, '#ece2c6'); velas.push({ x: x + i * 2, y: gy - h }); } } // velas
        else if (k < 0.55) { r(c, x, gy - 5, 6, 5, '#4a3f5c'); r(c, x - 1, gy - 6, 8, 1, '#5c4f70'); r(c, x + 1, gy - 5, 4, 1, '#6fb7e0'); } // pia de água benta
        else if (k < 0.75) { r(c, x, gy - 3, 5, 3, '#5a3a2a'); r(c, x, gy - 6, 1, 6, '#5a3a2a'); r(c, x + 4, gy - 6, 1, 6, '#5a3a2a'); }   // banco de madeira
        else { r(c, x, gy - 3, 4, 3, '#6a4a3a'); r(c, x, gy - 5, 1, 2, '#e0d07a'); r(c, x + 2, gy - 6, 1, 3, '#f0f0f0'); r(c, x + 3, gy - 5, 1, 2, '#c9a0e0'); } // vaso de flores
      }
    } },
  ],
  ambiente(seed) {
    const rnd = aleatorio(seed), luzes = [];
    for (let i = 0; i < 18; i++) luzes.push({ x: rnd() * TW, f: rnd() * 10, v: 6 + rnd() * 8 });
    return { luzes };
  },
  animar(ctx, a, t, cam, W, gyR, p, extras) {
    const vit = extras[1] && extras[1].vitrais || [];
    for (const v of vit) for (const xx of posTela(v.x * p, 0.18, cam, W)) {     // raios de luz saindo dos vitrais
      const b = 0.08 + 0.05 * Math.sin(t * 0.8 + v.x);
      ctx.globalAlpha = b; ctx.fillStyle = '#ffd98a';
      ctx.beginPath(); ctx.moveTo(xx, v.y * p); ctx.lineTo(xx + v.w * p, v.y * p); ctx.lineTo(xx + v.w * p + 60, gyR + 10); ctx.lineTo(xx - 20, gyR + 10); ctx.fill();
    }
    const lan = extras[2] && extras[2].lanternas || [];
    for (const l of lan) for (const xx of posTela(l.x * p, 0.55, cam, W)) {
      ctx.globalAlpha = 0.25 + 0.1 * Math.sin(t * 5 + l.x); ctx.fillStyle = '#ffd27a'; ctx.fillRect(xx - p * 2, l.y * p - p, p * 5, p * 4);
      ctx.globalAlpha = 1; ctx.fillRect(xx, l.y * p, p, p * 2);
    }
    const velas = extras[3] && extras[3].velas || [];
    for (const v of velas) for (const xx of posTela(v.x * p, 1, cam, W)) {
      const fl = Math.sin(t * 8 + v.x * 3) > 0;
      ctx.globalAlpha = 0.3; ctx.fillStyle = '#ffd98a'; ctx.fillRect(xx - p, v.y * p - p * 3, p * 3, p * 3);
      ctx.globalAlpha = 1; ctx.fillStyle = fl ? '#fff1b0' : '#ffc860'; ctx.fillRect(xx, v.y * p - p * (fl ? 2 : 1), p, p * (fl ? 2 : 1));
    }
    for (const l of a.luzes) {                                                  // partículas de luz subindo (bênção dos bruxos)
      const ciclo = ((t * l.v / 60 + l.f) % 1);
      for (const xx of posTela(l.x + Math.sin(t + l.f) * 10, 0.9, cam, W)) {
        ctx.globalAlpha = Math.sin(ciclo * Math.PI) * 0.8; ctx.fillStyle = '#ffe9a0';
        ctx.fillRect(xx, gyR - ciclo * 140, p, p);
      }
    }
    ctx.globalAlpha = 1;
  },
};

// ---------------------------------------------------------------- montagem e desenho
const pack = {};
let cache = {}, H = 0, gyTela = 0, cam = 0, tempo = 0;
let atual = 'cemiterio', viagem = null;

// todas as posições x na tela em que um ponto da faixa aparece (a faixa se repete)
function posTela(x, vel, camX, W, largura = 40) {
  let base = ((x - camX * vel) % TW + TW) % TW;
  const out = [];
  for (let xx = base - TW; xx < W + 20; xx += TW) if (xx > -largura) out.push(xx);
  return out;
}

function montar(nome, Htela, gyR) {
  const cena = CENAS[nome], p = P(), lw = Math.ceil(TW / p), lh = Math.ceil(Htela / p), gy = Math.floor(gyR / p);
  const semente = (C.cenario.semente || 1) * 1000 + nome.length * 77;
  const extras = [];
  const camadas = cena.camadas.map((cam, i) => {
    const low = document.createElement('canvas'); low.width = lw; low.height = lh;
    const c = low.getContext('2d'); c.imageSmoothingEnabled = false;
    const extra = {};
    cam.desenhar(c, lw, lh, gy, aleatorio(semente + i * 13), pack, extra);
    extras.push(extra);
    const big = document.createElement('canvas'); big.width = TW; big.height = Htela;
    const b = big.getContext('2d'); b.imageSmoothingEnabled = false; b.drawImage(low, 0, 0, lw * p, lh * p);
    return { cv: big, vel: cam.vel };
  });
  return { camadas, extras, amb: cena.ambiente(semente) };
}

function desenharCena(ctx, nome, W, alpha) {
  const m = cache[nome]; if (!m) return;
  ctx.save(); ctx.globalAlpha = alpha;
  for (const c of m.camadas) for (const xx of posTela(0, c.vel, cam, W, TW)) ctx.drawImage(c.cv, Math.round(xx), 0);
  ctx.restore();
  ctx.save();
  // a animação usa a própria transparência; o proxy multiplica pelo fade da transição
  CENAS[nome].animar(proxyAlpha(ctx, alpha), m.amb, tempo, cam, W, gyTela, P(), m.extras);
  ctx.restore();
  // névoa rasteira
  if (C.cenario.nevoa) {
    ctx.save(); ctx.globalAlpha = alpha;
    const g = ctx.createLinearGradient(0, gyTela - 30, 0, gyTela + 20);
    g.addColorStop(0, 'rgba(70,40,100,0)'); g.addColorStop(0.6, 'rgba(70,40,100,0.32)'); g.addColorStop(1, 'rgba(40,20,60,0.12)');
    ctx.fillStyle = g; ctx.fillRect(0, gyTela - 30, W, 50);
    ctx.restore();
  }
}
// faz o "globalAlpha" das animações respeitar o fade da transição
function proxyAlpha(ctx, mult) {
  if (mult >= 1) return ctx;
  return new Proxy(ctx, {
    get(t, k) { const v = t[k]; return typeof v === 'function' ? v.bind(t) : v; },
    set(t, k, v) { t[k] = k === 'globalAlpha' ? v * mult : v; return true; },
  });
}

const Cenarios = {
  INFO,
  nomes: () => Object.keys(CENAS),
  atual: () => atual,
  viajando: () => !!viagem,
  async carregar(carregarImg) {
    for (const n of ['groundM1', 'groundM2', 'groundM3', 'graveStone', 'gravestone2', 'gravestoneBot', 'gravestoneTop', 'fenceL', 'fenceM', 'fenceR', 'tree', 'zombieHand', 'stone2', 'stone3', 'stone4', 'grass1', 'grass2', 'flower3', 'shovel'])
      pack[n] = await carregarImg('assets/cenario/' + n + '.png');
    pack.silhueta = await carregarImg('assets/cenario/parallax/parallax2.png');
  },
  definir(nome) { if (CENAS[nome]) atual = nome; },
  proximo() {
    const ordem = (C.cenario.ordem || Object.keys(CENAS)).filter(n => CENAS[n]);
    if (C.cenario.sortear) { const outros = ordem.filter(n => n !== atual); return outros[Math.floor(Math.random() * outros.length)] || atual; }
    return ordem[(ordem.indexOf(atual) + 1) % ordem.length];
  },
  // começa a "caminhada" até outro cenário
  viajar(nome) {
    if (!CENAS[nome] || nome === atual) return false;
    viagem = { de: atual, para: nome, t: 0, dur: C.cenario.viagemSeg || 6 };
    return true;
  },
  // dtReal: segundos desde o último quadro | retorna o nome do cenário quando uma viagem termina
  desenhar(ctx, W, Htela, gyR, dtReal) {
    tempo += dtReal;
    if (Htela !== H || gyR !== gyTela) { cache = {}; H = Htela; gyTela = gyR; }
    let chegou = null;
    if (viagem) {
      viagem.t += dtReal;
      const k = Math.min(1, viagem.t / viagem.dur);
      cam += (C.cenario.velocidadeViagem || 260) * Math.sin(k * Math.PI) * 1.6 * dtReal;   // acelera e freia
      const fade = Math.min(1, Math.max(0, (k - 0.3) / 0.4));
      for (const n of [viagem.de, viagem.para]) if (!cache[n]) cache[n] = montar(n, Htela, gyR);
      // o cenário novo aparece por baixo e o antigo vai sumindo por cima (sem ficar "lavado" no meio)
      if (fade > 0) desenharCena(ctx, viagem.para, W, Math.min(1, fade * 3));
      if (fade < 1) desenharCena(ctx, viagem.de, W, 1 - fade);
      if (k >= 1) { atual = viagem.para; chegou = atual; viagem = null; }
    } else {
      cam += (C.cenario.derivaCamera || 0) * dtReal;
      if (!cache[atual]) cache[atual] = montar(atual, Htela, gyR);
      desenharCena(ctx, atual, W, 1);
    }
    return chegou;
  },
};
window.Cenarios = Cenarios;
})();
