#!/usr/bin/env python3
"""Trilha própria TQC: compõe e grava uma música nova para cada vídeo.

A música é composta aqui mesmo (harmonia, arranjo e mixagem), com timbres do
soundfont FluidR3_GM (licença MIT) guardados em sons/. Não usa faixa de
terceiros, então não há licença a pagar, crédito a dar nem risco de Content ID.
Cada vídeo ganha uma composição diferente (tom, andamento, progressão, arranjo
e melodia variam com a semente), e as trocas de acorde caem nos cortes do texto.

Uso:
  python3 trilha.py --humor sereno --dur 15.2 --cortes 0,4.1,8.3,15.2 --out t.wav [--seed x] [--evitar a,b] [--tom Ré] [--bpm 64]
  python3 trilha.py --amostras PASTA     # uma amostra de cada humor
"""
import hashlib, json, math, os, subprocess, sys
import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))
SR = 44100

NOMES = ['Dó', 'Dó♯', 'Ré', 'Mi♭', 'Mi', 'Fá', 'Fá♯', 'Sol', 'Lá♭', 'Lá', 'Si♭', 'Si']

# acordes: (fundamental em semitons acima da tônica, intervalos a partir da fundamental)
ACORDES = {
    # maior
    'I': (0, [0, 4, 7]), 'Iadd9': (0, [0, 4, 7, 14]), 'Imaj7': (0, [0, 4, 7, 11]),
    'ii7': (2, [0, 3, 7, 10]), 'iii7': (4, [0, 3, 7, 10]),
    'IV': (5, [0, 4, 7]), 'IVmaj7': (5, [0, 4, 7, 11]), 'IVadd9': (5, [0, 4, 7, 14]), 'iv': (5, [0, 3, 7]),
    'V': (7, [0, 4, 7]), 'Vsus4': (7, [0, 5, 7]),
    'vi': (9, [0, 3, 7]), 'vi7': (9, [0, 3, 7, 10]), 'bVII': (10, [0, 4, 7]),
    # menor
    'i': (0, [0, 3, 7]), 'i9': (0, [0, 3, 7, 14]), 'i7': (0, [0, 3, 7, 10]),
    'iv7': (5, [0, 3, 7, 10]), 'IVd': (5, [0, 4, 7]), 'v': (7, [0, 3, 7]), 'Vm': (7, [0, 4, 7]),
    'bIII': (3, [0, 4, 7]), 'bIIImaj7': (3, [0, 4, 7, 11]), 'bVI': (8, [0, 4, 7]), 'bVImaj7': (8, [0, 4, 7, 11]),
    'bVIIm': (10, [0, 4, 7]),
}

ESCALA = {'maior': [0, 2, 4, 7, 9], 'menor': [0, 3, 5, 7, 10]}  # pentatônicas, para a melodia não esbarrar

