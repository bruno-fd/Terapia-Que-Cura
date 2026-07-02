// ============================================================
// Verificação real de inscrição na OAB via API REST do
// Consulta OAB (mesma plataforma do Consulta CRM):
//   https://www.consultaoab.com.br/index/api
//
// A consulta é feita por número de inscrição + seccional (UF) e
// devolve JSON no formato { status, total, dados: [ { nome,
// numero, uf, tipo, situacao, ... } ] }. Requer uma chave de API
// (parâmetro `chave`), obtida com cadastro gratuito no site (plano
// grátis limitado a 100 consultas/mês). A chave é lida do secret
// CONSULTA_OAB_KEY; sem ela isOabConfigured() é false e a chamada
// falha com OabServicoError, que a rota traduz para
// motivo=erro_servico (verificação pendente / revisão manual).
//
// NOTA de host: o domínio público documentado é consultaoab.com.br,
// mas ele nem sempre resolve em DNS; a MESMA API atende em
// consultacrm.com.br com tipo=oab. Por isso o host padrão é
// consultacrm.com.br e pode ser sobrescrito por CONSULTA_OAB_URL.
//
// Diferença em relação ao antigo webservice CNA (SOAP): esta API
// NÃO consulta por CPF. A checagem é por número da OAB + seccional
// e confirmação de nome; o CPF continua sendo coletado e validado
// (dígitos verificadores) no funil, mas não é conferido aqui.
// ============================================================

import { logger } from "./logger";

const ENDPOINT =
  process.env["CONSULTA_OAB_URL"] ??
  "https://www.consultacrm.com.br/api/index.php";
const TIMEOUT_MS = 8000;

export type MotivoInvalido =
  | "cpf_nao_encontrado"
  | "oab_divergente"
  | "nome_divergente"
  | "inscricao_inativa"
  | "erro_servico";

export interface OabConsultaEntrada {
  cpf: string;
  oab: string;
  seccional: string;
  nome: string;
}

export interface OabResultado {
  valido: boolean;
  motivo: MotivoInvalido | null;
  situacao: string | null;
  nomeOab: string | null;
  numeroOab: string | null;
  seccional: string | null;
}

interface RegistroOab {
  nome: string;
  inscricao: string;
  uf: string;
  situacao: string;
  tipo: string;
}

// Erro de serviço: chave ausente/inválida, cota excedida, timeout,
// resposta inesperada ou rede. A rota traduz para motivo=erro_servico
// (verificação pendente).
export class OabServicoError extends Error {}

export function isOabConfigured(): boolean {
  return !!process.env["CONSULTA_OAB_KEY"];
}

function soloDigitos(v: string): string {
  return (v ?? "").replace(/\D/g, "");
}

