#!/usr/bin/env python3
"""Motor de vídeo TQC.

Uso:
  python3 render.py job.json saida.mp4 [--clipe fundo.mp4] [--quadros 0,3.5,9] [--capa capa.jpg]

- Formatos desenhados por inteiro (frases sobre pintura, marcatexto, grafico): o navegador
  desenha cada quadro e o ffmpeg codifica em H.264 1080x1920 30 fps.
- Formato sobre clipe (job.fundo.tipo == "clipe"): o navegador desenha só o texto (PNG
  transparente) e o ffmpeg sobrepõe ao clipe já recortado, escurecido e no tempo certo.
- --quadros salva JPEGs de conferência nesses instantes (saida.qN.jpg).
"""
import asyncio, base64, functools, http.server, json, os, socketserver, subprocess, sys, threading

ENG = os.path.dirname(os.path.abspath(__file__))


class _Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def _serve():
    socketserver.TCPServer.allow_reuse_address = True
    srv = socketserver.TCPServer(('127.0.0.1', 0), functools.partial(_Quiet, directory=ENG))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def _dur(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path], capture_output=True, text=True).stdout
    return float(out.strip() or 0)


def _luma(path, ini=0.0):
    """Brilho médio (0-255) de alguns quadros do clipe, para dosar o véu escuro sob o texto."""
    r = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(ini), '-i', path, '-t', '6', '-vf', 'fps=1,scale=108:192,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-', '-f', 'null', '-'],
                       capture_output=True, text=True)
    vals = [float(l.split('=')[1]) for l in (r.stdout + r.stderr).splitlines() if 'YAVG=' in l]
    return round(sum(vals) / len(vals), 1) if vals else 110.0


def _enc(out, dur=10):
    mx = int(max(1800, min(4500, 6 * 8 * 1000 / max(dur, 1) * .92)))  # alvo: arquivo de até ~6 MB
    return ['-c:v', 'libx264', '-preset', 'slow', '-crf', '21', '-maxrate', f'{mx}k', '-bufsize', f'{2 * mx}k', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.1',
            '-r', '30', '-movflags', '+faststart', out]


