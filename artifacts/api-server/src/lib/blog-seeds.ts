// ============================================================
// SEMENTES DE DOMINIO (parte de dominio: reescrever por nicho).
//
// Cada eixo = uma macrocategoria do site (deve casar exatamente com
// categorias.ts). Cada cluster = uma subcategoria (o post e gerado por cluster).
// Os `termos` sao as sementes que o minerador expande no Google Autocomplete;
// `ingles` acrescenta sinonimos/siglas em ingles quando o tema tem busca nesse
// idioma. `priority` e a curadoria editorial (maior = sai primeiro na fila).
//
// Publico: adulto brasileiro leigo buscando entender um sentimento/situacao e,
// eventualmente, encontrar um psicologo. A demanda aqui e majoritariamente em
// portugues (diferente de nichos academicos), entao `ingles` e esparso.
// ============================================================

export interface ClusterSeed {
  // Nome do cluster: DEVE ser uma subcategoria existente da macro em
  // categorias.ts (senao o post nao consegue marcar a subcategoria).
  subcategoria: string;
  // Sementes em portugues para minerar. A primeira costuma ser o termo canonico.
  termos: string[];
  // Sinonimos/siglas em ingles (opcional).
  ingles?: string[];
  // Curadoria editorial (default 0). Ordena antes do score de demanda.
  priority?: number;
}

export interface EixoSeed {
  // Nome da macrocategoria (== nome em categorias.ts).
  macro: string;
  // Texto de abertura da pillar page (usar como category.description longa).
  intro: string;
  clusters: ClusterSeed[];
}

