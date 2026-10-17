#!/usr/bin/env python3
"""Gera o banco de notas usado pela trilha (sons/*.opus + sons/index.json).

Roda uma vez só (o resultado fica no repositório). Precisa de fluidsynth e do
soundfont FluidR3_GM (licença MIT, de Frank Wen):
  apt-get install -y fluidsynth fluid-soundfont-gm
  python3 gerar_sons.py
"""
import json, os, struct, subprocess, tempfile, wave
import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))
SF2 = '/usr/share/sounds/sf2/FluidR3_GM.sf2'
SR = 44100

# instrumento: programa GM, notas (de, até, passo), velocidades, segundos segurando, segundos guardados
INST = {
    'piano':   dict(prog=0,  notas=(33, 96, 3), vels=(40, 80), segura=7.5, guarda=8.5),
    'cordas':  dict(prog=49, notas=(36, 84, 3), vels=(70,),    segura=9.5, guarda=9.0),
    'pad':     dict(prog=89, notas=(36, 84, 3), vels=(70,),    segura=9.5, guarda=9.0),
    'cello':   dict(prog=42, notas=(36, 69, 3), vels=(70,),    segura=7.0, guarda=6.5),
    'celesta': dict(prog=8,  notas=(60, 96, 3), vels=(70,),    segura=4.0, guarda=4.5),
    'violao':  dict(prog=24, notas=(40, 79, 3), vels=(50, 85), segura=5.0, guarda=5.5),
    'coro':    dict(prog=52, notas=(48, 79, 3), vels=(65,),    segura=8.5, guarda=8.0),
}


def _vlq(n):
    b = [n & 0x7F]
    while n > 127:
        n >>= 7
        b.insert(0, (n & 0x7F) | 0x80)
    return bytes(b)


def midi(prog, eventos, tpq=480, bpm=60):
    """eventos: [(t_seg, nota, vel, dur_seg)] num canal só."""
    ev = []
    for t, n, v, d in eventos:
        ev.append((t, 0x90, n, v))
        ev.append((t + d, 0x80, n, 0))
    ev.sort(key=lambda e: (e[0], e[1] == 0x90))
    tr = bytearray(b'\x00\xFF\x51\x03' + (60_000_000 // bpm).to_bytes(3, 'big'))
    tr += b'\x00\xC0' + bytes([prog])
    tr += b'\x00\xB0\x07\x7F'  # volume
    tr += b'\x00\xB0\x5B\x00\x00\xB0\x5D\x00'  # sem reverb e chorus do sintetizador
    last = 0
    for t, st, n, v in ev:
        tick = int(round(t * tpq * bpm / 60))
        tr += _vlq(tick - last) + bytes([st, n, v])
        last = tick
    tr += b'\x00\xFF\x2F\x00'
    return b'MThd' + struct.pack('>IHHH', 6, 0, 1, tpq) + b'MTrk' + struct.pack('>I', len(tr)) + bytes(tr)


def main():
    out = os.path.join(AQUI, 'sons')
    os.makedirs(out, exist_ok=True)
    idx = {'sr': SR, 'origem': 'FluidR3_GM (Frank Wen, licença MIT)', 'inst': {}}
    with tempfile.TemporaryDirectory() as tmp:
        for nome, cfg in INST.items():
            a, b, p = cfg['notas']
            slot = cfg['segura'] + 3.0
            lista, t = [], 0.5
            for n in range(a, b + 1, p):
                for v in cfg['vels']:
                    lista.append((t, n, v, cfg['segura']))
                    t += slot
            mid, wav = os.path.join(tmp, nome + '.mid'), os.path.join(tmp, nome + '.wav')
            open(mid, 'wb').write(midi(cfg['prog'], lista))
            subprocess.run(['fluidsynth', '-ni', '-q', '-g', '0.6', '-r', str(SR), '-R', '0', '-C', '0', '-F', wav, SF2, mid], check=True, capture_output=True)
            with wave.open(wav) as w:
                ch, raw = w.getnchannels(), w.readframes(w.getnframes())
            x = np.frombuffer(raw, dtype='<i2').astype(np.float32).reshape(-1, ch).mean(axis=1) / 32768
            pedacos, notas, pos = [], [], 0
            for t0, n, v, d in lista:
                i0 = int(t0 * SR)
                seg = x[i0:i0 + int(cfg['guarda'] * SR)].copy()
                # começa no ataque de verdade (corta o silêncio antes da nota)
                lim = np.max(np.abs(seg)) * 0.02
                k = int(np.argmax(np.abs(seg) > lim))
                seg = seg[max(0, k - 32):]
                fim = min(len(seg), int(0.05 * SR))
                seg[-fim:] *= np.linspace(1, 0, fim)
                pedacos.append(seg)
                notas.append({'nota': n, 'vel': v, 'ini': pos, 'n': len(seg)})
                pos += len(seg)
            y = np.concatenate(pedacos)
            pico = float(np.max(np.abs(y)))
            y = y / pico * 0.89
            raw_out = os.path.join(tmp, nome + '.raw.wav')
            with wave.open(raw_out, 'wb') as w:
                w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
                w.writeframes((y * 32767).astype('<i2').tobytes())
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', raw_out, '-c:a', 'libopus', '-b:a', '64k', '-vbr', 'on', '-application', 'audio', os.path.join(out, nome + '.opus')], check=True)
            idx['inst'][nome] = {'prog': cfg['prog'], 'notas': notas, 'total': pos}
            print(nome, len(notas), 'notas', round(pos / SR, 1), 's')
    json.dump(idx, open(os.path.join(out, 'index.json'), 'w'))


if __name__ == '__main__':
    main()
