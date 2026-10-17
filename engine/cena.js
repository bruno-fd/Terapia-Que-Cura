/* Formato "cena": um molde descrito em DADOS (fundo, paleta, estilos de texto, blocos em pilha,
   elementos soltos e animações), para a produção automática criar moldes novos sem programar.
   Especificação completa e exemplos: CENA.md. Carregado depois de engine.js (usa U, ctx, W, H,
   fontes, caber, texto, assinatura, grao, pinturaDe, veu, FMT). */
(() => {
  const FONTES = { 'Abril Fatface': [400], 'Anton': [400], 'Archivo Black': [400], 'Bebas Neue': [400], 'Caveat': [400, 500, 600, 700], 'Cormorant Garamond': [300, 400, 500, 600, 700], 'Courier Prime': [400, 700], 'Dancing Script': [400, 700], 'EB Garamond': [400, 500, 600, 700, 800], 'Fredoka': [300, 400, 500, 600, 700], 'Great Vibes': [400], 'Kalam': [300, 400, 700], 'Lora': [400, 500, 600, 700], 'Montserrat': [400, 600, 800], 'Nunito Sans': [200, 300, 400, 500, 600, 700, 800, 900], 'Oswald': [400, 500, 600, 700], 'Patrick Hand': [400], 'Permanent Marker': [400], 'Playfair Display': [400, 500, 600, 700, 800, 900], 'Roboto Condensed': [400, 700, 800], 'Special Elite': [400] };
  const PAL0 = { tinta: '#14262C', claro: '#F7F3EA', branco: '#FFFFFF', preto: '#111111', cinza: '#5B6F77', rosa: '#FD5C96', ciano: '#01B3D7', creme: '#F6EBD9', amarelo: '#FFE940' };
  const AVISOS = [];
  const aviso = m => { if (!AVISOS.includes(m)) AVISOS.push(m); };

  function corDe(c, pal, dflt) { if (!c) return dflt; return pal[c] || c; }
  function luma(hex) { const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '')); if (!m) return 128; const n = parseInt(m[1], 16); return .2126 * (n >> 16) + .7152 * ((n >> 8) & 255) + .0722 * (n & 255); }
  function norm(e, est) {
    if (typeof e === 'string') { if (!est[e]) aviso(`estilo "${e}" não existe; usei o padrão`); e = est[e] || {}; }
    e = { ...(e || {}) };
    if (e.base && est[e.base]) e = { ...est[e.base], ...e };
    if (!FONTES[e.fonte]) { if (e.fonte) aviso(`fonte "${e.fonte}" não existe; usei Nunito Sans`); e.fonte = 'Nunito Sans'; }
    const ws = FONTES[e.fonte], p = +e.peso || 400; e.peso = ws.reduce((a, b) => Math.abs(b - p) < Math.abs(a - p) ? b : a, ws[0]);
    return e;
  }
  const fontStr = (e, s) => `${e.italico ? 'italic ' : ''}${e.peso} ${Math.max(4, s).toFixed(1)}px "${e.fonte}"`;
  const caixa = (t, e) => e.caixa === 'alta' ? t.toLocaleUpperCase('pt-BR') : e.caixa === 'baixa' ? t.toLocaleLowerCase('pt-BR') : t;
  function usar(c, e, s) { c.font = fontStr(e, s); c.letterSpacing = `${((e.espaco || 0) * s).toFixed(2)}px`; }
  function largura(c, txt, e, s) { usar(c, e, s); const w = c.measureText(txt).width; c.letterSpacing = '0px'; return w; }
  const CAP = {};
  function capR(c, e) { // altura das maiúsculas por px de fonte (para alinhar fontes diferentes)
    const k = e.fonte + e.peso + (e.italico ? 'i' : '');
    if (!CAP[k]) { c.font = fontStr(e, 100); const m = c.measureText('HÁ'); CAP[k] = { cap: c.measureText('H').actualBoundingBoxAscent / 100, topo: m.actualBoundingBoxAscent / 100, desc: c.measureText('gjç').actualBoundingBoxDescent / 100 }; }
    return CAP[k];
  }

  /* ---------- montagem de um quadro ---------- */
  function montar(self, Q, T0) {
    const c = ctx, est = self.est, R = self.R;
    const L = { x: 90, y: 200, largura: 900, altura: 1480, gap: 22, alinhar: 'centro', vertical: 'centro', min: 34, max: 260, ...(Q.layout || {}) };
    // blocos em pilha (lettering, listas, frases empilhadas)
    const blocos = (Q.blocos || []).map((b, bi) => {
      const partes = (b.partes || (b.txt != null ? [{ txt: b.txt, estilo: b.estilo }] : [])).map(p => {
        const e = norm(p.estilo, est); if (p.cor) e.cor = p.cor;
        const linhas = String(p.txt ?? '').split(/\s*\|\s*|\n/).map(x => caixa(x, e)).filter(x => x.length);
        return { e, linhas, escala: +p.escala || 1, entrada: p.entrada, raw: p };
      }).filter(p => p.linhas.length);
      return { ...b, partes, i: bi };
    }).filter(b => b.partes.length);
    // tamanho de cada bloco: a linha ocupa a largura (ajuste) com letras dentro de [min,max]
    const medirBloco = (b, S) => { // devolve largura e altura do bloco para o tamanho-base S
      const prin = b.partes.find(p => p.linhas.length === 1) || b.partes[0], capP = capR(c, prin.e).cap * S * prin.escala;
      let w = 0; const gapx = (+b.gap_partes || .28) * capP; // espaço entre as partes, proporcional à letra
      const ps = b.partes.map(p => {
        const cr = capR(c, p.e);
        if (p.linhas.length > 1) { // coluna de linhas menores com a altura das maiúsculas da parte principal
          const s = capP / (p.linhas.length * cr.cap * 1.42) * p.escala;
          const lw = Math.max(...p.linhas.map(l => largura(c, l, p.e, s)));
          return { p, s, w: lw, h: capP };
        }
        const s = S * p.escala; return { p, s, w: largura(c, p.linhas[0], p.e, s), h: cr.cap * s };
      });
      w = ps.reduce((a, x) => a + x.w, 0) + gapx * (ps.length - 1);
      const h = Math.max(...ps.map(x => x.h));
      const topo = Math.max(...ps.map(x => x.p.linhas.length > 1 ? x.h : capR(c, x.p.e).topo * x.s)), desc = Math.max(...ps.map(x => x.p.linhas.length > 1 ? 0 : capR(c, x.p.e).desc * x.s));
      return { ps, w, h, gapx, topo, desc };
    };
    for (const b of blocos) {
      const alvo = b.largura ?? L.largura;
      const w1 = medirBloco(b, 100).w / 100;
      let S = b.ajuste === false ? (b.tamanho || 80) : alvo / Math.max(w1, 1e-3);
      if (b.faixa) S *= .86; // a faixa precisa de folga dos lados
      S = U.clamp(S, b.min ?? L.min, b.max ?? L.max);
      b.S = S; Object.assign(b, medirBloco(b, S));
    }
    // altura total; se não couber, reduz tudo por igual
    const altB = b => (b.topo + b.desc) * (b.faixa ? 1.5 : 1.08);
    let tot = blocos.reduce((a, b) => a + altB(b), 0) + L.gap * Math.max(0, blocos.length - 1);
    if (tot > L.altura && blocos.length) {
      const f = L.altura / tot;
      for (const b of blocos) { b.S *= f; Object.assign(b, medirBloco(b, b.S)); }
      tot = blocos.reduce((a, b) => a + altB(b), 0) + L.gap * Math.max(0, blocos.length - 1);
    }
    let y = L.y + (L.vertical === 'topo' ? 0 : L.vertical === 'base' ? L.altura - tot : (L.altura - tot) / 2);
    for (const b of blocos) {
      const hb = altB(b), al = b.alinhar || L.alinhar;
      b.x0 = al === 'esquerda' ? L.x : al === 'direita' ? L.x + L.largura - b.w : L.x + (L.largura - b.w) / 2;
      b.base = y + (hb - (b.topo + b.desc)) / 2 + b.topo; // linha de base
      b.y0 = y; b.hb = hb; y += hb + L.gap;
      let x = b.x0;
      for (const q of b.ps) { q.x = x; x += q.w + b.gapx; }
    }
    // coluna real ocupada pelos blocos (a faixa acompanha a coluna, não a área do layout)
    const col = blocos.length ? { x: Math.min(...blocos.map(b => b.x0)), w: Math.max(...blocos.map(b => b.x0 + b.w)) - Math.min(...blocos.map(b => b.x0)) } : { x: L.x, w: L.largura };
    // elementos soltos (posição absoluta)
    const elementos = (Q.elementos || []).map((el, k) => {
      const o = { ...el, k };
      if (el.tipo === 'texto') {
        const e = norm(el.estilo, est); if (el.cor) e.cor = el.cor;
        const r = caber(c, caixa(String(el.txt || ''), e), `${e.italico ? 'italic ' : ''}${e.peso} #px "${e.fonte}"`, +el.tamanho || 70, +el.largura || 900, +el.max_linhas || 4, Math.round((+el.tamanho || 70) * .55));
        o.e = e; o.r = r;
      }
      if (el.tipo === 'desenho' && el.path) {
        try {
          const sv = document.createElementNS('http://www.w3.org/2000/svg', 'path'); sv.setAttribute('d', el.path);
          const len = sv.getTotalLength(), n = Math.min(900, Math.max(30, Math.round(len / 3)));
          o.pts = Array.from({ length: n + 1 }, (_, i) => { const p = sv.getPointAtLength(len * i / n); return { x: p.x, y: p.y }; });
          o.p2d = new Path2D(el.path);
        } catch (e) { aviso('desenho com path inválido'); o.pts = null; }
      }
      return o;
    });
    // linha do tempo: um item depois do outro, com pausa de leitura
    const itens = [];
    for (const b of blocos) itens.push({ tipo: 'bloco', b, junto: b.junto, ent: b.entrada || Q.entrada || self.j.entrada || 'digitar', chars: b.partes.reduce((a, p) => a + p.linhas.join('').length, 0), pal: b.partes.reduce((a, p) => a + p.linhas.join(' ').split(/\s+/).length, 0) });
    for (const el of elementos) if (el.t == null) itens.push({ tipo: 'el', el, junto: el.junto, ent: el.entrada || 'fade', chars: String(el.txt || '').length, pal: String(el.txt || '').split(/\s+/).filter(Boolean).length });
    if (Q.ordem === 'elementos_primeiro') itens.sort((a, b) => (a.tipo === 'el' ? 0 : 1) - (b.tipo === 'el' ? 0 : 1));
    const vel = +(Q.velocidade || self.j.velocidade || 1); // velocidade da digitação (maior = mais rápido)
    let t = T0 + (Q.inicio ?? .6), prev = null;
    for (const it of itens) {
      const din = it.ent === 'digitar' ? U.clamp(it.chars * .052 / vel, .35, 4.5) * R : it.ent === 'carimbo' ? .45 * R : it.ent === 'escrever' ? U.clamp(.6 + it.chars * .03, .8, 2.2) * R : .85 * R;
      const t0 = it.junto && prev ? prev.t0 + .15 : t;
      const pausa = U.clamp(.25 + it.pal * .11, .35, 1.5) * R * (Q.pausa ?? 1);
      it.t0 = t0; it.din = din;
      if (it.tipo === 'bloco') { it.b.t0 = t0; it.b.din = din; it.b.ent = it.ent; }
      else { it.el.t = t0 - T0; it.el.din = din; }
      t = Math.max(t, t0 + din + pausa); prev = it;
    }
    for (const el of elementos) { if (el.din == null) el.din = el.entrada === 'carimbo' ? .45 * R : .85 * R; el.t0 = T0 + (+el.t || 0); }
    const fim = Q.fim ?? (self.quadros > 1 ? 1.2 : 3.4);
    const ultimo = Math.max(t, ...elementos.map(e => e.t0 + e.din + .4));
    return { Q, L, col, blocos, elementos, T0, t1: ultimo + fim * R, fundo: Q.fundo };
  }

  /* ---------- desenho ---------- */
  function cursor(c, x, base, cap, cor, t) {
    if (Math.floor(t * 2.2) % 2) return;
    c.save(); c.fillStyle = cor; c.fillRect(x + cap * .06, base - cap * 1.05, Math.max(3, cap * .07), cap * 1.25); c.restore();
  }
  function blocoDraw(self, S, b, t) {
    const c = ctx, pal = self.pal, k = t - b.t0; if (k < 0) return;
    const p = U.clamp(k / b.din), ent = b.ent;
    let a = 1, dy = 0, sc = 1, clipW = null;
    if (ent === 'fade') a = U.es(p);
    else if (ent === 'subir') { a = U.es(p); dy = (1 - U.es(p)) * b.S * .35; }
    else if (ent === 'carimbo') { a = U.clamp(p * 2.5); sc = 1 + .18 * (1 - U.eo(p)); }
    else if (ent === 'escrever' || ent === 'revelar') clipW = U.eio(p);
    c.save(); c.globalAlpha = a;
    if (sc !== 1) { const cx = b.x0 + b.w / 2, cy = b.base - b.h / 2; c.translate(cx, cy); c.scale(sc, sc); c.translate(-cx, -cy); }
    if (b.faixa) { // faixa: aparece da esquerda para a direita antes do texto
      const fb = U.eio(U.clamp(k / .35)), pad = b.h * (b.faixa.pad ?? .42);
      const ext = Math.max(pad, (S.col.w - b.w) / 2 + pad * .2), fx = b.faixa.largura === 'texto' ? b.x0 - pad : Math.min(b.x0 - pad, S.col.x - pad * .6), fw = b.faixa.largura === 'texto' ? b.w + 2 * pad : Math.max(b.w + 2 * pad, S.col.w + pad * 1.2);
      c.fillStyle = corDe(b.faixa.cor, pal, pal.tinta); c.fillRect(fx, b.base - b.topo - pad * .6, fw * fb, b.topo + b.desc + pad * 1.2);
    }
    if (clipW != null) { c.beginPath(); c.rect(b.x0 - 40, b.y0 - 60, (b.w + 80) * clipW, b.hb + 120); c.clip(); }
    // digitação: quantos caracteres já apareceram
    const total = b.partes.reduce((s, q) => s + q.linhas.join('').length, 0);
    let vis = ent === 'digitar' ? Math.floor(U.clamp((k - (b.faixa ? .3 : 0)) / Math.max(.01, b.din - (b.faixa ? .3 : 0))) * total + 1e-6) : total;
    let cur = null;
    for (const q of b.ps) {
      const e = q.p.e, cor = corDe(e.cor, pal, pal.tinta);
      c.fillStyle = cor; c.textBaseline = 'alphabetic';
      if (e.contorno) { c.strokeStyle = corDe(e.contorno, pal, pal.tinta); c.lineWidth = Math.max(2, q.s * .04); }
      const nl = q.p.linhas.length;
      for (let li = 0; li < nl; li++) {
        let s = q.p.linhas[li]; if (vis <= 0) break;
        const shown = s.slice(0, Math.max(0, Math.min(s.length, vis))); vis -= s.length;
        usar(c, e, q.s);
        const yb = nl > 1 ? (b.base - q.h) + (li + 1) * (q.h / nl) - (q.h / nl) * .08 : b.base;
        c.fillText(shown, q.x, yb + dy); if (e.contorno) c.strokeText(shown, q.x, yb + dy);
        if (ent === 'digitar' && shown.length < s.length + 1) cur = { x: q.x + c.measureText(shown).width, base: yb + dy, cap: capR(c, e).cap * q.s, cor };
        c.letterSpacing = '0px';
      }
    }
    c.restore();
    if (ent === 'digitar' && self.j.cursor !== false) {
      const ativo = k <= b.din + .05, prox = S.blocos.find(x => x.t0 > b.t0);
      const parado = !ativo && (!prox || t < prox.t0) && (S === self.q[self.q.length - 1] ? t < self.dur - 1.2 : true);
      if (cur && (ativo || parado)) cursor(c, cur.x, cur.base, cur.cap, cur.cor, ativo ? 0 : t);
    }
  }
  function elDraw(self, el, t) {
    const c = ctx, pal = self.pal, k = t - el.t0; if (k < 0) return;
    if (el.sai != null && t > el.T0s + el.sai + .6) return;
    const p = U.clamp(k / el.din), ent = el.entrada || 'fade';
    const out = el.sai != null ? 1 - U.es((t - (el.T0s + el.sai)) / .6) : 1;
    c.save(); c.globalAlpha = (ent === 'fade' || ent === 'subir' ? U.es(p) : ent === 'carimbo' ? U.clamp(p * 2.5) : 1) * out * (el.opacidade ?? 1);
    const cor = corDe(el.cor, pal, pal.tinta);
    if (el.tipo === 'texto' && el.r) {
      const e = el.e, r = el.r, lh = r.size * (el.entrelinha || 1.15), al = el.alinhar || 'center';
      let dy = ent === 'subir' ? (1 - U.es(p)) * 30 : 0;
      if (ent === 'escrever' || ent === 'revelar') { c.beginPath(); c.rect(0, 0, ((el.x || 540) + (el.largura || 900)) * U.eio(p) + 40, H); c.clip(); }
      let lines = r.lines;
      if (ent === 'digitar') { let vis = Math.floor(p * lines.join('').length); lines = lines.map(l => { const s = l.slice(0, Math.max(0, vis)); vis -= l.length; return s; }); }
      if (ent === 'carimbo') { const s = 1 + .18 * (1 - U.eo(p)); c.translate(el.x, el.y); c.scale(s, s); c.translate(-el.x, -el.y); }
      if (el.fundo) { usar(c, e, r.size); const w = Math.max(...r.lines.map(l => c.measureText(l).width)), pad = r.size * .4, hh = lh * r.lines.length; c.letterSpacing = '0px'; c.fillStyle = corDe(el.fundo, pal, pal.tinta); const x0 = al === 'center' ? el.x - w / 2 : al === 'right' ? el.x - w : el.x; if (el.arredondar) { c.beginPath(); c.roundRect(x0 - pad, el.y - hh / 2 - pad * .5, w + 2 * pad, hh + pad, pad * .8); c.fill(); } else c.fillRect(x0 - pad, el.y - hh / 2 - pad * .5, w + 2 * pad, hh + pad); }
      usar(c, e, r.size); c.fillStyle = corDe(e.cor, pal, pal.tinta); c.textAlign = al; c.textBaseline = 'middle';
      const top = el.y - (lines.length - 1) * lh / 2 + dy; lines.forEach((l, i) => c.fillText(l, el.x, top + i * lh)); c.letterSpacing = '0px';
    } else if (el.tipo === 'forma') {
      const d = ent === 'desenhar' ? U.eio(p) : 1, lw = el.espessura || 6;
      c.strokeStyle = cor; c.fillStyle = cor; c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round';
      if (el.forma === 'retangulo') { const w = el.w * d; if (el.preencher) { c.beginPath(); c.roundRect(el.x, el.y, w, el.h, el.raio || 0); c.fill(); } else { c.beginPath(); c.roundRect(el.x, el.y, w, el.h, el.raio || 0); c.stroke(); } }
      else if (el.forma === 'circulo') { c.beginPath(); c.arc(el.x, el.y, el.raio || 40, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * d); el.preencher ? c.fill() : c.stroke(); }
      else if (el.forma === 'linha' || el.forma === 'seta') {
        const x2 = U.lerp(el.x, el.x2, d), y2 = U.lerp(el.y, el.y2, d); c.beginPath(); c.moveTo(el.x, el.y); c.lineTo(x2, y2); c.stroke();
        if (el.forma === 'seta' && d > .95) { const an = Math.atan2(el.y2 - el.y, el.x2 - el.x), s = lw * 4; c.beginPath(); c.moveTo(x2 - s * Math.cos(an - .45), y2 - s * Math.sin(an - .45)); c.lineTo(x2, y2); c.lineTo(x2 - s * Math.cos(an + .45), y2 - s * Math.sin(an + .45)); c.stroke(); }
      }
    } else if (el.tipo === 'desenho' && el.pts) {
      const sc = el.escala || 1; c.translate(el.x || 0, el.y || 0); c.scale(sc, sc);
      c.strokeStyle = cor; c.lineWidth = (el.espessura || 6) / sc; c.lineCap = 'round'; c.lineJoin = 'round';
      const d = ent === 'desenhar' ? U.eio(p) : 1, n = Math.max(1, Math.floor(el.pts.length * d));
      if (el.preencher && d >= 1) { c.fillStyle = corDe(el.preencher, pal, cor); c.fill(el.p2d); }
      c.beginPath(); c.moveTo(el.pts[0].x, el.pts[0].y); for (let i = 1; i < n; i++) c.lineTo(el.pts[i].x, el.pts[i].y); c.stroke();
    }
    c.restore();
  }
  function marcaDraw(self, S, m, t) { // marca-texto atrás de um bloco
    const b = S.blocos[m.bloco]; if (!b) return; const k = t - (b.t0 + (m.depois ?? b.din + .1)); if (k < 0) return;
    const p = U.eio(U.clamp(k / (m.dur || .7))), c = ctx, h = b.h * 1.25;
    c.save(); c.fillStyle = corDe(m.cor, self.pal, self.pal.amarelo); c.globalAlpha = m.opacidade ?? .75;
    c.fillRect(b.x0 - 12, b.base - b.h * 1.02, (b.w + 24) * p, h); c.restore();
  }
  function fundoDraw(self, F, t) {
    const c = ctx, pal = self.pal; F = F || { tipo: 'cor', cor: 'claro' };
    if (F.tipo === 'clipe' || F.tipo === 'clipes') { c.clearRect(0, 0, W, H); const kk = U.clamp(((+(F.luma ?? 110)) - 35) / 90, .3, 1); if (F.veu !== 0) { c.fillStyle = `rgba(0,0,0,${((F.veu ?? .38) * kk).toFixed(3)})`; c.fillRect(0, 0, W, H); } return; }
    if (F.tipo === 'pintura' && self.pint) { const s = 1.05 + .06 * U.eio(U.clamp(t / self.dur)), k = H / 2204 * s; c.drawImage(self.pint, W / 2 - 620 * k, H / 2 - 1102 * k, 1240 * k, 2204 * k); c.fillStyle = `rgba(10,8,6,${F.escurecer ?? .3})`; c.fillRect(0, 0, W, H); return; }
    if (F.tipo === 'gradiente') { const an = (F.angulo ?? 90) * Math.PI / 180, dx = Math.cos(an) * H / 2, dy = Math.sin(an) * H / 2, g = c.createLinearGradient(W / 2 - dx, H / 2 - dy, W / 2 + dx, H / 2 + dy); g.addColorStop(0, corDe(F.de, pal, pal.claro)); g.addColorStop(1, corDe(F.para, pal, pal.creme)); c.fillStyle = g; c.fillRect(0, 0, W, H); return; }
    c.fillStyle = corDe(F.cor, pal, pal.claro); c.fillRect(0, 0, W, H);
    if (F.tipo === 'papel' && self.papel) c.drawImage(self.papel, 0, 0);
  }

  FMT.cena = {
    async setup(j) {
      this.j = j; AVISOS.length = 0;
      this.pal = { ...PAL0, ...(j.paleta || {}) };
      this.est = j.estilos || {};
      this.R = U.clamp(+j.ritmo || 1, .6, 1.8);
      const QS = Array.isArray(j.quadros) && j.quadros.length ? j.quadros.map(q => ({ fundo: j.fundo, layout: j.layout, ...q })) : [j];
      this.quadros = QS.length;
      // carrega todas as fontes usadas
      const usadas = new Set(['600 34px Fredoka']);
      const add = e => { const n = norm(e, this.est); usadas.add(fontStr(n, 60)); };
      Object.values(this.est).forEach(add);
      for (const Q of QS) { (Q.blocos || []).forEach(b => (b.partes || [{ estilo: b.estilo }]).forEach(p => add(p.estilo))); (Q.elementos || []).forEach(el => el.tipo === 'texto' && add(el.estilo)); }
      await fontes([...usadas]);
      const F = j.fundo || {};
      this.alpha = F.tipo === 'clipe' || F.tipo === 'clipes';
      if (F.tipo === 'pintura') { const sd = +F.semente || 1, CV = ['perfil olhando o céu', 'à janela', 'recolhimento']; this.pint = pinturaDe({ cena: CV.includes(F.cena) ? F.cena : CV[sd % 3], paleta: F.paleta, semente: sd, __semente: sd }, 1240, 2204); }
      if (F.tipo === 'papel') { const p = this.papel = document.createElement('canvas'); p.width = W; p.height = H; const c = p.getContext('2d'), r = U.rng(hash(JSON.stringify(j).slice(0, 200))); for (let k = 0; k < 3000; k++) { c.fillStyle = `rgba(120,100,70,${(.02 + r() * .04).toFixed(3)})`; c.fillRect(r() * W, r() * H, 1 + r() * 2, 1 + r() * 2); } }
      this.q = []; let t = 0;
      for (const Q of QS) { const S = montar(this, Q, t); for (const el of S.elementos) el.T0s = S.T0; this.q.push(S); t = S.t1; }
      this.dur = Math.min(60, t);
      const fundoClaro = !this.alpha && F.tipo !== 'pintura' && luma(corDe(F.cor || F.de, this.pal, this.pal.claro)) > 140;
      this.assin = j.assinatura === false ? null : { y: (j.assinatura && j.assinatura.y) || H - 110, light: j.assinatura && j.assinatura.clara != null ? !!j.assinatura.clara : !fundoClaro };
      // cortes para a trilha: início de alguns blocos (no máximo 6) e o fim
      const ini = this.q.flatMap(S => S.blocos.map(b => b.t0)).sort((a, b) => a - b);
      const passo = Math.max(1, Math.ceil(ini.length / 5));
      const cortes = [0, ...ini.filter((_, i) => i > 0 && i % passo === 0), this.dur];
      // capa: o último quadro já completo
      return { dur: this.dur, fps: 30, alpha: this.alpha, cortes, capa_t: Math.max(.3, this.dur - .5), avisos: AVISOS.slice() };
    },
    frame(t) {
      const c = ctx, j = this.j;
      c.clearRect(0, 0, W, H);
      const cam = j.camera || 'zoom_lento';
      for (let qi = 0; qi < this.q.length; qi++) {
        const S = this.q[qi], ultimo = qi === this.q.length - 1;
        const aIn = qi === 0 ? 1 : U.es((t - S.T0 + .3) / .6), aOut = ultimo ? 1 : 1 - U.es((t - S.t1 + .3) / .6);
        const a = Math.min(aIn, aOut); if (a <= 0 || t < S.T0 - .35 || (!ultimo && t > S.t1 + .35)) continue;
        c.save(); c.globalAlpha = a;
        fundoDraw(this, S.fundo || j.fundo, t);
        const p = U.clamp((t - S.T0) / Math.max(1, S.t1 - S.T0));
        if (cam === 'zoom_lento') { const s = 1 + .035 * U.eio(p); c.translate(W / 2, H / 2); c.scale(s, s); c.translate(-W / 2, -H / 2); }
        else if (cam === 'deriva') { c.translate(Math.sin(t * .4) * 8, Math.cos(t * .33) * 10); }
        for (const m of (S.Q.marcas || [])) marcaDraw(this, S, m, t);
        for (const b of S.blocos) blocoDraw(this, S, b, t);
        for (const el of S.elementos) elDraw(this, el, t);
        c.restore();
      }
      if (this.assin) assinatura(c, this.assin.y, { light: this.assin.light, alpha: U.ss(this.dur - 2.6, this.dur - 1.9, t) * .95 });
      const F = j.fundo || {};
      if (!this.alpha && (j.grao ?? (F.tipo === 'papel' ? .04 : .03)) > 0) grao(c, F.tipo === 'pintura' ? Math.floor(t * 10) : 0, j.grao ?? (F.tipo === 'papel' ? .04 : .03), F.tipo === 'papel' ? 'multiply' : 'overlay');
    }
  };
})();
