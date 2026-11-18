// =====================================================================
//  CONTAGIUM: Bellum Noctis — lógica, desenho e chat
// =====================================================================
(() => {
'use strict';

const C = window.CONFIG;
const params = new URLSearchParams(location.search);
const TESTE = params.has('teste');
const CANAL = (params.get('canal') || C.canal || '').toLowerCase().replace(/^#/, '').trim();
let VEL = Number(params.get('velocidade')) || C.velocidade || 1;
const SAVE_KEY = 'contagium_bellum_noctis_v1' + (TESTE ? '_teste' : '');

// Quadros de cada folha (grade de 4 colunas, 256x256), tirado do group_info.txt
const SPRITES = {
  xxg_1: { idle: [0, 5], ataque: [8, 11], corre: [12, 16], pulo: [20, 26], morte: [28, 36], topo: 112 },
  xxg_2: { idle: [0, 5], corre: [8, 12], pulo: [16, 23], ataque: [24, 26], morte: [28, 33], topo: 150 },
  xxg_3: { idle: [0, 5], ataque: [8, 11], corre: [12, 15], pulo: [16, 21], morte: [24, 32], topo: 113 },
  xxg_4: { idle: [0, 5], ataque: [8, 11], corre: [12, 16], pulo: [20, 26], morte: [28, 34], topo: 106 },
  xxg_5: { idle: [0, 4], ataque: [8, 12], corre: [16, 20], pulo: [24, 30], morte: [32, 37], topo: 103 },
  xxg_6: { idle: [0, 0], ataque: [4, 7], corre: [8, 11], pulo: [12, 17], morte: [20, 26], topo: 104 },
  xxg_8: { idle: [0, 5], levanta: [8, 13], ataque: [16, 20], corre: [24, 28], pulo: [32, 40], morte: [44, 54], topo: 106 },
};
const PE = 230; // linha do pé dentro do quadro de 256
const MONSTROS = ['zumbi', 'vampiro', 'lobisomem'];
const LUZ = ['humano', 'bruxo'];
const NOME_RACA_PLURAL = { zumbi: 'ZUMBIS', vampiro: 'VAMPIROS', lobisomem: 'LOBISOMENS' };

// ---------------------------------------------------------------- util
const rand = (a, b) => a + Math.random() * (b - a);
const escolha = arr => arr[Math.floor(Math.random() * arr.length)];
const agoraReal = () => performance.now() / 1000;
const cls = c => C.classes[c];
const fmtTempo = s => { s = Math.max(0, Math.ceil(s)); const m = Math.floor(s / 60); return `${m}:${String(s % 60).padStart(2, '0')}`; };

// ---------------------------------------------------------------- canvas
const cv = document.getElementById('tela');
const ctx = cv.getContext('2d');
let W = 0, H = 0;
function redimensionar() { W = cv.width = cv.clientWidth || innerWidth; H = cv.height = cv.clientHeight || innerHeight; }
addEventListener('resize', redimensionar);
redimensionar();

// ---------------------------------------------------------------- imagens
const imgs = {}, folhas = {};
let ultimaFaseVista = null;
function carregarImg(src) {
  return new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => { console.warn('Imagem não encontrada:', src); res(null); }; im.src = src; });
}
let imgRainha = null;
async function carregarImagens() {
  imgRainha = await carregarImg('assets/personagens/xxg_8.png');
  // "arquivo" permite usar uma versão editada do desenho (ex.: humano.png) com as animações do sprite original
  const chaves = new Set(Object.values(C.classes).map(c => c.arquivo || c.sprite));
  for (const k of chaves) imgs[k] = await carregarImg('assets/personagens/' + k + '.png');
  for (const [nome, c] of Object.entries(C.classes)) {
    const im = imgs[c.arquivo || c.sprite];
    if (!im) continue;
    if (!c.filtro) { folhas[nome] = im; continue; }
    // recolore uma vez só, numa folha separada (não lê pixels, funciona como arquivo local)
    const f = document.createElement('canvas');
    f.width = im.width; f.height = im.height;
    const x = f.getContext('2d');
    x.filter = c.filtro;
    x.drawImage(im, 0, 0);
    folhas[nome] = f;
  }
  if (C.cenario && C.cenario.ativo && window.Cenarios) await Cenarios.carregar(carregarImg);
}

// ---------------------------------------------------------------- estado
function novoEstado() {
  return {
    versao: 1, fase: 'intervalo', faseAntesPausa: null,
    relogio: 0, fimEm: 0, duracaoMin: C.duracaoPadraoMin,
    jogadores: {}, pontos: {}, reservas: {},
    partida: null, resultado: null,
    vitorias: { luz: 0, zumbi: 0, vampiro: 0, lobisomem: 0 },
  };
}
let G = novoEstado();

function salvar() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(G)); } catch (e) { /* sem armazenamento */ } }
function carregarEstado() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s && s.versao === 1) G = Object.assign(novoEstado(), s);
  } catch (e) { /* começa do zero */ }
  for (const p of lista()) {
    p.acao = null; p.flashAte = 0; p.balao = null;
    if (p.semente === undefined) p.semente = Math.random();
    if (p.fila === undefined) { p.fila = 0; p.y = 0; }
  }
}
setInterval(salvar, 3000);

// Ritmo: partidas mais longas = golpes mais espaçados e mais fracos, para a partida render o tempo todo
const ritmo = () => Math.max(1, Math.pow(G.duracaoMin / C.duracaoBaseMin, C.ritmoExpoente || 1));
const fT = () => ritmo();                // multiplica tempos de espera
const fV = () => 1;                      // (reservado) multiplicador de dano/cura

// Amanhecer: depois de uma parte da partida, o sol vai nascendo e os monstros enfraquecem aos poucos
function progressoPartida() {
  if (!G.partida) return 0;
  const total = G.duracaoMin * 60;
  return Math.min(1, Math.max(0, 1 - (G.fimEm - G.relogio) / total));
}
function luzDoSol() { // 0 = noite, 1 = sol nascido
  if (!C.amanhecer.ativo || !G.partida) return 0;
  return Math.min(1, Math.max(0, (progressoPartida() - C.amanhecer.comecaEm) / (1 - C.amanhecer.comecaEm)));
}
// em partidas pequenas o mínimo de 3 monstros pesa mais; a compensação reduz o dano deles na mesma proporção
const forcaMonstro = () => (1 - (1 - C.amanhecer.forcaMinimaMonstros) * luzDoSol()) * ((G.partida && G.partida.compensacao) || 1);

// As distâncias do config (defesa, alcance, velocidade) valem para uma tela de 1920 de largura.
// Em telas mais estreitas ou mais largas, tudo é ajustado na mesma proporção (o equilíbrio não muda com o tamanho da fonte no OBS).
const fW = () => 1;
// O jogo "acontece" num campo fixo de 1920 de largura; a tela só estica ou encolhe o desenho.
const LW = 1920;
const escX = () => W / LW;

const lista = () => Object.values(G.jogadores);
const vivos = () => lista().filter(p => p.estado === 'vivo');
const daClasse = c => lista().filter(p => p.cls === c);
const pontosDe = login => G.pontos[login] || 0;
function darPontos(p, n) { if (!n || p.npc) return; G.pontos[p.login] = pontosDe(p.login) + n; }

function novoJogador(login, nome) {
  return {
    login, nome, cls: 'humano', vida: cls('humano').vida, max: cls('humano').vida,
    estado: 'vivo', ate: 0, x: rand(60, LW - 60), fila: 0, y: 0, semente: Math.random(),
    dir: Math.random() < 0.5 ? -1 : 1, anim: 'idle', animT: Math.random(), animLoop: true,
    recargaAte: 0, alvoManual: null, acao: null, escudo: false, escolhido: false, imuneAte: 0,
    vagar: null, flashAte: 0, balao: null,
    st: { contam: 0, purif: 0, curas: 0, quedas: 0 },
  };
}
// fileiras de profundidade: 0 = frente, 1 e 2 = mais atrás (um pouco menores)
function sortearFila(p) { p.fila = Math.floor(Math.random() * C.fileiras); p.y = p.fila * C.espacoFila; }
const escalaDe = p => C.escala * (1 - (p.fila || 0) * 0.07);
// "casa" de cada um na formação: luz à esquerda, monstros à direita (cada raça no seu trecho)
const FAIXAS = { humano: [0.07, 0.40], bruxo: [0.02, 0.14], zumbi: [0.56, 0.74], vampiro: [0.67, 0.85], lobisomem: [0.78, 0.97] };
function casaX(p) {
  if (G.fase === 'lobby' || G.fase === 'intervalo') return 50 + p.semente * (LW - 100);
  const [a, b] = FAIXAS[p.cls];
  return LW * (a + p.semente * (b - a));
}
function destacar(p, seg = 4) { if (p) p.mostrarAte = Math.max(p.mostrarAte || 0, agoraReal() + seg); }

function setClasse(p, c, fracVida = 1) {
  p.cls = c; p.max = cls(c).vida; p.vida = Math.max(1, Math.round(p.max * fracVida));
}

// ---------------------------------------------------------------- animação
function faixa(p) { const sp = SPRITES[cls(p.cls).sprite]; return sp[p.anim] || sp.idle; }
function setAnim(p, nome, umaVez = false) {
  if (p.anim === nome && !umaVez && p.animLoop) return;
  p.anim = nome; p.animT = 0; p.animLoop = !umaVez;
}
function quadro(p) {
  const [a, b] = faixa(p); const n = b - a + 1;
  let f = Math.floor(p.animT * C.fps);
  f = p.animLoop ? f % n : Math.min(f, n - 1);
  return a + f;
}
const animTerminou = p => { const [a, b] = faixa(p); return p.animT * C.fps >= (b - a + 1); };

// ---------------------------------------------------------------- efeitos
const efeitos = [];   // textos e partículas
const feed = [];      // mensagens no canto
let banner = null;    // { titulo, linhas, cor, ate }
let painelLoja = 0;
function texto(x, y, txt, cor = '#fff', tam = 13) { efeitos.push({ tipo: 'txt', x, y, txt, cor, tam, t: 0, dur: 1.4 }); }
function anel(x, y, cor) { efeitos.push({ tipo: 'anel', x, y, cor, t: 0, dur: 0.7 }); }
function projetil(x0, y0, x1, y1, cor) { efeitos.push({ tipo: 'proj', x0, y0, x1, y1, cor, t: 0, dur: 0.35 }); }
function noticia(msg, cor = '#e8e0ff') { feed.push({ msg, cor, t: agoraReal() }); if (feed.length > 6) feed.shift(); }
function mostrarBanner(titulo, linhas = [], cor = '#ffd75e', seg = 8) { banner = { titulo, linhas, cor, ate: seg ? agoraReal() + seg : Infinity }; }
function balao(p, txt, cor = '#fff') { p.balao = { txt, cor, ate: agoraReal() + 2.5 }; }

