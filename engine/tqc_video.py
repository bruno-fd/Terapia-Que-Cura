#!/usr/bin/env python3
"""Ferramentas da produção automática de vídeos da Terapia que Cura.

  python3 tqc_video.py estado DIR [--n 1] [--linha ID] [--tema ID]
      Lê o banco do app salvo em DIR (DIR/fila, DIR/temas, DIR/linhas, DIR/config, um JSON por documento,
      como o ArtifactData list com out_dir grava) e devolve, em JSON: linhas de vídeo, a próxima linha do
      rodízio, pautas (tema, recorte e abordagem) pelo mesmo critério do app, horários livres, ajustes
      pedidos, clipes já usados e se o banco de vídeos (Pexels/Pixabay) está acessível.
  python3 tqc_video.py render JOB.json SAIDA.mp4 [--clipe CLIPE.mp4] [--db DIR]
      Renderiza, compõe a trilha própria (JOB.trilha.humor) e junta ao vídeo; salva a capa
      (SAIDA.capa.jpg) e uma folha de conferência (SAIDA.folha.jpg). Com --db, evita repetir trilhas já usadas.
  python3 tqc_video.py trilha VIDEO.mp4 JOB.json [--db DIR] [--humor H] [--out SAIDA.mp4]
      Põe (ou troca) a trilha de um vídeo já renderizado, sem refazer a imagem.
  python3 tqc_video.py humores
      Lista os humores de trilha e quando usar cada um.
  python3 tqc_video.py baixar URL SAIDA.mp4
      Baixa um clipe de banco de vídeos e confere se é um vídeo válido.
  python3 tqc_video.py doc --job JOB.json --video ID --capa ID --pauta PAUTA.json --legenda LEGENDA.txt
                           --slot AAAA-MM-DDTHH:MM --info SAIDA.mp4.json [--base FILA_EXISTENTE.json] > DOC.json
      Monta o documento da fila (para ArtifactData set/update com file_path).
"""
import datetime as dt, glob, json, os, random, subprocess, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
EM_FILA = ['aguardando', 'aprovado', 'agendando', 'erro', 'ajuste']
TZ = dt.timezone(dt.timedelta(hours=-3))


def _load(d, col):
    out = []
    for f in glob.glob(os.path.join(d, col, '*.json')):
        try:
            x = json.load(open(f))
        except Exception:
            continue
        x = {k: v for k, v in x.items() if not k.startswith('__')}
        x['id'] = os.path.basename(f)[:-5]
        out.append(x)
    return out


def _agora():
    return dt.datetime.now(TZ)


def _peso(q, agora):
    s = q.get('status') or 'aguardando'
    if s in ('publicado', 'agendado'):
        return 'pub'
    try:
        cri = dt.datetime.fromisoformat(str(q.get('criado_em', '')).replace('Z', '+00:00'))
    except Exception:
        cri = agora - dt.timedelta(days=99)
    if cri.tzinfo is None:
        cri = cri.replace(tzinfo=dt.timezone.utc)
    if s in EM_FILA and (agora - cri).days < 7:
        return 'res'
    return None


def stock_ok():
    try:
        r = subprocess.run(['curl', '-s', '-o', '/dev/null', '-m', '12', '-w', '%{http_code}', '-r', '0-0',
                            'https://videos.pexels.com/video-files/12742709/12742709-sd_240_426_30fps.mp4'], capture_output=True, text=True)
        return r.stdout.strip() in ('200', '206')
    except Exception:
        return False


