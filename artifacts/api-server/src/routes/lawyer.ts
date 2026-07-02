import { Router, type IRouter } from "express";
import { eq, and, or, isNull, gt } from "drizzle-orm";
import {
  db,
  advogadosTable,
  subscriptionsTable,
  cadastroLeadsTable,
  type AdvogadoRow,
  type CadastroLeadRow,
  type Cidade,
} from "@workspace/db";
import {
  GetPerfilResponse,
  UpdatePerfilBody,
  UpdatePerfilResponse,
  ListAdvogadosResponse,
  ContarAdvogadosResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { getAuth, clerkClient } from "@clerk/express";
import type { Request } from "express";
import type { Logger } from "pino";
import { claimSubscriptionForUser } from "../lib/subscriptionClaim";
import { verificarInscricaoOab } from "../lib/oab";
import { verificarOabToken, tokenCombinaComOab } from "../lib/oabToken";

const router: IRouter = Router();

// E-mail da conta autenticada (Clerk). É o mesmo do pagamento (o convite trava
// o e-mail), então serve para casar a conta recém-criada com o lead do funil.
async function getAuthedEmail(req: Request): Promise<string | null> {
  try {
    const clerkUserId = getAuth(req).userId;
    if (!clerkUserId) return null;
    const user = await clerkClient.users.getUser(clerkUserId);
    return (
      user.primaryEmailAddress?.emailAddress ??
      user.emailAddresses[0]?.emailAddress ??
      null
    );
  } catch (err) {
    req.log.error({ err }, "Falha ao obter e-mail da conta no Clerk");
    return null;
  }
}

// Verificação da OAB para o perfil recém-criado. NÃO confiamos no booleano
// gravado no lead (a rota de upsert do lead é pública e forjável): refazemos a
// checagem REAL no webservice da OAB no servidor, tornando o selo "verificada"
// inforjável. Falha de serviço vira "pendente" (revisão manual), nunca bloqueia.
async function verificarOabDoLead(
  lead: CadastroLeadRow,
  log: Logger,
): Promise<{
  oabVerificada: boolean;
  oabSituacao: string | null;
  oabNomeConfirmado: string | null;
  oabVerificadaEm: Date | null;
  oabVerificacaoPendente: boolean;
}> {
  const naoVerificado = {
    oabVerificada: false,
    oabSituacao: null,
    oabNomeConfirmado: null,
    oabVerificadaEm: null,
    oabVerificacaoPendente: true,
  };
  const cpf = lead.cpf.trim();
  const oab = lead.oab.trim();
  const seccional = lead.seccional.trim();
  const nome = lead.nome.trim();
  if (!cpf || !oab || !seccional || !nome) {
    // Sem dados de identificação suficientes: deixa para revisão manual.
    return naoVerificado;
  }
  try {
    const resultado = await verificarInscricaoOab({ cpf, oab, seccional, nome });
    if (resultado.valido) {
      return {
        oabVerificada: true,
        oabSituacao: resultado.situacao,
        oabNomeConfirmado: resultado.nomeOab,
        oabVerificadaEm: new Date(),
        oabVerificacaoPendente: false,
      };
    }
    return naoVerificado;
  } catch (err) {
    log.error({ err }, "Falha ao reverificar OAB no primeiro acesso ao perfil");
    return naoVerificado;
  }
}

// Prefill do perfil no primeiro acesso, a partir do lead do funil casado pelo
// e-mail da conta (que é o e-mail do pagamento). Copia apenas dados não
// sensíveis; o selo da OAB é reverificado no servidor (ver acima).
async function buildPrefillFromLead(
  req: Request,
): Promise<Partial<typeof advogadosTable.$inferInsert>> {
  const email = await getAuthedEmail(req);
  if (!email) return {};
  const userId = getAuth(req).userId;
  if (!userId) return {};

  // Casa (e vincula atomicamente) a assinatura paga a este usuário. No modelo
  // "checkout primeiro" a assinatura nasce anônima (lawyerRef nulo); no primeiro
  // acesso ela é vinculada aqui pelo e-mail da conta (= e-mail do pagamento).
  // Vinculamos o prefill ao lead EXATO que gerou esse pagamento
  // (subscriptions.leadId), não ao "último lead com este e-mail", para que um
  // upsert público de lead não injete dados de terceiros no primeiro acesso.
  const sub = await claimSubscriptionForUser(userId, email);
  if (!sub?.leadId) return {};

  const [lead] = await db
    .select()
    .from(cadastroLeadsTable)
    .where(eq(cadastroLeadsTable.leadId, sub.leadId))
    .limit(1);
  // Só usa o lead se o e-mail dele bater com o e-mail da conta (que é o do
  // pagamento). Garante a regra "prefill apenas se lead == pagamento".
  if (!lead || lead.email.trim().toLowerCase() !== email.trim().toLowerCase()) {
    return {};
  }

  const oabFormatada =
    lead.oab.trim() && lead.seccional.trim()
      ? `OAB/${lead.seccional.trim().toUpperCase()} ${lead.oab.trim()}`
      : "";
  const verificacao = await verificarOabDoLead(lead, req.log);

  return {
    nome: lead.nome,
    oab: oabFormatada,
    whatsapp: lead.telefone,
    areas: lead.areas ?? [],
    cidades: (lead.cidades ?? []) as Cidade[],
    atendeOnline: lead.atendeOnline,
    ...verificacao,
  };
}

type SubStatus = "pendente" | "ativa" | "atrasada" | "inativa";

// Um perfil está "completo" quando tem o mínimo para aparecer no diretório:
// nome, OAB, descrição, ao menos uma área, ao menos uma cidade OU atendimento
// online, e um WhatsApp para contato.
function isComplete(row: AdvogadoRow): boolean {
  const hasLocal =
    (row.cidades?.length ?? 0) > 0 || row.atendeOnline === true;
  return Boolean(
    row.nome.trim() &&
      row.oab.trim() &&
      row.about.trim() &&
      (row.areas?.length ?? 0) > 0 &&
      hasLocal &&
      row.whatsapp.trim(),
  );
}

function toProfile(
  row: AdvogadoRow,
  subscriptionStatus: SubStatus | null,
) {
  const complete = isComplete(row);
  return {
    nome: row.nome,
    oab: row.oab,
    photo: row.photo,
    about: row.about,
    areas: row.areas ?? [],
    cidades: row.cidades ?? [],
    atendeOnline: row.atendeOnline,
    whatsapp: row.whatsapp,
    instagram: row.instagram,
    linkedin: row.linkedin,
    website: row.website,
    outro: row.outro,
    complete,
    subscriptionStatus,
    visivel: complete && subscriptionStatus === "ativa" && row.adminAtivo,
    oabVerificada: row.oabVerificada,
    oabSituacao: row.oabSituacao ?? null,
    oabNomeConfirmado: row.oabNomeConfirmado ?? null,
    oabVerificadaEm: row.oabVerificadaEm
      ? row.oabVerificadaEm.toISOString()
      : null,
    oabVerificacaoPendente: row.oabVerificacaoPendente,
    createdAt: row.createdAt ? row.createdAt.toISOString() : null,
  };
}

// Data de hoje em ISO yyyy-mm-dd (para comparar com accessUntil, texto ISO).
function hojeIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// Filtro de visibilidade pública: assinatura "ativa" que, se cancelada, ainda
// esteja dentro do período já pago (accessUntil no futuro). Um cancelamento só
// interrompe cobranças futuras: o perfil permanece visível até accessUntil.
function assinaturaVisivel() {
  return and(
    eq(advogadosTable.adminAtivo, true),
    eq(subscriptionsTable.status, "ativa"),
    or(
      isNull(subscriptionsTable.canceledAt),
      gt(subscriptionsTable.accessUntil, hojeIso()),
    ),
  );
}

async function getSubscriptionStatus(
  userId: string,
): Promise<SubStatus | null> {
  const [sub] = await db
    .select({
      status: subscriptionsTable.status,
      canceledAt: subscriptionsTable.canceledAt,
      accessUntil: subscriptionsTable.accessUntil,
    })
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.lawyerRef, userId));
  if (!sub) return null;
  // Assinatura cancelada cujo período pago já venceu conta como inativa, mesmo
  // que o status persistido ainda não tenha sido recalculado por um GET.
  if (
    sub.status === "ativa" &&
    sub.canceledAt &&
    (!sub.accessUntil || sub.accessUntil <= hojeIso())
  ) {
    return "inativa";
  }
  return (sub.status as SubStatus | undefined) ?? null;
}