HUMORES = {
    'melancolico': dict(
        desc='tristeza, solidão, perda, cansaço emocional', modo='menor', tons=[9, 2, 4, 0, 7, 11], bpm=(54, 62), rt=3.4,
        progs=[['i', 'bVI', 'bIII', 'bVIIm'], ['i', 'iv', 'bVI', 'Vm'], ['i9', 'bVImaj7', 'iv7', 'v'], ['i', 'bVIIm', 'bVI', 'bVIIm'],
               ['i', 'bIIImaj7', 'bVImaj7', 'iv'], ['bVImaj7', 'bIII', 'bVIIm', 'i']],
        texturas=[dict(nome='piano esparso e cordas', pad='cordas', piano='esparso', baixo='cello', mel=('piano', .55)),
                  dict(nome='piano lento com cordas ao fundo', pad='cordas', piano='lento', baixo='piano', mel=('piano', .45))]),
    'reflexivo': dict(
        desc='introspecção, perguntas, padrões que se repetem, olhar para dentro', modo='menor', tons=[2, 9, 4, 7, 0, 5], bpm=(60, 68), rt=3.0,
        progs=[['i9', 'bVIIm', 'bVImaj7', 'bVIIm'], ['i7', 'IVd', 'i7', 'IVd'], ['bVImaj7', 'bVIIm', 'i9', 'i9'], ['i9', 'iv7', 'bIIImaj7', 'bVImaj7'],
               ['i', 'bIII', 'IVd', 'iv']],
        texturas=[dict(nome='piano em arpejo e pad', pad='pad', piano='arpejo', baixo='piano', mel=None),
                  dict(nome='piano lento e celesta', pad='pad', piano='lento', baixo='piano', mel=('celesta', .5))]),
    'inquieto': dict(
        desc='ansiedade, pensamento acelerado, insônia, tensão (sem assustar)', modo='menor', tons=[4, 9, 2, 11, 7], bpm=(72, 82), rt=2.6,
        progs=[['i', 'bVI', 'i', 'bVIIm'], ['i', 'iv', 'i', 'v'], ['i', 'bVI', 'iv', 'Vm'], ['i9', 'bVIIm', 'bVI', 'Vm']],
        texturas=[dict(nome='pulso de piano', pad='pad', piano='pulso', baixo='cello', mel=None),
                  dict(nome='arpejo contínuo', pad='cordas', piano='arpejo8', baixo='cello', mel=None)]),
    'sereno': dict(
        desc='calma, descanso, presença, respiro, permissão para parar', modo='maior', tons=[2, 7, 0, 5, 10, 3], bpm=(58, 66), rt=3.6,
        progs=[['Imaj7', 'IVmaj7', 'Imaj7', 'IVmaj7'], ['Iadd9', 'vi7', 'IVmaj7', 'IVmaj7'], ['IVmaj7', 'Imaj7', 'vi7', 'Vsus4'],
               ['Imaj7', 'iii7', 'IVmaj7', 'IVadd9'], ['Iadd9', 'Vsus4', 'vi7', 'IVmaj7']],
        texturas=[dict(nome='pad, coro e celesta', pad='pad', piano='lento', baixo='piano', mel=('celesta', .6), coro=True),
                  dict(nome='piano suave em arpejo', pad='pad', piano='arpejo', baixo='piano', mel=('piano', .4))]),
    'acolhedor': dict(
        desc='acolhimento, autocompaixão, cuidado, vínculo, ser bem-vindo', modo='maior', tons=[7, 2, 0, 9, 5], bpm=(64, 72), rt=2.8,
        progs=[['I', 'vi', 'IV', 'V'], ['I', 'iii7', 'IV', 'I'], ['Iadd9', 'IVadd9', 'vi7', 'Vsus4'], ['I', 'IV', 'iv', 'I'], ['I', 'V', 'vi', 'IV']],
        texturas=[dict(nome='violão dedilhado e cordas', pad='cordas', violao='dedilhado', baixo='violao', mel=('piano', .4)),
                  dict(nome='piano e cordas', pad='cordas', piano='arpejo', baixo='piano', mel=('piano', .5))]),
    'esperancoso': dict(
        desc='esperança, mudança possível, recomeço, força, passo adiante', modo='maior', tons=[0, 2, 7, 5, 9, 10], bpm=(70, 80), rt=2.8,
        progs=[['vi', 'IV', 'I', 'V'], ['I', 'V', 'vi', 'IV'], ['IVadd9', 'I', 'Vsus4', 'vi7'], ['vi7', 'Vsus4', 'IVmaj7', 'Iadd9'], ['I', 'iii7', 'vi7', 'IV']],
        texturas=[dict(nome='piano em movimento e cordas', pad='cordas', piano='arpejo8', baixo='piano', mel=('piano', .6)),
                  dict(nome='violão e celesta', pad='pad', violao='dedilhado', baixo='violao', mel=('celesta', .6))]),
}

# padrões por tempo do compasso: lista de (posição em tempos, índice no conjunto de notas do acorde, intensidade)
PADROES = {
    'arpejo': [(0, 1, .9), (1, 2, .7), (2, 3, .75), (3, 2, .65)],
    'arpejo8': [(0, 0, .85), (.5, 1, .55), (1, 2, .65), (1.5, 3, .55), (2, 4, .7), (2.5, 3, .55), (3, 2, .6), (3.5, 1, .5)],
    'pulso': [(0, 2, .8), (.5, 4, .45), (1, 2, .55), (1.5, 4, .45), (2, 2, .65), (2.5, 4, .45), (3, 2, .55), (3.5, 4, .45)],
    'esparso': [(0, 'rolado', .7), (2.5, 4, .45)],
    'lento': [(0, 'dupla', .7), (2, 3, .55)],
    'dedilhado': [(0, 1, .7), (.5, 2, .55), (1, 3, .6), (1.5, 2, .5), (2, 4, .65), (2.5, 2, .5), (3, 3, .55), (3.5, 2, .5)],
}

