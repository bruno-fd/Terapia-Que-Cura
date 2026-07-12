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
  // Tema específico (subcategoria) do post, quando definido no painel /admin.
  subcategoria?: string;
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
  crpClosing?: string;
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "ansiedade-nao-e-frescura",
    category: "Ansiedade e Estresse",
    subcategoria: "Ansiedade Generalizada",
    title: "Ansiedade não é frescura: como identificar quando buscar ajuda",
    excerpt:
      "A ansiedade é uma reação natural do corpo diante de situações de alerta. O problema começa quando ela se torna constante e passa a atrapalhar a rotina.",
    date: "12 de junho de 2026",
    readingMinutes: 4,
    body: [
      {
        paragraphs: [
          "Sentir ansiedade antes de uma entrevista de emprego ou de uma prova é normal: é o corpo se preparando para lidar com um momento de tensão. O que muda de figura é quando essa sensação deixa de ser pontual e passa a aparecer quase todos os dias, mesmo sem um motivo claro.",
        ],
      },
      {
        heading: "Sinais de que a ansiedade passou do ponto",
        paragraphs: [
          "Preocupação excessiva com situações do cotidiano, dificuldade para relaxar, tensão muscular, insônia e uma sensação constante de que algo ruim vai acontecer são sinais comuns. Também é frequente a pessoa perceber que já não consegue se concentrar no trabalho ou nos estudos por causa desses pensamentos.",
          "Em alguns casos, a ansiedade se manifesta fisicamente: coração acelerado, falta de ar, tontura ou aperto no peito, mesmo sem nenhuma causa médica identificada.",
        ],
      },
      {
        heading: "Por que a ansiedade não desaparece sozinha",
        paragraphs: [
          "É comum tentar lidar com a ansiedade sozinho, adiando o problema na esperança de que ele passe com o tempo. Mas, sem um espaço para entender de onde vêm esses pensamentos e como o corpo reage a eles, a tendência é que o quadro se mantenha ou piore, afetando relações pessoais e profissionais.",
        ],
      },
      {
        heading: "O papel da psicoterapia",
        paragraphs: [
          "Um acompanhamento psicológico ajuda a identificar os gatilhos da ansiedade e a desenvolver formas mais saudáveis de lidar com eles, no ritmo e na abordagem que fizerem sentido para cada pessoa. Buscar esse apoio não é sinal de fraqueza, é um cuidado com a própria saúde mental.",
        ],
      },
    ],
  },
  {
    slug: "depressao-sinais-e-mitos",
    category: "Depressão e Transtornos de Humor",
    subcategoria: "Depressão",
    title: "Depressão: sinais, mitos e como a psicoterapia pode ajudar",
    excerpt:
      "Depressão vai muito além de tristeza. Reconhecer os sinais e desfazer alguns mitos comuns é o primeiro passo para buscar o apoio certo.",
    date: "5 de junho de 2026",
    readingMinutes: 3,
    body: [
      {
        paragraphs: [
          "Ainda existe a ideia de que depressão é apenas uma tristeza mais forte, que passa com tempo ou força de vontade. Na prática, é um quadro que envolve o corpo e a mente como um todo, e que pode se manifestar de formas bem diferentes de pessoa para pessoa.",
        ],
      },
      {
        heading: "Sinais que vão além da tristeza",
        paragraphs: [
          "Perda de interesse em atividades que antes davam prazer, cansaço constante, alterações no sono e no apetite, dificuldade de concentração e uma sensação persistente de vazio são sinais frequentes. Em muitos casos, a pessoa continua cumprindo suas obrigações do dia a dia, o que torna o quadro mais difícil de ser percebido por quem está ao redor.",
        ],
      },
      {
        heading: "Alguns mitos comuns",
        paragraphs: [
          "\"Depressão é falta de vontade\" e \"basta pensar positivo\" são frases que, além de não ajudarem, podem fazer a pessoa se sentir ainda mais culpada. Depressão não é escolha nem fraqueza: é uma condição de saúde que envolve fatores biológicos, psicológicos e sociais.",
        ],
      },
      {
        heading: "Buscando apoio profissional",
        paragraphs: [
          "A psicoterapia oferece um espaço para entender o que está por trás do quadro depressivo e construir, aos poucos, formas de lidar com ele. Quando necessário, o psicólogo também pode indicar o acompanhamento conjunto com um psiquiatra, já que em alguns casos o tratamento combinado costuma trazer melhores resultados.",
        ],
      },
    ],
  },
  {
    slug: "terapia-de-casal-quando-procurar",
    category: "Relacionamentos e Casais",
    subcategoria: "Conflitos Amorosos",
    title: "Terapia de casal: quando e por que buscar ajuda profissional",
    excerpt:
      "Discussões fazem parte de qualquer relacionamento. O sinal de alerta aparece quando os conflitos se repetem sempre da mesma forma, sem solução.",
    date: "28 de maio de 2026",
    readingMinutes: 3,
    body: [
      {
        paragraphs: [
          "Todo relacionamento passa por momentos de atrito. O que diferencia um casal que atravessa bem essas fases de outro que sofre com elas costuma ser a forma como os dois conseguem conversar sobre o que sentem, e nem sempre isso é simples de fazer sozinhos.",
        ],
      },
      {
        heading: "Sinais de que pode ser hora de buscar ajuda",
        paragraphs: [
          "Discussões que sempre terminam do mesmo jeito, sem chegar a lugar nenhum, distanciamento afetivo, dificuldade de confiar após uma crise, ou a sensação de que a comunicação virou só cobrança, são sinais comuns de que o casal pode se beneficiar de um espaço mediado por um profissional.",
        ],
      },
      {
        heading: "O que a terapia de casal não é",
        paragraphs: [
          "A terapia de casal não existe para apontar quem está certo ou errado, nem para salvar toda e qualquer relação a qualquer custo. O objetivo é ajudar os dois a se entenderem melhor, e, a partir daí, decidirem juntos os próximos passos, seja para fortalecer o vínculo, seja para uma separação mais saudável.",
        ],
      },
      {
        heading: "Como funciona na prática",
        paragraphs: [
          "As sessões geralmente incluem momentos com o casal junto e, quando necessário, conversas individuais. O psicólogo atua como um mediador neutro, ajudando cada um a se expressar sem que a conversa vire uma disputa.",
        ],
      },
    ],
  },
  {
    slug: "conflitos-familiares-na-adolescencia",
    category: "Família e Parentalidade",
    subcategoria: "Conflitos Familiares",
    title: "Conflitos familiares na adolescência: como a terapia pode ajudar",
    excerpt:
      "A adolescência traz mudanças rápidas que costumam gerar atrito em casa. Entender o que está por trás dos conflitos ajuda a família a se reorganizar.",
    date: "20 de maio de 2026",
    readingMinutes: 4,
    body: [
      {
        paragraphs: [
          "É comum que a relação entre pais e filhos adolescentes fique mais tensa nessa fase. Mudanças de humor, busca por independência e a formação da própria identidade fazem parte do desenvolvimento, mas também podem gerar bastante desgaste em casa.",
        ],
      },
      {
        heading: "Por que os conflitos aumentam nessa fase",
        paragraphs: [
          "O adolescente está testando limites e formando sua própria visão de mundo, o que naturalmente entra em choque com as regras estabelecidas pelos pais. Ao mesmo tempo, os pais lidam com a insegurança de saber até onde ceder e até onde manter os limites necessários.",
        ],
      },
      {
        heading: "O papel da orientação psicológica",
        paragraphs: [
          "Um acompanhamento com o adolescente, com os pais ou com a família como um todo ajuda a abrir espaço para que cada lado seja ouvido. Muitas vezes, o conflito visível esconde uma dificuldade de comunicação que já vem de antes, e que pode ser trabalhada aos poucos.",
          "Orientação de pais também é um recurso valioso: ajuda a entender o momento de desenvolvimento do filho e a encontrar formas de dialogar sem abrir mão dos limites que forem necessários.",
        ],
      },
      {
        heading: "Quando buscar apoio",
        paragraphs: [
          "Se os conflitos estão constantes, se há isolamento excessivo do adolescente ou mudanças bruscas de comportamento, vale considerar uma conversa com um psicólogo especializado em infância e adolescência.",
        ],
      },
    ],
  },
  {
    slug: "luto-como-a-psicoterapia-ajuda",
    category: "Luto, Envelhecimento e Cuidados Paliativos",
    subcategoria: "Luto e Morte",
    title: "Luto: como a psicoterapia ajuda a atravessar o processo",
    excerpt:
      "Cada pessoa vive o luto de um jeito diferente, e não existe um prazo certo para essa dor passar. A psicoterapia oferece um espaço para atravessar esse processo.",
    date: "14 de maio de 2026",
    readingMinutes: 3,
    body: [
      {
        paragraphs: [
          "A perda de alguém importante mexe com a vida de formas que nem sempre conseguimos prever. Não existe um roteiro certo para o luto, e comparar a própria dor com a de outra pessoa raramente ajuda.",
        ],
      },
      {
        heading: "O luto não segue um cronograma",
        paragraphs: [
          "É comum ouvir frases como \"já faz tempo, precisa seguir em frente\", mas o processo de elaborar uma perda não tem prazo fixo. Cada pessoa lida com o luto no seu próprio ritmo, e isso inclui momentos de tristeza, raiva, culpa e, aos poucos, aceitação.",
        ],
      },
      {
        heading: "Quando o luto pode precisar de atenção",
        paragraphs: [
          "Quando a dor permanece tão intensa que impede a pessoa de retomar a rotina por um período prolongado, ou quando surgem sentimentos de culpa muito fortes, pode ser importante buscar apoio profissional para que o luto não se transforme em um sofrimento mais prolongado.",
        ],
      },
      {
        heading: "Como a terapia pode ajudar",
        paragraphs: [
          "A psicoterapia oferece um espaço seguro para falar sobre a pessoa que se foi, elaborar sentimentos difíceis e, aos poucos, encontrar formas de seguir a vida com essa perda. Esse acompanhamento também pode ser importante para famílias que enfrentam cuidados paliativos, ajudando a lidar com a antecipação da despedida.",
        ],
      },
    ],
  },
  {
    slug: "autoestima-baixa-como-a-terapia-ajuda",
    category: "Autoconhecimento e Desenvolvimento Pessoal",
    subcategoria: "Autoestima",
    title: "Autoestima baixa: como a terapia pode ajudar a reconstruir a confiança",
    excerpt:
      "A forma como enxergamos a nós mesmos molda decisões importantes da vida. Quando essa visão está distorcida, a terapia pode ajudar a reconstruí-la.",
    date: "6 de maio de 2026",
    readingMinutes: 3,
    body: [
      {
        paragraphs: [
          "Autoestima baixa não é apenas uma questão de vaidade ou de aparência: ela influencia decisões de carreira, relacionamentos e a forma como a pessoa se permite (ou não) buscar o que quer para a própria vida.",
        ],
      },
      {
        heading: "Como a autoestima baixa se manifesta",
        paragraphs: [
          "Autocrítica excessiva, dificuldade de aceitar elogios, medo constante de errar e comparação frequente com outras pessoas são sinais comuns. Muitas vezes, a origem está em experiências antigas, como cobranças na infância ou relações marcadas por críticas constantes.",
        ],
      },
      {
        heading: "O papel do autoconhecimento",
        paragraphs: [
          "Entender de onde vêm essas crenças sobre si mesmo é um passo importante para começar a mudá-las. Isso não acontece da noite para o dia, mas com um acompanhamento constante é possível construir uma relação mais gentil consigo mesmo.",
        ],
      },
      {
        heading: "Como a terapia contribui nesse processo",
        paragraphs: [
          "Em terapia, é possível identificar os padrões de pensamento que alimentam a baixa autoestima e substituí-los, aos poucos, por uma visão mais realista e menos punitiva de si mesmo. O processo é gradual, mas os efeitos costumam se refletir em várias áreas da vida.",
        ],
      },
    ],
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}
