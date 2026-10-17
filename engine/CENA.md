# Formato "cena": moldes de vídeo descritos em dados

Um molde novo NÃO exige programar: ele é um roteiro do formato "cena" (JSON) que o motor desenha quadro a quadro (cena.js). Um molde guarda o DESIGN (fundo, paleta, estilos de texto, layout, animação); cada vídeo novo do molde copia esse design e troca só os TEXTOS, seguindo as instruções de texto do molde.

Exemplos completos: `engine/exemplos/cena-lettering.json` (pôster tipográfico que se digita) e `engine/exemplos/cena-lista.json` (dois quadros, lista, formas, desenho, marca-texto, texto solto com caixa).

## 1. Estrutura

```json
{
  "formato": "cena",
  "fundo": {"tipo": "papel", "cor": "claro"},
  "paleta": {"tinta": "#14262C", "claro": "#F7F3EA"},
  "estilos": {
    "fino": {"fonte": "Roboto Condensed", "peso": 400},
    "destaque": {"fonte": "Anton", "caixa": "alta"},
    "faixa": {"fonte": "Roboto Condensed", "peso": 400, "cor": "claro"}
  },
  "layout": {"x": 110, "y": 150, "largura": 860, "altura": 1560, "gap": 20, "max": 210},
  "blocos": [
    {"partes": [{"txt": "Não se acostume", "estilo": "fino"}]},
    {"partes": [{"txt": "descanse", "estilo": "destaque"}, {"txt": "quando o corpo | pedir trégua.", "estilo": "fino"}]},
    {"partes": [{"txt": "Se precisar recomeçar,", "estilo": "faixa"}], "faixa": {"cor": "tinta"}}
  ],
  "elementos": [],
  "entrada": "digitar",
  "camera": "zoom_lento",
  "trilha": {"humor": "esperancoso"}
}
```

Vários quadros (telas que se sucedem com fusão de 0,6 s): `"quadros": [{...}, {...}]`, cada um com `blocos`, `elementos`, `layout`, `marcas` e, se quiser, `fundo`, `inicio`, `fim`, `pausa`. O que fica na raiz (fundo, paleta, estilos, layout, camera, entrada, ritmo) vale para todos.

O JSON precisa ser válido: números como 0.5 (nunca .5), aspas duplas, sem vírgula sobrando.

## 2. Peças

**fundo**:
- `{"tipo": "cor", "cor": "claro"}`;
- `{"tipo": "papel", "cor": "claro"}` (papel com fibras, ótimo para lettering);
- `{"tipo": "gradiente", "de": "#0E2A33", "para": "#1C4A57", "angulo": 90}`;
- `{"tipo": "clipe", ...}`, igual ao das frases (Pexels: busca, download, `--clipe` no render). Desenha só o texto por cima, com véu escuro `veu` de 0 a 1 (padrão 0.38);
- `{"tipo": "pintura", "cena": …, "paleta": …, "semente": n}`, igual ao das frases.

**paleta**: nomes de cor usáveis em qualquer lugar ("cor": "tinta"). Já existem: tinta #14262C, claro #F7F3EA, branco, preto, cinza, rosa #FD5C96 (marca), ciano #01B3D7 (marca), creme, amarelo #FFE940. Pode acrescentar ou trocar.

**estilos** (texto):
- `fonte`: veja a lista de fontes abaixo.
- `peso`: 400, 700…; vale o mais próximo disponível.
- `italico`: true.
- `caixa`: "alta" ou "baixa".
- `cor`.
- `espaco`: espaçamento entre letras, em fração do tamanho; por exemplo 0.05.
- `contorno`: uma cor; desenha a letra vazada com contorno.

