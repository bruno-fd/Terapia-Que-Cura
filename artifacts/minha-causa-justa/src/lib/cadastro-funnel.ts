// ============================================================
// Estado e persistência do funil de cadastro progressivo.
// O lead é salvo no localStorage (resiliência local) e no
// back-end a cada avanço de etapa (captura + remarketing).
// ============================================================

import {
  upsertCadastroLead,
  getCadastroLead,
  type UpsertCadastroLeadInput,
} from "@workspace/api-client-react";
import type { Cidade } from "@/lib/dashboard";

export type Plano = "mensal" | "anual";

export interface FunnelData {
  leadId: string;
  nome: string;
  email: string;
  telefone: string;
  // CPF: coletado na etapa 1 para verificar a inscrição na OAB e para a
  // cobrança (Asaas). Fica apenas no localStorage do funil e NUNCA aparece no
  // perfil público. Em produção, considerar hash/criptografia em repouso.
  cpf: string;
  // OAB e seccional ficam apenas no localStorage (não no lead do back-end):
  // a retomada é no mesmo navegador e o remarketing só precisa do e-mail.
  oab: string;
  seccional: string;
  // Resultado da verificação real da inscrição na OAB (webservice CNA da OAB).
  // Preenchido ao concluir a etapa 1 e carregado para o perfil ao publicar.
  oabVerificada: boolean;
  oabSituacao: string | null;
  oabNomeConfirmado: string | null;
  oabVerificadaEm: string | null;
  oabVerificacaoPendente: boolean;
  // Token assinado pelo servidor que comprova a verificação; enviado em
  // PUT /perfil para que o back-end marque oabVerificada de forma confiável.
  oabToken: string | null;
  plano: Plano | null;
  areas: string[];
  cidades: Cidade[];
  atendeOnline: boolean;
  step: number;
}

export const TOTAL_STEPS = 5;

export const STORAGE_KEY = "mcj_cadastro_lead";

// Valores de exibição dos planos. A cobrança real (em centavos) é
// definida no back-end de assinatura; aqui são apenas rótulos.
export const PLANOS: Record<
  Plano,
  { label: string; precoMes: string; descricao: string; nota?: string }
> = {
  mensal: {
    label: "Plano Mensal",
    precoMes: "R$ 49,90",
    descricao: "Cobrança mensal recorrente. Cancele quando quiser.",
  },
  anual: {
    label: "Plano Anual",
    precoMes: "R$ 39,90",
    descricao: "Cobrado anualmente. Equivale a 2 meses grátis.",
    nota: "Mais vantajoso",
  },
};

// Texto fixo de transparência de preço, exibido a partir da etapa 2.
export const PRECO_TRANSPARENCIA =
  "Cadastro com assinatura mensal a partir de R$ 39,90";

function gerarLeadId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    // ambiente sem crypto.randomUUID
  }
  return `lead_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

export function emptyFunnel(): FunnelData {
  return {
    leadId: gerarLeadId(),
    nome: "",
    email: "",
    telefone: "",
    cpf: "",
    oab: "",
    seccional: "",
    oabVerificada: false,
    oabSituacao: null,
    oabNomeConfirmado: null,
    oabVerificadaEm: null,
    oabVerificacaoPendente: false,
    oabToken: null,
    plano: null,
    areas: [],
    cidades: [],
    atendeOnline: false,
    step: 1,
  };
}

export function loadFunnel(): FunnelData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FunnelData>;
    if (!parsed || typeof parsed.leadId !== "string" || !parsed.leadId) {
      return null;
    }
    return {
      leadId: parsed.leadId,
      nome: parsed.nome ?? "",
      email: parsed.email ?? "",
      telefone: parsed.telefone ?? "",
      cpf: parsed.cpf ?? "",
      oab: parsed.oab ?? "",
      seccional: parsed.seccional ?? "",
      oabVerificada: parsed.oabVerificada === true,
      oabSituacao: parsed.oabSituacao ?? null,
      oabNomeConfirmado: parsed.oabNomeConfirmado ?? null,
      oabVerificadaEm: parsed.oabVerificadaEm ?? null,
      oabVerificacaoPendente: parsed.oabVerificacaoPendente === true,
      oabToken: parsed.oabToken ?? null,
      plano:
        parsed.plano === "mensal" || parsed.plano === "anual"
          ? parsed.plano
          : null,
      areas: Array.isArray(parsed.areas) ? parsed.areas : [],
      cidades: Array.isArray(parsed.cidades) ? parsed.cidades : [],
      atendeOnline: parsed.atendeOnline === true,
      step:
        typeof parsed.step === "number" && parsed.step >= 1
          ? Math.min(parsed.step, TOTAL_STEPS)
          : 1,
    };
  } catch {
    return null;
  }
}

export function saveFunnel(data: FunnelData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ambiente sem localStorage
  }
}

export function clearFunnel(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ambiente sem localStorage
  }
}

// Envia o lead ao back-end. Best-effort: não bloqueia o funil se
// a rede falhar (o estado local continua íntegro). `completed`
// marca a conclusão para fins de remarketing.
export async function syncLead(
  data: FunnelData,
  completed = false,
): Promise<void> {
  const body: UpsertCadastroLeadInput = {
    leadId: data.leadId,
    nome: data.nome,
    email: data.email,
    telefone: data.telefone,
    plano: data.plano,
    areas: data.areas,
    cidades: data.cidades,
    atendeOnline: data.atendeOnline,
    step: data.step,
    completed,
  };
  try {
    await upsertCadastroLead(body);
  } catch {
    // captura é best-effort: nunca interrompe o cadastro
  }
}

// Recupera um lead do back-end por id (fallback quando o
// localStorage foi limpo mas o id persiste em outro lugar).
export async function fetchLead(leadId: string): Promise<FunnelData | null> {
  try {
    const r = await getCadastroLead(leadId);
    return {
      leadId: r.leadId,
      nome: r.nome,
      email: r.email,
      telefone: r.telefone,
      // CPF/OAB/verificação não são persistidos no lead do back-end; ao retomar
      // por aqui, a etapa 1 refaz a verificação real da OAB.
      cpf: "",
      oab: "",
      seccional: "",
      oabVerificada: false,
      oabSituacao: null,
      oabNomeConfirmado: null,
      oabVerificadaEm: null,
      oabVerificacaoPendente: false,
      oabToken: null,
      plano: r.plano === "mensal" || r.plano === "anual" ? r.plano : null,
      areas: r.areas,
      cidades: r.cidades,
      atendeOnline: r.atendeOnline,
      step: Math.min(Math.max(r.step, 1), TOTAL_STEPS),
    };
  } catch {
    return null;
  }
}

// Máscara de CPF (000.000.000-00) ou CNPJ (00.000.000/0000-00).
export function maskCpfCnpj(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 11) {
    return d
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  }
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function isEmailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// Máscara de CPF (000.000.000-00). Limita a 11 dígitos.
export function maskCpf(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

// Validação real de CPF: 11 dígitos, rejeita sequências repetidas conhecidas
// (000..., 111..., etc.) e confere os dois dígitos verificadores.
export function isCpfValido(value: string): boolean {
  const cpf = value.replace(/\D/g, "");
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += Number(cpf[i]) * (10 - i);
  let d1 = (soma * 10) % 11;
  if (d1 === 10) d1 = 0;
  if (d1 !== Number(cpf[9])) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += Number(cpf[i]) * (11 - i);
  let d2 = (soma * 10) % 11;
  if (d2 === 10) d2 = 0;
  return d2 === Number(cpf[10]);
}