NIVEL = {'piano': .62, 'violao': .6, 'cordas': .30, 'pad': .30, 'coro': .16, 'cello': .30, 'celesta': .24}
ENVIO = {'piano': .32, 'violao': .25, 'cordas': .55, 'pad': .6, 'coro': .65, 'cello': .3, 'celesta': .5}


# ---------- banco de notas ----------
class Banco:
    def __init__(self):
        self.idx = json.load(open(os.path.join(AQUI, 'sons', 'index.json')))
        self.cache = {}

    def _inst(self, nome):
        if nome not in self.cache:
            r = subprocess.run(['ffmpeg', '-v', 'error', '-i', os.path.join(AQUI, 'sons', nome + '.opus'), '-ar', str(SR), '-ac', '1', '-f', 'f32le', '-'],
                               capture_output=True, check=True)
            self.cache[nome] = np.frombuffer(r.stdout, dtype='<f4')
        return self.cache[nome]

    def amostra(self, inst, nota, vel):
        notas = self.idx['inst'][inst]['notas']
        lo, hi = min(n['nota'] for n in notas), max(n['nota'] for n in notas)
        while nota < lo - 1:
            nota += 12
        while nota > hi + 1:
            nota -= 12
        dist = min(abs(n['nota'] - nota) for n in notas)
        cand = [n for n in notas if abs(n['nota'] - nota) == dist]
        n = min(cand, key=lambda q: abs(q['vel'] - vel))
        x = self._inst(inst)[n['ini']:n['ini'] + n['n']]
        ganho = (max(vel, 8) / n['vel']) ** 1.4
        return x, nota - n['nota'], ganho


def _estender(x, n):
    """Alonga uma nota sustentada repetindo o miolo com fusões suaves."""
    if len(x) >= n:
        return x
    a, b = int(len(x) * .35), int(len(x) * .9)
    meio, cf = x[a:b], int(.4 * SR)
    out = x[:b].copy()
    while len(out) < n:
        rampa = np.linspace(0, 1, cf)
        out[-cf:] = out[-cf:] * (1 - rampa) + meio[:cf] * rampa
        out = np.concatenate([out, meio[cf:]])
    return out


def _nota(banco, ev):
    x, desl, ganho = banco.amostra(ev['inst'], ev['nota'], ev['vel'])
    r = 2 ** ((desl + ev.get('cents', 0) / 100) / 12)
    n_out = int((ev['dur'] + ev['rel']) * SR)
    precisa = int(n_out * r) + 2
    if ev['inst'] in ('cordas', 'pad', 'coro', 'cello'):
        x = _estender(x, precisa)
    pos = np.arange(n_out) * r
    pos = pos[pos < len(x) - 1]
    y = np.interp(pos, np.arange(len(x)), x) * ganho
    if not len(y):
        return y
    na = min(len(y), int(ev['att'] * SR))
    if na > 1:
        y[:na] *= 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, na))
    i_rel = int(ev['dur'] * SR)
    if i_rel < len(y):
        nr = len(y) - i_rel
        y[i_rel:] *= np.exp(-np.linspace(0, 6.5, nr))
    return y


# ---------- harmonia ----------
def _vozes(pcs, ant, lo, hi, n_max=4):
    import itertools
    cands = [[m for m in range(lo, hi + 1) if m % 12 == pc] for pc in pcs[:n_max]]
    melhor, custo_m = None, 1e9
    for comb in itertools.product(*cands):
        c = sorted(comb)
        if len(set(c)) < len(c) or c[-1] - c[0] > 16:
            continue
        if ant:
            custo = sum(min(abs(a - b) for b in ant) for a in c) + sum(min(abs(a - b) for b in c) for a in ant)
        else:
            custo = abs(sum(c) / len(c) - (lo + hi) / 2) * 2
        custo += sum(1.5 for a, b in zip(c, c[1:]) if b - a < 3 and a < 55)  # evita cachos graves
        if custo < custo_m:
            melhor, custo_m = c, custo
    return melhor or sorted(c[0] for c in cands)


