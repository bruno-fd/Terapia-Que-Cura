// ============================================================
// Categorias do site — fonte única da verdade
// Usada em filtros de busca, cadastro, painel, blog, cards de
// perfil e home. Atualize SOMENTE aqui para refletir em todo o site.
// O servidor (artifacts/api-server/src/lib/categorias.ts) mantém uma
// lista equivalente de nomes que precisa ser atualizada em conjunto.
// ============================================================

export interface Categoria {
  nome: string;
  slug: string;
  emoji: string;
  descricao: string;
  // Temas específicos dentro da macrocategoria. Usados na busca livre do
  // cidadão e na marcação opcional do advogado no painel.
  subcategorias: string[];
}

export const CATEGORIAS: Categoria[] = [
  {
    nome: "INSS e Previdência",
    slug: "inss-e-previdencia",
    emoji: "🏥",
    descricao:
      "Benefício negado, aposentadoria, auxílio doença, pensão por morte e BPC/LOAS.",
    subcategorias: [
      "Auxílio Doença",
      "Aposentadoria por Tempo de Contribuição",
      "Aposentadoria por Invalidez",
      "Aposentadoria Especial",
      "Salário Maternidade",
      "Auxílio Acidente",
      "BPC/LOAS",
      "Pensão por Morte",
      "Revisão de Benefício",
      "Benefício Negado ou Cortado",
    ],
  },
  {
    nome: "Trabalho e Emprego",
    slug: "trabalho-e-emprego",
    emoji: "💼",
    descricao:
      "Demissão, rescisão, horas extras, FGTS, acidente de trabalho e carteira não assinada.",
    subcategorias: [
      "Demissão Sem Justa Causa",
      "Rescisão Indireta",
      "Verbas Rescisórias",
      "FGTS",
      "Horas Extras",
      "Acúmulo de Função",
      "Insalubridade e Periculosidade",
      "Assédio Moral",
      "Acidente de Trabalho",
      "Doença Ocupacional",
      "Dano Moral Trabalhista",
      "Carteira Não Assinada",
      "Estabilidade no Emprego",
    ],
  },
  {
    nome: "Família",
    slug: "familia",
    emoji: "👨‍👩‍👧",
    descricao:
      "Pensão alimentícia, divórcio, guarda de filhos e reconhecimento de paternidade.",
    subcategorias: [
      "Pensão Alimentícia",
      "Divórcio",
      "Guarda de Filhos",
      "Reconhecimento de Paternidade",
      "Alienação Parental",
      "União Estável",
      "Adoção",
      "Violência Doméstica",
    ],
  },
  {
    nome: "Herança e Inventário",
    slug: "heranca-e-inventario",
    emoji: "📋",
    descricao:
      "Divisão de bens após falecimento, testamento e inventário judicial ou extrajudicial.",
    subcategorias: [
      "Inventário Judicial",
      "Inventário Extrajudicial",
      "Divisão de Bens",
      "Testamento",
      "Exclusão de Herdeiro",
      "Doação em Vida",
      "Bens de Pessoa Falecida no Exterior",
    ],
  },
  {
    nome: "Plano de Saúde",
    slug: "plano-de-saude",
    emoji: "💊",
    descricao:
      "Negativa de cobertura, reajuste abusivo, cancelamento indevido e reembolso negado.",
    subcategorias: [
      "Negativa de Cobertura",
      "Reajuste Abusivo",
      "Cancelamento Indevido",
      "Reembolso Negado",
      "Plano Coletivo Cancelado pela Empresa",
      "Negativa de Internação",
      "Negativa de Medicamento",
    ],
  },
  {
    nome: "Dívidas e Nome Negativado",
    slug: "dividas-e-nome-negativado",
    emoji: "💳",
    descricao:
      "Cobrança indevida, negativação no Serasa ou SPC e renegociação de dívidas.",
    subcategorias: [
      "Negativação Indevida no Serasa ou SPC",
      "Cobrança de Dívida Prescrita",
      "Superendividamento",
      "Renegociação de Dívidas",
      "Penhora de Bens",
      "Nome Limpo Após Pagamento",
      "Dívida com Banco ou Financeira",
    ],
  },
  {
    nome: "Imóveis e Moradia",
    slug: "imoveis-e-moradia",
    emoji: "🏠",
    descricao:
      "Despejo, contrato de aluguel, compra e venda, distrato com construtora e financiamento.",
    subcategorias: [
      "Despejo",
      "Contrato de Aluguel",
      "Distrato com Construtora",
      "Imóvel com Defeito",
      "Financiamento Imobiliário",
      "Usucapião",
      "Condomínio",
      "Regularização de Imóvel",
      "Compra e Venda",
    ],
  },
  {
    nome: "Direito do Consumidor",
    slug: "direito-do-consumidor",
    emoji: "🛒",
    descricao:
      "Produto com defeito, propaganda enganosa, voo atrasado ou cancelado e cancelamento de contrato.",
    subcategorias: [
      "Voo Atrasado ou Cancelado",
      "Produto com Defeito",
      "Cobrança Indevida",
      "Pacote de Viagem",
      "Internet ou Telefone",
      "Compra Online",
      "Propaganda Enganosa",
      "Cancelamento de Contrato",
      "Seguro Negado",
    ],
  },
  {
    nome: "Acidentes e Indenizações",
    slug: "acidentes-e-indenizacoes",
    emoji: "⚠️",
    descricao:
      "Acidente de trânsito, queda em estabelecimento, erro médico e dano moral.",
    subcategorias: [
      "Acidente de Trânsito",
      "Atropelamento",
      "Erro Médico",
      "Queda em Estabelecimento",
      "Dano Moral",
      "Dano Estético",
      "Acidente com Animal",
      "Produto Defeituoso que Causou Dano",
    ],
  },
  {
    nome: "Crimes e Defesa Criminal",
    slug: "crimes-e-defesa-criminal",
    emoji: "⚖️",
    descricao:
      "Ameaça, violência doméstica, furto e defesa em processo criminal.",
    subcategorias: [
      "Ameaça",
      "Violência Doméstica",
      "Furto e Roubo",
      "Estelionato",
      "Injúria e Difamação",
      "Defesa em Inquérito Policial",
      "Defesa em Processo Criminal",
      "Prisão Preventiva",
      "Habeas Corpus",
      "Crimes de Trânsito",
    ],
  },
  {
    nome: "Servidor Público",
    slug: "servidor-publico",
    emoji: "🏛️",
    descricao:
      "Concurso público, reintegração, progressão de carreira e processo administrativo.",
    subcategorias: [
      "Concurso Público",
      "Reintegração ao Cargo",
      "Progressão de Carreira",
      "Acúmulo de Cargos",
      "Processo Administrativo Disciplinar",
      "Aposentadoria do Servidor",
      "Desvio de Função",
      "Assédio Moral no Serviço Público",
    ],
  },
  {
    nome: "Empresarial",
    slug: "empresarial",
    emoji: "🏢",
    descricao:
      "Abertura e fechamento de empresa, cobrança de dívida e recuperação judicial.",
    subcategorias: [
      "Abertura de Empresa",
      "Encerramento de Empresa",
      "Contrato Entre Empresas",
      "Cobrança de Dívida Empresarial",
      "Conflito Entre Sócios",
      "Recuperação Judicial",
      "Falência",
      "Responsabilidade do Sócio",
      "Contrato de Prestação de Serviços",
    ],
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

// Subcategorias (temas específicos) de uma macrocategoria pelo nome.
export function subcategoriasDaCategoria(nome: string): string[] {
  return POR_NOME.get(nome)?.subcategorias ?? [];
}

// Apenas as macrocategorias, para selects e filtros simples.
export function getMacrocategorias(): Array<
  Pick<Categoria, "nome" | "slug" | "emoji">
> {
  return CATEGORIAS.map((c) => ({ nome: c.nome, slug: c.slug, emoji: c.emoji }));
}

// Normaliza texto para comparação (sem acentos, minúsculo).
export function normalizar(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

// Resultado da busca livre: macrocategoria ou tema específico (subcategoria).
export type ResultadoBusca =
  | {
      tipo: "macro";
      nome: string;
      slug: string;
      emoji: string;
    }
  | {
      tipo: "sub";
      nome: string;
      macroNome: string;
      macroSlug: string;
      emoji: string;
    };

// Busca livre que pesquisa em macrocategorias e subcategorias ao mesmo tempo.
// Termo vazio retorna apenas as macrocategorias (estado inicial do dropdown).
export function buscarCategorias(termo: string): ResultadoBusca[] {
  const t = normalizar(termo);
  const resultados: ResultadoBusca[] = [];

  for (const cat of CATEGORIAS) {
    if (!t || normalizar(cat.nome).includes(t)) {
      resultados.push({
        tipo: "macro",
        nome: cat.nome,
        slug: cat.slug,
        emoji: cat.emoji,
      });
    }
    if (t) {
      for (const sub of cat.subcategorias) {
        if (normalizar(sub).includes(t)) {
          resultados.push({
            tipo: "sub",
            nome: sub,
            macroNome: cat.nome,
            macroSlug: cat.slug,
            emoji: cat.emoji,
          });
        }
      }
    }
  }

  return resultados;
}
