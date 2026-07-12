import { Router, type IRouter } from "express";
import { eq, and, or, isNull, gt } from "drizzle-orm";
import {
  db,
  psicologosTable,
  subscriptionsTable,
  cadastroLeadsTable,
  type PsicologoRow,
  type CadastroLeadRow,
  type Cidade,
} from "@workspace/db";
import {
  GetPerfilResponse,
  UpdatePerfilBody,
  UpdatePerfilResponse,
  ListPsicologosResponse,
  ContarPsicologosResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { getAuth, clerkClient } from "@clerk/express";
import type { Request } from "express";
import type { Logger } from "pino";
import { claimSubscriptionForUser } from "../lib/subscriptionClaim";
import { verificarInscricaoOab } from "../lib/oab";
import { verificarOabToken, tokenCombinaComOab } from "../lib/oabToken";
import { isSubValidaEmAreas } from "../lib/categorias";

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

// Verificação do CRP para o perfil recém-criado. NÃO confiamos no booleano
// gravado no lead (a rota de upsert do lead é pública e forjável): refazemos a
// checagem REAL no webservice do CRP no servidor, tornando o selo "verificada"
// inforjável. Falha de serviço vira "pendente" (revisão manual), nunca bloqueia.
//
// NOTA: a chamada abaixo ainda usa `verificarInscricaoOab` (lib/oab.ts), que
// consulta o webservice da OAB, não do CRP. A migração para o webservice real
// do CRP (lib/crp.ts) é um trabalho à parte, pendente de validação com uma
// chave de API real (ver plano de migração). Até lá, este caminho fica
// efetivamente inativo: sem CPF/CRP/região válidos o lead cai em revisão manual.
async function verificarCrpDoLead(
  lead: CadastroLeadRow,
  log: Logger,
): Promise<{
  crpVerificada: boolean;
  crpSituacao: string | null;
  crpNomeConfirmado: string | null;
  crpVerificadaEm: Date | null;
  crpVerificacaoPendente: boolean;
}> {
  const naoVerificado = {
    crpVerificada: false,
    crpSituacao: null,
    crpNomeConfirmado: null,
    crpVerificadaEm: null,
    crpVerificacaoPendente: true,
  };
  const cpf = lead.cpf.trim();
  const crp = lead.crp.trim();
  const regiao = lead.regiao.trim();
  const nome = lead.nome.trim();
  if (!cpf || !crp || !regiao || !nome) {
    // Sem dados de identificação suficientes: deixa para revisão manual.
    return naoVerificado;
  }
  try {
    const resultado = await verificarInscricaoOab({
      cpf,
      oab: crp,
      seccional: regiao,
      nome,
    });
    if (resultado.valido) {
      return {
        crpVerificada: true,
        crpSituacao: resultado.situacao,
        crpNomeConfirmado: resultado.nomeOab,
        crpVerificadaEm: new Date(),
        crpVerificacaoPendente: false,
      };
    }
    return naoVerificado;
  } catch (err) {
    log.error({ err }, "Falha ao reverificar CRP no primeiro acesso ao perfil");
    return naoVerificado;
  }
}

// Prefill do perfil no primeiro acesso, a partir do lead do funil casado pelo
// e-mail da conta (que é o e-mail do pagamento). Copia apenas dados não
// sensíveis; o selo do CRP é reverificado no servidor (ver acima).
async function buildPrefillFromLead(
  req: Request,
): Promise<Partial<typeof psicologosTable.$inferInsert>> {
  const email = await getAuthedEmail(req);
  if (!email) return {};
  const userId = getAuth(req).userId;
  if (!userId) return {};

  // Casa (e vincula atomicamente) a assinatura paga a este usuário. No modelo
  // "checkout primeiro" a assinatura nasce anônima (psicologoRef nulo); no
  // primeiro acesso ela é vinculada aqui pelo e-mail da conta (= e-mail do
  // pagamento). Vinculamos o prefill ao lead EXATO que gerou esse pagamento
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

  const crpFormatada =
    lead.crp.trim() && lead.regiao.trim()
      ? `CRP ${lead.regiao.trim().toUpperCase()}/${lead.crp.trim()}`
      : "";
  const verificacao = await verificarCrpDoLead(lead, req.log);

  return {
    nome: lead.nome,
    crp: crpFormatada,
    whatsapp: lead.telefone,
    areas: lead.areas ?? [],
    cidades: (lead.cidades ?? []) as Cidade[],
    atendeOnline: lead.atendeOnline,
    publicoAtendido: lead.publicoAtendido ?? [],
    ...verificacao,
  };
}

type SubStatus = "pendente" | "ativa" | "atrasada" | "inativa";

// Um perfil está "completo" quando tem o mínimo para aparecer no diretório:
// nome, CRP, descrição, ao menos uma área, ao menos uma cidade OU atendimento
// online, e um WhatsApp para contato.
function isComplete(row: PsicologoRow): boolean {
  const hasLocal =
    (row.cidades?.length ?? 0) > 0 || row.atendeOnline === true;
  return Boolean(
    row.nome.trim() &&
      row.crp.trim() &&
      row.about.trim() &&
      (row.areas?.length ?? 0) > 0 &&
      hasLocal &&
      row.whatsapp.trim(),
  );
}

function toProfile(
  row: PsicologoRow,
  subscriptionStatus: SubStatus | null,
) {
  const complete = isComplete(row);
  return {
    nome: row.nome,
    crp: row.crp,
    photo: row.photo,
    about: row.about,
    areas: row.areas ?? [],
    subcategorias: row.subcategorias ?? [],
    cidades: row.cidades ?? [],
    atendeOnline: row.atendeOnline,
    publicoAtendido: row.publicoAtendido ?? [],
    precoSessao: row.precoSessao,
    whatsapp: row.whatsapp,
    instagram: row.instagram,
    linkedin: row.linkedin,
    website: row.website,
    outro: row.outro,
    complete,
    subscriptionStatus,
    visivel: complete && subscriptionStatus === "ativa" && row.adminAtivo,
    crpVerificada: row.crpVerificada,
    crpSituacao: row.crpSituacao ?? null,
    crpNomeConfirmado: row.crpNomeConfirmado ?? null,
    crpVerificadaEm: row.crpVerificadaEm
      ? row.crpVerificadaEm.toISOString()
      : null,
    crpVerificacaoPendente: row.crpVerificacaoPendente,
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
    eq(psicologosTable.adminAtivo, true),
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
    .where(eq(subscriptionsTable.psicologoRef, userId));
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

// Diretório público: somente psicólogos pagantes (assinatura "ativa") com
// perfil completo.
router.get("/psicologos", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      psicologo: psicologosTable,
      status: subscriptionsTable.status,
    })
    .from(psicologosTable)
    .innerJoin(
      subscriptionsTable,
      eq(subscriptionsTable.psicologoRef, psicologosTable.userId),
    )
    .where(assinaturaVisivel());

  const visible = rows
    .filter(({ psicologo }) => isComplete(psicologo))
    .map(({ psicologo }) => ({
      id: psicologo.id,
      nome: psicologo.nome,
      crp: psicologo.crp,
      photo: psicologo.photo,
      about: psicologo.about,
      areas: psicologo.areas ?? [],
      subcategorias: psicologo.subcategorias ?? [],
      cidades: psicologo.cidades ?? [],
      atendeOnline: psicologo.atendeOnline,
      publicoAtendido: psicologo.publicoAtendido ?? [],
      precoSessao: psicologo.precoSessao,
      whatsapp: psicologo.whatsapp,
    }));

  res.json(ListPsicologosResponse.parse(visible));
});

