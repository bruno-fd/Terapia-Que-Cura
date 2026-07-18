// ============================================================
// Filtro de relevância de temas (curadoria automática da fila).
//
// A mineração do Autocomplete traz MUITO ruído: nomes de série/filme, buscas
// em espanhol/inglês, pdf/wordwall/scribd, nomes de remédio, autores
// acadêmicos, temas médicos fora do escopo (dermato, gineco, endócrino),
// burocracia/benefícios (INSS, LOAS, IPVA), anos, e sobras da "sopa de
// letrinhas". Nada disso vira bom post de um blog popular de psicologia para o
// adulto brasileiro leigo.
//
// isRelevante() é a curadoria automática: recusa a pergunta se ela bater em
// qualquer sinal de ruído. É conservador de propósito (na dúvida, corta): a
// fila tem milhares de itens e as buscas boas ("o que é", "como lidar com",
// "sintomas", "tem cura", "tratamento", "causas") passam limpo. As listas são
// fáceis de ajustar; se algo bom estiver sendo cortado, é só editar aqui.
// ============================================================

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Palavras isoladas (checadas com fronteira de palavra) que denunciam ruído.
const TOKENS_BLOQUEADOS = new Set<string>([
  // Espanhol (o blog é pt-BR; essas buscas vêm de outro público).
  "el", "en", "los", "las", "del", "una", "uno", "con", "por", "y", "es",
  "hasta", "salud", "edad", "ninos", "ninez", "mismo", "sus", "escuela",
  "escolar", "nino", "nina", "como.lidar",
  // Inglês / internet.
  "meaning", "english", "reddit", "wallpaper", "wattpad", "wikipedia",
  "build", "teams", "set", "who", "www", "kindle", "epub", "walk", "run",
  "shoes", "zapatos", "samoa",
  // Intenção comercial (preço/comprar) — off-brand para blog de conteúdo.
  "preco", "precos", "comprar",
  // Mídia / pop / entretenimento.
  "netflix", "serie", "novela", "filme", "elenco", "temporada", "temporadas",
  "episodio", "episodios", "grammy", "emmy", "emmys", "oscar", "gta",
  "zootopia", "wuwa", "yandere", "assassino", "culpado", "matou", "katie",
  "jaime", "jamie", "james",
  // Material escolar / arquivos / recursos.
  "pdf", "wordwall", "scribd", "torrent", "download", "quiz", "colorir",
  "desenho", "imagens", "imagem", "atividades", "atividade", "jogos", "jogo",
  "musica", "frases", "resenha", "resumo", "artigo", "artigos", "livro",
  "livros", "slide", "slides", "wattpad", "gif", "reportagem", "video",
  "silabica", "silabas", "separacao",
  // Remédios / substâncias (conteúdo médico/prescritivo, fora do escopo).
  "ritalina", "venvanse", "vyvanse", "gabapentina", "lamotrigina", "litio",
  "ozempic", "zoloft", "venlafaxina", "vortioxetina", "levetiracetam",
  "paracetamol", "sertralina", "fluoxetina", "remedio", "remedios",
  "medicamento", "medicamentos", "medicacao", "vitamina", "vitaminas",
  // Burocracia / benefícios / jurídico (off-brand p/ blog de apoio emocional).
  "inss", "loas", "aposenta", "aposentar", "aposentadoria", "pcd", "ipva",
  "beneficio", "beneficios", "isencao", "cadeia", "pena", "carteira", "loas",
  "desconto", "cid", "dsm", "laudo", "f90",
  // Autores / teoria acadêmica (público é leigo, não estudante de psico).
  "winnicott", "bandura", "freud", "lacan", "vygotsky", "aberastury",
  "bohoslavsky", "caballo", "knobel", "calligaris", "zimmerman", "kastrup",
  "piaget", "skinner", "scielo", "bibliografia", "monografia", "tese",
  // Instituições / marcas / geografia.
  "senai", "senac", "usiminas", "cemig", "ciee", "ufrgs", "fpceup", "zilor",
  "opp", "nbi", "amparo",
]);

// Trechos (substring na versão normalizada) que denunciam ruído.
const TRECHOS_BLOQUEADOS = [
  // Temas médicos fora do escopo (dermato, gineco, endócrino, infecto...).
  "candidiase", "estrias", "fimose", "ginecomastia", "escoliose",
  "infeccao urinaria", "queda de cabelo", "cabelo branco", "calvicie",
  "endometriose", "hipotireoidismo", "obesidade", "tabagismo", "puberdade",
  "hipotonia", "intestino", "zonulina", "celulas tronco", "gravidez na",
  "grávida", "gravida", "estou gravida",
  // Espanhol multi-palavra.
  "en la", "en los", "de la", "y salud", "y sus", "es lo mismo", "que edad",
  "como superar el", "del desarrollo", "sindrome de down",
  // Direitos/benefícios multi-palavra.
  "quantos anos", "fila preferencial", "governo", "direito ao", "quais os direitos",
  "comprar carro", "isencao de",
  // Comparação/checagem que gera conteúdo raso ou fora de escopo.
  "quem matou", "quem e o", "é culpado", "e culpado",
];

// Expressões regulares para padrões de ruído.
const REGEX_ANO = /\b(19|20)\d{2}\b/; // anos: 2024, 1998...
const REGEX_LETRA_FINAL = /\s[a-z]$/; // sobra da sopa de letrinhas: "autismo w"
const REGEX_SO_LETRA = /^[a-z0-9 ]{0,4}$/; // muito curta/sem conteúdo

// Decide se uma pergunta minerada é um bom tema para o blog.
export function isRelevante(query: string): boolean {
  const n = normalizar(query);
  if (!n || n.length < 8) return false;
  if (REGEX_ANO.test(n)) return false;
  if (REGEX_LETRA_FINAL.test(n)) return false;
  if (REGEX_SO_LETRA.test(n)) return false;

  const palavras = n.split(" ");
  for (const p of palavras) {
    if (TOKENS_BLOQUEADOS.has(p)) return false;
  }
  for (const trecho of TRECHOS_BLOQUEADOS) {
    if (n.includes(trecho)) return false;
  }
  return true;
}

// Versão que também informa o motivo (para logs/depuração do limpador).
export function motivoIrrelevante(query: string): string | null {
  const n = normalizar(query);
  if (!n || n.length < 8) return "curta demais";
  if (REGEX_ANO.test(n)) return "contém ano";
  if (REGEX_LETRA_FINAL.test(n)) return "sobra de sopa de letrinhas";
  if (REGEX_SO_LETRA.test(n)) return "sem conteúdo";
  for (const p of n.split(" ")) {
    if (TOKENS_BLOQUEADOS.has(p)) return `token bloqueado: ${p}`;
  }
  for (const trecho of TRECHOS_BLOQUEADOS) {
    if (n.includes(trecho)) return `trecho bloqueado: ${trecho}`;
  }
  return null;
}
