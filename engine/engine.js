/* Motor de vídeo TQC: cada quadro é desenhado num canvas 1080x1920.
   TQC.setup(job) prepara (fontes, fundo, linha do tempo) e devolve {dur,fps,alpha}.
   TQC.frame(t) desenha o instante t (segundos). render.py captura e codifica. */
const W = 1080, H = 1920;
const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
const COR = { ciano: '#01B3D7', rosa: '#FD5C96', rosaClaro: '#FF8DD3', tinta: '#0E2A33', creme: '#F6EBD9' };
const U = {
  clamp: (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)),
  lerp: (a, b, t) => a + (b - a) * t,
  ss: (a, b, x) => { const t = U.clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); },
  eio: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  eo: t => 1 - Math.pow(1 - t, 3),
  rng: seed => { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; },
  noise1: seed => { const r = U.rng(seed), v = Array.from({ length: 256 }, () => r() * 2 - 1); return x => { const i = Math.floor(x), f = x - i, a = v[i & 255], b = v[(i + 1) & 255], u = f * f * (3 - 2 * f); return a + (b - a) * u; }; }
};
const fontes = list => Promise.all(list.map(f => document.fonts.load(f, 'ÁÉãçõ Abg'))).then(() => document.fonts.ready);
const SYM = new Image(); SYM.src = LOGO_SYM;

let GRAOS = null;
function grao(c, i, alpha, mode) {
  if (!GRAOS) {
    GRAOS = []; const r = U.rng(7);
    for (let k = 0; k < 4; k++) {
      const g = document.createElement('canvas'); g.width = 540; g.height = 960;
      const gc = g.getContext('2d'), im = gc.createImageData(540, 960);
      for (let p = 0; p < im.data.length; p += 4) { const v = (r() * 255) | 0; im.data[p] = im.data[p + 1] = im.data[p + 2] = v; im.data[p + 3] = 255; }
      gc.putImageData(im, 0, 0); GRAOS.push(g);
    }
  }
  c.save(); c.globalAlpha = alpha; c.globalCompositeOperation = mode || 'overlay'; c.imageSmoothingEnabled = false;
  c.drawImage(GRAOS[i % 4], 0, 0, W, H); c.restore();
}