def estado(d, n=1, linha=None, tema=None):
    agora = _agora()
    fila, temas, linhas, cfg = _load(d, 'fila'), _load(d, 'temas'), _load(d, 'linhas'), {c['id']: c for c in _load(d, 'config')}
    cv = cfg.get('videos', {})
    mix = float((cfg.get('temas') or {}).get('mix_dor', 60)) / 100
    LV = [l for l in linhas if str(l.get('template', '')).startswith('v-')]
    vids = [q for q in fila if q.get('midia') == 'video']
    # rodízio de linhas: a que está há mais tempo sem vídeo
    def ult(lid):
        L = [str(q.get('criado_em', '')) for q in vids if q.get('linha_id') == lid]
        return max(L) if L else ''
    ordem = sorted(LV, key=lambda l: (ult(l['id']), l['id']))
    if linha:
        ordem = [l for l in LV if l['id'] == linha] or ordem
    # pautas pelo critério do app (temas menos usados em todas as linhas, recortes novos, equilíbrio dor/acolhimento)
    H = sorted([q for q in fila if q.get('tema_id') and _peso(q, agora)], key=lambda q: str(q.get('criado_em', '')), reverse=True)
    idx = {}
    for i, q in enumerate(H):
        idx.setdefault(q['tema_id'], i)
    ativos = sorted([t for t in temas if t.get('ativo', True) is not False and t.get('nome')], key=lambda t: t.get('ordem', 999))
    rec = H[:20]
    nd, na = sum(q.get('abordagem') == 'dor' for q in rec), sum(q.get('abordagem') == 'acolhimento' for q in rec)
    tomados, pautas = set(), []
    for j in range(n):
        li = ordem[j % len(ordem)] if ordem else None
        dl = {q['tema_id'] for q in H if li and q.get('linha_id') == li['id']} if li else set()
        fixo = next((t for t in ativos if t['id'] == tema), None) if tema else None
        if fixo:
            t = fixo
        else:
            livres = [t for t in ativos if t['id'] not in tomados] or ativos
            pool = sorted(livres, key=lambda t: (idx.get(t['id'], 10 ** 6) - (400 if t['id'] in dl else 0) + random.random() * 2), reverse=True)
            t = random.choice(pool[:3]) if pool else None
        if not t:
            break
        tomados.add(t['id'])
        subs = [str(s) for s in (t.get('subtemas') or []) if s]
        usados = {q.get('subtema') for q in H if q.get('tema_id') == t['id']}
        novos = [s for s in subs if s not in usados] or subs
        sub = random.choice(novos) if novos else ''
        tot = nd + na
        ab = ('dor' if nd / tot < mix else 'acolhimento') if tot else ('dor' if random.random() < mix else 'acolhimento')
        nd, na = nd + (ab == 'dor'), na + (ab == 'acolhimento')
        ja = [f"{q.get('linha_nome', '')}: {json.dumps(q.get('roteiro') or q.get('campos') or {}, ensure_ascii=False)[:220]}" for q in H if q.get('tema_id') == t['id']][:6]
        pautas.append({'linha_id': li['id'] if li else '', 'linha_nome': li.get('nome', '') if li else '', 'template': li.get('template', '') if li else '',
                       'tema_id': t['id'], 'tema': t['nome'], 'dor': t.get('dor', ''), 'subtema': sub, 'abordagem': ab, 'ja_saiu_sobre_o_tema': ja})
    # horários: um vídeo por dia, no horário configurado, a partir de amanhã
    hh, mm = (str(cv.get('horario', '12:00')) + ':00').split(':')[:2]
    dias_ocupados = {str(q.get('data_hora', ''))[:10] for q in vids if q.get('status') != 'excluido'}
    slots, dia = [], (agora + dt.timedelta(days=1)).date()
    while len(slots) < max(n, 1) + 3:
        s = dia.isoformat()
        if s not in dias_ocupados:
            slots.append(f'{s}T{int(hh):02d}:{int(mm):02d}')
        dia += dt.timedelta(days=1)
    ajustes = [{'id': q['id'], 'ajuste': q.get('ajuste', ''), 'linha_id': q.get('linha_id'), 'formato_video': q.get('formato_video'), 'versao': q.get('versao', 1),
                'tema_id': q.get('tema_id'), 'tema': q.get('tema'), 'subtema': q.get('subtema', ''), 'abordagem': q.get('abordagem'), 'legenda': q.get('legenda', ''),
                'data_hora': q.get('data_hora'), 'roteiro': q.get('roteiro')} for q in vids if q.get('status') == 'ajuste']
    clipes = sorted({c for q in vids for c in (q.get('clipe_ids') or [])})
    pedidos = [{'id': p['id'], 'linha_id': p.get('linha_id'), 'status': p.get('status'), 'criado_em': p.get('criado_em')} for p in _load(d, 'pedidos') if p.get('status') in ('pendente', 'produzindo')]
    trilhas = [q['trilha']['assinatura'] for q in sorted(vids, key=lambda q: str(q.get('criado_em', '')), reverse=True) if isinstance(q.get('trilha'), dict) and q['trilha'].get('assinatura')]
    return {'agora': agora.isoformat(timespec='minutes'), 'aguardando': sum(q.get('status') == 'aguardando' for q in vids),
            'humores_trilha': _humores(), 'trilhas_recentes': [q['trilha'].get('humor') for q in sorted(vids, key=lambda q: str(q.get('criado_em', '')), reverse=True) if isinstance(q.get('trilha'), dict)][:6],
            'trilhas_usadas': len(trilhas),
            'limite_aguardando': int(cv.get('limite_aguardando', 4)), 'linhas_video': [{'id': l['id'], 'nome': l.get('nome'), 'template': l.get('template'), 'descricao': l.get('descricao', ''), 'instrucoes': l.get('instrucoes', ''), 'tom': l.get('tom', '')} for l in LV],
            'pautas': pautas, 'slots_livres': slots, 'ajustes': ajustes, 'clipes_usados': clipes, 'pedidos_pendentes': pedidos, 'stock': 'ok' if stock_ok() else 'bloqueado'}