export const SEEDS: EixoSeed[] = [
  {
    macro: "Ansiedade e Estresse",
    intro:
      "A ansiedade e o estresse estao entre os motivos mais comuns de busca por apoio psicologico. Aqui reunimos conteudos que ajudam a entender o que voce sente, quando isso passa a atrapalhar o dia a dia e como a psicoterapia pode ajudar.",
    clusters: [
      { subcategoria: "Ansiedade", termos: ["ansiedade", "crise de ansiedade", "o que e ansiedade"], ingles: ["anxiety"], priority: 10 },
      { subcategoria: "Ansiedade Generalizada", termos: ["ansiedade generalizada", "transtorno de ansiedade generalizada", "tag ansiedade"], ingles: ["generalized anxiety disorder"], priority: 7 },
      { subcategoria: "Síndrome do Pânico", termos: ["sindrome do panico", "ataque de panico", "crise de panico"], ingles: ["panic attack"], priority: 8 },
      { subcategoria: "Fobias em Geral", termos: ["fobia", "fobia especifica", "medo excessivo"], ingles: ["phobia"], priority: 5 },
      { subcategoria: "Estresse", termos: ["estresse", "estresse cronico", "como lidar com estresse"], ingles: ["stress"], priority: 6 },
      { subcategoria: "Estresse Pós-Traumático", termos: ["estresse pos traumatico", "tept"], ingles: ["ptsd", "post traumatic stress"], priority: 5 },
      { subcategoria: "Angústia", termos: ["angustia", "sensacao de angustia", "aperto no peito emocional"], priority: 4 },
      { subcategoria: "Medos e Inseguranças", termos: ["inseguranca", "medo de", "insegurança emocional"], priority: 4 },
      { subcategoria: "Ansiedade Social", termos: ["ansiedade social", "fobia social", "timidez extrema"], ingles: ["social anxiety"], priority: 6 },
      { subcategoria: "Burnout", termos: ["burnout", "esgotamento", "sindrome de burnout"], ingles: ["burnout"], priority: 8 },
    ],
  },
  {
    macro: "Depressão e Transtornos de Humor",
    intro:
      "A depressao e outras alteracoes de humor afetam a forma como pensamos, sentimos e agimos. Estes conteudos explicam como esses quadros costumam se manifestar e como o acompanhamento profissional pode fazer diferenca.",
    clusters: [
      { subcategoria: "Depressão", termos: ["depressao", "sintomas de depressao", "o que e depressao"], ingles: ["depression"], priority: 10 },
      { subcategoria: "Depressão Pós-Parto", termos: ["depressao pos parto", "baby blues"], ingles: ["postpartum depression"], priority: 6 },
      { subcategoria: "Transtorno Bipolar", termos: ["transtorno bipolar", "bipolaridade", "sintomas de bipolaridade"], ingles: ["bipolar disorder"], priority: 6 },
      { subcategoria: "Alterações de Humor", termos: ["alteracao de humor", "oscilacao de humor", "instabilidade emocional"], priority: 4 },
      { subcategoria: "Distimia", termos: ["distimia", "depressao persistente"], ingles: ["dysthymia"], priority: 4 },
      { subcategoria: "Automutilação", termos: ["automutilacao", "por que a pessoa se machuca"], ingles: ["self harm"], priority: 5 },
      { subcategoria: "Pensamentos Suicidas", termos: ["pensamentos suicidas", "ideacao suicida", "vontade de sumir"], priority: 5 },
    ],
  },
  {
    macro: "Relacionamentos e Casais",
    intro:
      "Relacionamentos saudaveis sao construidos, nao acontecem por acaso. Aqui falamos sobre conflitos, ciumes, separacoes e sobre como a terapia individual ou de casal pode ajudar a atravessar momentos dificeis.",
    clusters: [
      { subcategoria: "Casais", termos: ["terapia de casal", "problemas no casamento", "crise no relacionamento"], ingles: ["couples therapy"], priority: 9 },
      { subcategoria: "Conflitos Amorosos", termos: ["conflito amoroso", "briga de casal", "como resolver conflito no relacionamento"], priority: 6 },
      { subcategoria: "Ciúmes", termos: ["ciumes", "ciume excessivo", "como controlar o ciume"], ingles: ["jealousy"], priority: 6 },
      { subcategoria: "Divórcio", termos: ["divorcio", "como superar o divorcio", "separacao"], priority: 6 },
      { subcategoria: "Infidelidade", termos: ["infidelidade", "traicao", "como superar uma traicao"], priority: 7 },
      { subcategoria: "Relacionamento Abusivo", termos: ["relacionamento abusivo", "sinais de relacionamento abusivo", "manipulacao emocional"], priority: 8 },
      { subcategoria: "Não Monogamia e Poliamor", termos: ["poliamor", "relacionamento aberto", "nao monogamia"], ingles: ["polyamory"], priority: 3 },
    ],
  },
  {
    macro: "Família e Parentalidade",
    intro:
      "A familia e onde aprendemos a nos relacionar, e tambem onde surgem muitos desafios. Estes textos abordam conflitos familiares, orientacao de pais e transformacoes na estrutura da familia.",
    clusters: [
      { subcategoria: "Conflitos Familiares", termos: ["conflito familiar", "problemas de familia", "como lidar com familia toxica"], priority: 6 },
      { subcategoria: "Orientação de Pais", termos: ["como educar os filhos", "orientacao de pais", "limites para criancas"], priority: 6 },
      { subcategoria: "Adoção", termos: ["adocao", "adaptacao na adocao"], priority: 3 },
      { subcategoria: "Impacto do Divórcio na Família", termos: ["divorcio e filhos", "como contar aos filhos sobre o divorcio"], priority: 4 },
      { subcategoria: "Rivalidade entre Irmãos", termos: ["rivalidade entre irmaos", "ciume entre irmaos"], priority: 3 },
    ],
  },
  {
    macro: "Infância e Adolescência",
    intro:
      "Crescer traz desafios em cada fase. Aqui reunimos conteudos sobre desenvolvimento, aprendizagem, comportamento e saude mental de criancas e adolescentes.",
    clusters: [
      { subcategoria: "Adolescência", termos: ["adolescencia", "comportamento na adolescencia", "meu filho adolescente"], priority: 6 },
      { subcategoria: "Aprendizagem", termos: ["dificuldade de aprendizagem", "transtorno de aprendizagem", "dislexia"], priority: 5 },
      { subcategoria: "Autismo", termos: ["autismo", "sinais de autismo", "espectro autista"], ingles: ["autism", "asd"], priority: 8 },
      { subcategoria: "Bullying", termos: ["bullying", "meu filho sofre bullying"], priority: 5 },
      { subcategoria: "Agressividade", termos: ["agressividade infantil", "crianca agressiva"], priority: 4 },
      { subcategoria: "TDAH", termos: ["tdah", "sintomas de tdah", "deficit de atencao"], ingles: ["adhd"], priority: 8 },
      { subcategoria: "Orientação Vocacional", termos: ["orientacao vocacional", "escolha da profissao", "nao sei que curso fazer"], priority: 5 },
      { subcategoria: "Habilidades Sociais", termos: ["habilidades sociais", "dificuldade de socializar"], priority: 3 },
    ],
  },
  {
    macro: "Luto, Envelhecimento e Cuidados Paliativos",
    intro:
      "Perdas e transicoes fazem parte da vida, mas nem sempre sao faceis de atravessar sozinho. Estes conteudos falam sobre luto, envelhecimento, adoecimento e cuidados no fim da vida.",
    clusters: [
      { subcategoria: "Luto e Morte", termos: ["luto", "como superar o luto", "perda de um ente querido"], ingles: ["grief"], priority: 8 },
      { subcategoria: "Cuidados Paliativos", termos: ["cuidados paliativos", "apoio psicologico cuidados paliativos"], priority: 3 },
      { subcategoria: "Envelhecimento", termos: ["envelhecimento", "depressao em idosos", "saude mental na terceira idade"], priority: 5 },
      { subcategoria: "Adoecimento Físico", termos: ["adoecimento", "impacto psicologico da doenca", "diagnostico de doenca grave"], priority: 4 },
      { subcategoria: "Gravidez e Puerpério", termos: ["puerperio", "saude mental na gravidez", "maternidade real"], priority: 5 },
    ],
  },
  {
    macro: "Autoconhecimento e Desenvolvimento Pessoal",
    intro:
      "Conhecer a si mesmo e o ponto de partida para viver com mais equilibrio. Aqui falamos sobre autoestima, autoconfianca, autonomia e crescimento pessoal.",
    clusters: [
      { subcategoria: "Autoestima", termos: ["autoestima", "baixa autoestima", "como melhorar a autoestima"], ingles: ["self esteem"], priority: 9 },
      { subcategoria: "Autoaceitação", termos: ["autoaceitacao", "como se aceitar"], priority: 4 },
      { subcategoria: "Autoconhecimento", termos: ["autoconhecimento", "como se conhecer melhor"], priority: 6 },
      { subcategoria: "Autoconfiança", termos: ["autoconfianca", "como ter mais confianca"], ingles: ["self confidence"], priority: 6 },
      { subcategoria: "Autocobrança", termos: ["autocobranca", "perfeccionismo", "cobranca excessiva"], priority: 6 },
      { subcategoria: "Autonomia", termos: ["autonomia emocional", "dependencia emocional"], priority: 5 },
      { subcategoria: "Assertividade", termos: ["assertividade", "como ser mais assertivo", "aprender a dizer nao"], priority: 5 },
      { subcategoria: "Desenvolvimento Pessoal", termos: ["desenvolvimento pessoal", "crescimento pessoal"], priority: 4 },
    ],
  },
  {
    macro: "Traumas e Violência",
    intro:
      "Experiencias traumaticas deixam marcas, mas e possivel ressignificar a dor com apoio adequado. Estes conteudos abordam traumas, abusos e diferentes formas de violencia com cuidado e responsabilidade.",
    clusters: [
      { subcategoria: "Traumas", termos: ["trauma", "trauma psicologico", "como superar um trauma"], ingles: ["trauma"], priority: 7 },
      { subcategoria: "Abuso Sexual", termos: ["abuso sexual", "consequencias do abuso sexual"], priority: 5 },
      { subcategoria: "Violência Doméstica", termos: ["violencia domestica", "sair de um relacionamento violento"], priority: 6 },
      { subcategoria: "Assédio Moral ou Sexual", termos: ["assedio moral", "assedio sexual", "assedio no trabalho"], priority: 5 },
      { subcategoria: "Estresse Pós-Traumático", termos: ["estresse pos traumatico", "tept sintomas"], ingles: ["ptsd"], priority: 5 },
    ],
  },
  {
    macro: "Dependências e Compulsões",
    intro:
      "Comportamentos compulsivos e dependencias muitas vezes escondem um sofrimento que pede acolhimento. Aqui explicamos como esses padroes se formam e onde buscar ajuda.",
    clusters: [
      { subcategoria: "Dependências em Geral", termos: ["dependencia quimica", "vicio", "como largar o vicio"], ingles: ["addiction"], priority: 6 },
      { subcategoria: "Compulsões em Geral", termos: ["compulsao", "comportamento compulsivo"], priority: 5 },
      { subcategoria: "Alcoolismo", termos: ["alcoolismo", "como parar de beber"], priority: 6 },
      { subcategoria: "Jogo Compulsivo", termos: ["jogo compulsivo", "vicio em apostas", "ludopatia"], ingles: ["gambling addiction"], priority: 6 },
      { subcategoria: "Compras Compulsivas", termos: ["compras compulsivas", "oniomania"], priority: 4 },
      { subcategoria: "Codependência", termos: ["codependencia", "relacao de codependencia"], ingles: ["codependency"], priority: 4 },
    ],
  },
  {
    macro: "Transtornos Alimentares",
    intro:
      "A relacao com a comida e com o corpo pode se tornar fonte de sofrimento. Estes conteudos abordam transtornos alimentares com cuidado, sem gatilhos e com foco no acolhimento.",
    clusters: [
      { subcategoria: "Compulsão Alimentar", termos: ["compulsao alimentar", "transtorno de compulsao alimentar"], ingles: ["binge eating"], priority: 7 },
      { subcategoria: "Anorexia", termos: ["anorexia", "anorexia nervosa"], ingles: ["anorexia"], priority: 5 },
      { subcategoria: "Bulimia", termos: ["bulimia", "bulimia nervosa"], ingles: ["bulimia"], priority: 5 },
      { subcategoria: "Relação com o Corpo e a Comida", termos: ["relacao com a comida", "imagem corporal", "aceitacao do corpo"], priority: 5 },
    ],
  },
  {
    macro: "Sexualidade e Identidade de Gênero",
    intro:
      "Sexualidade e identidade sao dimensoes importantes de quem somos. Aqui falamos com respeito e embasamento sobre orientacao sexual, identidade de genero e questoes ligadas a sexualidade.",
    clusters: [
      { subcategoria: "LGBTQIA+", termos: ["lgbtqia", "aceitacao lgbt", "sofrimento por preconceito"], priority: 5 },
      { subcategoria: "Orientação Sexual", termos: ["orientacao sexual", "descobrir a sexualidade"], priority: 4 },
      { subcategoria: "Identidade de Gênero", termos: ["identidade de genero", "disforia de genero"], ingles: ["gender dysphoria"], priority: 4 },
      { subcategoria: "Disfunções Sexuais", termos: ["disfuncao sexual", "falta de desejo sexual"], priority: 4 },
    ],
  },
  {
    macro: "Saúde Mental e Transtornos Psiquiátricos",
    intro:
      "Alguns quadros de saude mental pedem acompanhamento especializado e continuo. Estes conteudos explicam, em linguagem acessivel, como esses transtornos costumam se manifestar.",
    clusters: [
      { subcategoria: "Esquizofrenia", termos: ["esquizofrenia", "sintomas de esquizofrenia"], ingles: ["schizophrenia"], priority: 4 },
      { subcategoria: "Transtorno Bipolar", termos: ["transtorno bipolar", "tipos de bipolaridade"], ingles: ["bipolar"], priority: 5 },
      { subcategoria: "Borderline", termos: ["borderline", "transtorno de personalidade borderline"], ingles: ["borderline", "bpd"], priority: 6 },
      { subcategoria: "TDAH", termos: ["tdah em adultos", "tdah adulto sintomas"], ingles: ["adult adhd"], priority: 7 },
      { subcategoria: "Transtornos de Personalidade", termos: ["transtorno de personalidade", "tipos de transtorno de personalidade"], priority: 5 },
    ],
  },
  {
    macro: "Avaliações e Perícias Psicológicas",
    intro:
      "A avaliacao psicologica e uma ferramenta tecnica com finalidades especificas. Aqui explicamos, sem promessas, o que sao e para que servem os principais tipos de avaliacao e laudo.",
    clusters: [
      { subcategoria: "Avaliação Neuropsicológica", termos: ["avaliacao neuropsicologica", "para que serve avaliacao neuropsicologica"], priority: 5 },
      { subcategoria: "Avaliação para Cirurgia", termos: ["avaliacao psicologica para cirurgia", "laudo psicologico cirurgia bariatrica"], priority: 4 },
      { subcategoria: "Laudos e Pareceres Psicológicos", termos: ["laudo psicologico", "parecer psicologico", "diferenca entre laudo e relatorio"], priority: 4 },
    ],
  },
  {
    macro: "Carreira e Vida Profissional",
    intro:
      "O trabalho ocupa boa parte da nossa vida e influencia diretamente o bem-estar. Estes conteudos falam sobre carreira, esgotamento, assedio e o equilibrio entre vida pessoal e profissional.",
    clusters: [
      { subcategoria: "Transição de Carreira", termos: ["transicao de carreira", "mudanca de carreira", "insatisfacao profissional"], priority: 6 },
      { subcategoria: "Assédio Moral no Trabalho", termos: ["assedio moral no trabalho", "chefe abusivo"], priority: 5 },
      { subcategoria: "Burnout", termos: ["burnout no trabalho", "esgotamento profissional"], ingles: ["work burnout"], priority: 7 },
      { subcategoria: "Equilíbrio Vida-Trabalho", termos: ["equilibrio vida trabalho", "trabalho e vida pessoal"], ingles: ["work life balance"], priority: 5 },
      { subcategoria: "Aposentadoria e Reinvenção", termos: ["aposentadoria", "sindrome da aposentadoria", "reinvencao profissional"], priority: 3 },
    ],
  },
];

// Busca o eixo pelo nome da macro.
export function eixoPorMacro(macro: string): EixoSeed | undefined {
  return SEEDS.find((e) => e.macro === macro);
}
