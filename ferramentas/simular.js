// =====================================================================
//  Simulador de partidas do Contagium (sem navegador, roda no Node.js)
//  Usa o MESMO config.js e jogo.js do jogo e simula partidas inteiras com bots no automático.
//
//  Uso:   node ferramentas/simular.js [viewers] [minutos] [partidas]
//  Ex.:   node ferramentas/simular.js 20 20 30
//
//  Variáveis opcionais:
//    OV='{"classes":{"zumbi":{"contaminaAbaixo":10}}}'  → testa outros números sem mexer no config.js
//    CMDS=2.5                                          → bots usam comandos de chat a cada ~2,5 s
//    RAINHA=150                                        → chama e provoca a Rainha aos 150 s de partida
//    JSON=1                                            → imprime os dados brutos em vez do resumo
// =====================================================================
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..');
const N = +(process.argv[2] || 20), DUR = +(process.argv[3] || 20), RUNS = +(process.argv[4] || 10);
const noop = () => {};
const ctxProxy = new Proxy({}, { get: (t, k) => k === 'measureText' ? () => ({ width: 10 }) : (k.startsWith && k.startsWith('create')) ? () => ({ addColorStop: noop }) : noop, set: () => true });
let rafCb = null, now = 0;
Object.assign(global, { window: global, innerWidth: 1920, innerHeight: 300, location: { search: '' }, addEventListener: noop,
  performance: { now: () => now }, requestAnimationFrame: cb => { rafCb = cb; }, setInterval: noop,
  localStorage: { getItem: () => null, setItem: noop, removeItem: noop }, WebSocket: class {} });
global.Image = class { set src(v) { this.width = 1024; this.height = 3584; setImmediate(() => this.onload && this.onload()); } };
global.document = { getElementById: () => ({ getContext: () => ctxProxy, clientWidth: 1920, clientHeight: 300 }), createElement: () => ({ getContext: () => ctxProxy }) };
eval(fs.readFileSync(path.join(dir, 'config.js'), 'utf8'));
(function m(a, b) { for (const k in b) { if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k])) m(a[k], b[k]); else a[k] = b[k]; } })(window.CONFIG, JSON.parse(process.env.OV || '{}'));
eval(fs.readFileSync(path.join(dir, 'jogo.js'), 'utf8'));

(async () => {
  for (let i = 0; i < 30; i++) await new Promise(r => setImmediate(r));
  const J = window.__contagium, mod = { login: 's', nome: 'S', mod: true };
  const LUZ = ['humano', 'bruxo'], MON = ['zumbi', 'vampiro', 'lobisomem'];
  const out = [];
  for (let run = 0; run < RUNS; run++) {
    J.comando(mod, '!tempo ' + DUR); J.comando(mod, '!abrir');
    for (let i = 0; i < N; i++) J.comando({ login: 'v' + run + '_' + i, nome: 'v' + i, mod: false }, '!entrar');
    J.comando(mod, '!iniciar');
    const cont = () => { const c = { humano: 0, bruxo: 0, zumbi: 0, vampiro: 0, lobisomem: 0 }; for (const p of Object.values(J.estado().jogadores)) c[p.cls]++; return c; };
    const ini = cont();
    let t = 0, chamouRainha = false; const step = 1 / 30;
    const per = Number(process.env.CMDS || 0) * Math.max(1, DUR / window.CONFIG.duracaoBaseMin); let prox = per;
    while (J.estado().fase === 'partida' && t < DUR * 60 + 400) {
      now += step * 1000; t += step; rafCb(now);
      if (process.env.RAINHA && !chamouRainha && t >= Number(process.env.RAINHA)) {
        chamouRainha = true; J.comando(mod, '!rainha');
        const pv = Object.values(J.estado().jogadores).find(q => q.estado === 'vivo');
        if (pv) J.comando({ login: pv.login, nome: pv.nome, mod: false }, '!atacar rainha');
      }
      if (per && t >= prox) {
        prox += per;
        const vs = Object.values(J.estado().jogadores).filter(q => q.estado === 'vivo');
        const p = vs[Math.floor(Math.random() * vs.length)];
        if (p) {
          const al = vs.filter(q => p.cls === 'bruxo' ? (LUZ.includes(q.cls) && q.vida < q.max) : (q !== p && (LUZ.includes(p.cls) ? MON.includes(q.cls) : q.cls !== p.cls)));
          if (al.length) J.comando({ login: p.login, nome: p.nome, mod: false }, `${p.cls === 'bruxo' ? '!curar' : '!bater'} @${al[Math.floor(Math.random() * al.length)].login}`);
        }
      }
    }
    const G = J.estado();
    if (G.resultado) out.push({ ini, fim: cont(), venc: G.resultado.vencedor, min: t / 60, contam: G.partida.contam, est: G.partida.est });
  }
  if (process.env.JSON) { console.log(JSON.stringify(out)); process.exit(0); }

  // resumo
  const w = { luz: 0, zumbi: 0, vampiro: 0, lobisomem: 0 };
  out.forEach(r => w[r.venc]++);
  const pct = k => `${Math.round(100 * w[k] / out.length)}%`.padStart(4);
  const soma = f => out.reduce((a, r) => a + f(r), 0);
  console.log(`\n${out.length} partidas · ${N} viewers · ${DUR} min · duração média ${(soma(r => r.min) / out.length).toFixed(1)} min\n`);
  console.log(`  ☀ Luz ${pct('luz')}   🧟 Zumbi ${pct('zumbi')}   🧛 Vampiro ${pct('vampiro')}   🐺 Lobisomem ${pct('lobisomem')}\n`);
  for (const c of MON) console.log(`  ${c.padEnd(10)} contaminações por monstro inicial: ${(soma(r => r.contam[c]) / Math.max(1, soma(r => r.ini[c]))).toFixed(1)}`);
  console.log(`\n  mordidas rápidas ${soma(r => r.est.mordidaRapida)} · infecções ${soma(r => r.est.infeccoes || 0)} · vida roubada ${soma(r => r.est.rouboVida)} · curas ${soma(r => r.est.curas)} · purificações ${soma(r => r.est.purif)}`);
  const rainhas = out.map(r => r.est.rainha).filter(Boolean);
  if (rainhas.length) console.log(`  Rainha derrotada em ${rainhas.filter(x => x.resultado === 'derrotada').length} de ${rainhas.length} eventos`);
  process.exit(0);
})();
