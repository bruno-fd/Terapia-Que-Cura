import { Router, type IRouter, type Request } from "express";
import { VerificarOabBody, VerificarOabResponse } from "@workspace/api-zod";
import { verificarInscricaoOab } from "../lib/oab";
import { assinarOabToken } from "../lib/oabToken";

const router: IRouter = Router();

// Aceita apenas chamadas vindas do próprio site. Em produção os domínios
// públicos estão em REPLIT_DOMAINS; sem allowlist configurada (dev), libera.
function origemPermitida(req: Request): boolean {
  const permitidos = (process.env["REPLIT_DOMAINS"] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!permitidos.length) return true;
  const origem = req.get("origin") || req.get("referer") || "";
  if (!origem) return false;
  try {
    const host = new URL(origem).host;
    return permitidos.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

// Verificação real da inscrição na OAB. Pública (pré-autenticação), chamada ao
// fim da etapa 1 do funil. Qualquer falha de serviço vira motivo=erro_servico,
// que o front trata como verificação pendente (não bloqueia o cadastro).
router.post("/verificar-oab", async (req, res): Promise<void> => {
  if (!origemPermitida(req)) {
    res.status(403).json({ error: "Origem não autorizada" });
    return;
  }
  const parsed = VerificarOabBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { cpf, oab, seccional, nome } = parsed.data;
  try {
    const resultado = await verificarInscricaoOab({ cpf, oab, seccional, nome });
    // Emite o token assinado apenas quando a verificação foi bem-sucedida.
    const token = resultado.valido
      ? assinarOabToken({
          cpf,
          oab,
          seccional,
          situacao: resultado.situacao,
          nomeOab: resultado.nomeOab,
        })
      : null;
    res.json(VerificarOabResponse.parse({ ...resultado, token }));
  } catch (err) {
    req.log.warn(
      { err },
      "Falha na verificação OAB (fallback: verificação pendente)",
    );
    res.json(
      VerificarOabResponse.parse({
        valido: false,
        motivo: "erro_servico",
        situacao: null,
        nomeOab: null,
        numeroOab: null,
        seccional: null,
      }),
    );
  }
});

export default router;
