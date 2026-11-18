# Arte do jogo (não incluída no repositório)

As imagens são de pacotes de terceiros, e as licenças não permitem redistribuir os arquivos. Para rodar o jogo, baixe os pacotes e coloque os arquivos assim:

## Personagens: `assets/personagens/`
Pacote **Gothic Vampire Undead Horde – 7 Pixel Art Character Sprite Pack** (itch.io), arquivo `Sprite_pack.zip`.

Copie para esta pasta: `xxg_1.png`, `xxg_2.png`, `xxg_3.png`, `xxg_4.png`, `xxg_5.png`, `xxg_6.png`, `xxg_8.png` e `group_info.txt`.

Depois gere o humano recolorido (no PowerShell, na pasta do projeto):

```powershell
.\ferramentas\gerar-humano.ps1
```

| Arquivo | Usado como |
|---|---|
| `xxg_1.png` | 🐺 Lobisomem |
| `xxg_2.png` | 🧟 Zumbi |
| `xxg_3.png` | 🧙 Bruxo (recolorido em dourado pelo jogo) |
| `xxg_4.png` → `humano.png` | 🧍 Humano |
| `xxg_5.png` | 🧛 Vampiro |
| `xxg_8.png` | 👑 Rainha Carmesim (evento) |

## Cemitério: `assets/cenario/`
Pacote **2D 16px Graveyard Tileset** (segart, itch.io).

Copie o conteúdo da pasta `Pixel-16px Graveyard` para cá, mantendo a subpasta `parallax/`.

A floresta, o castelo e a catedral são desenhados por código (`cenarios.js`) e não precisam de arquivos.
