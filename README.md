# Motor de vídeos — Terapia que Cura

Ramo usado só pela produção automática de vídeos (Reels e TikTok, 1080×1920) do app Radar Viral TQC.
Não contém código do site e não deve ser juntado ao `main`.

- `engine/engine.html` + `engine.js`: desenham cada quadro num canvas (frases sobre pintura viva ou sobre clipe, marca-texto em livro, gráfico à mão).
- `engine/render.py`: captura os quadros com Playwright/Chromium e codifica com ffmpeg (H.264, 30 fps, até ~6 MB).
- `engine/tqc_video.py`: estado do banco (pautas, horários, ajustes), render com capa e folha de conferência, download de clipes e documento da fila.
- `engine/trilha.py`: compõe a música de cada vídeo (humor escolhido pelo texto; acordes trocam nos cortes do texto; nunca repete uma composição) e mixa em -16 LUFS. Timbres em `engine/sons/`, gerados por `gerar_sons.py` a partir do soundfont FluidR3_GM (Frank Wen, licença MIT). Sem faixa de terceiros: sem licença, crédito ou Content ID.
- `engine/cena.js` + `engine/CENA.md`: formato "cena", moldes descritos em dados (fundo, estilos de texto, blocos em pilha ajustados à largura, faixas, formas, desenhos SVG, marca-texto, quadros; animações digitar, fade, subir, carimbo, escrever, desenhar). Molde novo não exige programar: quando o Bruno toca em "Criar molde novo e produzir" na conversa do app, o pedido vai para `pedidos` com status `criar_molde` e a tarefa agendada (PASSO 3C da ROTINA.md) estuda a referência, monta a cena, compara o render com a imagem, grava taxonomia, formato, linha e molde (`tqc_video.py novo-molde`) e deixa o primeiro vídeo no Calendário. Exemplos em `engine/exemplos/`.
- `engine/criterio_texto.md`: o padrão de texto da TQC desde 17/10/2026 (teste da conversa, frase forte que se sustenta sozinha, exemplos aprovados pelo Bruno, legenda, leitor cego). A tarefa agendada escreve 8 frases candidatas, um leitor cego (que não sabe o tema) diz o que entendeu e se alguém diria aquilo numa conversa, e só a que passa vira vídeo.
- `engine/texto.py` (`tqc_video.py checar`): verificador automático (primeira pessoa, rótulos clínicos, tamanhos do molde) e avisos de texto vazio para o leitor cego ("menos X e mais Y", conceito no lugar de gente, clichês).
- Fontes: EB Garamond, Caveat, Fredoka e outras da marca (fontsource, licença OFL).

A tarefa agendada "Vídeos TQC" clona este ramo, produz os vídeos e os deixa no Calendário do app aguardando aprovação. Nada é publicado sem aprovação humana.
