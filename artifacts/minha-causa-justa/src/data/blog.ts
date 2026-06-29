// ============================================================
// Blog data — posts (conteúdo fictício)
// Fonte única usada por blog.tsx, post.tsx e BlogSidebar.tsx
// As categorias vêm de data/categories.ts (fonte única do site).
// ============================================================

import { CATEGORIA_NOMES, type CategoriaNome } from "@/data/categories";

export const BLOG_CATEGORIES = CATEGORIA_NOMES;

export type BlogCategory = CategoriaNome;

export interface PostSection {
  heading?: string;
  paragraphs: string[];
}

export interface BlogPost {
  slug: string;
  category: BlogCategory;
  title: string;
  excerpt: string;
  date: string;
  readingMinutes: number;
  body: PostSection[];
  // Conteúdo richtext (HTML), presente em posts gerados/editados no painel /admin.
  // Quando presente, tem precedência sobre `body` na renderização.
  bodyHtml?: string;
  // Campos preenchidos apenas em posts gerados pelo painel /admin
  subtitle?: string;
  keywords?: string[];
  oabClosing?: string;
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "inss-negou-seu-beneficio",
    category: "INSS e Previdência",
    title:
      "INSS negou seu benefício? Veja o que diz a lei e quais são seus direitos",
    excerpt:
      "Quando o INSS nega um pedido, a decisão não é definitiva. A lei prevê caminhos para revisão e garante ao cidadão o direito de entender o motivo da negativa.",
    date: "12 de junho de 2026",
    readingMinutes: 4,
    body: [
      {
        paragraphs: [
          "Receber uma negativa do INSS é uma situação mais comum do que muita gente imagina. Aposentadorias, auxílios e o BPC podem ser indeferidos por motivos que vão desde a falta de um documento até a interpretação das regras de contribuição. O que nem sempre fica claro é que a negativa inicial não encerra o assunto: a própria legislação prevê maneiras de revisar a decisão.",
        ],
      },
      {
        heading: "Por que um benefício pode ser negado",
        paragraphs: [
          "As negativas costumam ter causas específicas. Entre as mais frequentes estão a ausência de carência mínima de contribuições, divergências no Cadastro Nacional de Informações Sociais (o famoso CNIS), períodos de trabalho que não constam no histórico e laudos médicos considerados insuficientes pela perícia.",
          "Por lei, o INSS é obrigado a informar o motivo da recusa. Essa informação aparece na carta de indeferimento ou na própria plataforma Meu INSS. Entender exatamente qual foi a razão é o primeiro passo para saber se houve apenas um problema de documentação ou uma divergência sobre o direito em si.",
        ],
      },
      {
        heading: "O que a lei garante depois da negativa",
        paragraphs: [
          "A legislação previdenciária assegura o direito de contestar a decisão. Existe a possibilidade de recurso administrativo, analisado pelo Conselho de Recursos da Previdência Social, um órgão diferente daquele que negou o pedido inicialmente.",
          "Também é possível pedir a revisão quando surgem novos documentos ou quando há correção de informações no histórico de contribuições. Em muitos casos, dados que faltavam podem ser incluídos e mudam completamente a análise do pedido.",
        ],
      },
      {
        heading: "Prazos e organização dos documentos",
        paragraphs: [
          "Os recursos administrativos têm prazos definidos, normalmente contados a partir da data em que a pessoa toma conhecimento da negativa. Por isso, guardar a carta de indeferimento e anotar as datas é importante para não perder a oportunidade de contestar.",
          "Reunir comprovantes de trabalho, carnês de contribuição, laudos e exames médicos ajuda a montar um quadro completo da situação. Quanto mais organizado o conjunto de documentos, mais clara fica a análise de quem vai reavaliar o pedido.",
        ],
      },
    ],
  },
  {
    slug: "demitido-sem-justa-causa",
    category: "Trabalho e Emprego",
    title: "Fui demitido sem justa causa: o que tenho direito a receber?",
    excerpt:
      "A demissão sem justa causa garante um conjunto de verbas previstas na CLT. Saber quais são ajuda o trabalhador a conferir se tudo foi pago corretamente.",
    date: "5 de junho de 2026",
    readingMinutes: 3,
    body: [
      {
        paragraphs: [
          "A demissão sem justa causa acontece quando a empresa decide encerrar o contrato sem que o trabalhador tenha cometido falta grave. Nesse cenário, a CLT prevê um conjunto de verbas que devem ser pagas na rescisão.",
        ],
      },
      {
        heading: "As principais verbas rescisórias",
        paragraphs: [
          "Entre os valores normalmente devidos estão o saldo de salário dos dias trabalhados no mês, o aviso prévio, as férias vencidas e proporcionais acrescidas de um terço, e o décimo terceiro proporcional.",
          "Além disso, a lei prevê o acesso ao saldo do FGTS e a uma multa sobre esse saldo, paga pela empresa nesse tipo de desligamento.",
        ],
      },
      {
        heading: "Conferindo o termo de rescisão",
        paragraphs: [
          "Todas as verbas aparecem discriminadas no termo de rescisão do contrato de trabalho. Comparar os valores com o que a lei prevê ajuda a entender se algo ficou de fora.",
          "Guardar holerites, o contrato e o termo de rescisão facilita a conferência e mantém um registro completo da relação de trabalho.",
        ],
      },
    ],
  },
  {
    slug: "pensao-alimenticia-como-funciona",
    category: "Família",
    title: "Pensão alimentícia: como funciona e quem tem direito",
    excerpt:
      "A pensão alimentícia existe para garantir o sustento de quem precisa. A lei define quem pode receber e quais critérios são usados para calcular o valor.",
    date: "28 de maio de 2026",
    readingMinutes: 3,
    body: [
      {
        paragraphs: [
          "A pensão alimentícia é um valor pago para garantir as necessidades básicas de quem não tem condições de prover o próprio sustento. Ela está prevista no Código Civil e pode envolver diferentes membros de uma família.",
        ],
      },
      {
        heading: "Quem pode receber",
        paragraphs: [
          "O caso mais conhecido é o dos filhos, que têm direito à pensão até atingirem a maioridade e, em algumas situações, enquanto estiverem estudando. Mas a lei também prevê a possibilidade entre cônjuges e, em certos casos, entre pais e filhos adultos.",
        ],
      },
      {
        heading: "Como o valor é definido",
        paragraphs: [
          "O cálculo segue o chamado binômio necessidade e possibilidade: de um lado, o que a pessoa precisa para viver, de outro, o quanto quem paga tem condições de contribuir.",
          "Esse valor pode ser revisto ao longo do tempo, quando há mudança na situação financeira de qualquer uma das partes.",
        ],
      },
    ],
  },
  {
    slug: "aposentadoria-por-tempo-de-contribuicao",
    category: "INSS e Previdência",
    title:
      "Aposentadoria por tempo de contribuição: quem pode pedir e como calcular",
    excerpt:
      "As regras de aposentadoria mudaram com a reforma da Previdência. Entender as regras de transição é essencial para saber em qual situação cada pessoa se encaixa.",
    date: "20 de maio de 2026",
    readingMinutes: 4,
    body: [
      {
        paragraphs: [
          "A aposentadoria por tempo de contribuição passou por mudanças importantes com a reforma da Previdência. Hoje, quem já contribuía antes da reforma pode se encaixar em regras de transição, enquanto quem começou depois segue as novas regras.",
        ],
      },
      {
        heading: "As regras de transição",
        paragraphs: [
          "As regras de transição foram criadas para quem já estava perto de se aposentar quando as mudanças entraram em vigor. Elas combinam fatores como idade, tempo de contribuição e, em alguns casos, uma pontuação que soma os dois.",
        ],
      },
      {
        heading: "A importância do histórico de contribuições",
        paragraphs: [
          "Conferir o histórico no CNIS é fundamental para saber quanto tempo de contribuição já existe registrado. Períodos de trabalho que não aparecem podem ser incluídos com a documentação correta.",
          "Esse acompanhamento ajuda cada pessoa a entender em qual regra se encaixa e quanto tempo ainda falta, de acordo com o seu próprio histórico.",
        ],
      },
    ],
  },
  {
    slug: "plano-de-saude-negou-cobertura",
    category: "Plano de Saúde",
    title: "Plano de saúde negou cobertura? Entenda quando isso é ilegal",
    excerpt:
      "Nem toda negativa de plano de saúde está de acordo com a lei. Existem regras claras sobre coberturas obrigatórias e prazos de atendimento.",
    date: "14 de maio de 2026",
    readingMinutes: 3,
    body: [
      {
        paragraphs: [
          "Receber uma negativa de cobertura do plano de saúde gera dúvida e insegurança. Em muitos casos, a recusa é legítima, mas existem situações em que ela contraria as regras definidas pela legislação e pela agência reguladora.",
        ],
      },
      {
        heading: "O rol de procedimentos",
        paragraphs: [
          "A ANS, agência que regula os planos de saúde, mantém uma lista de procedimentos de cobertura obrigatória. Tratamentos previstos nessa lista, dentro das condições estabelecidas, devem ser oferecidos pelas operadoras.",
        ],
      },
      {
        heading: "Negativas que precisam de justificativa",
        paragraphs: [
          "Quando há uma recusa, a operadora deve informar o motivo de forma clara e por escrito, sempre que solicitada. Essa explicação ajuda a entender se a negativa segue ou não as regras aplicáveis ao contrato.",
          "Guardar pedidos médicos, protocolos de atendimento e a resposta da operadora mantém um registro útil de toda a situação.",
        ],
      },
    ],
  },
  {
    slug: "inventario-e-heranca",
    category: "Herança e Inventário",
    title:
      "Inventário e herança: o que acontece com os bens depois que alguém falece",
    excerpt:
      "O inventário é o processo que organiza a partilha dos bens deixados por uma pessoa. Conhecer as etapas ajuda a entender como tudo funciona.",
    date: "6 de maio de 2026",
    readingMinutes: 4,
    body: [
      {
        paragraphs: [
          "Quando uma pessoa falece, os bens que ela deixou precisam passar por um processo chamado inventário. É por meio dele que se identifica o patrimônio, se calculam eventuais tributos e se define como os bens serão partilhados entre os herdeiros.",
        ],
      },
      {
        heading: "As formas de inventário",
        paragraphs: [
          "O inventário pode ser feito de forma judicial ou, quando há acordo entre os herdeiros e não existem menores ou incapazes envolvidos, de forma extrajudicial, em cartório.",
          "A escolha do caminho depende da situação específica de cada família e da existência ou não de testamento.",
        ],
      },
      {
        heading: "Herdeiros e partilha",
        paragraphs: [
          "A lei define uma ordem de sucessão, que indica quem são os herdeiros e em qual proporção cada um participa da partilha. Cônjuge, filhos e outros parentes podem entrar nessa ordem conforme o caso.",
          "Reunir documentos dos bens e das pessoas envolvidas é um passo importante para que o processo transcorra de forma organizada.",
        ],
      },
    ],
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}