// Normaliza texto para comparação (sem acentos, minúsculo, sem espaços extras).
function normalizar(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

// Contagem de concorrência: psicólogos pagantes (assinatura "ativa") com perfil
// completo, opcionalmente filtrados por área, cidade e UF. Usado no funil de
// cadastro para mostrar números reais de concorrência. Reaproveita a mesma
// regra de visibilidade do diretório público (join + isComplete).
router.get("/psicologos/contagem", async (req, res): Promise<void> => {
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
      psicologo: psicologosTable,
      status: subscriptionsTable.status,
    })
    .from(psicologosTable)
    .innerJoin(
      subscriptionsTable,
      eq(subscriptionsTable.psicologoRef, psicologosTable.userId),
    )
    .where(assinaturaVisivel());

  const visiveis = rows
    .map(({ psicologo }) => psicologo)
    .filter((psicologo) => isComplete(psicologo));

  const matchesArea = (p: PsicologoRow): boolean =>
    !areaN || (p.areas ?? []).some((a) => normalizar(a) === areaN);

  const matchesLocal = (p: PsicologoRow): boolean => {
    if (!cidadeN && !ufN) return true;
    if (p.atendeOnline) return true;
    return (p.cidades ?? []).some((c) => {
      const okCidade = !cidadeN || normalizar(c.nome) === cidadeN;
      const okUf = !ufN || normalizar(c.uf) === ufN;
      return okCidade && okUf;
    });
  };

  const naArea = visiveis.filter(matchesArea);
  const naCidade = visiveis.filter(matchesLocal);
  const naAreaECidade = visiveis.filter(
    (p) => matchesArea(p) && matchesLocal(p),
  );

  res.json(
    ContarPsicologosResponse.parse({
      total: visiveis.length,
      naArea: naArea.length,
      naCidade: naCidade.length,
      naAreaECidade: naAreaECidade.length,
    }),
  );
});