const peY = p => H - C.margemBaixo - p.y;
const topoY = p => peY(p) - (PE - SPRITES[cls(p.cls).sprite].topo) * escalaDe(p);
const meioY = p => (peY(p) + topoY(p)) / 2;

// ---------------------------------------------------------------- fases
function abrirLobby() {
  G.rainha = null;
  if (C.cenario && C.cenario.trocarACadaPartida && (G.fase === 'fim' || G.proximaCena)) {
    // o próximo cenário é a "casa" de quem venceu (Luz → catedral, zumbis → cemitério...)
    // fica guardado em G.proximaCena, então funciona mesmo depois de !resetar ou do botão Zerar
    const casa = C.cenario.porVencedor && G.proximaCena;
    G.proximaCena = null;
    if (casa && window.Cenarios && casa === Cenarios.atual()) noticia(`${Cenarios.INFO[casa].emoji} Os vencedores continuam em casa: ${Cenarios.INFO[casa].nome}`, '#cfc6ff');
    else trocarCenario(casa || null);
  }
  G.jogadores = {}; G.partida = null; G.resultado = null; G.fase = 'lobby';
  mostrarBanner('CONTAGIUM: BELLUM NOCTIS', ['A noite vai cair... digite !entrar para jogar'], '#ffd75e', 0);
  noticia('🌑 Lobby aberto! Digite !entrar');
}

const NOMES_NPC = {
  humano: ['Aldeão', 'Ferreiro', 'Padeira', 'Lenhador', 'Camponesa', 'Moleiro', 'Taberneira', 'Pastor', 'Guarda', 'Coveiro', 'Costureira', 'Pescador'],
  bruxo: ['Eremita', 'Curandeira', 'Monge', 'Alquimista'],
  zumbi: ['Morto-Vivo', 'Carniçal', 'Errante', 'Defunto'],
  vampiro: ['Cria da Noite', 'Sanguessuga', 'Conde Menor', 'Dama Pálida'],
  lobisomem: ['Uivador', 'Fera da Lua', 'Garra Cinzenta', 'Pelagem Negra'],
};

function iniciarPartida() {
  const reais = lista();
  if (reais.length < C.minimoReais) { noticia(`⚠ Precisa de pelo menos ${C.minimoReais} jogador(es) para começar`, '#ffb4b4'); return; }
  // completa com NPCs até o mínimo de bonecos
  const faltam = Math.max(0, C.minimoBonecos - reais.length);
  for (let i = 0; i < faltam; i++) {
    const npc = novoJogador('npc_' + i + '_' + Math.floor(rand(1000, 9999)), 'NPC');
    npc.npc = true;
    G.jogadores[npc.login] = npc;
  }
  const ps = lista();
  const n = ps.length;
  const nMon = Math.max(C.distribuicao.minimoMonstros, Math.round(n * C.distribuicao.monstros));
  const nBru = Math.max(C.distribuicao.minimoBruxos, Math.ceil(n * C.distribuicao.bruxos));

  const embaralhados = ps.slice().sort(() => Math.random() - 0.5);
  const definidos = new Map();
  // quem comprou classe na loja escolhe primeiro
  for (const p of embaralhados) {
    const r = G.reservas[p.login];
    if (r && r.classe) definidos.set(p.login, r.classe);
  }
  const contar = c => [...definidos.values()].filter(v => (c === 'monstro' ? MONSTROS.includes(v) : v === c)).length;
  // raças sempre divididas por igual: a próxima vaga vai para a raça com menos membros
  const proximaRaca = () => MONSTROS.slice().sort(() => Math.random() - 0.5).sort((a, b) => contar(a) - contar(b))[0];
  for (const p of embaralhados) {
    if (definidos.has(p.login)) continue;
    if (contar('monstro') < nMon) definidos.set(p.login, proximaRaca());
    else if (contar('bruxo') < nBru) definidos.set(p.login, 'bruxo');
    else definidos.set(p.login, 'humano');
  }
  const usados = {};
  for (const p of ps) if (p.npc) {
    const c = definidos.get(p.login), lista_ = NOMES_NPC[c];
    usados[c] = (usados[c] || 0) + 1;
    const base = lista_[(usados[c] - 1) % lista_.length];
    p.nome = usados[c] > lista_.length ? `${base} ${Math.ceil(usados[c] / lista_.length)}` : base;
  }
  for (const p of ps) {
    setClasse(p, definidos.get(p.login));
    p.zumbiOriginal = p.cls === 'zumbi';
    if (p.npc) { sortearFila(p); p.x = casaX(p); }
    p.estado = 'vivo'; p.acao = null; p.alvoManual = null; p.escolhido = false; p.furia = false; p.imuneAte = 0;
    p.recargaAte = G.relogio + rand(2, 6); p.escudo = false;
    p.st = { contam: 0, purif: 0, curas: 0, quedas: 0 };
    const r = G.reservas[p.login];
    if (r && r.escudo) p.escudo = true;
    if (MONSTROS.includes(p.cls)) { anel(p.x, meioY(p), cls(p.cls).cor); setAnim(p, 'pulo', true); }
  }
  G.reservas = {};
  G.partida = { contam: { zumbi: 0, vampiro: 0, lobisomem: 0 }, humanosInicio: daClasse('humano').length, escolhido: null,
    est: { mordidaRapida: 0, infeccoes: 0, contamPorInfeccao: 0, infeccoesCuradas: 0, rouboVida: 0, curas: 0, purif: 0, quedas: { zumbi: 0, vampiro: 0, lobisomem: 0 }, golpesAbsorvidosLobo: 0, escudos: 0,
      dano: { humano: 0, zumbi: 0, vampiro: 0, lobisomem: 0 }, golpes: { humano: 0, zumbi: 0, vampiro: 0, lobisomem: 0 },
      recebido: { humano: 0, bruxo: 0, zumbi: 0, vampiro: 0, lobisomem: 0 } } };
  const fracMon = lista().filter(q => MONSTROS.includes(q.cls)).length / lista().length;
  G.partida.compensacao = C.compensarPartidaPequena ? Math.pow(Math.min(1, C.distribuicao.monstros / fracMon), C.compensacaoExpoente || 1) : 1;
  // bruxos: quando o arredondamento dá bruxo "a mais" (ex.: 12 bonecos → 2 bruxos em vez de 1,2), eles agem mais devagar
  const nBruxos = daClasse('bruxo').length;
  G.partida.ritmoBruxo = nBruxos > C.distribuicao.minimoBruxos ? Math.min(1, (lista().length * C.distribuicao.bruxos) / nBruxos) : 1;
  G.fimEm = G.relogio + G.duracaoMin * 60;
  G.fase = 'partida';
  const cont = c => daClasse(c).length;
  mostrarBanner('🌑 A NOITE CAIU!', [`🧍 ${cont('humano')}  🧙 ${cont('bruxo')}  🧟 ${cont('zumbi')}  🧛 ${cont('vampiro')}  🐺 ${cont('lobisomem')}`, `Sobrevivam por ${G.duracaoMin} minutos!`], '#ff5a6e', 7);
  noticia('⚔ A partida começou!');
}

function racaVencedora() {
  let melhor = null;
  for (const r of MONSTROS) {
    const k = [G.partida.contam[r], daClasse(r).length];
    if (!melhor || k[0] > melhor.k[0] || (k[0] === melhor.k[0] && k[1] > melhor.k[1])) melhor = { r, k };
  }
  return melhor.r;
}

function encerrarPartida(motivo) {
  if (G.fase !== 'partida' && G.fase !== 'pausa') return;
  const humanos = daClasse('humano').length;
  const vencedor = (humanos > 0 && motivo !== 'contaminacao') ? 'luz' : racaVencedora();
  const vencedores = lista().filter(p => vencedor === 'luz' ? LUZ.includes(p.cls) : p.cls === vencedor);
  vencedores.forEach(p => darPontos(p, C.pontos.vitoria));
  G.vitorias[vencedor]++;

  const top = campo => { const t = lista().filter(p => !p.npc && p.st[campo] > 0).sort((a, b) => b.st[campo] - a.st[campo])[0]; return t ? `${t.nome} (${t.st[campo]})` : null; };
  const destaques = [];
  const c1 = top('contam'); if (c1) destaques.push(`☣ Mais contaminou: ${c1}`);
  const c2 = top('purif'); if (c2) destaques.push(`✨ Mais purificou: ${c2}`);
  if (G.partida.escolhido && G.jogadores[G.partida.escolhido]) destaques.push(`⚔ Último humano: ${G.jogadores[G.partida.escolhido].nome}`);

  const titulo = vencedor === 'luz' ? '☀ VITÓRIA DA LUZ! HUMANOS E BRUXOS SOBREVIVERAM' : `${cls(vencedor).emoji} OS ${NOME_RACA_PLURAL[vencedor]} DOMINARAM A NOITE!`;
  destaques.unshift(`+${C.pontos.vitoria} pontos para ${vencedores.filter(p => !p.npc).length} jogador(es)`);
  G.rainha = null;
  G.resultado = { vencedor, titulo, destaques };
  G.proximaCena = C.cenario && C.cenario.casaDe ? C.cenario.casaDe[vencedor] : null;
  mostrarBanner(titulo, destaques, vencedor === 'luz' ? '#ffd75e' : cls(vencedor).cor, C.resultadoNaTelaSeg);
  noticia(titulo, '#ffd75e');
  G.fase = 'fim';
  for (const p of lista()) { p.acao = null; p.alvoManual = null; if (vencedores.includes(p)) { p.estado = 'vivo'; setAnim(p, 'pulo', true); } }
  salvar();
}

// ---------------------------------------------------------------- regras de combate
function inimigos(a, b) {
  if (a === b) return false;
  if (LUZ.includes(a.cls)) return MONSTROS.includes(b.cls);
  return b.cls !== a.cls; // monstro ataca luz e raças rivais
}
// =============================================================== EVENTO: A RAINHA DESPERTOU
// Chefe neutra: todos param de brigar entre si e atacam a Rainha. Ela ataca quem estiver perto.
const RAINHA = '__rainha';
const SP_RAINHA = { sentada: [0, 5], levanta: [8, 13], parada: [13, 13], ataque: [16, 20], morte: [44, 54] };
const rainhaAtiva = () => G.rainha && (G.rainha.fase === 'levantando' || G.rainha.fase === 'luta');
function alvoDe(login) {
  if (login !== RAINHA) return G.jogadores[login];
  const R = G.rainha;
  return R ? { login: RAINHA, x: R.x, vida: R.vida, max: R.max, estado: R.fase === 'luta' ? 'vivo' : 'outro', cls: 'rainha', y: 0 } : null;
}

