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
      className="mb-6 flex items-start gap-3.5 rounded-2xl border-2 border-accent-200 bg-gradient-to-r from-accent-50 to-primary-50 px-5 py-4 shadow-[0_4px_20px_rgb(0,0,0,0.05)]"
      data-testid="prova-social"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-100 text-accent-600">
        <TrendingUp className="h-5 w-5" strokeWidth={2.25} />
      </span>
      <span className="text-base font-semibold leading-snug text-primary-900">
        {children}
      </span>
    </div>
  );
}
