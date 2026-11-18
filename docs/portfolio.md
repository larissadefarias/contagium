# Contagium: Bellum Noctis (texto para portfólio)

Textos prontos em três tamanhos. Use o que couber no seu portfólio, no LinkedIn ou no Behance.

---

## Versão curta (card ou legenda)
**Contagium: Bellum Noctis**: um jogo de infecção para o chat da Twitch, que roda como overlay no OBS. Os viewers entram pelo chat e viram humanos, bruxos, zumbis, vampiros ou lobisomens numa batalha automática em pixel art. JavaScript puro, Canvas 2D e o chat da Twitch via WebSocket, sem servidor.

🔗 github.com/larissadefarias/contagium

---

## Versão média (descrição do projeto)
Criei com a Amanda Gauna o **Contagium**, um minigame para lives na Twitch inspirado em jogos de overlay como o RiftStream, mas com uma ideia própria: **uma infecção que se espalha pelo chat**.

Cada viewer que digita `!entrar` vira um bonequinho na parte de baixo da tela. Humanos tentam sobreviver, bruxos curam e purificam, e zumbis, vampiros e lobisomens contaminam, cada um com sua especialidade. A batalha acontece sozinha, mas o chat pode interferir com comandos. Há eventos dramáticos, como o último humano recebendo a Luz Sagrada, o amanhecer enfraquecendo os monstros e a **Rainha Carmesim**, uma chefe que só acorda quando alguém do chat tem coragem de provocá-la.

**Destaques técnicos**
- Overlay em **HTML, Canvas 2D e JavaScript puro**, aberto como arquivo local no OBS, **sem servidor**.
- Leitura do chat pelo **IRC da Twitch via WebSocket**, de forma anônima.
- **Cenários em pixel art gerados por código**, com parallax e transição entre eles.
- **Simulador de equilíbrio em Node.js**, que roda centenas de partidas com o mesmo código do jogo.
- Salvamento automático: a partida sobrevive se o OBS fechar.

---

## Versão longa (estudo de caso)

### O desafio
Criar um jogo que **qualquer streamer** pudesse usar, com 5 ou com 50 viewers, sem servidor e sem custo, e que fosse **divertido de assistir** mesmo para quem não digita nada.

### Decisões de design
- **Automático por padrão, controle opcional.** O boneco luta sozinho e o chat só escolhe alvos se quiser. Ninguém fica de fora por estar no celular.
- **Identidade para cada classe.** O zumbi contamina rápido, o vampiro rouba vida e "reivindica" a vítima com a Marca de Sangue, o lobisomem é o tanque, e o bruxo é o herói que cura e purifica.
- **Momentos de virada.** O último humano ganha poder, o último monstro entra em fúria, e o amanhecer enfraquece os monstros no fim da partida.
- **Lives pequenas.** NPCs com nomes temáticos completam a partida, e quem chega depois assume o lugar de um deles.
- **Legibilidade.** Os bonecos ficam em formação (luz × trevas), em fileiras, com nomes sempre visíveis e uma setinha para cada viewer se achar.

### Balanceamento com dados
Em vez de ajustar os números "no olho", escrevi um **simulador** que roda partidas inteiras sem navegador, usando o mesmo código do jogo. Ele revelou problemas que seriam difíceis de perceber jogando:
- os humanos venciam **100%** das partidas quando o chat usava comandos. A causa eram os monstros "mergulhando" no meio da formação humana, e a solução foi limitar o alcance dos comandos;
- o equilíbrio **mudava com a largura da janela**, o que levou a um campo lógico fixo de 1920 px;
- no modo de teste acelerado, a animação curta do zumbi dava vantagem a ele, então as animações passaram a acompanhar a velocidade;
- o zumbi sozinho quase nunca contaminava, e daí nasceu a mecânica do "Paciente Zero" (infecção).

O resultado: as quatro facções vencem em proporções parecidas, em partidas pequenas e grandes.

### Visual
Os personagens vêm de um pacote de pixel art. O humano foi **recolorido por script**, trocando a armadura vermelha por azul e a pele pálida por tom humano. O cemitério usa um tileset 16px recolorido, e a **floresta, o castelo e a catedral são desenhados proceduralmente**, cada um ligado a uma facção. A próxima partida acontece na "casa" de quem venceu.

### Tecnologias
JavaScript · Canvas 2D · WebSocket (IRC da Twitch) · localStorage · Node.js · PowerShell/C# (processamento de imagem) · OBS Studio

---

## English (short)
**Contagium: Bellum Noctis** is a Twitch chat infection game that runs as an OBS browser-source overlay. Viewers type `!entrar` to join as humans, wizards, zombies, vampires or werewolves in an auto-battling pixel art strip. It has no server: plain JavaScript and Canvas, reading Twitch chat over WebSocket IRC. It features procedurally drawn parallax scenes, a chat-triggered boss event, and a Node.js simulator used to balance the factions with data from hundreds of simulated matches.

---

## Dicas de apresentação
- **Mídia que mais chama atenção:** um **GIF de 10 a 15 segundos** (o lobby enchendo, a infecção se espalhando, a Rainha acordando) e um **print de cada cenário** (já estão na pasta `docs/`).
- **Mostre o processo**, não só o resultado: um gráfico ou tabela do simulador "antes e depois" de algum ajuste conta muito.
- **Coloque o link do repositório** e, se tiver, um trecho de VOD da live com o jogo rodando.