function invocarRainha() {
  if (G.fase !== 'partida' || G.rainha) return false;
  G.rainha = { fase: 'sentada', x: LW / 2, vida: 1, max: 1, anim: 'sentada', animT: 0, esperaAte: G.relogio + C.rainha.esperaSeg * fT(), dano: {} };
  mostrarBanner('👑 A RAINHA CARMESIM CHEGOU...', ['Ela observa do trono. Quem ousa acordá-la?', 'Digite !atacar rainha'], '#ff3b5c', 7);
  noticia('👑 A Rainha está no trono. Digite !atacar rainha para provocá-la', '#ff6b80');
  anel(LW / 2, H - C.margemBaixo - 40, '#ff3b5c');
  return true;
}

// alguém do chat provocou: ela se levanta, começa a trégua e ela ataca todos
function acordarRainha(p) {
  const R = G.rainha; if (!R || R.fase !== 'sentada') return;
  const n = lista().length, cfg = C.rainha;
  const vida = Math.round(cfg.vidaPorBoneco * n / fT());
  Object.assign(R, { fase: 'levantando', anim: 'levanta', animT: 0, vida, max: vida, inicio: G.relogio,
    fimEm: G.relogio + cfg.duracaoSeg, recargaAte: G.relogio + 3, dano: {}, provocador: p.login });
  for (const q of lista()) { q.acao = null; q.alvoManual = null; }
  darPontos(p, cfg.pontosProvocar);
  mostrarBanner('👑 A RAINHA DESPERTOU!', [`${p.nome} ousou provocá-la!`, 'Trégua! Todos contra a Rainha Carmesim', `Derrotem-na em ${cfg.duracaoSeg} segundos`], '#ff3b5c', 6);
  noticia(`👑 ${p.nome} acordou a Rainha Carmesim! Trégua entre todos!`, '#ff6b80');
  destacar(p, 6); p.setaAte = agoraReal() + 5;
}

function atualizarRainha(dt) {
  const R = G.rainha; if (!R) return;
  R.animT += dt;
  const cfg = C.rainha;
  if (R.fase === 'sentada') {
    if (G.relogio >= R.esperaAte) {
      R.fase = 'saindo'; R.animT = 0;
      noticia('👑 Ninguém ousou... a Rainha voltou a dormir', '#ff6b80');
    }
    return;
  }
  if (R.fase === 'levantando') {
    if (R.animT * C.fps >= 6) { R.fase = 'luta'; R.anim = 'parada'; R.animT = 0; }
    G.fimEm += dt; return;
  }
  if (R.fase === 'luta') {
    G.fimEm += dt; // o relógio da partida espera o evento acabar
    if (R.anim === 'ataque' && R.animT * C.fps >= 5) {
      // golpe em área: acerta os mais próximos
      const alvos = vivos().filter(p => Math.abs(p.x - R.x) <= cfg.alcance).sort((a, b) => Math.abs(a.x - R.x) - Math.abs(b.x - R.x)).slice(0, cfg.alvosPorGolpe);
      for (const t of alvos) danoDaRainha(t, cfg.dano);
      anel(R.x, H - C.margemBaixo - 40, '#ff3b5c');
      R.anim = 'parada'; R.animT = 0;
    }
    if (R.anim !== 'ataque' && G.relogio >= R.recargaAte) { R.anim = 'ataque'; R.animT = 0; R.recargaAte = G.relogio + cfg.recarga * rand(0.85, 1.15); }
    if (G.relogio >= R.fimEm) rainhaVaiEmbora();
    return;
  }
  if (R.fase === 'morrendo' && R.animT * C.fps >= 11) G.rainha = null;
  if (R.fase === 'saindo' && R.animT > 1.5) G.rainha = null;
}

function danoDaRainha(t, dano) {
  if (t.imuneAte > G.relogio) { texto(t.x, topoY(t) - 4, 'IMUNE', '#ffd75e'); return; }
  if (t.escudo) { t.escudo = false; texto(t.x, topoY(t) - 4, '🛡 BLOQUEOU', '#bfe3ff'); return; }
  t.flashAte = agoraReal() + 0.15; destacar(t);
  texto(t.x + rand(-8, 8), topoY(t) - 4, `-${dano}`, '#ff3b5c');
  // a Rainha é neutra: não transforma ninguém. Humanos ficam com 1 de vida; monstros caem; bruxos desmaiam.
  if (t.cls === 'humano') { t.vida = Math.max(1, t.vida - dano); return; }
  t.vida -= dano;
  if (t.vida > 0) return;
  t.vida = 0; t.acao = null; setAnim(t, 'morte', true);
  if (t.cls === 'bruxo') { t.estado = 'desmaiado'; t.ate = G.relogio + cls('bruxo').desmaioSeg * fT(); }
  else { t.estado = 'caido'; t.ate = G.relogio + C.levantarSeg * fT(); }
}

function golpearRainha(p, dano) {
  const R = G.rainha; if (!R || R.fase !== 'luta') return;
  if (p.bencaoAte > G.relogio) dano = Math.round(dano * C.rainha.multiplicadorBencao);
  R.vida -= dano;
  // piscada curta e no máximo 3 por segundo (com muita gente batendo ela não fica "tremendo")
  if (!R.ultimaPiscada || agoraReal() - R.ultimaPiscada > 0.33) { R.flashAte = agoraReal() + 0.07; R.ultimaPiscada = agoraReal(); }
  R.dano[p.login] = (R.dano[p.login] || 0) + dano;
  // os números de dano são somados e aparecem juntos a cada meio segundo
  R.danoAcumulado = (R.danoAcumulado || 0) + dano;
  if (!R.ultimoNumero || agoraReal() - R.ultimoNumero > 0.5) {
    texto(R.x + rand(-40, 40), H - C.margemBaixo - 150 * C.escala * C.rainha.tamanho, `-${R.danoAcumulado}`, '#ffd0d8', 15);
    R.danoAcumulado = 0; R.ultimoNumero = agoraReal();
  }
  if (p.cls === 'vampiro') { const g = Math.min(Math.round(cls('vampiro').rouboVida * fV()), p.max - p.vida); if (g > 0) { p.vida += g; texto(p.x, topoY(p) - 4, `🩸+${g}`, '#ff9db0', 12); } }
  if (R.vida <= 0) rainhaDerrotada(p);
}

function premiarDano() {
  const R = G.rainha, ranking = Object.entries(R.dano).filter(([l]) => G.jogadores[l] && !G.jogadores[l].npc).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const premios = C.rainha.pontosTop;
  return ranking.map(([l, d], i) => { const p = G.jogadores[l]; darPontos(p, premios[i] || 0); return `${['🥇', '🥈', '🥉'][i]} ${p.nome} (${d} de dano, +${premios[i] || 0})`; });
}

function rainhaDerrotada(p) {
  const R = G.rainha; R.fase = 'morrendo'; R.anim = 'morte'; R.animT = 0; R.vida = 0;
  G.partida.est.rainha = { resultado: 'derrotada', seg: Math.round(G.relogio - R.inicio), golpeFinal: LUZ.includes(p.cls) ? 'luz' : p.cls };
  const lado = LUZ.includes(p.cls) ? 'luz' : p.cls;
  let bonus;
  if (lado === 'luz') {
    for (const q of lista()) if (LUZ.includes(q.cls) && q.estado === 'vivo') { q.vida = q.max; q.infeccao = null; }
    bonus = '☀ Golpe final da Luz: humanos e bruxos com vida cheia!';
  } else {
    for (const q of daClasse(lado)) { q.bencaoAte = G.relogio + C.rainha.bencaoSeg * fT(); if (q.estado === 'vivo') q.vida = q.max; }
    bonus = `${cls(lado).emoji} Golpe final dos ${NOME_RACA_PLURAL[lado]}: Sangue Real (batem ${C.rainha.multiplicadorBencao}x mais forte por um tempo)!`;
  }
  // pontos: quem lutou E é da mesma espécie do golpe final (na Luz, os bruxos contam: eles curaram)
  const mesmaEspecie = q => lado === 'luz' ? LUZ.includes(q.cls) : q.cls === lado;
  const participantes = lista().filter(q => !q.npc && mesmaEspecie(q) && (R.dano[q.login] || q.cls === 'bruxo'));
  participantes.forEach(q => darPontos(q, C.rainha.pontosParticipacao));
  darPontos(p, C.rainha.pontosGolpeFinal);
  const top = premiarDano();
  mostrarBanner('👑 A RAINHA FOI DERROTADA!', [`Golpe final: ${p.nome} (+${C.rainha.pontosGolpeFinal})`, `+${C.rainha.pontosParticipacao} pontos para ${participantes.length} ${lado === 'luz' ? 'humanos e bruxos' : NOME_RACA_PLURAL[lado].toLowerCase()} que lutaram`, bonus, ...top], '#ffd75e', 10);
  noticia(`👑 ${p.nome} derrotou a Rainha Carmesim!`, '#ffd75e');
  terminarTregua();
}

function rainhaVaiEmbora() {
  const R = G.rainha; R.fase = 'saindo'; R.animT = 0;
  G.partida.est.rainha = { resultado: 'fugiu', vidaRestante: Math.round(100 * R.vida / R.max) };
  for (const p of vivos()) { const perda = Math.round(p.vida * C.rainha.drenoAoFugir); p.vida = Math.max(1, p.vida - perda); if (perda) texto(p.x, topoY(p) - 4, `-${perda}`, '#ff3b5c'); }
  const top = premiarDano();
  mostrarBanner('👑 A RAINHA SE RETIROU...', [`Ela drenou ${Math.round(C.rainha.drenoAoFugir * 100)}% da vida de todos antes de partir`, ...top], '#ff6b80', 8);
  noticia('👑 A Rainha escapou e drenou a vida de todos', '#ff6b80');
  terminarTregua();
}

function terminarTregua() { for (const p of lista()) { p.acao = null; p.recargaAte = Math.max(p.recargaAte, G.relogio + 1); } }

function acaoValida(p, tipo, q) {
  if (q && q.login === RAINHA) return tipo === 'atacar' && p.cls !== 'bruxo' && rainhaAtiva() && G.rainha.fase === 'luta';
  if (tipo === 'atacar' && rainhaAtiva()) return false; // trégua
  if (!q || !G.jogadores[q.login]) return false;
  if (tipo === 'atacar') return p.cls !== 'bruxo' && inimigos(p, q) && q.estado === 'vivo';
  if (tipo === 'curar') return p.cls === 'bruxo' && LUZ.includes(q.cls) && q.estado === 'vivo' && (q.vida < q.max || !!q.infeccao);
  if (tipo === 'purificar') return p.cls === 'bruxo' && MONSTROS.includes(q.cls) && q.estado === 'caido';
  return false;
}
// quantos já estão indo atacar esse alvo (evita 20 bonecos no mesmo monstro)
const atacantes = q => lista().filter(o => o.acao && o.acao.tipo === 'atacar' && o.acao.alvo === q.login).length;
const livre = q => atacantes(q) < C.maxAtacantes;
function maisProximos(p, alvos, k = 3) { return alvos.slice().sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x)).slice(0, k); }
const menorVida = arr => arr.slice().sort((a, b) => a.vida / a.max - b.vida / b.max)[0];

