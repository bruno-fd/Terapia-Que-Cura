// Token assinado (HMAC-SHA256) que atesta uma verificação de OAB bem-sucedida.
//
// A verificação acontece pré-autenticação, no funil de cadastro (localStorage).
// Para que o status "verificado" não possa ser forjado pelo cliente ao salvar o
// perfil, o endpoint /verificar-oab emite este token quando valido=true e o
// PUT /perfil só marca oabVerificada=true após validar a assinatura e o prazo.
// A chave é o SESSION_SECRET (já usado pela aplicação). Sem segredo, a validação
// falha e o status jamais é marcado como verificado (comportamento seguro).

import crypto from "node:crypto";

const TTL_MS = 30 * 60 * 1000; // 30 min: janela para concluir o funil.

export interface OabTokenPayload {
  cpf: string;
  oab: string;
  seccional: string;
  situacao: string | null;
  nomeOab: string | null;
}

function segredo(): string {
  return process.env["SESSION_SECRET"] ?? "";
}

function soloDigitos(v: string): string {
  return (v ?? "").replace(/\D/g, "");
}

export function assinarOabToken(p: OabTokenPayload): string | null {
  const s = segredo();
  if (!s) return null;
  const corpo = { ...p, exp: Date.now() + TTL_MS };
  const dados = Buffer.from(JSON.stringify(corpo)).toString("base64url");
  const assinatura = crypto
    .createHmac("sha256", s)
    .update(dados)
    .digest("base64url");
  return `${dados}.${assinatura}`;
}

// Valida assinatura + expiração e devolve o payload, ou null se inválido.
export function verificarOabToken(token: string): OabTokenPayload | null {
  const s = segredo();
  if (!s || !token) return null;
  const partes = token.split(".");
  if (partes.length !== 2) return null;
  const [dados, assinatura] = partes as [string, string];
  const esperado = crypto
    .createHmac("sha256", s)
    .update(dados)
    .digest("base64url");
  const a = Buffer.from(assinatura);
  const b = Buffer.from(esperado);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const corpo = JSON.parse(Buffer.from(dados, "base64url").toString()) as {
      exp?: unknown;
      cpf?: unknown;
      oab?: unknown;
      seccional?: unknown;
      situacao?: unknown;
      nomeOab?: unknown;
    };
    if (typeof corpo.exp !== "number" || corpo.exp < Date.now()) return null;
    return {
      cpf: String(corpo.cpf ?? ""),
      oab: String(corpo.oab ?? ""),
      seccional: String(corpo.seccional ?? ""),
      situacao: corpo.situacao == null ? null : String(corpo.situacao),
      nomeOab: corpo.nomeOab == null ? null : String(corpo.nomeOab),
    };
  } catch {
    return null;
  }
}

// Confere se o token corresponde ao número/seccional de OAB informado no perfil,
// impedindo reaproveitar um token válido para uma inscrição diferente.
export function tokenCombinaComOab(
  payload: OabTokenPayload,
  oab: string,
  seccional?: string,
): boolean {
  const mesmaInscricao = soloDigitos(payload.oab) === soloDigitos(oab);
  if (!mesmaInscricao) return false;
  if (seccional && payload.seccional) {
    return payload.seccional.trim().toUpperCase() === seccional.trim().toUpperCase();
  }
  return true;
}
