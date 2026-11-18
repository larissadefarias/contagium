# Contagium: Bellum Noctis — guia do streamer

Overlay de jogo para a live da Twitch. Os viewers entram pelo chat, cada um vira um bonequinho (humano, bruxo, zumbi, vampiro ou lobisomem) e a batalha acontece sozinha na faixa de baixo da tela. Quem quiser pode escolher alvos pelo chat.

---

## 1. Arquivos

| Arquivo | Para quê |
|---|---|
| `contagium.html` | O jogo. É este arquivo que vai no OBS |
| `teste.html` | Abre o **modo teste**: bots, botões de controle e estatísticas |
| `config.js` | **Todos os números** do jogo e o **nome do canal** (dá para editar no Bloco de Notas) |
| `jogo.js` | Regras, desenho dos bonecos e leitura do chat |
| `cenarios.js` | Os 4 cenários em camadas (parallax) |
| `assets/personagens` | Folhas de animação dos personagens |
| `assets/cenario` | Peças do cemitério 16px |
| `ferramentas/` | Simulador de partidas e o script que gera o `humano.png` |
| `TUTORIAL-VIEWERS.md` | Textos prontos para o chat, o bot e o painel da Twitch |

---

## 2. Colocar na live

1. Abra o `config.js` e coloque o nome do canal: `canal: "seucanal",`
2. No OBS: **Fontes → + → Navegador**
3. Marque **Arquivo local** e escolha `contagium.html`
4. Largura **1920**, altura **300** (ou a altura da faixa que você quiser)
5. **Desmarque** "Desligar a fonte quando não estiver visível" e "Atualizar o navegador quando a cena ficar ativa"
6. Posicione a fonte na parte de baixo da tela

Depois de mudar o `config.js`: botão direito na fonte → **Atualizar**.

O jogo **salva sozinho**. Se o OBS fechar, a partida continua de onde parou.

**Testar sem ir ao ar:** o chat do seu canal funciona mesmo offline. Abra o OBS com a fonte, entre no seu chat pela Twitch e digite `!abrir`, `!entrar` e `!iniciar`.

---

## 3. Comandos

### Streamer e moderadores
| Comando | O que faz |
|---|---|
| `!abrir` | Abre o lobby (depois de uma partida, o grupo viaja para o cenário de quem venceu) |
| `!iniciar` | Sorteia as classes e começa a partida |
| `!pausar` / `!continuar` | Congela e retoma |
| `!encerrar` | Termina a partida agora |
| `!tempo 20` | Duração da partida em minutos |
| `!rainha` | Chama o evento da Rainha Carmesim (só durante a partida) |
| `!cenario` / `!cenario castelo` | Troca de cenário (só fora da partida) |
| `!resetar` | Destrava o jogo se algo der errado (mantém os pontos) |

### Viewers
| Comando | O que faz |
|---|---|
| `!entrar` | Entra no lobby. Com a partida rolando, assume o lugar de um NPC |
| `!bater @nome` / `!morder @nome` | Escolhe quem atacar (só alvos por perto). Vale por até 3 ações |
| `!curar @nome` | Bruxo: cura um humano ou bruxo (e tira a infecção) |
| `!purificar @nome` | Bruxo: transforma um monstro caído de volta em humano |
| `!atacar rainha` | Acorda a Rainha quando ela está no trono |
| `!auto` | Volta para o automático |
| `!status` | Mostra classe, vida e pontos em cima do bonequinho |
| `!eu` (ou qualquer mensagem) | Mostra uma setinha em cima do seu bonequinho |
| `!loja` | Mostra a loja |
| `!ajuda` (ou `!comandos`) | Mostra na tela o painel "Como jogar" |
| `!comprar escudo` / `!comprar cura` / `!comprar classe vampiro` | Gasta pontos |

---

## 4. Como o jogo funciona

**Partida**
- Duração padrão de **20 minutos**. Na prática, a partida costuma terminar entre 9 e 13 minutos.
- Toda partida tem **no mínimo 12 bonecos**. O que faltar é completado com **NPCs** (Aldeão, Ferreiro, Cria da Noite...), que não ganham pontos.
- Divisão: cerca de **65% humanos, 10% bruxos e 25% monstros**, sempre com as **3 raças**.
- **Formação:** humanos e bruxos à esquerda, monstros à direita. Quem é contaminado atravessa a tela.