def _humores():
    sys.path.insert(0, AQUI)
    import trilha as TR
    return {k: v['desc'] for k, v in TR.HUMORES.items()}


def _usadas(db):
    if not db:
        return []
    return [q['trilha']['assinatura'] for q in _load(db, 'fila') if isinstance(q.get('trilha'), dict) and q['trilha'].get('assinatura')]


def _semente(job):
    import hashlib
    t = job.get('trilha') or {}
    if t.get('semente'):
        return str(t['semente'])
    base = {k: v for k, v in job.items() if k not in ('fundo', 'trilha')}
    return hashlib.sha1(json.dumps(base, ensure_ascii=False, sort_keys=True).encode()).hexdigest()[:10]


def _por_trilha(video, job, cortes, dur, db=None, humor=None, out=None):
    sys.path.insert(0, AQUI)
    import trilha as TR, render as R
    h = humor or (job.get('trilha') or {}).get('humor') or 'reflexivo'
    wav = os.path.splitext(out or video)[0] + '.trilha.wav'
    meta = TR.trilha(h, dur, cortes, wav, seed=_semente(job), evitar=_usadas(db))
    R.musicar(video, wav, out or video)
    os.remove(wav)
    meta.pop('compassos', None)
    meta.pop('notas', None)
    return meta


def tem_audio(path):
    p = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=codec_name', '-of', 'csv=p=0', path], capture_output=True, text=True)
    return bool(p.stdout.strip())


def trilha_cmd(video, job_path, db=None, humor=None, out=None):
    sys.path.insert(0, AQUI)
    import asyncio, render as R
    job = json.load(open(job_path))
    inf = asyncio.run(R.info(job))
    dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', video], capture_output=True, text=True).stdout.strip() or inf['dur'])
    meta = _por_trilha(video, job, inf['cortes'], min(dur, inf['dur'] + .05), db, humor, out)
    alvo = out or video
    if os.path.exists(alvo + '.json'):
        i = json.load(open(alvo + '.json'))
    elif os.path.exists(video + '.json'):
        i = json.load(open(video + '.json'))
    else:
        i = {}
    i.update({'trilha': meta, 'bytes': os.path.getsize(alvo)})
    json.dump(i, open(alvo + '.json', 'w'))
    return meta


def render(job_path, out, clipe=None, db=None):
    sys.path.insert(0, AQUI)
    import asyncio, render as R
    job = json.load(open(job_path))
    r = asyncio.run(R.render(job, out, clipe))
    dur = r['dur']
    trilha = _por_trilha(out, job, r.get('cortes') or [0, dur], dur, db)
    if not tem_audio(out):
        raise SystemExit('a trilha não entrou no vídeo')
    tc = float(job.get('capa_t') or r.get('capa_t') or {'marcatexto': dur - .3, 'grafico': dur - .4}.get(job.get('formato'), dur * .45))
    tc = max(.2, min(tc, dur - .1))
    base = os.path.splitext(out)[0]
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', f'{tc:.2f}', '-i', out, '-frames:v', '1', '-q:v', '2', base + '.capa.jpg'], check=True)
    subprocess.run([sys.executable, os.path.join(AQUI, 'folha.py'), out, base + '.folha.jpg', '8', '270'], check=True, capture_output=True)
    info = {'dur': round(dur, 2), 'capa_ms': int(tc * 1000), 'bytes': os.path.getsize(out), 'capa': base + '.capa.jpg', 'folha': base + '.folha.jpg', 'trilha': trilha}
    json.dump(info, open(out + '.json', 'w'))
    return info