Fontes disponíveis, por estilo:
- **Condensadas e de impacto:** Anton, Oswald (400 a 700), Bebas Neue, Roboto Condensed (400, 700, 800), Archivo Black, Montserrat (400, 600, 800).
- **Serifadas:** Playfair Display (400 a 900, itálico), EB Garamond (400 a 800), Cormorant Garamond, Lora, Abril Fatface.
- **Manuscritas e cursivas:** Dancing Script (400, 700), Great Vibes (assinatura), Caveat (400 a 700), Kalam, Patrick Hand, Permanent Marker (marcador).
- **Máquina de escrever:** Special Elite, Courier Prime.
- **Arredondadas e neutras:** Fredoka, Nunito Sans (200 a 900).

Fonte inexistente vira Nunito Sans e gera um aviso no render (campo "avisos" de SAIDA.mp4.json).

**layout** (pilha de blocos):
- `x`, `y`, `largura` e `altura` definem a área.
- `gap` é o espaço entre blocos.
- `alinhar` pode ser "centro", "esquerda" ou "direita".
- `vertical` pode ser "centro", "topo" ou "base".
- `min` e `max` limitam o tamanho da letra.

Cada bloco é UMA linha visual, ajustada à largura da área, como no lettering clássico: palavras curtas ficam enormes e frases longas ficam pequenas. Se a pilha não couber na altura, tudo diminui por igual.

**blocos**:
- Um bloco é `{"partes": [...]}` ou o atalho `{"txt": "...", "estilo": "..."}`.
- Uma parte com várias linhas usa `" | "`, como em "quando o corpo | pedir trégua.". Ela vira uma coluna de letras menores ao lado da parte principal, com a mesma altura dela. É o recurso "PALAVRA GRANDE + complemento pequeno ao lado".
- Partes de uma linha só ficam lado a lado na mesma linha de base, como em "Se doer," + "PEÇA AJUDA." com estilos diferentes.
- Opções do bloco:
  - `faixa`: `{"cor": "tinta"}` desenha uma faixa da largura da coluna; com `"largura": "texto"`, a faixa fica só atrás do texto.
  - `entrada`, `junto` (true faz o bloco começar junto com o anterior) e `alinhar`.
  - `ajuste: false` com `tamanho` (px) usa tamanho fixo em vez de ocupar a largura.
  - `max` e `min` limitam o tamanho só deste bloco; `gap_partes` muda o espaço entre as partes, como fração da letra.
- Opções da parte: `cor` (troca a cor só dela) e `escala` (multiplica o tamanho).

**elementos** (soltos, posição absoluta em px; a tela é 1080×1920):
- `{"tipo": "texto", "txt", "estilo", "x", "y", "largura", "tamanho", "alinhar": "center|left|right", "max_linhas", "fundo": cor, "arredondar": true}`: o texto quebra sozinho na largura, e `x,y` é o centro do texto.
- `{"tipo": "forma", "forma": "retangulo|circulo|linha|seta", "x", "y", "w", "h", "x2", "y2", "raio", "cor", "espessura", "preencher": true}`.
- `{"tipo": "desenho", "path": "M0 60 C 40 0, 80 0, 120 60", "x", "y", "escala", "cor", "espessura", "preencher": cor}`: um caminho SVG que se desenha na tela. Serve para ícones simples, setas à mão, sublinhados, coração, nuvem e pictogramas.
- Todos aceitam `t` (segundos desde o início do quadro; sem `t`, entram na fila depois dos blocos), `entrada`, `sai` (segundos; sai com fade) e `opacidade`.

**marcas** (marca-texto atrás de um bloco): `"marcas": [{"bloco": 3, "cor": "amarelo", "opacidade": 0.75, "depois": 0.2}]`.

**entrada** (animação de entrada; vale na raiz, no quadro, no bloco ou no elemento):
- "digitar": as letras aparecem uma a uma com cursor piscando, e a faixa abre antes.
- "fade".
- "subir".
- "carimbo": surge grande e assenta.
- "escrever": revela da esquerda para a direita, bom para letra manuscrita.
- "revelar": como "escrever".
- "desenhar": formas e desenhos se traçam na tela.

