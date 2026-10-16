# Motor de vídeos — Terapia que Cura

Ramo usado só pela produção automática de vídeos (Reels e TikTok, 1080×1920) do app Radar Viral TQC.
Não contém código do site e não deve ser juntado ao `main`.

- `engine/engine.html` + `engine.js`: desenham cada quadro num canvas (frases sobre pintura viva ou sobre clipe, marca-texto em livro, gráfico à mão).
- `engine/render.py`: captura os quadros com Playwright/Chromium e codifica com ffmpeg (H.264, 30 fps, até ~6 MB).
- `engine/tqc_video.py`: estado do banco (pautas, horários, ajustes), render com capa e folha de conferência, download de clipes e documento da fila.
- Fontes: EB Garamond, Caveat, Fredoka e outras da marca (fontsource, licença OFL).

A tarefa agendada "Vídeos TQC" clona este ramo, produz os vídeos e os deixa no Calendário do app aguardando aprovação. Nada é publicado sem aprovação humana.
