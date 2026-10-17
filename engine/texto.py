#!/usr/bin/env python3
"""Verificador automático do texto dos vídeos TQC (antes do crítico).

Pega o que dá para pegar sem julgamento: primeira pessoa, clichês e jargão,
fórmula "X não é Y" em lista, rótulos clínicos, tamanhos fora do molde,
pontuação e repetição. Devolve erros (precisam ser corrigidos) e avisos
(o crítico decide). A qualidade de verdade (reconhecimento, virada) fica
com o crítico, pelo criterio_texto.md.

Uso: python3 texto.py ROTEIRO.json
"""
import json, re, sys, unicodedata


def _sem_acento(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn').lower()


CLICHES = [
    'voce e suficiente', 'esta tudo bem nao estar bem', 'tudo bem nao estar bem', 'respeite o seu tempo', 'respeite seu tempo',
    'cada um tem o seu tempo', 'cada um tem seu tempo', 'seja gentil consigo', 'seja gentil com voce', 'voce nao esta sozinh',
    'parte do caminho', 'parte da jornada', 'parte do processo', 'um dia de cada vez', 'a vida e feita de', 'o que e seu ninguem tira',
    'tudo acontece por um motivo', 'voce merece o melhor', 'ame-se', 'se priorize', 'sua melhor versao', 'zona de conforto',
    'virar a chave', 'vire a chave', 'gratidao', 'ressignific', 'florescer', 'floresca', 'permita-se', 'se permita', 'abrace a',
    'acolha-se', 'vibracao', 'boas energias', 'energia positiva', 'cuidando de voce', 'cuide de voce', 'olhe para dentro',
    'no seu tempo', 'tudo vai passar', 'vai ficar tudo bem', 'voce e mais forte', 'acredite em voce', 'confie no processo',
]
JARGAO_AVISO = [r'\bjornada', r'\bprocesso\b', r'\bautocuidado', r'\bgatilho', r'\btrauma', r'\bmerec\w*', r'\bcura(r|do|da)?\b', r'\btoxic', r'\bempoder\w*', r'\bautoestima']
CLINICO = [r'\bvoce (tem|sofre de|esta com) (ansiedade|depressao|tdah|bipolar|toc|borderline|transtorno|panico)', r'\bnarcisist', r'\bpsicopat', r'\bbipolar\b']
PRIMEIRA = r"\b(eu|me|meu|minha|meus|minhas|comigo|mim|nos|nosso|nossa|nossos|nossas|conosco|a gente)\b"
ABSTRATAS = re.compile(r'\b\w+(cao|coes|dade|dades|mento|mentos|encia|ancia|ismo)\b')


def _palavras(s):
    return re.findall(r"[\wÀ-ÿ'-]+", s)


def _trechos(job):
    """(rótulo, texto) de tudo que aparece na tela."""
    f = job.get('formato')
    out = []
    if f == 'frases':
        if job.get('abertura'):
            out.append(('abertura', job['abertura']))
        out += [(f'frase {i + 1}', x) for i, x in enumerate(job.get('frases') or [])]
        if job.get('fecho'):
            out.append(('fecho', job['fecho']))
    elif f == 'marcatexto':
        if job.get('cabecalho'):
            out.append(('cabeçalho', job['cabecalho']))
        out += [(f'parágrafo {i + 1}', x) for i, x in enumerate(job.get('paragrafos') or [])]
    elif f == 'cena':
        qs = job.get('quadros') or [job]
        for qi, q in enumerate(qs):
            pre = f'quadro {qi + 1}, ' if len(qs) > 1 else ''
            for bi, b in enumerate(q.get('blocos') or []):
                partes = b.get('partes') or ([{'txt': b.get('txt')}] if b.get('txt') else [])
                out.append((f'{pre}bloco {bi + 1}', ' '.join(str(p.get('txt') or '').replace('|', ' ') for p in partes)))
            for ei, el in enumerate(q.get('elementos') or []):
                if el.get('tipo') == 'texto' and el.get('txt'):
                    out.append((f'{pre}texto solto {ei + 1}', str(el['txt'])))
    elif f == 'grafico':
        for k, p in enumerate(job.get('paineis') or []):
            out.append((f'título {k + 1}', p.get('titulo', '')))
            out += [(f'rótulo {k + 1}.{i + 1}', r.get('txt', '')) for i, r in enumerate(p.get('rotulos') or [])]
        if job.get('fecho'):
            out.append(('fecho', job['fecho']))
    return out


def checar(job):
    E, A = [], []
    f = job.get('formato')
    tr = _trechos(job)
    if not tr:
        return {'ok': False, 'erros': ['roteiro sem texto'], 'avisos': [], 'estatisticas': {}}
    tudo = ' '.join(t for _, t in tr)
    base = _sem_acento(tudo)

    # primeira pessoa (fora de aspas)
    for rot, t in tr:
        fora = re.sub(r'["“”\'‘’][^"“”\'‘’]*["“”\'‘’]', ' ', t)
        m = re.search(PRIMEIRA, _sem_acento(fora))
        if m and not (m.group(1) == 'nos' and re.search(r'\bnos (olhos|dias|outros|lugares|detalhes|momentos|bracos|ombros|primeiros|ultimos)\b', _sem_acento(fora))):
            E.append(f'{rot}: primeira pessoa ("{m.group(1)}"): fale com quem assiste ("você") ou em 3ª pessoa')
    for c in CLICHES:
        if c in base:
            E.append(f'clichê ou jargão proibido: "{c}" (criterio_texto.md, seção 3)')
    for rx in JARGAO_AVISO:
        m = re.search(rx, base)
        if m:
            A.append(f'palavra gasta "{m.group(0)}": só se for indispensável')
    for rx in CLINICO:
        m = re.search(rx, base)
        if m:
            E.append(f'rótulo clínico ou diagnóstico: "{m.group(0)}"')
    nao_e = len(re.findall(r'\bnao e\b', base))
    if f == 'frases' and sum(bool(re.search(r'\bnao e\b', _sem_acento(x))) for x in job.get('frases') or []) >= 2:
        E.append('fórmula "X não é Y" em lista: use no máximo uma construção "não é… é…", e só como virada')
    elif nao_e > 1:
        A.append(f'"não é" aparece {nao_e} vezes')
    if '!' in tudo:
        A.append('evite exclamação')
    if re.search(r'[\U0001F300-\U0001FAFF☀-➿]', tudo):
        E.append('sem emoji no texto do vídeo')
    if '#' in tudo:
        E.append('sem hashtag no texto do vídeo')

    est = {}
    if f == 'frases':
        fr, ab, fe = job.get('frases') or [], job.get('abertura') or '', job.get('fecho') or ''
        if not fe:
            E.append('falta o fecho (a virada)')
        if fe.strip().endswith('?'):
            E.append('o fecho não pode ser pergunta: ele é a revelação')
        if ab and len(_palavras(ab)) > 6:
            E.append(f'abertura com {len(_palavras(ab))} palavras (máximo 6)')
        if ab and not ab.rstrip().endswith(('…', '...', ':')):
            A.append('abertura costuma terminar em "…" ou ":"')
        n = len(fr)
        if n > 5:
            E.append(f'{n} frases: no máximo 5 (menos e mais fortes)')
        if ab and n and n < 3:
            A.append('escada com menos de 3 frases: confira se não é "dois tempos" (sem abertura)')
        for i, x in enumerate(fr):
            w = len(_palavras(x))
            if w > 8:
                E.append(f'frase {i + 1} com {w} palavras (máximo 8)')
            if not x.rstrip().endswith(('.', '…', '...')) and n > 1:
                A.append(f'frase {i + 1} sem ponto final')
        if fe and len(_palavras(fe)) > 14:
            E.append(f'fecho com {len(_palavras(fe))} palavras (máximo 14)')
        if fr and ab and ab.rstrip().endswith('…') and any(x[:1].isupper() for x in fr):
            A.append('frases que continuam a abertura começam com minúscula')
        est = {'frases': n, 'palavras_fecho': len(_palavras(fe))}
    elif f == 'marcatexto':
        ps = job.get('paragrafos') or []
        marc = re.findall(r'\[\[(.+?)\]\]', ' '.join(ps))
        if len(marc) != 1:
            E.append(f'{len(marc)} trechos marcados com [[ ]]: precisa de exatamente 1')
        else:
            w = len(_palavras(marc[0]))
            if not 10 <= w <= 24:
                E.append(f'frase marcada com {w} palavras (entre 12 e 24)')
            est['frase_marcada'] = marc[0]
        if not 3 <= len(ps) <= 4:
            E.append(f'{len(ps)} parágrafos (3 ou 4)')
        for i, p in enumerate(ps):
            w = len(_palavras(p.replace('[[', '').replace(']]', '')))
            if not 30 <= w <= 65:
                A.append(f'parágrafo {i + 1} com {w} palavras (35 a 60)')
    elif f == 'cena':
        qs = job.get('quadros') or [job]
        blocos = [t for r, t in tr if 'bloco' in r]
        longos = [t for t in blocos if len(t) > 64]
        if longos:
            A.append(f'{len(longos)} bloco(s) com mais de 64 caracteres: no lettering cada bloco é curto, senão a letra fica pequena')
        for qi, q in enumerate(qs):
            n = len(q.get('blocos') or [])
            if n > 16:
                E.append(f'{n} blocos num quadro só: no máximo 16 (divida em quadros)')
        est['blocos'] = len(blocos)
    elif f == 'grafico':
        for k, p in enumerate(job.get('paineis') or []):
            if len(p.get('titulo', '')) > 34:
                E.append(f'título {k + 1} com {len(p["titulo"])} caracteres (máximo 34)')
            for i, r in enumerate(p.get('rotulos') or []):
                if len(r.get('txt', '')) > 16:
                    E.append(f'rótulo {k + 1}.{i + 1} "{r["txt"]}" com {len(r["txt"])} caracteres (máximo 16)')
        if len(job.get('fecho', '')) > 90:
            E.append(f'fecho com {len(job["fecho"])} caracteres (máximo 90)')

    # abstração e repetição
    pal = [_sem_acento(p) for p in _palavras(tudo)]
    abst = [p for p in pal if ABSTRATAS.fullmatch(p) and len(p) > 5]
    est['abstratas'] = round(len(abst) / max(len(pal), 1), 2)
    if f == 'frases' and est['abstratas'] > .12:
        A.append(f'texto abstrato demais ({", ".join(sorted(set(abst))[:6])}): troque conceito por cena, gesto ou objeto')
    cont = {}
    for p in pal:
        if len(p) > 4:
            cont[p] = cont.get(p, 0) + 1
    rep = [p for p, k in cont.items() if k >= 3 and p not in ('voce', 'quando', 'ainda', 'porque', 'sobre')]
    if rep:
        A.append(f'palavras repetidas: {", ".join(rep[:5])}')
    est['palavras'] = len(pal)
    return {'ok': not E, 'erros': E, 'avisos': A, 'estatisticas': est}


if __name__ == '__main__':
    print(json.dumps(checar(json.load(open(sys.argv[1]))), ensure_ascii=False, indent=1))
