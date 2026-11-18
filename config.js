// =====================================================================
//  CONTAGIUM: Bellum Noctis — CONFIGURAÇÕES
//  Tudo o que é número de balanceamento fica aqui. Mude, salve o arquivo
//  e recarregue a fonte no OBS (botão "Atualizar a página do cache atual").
//  Tempos estão em SEGUNDOS, a não ser quando o nome diz "Min".
// =====================================================================
window.CONFIG = {
  // Nome do seu canal na Twitch (sem o #). Também dá para passar na URL: contagium.html?canal=seucanal
  canal: "amandrakee",

  // Duração padrão de cada partida, em minutos (os mods podem mudar com !tempo 30)
  duracaoPadraoMin: 20,

  // Velocidade do jogo (1 = normal). Útil só para testes.
  velocidade: 1,

  // ---------------- Distribuição no início da partida ----------------
  // Humanos são o resto (~65%). As 3 raças de monstro sempre aparecem, divididas por igual.
  distribuicao: {
    monstros: 0.25,      // 25% dos bonecos começam como monstro
    bruxos: 0.10,        // 10% começam como bruxo
    minimoMonstros: 3,   // pelo menos 1 zumbi, 1 vampiro e 1 lobisomem
    minimoBruxos: 1,
  },
  // A partida sempre tem pelo menos esse número de bonecos.
  // Se faltar gente, o jogo completa com NPCs (Aldeão, Ferreiro, Cria da Noite...), que não ganham pontos.
  // Quem der !entrar com a partida rolando assume o lugar de um NPC.
  minimoBonecos: 12,     // 12 = os 3 monstros obrigatórios ficam em 25%, como numa partida grande
  // Em partidas pequenas (ex.: 8 bonecos com 3 monstros = 37%), os monstros batem mais fraco na mesma proporção
  compensarPartidaPequena: true,
  minimoReais: 1,        // quantas pessoas de verdade precisam ter entrado para o !iniciar funcionar

  // ---------------- Classes ----------------
  // vida: vida máxima | recarga: segundos entre uma ação e outra
  // sprite: arquivo em assets/personagens | filtro: recolorir (CSS filter)
  classes: {
    humano: {
      nome: "Humano", emoji: "🧍", cor: "#8fc1ff",
      vida: 100, recarga: 15,
      dano: 17,        // humano bate um pouco mais fraco que os monstros (padrão é 20)
      raioDefesa: 260, // no automático, só ataca monstros que chegarem até essa distância
      sprite: "xxg_4",    // animações do Espadachim Escarlate...
      arquivo: "humano",  // ...usando a versão recolorida (armadura azul, pele humana)
      filtro: "",
    },
    bruxo: {
      nome: "Bruxo", emoji: "🧙", cor: "#ffd75e",
      vida: 100, recarga: 10,
      cura: 25,          // vida que a cura devolve
      recargaPurificar: 30, // segundos EXTRAS de espera depois de purificar (purificar é poderoso)
      alcance: 320,      // distância (em pixels) de onde ele consegue curar/purificar
      desmaioSeg: 90,    // tempo desmaiado quando a vida zera
      vidaAoAcordar: 0.5, // volta com 50% da vida
      sprite: "xxg_3",   // Lich do Cajado recolorido para branco/dourado
      filtro: "sepia(0.9) saturate(1.8) hue-rotate(5deg) brightness(1.7)",
    },
    zumbi: {
      nome: "Zumbi", emoji: "🧟", cor: "#9be07a",
      vida: 100, recarga: 8,
      // Mordida rápida: humano com essa vida (ou menos) depois da mordida já vira zumbi
      contaminaAbaixo: 15,            // zumbis que começaram a partida como zumbi
      contaminaAbaixoTransformado: 10, // zumbis que foram transformados durante a partida
      // Mordida infectada ("paciente zero"): enquanto houver só 1 zumbi na partida, a mordida dele infecta.
      // O infectado perde mais "infeccaoTotal" de vida ao longo de "infeccaoSeg"; se chegar ao limite
      // da mordida rápida, vira zumbi. A cura do bruxo tira a infecção.
      infeccaoTotal: 20,
      infeccaoSeg: 6,
      infeccaoAteZumbis: 1, // a infecção só existe enquanto houver até esse número de zumbis
      sprite: "xxg_2", filtro: "",
    },
    vampiro: {
      nome: "Vampiro", emoji: "🧛", cor: "#ff5a6e",
      vida: 100, recarga: 8,
      rouboVida: 13, // vida que recupera a cada golpe
      // Marca de Sangue: quem leva uma mordida de vampiro fica marcado por esse tempo;
      // se for contaminado por qualquer monstro nesse período, vira VAMPIRO.
      marcaSeg: 1.5,
      sprite: "xxg_5", filtro: "",
    },
    lobisomem: {
      nome: "Lobisomem", emoji: "🐺", cor: "#c9a98a",
      vida: 250, recarga: 8, // o tanque
      sprite: "xxg_1", filtro: "",
    },
  },

  // ---------------- Combate ----------------
  dano: 20,               // dano de um golpe (classes podem ter o próprio "dano" acima)
  alcanceCorpo: 55,       // distância para golpe corpo a corpo (pixels)
  raioCaca: 300,          // pelo chat (!bater/!morder), só dá para mirar em quem está até essa distância
  acoesPorComando: 3,     // um !bater/!morder/!curar vale por até 3 ações; depois o boneco volta ao automático
  maxAtacantes: 3,        // no automático, no máximo 3 atacam o mesmo alvo ao mesmo tempo
  focoHumanos: 0.8,       // no automático, 80% das vezes o monstro ataca humanos/bruxos (20% raças rivais)
  vidaAoVirar: 0.6,       // quem é contaminado começa com 60% da vida da nova classe
  levantarSeg: 60,        // monstro derrubado levanta sozinho depois desse tempo
  vidaAoLevantar: 0.5,    // ...com 50% da vida
  vidaAoPurificar: 0.5,   // monstro purificado vira humano com 50% da vida

  // ---------------- Último humano (o Escolhido) ----------------
  escolhido: {
    minimoHumanosInicio: 3, // só acontece se a partida começou com pelo menos 3 humanos
    imunidadeSeg: 90,       // fica imune por esse tempo
    multiplicadorDano: 3,   // golpe 3x mais forte
    area: 140,              // o golpe atinge todos os monstros nessa distância
  },

  // ---------------- Último monstro (Fúria da Noite) ----------------
  furia: {
    imunidadeSeg: 60,
    multiplicadorDano: 2,
  },

  // ---------------- Amanhecer ----------------
  // A partir de "comecaEm" (fração da partida) o sol vai nascendo e o dano dos monstros cai aos poucos,
  // até chegar a "forcaMinimaMonstros" no último segundo da partida.
  amanhecer: {
    ativo: true,
    comecaEm: 0.5,             // 0.5 = na metade da partida
    forcaMinimaMonstros: 0.4,  // no fim, monstros batem com 40% da força
  },

  // ---------------- Ritmo ----------------
  // Os tempos de recarga acima valem para uma partida de 15 minutos.
  // Em partidas mais longas o jogo espaça as ações sozinho
  // (recarga, tempo caído e desmaio).
  duracaoBaseMin: 15,
  // Quanto mais longa a partida, mais devagar (cresce mais que proporcional para a partida render o tempo todo).
  // Com 1.6: 30 min → ações ~3x mais espaçadas; 60 min → ~9x.
  ritmoExpoente: 1.6,

  // ---------------- Evento: A Rainha Despertou (!rainha, só dono e mods, durante a partida) ----------------
  rainha: {
    esperaSeg: 120,          // depois do !rainha ela fica sentada esperando alguém digitar "!atacar rainha"; se ninguém provocar, ela vai embora
    pontosProvocar: 10,      // pontos para quem teve coragem de acordá-la
    duracaoSeg: 120,         // tempo para derrotá-la depois de acordar (o relógio da partida espera o evento)
    vidaPorBoneco: 96,       // vida da Rainha = isso × número de bonecos
    dano: 25,                // dano do golpe dela
    alvosPorGolpe: 4,        // quantos ela acerta de uma vez
    alcance: 260,            // distância do golpe dela
    recarga: 4,              // segundos entre um golpe e outro
    tamanho: 2,              // tamanho em relação aos outros bonecos
    drenoAoFugir: 0.2,       // se ninguém a derrotar, ela drena 20% da vida de todos
    bencaoSeg: 30,           // se um monstro der o golpe final, a raça dele ganha "Sangue Real" por esse tempo
    multiplicadorBencao: 1.5,
    pontosTop: [50, 30, 20], // pontos extras para os 3 que mais causaram dano
    pontosParticipacao: 20,  // se ela for derrotada: pontos para quem lutou e é da mesma espécie de quem deu o golpe final
    pontosGolpeFinal: 30,    // pontos extras para quem deu o golpe final
  },

  // ---------------- Pontos ----------------
  pontos: {
    vitoria: 100,         // cada jogador do lado vencedor
    contaminar: 5,
    derrubarMonstro: 5,   // humano derruba monstro
    derrubarRival: 10,    // monstro derruba monstro de outra raça
    purificar: 10,
    curar: 1,
  },
  loja: {
    escudo: 120, // bloqueia o primeiro golpe recebido
    cura: 60,    // vida cheia na hora (só durante a partida)
    classe: 300, // escolher a classe na próxima partida: !comprar classe vampiro
  },

  // ---------------- Visual ----------------
  resultadoNaTelaSeg: 60, // quanto tempo o resultado da partida fica na tela
  escala: 0.55,          // tamanho dos bonequinhos
  margemBaixo: 18,       // distância do chão até a borda de baixo da tela
  fileiras: 3,           // quantas fileiras de profundidade (as de trás ficam um pouco menores)
  espacoFila: 13,        // distância em pixels entre uma fileira e outra
  espacoPessoal: 34,     // distância mínima entre dois bonecos na mesma fileira
  nomesSempre: true,     // nomes de todo mundo sempre visíveis (para cada viewer se achar na tela)
  nomesSempreAte: 10,    // com até 10 bonecos os nomes ficam sempre visíveis; acima disso só quando algo acontece
  destaqueChatSeg: 5,    // quem fala no chat (ou digita !eu) ganha setinha e nome em destaque por esse tempo
  velocidadeAndar: 110,  // pixels por segundo
  fps: 10,               // velocidade das animações
  // ---------------- Cenário (cemitério 16px, montado e recolorido pelo jogo) ----------------
  cenario: {
    ativo: true,
    escalaPixel: 3,        // cada pixel do pacote vira 3x3 na tela
    // recolore o pacote para os tons escuros/arroxeados dos personagens
    filtro: "hue-rotate(95deg) saturate(0.7) brightness(0.62) contrast(1.1)",
    silhueta: true,        // lápides e colinas escuras ao fundo
    opacidadeSilhueta: 0.7,
    nevoa: true,           // névoa roxa rasteira por cima do chão
    densidade: 1,          // quantidade de objetos (lápides, cercas, árvores...)
    semente: 7,            // mude o número para sortear outra arrumação dos cenários
    // ordem dos cenários: cemitério (zumbi) → floresta (lobisomem) → castelo (vampiro) → catedral (humanos e bruxos)
    ordem: ["cemiterio", "floresta", "castelo", "igreja"],
    // O próximo cenário é a "casa" de quem venceu a última partida. A primeira partida começa num cenário sorteado.
    porVencedor: true,
    casaDe: { luz: "igreja", zumbi: "cemiterio", vampiro: "castelo", lobisomem: "floresta" },
    sortear: false,              // (se porVencedor = false) true = sorteado, false = segue a ordem
    trocarACadaPartida: true,    // ao abrir um novo lobby depois de uma partida, o grupo viaja para o próximo cenário
    viagemSeg: 6,                // duração da caminhada entre um cenário e outro
    velocidadeViagem: 260,       // velocidade das camadas durante a caminhada
    derivaCamera: 0,             // >0 faz o cenário deslizar devagar o tempo todo (pixels por segundo)
  },

  // Logins extras (além dos mods e do dono do canal) que podem usar comandos de controle
  moderadoresExtras: [],
};