// Diretório público: somente advogados pagantes (assinatura "ativa") com
// perfil completo.
router.get("/advogados", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      advogado: advogadosTable,
      status: subscriptionsTable.status,
    })
    .from(advogadosTable)
    .innerJoin(
      subscriptionsTable,
      eq(subscriptionsTable.lawyerRef, advogadosTable.userId),
    )
    .where(assinaturaVisivel());

  const visible = rows
    .filter(({ advogado }) => isComplete(advogado))
    .map(({ advogado }) => ({
      id: advogado.id,
      nome: advogado.nome,
      oab: advogado.oab,
      photo: advogado.photo,
      about: advogado.about,
      areas: advogado.areas ?? [],
      cidades: advogado.cidades ?? [],
      atendeOnline: advogado.atendeOnline,
      whatsapp: advogado.whatsapp,
    }));

  res.json(ListAdvogadosResponse.parse(visible));
});

// Normaliza texto para comparação (sem acentos, minúsculo, sem espaços extras).
function normalizar(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

// Contagem de concorrência: advogados pagantes (assinatura "ativa") com perfil
// completo, opcionalmente filtrados por área, cidade e UF. Usado no funil de
// cadastro para mostrar números reais de concorrência. Reaproveita a mesma
// regra de visibilidade do diretório público (join + isComplete).
router.get("/advogados/contagem", async (req, res): Promise<void> => {
  const area =
    typeof req.query["area"] === "string" ? req.query["area"] : "";
  const cidade =
    typeof req.query["cidade"] === "string" ? req.query["cidade"] : "";
  const uf = typeof req.query["uf"] === "string" ? req.query["uf"] : "";

  const areaN = normalizar(area);
  const cidadeN = normalizar(cidade);
  const ufN = normalizar(uf);

  const rows = await db
    .select({
      advogado: advogadosTable,
      status: subscriptionsTable.status,
    })
    .from(advogadosTable)
    .innerJoin(
      subscriptionsTable,
      eq(subscriptionsTable.lawyerRef, advogadosTable.userId),
    )
    .where(assinaturaVisivel());

  const visiveis = rows
    .map(({ advogado }) => advogado)
    .filter((advogado) => isComplete(advogado));

  const matchesArea = (adv: AdvogadoRow): boolean =>
    !areaN || (adv.areas ?? []).some((a) => normalizar(a) === areaN);

  const matchesLocal = (adv: AdvogadoRow): boolean => {
    if (!cidadeN && !ufN) return true;
    if (adv.atendeOnline) return true;
    return (adv.cidades ?? []).some((c) => {
      const okCidade = !cidadeN || normalizar(c.nome) === cidadeN;
      const okUf = !ufN || normalizar(c.uf) === ufN;
      return okCidade && okUf;
    });
  };

  const naArea = visiveis.filter(matchesArea);
  const naCidade = visiveis.filter(matchesLocal);
  const naAreaECidade = visiveis.filter(
    (adv) => matchesArea(adv) && matchesLocal(adv),
  );

  res.json(
    ContarAdvogadosResponse.parse({
      total: visiveis.length,
      naArea: naArea.length,
      naCidade: naCidade.length,
      naAreaECidade: naAreaECidade.length,
    }),
  );
});

// Perfil do advogado autenticado. Cria um registro vazio na primeira leitura
// para simplificar o fluxo do painel.
router.get("/perfil", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  let [row] = await db
    .select()
    .from(advogadosTable)
    .where(eq(advogadosTable.userId, userId));

  if (!row) {
    // Primeiro acesso ao painel: cria o perfil já pré-preenchido com os dados
    // do funil de cadastro (casados pelo e-mail da conta, que é o e-mail do
    // pagamento). O selo da OAB é reverificado no servidor. Sem e-mail de
    // boas-vindas aqui: o e-mail "Conta criada" já foi enviado no pagamento.
    const prefill = await buildPrefillFromLead(req);
    [row] = await db
      .insert(advogadosTable)
      .values({ userId, ...prefill })
      .returning();
  }

  const status = await getSubscriptionStatus(userId);
  res.json(GetPerfilResponse.parse(toProfile(row, status)));
});

