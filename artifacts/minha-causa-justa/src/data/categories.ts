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
  descricao: string;
  // Temas específicos dentro da macrocategoria. Usados na busca livre do
  // cliente e na marcação opcional do psicólogo no painel.
  subcategorias: string[];
}

export const CATEGORIAS: Categoria[] = [
  {
    nome: "Ansiedade e Estresse",
    slug: "ansiedade-e-estresse",
    descricao:
      "Ansiedade generalizada, síndrome do pânico, fobias, estresse e burnout.",
    subcategorias: [
      "Ansiedade",
      "Ansiedade Generalizada",
      "Síndrome do Pânico",
      "Fobias em Geral",
      "Estresse",
      "Estresse Pós-Traumático",
      "Angústia",
      "Medos e Inseguranças",
      "Ansiedade Social",
      "Burnout",
    ],
  },
  {
    nome: "Depressão e Transtornos de Humor",
    slug: "depressao-e-transtornos-de-humor",
    descricao:
      "Depressão, depressão pós-parto, transtorno bipolar e alterações de humor.",
    subcategorias: [
      "Depressão",
      "Depressão Pós-Parto",
      "Transtorno Bipolar",
      "Alterações de Humor",
      "Distimia",
      "Automutilação",
      "Pensamentos Suicidas",
    ],
  },
  {
    nome: "Relacionamentos e Casais",
    slug: "relacionamentos-e-casais",
    descricao:
      "Terapia de casal, conflitos amorosos, ciúmes, divórcio e infidelidade.",
    subcategorias: [
      "Casais",
      "Conflitos Amorosos",
      "Ciúmes",
      "Divórcio",
      "Infidelidade",
      "Relacionamento Abusivo",
      "Não Monogamia e Poliamor",
    ],
  },
  {
    nome: "Família e Parentalidade",
    slug: "familia-e-parentalidade",
    descricao:
      "Conflitos familiares, orientação de pais, adoção e rivalidade entre irmãos.",
    subcategorias: [
      "Conflitos Familiares",
      "Orientação de Pais",
      "Adoção",
      "Impacto do Divórcio na Família",
      "Rivalidade entre Irmãos",
    ],
  },
  {
    nome: "Infância e Adolescência",
    slug: "infancia-e-adolescencia",
    descricao:
      "Aprendizagem, autismo, bullying, TDAH e orientação vocacional.",
    subcategorias: [
      "Adolescência",
      "Aprendizagem",
      "Autismo",
      "Bullying",
      "Agressividade",
      "TDAH",
      "Orientação Vocacional",
      "Habilidades Sociais",
    ],
  },
  {
    nome: "Luto, Envelhecimento e Cuidados Paliativos",
    slug: "luto-envelhecimento-e-cuidados-paliativos",
    descricao:
      "Luto e morte, cuidados paliativos, envelhecimento e adoecimento físico.",
    subcategorias: [
      "Luto e Morte",
      "Cuidados Paliativos",
      "Envelhecimento",
      "Adoecimento Físico",
      "Gravidez e Puerpério",
    ],
  },
  {
    nome: "Autoconhecimento e Desenvolvimento Pessoal",
    slug: "autoconhecimento-e-desenvolvimento-pessoal",
    descricao:
      "Autoestima, autoconhecimento, autoconfiança, autonomia e assertividade.",
    subcategorias: [
      "Autoestima",
      "Autoaceitação",
      "Autoconhecimento",
      "Autoconfiança",
      "Autocobrança",
      "Autonomia",
      "Assertividade",
      "Desenvolvimento Pessoal",
    ],
  },
  {
    nome: "Traumas e Violência",
    slug: "traumas-e-violencia",
    descricao:
      "Traumas, abuso sexual, violência doméstica e assédio moral ou sexual.",
    subcategorias: [
      "Traumas",
      "Abuso Sexual",
      "Violência Doméstica",
      "Assédio Moral ou Sexual",
      "Estresse Pós-Traumático",
    ],
  },
  {
    nome: "Dependências e Compulsões",
    slug: "dependencias-e-compulsoes",
    descricao:
      "Dependências em geral, compulsões, alcoolismo e jogo compulsivo.",
    subcategorias: [
      "Dependências em Geral",
      "Compulsões em Geral",
      "Alcoolismo",
      "Jogo Compulsivo",
      "Compras Compulsivas",
      "Codependência",
    ],
  },
  {
    nome: "Transtornos Alimentares",
    slug: "transtornos-alimentares",
    descricao:
      "Compulsão alimentar, anorexia, bulimia e relação com o corpo e a comida.",
    subcategorias: [
      "Compulsão Alimentar",
      "Anorexia",
      "Bulimia",
      "Relação com o Corpo e a Comida",
    ],
  },
  {
    nome: "Sexualidade e Identidade de Gênero",
    slug: "sexualidade-e-identidade-de-genero",
    descricao:
      "LGBTQIA+, orientação sexual, identidade de gênero e disfunções sexuais.",
    subcategorias: [
      "LGBTQIA+",
      "Orientação Sexual",
      "Identidade de Gênero",
      "Disfunções Sexuais",
    ],
  },
  {
    nome: "Saúde Mental e Transtornos Psiquiátricos",
    slug: "saude-mental-e-transtornos-psiquiatricos",
    descricao:
      "Esquizofrenia, transtorno bipolar, borderline e transtornos de personalidade.",
    subcategorias: [
      "Esquizofrenia",
      "Transtorno Bipolar",
      "Borderline",
      "TDAH",
      "Transtornos de Personalidade",
    ],
  },
  {
    nome: "Avaliações e Perícias Psicológicas",
    slug: "avaliacoes-e-pericias-psicologicas",
    descricao:
      "Avaliação neuropsicológica, avaliação para cirurgia e laudos psicológicos.",
    subcategorias: [
      "Avaliação Neuropsicológica",
      "Avaliação para Cirurgia",
      "Laudos e Pareceres Psicológicos",
    ],
  },
  {
    nome: "Carreira e Vida Profissional",
    slug: "carreira-e-vida-profissional",
    descricao:
      "Transição de carreira, assédio moral no trabalho e equilíbrio vida-trabalho.",
    subcategorias: [
      "Transição de Carreira",
      "Assédio Moral no Trabalho",
      "Burnout",
      "Equilíbrio Vida-Trabalho",
      "Aposentadoria e Reinvenção",
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
export function getMacrocategorias(): Array<Pick<Categoria, "nome" | "slug">> {
  return CATEGORIAS.map((c) => ({ nome: c.nome, slug: c.slug }));
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
    }
  | {
      tipo: "sub";
      nome: string;
      macroNome: string;
      macroSlug: string;
    };

// Resolve a busca do cliente para os filtros efetivos. Quando o usuário
// escolheu uma sugestão (selecionado), usamos a macro exata dela (importante
// para temas com nome repetido em macros diferentes). Sem seleção, caímos no
// texto digitado, resolvido pela mesma ordenação das sugestões exibidas.
export function resolverBuscaCategoria(
  selecionado: ResultadoBusca | null,
  texto: string,
): { catNome: string; subNome: string; slug: string } | null {
  const q = texto.trim();
  let r: ResultadoBusca | undefined =
    selecionado && selecionado.nome === q ? selecionado : undefined;
  if (!r) r = q ? buscarCategorias(q)[0] : undefined;
  if (!r) return null;
  if (r.tipo === "macro") {
    return { catNome: r.nome, subNome: "", slug: r.slug };
  }
  return { catNome: r.macroNome, subNome: r.nome, slug: r.macroSlug };
}

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
          });
        }
      }
    }
  }

  return resultados;
}
