// Helpers da área logada do advogado. O perfil agora é persistido no banco
// via API (hooks gerados em @workspace/api-client-react). Aqui ficam apenas
// utilidades de UI e listas estáticas reutilizadas por várias telas.

import { CATEGORIA_NOMES } from "@/data/categories";

// Áreas de atuação = categorias do site (fonte única em data/categories.ts)
export const AREAS = CATEGORIA_NOMES;

export const ESTADOS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

export interface Cidade {
  nome: string;
  uf: string;
}

export function getInitial(name: string): string {
  const clean = name.replace(/^Dr[a]?\.\s*/, "").trim();
  return (clean.charAt(0) || "A").toUpperCase();
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