/* ---------- texto ---------- */
function quebrar(c, txt, maxW) {
  const out = [];
  for (const par of String(txt).split('\n')) {
    const ws = par.split(/\s+/).filter(Boolean); let cur = '';
    for (const w of ws) { const t = cur ? cur + ' ' + w : w; if (!cur || c.measureText(t).width <= maxW) cur = t; else { out.push(cur); cur = w; } }
    out.push(cur);
  }
  return out;
}
const CURTAS = new Set(['o', 'a', 'os', 'as', 'e', 'é', 'de', 'do', 'da', 'em', 'no', 'na', 'um', 'uma', 'que', 'se', 'por', 'pra', 'com', 'ao', 'à', 'nem', 'mas', 'ou']);
function arrumar(c, L, maxW) { // nada de palavra curta pendurada no fim da linha
  for (let i = 0; i < L.length - 1; i++) {
    const ws = L[i].split(' '); if (ws.length < 2) continue;
    const ult = ws[ws.length - 1].toLowerCase();
    if (CURTAS.has(ult) && c.measureText(ws[ws.length - 1] + ' ' + L[i + 1]).width <= maxW) { L[i + 1] = ws.pop() + ' ' + L[i + 1]; L[i] = ws.join(' '); }
  }
  return L;
}
function equilibrar(c, txt, maxW) {
  const L = quebrar(c, txt, maxW); if (L.length < 2) return L;
  // frases com pontuação: uma por linha, se couberem
  const partes = String(txt).split(/(?<=[.!?…:;])\s+/).filter(Boolean);
  if (partes.length > 1 && partes.length <= L.length + 1 && partes.every(p => c.measureText(p).width <= maxW)) return partes;
  let lo = maxW * .45, hi = maxW;
  for (let k = 0; k < 14; k++) { const m = (lo + hi) / 2; if (quebrar(c, txt, m).length > L.length) lo = m; else hi = m; }
  return arrumar(c, quebrar(c, txt, hi), maxW);
}
function caber(c, txt, font, size, maxW, maxL, min) {
  const partes = String(txt).split(/(?<=[.!?…:;])\s+/).filter(Boolean);
  if (partes.length > 1 && partes.length <= maxL) { // uma frase por linha, mesmo que a letra diminua um pouco
    for (let s = size; s >= Math.max(min, size * .78); s -= 2) { c.font = font.replace('#', s); if (partes.every(p => c.measureText(p).width <= maxW)) return { size: s, lines: partes, font }; }
  }
  let s = size;
  for (;;) { c.font = font.replace('#', s); const L = equilibrar(c, txt, maxW); if (L.length <= maxL || s <= min) return { size: s, lines: L, font }; s -= 4; }
}
function texto(c, o) {
  const { lines, size, font, x, y, lh, cor, alpha = 1, dy = 0, blur = 0, sombra = true, align = 'center' } = o;
  if (alpha <= .002) return;
  c.save(); c.globalAlpha = alpha; c.font = font.replace('#', size); c.textAlign = align; c.textBaseline = 'middle'; c.fillStyle = cor;
  if (blur > .3) c.filter = `blur(${blur.toFixed(2)}px)`;
  if (sombra) { c.shadowColor = sombra === true ? 'rgba(0,0,0,.55)' : sombra; c.shadowBlur = 30; c.shadowOffsetY = 3; }
  const top = y - (lines.length - 1) * lh / 2 + dy;
  lines.forEach((l, i) => c.fillText(l, x, top + i * lh));
  c.restore();
}
function assinatura(c, y, { light = true, alpha = 1 } = {}) {
  if (alpha <= .002) return;
  c.save(); c.globalAlpha = alpha;
  const h = 48, w = SYM.naturalWidth ? h * SYM.naturalWidth / SYM.naturalHeight : 0;
  c.font = '600 34px Fredoka'; const tw = c.measureText('terapiaquecura.com.br').width, x = W / 2 - (w + 16 + tw) / 2;
  if (light) { c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 16; }
  if (w) c.drawImage(SYM, x, y - h / 2 - 3, w, h);
  c.fillStyle = light ? 'rgba(255,255,255,.96)' : '#3E5660'; c.textBaseline = 'middle'; c.fillText('terapiaquecura.com.br', x + w + 16, y);
  c.restore();
}

const FMT = {};