function escolherAcao(p) {
  if (rainhaAtiva()) {
    if (G.rainha.fase !== 'luta') return null;
    if (p.cls !== 'bruxo') return { tipo: 'atacar', alvo: RAINHA, fase: 'ir' };
    const feridos = vivos().filter(q => (q.vida < q.max || q.infeccao));
    return feridos.length ? { tipo: 'curar', alvo: menorVida(feridos).login, fase: 'ir' } : null;
  }
  if (p.alvoManual) {
    const q = G.jogadores[p.alvoManual.login];
    if (acaoValida(p, p.alvoManual.tipo, q)) {
      // pelo chat também vale o limite de atacantes por alvo, e o humano só caça até "raioCaca"
      const atacando = p.alvoManual.tipo === 'atacar';
      const longe = atacando && Math.abs(q.x - p.x) > C.raioCaca * fW();
      if (!(atacando && (longe || !livre(q)))) {
        // cada comando vale por algumas ações; depois o boneco volta a pensar sozinho
        if (C.acoesPorComando && --p.alvoManual.restam <= 0) { const a = { tipo: p.alvoManual.tipo, alvo: q.login, fase: 'ir' }; p.alvoManual = null; return a; }
        return { tipo: p.alvoManual.tipo, alvo: q.login, fase: 'ir' };
      }
      // fora de alcance ou lotado: age no automático desta vez e mantém a mira para depois
    } else p.alvoManual = null; // alvo morreu, virou aliado etc. → volta ao automático
  }
  const vs = vivos().filter(q => q !== p);
  if (p.cls === 'humano') {
    // no automático o humano se DEFENDE: só bate em monstro que chegou perto
    const alvos = vs.filter(q => MONSTROS.includes(q.cls) && Math.abs(q.x - p.x) <= cls('humano').raioDefesa * fW() && livre(q));
    return alvos.length ? { tipo: 'atacar', alvo: escolha(maisProximos(p, alvos)).login, fase: 'ir' } : null;
  }
  if (p.cls === 'bruxo') {
    const luzViva = vivos().filter(q => LUZ.includes(q.cls));
    const graves = luzViva.filter(q => q.vida < q.max * 0.5 || q.infeccao);
    if (graves.length) return { tipo: 'curar', alvo: menorVida(graves).login, fase: 'ir' };
    const caidos = lista().filter(q => MONSTROS.includes(q.cls) && q.estado === 'caido');
    if (caidos.length) return { tipo: 'purificar', alvo: maisProximos(p, caidos, 1)[0].login, fase: 'ir' };
    const leves = luzViva.filter(q => q.vida < q.max);
    if (leves.length) return { tipo: 'curar', alvo: menorVida(leves).login, fase: 'ir' };
    return null;
  }
  // monstro
  const presas = vs.filter(q => LUZ.includes(q.cls) && livre(q));
  const rivais = vs.filter(q => MONSTROS.includes(q.cls) && q.cls !== p.cls && livre(q));
  let alvos = Math.random() < C.focoHumanos ? presas : rivais;
  if (!alvos.length) alvos = alvos === presas ? rivais : presas;
  if (!alvos.length) return null;
  return { tipo: 'atacar', alvo: menorVida(maisProximos(p, alvos)).login, fase: 'ir' };
}

function executarAcao(p, dt) {
  const a = p.acao, q = alvoDe(a.alvo);
  if (!acaoValida(p, a.tipo, q)) { p.acao = null; setAnim(p, 'idle'); return; }
  if (a.fase === 'ir') {
    const alcance = a.tipo === 'atacar' ? C.alcanceCorpo + (q.login === RAINHA ? 20 + Math.abs(p.semente - 0.5) * 120 : 0) : cls('bruxo').alcance * fW();
    const dx = q.x - p.x;
    if (dx) p.dir = Math.sign(dx);
    if (Math.abs(dx) > alcance) {
      p.x += Math.sign(dx) * Math.min(Math.abs(dx) - alcance * 0.7, C.velocidadeAndar * fW() * dt);
      setAnim(p, 'corre');
    } else { a.fase = 'golpe'; setAnim(p, 'ataque', true); }
  } else if (animTerminou(p)) {
    aplicar(p, a.tipo, q);
    p.acao = null;
    const extra = a.tipo === 'purificar' ? cls('bruxo').recargaPurificar : 0;
    const lentidao = p.cls === 'bruxo' ? Math.pow(1 / (G.partida.ritmoBruxo || 1), 0.25) : 1;
    p.recargaAte = G.relogio + (cls(p.cls).recarga + extra) * fT() * lentidao * rand(0.85, 1.15);
    setAnim(p, 'idle');
  }
}

function aplicar(p, tipo, q) {
  if (tipo === 'atacar' && q.login === RAINHA) {
    const dano = Math.max(1, Math.round((cls(p.cls).dano || C.dano) * (p.escolhido ? C.escolhido.multiplicadorDano : 1) * (p.furia ? C.furia.multiplicadorDano : 1)));
    destacar(p); golpearRainha(p, dano); return;
  }
  if (tipo === 'atacar') {
    let alvos = [q];
    if (p.escolhido) alvos = vivos().filter(t => inimigos(p, t) && Math.abs(t.x - p.x) <= C.escolhido.area * fW());
    const dano = Math.max(1, Math.round((cls(p.cls).dano || C.dano) * fV() * (p.escolhido ? C.escolhido.multiplicadorDano : 1) * (p.furia ? C.furia.multiplicadorDano : 1) * (p.bencaoAte > G.relogio ? C.rainha.multiplicadorBencao : 1) * (MONSTROS.includes(p.cls) ? forcaMonstro() : 1)));
    if (p.escolhido) anel(p.x, meioY(p), '#ffd75e');
    destacar(p);
    for (const t of alvos) { golpear(p, t, dano); destacar(t); }
  } else if (tipo === 'curar') {
    const ganho = Math.min(Math.round(cls('bruxo').cura * fV()), q.max - q.vida);
    q.vida += ganho;
    if (q.infeccao) { q.infeccao = null; G.partida.est.infeccoesCuradas++; texto(q.x, topoY(q) - 18, '✨ INFECÇÃO CURADA', '#fff6c8', 11); }
    projetil(p.x + p.dir * 30, meioY(p) - 10, q.x, meioY(q), '#ffe9a0');
    texto(q.x, topoY(q) - 4, `+${ganho}`, '#9dff9d');
    destacar(q, 3); destacar(p, 3);
    p.st.curas++; darPontos(p, C.pontos.curar); G.partida.est.curas++;
  } else if (tipo === 'purificar') {
    projetil(p.x + p.dir * 30, meioY(p) - 10, q.x, meioY(q), '#fff6c8');
    const antes = q.cls;
    setClasse(q, 'humano', C.vidaAoPurificar); q.infeccao = null; q.marcaVamp = null;
    q.estado = 'vivo'; q.acao = null; q.alvoManual = null; q.recargaAte = G.relogio + 3;
    setAnim(q, 'pulo', true);
    anel(q.x, meioY(q), '#fff6c8');
    texto(q.x, topoY(q) - 8, 'PURIFICADO!', '#fff6c8', 15);
    destacar(q, 6); destacar(p, 4);
    noticia(`✨ ${p.nome} purificou ${q.nome} (${cls(antes).emoji} → 🧍)`, '#fff6c8');
    p.st.purif++; darPontos(p, C.pontos.purificar); G.partida.est.purif++;
  }
}

const limiteMordida = z => z && z.cls === 'zumbi' ? (z.zumbiOriginal ? cls('zumbi').contaminaAbaixo : cls('zumbi').contaminaAbaixoTransformado) : 0;

function golpear(a, t, dano) {
  if (t.imuneAte > G.relogio) { texto(t.x, topoY(t) - 4, 'IMUNE', '#ffd75e'); return; }
  if (t.escudo) { t.escudo = false; G.partida.est.escudos++; texto(t.x, topoY(t) - 4, '🛡 BLOQUEOU', '#bfe3ff'); return; }
  t.vida -= dano; t.flashAte = agoraReal() + 0.15;
  G.partida.est.dano[a.cls] += dano; G.partida.est.golpes[a.cls]++; G.partida.est.recebido[t.cls] += dano;
  if (t.cls === 'lobisomem') G.partida.est.golpesAbsorvidosLobo++;
  texto(t.x + rand(-8, 8), topoY(t) - 4, `-${dano}`, '#ff7a7a');
  if (a.cls === 'vampiro') {
    const ganho = Math.min(Math.round(cls('vampiro').rouboVida * fV()), a.max - a.vida);
    if (ganho > 0) { a.vida += ganho; texto(a.x, topoY(a) - 4, `🩸+${ganho}`, '#ff9db0', 12); G.partida.est.rouboVida += ganho; }
    // Marca de Sangue: por um tempo, se essa vítima for contaminada por qualquer um, ela vira vampiro
    if (t.cls === 'humano' && cls('vampiro').marcaSeg > 0) t.marcaVamp = { por: a.login, ate: G.relogio + cls('vampiro').marcaSeg * fT() };
  }
  if (t.cls === 'humano') {
    const limite = limiteMordida(a);
    if (t.vida <= limite) {
      if (t.vida > 0) { G.partida.est.mordidaRapida++; texto(t.x, topoY(t) - 24, '🧟 MORDIDA RÁPIDA', '#9be07a', 12); }
      contaminar(t, a);
    } else if (a.cls === 'zumbi' && C.classes.zumbi.infeccaoTotal > 0 && daClasse('zumbi').length <= C.classes.zumbi.infeccaoAteZumbis) {
      // mordida infectada: o alvo continua perdendo vida por alguns segundos
      const dur = C.classes.zumbi.infeccaoSeg * fT();
      t.infeccao = { ate: G.relogio + dur, dps: C.classes.zumbi.infeccaoTotal / dur, por: a.login, original: !!a.zumbiOriginal };
      G.partida.est.infeccoes++;
      texto(t.x, topoY(t) - 24, '🦠 INFECTADO', '#9be07a', 12);
    }
  } else if (t.cls === 'bruxo') {
    if (t.vida <= 0) {
      t.vida = 0; t.estado = 'desmaiado'; t.ate = G.relogio + cls('bruxo').desmaioSeg * fT(); t.acao = null;
      setAnim(t, 'morte', true);
      noticia(`💫 ${a.nome} derrubou o bruxo ${t.nome}!`, '#ffd75e');
    }
  } else if (t.vida <= 0) {
    t.vida = 0; t.estado = 'caido'; t.ate = G.relogio + C.levantarSeg * (cls(t.cls).levantarMult || 1) * fT(); t.acao = null;
    G.partida.est.quedas[t.cls]++;
    setAnim(t, 'morte', true);
    a.st.quedas++;
    darPontos(a, MONSTROS.includes(a.cls) ? C.pontos.derrubarRival : C.pontos.derrubarMonstro);
    noticia(`⚔ ${a.nome} derrubou ${cls(t.cls).emoji} ${t.nome}`);
  }
}