def _conjunto(pcs, lo, hi):
    return [m for m in range(lo, hi + 1) if m % 12 in pcs]


def _grade(cortes, dur, bpm):
    """Compassos alinhados aos cortes do texto: cada trecho ganha tempos inteiros; acorde novo a cada 4 tempos."""
    tb = 60 / bpm
    c = sorted({round(float(x), 3) for x in cortes if 0 <= float(x) <= dur} | {0.0, round(dur, 3)})
    trechos = []
    for a, b in zip(c, c[1:]):
        if trechos and b - a < 1.2 and b < dur - .01:
            trechos[-1][1] = b
        else:
            trechos.append([a, b])
    if len(trechos) > 1 and trechos[-1][1] - trechos[-1][0] < 1.0:
        trechos[-2][1] = trechos[-1][1]
        trechos.pop()
    comp = []
    for a, b in trechos:
        nb = max(2, round((b - a) / tb))
        bl = (b - a) / nb
        blocos, k = [], 0
        while k < nb:
            q = 4 if nb - k >= 6 or nb - k == 4 else nb - k
            if nb - k == 5:
                q = 5
            blocos.append(q)
            k += q
        t = a
        for q in blocos:
            comp.append({'t0': t, 't1': t + q * bl, 'tempos': q, 'tb': bl, 'trecho_ini': abs(t - a) < 1e-6})
            t += q * bl
    return comp


# ---------- reverberação ----------
def _ir(rt, seed):
    rng = np.random.default_rng(seed)
    n = int((rt * 1.1 + .03) * SR)
    t = np.arange(n) / SR
    f = np.fft.rfftfreq(n, 1 / SR)
    out = np.zeros((n, 2), dtype=np.float32)
    for ch in range(2):
        X = np.fft.rfft(rng.standard_normal(n))
        y = np.zeros(n)
        for lo, hi, k in [(0, 300, 1.1), (300, 1500, 1.0), (1500, 5000, .7), (5000, SR, .35)]:
            y += np.fft.irfft(X * ((f >= lo) & (f < hi)), n) * 10 ** (-3 * t / (rt * k))
        pre = int(.022 * SR)
        y[:pre] = 0
        y[pre:pre + int(.03 * SR)] *= np.linspace(0, 1, int(.03 * SR))
        for _ in range(7):
            y[pre + int(rng.uniform(.004, .07) * SR)] += rng.uniform(-.4, .4) * np.max(np.abs(y))
        out[:, ch] = y / np.sqrt(np.sum(y ** 2))
    return out


def _filtro(x, fc, tipo):
    from scipy.signal import butter, sosfiltfilt
    return sosfiltfilt(butter(2, fc, tipo, fs=SR, output='sos'), x, axis=0)


