import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { authMiddleware } from "./middlewares/authMiddleware";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// O proxy do Clerk transmite bytes crus, então precisa vir antes dos parsers.
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(cors({ credentials: true, origin: true }));
// cookie-parser precisa vir antes do authMiddleware (Replit Auth), que lê o
// cookie de sessão "sid" e os cookies temporários do fluxo OIDC.
app.use(cookieParser());
// A foto de perfil é enviada como data URL (base64) dentro do JSON. Uma imagem
// de até 5MB (limite do frontend) vira ~6,7MB em base64, então elevamos o limite
// do parser (padrão 100kb) para 8mb, evitando o erro 413 (Payload Too Large).
app.use(express.json({ limit: "8mb" }));
app.use(express.urlencoded({ extended: true, limit: "8mb" }));

// Resolve a publishable key a partir do host da requisição, permitindo que o
// mesmo servidor atenda múltiplos domínios Clerk. Em dev, cai no
// CLERK_PUBLISHABLE_KEY.
app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env["CLERK_PUBLISHABLE_KEY"],
    ),
  })),
);

// Replit Auth: carrega o usuário da sessão (cookie "sid") em toda requisição e
// habilita req.isAuthenticated()/req.user. Independente do Clerk (psicólogos);
// é usado apenas pelo painel administrativo (requireAdmin).
app.use(authMiddleware);

app.use("/api", router);

export default app;