function contaminar(t, a) {
  const marca = t.marcaVamp; t.marcaVamp = null;
  if (a.cls !== 'vampiro' && marca && marca.ate > G.relogio) {
    const v = G.jogadores[marca.por];
    if (v && v.cls === 'vampiro') {
      texto(t.x, topoY(t) - 30, '🩸 MARCA DE SANGUE', '#ff5a6e', 12);
      G.partida.est.marcaRoubou = (G.partida.est.marcaRoubou || 0) + 1;
      a = v;
    }
  }
  t.zumbiOriginal = false; t.infeccao = null;
  destacar(t, 6); destacar(a, 4);
  const era = t.escolhido;
  t.escolhido = false; t.imuneAte = 0;
  setClasse(t, a.cls, C.vidaAoVirar);
  t.acao = null; t.alvoManual = null; t.recargaAte = G.relogio + 3;
  setAnim(t, 'pulo', true);
  anel(t.x, meioY(t), cls(a.cls).cor);
  texto(t.x, topoY(t) - 10, `${cls(a.cls).emoji} CONTAMINADO!`, cls(a.cls).cor, 15);
  G.partida.contam[a.cls]++;
  a.st.contam++; darPontos(a, C.pontos.contaminar);
  noticia(`${cls(a.cls).emoji} ${a.nome} transformou ${t.nome} em ${cls(a.cls).nome.toLowerCase()}!`, cls(a.cls).cor);
  if (era) mostrarBanner('O ÚLTIMO HUMANO CAIU!', [`${t.nome} foi transformado por ${a.nome}`], cls(a.cls).cor, 6);
}

// ---------------------------------------------------------------- atualização
function atualizarPartida(dt) {
  for (const p of lista()) {
    if (p.infeccao) {
      if (p.cls !== 'humano' || p.estado !== 'vivo' || G.relogio >= p.infeccao.ate) p.infeccao = null;
      else {
        p.vida -= p.infeccao.dps * dt;
        const z = G.jogadores[p.infeccao.por];
        const limite = z && z.cls === 'zumbi' ? limiteMordida(z) : (p.infeccao.original ? cls('zumbi').contaminaAbaixo : cls('zumbi').contaminaAbaixoTransformado);
        if (p.vida <= limite) {
          G.partida.est.contamPorInfeccao++;
          // quem mordeu ganha o crédito; se ele não for mais zumbi, o jogador vira zumbi do mesmo jeito
          contaminar(p, z && z.cls === 'zumbi' ? z : { cls: 'zumbi', nome: 'a infecção', st: { contam: 0 }, npc: true });
          texto(p.x, topoY(p) - 24, '🦠 A INFECÇÃO VENCEU', '#9be07a', 12);
        }
      }
    }
    if (p.estado === 'caido' && G.relogio >= p.ate) {
      p.estado = 'vivo'; p.vida = Math.round(p.max * C.vidaAoLevantar); p.recargaAte = G.relogio + 2;
      setAnim(p, 'pulo', true); texto(p.x, topoY(p) - 4, 'LEVANTOU!', cls(p.cls).cor);
    }
    if (p.estado === 'desmaiado' && G.relogio >= p.ate) {
      p.estado = 'vivo'; p.vida = Math.round(p.max * cls('bruxo').vidaAoAcordar); p.recargaAte = G.relogio + 2;
      setAnim(p, 'pulo', true); texto(p.x, topoY(p) - 4, 'ACORDOU!', '#ffd75e');
    }
    if (p.estado !== 'vivo') continue;
    if (!p.acao && G.relogio >= p.recargaAte) {
      p.acao = escolherAcao(p);
      if (!p.acao) p.recargaAte = G.relogio + 1;
    }
    if (p.acao) executarAcao(p, dt);
    else vaguear(p, dt);
  }

  // amanhecer
  if (C.amanhecer.ativo && !G.partida.amanhecer && luzDoSol() > 0) {
    G.partida.amanhecer = true;
    mostrarBanner('☀ O SOL ESTÁ NASCENDO...', ['As criaturas da noite estão enfraquecendo. Humanos, aguentem firme!'], '#ffb347', 7);
    noticia('☀ O amanhecer começou! Os monstros estão enfraquecendo', '#ffb347');
  }

  if (G.rainha) { atualizarRainha(dt); if (rainhaAtiva()) return; }

  // último humano
  const humanos = daClasse('humano');
  if (!G.partida.escolhido && humanos.length === 1 && G.partida.humanosInicio >= C.escolhido.minimoHumanosInicio && MONSTROS.some(r => daClasse(r).length)) {
    const h = humanos[0];
    h.escolhido = true; h.vida = h.max; h.imuneAte = G.relogio + C.escolhido.imunidadeSeg;
    G.partida.escolhido = h.login;
    anel(h.x, meioY(h), '#ffd75e');
    mostrarBanner(`⚔ ${h.nome.toUpperCase()} É O ÚLTIMO HUMANO! ⚔`, ['LUZ SAGRADA: imune por um tempo e golpes 3x mais fortes em área'], '#ffd75e', 8);
    noticia(`⚔ ${h.nome} recebeu a Luz Sagrada!`, '#ffd75e');
  }

  // último monstro: Fúria da Noite (o espelho do último humano)
  const listaMonstros = lista().filter(p => MONSTROS.includes(p.cls));
  if (!G.partida.furia && listaMonstros.length === 1 && humanos.length > 1) {
    const m = listaMonstros[0];
    m.furia = true; m.estado = 'vivo'; m.vida = m.max; m.imuneAte = G.relogio + C.furia.imunidadeSeg;
    G.partida.furia = m.login;
    anel(m.x, meioY(m), '#ff3030');
    mostrarBanner(`🩸 FÚRIA DA NOITE: ${m.nome.toUpperCase()} 🩸`, [`O último ${cls(m.cls).nome.toLowerCase()} está imune por um tempo e bate ${C.furia.multiplicadorDano}x mais forte`], '#ff4848', 8);
    noticia(`🩸 ${m.nome} entrou em Fúria!`, '#ff6b6b');
  }
  for (const p of lista()) if (p.furia && !MONSTROS.includes(p.cls)) p.furia = false;

  // fim de jogo
  const monstros = listaMonstros.length;
  if (humanos.length === 0) encerrarPartida('contaminacao');
  else if (monstros === 0) encerrarPartida('purificacao');
  else if (G.relogio >= G.fimEm) encerrarPartida('tempo');
}

function vaguear(p, dt) {
  if (p.estado !== 'vivo') return;
  const t = agoraReal(), casa = casaX(p);
  const longe = Math.abs(casa - p.x) > 50;
  if (longe) p.vagar = { x: casa + rand(-20, 20), ate: 0, volta: true };
  else if (!p.vagar || (p.vagar.x === null && t > p.vagar.ate)) {
    p.vagar = Math.random() < 0.3 ? { x: casa + rand(-35, 35), ate: 0 } : { x: null, ate: t + rand(2, 5) };
  }
  if (p.vagar.x !== null) {
    const dx = p.vagar.x - p.x;
    if (Math.abs(dx) < 3) { p.vagar = { x: null, ate: t + rand(2, 5) }; if (p.animLoop) setAnim(p, 'idle'); return; }
    p.dir = Math.sign(dx);
    p.x += Math.sign(dx) * Math.min(Math.abs(dx), C.velocidadeAndar * fW() * (p.vagar.volta ? 0.8 : 0.4) * dt);
    if (p.animLoop || animTerminou(p)) setAnim(p, 'corre');
  } else if (!p.animLoop && animTerminou(p)) setAnim(p, 'idle');
  else if (p.animLoop && p.anim !== 'idle') setAnim(p, 'idle');
}

// espaço pessoal: quem está na mesma fileira e muito colado é empurrado de leve
function separar(dt) {
  const porFila = {};
  for (const p of lista()) if (p.estado === 'vivo') (porFila[p.fila] = porFila[p.fila] || []).push(p);
  for (const fila of Object.values(porFila)) {
    fila.sort((a, b) => a.x - b.x);
    for (let i = 1; i < fila.length; i++) {
      const a = fila[i - 1], b = fila[i], min = C.espacoPessoal * escalaDe(a) / C.escala;
      const sobra = min - (b.x - a.x);
      if (sobra > 0) { const m = Math.min(sobra / 2, 80 * dt); a.x -= m; b.x += m; }
    }
  }
}

// ---------------------------------------------------------------- comandos
const ITENS_LOJA = ['escudo', 'cura', 'classe'];
const NOMES_CLASSE = { humano: 'humano', bruxo: 'bruxo', zumbi: 'zumbi', vampiro: 'vampiro', lobisomem: 'lobisomem', lobo: 'lobisomem' };
let avisoFechado = 0;