# ---------- composição ----------
def compor(humor, dur, cortes, seed='tqc', evitar=(), tom=None, bpm=None):
    if humor not in HUMORES:
        raise SystemExit(f'humor desconhecido: {humor} (use: {", ".join(HUMORES)})')
    H = HUMORES[humor]
    evitar = set(evitar or ())
    for tentativa in range(40):
        s = int(hashlib.sha1(f'{seed}|{humor}|{tentativa}'.encode()).hexdigest()[:12], 16)
        rng = np.random.default_rng(s)
        tonica = H['tons'][rng.integers(len(H['tons']))] if tom is None else (NOMES.index(tom) if isinstance(tom, str) else int(tom))
        andamento = int(bpm or rng.integers(H['bpm'][0], H['bpm'][1] + 1))
        prog = list(H['progs'][rng.integers(len(H['progs']))])
        tex = dict(H['texturas'][rng.integers(len(H['texturas']))])
        assin = f"{humor}|{tonica}|{'-'.join(prog)}|{tex['nome']}"
        if assin not in evitar:
            break
    meta = {'humor': humor, 'tom': f"{NOMES[tonica]} {H['modo']}", 'bpm': andamento, 'progressao': prog, 'arranjo': tex['nome'],
            'assinatura': assin, 'semente': str(seed), 'licenca': 'composição própria do motor TQC; timbres FluidR3_GM (licença MIT)'}

    comp = _grade(cortes, dur, andamento)
    tonico = 'i9' if H['modo'] == 'menor' and rng.random() < .5 else ('i' if H['modo'] == 'menor' else ('Iadd9' if rng.random() < .5 else 'I'))
    seq = [prog[k % len(prog)] for k in range(len(comp))]
    if len(comp) >= 2:
        seq[-1] = tonico
        if ACORDES[seq[-2]][0] == 0:  # penúltimo não pode ser tônica de novo: prepara a chegada
            fora = [p for p in prog if ACORDES[p][0] != 0]
            seq[-2] = fora[-1] if fora else ('Vsus4' if H['modo'] == 'maior' else 'bVIIm')
    escala = [(tonica + e) % 12 for e in ESCALA[H['modo']]]

    evs = []
    ant, baixo_ant, mel_ant = None, None, None
    ritmo_mel = [[(0, 1.5), (1.5, 1.5), (3, 1)], [(0, 2), (2, 2)], [(1, 1.5), (2.5, 1.5)], [(0, 1), (1, 1), (2, 2)]][rng.integers(4)]
    pad = tex['pad']
    hum = lambda: float(rng.normal(0, .008))
    for i, (cp, nome) in enumerate(zip(comp, seq)):
        raiz, iv = ACORDES[nome]
        pcs = [(tonica + raiz + x) % 12 for x in iv]
        fim = i == len(comp) - 1
        t0, t1, tb = cp['t0'], cp['t1'], cp['tb']
        prog_t = t0 / max(dur, 1)
        arco = .86 + .14 * math.sin(math.pi * min(1, prog_t / .75))  # cresce até ~3/4 e assenta
        # base sustentada (com dobra levemente desafinada para abrir o estéreo)
        voz = _vozes(pcs, ant, 50 if pad == 'pad' else 52, 74 if pad == 'pad' else 76)
        ant = voz
        att = 1.4 if i == 0 else .8
        for m in voz:
            for cents, pan in ((-4, -.55), (4, .55)):
                evs.append(dict(papel='base', inst=pad, nota=m, vel=62, t=t0, dur=(t1 - t0) + (.3 if not fim else 1.5), att=att, rel=1.3, pan=pan, cents=cents, g=arco * .75))
        if tex.get('coro'):
            for m in voz[-2:]:
                evs.append(dict(papel='coro', inst='coro', nota=m, vel=60, t=t0, dur=t1 - t0 + .3, att=1.2, rel=1.5, pan=.2, g=arco))
        # baixo
        b_lo, b_hi = (40, 52) if tex['baixo'] == 'violao' else (36, 48)
        bc = [m for m in range(b_lo, b_hi) if m % 12 == pcs[0]]
        bx = min(bc, key=lambda m: abs(m - (baixo_ant if baixo_ant else (b_lo + b_hi) / 2)))
        baixo_ant = bx
        if tex['baixo'] == 'cello':
            evs.append(dict(papel='baixo', inst='cello', nota=bx, vel=64, t=t0 + .02, dur=t1 - t0 + (0 if not fim else 1.2), att=.35, rel=.9, pan=-.15, g=arco))
        elif tex['baixo'] in ('piano', 'violao'):
            evs.append(dict(papel='baixo', inst=tex['baixo'], nota=bx, vel=int(58 * arco), t=t0 + abs(hum()), dur=t1 - t0 + .2, att=.002, rel=.5, pan=-.1, g=1))
        # figura rítmica (piano ou violão)
        inst_fig = 'violao' if tex.get('violao') else 'piano'
        pad_fig = PADROES[tex.get('violao') or tex.get('piano')]
        lo_f = 52 if inst_fig == 'violao' else 55
        notas = _conjunto(pcs, lo_f, lo_f + 26)
        if fim:
            # acorde final, arpejado devagar, deixando soar
            alvo = [n for n in _conjunto(pcs, 55, 79)][:5]
            for k, m in enumerate(alvo):
                evs.append(dict(papel='figura', inst=inst_fig, nota=m, vel=int(52 - k * 2), t=t0 + .02 + k * .07, dur=max(.8, t1 - t0 - k * .07), att=.002, rel=.8, pan=(k - 2) * .08, g=1))
        else:
            for b in range(cp['tempos']):
                for pos, idx, vv in pad_fig:
                    if not (b % 4 <= pos < b % 4 + 1):
                        continue
                    tt = t0 + (b - b % 4 + pos) * tb
                    if tt >= t1 - .05:
                        continue
                    sus = t1 - tt + .25
                    if idx == 'rolado':
                        for k, m in enumerate(_conjunto(pcs, 57, 76)[:3]):
                            evs.append(dict(papel='figura', inst=inst_fig, nota=m, vel=int(60 * vv * arco), t=tt + k * .055 + abs(hum()), dur=sus, att=.002, rel=.45, pan=0, g=1))
                    elif idx == 'dupla':
                        for m in (notas[0], notas[2] if len(notas) > 2 else notas[-1]):
                            evs.append(dict(papel='figura', inst=inst_fig, nota=m, vel=int(62 * vv * arco), t=tt + abs(hum()), dur=sus, att=.002, rel=.45, pan=0, g=1))
                    else:
                        m = notas[min(idx, len(notas) - 1)]
                        evs.append(dict(papel='figura', inst=inst_fig, nota=m, vel=int(66 * vv * arco + rng.normal(0, 3)), t=tt + abs(hum()), dur=sus, att=.002, rel=.45, pan=.05, g=1))
        # melodia esparsa, repetindo o motivo em compassos alternados
        if tex.get('mel') and 0 < i < len(comp) - 1 and rng.random() < tex['mel'][1] + .25:
            inst_m = tex['mel'][0]
            r_use = ritmo_mel if i % 2 == 1 else [[(0, 1.5), (2, 2)], [(0, 3)], [(1, 1), (2, 2)]][rng.integers(3)]
            for j, (pos, d) in enumerate(r_use):
                if pos >= cp['tempos']:
                    continue
                forte = pos in (0, 2)
                pool = [m for m in range(72, 89) if m % 12 in (pcs if (forte or j == 0) else set(pcs) | set(escala))]
                if mel_ant is None:
                    m = min(pool, key=lambda q: abs(q - 79))
                else:
                    w = np.array([math.exp(-abs(q - mel_ant) / 2.5) * (.35 if q == mel_ant else 1) for q in pool])
                    m = pool[rng.choice(len(pool), p=w / w.sum())]
                mel_ant = m
                evs.append(dict(papel='mel', inst=inst_m, nota=m, vel=int(54 * arco + rng.normal(0, 3)), t=t0 + pos * tb + abs(hum()), dur=d * tb * 1.1, att=.002, rel=.8,
                                pan=.25 if inst_m == 'celesta' else .1, g=1))
        if fim and tex.get('mel') and mel_ant is not None:
            pool = [m for m in range(72, 89) if m % 12 == tonica]
            m = min(pool, key=lambda q: abs(q - mel_ant))
            evs.append(dict(papel='mel', inst=tex['mel'][0], nota=m, vel=46, t=t0 + .45, dur=max(.8, t1 - t0 - .5), att=.002, rel=1.0, pan=.2, g=1))
    meta['compassos'] = [{'t0': round(c['t0'], 2), 'acorde': n} for c, n in zip(comp, seq)]
    return evs, meta, H['rt'], s


