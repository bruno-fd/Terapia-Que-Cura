import type { ReactNode } from "react";
import { TrendingUp } from "lucide-react";

// Frases de prova social / urgência exibidas no topo de cada etapa do funil,
// para aumentar a conversão. Os números ficam centralizados aqui, num único
// lugar, para facilitar o ajuste conforme dados reais da plataforma.
export const PROVA_SOCIAL = {
  identificacao:
    "Mais de 7.500 pessoas visitam a Terapia Que Cura todos os dias procurando um psicólogo.",
  atuacao:
    "Centenas de pessoas procuraram apoio psicológico na última hora. Diga sua área e região para aparecer nas buscas certas.",
  plano: "Cada dia fora do diretório é um cliente que encontra outro psicólogo.",
  conta:
    "Falta pouco: sua conta garante que os contatos dos clientes cheguem só a você.",
  pagamento:
    "Ative seu perfil hoje e comece a aparecer para milhares de buscas por psicólogos.",
  perfil:
    "Perfis completos recebem muito mais contatos. Capriche no seu para se destacar.",
} as const;

export function ProvaSocial({ children }: { children: ReactNode }) {
  return (
    <div
      className="mb-4 flex items-start gap-2.5 rounded-2xl border border-primary-100 bg-primary-50 px-4 py-3 text-sm font-medium text-primary-800"
      data-testid="prova-social"
    >
      <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-accent-500" />
      <span>{children}</span>
    </div>
  );
}
