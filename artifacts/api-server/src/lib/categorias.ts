// ============================================================
// Espelho server-side das categorias do site.
// O servidor não pode importar o front-end, então esta lista precisa ser
// mantida em sincronia com a fonte única em
// artifacts/minha-causa-justa/src/data/categories.ts (campos `nome` e
// `subcategorias`). Atualize os dois arquivos em conjunto.
// ============================================================

// Macrocategoria -> temas específicos (subcategorias) válidos.
const CATEGORIAS: Record<string, string[]> = {
  "INSS e Previdência": [
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
  "Trabalho e Emprego": [
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
  Família: [
    "Pensão Alimentícia",
    "Divórcio",
    "Guarda de Filhos",
    "Reconhecimento de Paternidade",
    "Alienação Parental",
    "União Estável",
    "Adoção",
    "Violência Doméstica",
  ],
  "Herança e Inventário": [
    "Inventário Judicial",
    "Inventário Extrajudicial",
    "Divisão de Bens",
    "Testamento",
    "Exclusão de Herdeiro",
    "Doação em Vida",
    "Bens de Pessoa Falecida no Exterior",
  ],
  "Plano de Saúde": [
    "Negativa de Cobertura",
    "Reajuste Abusivo",
    "Cancelamento Indevido",
    "Reembolso Negado",
    "Plano Coletivo Cancelado pela Empresa",
    "Negativa de Internação",
    "Negativa de Medicamento",
  ],
  "Dívidas e Nome Negativado": [
    "Negativação Indevida no Serasa ou SPC",
    "Cobrança de Dívida Prescrita",
    "Superendividamento",
    "Renegociação de Dívidas",
    "Penhora de Bens",
    "Nome Limpo Após Pagamento",
    "Dívida com Banco ou Financeira",
  ],
  "Imóveis e Moradia": [
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
  "Direito do Consumidor": [
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
  "Acidentes e Indenizações": [
    "Acidente de Trânsito",
    "Atropelamento",
    "Erro Médico",
    "Queda em Estabelecimento",
    "Dano Moral",
    "Dano Estético",
    "Acidente com Animal",
    "Produto Defeituoso que Causou Dano",
  ],
  "Crimes e Defesa Criminal": [
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
  "Servidor Público": [
    "Concurso Público",
    "Reintegração ao Cargo",
    "Progressão de Carreira",
    "Acúmulo de Cargos",
    "Processo Administrativo Disciplinar",
    "Aposentadoria do Servidor",
    "Desvio de Função",
    "Assédio Moral no Serviço Público",
  ],
  Empresarial: [
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