def baixar(url, out):
    for k in range(3):
        r = subprocess.run(['curl', '-sSL', '--fail', '-m', '180', '-o', out, url], capture_output=True, text=True)
        if r.returncode == 0:
            break
    else:
        raise SystemExit('não baixou: ' + r.stderr.strip())
    p = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,duration', '-of', 'json', out], capture_output=True, text=True)
    s = (json.loads(p.stdout or '{}').get('streams') or [{}])[0]
    if not s.get('width'):
        raise SystemExit('arquivo baixado não é vídeo')
    return {'arquivo': out, 'largura': s.get('width'), 'altura': s.get('height'), 'duracao': float(s.get('duration') or 0), 'bytes': os.path.getsize(out)}


def doc(a):
    job, pauta, info = json.load(open(a['job'])), json.load(open(a['pauta'])), json.load(open(a['info']))
    base = json.load(open(a['base'])) if a.get('base') else {}
    leg = open(a['legenda']).read().strip()
    d = {'midia': 'video', 'video_id': a['video'], 'imagem_id': a['capa'], 'duracao': info['dur'], 'capa_ms': info['capa_ms'], 'formato_video': job.get('formato'),
         'linha_id': pauta.get('linha_id'), 'linha_nome': pauta.get('linha_nome'), 'tema_id': pauta.get('tema_id'), 'tema': pauta.get('tema'), 'subtema': pauta.get('subtema', ''),
         'abordagem': pauta.get('abordagem'), 'legenda': leg, 'data_hora': base.get('data_hora') or a['slot'], 'redes': base.get('redes') or ['instagram', 'tiktok'],
         'status': 'aguardando', 'erro': '', 'ajuste': '', 'versao': int(base.get('versao', 0) or 0) + 1, 'roteiro': job, 'origem': 'produção automática',
         'criado_em': base.get('criado_em') or _agora().isoformat(timespec='seconds')}
    if base:
        d['refeito_em'] = _agora().isoformat(timespec='seconds')
        d['ajuste_anterior'] = base.get('ajuste', '')
    if info.get('trilha'):
        d['trilha'] = info['trilha']
    f = job.get('fundo', {})
    ids = [str(x) for x in (f.get('clipe_ids') or ([f['clipe_id']] if f.get('clipe_id') else []))]
    if ids:
        d['clipe_ids'] = ids
        d['credito'] = f.get('credito', '')
    return d


def main():
    a = sys.argv[1:]
    if not a:
        print(__doc__); sys.exit(1)
    cmd = a[0]
    opt = lambda k, dflt=None: a[a.index(k) + 1] if k in a else dflt
    if cmd == 'estado':
        print(json.dumps(estado(a[1], int(opt('--n', 1)), opt('--linha'), opt('--tema')), ensure_ascii=False, indent=1))
    elif cmd == 'render':
        print(json.dumps(render(a[1], a[2], opt('--clipe'), opt('--db')), ensure_ascii=False))
    elif cmd == 'trilha':
        print(json.dumps(trilha_cmd(a[1], a[2], opt('--db'), opt('--humor'), opt('--out')), ensure_ascii=False))
    elif cmd == 'humores':
        print(json.dumps(_humores(), ensure_ascii=False, indent=1))
    elif cmd == 'baixar':
        print(json.dumps(baixar(a[1], a[2]), ensure_ascii=False))
    elif cmd == 'doc':
        keys = ['--job', '--video', '--capa', '--pauta', '--legenda', '--slot', '--info', '--base']
        print(json.dumps(doc({k[2:]: opt(k) for k in keys}), ensure_ascii=False, indent=1))
    else:
        print(__doc__); sys.exit(1)


if __name__ == '__main__':
    main()