/* ---------- 1. Frases que se sucedem (sobre pintura viva ou sobre clipe) ---------- */
FMT.frases = {
  async setup(j) {
    this.j = j;
    await fontes(['500 80px "EB Garamond"', 'italic 400 60px "EB Garamond"', '600 34px Fredoka']);
    const c = ctx; let t = .35;
    const F1 = '500 #px "EB Garamond"', FI = 'italic 400 #px "EB Garamond"';
    this.ab = j.abertura ? { t0: t, ...caber(c, j.abertura, FI, 76, 880, 3, 50) } : null; if (this.ab) t += 1.6;
    this.tl = (j.frases || []).map(f => { const d = U.clamp(.35 + f.length / 24, 1.05, 2.1); const it = { t0: t, t1: t + d, ...caber(c, f, F1, 100, 900, 3, 60) }; t += d; return it; });
    this.fe = j.fecho ? { t0: t, ...caber(c, j.fecho, F1, 108, 900, 4, 64) } : null; if (this.fe) t += 3.2;
    this.dur = t + .3;
    this.alpha = !!(j.fundo && (j.fundo.tipo === 'clipe' || j.fundo.tipo === 'clipes'));
    if (!this.alpha) {
      const f = j.fundo || {}, sd = +f.semente || 1, CV = ['perfil olhando o céu', 'à janela', 'recolhimento'], cena = CV.includes(f.cena) ? f.cena : CV[sd % 3];
      this.pint = pinturaDe({ cena, paleta: f.paleta, semente: sd, __semente: sd }, 1240, 2204);
      const d = this.pint.getContext('2d').getImageData(0, 0, 1240, 2204).data; let L = 0, n = 0; for (let i = 0; i < d.length; i += 4 * 97) { L += .2126 * d[i] + .7152 * d[i + 1] + .0722 * d[i + 2]; n++; }
      this.escurecer = U.clamp((L / n - 60) / 220, .08, .32);
    }
    this.nz = U.noise1(hash(JSON.stringify(j)));
    const cortes = [0, ...this.tl.slice(1).map(x => x.t0), ...(this.fe ? [this.fe.t0] : []), this.dur];
    const f1 = this.tl[0], capa_t = f1 ? f1.t0 + (f1.t1 - f1.t0) * .55 : this.dur * .5;
    return { dur: this.dur, fps: 30, alpha: this.alpha, cortes, capa_t };
  },
  frame(t) {
    const c = ctx, j = this.j, p = U.clamp(t / this.dur);
    c.clearRect(0, 0, W, H);
    if (!this.alpha) {
      const s = 1.05 + .08 * U.eio(p), k = H / 2204 * s, w = 1240 * k, h = 2204 * k;
      const cx = W / 2 + this.nz(t * .12) * 20, cy = H / 2 + this.nz(t * .1 + 50) * 26;
      c.drawImage(this.pint, cx - w / 2, cy - h / 2, w, h);
      c.fillStyle = `rgba(12,9,7,${this.escurecer.toFixed(3)})`; c.fillRect(0, 0, W, H);
      const g = c.createLinearGradient(0, H * .42, 0, H); g.addColorStop(0, 'rgba(8,6,5,0)'); g.addColorStop(.45, 'rgba(8,6,5,.50)'); g.addColorStop(1, 'rgba(8,6,5,.72)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
      const lx = W * .78 + this.nz(t * .2 + 9) * 90, lg = c.createRadialGradient(lx, H * .16, 0, lx, H * .16, 760);
      lg.addColorStop(0, `rgba(255,214,150,${(.10 + .05 * Math.sin(t * 1.3)).toFixed(3)})`); lg.addColorStop(1, 'rgba(255,214,150,0)');
      c.globalCompositeOperation = 'screen'; c.fillStyle = lg; c.fillRect(0, 0, W, H); c.globalCompositeOperation = 'source-over';
    } else {
      const kk = U.clamp(((+(j.fundo.luma ?? 110)) - 35) / 90, .3, 1); // clipe escuro pede menos véu
      const g = c.createLinearGradient(0, H * .42, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.45, `rgba(0,0,0,${(.42 * kk).toFixed(3)})`); g.addColorStop(1, `rgba(0,0,0,${(.62 * kk).toFixed(3)})`);
      c.fillStyle = g; c.fillRect(0, 0, W, H);
    }
    const CR = j.cor || COR.creme, fe = this.fe, feIn = fe ? U.ss(fe.t0 - .15, fe.t0 + .45, t) : 0;
    if (this.ab) {
      const q = U.clamp((t - this.ab.t0) / .7);
      texto(c, { ...this.ab, x: W / 2, y: H * .615, lh: this.ab.size * 1.18, cor: CR, alpha: U.eo(q) * (1 - feIn), dy: (1 - U.eo(q)) * 16, blur: (1 - q) * 8 });
    }
    for (const it of this.tl) {
      if (t < it.t0 - .05 || t > it.t1 + .45) continue;
      const ai = U.clamp((t - it.t0) / .38), ao = U.clamp((t - (it.t1 - .22)) / .3);
      texto(c, { ...it, x: W / 2, y: H * .745, lh: it.size * 1.1, cor: CR, alpha: U.eo(ai) * (1 - ao), dy: (1 - U.eo(ai)) * 18 - ao * 10, blur: (1 - ai) * 9 + ao * 6 });
    }
    if (fe) { const ai = U.clamp((t - fe.t0) / .6); if (ai > 0) texto(c, { ...fe, x: W / 2, y: H * .70, lh: fe.size * 1.1, cor: CR, alpha: U.eo(ai), dy: (1 - U.eo(ai)) * 18, blur: (1 - ai) * 9 }); }
    assinatura(c, H - 120, { light: true, alpha: U.ss(this.dur - 2.7, this.dur - 2.0, t) * .95 });
    if (!this.alpha) grao(c, Math.floor(t * 10), .07);
  }
};

/* ---------- 2. Marca-texto em página de livro ---------- */
FMT.marcatexto = {
  async setup(j) {
    this.j = j;
    await fontes(['400 50px "EB Garamond"', 'italic 400 50px "EB Garamond"', '500 26px "EB Garamond"', '600 34px Fredoka']);
    const PW = 1800, GX = 170, X0 = 300, X1 = 1420, FS = 56, LH = 88;
    let PH = 2700;
    const r = U.rng(hash(JSON.stringify(j))), pg = document.createElement('canvas'); const c = pg.getContext('2d');
    { // altura da página conforme o texto
      c.font = `400 ${FS}px "EB Garamond"`; let nl = 0;
      for (const par of j.paragrafos || []) nl += quebrar(c, par.replace(/\[\[|\]\]/g, ''), X1 - X0 - 30).length + .2;
      PH = Math.max(2500, Math.round(430 + nl * LH + 330));
    }
    pg.width = PW; pg.height = PH; this.PW = PW; this.PH = PH; this.FS = FS;
    // papel
    c.fillStyle = '#EFE5D2'; c.fillRect(0, 0, PW, PH);
    for (let k = 0; k < 22; k++) { const x = r() * PW, y = r() * PH, rr = 200 + r() * 600, g = c.createRadialGradient(x, y, 0, x, y, rr); const a = .03 + r() * .04; g.addColorStop(0, r() < .5 ? `rgba(255,250,235,${a})` : `rgba(170,140,95,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, PW, PH); }
    c.lineCap = 'round';
    for (let k = 0; k < 9000; k++) { const x = r() * PW, y = r() * PH, a = r() * Math.PI, l = 2 + r() * 9; c.strokeStyle = `rgba(${120 + r() * 50 | 0},${95 + r() * 40 | 0},${60 + r() * 30 | 0},${(.03 + r() * .05).toFixed(3)})`; c.lineWidth = .6 + r() * .8; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke(); }
    // página da esquerda (tom mais frio) e dobra
    c.fillStyle = 'rgba(120,105,80,.10)'; c.fillRect(0, 0, GX, PH);
    c.font = `400 ${FS}px "EB Garamond"`; c.fillStyle = 'rgba(40,34,28,.85)'; c.textAlign = 'right'; c.textBaseline = 'alphabetic';
    const lixo = 'que nunca disse o que sentia e por isso aprendeu cedo a medir cada palavra antes de falar com quem amava'.split(' ');
    for (let y = 420; y < PH - 280; y += LH) { if (r() < .08) continue; let s = ''; while (c.measureText(s).width < 520) s = lixo[(r() * lixo.length) | 0] + ' ' + s; c.fillText(s.trim(), GX - 46, y); }
    const gs = c.createLinearGradient(GX - 70, 0, GX + 190, 0);
    gs.addColorStop(0, 'rgba(70,50,30,0)'); gs.addColorStop(.27, 'rgba(70,50,30,.42)'); gs.addColorStop(.33, 'rgba(50,35,20,.55)'); gs.addColorStop(.55, 'rgba(70,50,30,.16)'); gs.addColorStop(1, 'rgba(70,50,30,0)');
    c.fillStyle = gs; c.fillRect(GX - 70, 0, 260, PH);
    // cabeçalho e número da página
    c.textAlign = 'center'; c.fillStyle = 'rgba(45,38,30,.75)'; c.font = '500 26px "EB Garamond"'; c.letterSpacing = '5px';
    c.fillText(String(j.cabecalho || '').toUpperCase(), (X0 + X1) / 2, 300); c.letterSpacing = '0px';
    c.font = `400 ${FS - 10}px "EB Garamond"`; c.fillText(String(j.pagina || ''), (X0 + X1) / 2, PH - 230);
    // texto justificado, guardando as palavras marcadas
    c.font = `400 ${FS}px "EB Garamond"`; c.textAlign = 'left';
    const sp = c.measureText(' ').width, words = [];
    let y = 430;
    for (const par of j.paragrafos || []) {
      const toks = []; let hl = false;
      for (const raw of par.split(/\s+/).filter(Boolean)) {
        let w = raw; const ini = w.startsWith('[['); if (ini) { w = w.slice(2); hl = true; }
        const fim = w.includes(']]'); if (fim) w = w.replace(']]', '');
        toks.push({ w, hl, wd: c.measureText(w).width }); if (fim) hl = false;
      }
      let i = 0, first = true;
      while (i < toks.length) {
        const ind = first ? 64 : 0, maxW = X1 - X0 - ind; let wsum = 0, n = 0;
        while (i + n < toks.length && (n === 0 || wsum + sp * n + toks[i + n].wd <= maxW)) { wsum += toks[i + n].wd; n++; }
        const last = i + n >= toks.length, gap = last || n < 2 ? sp : (maxW - wsum) / (n - 1);
        let x = X0 + ind;
        for (let k = 0; k < n; k++) { const tk = toks[i + k]; words.push({ ...tk, x, y }); x += tk.wd + gap; }
        i += n; y += LH; first = false;
      }
      y += 14;
    }
    c.filter = 'blur(0.35px)';
    for (const w of words) { c.fillStyle = `rgba(36,30,25,${(.86 + r() * .12).toFixed(3)})`; c.fillText(w.w, w.x, w.y); }
    c.filter = 'none';
    this.pg = pg;
    // trechos marcados por linha
    const byY = new Map(); for (const w of words) if (w.hl) { const L = byY.get(w.y) || []; L.push(w); byY.set(w.y, L); }
    let t = 1.7; this.hl = [];
    for (const [yy, L] of [...byY.entries()].sort((a, b) => a[0] - b[0])) {
      const x0 = L[0].x - 12, x1 = L[L.length - 1].x + L[L.length - 1].wd + 14, d = .42 + (x1 - x0) / 1050;
      const nz = U.noise1(hash('m' + yy));
      this.hl.push({ x0, x1, y: yy, t0: t, d, nz }); t += d + .2;
    }
    this.dur = t + 2.8;
    const hx = this.hl.length ? (this.hl[0].x0 + this.hl[this.hl.length - 1].x1) / 2 : (X0 + X1) / 2;
    const hy = this.hl.length ? (this.hl[0].y + this.hl[this.hl.length - 1].y) / 2 : PH / 2;
    const hx0 = this.hl.length ? Math.min(...this.hl.map(h => h.x0)) : X0, hx1 = this.hl.length ? Math.max(...this.hl.map(h => h.x1)) : X1;
    this.sFim = U.clamp(W * .94 / (hx1 - hx0 + 40), .8, .95);
    this.foco = { x: (hx0 + hx1) / 2 + 6, y: hy - FS * .3 };
    this.ini = { x: (X0 + X1) / 2 - 70, y: U.lerp(PH / 2, hy, .35) };
    this.nz = U.noise1(hash(JSON.stringify(j)) + 3);
    this.off = document.createElement('canvas'); this.off.width = W; this.off.height = H;
    this.msk = document.createElement('canvas'); this.msk.width = W; this.msk.height = H;
    return { dur: this.dur, fps: 30, alpha: false };
  },
  marca(c, t) {
    const FS = this.FS, hh = FS * 1.12;
    c.save(); c.globalCompositeOperation = 'multiply';
    for (const L of this.hl) {
      const q = U.clamp((t - L.t0) / L.d); if (q <= 0) continue;
      const e = q * .82 + U.eio(q) * .18, x0 = L.x0, x1 = x0 + (L.x1 - x0) * e, yc = L.y - FS * .33, sl = 12;
      const top = x => yc - hh / 2 + L.nz(x * .012) * 3.5, bot = x => yc + hh / 2 + L.nz(x * .012 + 40) * 3.5;
      c.beginPath(); c.moveTo(x0 + sl, top(x0));
      for (let x = x0 + sl; x < x1 + sl; x += 14) c.lineTo(x, top(x));
      c.lineTo(x1 + sl, top(x1 + sl)); c.lineTo(x1, bot(x1));
      for (let x = x1; x > x0; x -= 14) c.lineTo(x, bot(x));
      c.lineTo(x0, bot(x0)); c.closePath();
      c.fillStyle = 'rgba(255,233,64,.62)'; c.fill();
      c.save(); c.clip();
      for (let k = 0; k < 7; k++) { const yy = yc - hh / 2 + (k + .5) * hh / 7 + L.nz(k * 7.3) * 2; c.fillStyle = `rgba(255,224,40,${(.10 + .12 * Math.abs(L.nz(k * 3.1 + 9))).toFixed(3)})`; c.fillRect(x0, yy - 3, x1 - x0 + sl, 4 + 3 * Math.abs(L.nz(k + 20))); }
      if (q >= 1) { c.fillStyle = 'rgba(255,215,40,.22)'; c.fillRect(x1 - 6, yc - hh / 2, 12 + sl, hh); }
      c.restore();
    }
    c.restore();
  },
  frame(t) {
    const c = ctx, p = U.clamp(t / this.dur), e = U.eio(p);
    c.fillStyle = '#20180f'; c.fillRect(0, 0, W, H);
    const s = U.lerp(.80, this.sFim, e), cx = U.lerp(this.ini.x, this.foco.x, e) + this.nz(t * .35) * 7, hv = H / 2 / s + 60;
    let cy = U.lerp(this.ini.y, this.foco.y, e) + this.nz(t * .3 + 20) * 7; cy = this.PH > 2 * hv ? U.clamp(cy, hv, this.PH - hv) : this.PH / 2;
    const rot = (-2.2 + this.nz(t * .15 + 40) * .35) * Math.PI / 180;
    c.save(); c.translate(W / 2, H / 2); c.rotate(rot); c.scale(s, s); c.translate(-cx, -cy);
    c.drawImage(this.pg, 0, 0); this.marca(c, t); c.restore();
    // luz de janela e vinheta
    const lg = c.createRadialGradient(W * .9, -150, 0, W * .9, -150, 1700); lg.addColorStop(0, 'rgba(255,226,180,.20)'); lg.addColorStop(1, 'rgba(255,226,180,0)');
    c.globalCompositeOperation = 'soft-light'; c.fillStyle = lg; c.fillRect(0, 0, W, H); c.globalCompositeOperation = 'source-over';
    const vg = c.createRadialGradient(W / 2, H * .5, 520, W / 2, H * .5, 1250); vg.addColorStop(0, 'rgba(25,15,5,0)'); vg.addColorStop(1, 'rgba(25,15,5,.42)'); c.fillStyle = vg; c.fillRect(0, 0, W, H);
    // profundidade de campo: topo e base desfocados
    const o = this.off.getContext('2d'), m = this.msk.getContext('2d');
    o.clearRect(0, 0, W, H); o.filter = 'blur(5px)'; o.drawImage(cv, 0, 0); o.filter = 'none';
    m.globalCompositeOperation = 'source-over'; m.clearRect(0, 0, W, H); m.drawImage(this.off, 0, 0);
    const mg = m.createLinearGradient(0, 0, 0, H); mg.addColorStop(0, 'rgba(0,0,0,1)'); mg.addColorStop(.2, 'rgba(0,0,0,0)'); mg.addColorStop(.8, 'rgba(0,0,0,0)'); mg.addColorStop(1, 'rgba(0,0,0,1)');
    m.globalCompositeOperation = 'destination-in'; m.fillStyle = mg; m.fillRect(0, 0, W, H);
    c.drawImage(this.msk, 0, 0);
    grao(c, Math.floor(t * 7.5), .045);
  }
};

/* ---------- 3. Gráfico desenhado à mão: como imaginam × como é ---------- */
FMT.grafico = {
  async setup(j) {
    this.j = j;
    await fontes(['700 66px Caveat', '600 44px Caveat', '500 40px Caveat', '600 34px Fredoka']);
    const r = U.rng(hash(JSON.stringify(j)));
    const P = (j.paineis || []).slice(0, 2);
    const boxes = [{ x0: 170, x1: 960, y0: 300, y1: 800, ty: 205 }, { x0: 170, x1: 960, y0: 1040, y1: 1540, ty: 945 }];
    const cores = [COR.rosa, COR.ciano];
    let t = .3; this.pn = [];
    P.forEach((pn, i) => {
      const b = boxes[i], pts = this.curva(pn, b), nz = U.noise1(hash('p' + i + pn.titulo));
      const jit = pts.map((q, k) => ({ x: q.x + nz(k * .05) * 2.2, y: q.y + nz(k * .05 + 70) * 2.2 }));
      let L = 0; const acc = [0]; for (let k = 1; k < jit.length; k++) { L += Math.hypot(jit[k].x - jit[k - 1].x, jit[k].y - jit[k - 1].y); acc.push(L); }
      const tt = t, ta = t + .35, tl = ta + .9, dl = U.clamp(L / 900, 2.4, 3.6);
      const rot = (pn.rotulos || []).map(rt => { const xx = b.x0 + (b.x1 - b.x0) * rt.x; let k = jit.findIndex(q => q.x >= xx); if (k < 0) k = jit.length - 1; return { ...rt, k, ang: (r() - .5) * .08, p: acc[k] / L }; });
      this.pn.push({ ...pn, b, cor: cores[i], pts: jit, acc, L, tt, ta, tl, dl, rot, eixoNz: U.noise1(hash('e' + i)) });
      t = tl + dl + .6;
    });
    this.tf = t; this.dur = t + (j.fecho ? 3.6 : 1.8);
    this.fe = j.fecho ? caber(ctx, j.fecho, '700 #px Caveat', 64, 900, 2, 44) : null;
    this.papel = document.createElement('canvas'); this.papel.width = W; this.papel.height = H;
    const c = this.papel.getContext('2d'); c.fillStyle = '#FBF8F1'; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(14,42,51,.07)'; for (let y = 60; y < H; y += 48) for (let x = 60; x < W; x += 48) { c.beginPath(); c.arc(x, y, 2, 0, 7); c.fill(); }
    for (let k = 0; k < 3000; k++) { c.fillStyle = `rgba(120,100,70,${(.02 + r() * .04).toFixed(3)})`; c.fillRect(r() * W, r() * H, 1 + r() * 2, 1 + r() * 2); }
    return { dur: this.dur, fps: 30, alpha: false };
  },
  curva(pn, b) {
    const X = u => b.x0 + 30 + (b.x1 - b.x0 - 50) * u, Y = v => b.y1 - (b.y1 - b.y0 - 30) * v, pts = [];
    if (pn.tipo === 'escada') {
      const n = Math.max(2, (pn.rotulos || []).length || 5), top = .9, bot = .06;
      for (let i = 0; i < n; i++) {
        const v = top - (top - bot) * i / (n - 1), u0 = i / n, u1 = (i + 1) / n;
        if (i > 0) { const vp = top - (top - bot) * (i - 1) / (n - 1); for (let s = 0; s <= 1; s += .05) pts.push({ x: X(u0), y: Y(U.lerp(vp, v, s)) }); }
        for (let u = u0; u <= u1 + 1e-6; u += .004) pts.push({ x: X(u), y: Y(v) });
      }
    } else if (pn.tipo === 'reta') {
      for (let u = 0; u <= 1; u += .004) pts.push({ x: X(u), y: Y(U.lerp(.9, .06, u)) });
    } else {
      const picos = (pn.rotulos || []).filter(q => q.tipo !== 'vale').map(q => q.x), vales = (pn.rotulos || []).filter(q => q.tipo === 'vale').map(q => q.x);
      for (let u = 0; u <= 1; u += .002) {
        let v = .22 + .64 * Math.exp(-u * 2.6) + .05 * Math.sin(u * 31) * Math.exp(-u * 1.2) + .03 * Math.sin(u * 67 + 1);
        for (const pk of picos) v += .30 * Math.exp(-Math.pow((u - pk) / .022, 2)) * (1 - .25 * u);
        for (const vl of vales) v -= .10 * Math.exp(-Math.pow((u - vl) / .03, 2));
        pts.push({ x: X(u), y: Y(U.clamp(v, .03, .97)) });
      }
    }
    return pts;
  },
  linhaMao(c, pts, upto, cor, lw) {
    if (upto < 2) return;
    c.save(); c.strokeStyle = cor; c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(pts[0].x, pts[0].y); for (let k = 1; k < upto; k++) c.lineTo(pts[k].x, pts[k].y); c.stroke(); c.restore();
  },
  frame(t) {
    const c = ctx; c.drawImage(this.papel, 0, 0);
    for (const pn of this.pn) {
      const b = pn.b, at = U.clamp((t - pn.tt) / .5);
      // título com sublinhado
      if (at > 0) {
        texto(c, { lines: [pn.titulo], size: 62, font: '700 #px Caveat', x: W / 2, y: b.ty, lh: 70, cor: COR.tinta, alpha: U.eo(at), dy: (1 - U.eo(at)) * 12, sombra: false });
        c.font = '700 62px Caveat'; const tw = c.measureText(pn.titulo).width, us = U.clamp((t - pn.tt - .3) / .5);
        if (us > 0) { c.save(); c.strokeStyle = pn.cor; c.globalAlpha = .85; c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); const ux0 = W / 2 - tw / 2, ux1 = ux0 + tw * U.eo(us); c.moveTo(ux0, b.ty + 38); for (let x = ux0; x <= ux1; x += 10) c.lineTo(x, b.ty + 38 + pn.eixoNz(x * .02) * 3); c.stroke(); c.restore(); }
      }
      // eixos
      const ea = U.clamp((t - pn.ta) / .8);
      if (ea > 0) {
        c.save(); c.strokeStyle = COR.tinta; c.lineWidth = 5; c.lineCap = 'round'; c.lineJoin = 'round';
        const ey = U.eo(U.clamp(ea * 2)), ex = U.eo(U.clamp(ea * 2 - 1));
        c.beginPath(); c.moveTo(b.x0, b.y0 - 10); for (let s = 0; s <= ey; s += .02) c.lineTo(b.x0 + pn.eixoNz(s * 5) * 2, U.lerp(b.y0 - 10, b.y1, s)); c.stroke();
        if (ex > 0) { c.beginPath(); c.moveTo(b.x0, b.y1); for (let s = 0; s <= ex; s += .02) c.lineTo(U.lerp(b.x0, b.x1 + 20, s), b.y1 + pn.eixoNz(s * 5 + 9) * 2); c.stroke(); }
        if (ey >= 1) { c.beginPath(); c.moveTo(b.x0 - 14, b.y0 + 8); c.lineTo(b.x0, b.y0 - 12); c.lineTo(b.x0 + 14, b.y0 + 8); c.stroke(); }
        if (ex >= 1) { c.beginPath(); c.moveTo(b.x1 + 2, b.y1 - 14); c.lineTo(b.x1 + 22, b.y1); c.lineTo(b.x1 + 2, b.y1 + 14); c.stroke(); }
        c.restore();
        c.save(); c.globalAlpha = U.ss(.4, 1, ea); c.fillStyle = COR.tinta; c.font = '600 48px Caveat';
        c.textAlign = 'right'; c.textBaseline = 'middle'; c.fillText(this.j.eixo_y || 'dor', b.x0 - 20, b.y0 + 16);
        c.textAlign = 'right'; c.textBaseline = 'top'; c.fillText(this.j.eixo_x || 'tempo', b.x1 + 20, b.y1 + 16); c.restore();
      }
      // a linha
      const lp = U.clamp((t - pn.tl) / pn.dl); if (lp <= 0) continue;
      const tgt = pn.L * (lp * .85 + U.eio(lp) * .15); let k = pn.acc.findIndex(a => a >= tgt); if (k < 0) k = pn.pts.length;
      this.linhaMao(c, pn.pts, k, pn.cor, 8);
      if (lp < 1 && k > 0) { const q = pn.pts[Math.min(k, pn.pts.length - 1)]; c.save(); c.fillStyle = COR.tinta; c.beginPath(); c.arc(q.x, q.y, 6, 0, 7); c.fill(); c.restore(); }
      for (const rt of pn.rot) {
        if (k < rt.k) continue; const q = pn.pts[rt.k], since = U.clamp((t - pn.tl - rt.p * pn.dl) / .35);
        const up = rt.lado ? rt.lado === 'cima' : (pn.tipo === 'escada' ? true : rt.tipo !== 'vale');
        c.save(); c.globalAlpha = U.eo(since); c.translate(q.x + (rt.dx || 0), q.y + (up ? -50 : 56)); c.rotate(rt.ang); c.scale(.8 + .2 * U.eo(since), .8 + .2 * U.eo(since));
        c.fillStyle = COR.tinta; c.font = '600 44px Caveat'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(rt.txt, 0, 0); c.restore();
      }
    }
    if (this.fe) {
      const a = U.clamp((t - this.tf) / .7);
      texto(c, { ...this.fe, x: W / 2, y: 1690, lh: this.fe.size * 1.05, cor: COR.tinta, alpha: U.eo(a), dy: (1 - U.eo(a)) * 14, sombra: false });
    }
    assinatura(c, H - 105, { light: false, alpha: U.ss(this.dur - 2.6, this.dur - 1.9, t) });
    grao(c, 0, .04, 'multiply');
  }
};

window.TQC = {
  fmt: null,
  async setup(job) { await new Promise(r => SYM.complete ? r() : (SYM.onload = r)); this.fmt = FMT[job.formato]; if (!this.fmt) throw new Error('formato desconhecido: ' + job.formato); return await this.fmt.setup(job); },
  frame(t) { this.fmt.frame(t); },
  shot(t, png) { this.fmt.frame(t); return cv.toDataURL(png ? 'image/png' : 'image/jpeg', png ? undefined : .93); }
};
window.TQC_READY = true;
