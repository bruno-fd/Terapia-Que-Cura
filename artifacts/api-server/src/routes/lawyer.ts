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
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

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