function comando(u, msg) {
  msg = msg.trim();
  const eu = G.jogadores[u.login];
  if (eu) { destacar(eu, C.destaqueChatSeg); eu.setaAte = agoraReal() + C.destaqueChatSeg; }
  if (!msg.startsWith('!')) return;
  const partes = msg.slice(1).split(/\s+/);
  const cmd = (partes[0] || '').toLowerCase();
  const args = partes.slice(1);
  const alvoLogin = args[0] ? args[0].replace(/^@/, '').toLowerCase() : null;
  const p = G.jogadores[u.login];
  const ehMod = u.mod || C.moderadoresExtras.map(s => s.toLowerCase()).includes(u.login);

  // ---- controle (dono e mods)
  if (ehMod) {
    if (cmd === 'abrir') return abrirLobby();
    if (cmd === 'iniciar' && G.fase === 'lobby') return iniciarPartida();
    if (cmd === 'pausar' && G.fase === 'partida') { G.fase = 'pausa'; mostrarBanner('⏸ PAUSADO', [], '#cfc6ff', 0); return; }
    if (cmd === 'continuar' && G.fase === 'pausa') { G.fase = 'partida'; banner = null; noticia('▶ Partida retomada'); return; }
    if (cmd === 'encerrar') return encerrarPartida('mod');
    if (cmd === 'tempo' && Number(args[0]) > 0) {
      G.duracaoMin = Number(args[0]);
      if (G.fase === 'partida' || G.fase === 'pausa') G.fimEm = G.relogio + G.duracaoMin * 60;
      noticia(`⏱ Tempo da partida: ${G.duracaoMin} min`);
      return;
    }
    if (cmd === 'rainha') {
      if (!invocarRainha()) noticia(G.rainha ? 'A Rainha já está em campo' : 'A Rainha só desperta durante a partida', '#ffb4b4');
      return;
    }
    if (cmd === 'cenario') {
      const pedido = (args[0] || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const nome = !pedido || pedido === 'proximo' ? null : Cenarios.nomes().find(n => n.startsWith(pedido));
      if (pedido && pedido !== 'proximo' && !nome) { noticia(`Cenários: ${Cenarios.nomes().join(', ')}`, '#ffb4b4'); return; }
      if (!trocarCenario(nome)) noticia('O cenário só muda fora da partida (ou já está nele)', '#ffb4b4');
      return;
    }
    if (cmd === 'resetar') { const pts = G.pontos, vit = G.vitorias, cena = G.cena, prox = G.proximaCena; G = novoEstado(); G.pontos = pts; G.vitorias = vit; G.cena = cena; G.proximaCena = prox; banner = null; noticia('↺ Jogo resetado (pontos mantidos)'); return; }
  }

  // ---- viewers
  if (cmd === 'entrar') {
    if (p) return;
    if (G.fase === 'lobby' || G.fase === 'partida' || G.fase === 'pausa') {
      const npcs = G.fase !== 'lobby' ? lista().filter(q => q.npc && q.estado === 'vivo') : [];
      if (npcs.length) {
        // assume o lugar de um NPC (mesma classe, posição e vida)
        const q = escolha(npcs);
        delete G.jogadores[q.login];
        const antigo = q.nome;
        Object.assign(q, { login: u.login, nome: u.nome, npc: false, alvoManual: null });
        G.jogadores[u.login] = q;
        anel(q.x, meioY(q), cls(q.cls).cor);
        destacar(q, 6); q.setaAte = agoraReal() + 5;
        noticia(`${cls(q.cls).emoji} ${u.nome} assumiu o lugar de ${antigo} (${cls(q.cls).nome.toLowerCase()})`);
        return;
      }
      const np = novoJogador(u.login, u.nome);
      G.jogadores[u.login] = np;
      if (G.fase !== 'lobby') { np.recargaAte = G.relogio + 2; noticia(`🧍 ${u.nome} chegou como humano`); }
      np.x = casaX(np); sortearFila(np); destacar(np, 6); np.setaAte = agoraReal() + 4;
      anel(np.x, meioY(np), '#8fc1ff');
    } else if (agoraReal() - avisoFechado > 30) {
      avisoFechado = agoraReal();
      noticia('Aguarde o próximo lobby para entrar', '#cfc6ff');
    }
    return;
  }
  if (cmd === 'sair' && p && G.fase === 'lobby') { delete G.jogadores[u.login]; return; }

  if (cmd === 'status' || cmd === 'pontos') {
    if (p) balao(p, `${cls(p.cls).emoji} ${cls(p.cls).nome} ❤${Math.max(0, Math.round(p.vida))}/${p.max} 💰${pontosDe(u.login)}`, cls(p.cls).cor);
    else noticia(`💰 ${u.nome}: ${pontosDe(u.login)} pontos`);
    return;
  }
  if (cmd === 'loja') { painelLoja = agoraReal() + 12; return; }
  if (cmd === 'comprar') return comprar(u, p, (args[0] || '').toLowerCase(), (args[1] || '').toLowerCase());

  if (!p || G.fase !== 'partida') return;
  if (['bater', 'atacar', 'morder'].includes(cmd) && alvoLogin === 'rainha') {
    if (!G.rainha) { balao(p, '✖ a Rainha não está aqui', '#ff9a9a'); return; }
    if (G.rainha.fase === 'sentada') { if (p.estado === 'vivo') acordarRainha(p); return; }
    return;
  }
  if (['bater', 'atacar', 'morder'].includes(cmd)) return mirar(p, 'atacar', alvoLogin);
  if (cmd === 'curar') return mirar(p, 'curar', alvoLogin || p.login);
  if (cmd === 'purificar') return mirar(p, 'purificar', alvoLogin);
  if (cmd === 'auto') { p.alvoManual = null; balao(p, '🤖 automático'); }
}

function mirar(p, tipo, alvoLogin) {
  const q = alvoLogin && G.jogadores[alvoLogin];
  if (!q) { balao(p, '✖ alvo não encontrado', '#ff9a9a'); return; }
  if (!acaoValida(p, tipo, q)) { balao(p, '✖ alvo inválido', '#ff9a9a'); return; }
  if (tipo === 'atacar' && Math.abs(q.x - p.x) > C.raioCaca * fW()) { balao(p, '✖ muito longe', '#ff9a9a'); return; }
  p.alvoManual = { tipo, login: q.login, restam: C.acoesPorComando };
  if (p.acao && p.acao.fase === 'ir') p.acao = null;
  balao(p, `🎯 ${q.nome}`, '#fff');
}

function comprar(u, p, item, extra) {
  if (!ITENS_LOJA.includes(item)) { painelLoja = agoraReal() + 12; return; }
  const preco = C.loja[item];
  const quem = p || { x: LW / 2, nome: u.nome };
  if (pontosDe(u.login) < preco) { noticia(`💰 ${u.nome}: pontos insuficientes (${pontosDe(u.login)}/${preco})`, '#ffb4b4'); return; }
  if (item === 'cura') {
    if (!p || G.fase !== 'partida' || p.estado !== 'vivo' || p.vida >= p.max) { noticia(`${u.nome}: a cura só funciona durante a partida, com vida faltando`, '#ffb4b4'); return; }
    p.vida = p.max; texto(p.x, topoY(p) - 4, '❤ VIDA CHEIA', '#9dff9d');
  } else if (item === 'escudo') {
    if (p && (G.fase === 'partida' || G.fase === 'pausa')) { if (p.escudo) return; p.escudo = true; }
    else { G.reservas[u.login] = Object.assign({}, G.reservas[u.login], { escudo: true }); }
  } else if (item === 'classe') {
    const c = NOMES_CLASSE[extra];
    if (!c) { noticia(`${u.nome}: use !comprar classe zumbi | vampiro | lobisomem | bruxo | humano`, '#ffb4b4'); return; }
    G.reservas[u.login] = Object.assign({}, G.reservas[u.login], { classe: c });
  }
  G.pontos[u.login] = pontosDe(u.login) - preco;
  noticia(`🛒 ${quem.nome} comprou ${item}${item === 'classe' ? ' ' + extra : ''} (-${preco})`, '#bfe3ff');
}

// ---------------------------------------------------------------- chat da Twitch (anônimo, só leitura)
let chatStatus = CANAL ? 'conectando' : 'sem canal';
function conectarChat() {
  if (!CANAL) return;
  const ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');
  ws.onopen = () => {
    ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
    ws.send('PASS SCHMOOPIIE');
    ws.send('NICK justinfan' + Math.floor(rand(10000, 99999)));
    ws.send('JOIN #' + CANAL);
  };
  ws.onmessage = e => {
    for (const linha of e.data.split('\r\n')) {
      if (!linha) continue;
      if (linha.startsWith('PING')) { ws.send('PONG :tmi.twitch.tv'); continue; }
      let resto = linha, tags = {};
      if (resto[0] === '@') {
        const i = resto.indexOf(' ');
        for (const kv of resto.slice(1, i).split(';')) { const j = kv.indexOf('='); tags[kv.slice(0, j)] = kv.slice(j + 1); }
        resto = resto.slice(i + 1);
      }
      if (/ JOIN #/.test(resto)) chatStatus = 'conectado';
      const m = resto.match(/^:([^!]+)!\S+ PRIVMSG #\S+ :(.*)$/);
      if (!m) continue;
      const login = m[1].toLowerCase();
      const badges = tags.badges || '';
      const mod = tags.mod === '1' || /broadcaster\//.test(badges) || login === CANAL;
      comando({ login, nome: tags['display-name'] || login, mod }, m[2]);
    }
  };
  ws.onclose = () => { chatStatus = 'reconectando'; setTimeout(conectarChat, 3000); };
}

// ---------------------------------------------------------------- desenho
const FONTE = '"Nunito", "Segoe UI", sans-serif';           // textos pequenos: nomes, avisos, placar
const FONTE_TITULO = '"Pixelify Sans", "Segoe UI", sans-serif'; // títulos grandes

function caixa(x, y, w, h, r = 8, cor = 'rgba(14,10,24,0.78)', borda = 'rgba(255,215,94,0.35)') {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = cor; ctx.fill();
  if (borda) { ctx.strokeStyle = borda; ctx.lineWidth = 1; ctx.stroke(); }
}
function textoContorno(txt, x, y, cor, tam, alinhar = 'center', peso = '700', fonte = FONTE) {
  ctx.font = `${peso} ${tam}px ${fonte}`; ctx.textAlign = alinhar; ctx.textBaseline = 'alphabetic';
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.strokeText(txt, x, y);
  ctx.fillStyle = cor; ctx.fillText(txt, x, y);
}

function desenharSol() {
  const k = luzDoSol();
  if (k <= 0) return;
  // brilho alaranjado subindo do chão, cada vez mais forte
  const g = ctx.createLinearGradient(0, H * 0.25, 0, H);
  g.addColorStop(0, 'rgba(255,170,80,0)');
  g.addColorStop(1, `rgba(255,170,80,${0.28 * k})`);
  ctx.fillStyle = g; ctx.fillRect(0, H * 0.25, W, H * 0.75);
}

// topo do chão: um pouco acima dos pés da fileira de trás, para todo mundo pisar na grama
const chaoTopo = () => H - C.margemBaixo - C.espacoFila * (C.fileiras - 1) - 12;

function desenharChao(dtReal) {
  if (!C.cenario || !C.cenario.ativo || !window.Cenarios) {
    const g = ctx.createLinearGradient(0, H - 90, 0, H);
    g.addColorStop(0, 'rgba(20,10,30,0)');
    g.addColorStop(0.55, 'rgba(26,14,38,0.55)');
    g.addColorStop(1, 'rgba(10,6,16,0.9)');
    ctx.fillStyle = g; ctx.fillRect(0, H - 90, W, 90);
    return;
  }
  const chegou = Cenarios.desenhar(ctx, W, H, chaoTopo(), dtReal);
  if (chegou) {
    G.cena = chegou;
    const i = Cenarios.INFO[chegou];
    noticia(`${i.emoji} Chegaram: ${i.nome}`, '#cfc6ff');
  }
}

// troca de cenário: o grupo "caminha" até o próximo lugar
function trocarCenario(nome) {
  if (!window.Cenarios || !C.cenario.ativo || G.fase === 'partida' || G.fase === 'pausa') return false;
  const destino = nome || Cenarios.proximo();
  if (!Cenarios.viajar(destino)) return false;
  G.cena = destino; // já salva o destino (se o OBS recarregar no meio da viagem, abre no lugar certo)
  const i = Cenarios.INFO[destino];
  noticia(`🚶 O grupo segue viagem para: ${i.emoji} ${i.nome}...`, '#cfc6ff');
  return true;
}

function desenharJogador(p) {
  const X = p.x * escX();
  const folha = folhas[p.cls]; if (!folha) return;
  const s = escalaDe(p), f = quadro(p);
  const sx = (f % 4) * 256, sy = Math.floor(f / 4) * 256;
  const by = peY(p);
  ctx.save();
  if (p.estado !== 'vivo') ctx.globalAlpha = 0.55;
  if (p.escolhido || p.furia) {
    const rgb = p.escolhido ? '255,215,94' : '255,48,48';
    const g = ctx.createRadialGradient(X, by - 35, 4, X, by - 35, 70);
    g.addColorStop(0, `rgba(${rgb},0.55)`); g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g; ctx.fillRect(X - 80, by - 110, 160, 130);
    ctx.shadowColor = `rgb(${rgb})`; ctx.shadowBlur = 18;
  }
  if (p.flashAte > agoraReal()) ctx.filter = 'brightness(1.6) sepia(1) saturate(6) hue-rotate(-45deg)';
  ctx.translate(X, by);
  if (p.dir < 0) ctx.scale(-1, 1);
  ctx.drawImage(folha, sx, sy, 256, 256, -128 * s, -PE * s, 256 * s, 256 * s);
  ctx.restore();

  // nome e vida: só aparecem quando importa (ou sempre, se tiver pouca gente)
  const agora = agoraReal();
  const seta = p.setaAte > agora;
  const especial = p.escolhido || p.furia;
  const evento = p.mostrarAte > agora || especial || seta || (p.balao && p.balao.ate > agora);
  const mostrar = C.nomesSempre || lista().length <= C.nomesSempreAte || evento;
  const ty = topoY(p) - 6;
  const c = cls(p.cls);
  const emJogo = G.fase === 'partida' || G.fase === 'pausa' || G.fase === 'fim';
  if (emJogo && (mostrar || (p.estado === 'vivo' && p.vida < p.max))) {
    const bw = Math.round(40 * Math.sqrt(p.max / 100)), bh = 4;
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(X - bw / 2 - 1, ty - 1, bw + 2, bh + 2);
    ctx.fillStyle = p.estado !== 'vivo' ? '#666' : p.infeccao ? '#a6ff3c' : (p.vida / p.max > 0.4 ? '#5fe07a' : '#ff5a5a');
    ctx.fillRect(X - bw / 2, ty, bw * Math.max(0, p.vida) / p.max, bh);
    if (p.escudo) textoContorno('🛡', X + bw / 2 + 8, ty + 6, '#fff', 10);
  }
  if (mostrar) {
    let rotulo = p.nome;
    if (p.estado === 'caido') rotulo = '💀 ' + p.nome;
    if (p.estado === 'desmaiado') rotulo = '💤 ' + p.nome;
    if (p.escolhido) rotulo = '⚔ ' + p.nome;
    // nome "calmo" (sem evento) fica um pouco menor e mais suave, para a tela não poluir
    ctx.globalAlpha = (p.npc ? 0.6 : 1) * (evento ? 1 : 0.8);
    textoContorno(rotulo, X, ty - 4, seta ? '#fff' : (p.escolhido ? '#ffd75e' : c.cor), seta ? 14 : (evento ? 12 : 11), 'center', seta ? '800' : '700');
    ctx.globalAlpha = 1;
  }
  if (seta) {
    const pulo = Math.abs(Math.sin(agora * 6)) * 5;
    textoContorno('▼', X, ty - 20 - pulo, '#ffd75e', 16, 'center', '700');
  }
  if (p.marcaVamp && p.marcaVamp.ate > G.relogio && p.cls === 'humano') {
    ctx.fillStyle = '#ff2a44'; const yy = topoY(p) - 14 + Math.sin(agora * 4) * 2;
    ctx.fillRect(Math.round(X + 22), Math.round(yy), 3, 4); ctx.fillRect(Math.round(X + 23), Math.round(yy - 2), 1, 2);
  }
  if (p.infeccao && p.estado === 'vivo') {
    for (let i = 0; i < 3; i++) {
      const k = ((agora * 0.8 + i / 3 + (p.semente || 0)) % 1);
      ctx.globalAlpha = 1 - k; ctx.fillStyle = '#8dff6a';
      ctx.fillRect(Math.round(X - 10 + i * 9 + Math.sin(agora * 3 + i) * 3), Math.round(peY(p) - 20 - k * 45), 3, 3);
    }
    ctx.globalAlpha = 1;
  }
  if (p.balao && p.balao.ate > agora) textoContorno(p.balao.txt, X, ty - (seta ? 38 : 20), p.balao.cor, 12, 'center', '700');
}

function desenharEfeitos(dtReal) {
  for (let i = efeitos.length - 1; i >= 0; i--) {
    const e = efeitos[i]; e.t += dtReal;
    const k = e.t / e.dur;
    if (k >= 1) { efeitos.splice(i, 1); continue; }
    ctx.save();
    ctx.globalAlpha = 1 - k;
    if (e.tipo === 'txt') textoContorno(e.txt, e.x * escX(), e.y - k * 28, e.cor, e.tam, 'center', '700');
    else if (e.tipo === 'anel') {
      ctx.strokeStyle = e.cor; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(e.x * escX(), e.y, 10 + k * 60, 6 + k * 30, 0, 0, Math.PI * 2); ctx.stroke();
    } else if (e.tipo === 'proj') {
      ctx.globalAlpha = 1;
      const x = (e.x0 + (e.x1 - e.x0) * k) * escX(), y = e.y0 + (e.y1 - e.y0) * k - Math.sin(k * Math.PI) * 30;
      const g = ctx.createRadialGradient(x, y, 1, x, y, 12);
      g.addColorStop(0, '#fff'); g.addColorStop(0.4, e.cor); g.addColorStop(1, 'rgba(255,230,150,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}

function desenharHUD() {
  const w = 230, x = W - w - 12, y = 10;
  const linhas = [];
  if (G.fase === 'partida') linhas.push([(luzDoSol() > 0 ? '☀ ' : '⏱ ') + fmtTempo(G.fimEm - G.relogio) + (luzDoSol() > 0 ? `  · monstros ${Math.round(forcaMonstro() * 100)}%` : ''), luzDoSol() > 0 ? '#ffcf8a' : '#fff']);
  else if (G.fase === 'pausa') linhas.push(['⏸ Pausado', '#cfc6ff']);
  else if (G.fase === 'lobby') linhas.push([`Lobby · ${lista().length} na fila · !entrar`, '#8fc1ff']);
  else if (G.fase === 'fim') linhas.push(['Fim de partida', '#ffd75e']);
  else linhas.push(['Aguardando nova partida', '#cfc6ff']);
  const h = 58 + (G.fase === 'partida' || G.fase === 'pausa' || G.fase === 'fim' ? 22 : 0);
  caixa(x, y, w, h);
  textoContorno('CONTAGIUM', x + 12, y + 20, '#ffd75e', 15, 'left', '700', FONTE_TITULO);
  textoContorno('Bellum Noctis', x + 108, y + 20, '#b9a6e0', 11, 'left', '600');
  textoContorno(linhas[0][0], x + 12, y + 42, linhas[0][1], 13, 'left');
  if (h > 58) {
    const cont = c => daClasse(c).length;
    textoContorno(`🧍${cont('humano')}  🧙${cont('bruxo')}  🧟${cont('zumbi')}  🧛${cont('vampiro')}  🐺${cont('lobisomem')}`, x + 12, y + 64, '#fff', 13, 'left');
  }
  if (chatStatus !== 'conectado' && !TESTE) textoContorno(CANAL ? `chat: ${chatStatus}` : 'configure o canal em config.js', x + w, y + h + 14, '#ff9a9a', 10, 'right');
}

function desenharFeed() {
  const t = agoraReal();
  let y = 22;
  for (const n of feed) {
    const idade = t - n.t;
    if (idade > 12) continue;
    ctx.save(); ctx.globalAlpha = idade > 10 ? 1 - (idade - 10) / 2 : 1;
    textoContorno(n.msg, 14, y, n.cor, 13, 'left');
    ctx.restore();
    y += 18;
  }
}

function desenharRainha() {
  const R = G.rainha; if (!R) return;
  const im = imgRainha; if (!im) return;
  const s = C.escala * C.rainha.tamanho, X = R.x * escX(), by = H - C.margemBaixo - C.espacoFila;
  const [a, b] = SP_RAINHA[R.anim] || SP_RAINHA.parada, n = b - a + 1;
  let f = Math.floor(R.animT * C.fps); f = (R.anim === 'parada' || R.anim === 'sentada') ? f % n : Math.min(f, n - 1);
  const q = a + f;
  ctx.save();
  if (R.fase === 'saindo') ctx.globalAlpha = Math.max(0, 1 - R.animT / 1.5);
  const g = ctx.createRadialGradient(X, by - 60, 5, X, by - 60, 120);
  g.addColorStop(0, 'rgba(255,40,70,0.35)'); g.addColorStop(1, 'rgba(255,40,70,0)');
  ctx.fillStyle = g; ctx.fillRect(X - 130, by - 190, 260, 210);
  if (R.flashAte > agoraReal()) ctx.filter = 'brightness(1.35)';
  ctx.drawImage(im, (q % 4) * 256, Math.floor(q / 4) * 256, 256, 256, X - 128 * s, by - PE * s, 256 * s, 256 * s);
  ctx.restore();
  if (R.fase === 'sentada') {
    const pulso = 0.6 + 0.4 * Math.sin(agoraReal() * 3);
    ctx.save(); ctx.globalAlpha = pulso;
    textoContorno('💤 Rainha Carmesim', X, by - 175 * s, '#ff6b80', 14, 'center', '800');
    textoContorno('!atacar rainha', X, by - 158 * s, '#fff', 13, 'center', '800');
    ctx.restore();
  }
  // barra de vida grande no topo
  if (R.fase === 'levantando' || R.fase === 'luta') {
    const w = Math.min(560, W * 0.45), x = (W - w) / 2, y = 14;
    caixa(x - 10, y - 4, w + 20, 44, 8, 'rgba(20,6,14,0.85)', '#ff3b5c');
    const quem = R.provocador && G.jogadores[R.provocador] ? ` · acordada por ${G.jogadores[R.provocador].nome}` : '';
    textoContorno('👑 RAINHA CARMESIM' + quem, x, y + 12, '#ff6b80', 13, 'left', '800');
    textoContorno(`⏱ ${Math.max(0, Math.ceil(R.fimEm - G.relogio))}s`, x + w, y + 12, '#fff', 12, 'right', '700');
    ctx.fillStyle = '#2a0b14'; ctx.fillRect(x, y + 20, w, 12);
    ctx.fillStyle = '#e8203f'; ctx.fillRect(x, y + 20, w * Math.max(0, R.vida) / R.max, 12);
    ctx.strokeStyle = '#ff6b80'; ctx.strokeRect(x + 0.5, y + 20.5, w - 1, 11);
  }
}

function desenharBanner() {
  if (!banner || banner.ate < agoraReal()) return;
  ctx.save();
  const tTitulo = Math.min(30, Math.max(18, W / 45));
  ctx.font = `700 ${tTitulo}px ${FONTE_TITULO}`;
  let largura = ctx.measureText(banner.titulo).width;
  ctx.font = `700 14px ${FONTE}`;
  for (const l of banner.linhas) largura = Math.max(largura, ctx.measureText(l).width);
  const w = largura + 48, h = 22 + tTitulo + banner.linhas.length * 19 + 8;
  const x = (W - w) / 2, y = Math.max(8, H * 0.12);
  caixa(x, y, w, h, 10, 'rgba(14,8,22,0.82)', banner.cor);
  textoContorno(banner.titulo, W / 2, y + 10 + tTitulo, banner.cor, tTitulo, 'center', '700', FONTE_TITULO);
  banner.linhas.forEach((l, i) => textoContorno(l, W / 2, y + 18 + tTitulo + 18 * (i + 1), '#eee', 14));
  ctx.restore();
}

function desenharLoja() {
  if (painelLoja < agoraReal()) return;
  const itens = [
    [`!comprar escudo  (${C.loja.escudo})`, 'bloqueia o primeiro golpe'],
    [`!comprar cura  (${C.loja.cura})`, 'vida cheia na hora'],
    [`!comprar classe vampiro  (${C.loja.classe})`, 'escolhe a classe da próxima partida'],
  ];
  const w = 420, h = 40 + itens.length * 22, x = (W - w) / 2, y = Math.max(8, H * 0.12);
  caixa(x, y, w, h, 10, 'rgba(14,8,22,0.86)', '#bfe3ff');
  textoContorno('🛒 LOJA  ·  !status mostra seus pontos', W / 2, y + 22, '#bfe3ff', 14, 'center', '700');
  itens.forEach(([a, b], i) => {
    textoContorno(a, x + 16, y + 46 + i * 22, '#ffd75e', 13, 'left');
    textoContorno(b, x + w - 16, y + 46 + i * 22, '#ddd', 12, 'right', '600');
  });
}

// ---------------------------------------------------------------- loop
let ultimo = performance.now();
function loop(t) {
  const dtReal = Math.min(0.1, (t - ultimo) / 1000); ultimo = t;
  // durante a Rainha o jogo roda no máximo em 1x, mesmo no modo teste acelerado, para dar para assistir
  const velAtual = rainhaAtiva() ? Math.min(VEL, 1) : VEL;
  const dt = dtReal * velAtual;
  const viajando = window.Cenarios && Cenarios.viajando();
  if (G.fase === 'partida') { G.relogio += dt; atualizarPartida(dt); }
  else if (viajando) for (const p of lista()) { if (p.estado === 'vivo') { p.dir = 1; if (p.anim !== 'corre') setAnim(p, 'corre'); } }
  else if (G.fase !== 'pausa') for (const p of lista()) vaguear(p, dt);
  if (G.fase !== 'pausa') separar(dt);
  if (G.fase !== 'pausa') for (const p of lista()) {
    p.animT += dtReal * velAtual; // animações acompanham a velocidade (o teste em 20x se comporta igual ao 1x)
    p.x = Math.min(LW - 30, Math.max(30, p.x));
    if (G.fase === 'fim' && !p.animLoop && animTerminou(p) && p.anim === 'pulo' && Math.random() < 0.01) setAnim(p, 'pulo', true);
  }

  ctx.clearRect(0, 0, W, H);
  desenharChao(dtReal);
  desenharSol();
  const ordem = lista().sort((a, b) => b.y - a.y || (a.estado === 'vivo') - (b.estado === 'vivo'));
  for (const p of ordem) desenharJogador(p);
  desenharRainha();
  desenharEfeitos(dtReal);
  desenharFeed();
  desenharHUD();
  desenharBanner();
  desenharLoja();
  requestAnimationFrame(loop);
}

// ---------------------------------------------------------------- modo de teste
const NOMES_BOT = ['corvo_noturno', 'dona_lua', 'sr_caveira', 'gotica_br', 'lobinho77', 'bruxa_do_71', 'xX_Dracula_Xx', 'zumbilson', 'mortadela_viva', 'luz_divina', 'cripta_fm', 'abobora_maldita', 'nevoa_rubra', 'pe_de_cabra', 'gato_preto', 'sangue_bom', 'coveiro_sincero', 'vela_acesa', 'morcegao', 'tia_lilith', 'osso_duro', 'caixao_vip', 'eclipse_total', 'garra_afiada', 'alho_sem_medo'];
let botN = 0;
function botsEntram(n) {
  for (let i = 0; i < n; i++) {
    const base = NOMES_BOT[botN % NOMES_BOT.length] + (botN >= NOMES_BOT.length ? '_' + Math.floor(botN / NOMES_BOT.length) : '');
    botN++;
    comando({ login: base.toLowerCase(), nome: base, mod: false }, '!entrar');
  }
}
function montarPainelTeste() {
  const el = document.getElementById('painel-teste');
  el.hidden = false;
  el.innerHTML = `
    <b>MODO TESTE</b>
    <button data-c="!abrir">Abrir lobby</button>
    <button data-b="5">+5 viewers</button>
    <button data-b="20">+20 viewers</button>
    <button data-c="!iniciar">Iniciar</button>
    <button data-c="!pausar">Pausar</button>
    <button data-c="!continuar">Continuar</button>
    <button data-c="!encerrar">Encerrar</button>
    <button data-c="!rainha">👑 Rainha</button>
    <button id="t-provocar">⚔ Provocar</button>
    <label>Velocidade <select id="vel"><option>1</option><option>3</option><option selected>5</option><option>20</option></select></label>
    <span class="sep"></span>
    <input id="t-user" value="voce" size="10" title="quem está digitando">
    <input id="t-msg" placeholder="!bater @nome" size="18">
    <label><input type="checkbox" id="t-mod" checked> mod</label>
    <button id="t-enviar">Enviar</button>
    <label><input type="checkbox" id="t-bots"> bots usam comandos</label>
    <button id="t-zerar" title="apaga o save de teste">Zerar</button>
    <span class="sep"></span>
    <button id="t-rapida">Rodada rápida com</button><input id="t-qtd" value="6" size="3"> viewers
    <div id="t-stats"></div>`;
  VEL = 5;
  el.querySelector('#vel').onchange = e => { VEL = Number(e.target.value); };
  el.querySelectorAll('[data-c]').forEach(b => b.onclick = () => comando({ login: 'streamer', nome: 'Streamer', mod: true }, b.dataset.c));
  el.querySelectorAll('[data-b]').forEach(b => b.onclick = () => botsEntram(Number(b.dataset.b)));
  const enviar = () => {
    const nome = el.querySelector('#t-user').value.trim() || 'voce';
    comando({ login: nome.toLowerCase(), nome, mod: el.querySelector('#t-mod').checked }, el.querySelector('#t-msg').value);
    el.querySelector('#t-msg').value = '';
  };
  el.querySelector('#t-enviar').onclick = enviar;
  el.querySelector('#t-msg').onkeydown = e => { if (e.key === 'Enter') enviar(); };
  el.querySelector('#t-provocar').onclick = () => {
    const p = escolha(vivos()); if (p) comando({ login: p.login, nome: p.nome, mod: false }, '!atacar rainha');
  };
  el.querySelector('#t-rapida').onclick = () => {
    const mod = { login: 'streamer', nome: 'Streamer', mod: true };
    comando(mod, '!encerrar'); comando(mod, '!abrir'); botN = 0;
    botsEntram(Math.max(1, Number(el.querySelector('#t-qtd').value) || 6));
    comando(mod, '!iniciar');
  };
  setInterval(() => {
    const v = G.vitorias, P = G.partida;
    let h = `<b>Placar dos testes:</b> ☀ Luz ${v.luz} · 🧟 ${v.zumbi} · 🧛 ${v.vampiro} · 🐺 ${v.lobisomem}`;
    if (P && P.est) {
      const e = P.est, npcs = lista().filter(p => p.npc).length;
      h += `<br><b>Esta partida:</b> ${lista().length} bonecos (${npcs} NPCs) · contaminações 🧟${P.contam.zumbi} 🧛${P.contam.vampiro} 🐺${P.contam.lobisomem}`;
      h += `<br><b>Especialidades:</b> 🧟 mordidas rápidas ${e.mordidaRapida}, infecções ${e.infeccoes} (viraram zumbi ${e.contamPorInfeccao}, curadas ${e.infeccoesCuradas}) · 🧛 vida roubada ${e.rouboVida} · 🐺 golpes aguentados ${e.golpesAbsorvidosLobo} · 🧙 curas ${e.curas}, purificações ${e.purif}`;
      h += `<br><b>Monstros derrubados:</b> 🧟${e.quedas.zumbi} 🧛${e.quedas.vampiro} 🐺${e.quedas.lobisomem}`;
    }
    el.querySelector('#t-stats').innerHTML = h;
  }, 500);
  el.querySelector('#t-zerar').onclick = () => { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} const cena = G.cena, prox = G.proximaCena; G = novoEstado(); G.cena = cena; G.proximaCena = prox; banner = null; botN = 0; };
  // bots que de vez em quando escolhem alvo pelo chat
  setInterval(() => {
    if (!el.querySelector('#t-bots').checked || G.fase !== 'partida') return;
    const p = escolha(vivos()); if (!p) return;
    const alvos = vivos().filter(q => p.cls === 'bruxo' ? (LUZ.includes(q.cls) && q.vida < q.max) : (inimigos(p, q) && Math.abs(q.x - p.x) <= C.raioCaca * fW()));
    if (!alvos.length) return;
    const cmdNome = p.cls === 'bruxo' ? '!curar' : p.cls === 'humano' ? '!bater' : '!morder';
    comando({ login: p.login, nome: p.nome, mod: false }, `${cmdNome} @${escolha(alvos).login}`);
  }, 2500);
}

// acesso para depuração (console do navegador)
window.__contagium = {
  comando, botsEntram, estado: () => G, setVel: v => { VEL = v; },
  // avança a partida sem desenhar (para testes rápidos no console)
  avancar(segundosJogo, vel = 1) {
    const passo = 1 / 30;
    for (let t = 0; t < segundosJogo && G.fase === 'partida'; t += passo * vel) {
      G.relogio += passo * vel; atualizarPartida(passo * vel); separar(passo * vel);
      for (const p of lista()) { p.animT += passo * vel; p.x = Math.min(LW - 30, Math.max(30, p.x)); }
    }
    return G.fase;
  },
};

// ---------------------------------------------------------------- início
(async function iniciar() {
  carregarEstado();
  await carregarImagens();
  if (window.Cenarios) {
    // primeira vez: cenário sorteado
    if (!G.cena) { const ns = C.cenario.ordem; G.cena = ns[Math.floor(Math.random() * ns.length)]; }
    Cenarios.definir(G.cena);
  }
  if (TESTE) montarPainelTeste(); else conectarChat();
  if (G.fase === 'lobby') mostrarBanner('CONTAGIUM: BELLUM NOCTIS', ['A noite vai cair... digite !entrar para jogar'], '#ffd75e', 0);
  if (G.fase === 'pausa') mostrarBanner('⏸ PAUSADO', [], '#cfc6ff', 0);
  requestAnimationFrame(loop);
})();

})();