// Cria ou atualiza o perfil do advogado autenticado.
router.put("/perfil", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const parsed = UpdatePerfilBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;

  // Status de verificação da OAB é server-managed: só marcamos oabVerificada a
  // partir de um token assinado por /verificar-oab (impede o cliente forjar o
  // status). "Pendente" é o estado de menor privilégio e pode vir do cliente.
  // Edições comuns no painel (sem token nem flag) preservam o valor persistido.
  let oabPatch: {
    oabVerificada?: boolean;
    oabSituacao?: string | null;
    oabNomeConfirmado?: string | null;
    oabVerificadaEm?: Date;
    oabVerificacaoPendente?: boolean;
  } = {};
  const tokenPayload = data.oabToken ? verificarOabToken(data.oabToken) : null;
  // O perfil grava a OAB no formato "OAB/UF 123456"; extraímos a seccional para
  // exigir que o token bata também na UF (não só no número da inscrição).
  const ufMatch = data.oab.match(/OAB\/([A-Za-z]{2})/i);
  const seccionalPerfil = ufMatch?.[1];
  if (
    tokenPayload &&
    tokenCombinaComOab(tokenPayload, data.oab, seccionalPerfil)
  ) {
    oabPatch = {
      oabVerificada: true,
      oabSituacao: tokenPayload.situacao,
      oabNomeConfirmado: tokenPayload.nomeOab,
      oabVerificadaEm: new Date(),
      oabVerificacaoPendente: false,
    };
  } else if (data.oabVerificacaoPendente !== undefined) {
    oabPatch = { oabVerificacaoPendente: data.oabVerificacaoPendente };
  }

  const values = {
    userId,
    nome: data.nome,
    oab: data.oab,
    photo: data.photo ?? null,
    about: data.about,
    areas: data.areas,
    cidades: data.cidades as Cidade[],
    atendeOnline: data.atendeOnline,
    whatsapp: data.whatsapp,
    instagram: data.instagram,
    linkedin: data.linkedin,
    website: data.website,
    outro: data.outro,
    updatedAt: new Date(),
    ...oabPatch,
  };

  const [row] = await db
    .insert(advogadosTable)
    .values(values)
    .onConflictDoUpdate({
      target: advogadosTable.userId,
      set: values,
    })
    .returning();

  const status = await getSubscriptionStatus(userId);
  res.json(UpdatePerfilResponse.parse(toProfile(row, status)));
});

export default router;
