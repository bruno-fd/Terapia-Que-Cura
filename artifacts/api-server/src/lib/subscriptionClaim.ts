import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db, subscriptionsTable, type SubscriptionRow } from "@workspace/db";

// Resolve (e vincula) a assinatura do advogado autenticado no modelo "checkout
// primeiro". A assinatura nasce anônima (lawyerRef nulo, chaveada por
// customerEmail = e-mail do pagamento). No primeiro acesso autenticado casamos
// pelo e-mail da conta (travado pelo convite, então igual ao do pagamento) e
// vinculamos o lawyerRef de forma ATÔMICA, para os acessos seguintes irem
// direto pelo id. Este helper é compartilhado pela rota de assinatura e pelo
// prefill do perfil, para que a mesma regra de vínculo valha nos dois lugares.
export async function claimSubscriptionForUser(
  userId: string,
  email: string | null,
): Promise<SubscriptionRow | undefined> {
  // Acessos seguintes: já existe linha vinculada a este usuário.
  const [owned] = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.lawyerRef, userId))
    .limit(1);
  if (owned) return owned;

  if (!email) return undefined;

  // Pode haver mais de uma linha anônima com o mesmo e-mail (várias tentativas
  // de checkout, leadIds diferentes). Escolha determinística: preferimos a que
  // já foi provisionada (pagamento confirmado) e, em empate, a mais recente.
  const [candidate] = await db
    .select()
    .from(subscriptionsTable)
    .where(
      and(
        eq(subscriptionsTable.customerEmail, email),
        isNull(subscriptionsTable.lawyerRef),
      ),
    )
    .orderBy(
      sql`case when ${subscriptionsTable.accountProvisionedAt} is not null then 0 else 1 end`,
      desc(subscriptionsTable.updatedAt),
    )
    .limit(1);
  if (!candidate) return undefined;

  const [claimed] = await db
    .update(subscriptionsTable)
    .set({ lawyerRef: userId, updatedAt: new Date() })
    .where(
      and(
        eq(subscriptionsTable.id, candidate.id),
        isNull(subscriptionsTable.lawyerRef),
      ),
    )
    .returning();
  return claimed ?? candidate;
}
