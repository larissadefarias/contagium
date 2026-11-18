# Tutorial para os viewers

Textos prontos para copiar e colar na Twitch. Além deles, o próprio jogo explica como jogar:
- **no lobby**, aparecem dicas girando na tela;
- **`!ajuda`** (ou `!comandos`) abre um painel "Como jogar" por alguns segundos.

---

## 1. Mensagem fixada no chat
Cabe no limite de 500 caracteres da Twitch:

```
🩸 CONTAGIUM: digite !entrar quando o lobby abrir e vire um bonequinho na tela! A maioria começa HUMANO; zumbis, vampiros e lobisomens tentam contaminar todo mundo, e os bruxos curam. Seu boneco luta sozinho, mas você pode escolher o alvo com !bater @nome (bruxo: !curar @nome). !perfil mostra sua vida e pontos, !eu mostra onde você está, !loja gasta pontos. Dúvidas? !ajuda
```

---

## 2. Comando de bot (Nightbot, StreamElements, Streamer.bot)
Crie um comando **`!contagium`** com este texto:

```
🩸 Como jogar: !entrar no lobby → você vira um boneco (humano, bruxo ou monstro) e luta sozinho. Escolha alvos com !bater @nome, bruxos usam !curar @nome. Humanos vencem sobrevivendo, monstros vencem contaminando. !ajuda na tela mostra tudo.
```

Também dá para programar o bot para **repetir a mensagem a cada 15 minutos**, assim quem chega na live descobre o jogo.

---

## 3. Painel da Twitch ("Sobre" do canal)
**Título:** 🩸 Contagium: o jogo do chat

**Texto:**

> Durante a live, o chat vira um exército de bonequinhos na parte de baixo da tela!
>
> **Como entrar:** quando o lobby abrir, digite `!entrar`.
>
> **As classes**
> - 🧍 **Humano:** a maioria. Tente sobreviver até o amanhecer!
> - 🧙 **Bruxo:** cura humanos e transforma monstros caídos de volta em humanos.
> - 🧟 **Zumbi:** contamina rápido.
> - 🧛 **Vampiro:** rouba vida a cada mordida.
> - 🐺 **Lobisomem:** muito resistente.
>
> **Como funciona:** seu boneco luta sozinho. Se quiser, escolha o alvo com `!bater @nome` ou `!morder @nome`. Bruxos usam `!curar @nome` e `!purificar @nome`.
>
> **Quem vence:** humanos e bruxos, se sobreviverem até o fim. Se todos os humanos forem contaminados, vence a raça de monstro que mais contaminou.
>
> **Pontos:** vencer, contaminar, curar e purificar dão pontos. Gaste na `!loja`: escudo, cura ou escolher sua classe na próxima partida.
>
> **Outros comandos:** `!perfil` (sua vida e pontos), `!eu` (mostra onde você está), `!ajuda` (como jogar na tela).
>
> 👑 **Cuidado com a Rainha Carmesim:** se ela aparecer no trono, alguém precisa ter coragem de digitar `!atacar rainha`...

---

## 4. Roteiro rápido para explicar falando (primeira live)
1. "Quando eu abrir o lobby, digitem **!entrar**. Cada um vira um bonequinho aqui embaixo."
2. "A maioria vai ser **humano**. Alguns viram **monstro** e vão tentar contaminar vocês. Os **bruxos** curam."
3. "Vocês não precisam fazer nada, o boneco luta sozinho. Mas quem quiser pode escolher em quem bater com **!bater @nome**."
4. "Quem ganhar leva **pontos**, e dá para gastar na **!loja**."
5. "Se perderem o boneco na tela, digitem **!eu**. Se esquecerem os comandos, **!ajuda**."
