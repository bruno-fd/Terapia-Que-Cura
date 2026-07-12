// ============================================================
// Espelho server-side das categorias do site.
// O servidor não pode importar o front-end, então esta lista precisa ser
// mantida em sincronia com a fonte única em
// artifacts/minha-causa-justa/src/data/categories.ts (campos `nome` e
// `subcategorias`). Atualize os dois arquivos em conjunto.
// ============================================================

// Macrocategoria -> temas específicos (subcategorias) válidos.
const CATEGORIAS: Record<string, string[]> = {
  "Ansiedade e Estresse": [
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
  "Depressão e Transtornos de Humor": [
    "Depressão",
    "Depressão Pós-Parto",
    "Transtorno Bipolar",
    "Alterações de Humor",
    "Distimia",
    "Automutilação",
    "Pensamentos Suicidas",
  ],
  "Relacionamentos e Casais": [
    "Casais",
    "Conflitos Amorosos",
    "Ciúmes",
    "Divórcio",
    "Infidelidade",
    "Relacionamento Abusivo",
    "Não Monogamia e Poliamor",
  ],
  "Família e Parentalidade": [
    "Conflitos Familiares",
    "Orientação de Pais",
    "Adoção",
    "Impacto do Divórcio na Família",
    "Rivalidade entre Irmãos",
  ],
  "Infância e Adolescência": [
    "Adolescência",
    "Aprendizagem",
    "Autismo",
    "Bullying",
    "Agressividade",
    "TDAH",
    "Orientação Vocacional",
    "Habilidades Sociais",
  ],
  "Luto, Envelhecimento e Cuidados Paliativos": [
    "Luto e Morte",
    "Cuidados Paliativos",
    "Envelhecimento",
    "Adoecimento Físico",
    "Gravidez e Puerpério",
  ],
  "Autoconhecimento e Desenvolvimento Pessoal": [
    "Autoestima",
    "Autoaceitação",
    "Autoconhecimento",
    "Autoconfiança",
    "Autocobrança",
    "Autonomia",
    "Assertividade",
    "Desenvolvimento Pessoal",
  ],
  "Traumas e Violência": [
    "Traumas",
    "Abuso Sexual",
    "Violência Doméstica",
    "Assédio Moral ou Sexual",
    "Estresse Pós-Traumático",
  ],
  "Dependências e Compulsões": [
    "Dependências em Geral",
    "Compulsões em Geral",
    "Alcoolismo",
    "Jogo Compulsivo",
    "Compras Compulsivas",
    "Codependência",
  ],
  "Transtornos Alimentares": [
    "Compulsão Alimentar",
    "Anorexia",
    "Bulimia",
    "Relação com o Corpo e a Comida",
  ],
  "Sexualidade e Identidade de Gênero": [
    "LGBTQIA+",
    "Orientação Sexual",
    "Identidade de Gênero",
    "Disfunções Sexuais",
  ],
  "Saúde Mental e Transtornos Psiquiátricos": [
    "Esquizofrenia",
    "Transtorno Bipolar",
    "Borderline",
    "TDAH",
    "Transtornos de Personalidade",
  ],
  "Avaliações e Perícias Psicológicas": [
    "Avaliação Neuropsicológica",
    "Avaliação para Cirurgia",
    "Laudos e Pareceres Psicológicos",
  ],
  "Carreira e Vida Profissional": [
    "Transição de Carreira",
    "Assédio Moral no Trabalho",
    "Burnout",
    "Equilíbrio Vida-Trabalho",
    "Aposentadoria e Reinvenção",
  ],
};

// Nomes das macrocategorias válidas.
export const MACRO_NOMES = new Set<string>(Object.keys(CATEGORIAS));

export function isMacroValida(nome: string): boolean {
  return MACRO_NOMES.has(nome);
}

// Subcategorias válidas de uma macrocategoria.
export function subcategoriasDe(macro: string): string[] {
  return CATEGORIAS[macro] ?? [];
}

// Verifica se uma subcategoria pertence a alguma das macrocategorias marcadas.
export function isSubValidaEmAreas(sub: string, areas: string[]): boolean {
  return areas.some((macro) => subcategoriasDe(macro).includes(sub));
}

// Filtra uma lista de subcategorias, mantendo apenas as que pertencem a alguma
// das macrocategorias marcadas (deduplicadas, preservando a ordem de entrada).
export function filtrarSubcategoriasValidas(
  areas: string[],
  subs: string[],
): string[] {
  const vistas = new Set<string>();
  const resultado: string[] = [];
  for (const sub of subs) {
    if (!vistas.has(sub) && isSubValidaEmAreas(sub, areas)) {
      vistas.add(sub);
      resultado.push(sub);
    }
  }
  return resultado;
}