Ritmo:
- Ao terminar cada item, há uma pausa de leitura proporcional ao número de palavras.
- `ritmo` (0.6 a 1.8; maior é mais lento) vale para tudo.
- `velocidade` (padrão 1; maior é mais rápido) vale só para a digitação.
- `pausa` (no quadro) multiplica as pausas.
- `fim` (s) é o tempo final com tudo na tela; o padrão é 3,4 s.
- `cursor: false` desliga o cursor.

**camera**: "zoom_lento" (padrão, aproximação de 3,5%), "deriva" (balanço leve) ou "parada".

**assinatura**: a marca TQC aparece sozinha nos últimos 2 segundos. Ela fica clara sobre fundo escuro e escura sobre fundo claro. `"assinatura": {"y": 1810}` muda a altura, e `"assinatura": false` tira (raro).

Duração: a soma das entradas e pausas mais o `fim`, no máximo 60 s. Mire em 12 a 30 s.

## 3. Como transformar uma referência em molde

1. **Olhe a referência com calma** (Read na imagem) e liste o que a define:
   - composição e onde fica o texto;
   - hierarquia: o que é grande, o que é pequeno e o que fica ao lado;
   - famílias de letra: condensada, serifada, cursiva, máquina;
   - cores, faixas, molduras e ícones;
   - o movimento pedido pelo Bruno: digitar, surgir, escrever.

   Escreva essa leitura em 3 a 5 frases antes de montar.
2. **Escolha as peças.** Pôster tipográfico, lista e frases empilhadas são blocos em pilha. Composição livre (título, ícone, caixa, seta) são elementos. Telas que se sucedem são quadros.
3. **Traduza a hierarquia em estilos** com nomes que digam a função ("fino", "destaque", "manuscrito", "faixa", "assinatura"), em 3 a 7 estilos.
4. **Identidade TQC.** Fundo claro (claro/papel) ou escuro (tinta/gradiente), tinta escura e no máximo UMA cor de destaque da marca (rosa ou ciano), a menos que a referência peça outra coisa. Nada de logos ou nomes de terceiros.
5. **Texto ORIGINAL**, no padrão do criterio_texto.md (frases fortes que se sustentam sozinhas e passam no teste da conversa), escolhido pelo leitor cego. Num lettering, os blocos formam poucas frases curtas sobre o mesmo tema: cada bloco tem até ~40 caracteres, as palavras-chave ficam nas partes grandes e os complementos nas pequenas (nunca uma palavra de ligação em letra enorme). Nunca copie a frase da referência nem a atribua a autor real, e nunca escreva em primeira pessoa.
6. **Renderize e compare.** Abra a capa (o quadro final) ao lado da referência e confira:
   - hierarquia parecida;
   - nada cortado ou sobreposto;
   - letra pequena ainda legível no celular (≥ 34 px);
   - margens de pelo menos 60 px.

   Abra a folha para ver o movimento. Ajuste e renderize de novo (até 4 vezes).
7. **Escreva as instruções do molde** (instrucoes_texto), para a produção automática e para a conversa:
   - quantos blocos ou quadros;
   - o papel de cada estilo, por exemplo: "destaque = 1 a 2 palavras de ação, em caixa alta; fino = frase de ligação";
   - limite de caracteres por bloco;
   - que partes podem variar;
   - o tom.

   As instruções são escritas para quem vai trocar só os textos, mantendo estilos, layout, fundo e animação.
8. **Limitações:** se a referência pede algo que a cena não faz (pessoa falando, vídeo de IA, ilustração detalhada, foto de mãos), faça a aproximação mais fiel possível e escreva em "limitacoes" o que ficou de fora. Se nada próximo for possível, não crie o molde: explique no pedido.

## 4. Vídeo novo de um molde que já existe

Copie `molde.cena` inteiro. Troque só os textos (txt dos blocos e dos elementos de texto), seguindo `molde.instrucoes_texto` e o processo de texto (candidatas, leitor cego e revisão). O número de blocos pode variar dentro do que as instruções permitem. Ponha a trilha (humor) e, se o fundo for clipe, o clipe. Não mude fontes, cores, layout nem animação, a menos que o Bruno peça.
