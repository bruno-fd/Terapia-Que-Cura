import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  advogadosTable,
  subscriptionsTable,
  type AdvogadoRow,
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
import { sendEmail } from "../lib/email";
import { welcomeEmail } from "../lib/email-templates";

const router: IRouter = Router();

// Busca o e-mail do advogado no Clerk e envia as boas-vindas. Best-effort:
// qualquer falha (Clerk indisponível, sem e-mail, Resend) apenas registra log.
async function sendWelcomeEmail(req: Request): Promise<void> {
  try {
    const clerkUserId = getAuth(req).userId;
    if (!clerkUserId) return;
    const user = await clerkClient.users.getUser(clerkUserId);
    const to =
      user.primaryEmailAddress?.emailAddress ??
      user.emailAddresses[0]?.emailAddress;
    if (!to) return;
    const tpl = welcomeEmail(user.firstName);
    await sendEmail({ to, subject: tpl.subject, html: tpl.html });
  } catch (err) {
    req.log.error({ err }, "Falha ao enviar e-mail de boas-vindas");
  }
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
    visivel: complete && subscriptionStatus === "ativa",
  };
}

async function getSubscriptionStatus(
  userId: string,
): Promise<SubStatus | null> {
  const [sub] = await db
    .select({ status: subscriptionsTable.status })
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.lawyerRef, userId));
  return (sub?.status as SubStatus | undefined) ?? null;
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
    .where(eq(subscriptionsTable.status, "ativa"));

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
    .where(eq(subscriptionsTable.status, "ativa"));

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
    [row] = await db
      .insert(advogadosTable)
      .values({ userId })
      .returning();
    // Primeiro acesso ao painel: envia boas-vindas com as instruções de
    // cadastro (best-effort, nunca quebra a resposta).
    await sendWelcomeEmail(req);
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
