// Estado simulado da área logada do advogado.
// Tudo é mantido no localStorage (sem backend real nesta etapa).

const LOGGED_KEY = "mcj_logado";
const PROFILE_KEY = "mcj_perfil";

// Dados cadastrais fixos (viriam da OAB / cadastro original)
export const LAWYER_NAME = "Dr. Carlos Eduardo Mendes";
export const LAWYER_OAB = "OAB/SP 123.456";
export const SUPPORT_EMAIL = "contato@minhacausajusta.com.br";

export const AREAS = [
  "INSS",
  "Auxílio Doença",
  "Aposentadoria",
  "BPC/LOAS",
  "Pensão por Morte",
  "Pensão Alimentícia",
  "Inventário e Herança",
  "Plano de Saúde",
  "Trabalhista",
  "Consumidor",
  "Família",
  "Previdenciário",
] as const;

export const ESTADOS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

export interface Cidade {
  nome: string;
  uf: string;
}

export interface Profile {
  photo: string | null;
  about: string;
  areas: string[];
  cidades: Cidade[];
  atendeOnline: boolean;
  whatsapp: string;
  instagram: string;
  linkedin: string;
  website: string;
  outro: string;
}

const DEFAULT_PROFILE: Profile = {
  photo: null,
  about:
    "Atuo há 8 anos com causas previdenciárias e trabalhistas em São Paulo. Meu foco é ajudar trabalhadores que tiveram benefícios negados pelo INSS ou que foram demitidos sem receber o que era devido.",
  areas: ["INSS", "Trabalhista"],
  cidades: [
    { nome: "São Paulo", uf: "SP" },
    { nome: "Campinas", uf: "SP" },
  ],
  atendeOnline: false,
  whatsapp: "",
  instagram: "",
  linkedin: "",
  website: "",
  outro: "",
};

export function isLoggedIn(): boolean {
  try {
    return localStorage.getItem(LOGGED_KEY) === "true";
  } catch {
    return false;
  }
}

export function login() {
  try {
    localStorage.setItem(LOGGED_KEY, "true");
  } catch {
    // ignore (modo privado etc.)
  }
}

export function logout() {
  try {
    localStorage.removeItem(LOGGED_KEY);
  } catch {
    // ignore
  }
}

export function getProfile(): Profile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return { ...DEFAULT_PROFILE };
    const parsed = JSON.parse(raw) as Partial<Profile>;
    return { ...DEFAULT_PROFILE, ...parsed };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export function saveProfile(profile: Profile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // ignore
  }
}

export function getInitial(name: string): string {
  const clean = name.replace(/^Dr[a]?\.\s*/, "");
  return clean.charAt(0).toUpperCase();
}

// Máscara de telefone brasileiro: (11) 99999-9999
export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}
