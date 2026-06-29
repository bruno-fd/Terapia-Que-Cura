// ============================================================
// Categorias do site — fonte única da verdade
// Usada em filtros de busca, cadastro, painel, blog, cards de
// perfil e home. Atualize SOMENTE aqui para refletir em todo o site.
// O servidor (artifacts/api-server/src/routes/blog.ts) mantém uma
// lista equivalente de nomes que precisa ser atualizada em conjunto.
// ============================================================

export interface Categoria {
  nome: string;
  slug: string;
  emoji: string;
  descricao: string;
}

export const CATEGORIAS: Categoria[] = [
  {
    nome: "INSS e Previdência",
    slug: "inss-e-previdencia",
    emoji: "🏥",
    descricao:
      "Benefício negado, aposentadoria, auxílio doença, pensão por morte e BPC/LOAS.",
  },
  {
    nome: "Trabalho e Emprego",
    slug: "trabalho-e-emprego",
    emoji: "💼",
    descricao:
      "Demissão, rescisão, horas extras, FGTS, acidente de trabalho e carteira não assinada.",
  },
  {
    nome: "Família",
    slug: "familia",
    emoji: "👨‍👩‍👧",
    descricao:
      "Pensão alimentícia, divórcio, guarda de filhos e reconhecimento de paternidade.",
  },
  {
    nome: "Herança e Inventário",
    slug: "heranca-e-inventario",
    emoji: "📋",
    descricao:
      "Divisão de bens após falecimento, testamento e inventário judicial ou extrajudicial.",
  },
  {
    nome: "Plano de Saúde",
    slug: "plano-de-saude",
    emoji: "💊",
    descricao:
      "Negativa de cobertura, reajuste abusivo, cancelamento indevido e reembolso negado.",
  },
  {
    nome: "Dívidas e Nome Negativado",
    slug: "dividas-e-nome-negativado",
    emoji: "💳",
    descricao:
      "Cobrança indevida, negativação no Serasa ou SPC e renegociação de dívidas.",
  },
  {
    nome: "Imóveis e Moradia",
    slug: "imoveis-e-moradia",
    emoji: "🏠",
    descricao:
      "Despejo, contrato de aluguel, compra e venda, distrato com construtora e financiamento.",
  },
  {
    nome: "Direito do Consumidor",
    slug: "direito-do-consumidor",
    emoji: "🛒",
    descricao:
      "Produto com defeito, propaganda enganosa, voo atrasado ou cancelado e cancelamento de contrato.",
  },
  {
    nome: "Acidentes e Indenizações",
    slug: "acidentes-e-indenizacoes",
    emoji: "⚠️",
    descricao:
      "Acidente de trânsito, queda em estabelecimento, erro médico e dano moral.",
  },
  {
    nome: "Crimes e Defesa Criminal",
    slug: "crimes-e-defesa-criminal",
    emoji: "⚖️",
    descricao:
      "Ameaça, violência doméstica, furto e defesa em processo criminal.",
  },
  {
    nome: "Servidor Público",
    slug: "servidor-publico",
    emoji: "🏛️",
    descricao:
      "Concurso público, reintegração, progressão de carreira e processo administrativo.",
  },
  {
    nome: "Empresarial",
    slug: "empresarial",
    emoji: "🏢",
    descricao:
      "Abertura e fechamento de empresa, cobrança de dívida e recuperação judicial.",
  },
];

export const CATEGORIA_NOMES = CATEGORIAS.map((c) => c.nome);

export type CategoriaNome = (typeof CATEGORIAS)[number]["nome"];

const POR_SLUG = new Map(CATEGORIAS.map((c) => [c.slug, c]));
const POR_NOME = new Map(CATEGORIAS.map((c) => [c.nome, c]));

export function categoriaPorSlug(slug: string): Categoria | undefined {
  return POR_SLUG.get(slug);
}

export function categoriaPorNome(nome: string): Categoria | undefined {
  return POR_NOME.get(nome);
}

export function slugDaCategoria(nome: string): string | undefined {
  return POR_NOME.get(nome)?.slug;
}