// Normaliza texto para comparação: sem acentos, maiúsculas, espaços colapsados.
function normalizar(v: string): string {
  return (v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

const CONECTIVOS = new Set(["DE", "DA", "DO", "DAS", "DOS", "E"]);

function tokensNome(v: string): string[] {
  return normalizar(v)
    .split(" ")
    .filter((t) => t.length >= 2 && !CONECTIVOS.has(t));
}

// Nome confere se, ignorando conectivos, no máximo um token do nome mais curto
// não aparece no mais longo (tolera abreviações/nome social/ordem parcial).
function nomeConfere(informado: string, retornado: string): boolean {
  const a = tokensNome(informado);
  const b = tokensNome(retornado);
  if (!a.length || !b.length) return false;
  const [curto, longo] = a.length <= b.length ? [a, b] : [b, a];
  const setLongo = new Set(longo);
  const faltando = curto.filter((t) => !setLongo.has(t)).length;
  return faltando <= 1;
}

// Palavras que indicam inscrição NÃO ativa. Na ausência de qualquer sinal
// negativo, tratamos como ativa (defensivo: o serviço usa rótulos variados;
// "Regular" é o rótulo típico de inscrição ativa).
const SITUACAO_INATIVA = [
  "CANCELAD",
  "SUSPENS",
  "LICENC",
  "FALECID",
  "IMPEDID",
  "INATIV",
  "TRANSFERID",
];

function situacaoAtiva(reg: RegistroOab): boolean {
  const alvo = normalizar(`${reg.situacao} ${reg.tipo}`);
  return !SITUACAO_INATIVA.some((s) => alvo.includes(s));
}

// Lê a primeira propriedade presente (aceita variações de nome de campo) e
// devolve como string. Tolerante ao shape exato do JSON da API.
function lerCampo(obj: Record<string, unknown>, nomes: string[]): string {
  for (const nome of nomes) {
    const v = obj[nome];
    if (v !== undefined && v !== null && typeof v !== "object") {
      return String(v).trim();
    }
  }
  return "";
}

function mapearRegistro(obj: Record<string, unknown>): RegistroOab {
  return {
    nome: lerCampo(obj, ["nome", "Nome", "nome_completo", "nomeAdvogado"]),
    inscricao: lerCampo(obj, [
      "numero",
      "Numero",
      "inscricao",
      "Inscricao",
      "numero_inscricao",
      "registro",
    ]),
    uf: lerCampo(obj, ["uf", "UF", "seccional", "Seccional", "estado"]),
    situacao: lerCampo(obj, [
      "situacao",
      "Situacao",
      "situacao_inscricao",
      "status",
      "Status",
    ]),
    tipo: lerCampo(obj, ["tipo", "Tipo", "tipo_inscricao", "categoria"]),
  };
}

// Faz o parse tolerante da resposta JSON. Aceita { dados: [...] },
// { data: [...] } ou um array na raiz. Respostas de erro do serviço vêm como
// texto puro (ex.: "Chave API nao habilitada") e caem no catch => erro_servico.
function parseRegistros(texto: string): RegistroOab[] {
  const bruto = (texto ?? "").trim();
  if (!bruto) return [];
  // Erros conhecidos chegam como texto puro (não-JSON). Sinaliza serviço.
  if (bruto[0] !== "{" && bruto[0] !== "[") {
    throw new OabServicoError(bruto.slice(0, 200));
  }
  let json: unknown;
  try {
    json = JSON.parse(bruto);
  } catch {
    throw new OabServicoError("Resposta não-JSON do serviço OAB");
  }
  let lista: unknown = json;
  if (json && typeof json === "object" && !Array.isArray(json)) {
    const o = json as Record<string, unknown>;
    lista = o["dados"] ?? o["data"] ?? o["resultado"] ?? o["result"] ?? [];
  }
  if (!Array.isArray(lista)) return [];
  return lista
    .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
    .map(mapearRegistro)
    .filter((r) => r.nome || r.inscricao);
}

async function chamarWebservice(
  oab: string,
  seccional: string,
  key: string,
): Promise<string> {
  const params = new URLSearchParams({
    tipo: "oab",
    uf: seccional,
    q: oab,
    chave: key,
    destino: "json",
  });
  const url = `${ENDPOINT}?${params.toString()}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let resp: Response;
  try {
    resp = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  const texto = await resp.text();
  if (!resp.ok) {
    throw new OabServicoError(`HTTP ${resp.status}`);
  }
  return texto;
}

async function chamarComRetentativa(
  oab: string,
  seccional: string,
  key: string,
): Promise<string> {
  try {
    return await chamarWebservice(oab, seccional, key);
  } catch (err) {
    if (err instanceof OabServicoError) throw err; // erro de serviço: não reenvia
    // Falha de rede/timeout: uma nova tentativa.
    logger.warn({ err }, "Consulta OAB falhou, tentando novamente uma vez");
    return await chamarWebservice(oab, seccional, key);
  }
}

export async function verificarInscricaoOab(
  entrada: OabConsultaEntrada,
): Promise<OabResultado> {
  const key = process.env["CONSULTA_OAB_KEY"];
  if (!key) {
    // Sem chave a API rejeita toda chamada; sinalizamos erro de serviço para o
    // funil marcar a verificação como pendente (revisão manual).
    throw new OabServicoError("CONSULTA_OAB_KEY ausente");
  }

  const oabDig = soloDigitos(entrada.oab);
  const seccionalNorm = normalizar(entrada.seccional);
  const bruto = await chamarComRetentativa(oabDig, seccionalNorm, key);
  logger.debug({ bruto }, "Resultado bruto da consulta OAB por inscrição");

  const registros = parseRegistros(bruto);
  if (!registros.length) {
    // Sem registros para o número + seccional informados.
    return {
      valido: false,
      motivo: "oab_divergente",
      situacao: null,
      nomeOab: null,
      numeroOab: null,
      seccional: null,
    };
  }

  const exato = registros.find(
    (r) =>
      soloDigitos(r.inscricao) === oabDig &&
      (!seccionalNorm || normalizar(r.uf) === seccionalNorm),
  );
  const porOab = registros.find((r) => soloDigitos(r.inscricao) === oabDig);
  const reg = exato ?? porOab ?? registros[0]!;

  const base = {
    situacao: reg.situacao || reg.tipo || null,
    nomeOab: reg.nome || null,
    numeroOab: reg.inscricao || null,
    seccional: reg.uf || null,
  };

  if (soloDigitos(reg.inscricao) !== oabDig) {
    return { valido: false, motivo: "oab_divergente", ...base };
  }
  if (seccionalNorm && reg.uf && normalizar(reg.uf) !== seccionalNorm) {
    return { valido: false, motivo: "oab_divergente", ...base };
  }
  if (!nomeConfere(entrada.nome, reg.nome)) {
    return { valido: false, motivo: "nome_divergente", ...base };
  }
  if (!situacaoAtiva(reg)) {
    return { valido: false, motivo: "inscricao_inativa", ...base };
  }
  return { valido: true, motivo: null, ...base };
}
