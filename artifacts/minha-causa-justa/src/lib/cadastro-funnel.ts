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
  // OAB e seccional ficam apenas no localStorage (não no lead do back-end):
  // a retomada é no mesmo navegador e o remarketing só precisa do e-mail.
  oab: string;
  seccional: string;
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
    oab: "",
    seccional: "",
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
      oab: parsed.oab ?? "",
      seccional: parsed.seccional ?? "",
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
      // OAB/seccional não são persistidos no lead do back-end.
      oab: "",
      seccional: "",
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