# volume de cada papel em relação à figura principal (piano ou violão), em dB
ALVO_DB = {'figura': 0, 'mel': -2.5, 'base': -9, 'coro': -15, 'baixo': -6}


def gravar(evs, dur, rt, seed, out):
    banco = Banco()
    n = int(dur * SR)
    L = n + SR * 4
    secos, envios = {}, {}
    for ev in evs:
        y = _nota(banco, ev)
        i0 = max(0, int(ev['t'] * SR))
        y = y[:L - i0]
        if not len(y):
            continue
        pp = ev.get('papel', 'figura')
        sc = secos.setdefault(pp, np.zeros((L, 2)))
        en = envios.setdefault(pp, np.zeros(L))
        g = NIVEL[ev['inst']] * ev.get('g', 1)
        p = (ev.get('pan', 0) + 1) * math.pi / 4
        sc[i0:i0 + len(y), 0] += y * g * math.cos(p)
        sc[i0:i0 + len(y), 1] += y * g * math.sin(p)
        en[i0:i0 + len(y)] += y * g * ENVIO[ev['inst']]
    # equilíbrio automático: cada camada no volume certo, qualquer que seja o arranjo
    rms = {k: float(np.sqrt(np.mean(v[:n] ** 2))) + 1e-9 for k, v in secos.items()}
    ref = rms.get('figura') or max(rms.values())
    seco, envio = np.zeros((L, 2)), np.zeros(L)
    for k in secos:
        g = 10 ** (ALVO_DB.get(k, -6) / 20) * ref / rms[k]
        if k in ('base', 'coro'):
            secos[k] = _filtro(secos[k], 110, 'highpass')
        seco += secos[k] * g
        envio += envios[k] * g
    from scipy.signal import fftconvolve
    envio = _filtro(_filtro(envio, 180, 'highpass'), 7000, 'lowpass')
    ir = _ir(rt, seed % (2 ** 32))
    molhado = np.stack([fftconvolve(envio, ir[:, c])[:len(envio)] for c in range(2)], axis=1)
    r_seco = float(np.sqrt(np.mean(seco[:n] ** 2))) + 1e-9
    r_mol = float(np.sqrt(np.mean(molhado[:n] ** 2))) + 1e-9
    x = seco + molhado * (r_seco / r_mol) * 10 ** (-6 / 20)  # ambiência 6 dB abaixo do som direto
    x = _filtro(x, 38, 'highpass')[:n]
    x /= max(1e-9, np.max(np.abs(x))) / .7
    # entrada e saída
    fi, fo = int(.12 * SR), int(min(1.8, dur * .15) * SR)
    x[:fi] *= np.linspace(0, 1, fi)[:, None]
    x[-fo:] *= (np.cos(np.linspace(0, np.pi, fo)) * .5 + .5)[:, None]
    tmp = out + '.cru.wav'
    _wav(tmp, x)
    _loud(tmp, out)
    os.remove(tmp)


