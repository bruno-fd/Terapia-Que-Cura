// ============================================================
// Verificação real de inscrição na OAB via webservice CNA da
// OAB Federal (SOAP): https://www5.oab.org.br/cnaws/service.asmx
// Método ConsultaAdvogadoPorCpf.
//
// IMPORTANTE (comprovado em teste ao vivo): o serviço NÃO é público.
// Toda chamada exige um cabeçalho SOAP Authentication com uma Key
// válida (chave de convênio da OAB). Sem a Key o servidor responde
// HTTP 500 com "É preciso enviar a chave de identificação..." /
// "Chave de identificação inválida!". A chave é lida do secret
// OAB_CNA_KEY. Quando ausente/inválida, a chamada falha e a rota
// devolve motivo=erro_servico, que o funil trata como verificação
// pendente (revisão manual). Ao configurar uma Key válida, a
// verificação passa a funcionar sem qualquer mudança de código.
// ============================================================

import { logger } from "./logger";

const ENDPOINT = "https://www5.oab.org.br/cnaws/service.asmx";
const SOAP_ACTION = "http://tempuri.org/ConsultaAdvogadoPorCpf";
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

// Erro de serviço: chave ausente/inválida, timeout, fault SOAP ou rede.
// A rota traduz para motivo=erro_servico (verificação pendente).
export class OabServicoError extends Error {}

export function isOabConfigured(): boolean {
  return !!process.env["OAB_CNA_KEY"];
}

function escapeXml(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function decodeEntities(v: string): string {
  return v
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, d: string) => String.fromCharCode(Number(d)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, h: string) =>
      String.fromCharCode(parseInt(h, 16)),
    )
    .replace(/&amp;/g, "&");
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
// negativo, tratamos como ativa (defensivo: o CNA usa rótulos variados).
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

function extrairTag(bloco: string, nomes: string[]): string {
  for (const nome of nomes) {
    const re = new RegExp(`<${nome}[^>]*>([\\s\\S]*?)</${nome}>`, "i");
    const m = re.exec(bloco);
    if (m && m[1] !== undefined) return decodeEntities(m[1]).trim();
  }
  return "";
}

// Faz o parse do resultado (string XML). O shape exato só pode ser confirmado
// com uma Key válida devolvendo dados reais; por isso o parser é tolerante
// (aceita variações de nome de tag) e o resultado bruto é logado em debug
// para ajuste fino quando houver chave. Cada registro é um bloco
// <Advogado>...</Advogado> (ou variações); sem blocos, trata tudo como um.
function parseRegistros(xmlResultado: string): RegistroOab[] {
  const xml = decodeEntities(xmlResultado).trim();
  if (!xml) return [];
  const blocos =
    xml.match(/<(?:Advogado|advogado|Registro|Item)\b[\s\S]*?<\/(?:Advogado|advogado|Registro|Item)>/g) ??
    [];
  const alvos = blocos.length ? blocos : [xml];
  const registros: RegistroOab[] = [];
  for (const bloco of alvos) {
    const nome = extrairTag(bloco, ["Nome", "nome", "NomeAdvogado"]);
    const inscricao = extrairTag(bloco, [
      "Inscricao",
      "inscricao",
      "NumeroInscricao",
      "Numero",
      "numero",
    ]);
    const uf = extrairTag(bloco, ["UF", "uf", "Seccional", "seccional", "Estado"]);
    const situacao = extrairTag(bloco, [
      "Situacao",
      "situacao",
      "SituacaoInscricao",
      "Status",
    ]);
    const tipo = extrairTag(bloco, ["Tipo", "tipo", "TipoInscricao"]);
    if (nome || inscricao) {
      registros.push({ nome, inscricao, uf, situacao, tipo });
    }
  }
  return registros;
}

async function chamarWebservice(cpf: string, key: string): Promise<string> {
  const envelope =
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ` +
    `xmlns:xsd="http://www.w3.org/2001/XMLSchema" ` +
    `xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">` +
    `<soap:Header><Authentication xmlns="http://tempuri.org/">` +
    `<Key>${escapeXml(key)}</Key></Authentication></soap:Header>` +
    `<soap:Body><ConsultaAdvogadoPorCpf xmlns="http://tempuri.org/">` +
    `<cpf>${escapeXml(cpf)}</cpf></ConsultaAdvogadoPorCpf></soap:Body>` +
    `</soap:Envelope>`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let resp: Response;
  try {
    resp = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: `"${SOAP_ACTION}"`,
      },
      body: envelope,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  const texto = await resp.text();

  // Fault SOAP (chave inválida/ausente ou erro do servidor) => erro de serviço.
  const fault = /<faultstring[^>]*>([\s\S]*?)<\/faultstring>/i.exec(texto);
  if (fault) {
    throw new OabServicoError(decodeEntities(fault[1] ?? "").trim());
  }
  if (!resp.ok) {
    throw new OabServicoError(`HTTP ${resp.status}`);
  }

  const m =
    /<ConsultaAdvogadoPorCpfResult[^>]*>([\s\S]*?)<\/ConsultaAdvogadoPorCpfResult>/i.exec(
      texto,
    );
  return m && m[1] !== undefined ? m[1] : "";
}

async function chamarComRetentativa(cpf: string, key: string): Promise<string> {
  try {
    return await chamarWebservice(cpf, key);
  } catch (err) {
    if (err instanceof OabServicoError) throw err; // fault: não reenvia
    // Falha de rede/timeout: uma nova tentativa.
    logger.warn({ err }, "Consulta OAB falhou, tentando novamente uma vez");
    return await chamarWebservice(cpf, key);
  }
}

export async function verificarInscricaoOab(
  entrada: OabConsultaEntrada,
): Promise<OabResultado> {
  const key = process.env["OAB_CNA_KEY"];
  if (!key) {
    // Sem chave o serviço rejeita toda chamada; sinalizamos erro de serviço
    // para o funil marcar a verificação como pendente (revisão manual).
    throw new OabServicoError("OAB_CNA_KEY ausente");
  }

  const cpf = soloDigitos(entrada.cpf);
  const bruto = await chamarComRetentativa(cpf, key);
  logger.debug({ bruto }, "Resultado bruto da consulta OAB por CPF");

  const registros = parseRegistros(bruto);
  if (!registros.length) {
    return {
      valido: false,
      motivo: "cpf_nao_encontrado",
      situacao: null,
      nomeOab: null,
      numeroOab: null,
      seccional: null,
    };
  }

  const oabDig = soloDigitos(entrada.oab);
  const seccionalNorm = normalizar(entrada.seccional);
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