// Perfil do psicólogo autenticado. Cria um registro vazio na primeira leitura
// para simplificar o fluxo do painel.
router.get("/perfil", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  let [row] = await db
    .select()
    .from(psicologosTable)
    .where(eq(psicologosTable.userId, userId));

  if (!row) {
    // Primeiro acesso ao painel: cria o perfil já pré-preenchido com os dados
    // do funil de cadastro (casados pelo e-mail da conta, que é o e-mail do
    // pagamento). O selo do CRP é reverificado no servidor. Sem e-mail de
    // boas-vindas aqui: o e-mail "Conta criada" já foi enviado no pagamento.
    const prefill = await buildPrefillFromLead(req);
    [row] = await db
      .insert(psicologosTable)
      .values({ userId, ...prefill })
      .returning();
  }

  const status = await getSubscriptionStatus(userId);
  res.json(GetPerfilResponse.parse(toProfile(row, status)));
});

// Cria ou atualiza o perfil do psicólogo autenticado.
router.put("/perfil", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const parsed = UpdatePerfilBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;

  // Recusa subcategorias que não pertencem a nenhuma das macrocategorias
  // selecionadas (contrato explícito: rejeitar, não descartar silenciosamente).
  const subsRecebidas = data.subcategorias ?? [];
  const subsInvalidas = subsRecebidas.filter(
    (sub) => !isSubValidaEmAreas(sub, data.areas),
  );
  if (subsInvalidas.length > 0) {
    res.status(400).json({
      error: `Temas inválidos para as áreas selecionadas: ${subsInvalidas.join(", ")}`,
    });
    return;
  }

  // Status de verificação do CRP é server-managed: só marcamos crpVerificada a
  // partir de um token assinado por /verificar-oab (impede o cliente forjar o
  // status). "Pendente" é o estado de menor privilégio e pode vir do cliente.
  // Edições comuns no painel (sem token nem flag) preservam o valor persistido.
  let crpPatch: {
    crpVerificada?: boolean;
    crpSituacao?: string | null;
    crpNomeConfirmado?: string | null;
    crpVerificadaEm?: Date;
    crpVerificacaoPendente?: boolean;
  } = {};
  const tokenPayload = data.oabToken ? verificarOabToken(data.oabToken) : null;
  // O perfil grava o CRP no formato "CRP UF/123456"; extraímos a região para
  // exigir que o token bata também na região (não só no número da inscrição).
  const regiaoMatch = data.crp.match(/CRP\s*([A-Za-z]{2})/i);
  const regiaoPerfil = regiaoMatch?.[1];
  if (
    tokenPayload &&
    tokenCombinaComOab(tokenPayload, data.crp, regiaoPerfil)
  ) {
    crpPatch = {
      crpVerificada: true,
      crpSituacao: tokenPayload.situacao,
      crpNomeConfirmado: tokenPayload.nomeOab,
      crpVerificadaEm: new Date(),
      crpVerificacaoPendente: false,
    };
  } else if (data.crpVerificacaoPendente !== undefined) {
    crpPatch = { crpVerificacaoPendente: data.crpVerificacaoPendente };
  }

  const values = {
    userId,
    nome: data.nome,
    crp: data.crp,
    photo: data.photo ?? null,
    about: data.about,
    areas: data.areas,
    subcategorias: Array.from(new Set(subsRecebidas)),
    cidades: data.cidades as Cidade[],
    atendeOnline: data.atendeOnline,
    publicoAtendido: data.publicoAtendido ?? [],
    precoSessao: data.precoSessao ?? "",
    whatsapp: data.whatsapp,
    instagram: data.instagram,
    linkedin: data.linkedin,
    website: data.website,
    outro: data.outro,
    updatedAt: new Date(),
    ...crpPatch,
  };

  const [row] = await db
    .insert(psicologosTable)
    .values(values)
    .onConflictDoUpdate({
      target: psicologosTable.userId,
      set: values,
    })
    .returning();

  const status = await getSubscriptionStatus(userId);
  res.json(UpdatePerfilResponse.parse(toProfile(row, status)));
});

export default router;