def _wav(path, x):
    import wave
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype('<i2').tobytes())


def _loud(src, out, alvo=-16.0):
    """Normaliza o volume em dois passos (padrão de redes: -16 LUFS, pico -1,5 dBTP)."""
    r = subprocess.run(['ffmpeg', '-hide_banner', '-i', src, '-af', f'loudnorm=I={alvo}:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True)
    txt = r.stderr
    m = json.loads(txt[txt.rindex('{'):txt.rindex('}') + 1])
    af = (f"loudnorm=I={alvo}:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:"
          f"measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src, '-af', af, '-ar', '48000', out], check=True)


def trilha(humor, dur, cortes, out, seed='tqc', evitar=(), tom=None, bpm=None):
    evs, meta, rt, s = compor(humor, dur, cortes, seed, evitar, tom, bpm)
    gravar(evs, dur, rt, s, out)
    meta['notas'] = len(evs)
    return meta


def main():
    a = sys.argv[1:]
    opt = lambda k, d=None: a[a.index(k) + 1] if k in a else d
    if '--amostras' in a:
        pasta = opt('--amostras')
        os.makedirs(pasta, exist_ok=True)
        cortes = [0, 3.9, 7.8, 11.6, 15.5, 18]
        for h in HUMORES:
            m = trilha(h, 18, cortes, os.path.join(pasta, f'{h}.wav'), seed=opt('--seed', 'amostra'))
            print(json.dumps(m, ensure_ascii=False))
        return
    if '--humor' not in a or '--dur' not in a or '--out' not in a:
        print(__doc__); sys.exit(1)
    dur = float(opt('--dur'))
    cortes = [float(x) for x in opt('--cortes', f'0,{dur}').split(',')]
    m = trilha(opt('--humor'), dur, cortes, opt('--out'), opt('--seed', 'tqc'), [x for x in opt('--evitar', '').split(',') if x], opt('--tom'), opt('--bpm') and int(opt('--bpm')))
    print(json.dumps(m, ensure_ascii=False))


if __name__ == '__main__':
    main()
