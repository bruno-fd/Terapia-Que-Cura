#!/usr/bin/env python3
"""Folha de contato: python3 folha.py video.mp4 saida.jpg [n=8] [largura=270]"""
import subprocess, sys, os, tempfile
from PIL import Image
v, out = sys.argv[1], sys.argv[2]
n = int(sys.argv[3]) if len(sys.argv) > 3 else 8
w = int(sys.argv[4]) if len(sys.argv) > 4 else 270
d = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', v], capture_output=True, text=True).stdout)
tmp = tempfile.mkdtemp(); ims = []
for k in range(n):
    t = d * (k + .5) / n; f = f'{tmp}/{k}.jpg'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', f'{t:.2f}', '-i', v, '-frames:v', '1', '-vf', f'scale={w}:-2', f])
    ims.append(Image.open(f))
cols = min(n, 4); rows = (n + cols - 1) // cols; h = ims[0].height
sheet = Image.new('RGB', (cols * w + (cols - 1) * 6, rows * h + (rows - 1) * 6), 'white')
for k, im in enumerate(ims): sheet.paste(im, ((k % cols) * (w + 6), (k // cols) * (h + 6)))
sheet.save(out, quality=88); print(out, f'{d:.1f}s')