**Classes**
| Classe | Vida | Especialidade |
|---|---|---|
| 🧍 Humano | 100 | Se defende de quem chega perto (dano 17) |
| 🧙 Bruxo | 100 | Cura e purifica. Nunca vira monstro: desmaia e acorda depois |
| 🧟 Zumbi | 100 | **Mordida rápida** (o humano vira zumbi com 15 de vida ou menos; 10 se o zumbi foi transformado). **Paciente Zero:** enquanto houver só 1 zumbi, a mordida dele **infecta** |
| 🧛 Vampiro | 100 | **Recupera vida** a cada golpe. **Marca de Sangue:** quem ele morde e é contaminado logo em seguida vira vampiro |
| 🐺 Lobisomem | 250 | O tanque |

**Regras**
- O humano vira a raça de **quem deu o último golpe**.
- Monstro derrubado fica caído: o bruxo pode purificá-lo, ou ele levanta sozinho depois de um tempo.
- Monstros também brigam entre si, mas sem se contaminar.

**Momentos especiais**
- ⚔ **Último humano:** ganha a Luz Sagrada (imunidade e golpe 3x em área, com brilho dourado).
- 🩸 **Último monstro:** entra em Fúria da Noite (imunidade e golpe 2x, com brilho vermelho).
- ☀ **Amanhecer:** a partir da metade da partida, os monstros enfraquecem aos poucos.

**Vitória**
- ☀ Humanos e bruxos vencem se sobreviverem até o fim, ou se não sobrar nenhum monstro.
- Se todos os humanos forem contaminados, vence a raça que **mais contaminou**.
- Os vencedores ganham **+100 pontos**.

---

## 5. 👑 Evento: a Rainha Carmesim
1. Um mod digita `!rainha`. Ela chega **sentada no trono**, e a partida continua normal.
2. Quando alguém do chat digita `!atacar rainha`, ela **se levanta** e começa a **trégua**: todos atacam a Rainha, e ela ataca todos em volta.
3. Os jogadores têm **120 segundos** para derrotá-la.
   - **Se derrotarem:** +20 pontos para quem lutou e é da mesma espécie do golpe final, +30 para o golpe final, +50, +30 e +20 para o top 3 de dano, e um bônus para o lado do golpe final.
   - **Se o tempo acabar:** ela drena 20% da vida de todos e vai embora.
4. Se ninguém provocá-la em 2 minutos, ela volta a dormir.

---

## 6. Cenários
Há 4 cenários, cada um ligado a um lado:
- 🪦 **Cemitério** (zumbi)
- 🌲 **Floresta da Lua Cheia** (lobisomem)
- 🏰 **Castelo Carmesim** (vampiro)
- ⛪ **Catedral** (humanos e bruxos)

A primeira partida começa num cenário sorteado. Depois, a cada novo lobby, o grupo **viaja para a casa de quem venceu**.

---

## 7. Pontos e loja
- **Como ganhar pontos:**
  - vitória: +100;
  - contaminar: +5;
  - derrubar um monstro: +5 (derrubar um monstro de raça rival: +10);
  - purificar: +10;
  - curar: +1;
  - eventos da Rainha.
- **Loja:**
  - escudo (120): bloqueia o primeiro golpe;
  - cura (60): vida cheia na hora;
  - classe (300): escolhe a classe da próxima partida.

---

## 8. Modo teste (`teste.html`)
- **Abrir lobby**, **+5 / +20 viewers**, **Iniciar**, **Encerrar**, **👑 Rainha** e **⚔ Provocar**.
- **Rodada rápida com N viewers**: encerra, abre e começa uma nova partida num clique.
- **Velocidade**: 1x a 20x. A Rainha sempre roda em 1x para dar para assistir.
- **"bots usam comandos"**: os bots escolhem alvos pelo chat.
- **Placar e estatísticas**: vitórias de cada lado e quantas vezes cada especialidade aconteceu.
- **Zerar**: apaga o save de teste (não mexe nos pontos da live).
- ⚠ Não deixe **duas abas** do teste abertas ao mesmo tempo, porque uma salva por cima da outra.

---

## 9. Ajustes comuns no `config.js`
| O que você quer | Onde mexer |
|---|---|
| Partidas mais longas ou mais curtas | `duracaoPadraoMin` |
| Bonecos maiores ou menores | `escala` |
| Esconder os nomes de quem está parado | `nomesSempre: false` |
| Um lado mais forte ou mais fraco | os números de cada classe em `classes` |
| Rainha mais difícil ou mais fácil | `rainha.vidaPorBoneco` e `rainha.duracaoSeg` |
| Ordem dos cenários fixa em vez de "casa do vencedor" | `cenario.porVencedor: false` |