async def render(job, out, clipe=None, quadros=(), capa=None):
    from playwright.async_api import async_playwright
    srv = _serve()
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(args=['--force-color-profile=srgb'])
            pg = await b.new_page(viewport={'width': 1080, 'height': 1920})
            errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto(f'http://127.0.0.1:{srv.server_address[1]}/engine.html')
            await pg.wait_for_function('window.TQC_READY===true')
            f0 = job.get('fundo', {})
            if f0.get('tipo') in ('clipe', 'clipes') and 'luma' not in f0:
                arq = clipe or (f0.get('clipes') or [{}])[0].get('arquivo')
                if arq:
                    f0['luma'] = _luma(arq, float(f0.get('inicio', 0)))
            info = await pg.evaluate('j=>TQC.setup(j)', job)
            if errs:
                raise RuntimeError('; '.join(errs))
            dur, fps, alpha = float(info['dur']), int(info['fps']), bool(info['alpha'])
            n = int(round(dur * fps))
            f = job.get('fundo', {})
            if alpha and f.get('tipo') == 'clipes':
                # várias cenas: uma por trecho do texto, com fusão curta entre elas
                arqs = [c['arquivo'] for c in f['clipes']]
                B = [float(x) for x in info['cortes']]
                segs = [B[k + 1] - B[k] for k in range(len(B) - 1)]
                X = .35
                ins, fl = [], []
                for k, sg in enumerate(segs):
                    c = f['clipes'][k % len(f['clipes'])]
                    ins += ['-stream_loop', '-1', '-i', c['arquivo']]
                    L = sg + (X if k < len(segs) - 1 else 0)
                    fl.append(f"[{k}:v]trim=start={float(c.get('inicio', 0))},setpts=PTS-STARTPTS,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,"
                              f"eq=brightness={f.get('brilho', -0.06)}:saturation={f.get('saturacao', 0.9)}:contrast=1.03,trim=duration={L:.3f},setpts=PTS-STARTPTS,format=yuv420p[c{k}]")
                cur, off = 'c0', 0.0
                for k in range(1, len(segs)):
                    off += segs[k - 1]
                    fl.append(f"[{cur}][c{k}]xfade=transition=fade:duration={X}:offset={off:.3f}[x{k}]")
                    cur = f'x{k}'
                fl.append(f"[{cur}]vignette=PI/5,trim=duration={dur:.3f},setpts=PTS-STARTPTS[bg];[bg][{len(segs)}:v]overlay=0:0:format=auto,format=yuv420p[v]")
                cmd = ['ffmpeg', '-y', '-loglevel', 'error'] + ins + ['-f', 'image2pipe', '-framerate', str(fps), '-c:v', 'png', '-i', '-',
                       '-filter_complex', ';'.join(fl), '-map', '[v]', '-an', '-t', f'{dur:.3f}'] + _enc(out, dur)
            elif alpha:
                if not clipe:
                    raise SystemExit('este job precisa de --clipe')
                ini = float(f.get('inicio', 0))
                total = _dur(clipe)
                vel = float(f.get('velocidade', 1.0))
                # cobre a duração toda: se o clipe for curto, desacelera um pouco e depois faz vaivém
                fonte = (total - ini) / vel
                loop = fonte < dur
                vf = (f"[0:v]trim=start={ini},setpts=(PTS-STARTPTS)/{vel},scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,"
                      f"fps=30,eq=brightness={f.get('brilho', -0.06)}:saturation={f.get('saturacao', 0.9)}:contrast=1.03,"
                      f"vignette=PI/5")
                if loop:
                    vf += ",split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1:a=0,loop=-1:32767:0"
                vf += f",trim=duration={dur:.3f},setpts=PTS-STARTPTS[bg];[bg][1:v]overlay=0:0:format=auto,format=yuv420p[v]"
                cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-i', clipe, '-f', 'image2pipe', '-framerate', str(fps), '-c:v', 'png', '-i', '-',
                       '-filter_complex', vf, '-map', '[v]', '-an', '-t', f'{dur:.3f}'] + _enc(out, dur)
            else:
                cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', str(fps), '-c:v', 'mjpeg', '-i', '-', '-an'] + _enc(out, dur)
            ff = subprocess.Popen(cmd, stdin=subprocess.PIPE)
            for i in range(n):
                d = await pg.evaluate('([t,a])=>TQC.shot(t,a)', [i / fps, alpha])
                ff.stdin.write(base64.b64decode(d.split(',', 1)[1]))
            ff.stdin.close()
            if ff.wait() != 0:
                raise RuntimeError('ffmpeg falhou')
            await b.close()
    finally:
        srv.shutdown()
    base = os.path.splitext(out)[0]
    for k, t in enumerate(quadros):
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', str(t), '-i', out, '-frames:v', '1', '-q:v', '3', f'{base}.q{k}.jpg'])
    if capa is not None:
        tc = job.get('capa_t', min(dur * 0.45, dur - 0.5))
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', str(tc), '-i', out, '-frames:v', '1', '-q:v', '2', capa])
    return {'dur': dur, 'quadros': n, 'capa_t': info.get('capa_t')}


def main():
    a = sys.argv[1:]
    if len(a) < 2:
        print(__doc__)
        sys.exit(1)
    job = json.load(open(a[0]))
    out = a[1]
    clipe = a[a.index('--clipe') + 1] if '--clipe' in a else None
    q = [float(x) for x in a[a.index('--quadros') + 1].split(',')] if '--quadros' in a else []
    capa = a[a.index('--capa') + 1] if '--capa' in a else None
    r = asyncio.run(render(job, out, clipe, q, capa))
    print(json.dumps(r))


if __name__ == '__main__':
    main()
