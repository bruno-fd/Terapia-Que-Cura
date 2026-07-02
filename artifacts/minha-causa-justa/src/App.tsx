import { useEffect, useRef } from "react";
import {
  Switch,
  Route,
  Redirect,
  Router as WouterRouter,
  useLocation,
} from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  ClerkProvider,
  SignIn,
  SignUp,
  Show,
  useClerk,
} from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Advogados from "@/pages/advogados";
import Cadastro from "@/pages/cadastro";
import CadastroFluxo from "@/pages/cadastro-fluxo";
import TermosDeUso from "@/pages/termos-de-uso";
import PoliticaDePrivacidade from "@/pages/politica-de-privacidade";
import QuemSomos from "@/pages/quem-somos";
import Blog from "@/pages/blog";
import Post from "@/pages/post";
import PainelPerfil from "@/pages/painel-perfil";
import PainelMetricas from "@/pages/painel-metricas";
import PainelAssinatura from "@/pages/painel-assinatura";
import Admin from "@/pages/admin";
import logoUrl from "@assets/minhacausajusta_1782681470221.webp";

const queryClient = new QueryClient();

// Resolve a key a partir do hostname para que o mesmo build atenda múltiplos
// domínios. Não substituir por env var crua nem por undefined.
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

// Vazio em dev (Clerk acessa a FAPI direto), populado em prod. Não condicionar
// a PROD/NODE_ENV.
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("VITE_CLERK_PUBLISHABLE_KEY ausente.");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${logoUrl}`,
  },
  variables: {
    colorPrimary: "#2260AA",
    colorForeground: "#1A1A1A",
    colorMutedForeground: "#555555",
    colorDanger: "#C0392B",
    colorBackground: "#FFFFFF",
    colorInput: "#FFFFFF",
    colorInputForeground: "#1A1A1A",
    colorNeutral: "#C4C4C4",
    fontFamily: "'Inter', sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox:
      "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden border border-neutral-200 shadow-[0_8px_30px_rgb(0,0,0,0.06)]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-primary-800 font-bold",
    headerSubtitle: "text-neutral-500",
    socialButtonsBlockButtonText: "text-neutral-700",
    formFieldLabel: "text-neutral-700 font-medium",
    footerActionLink: "text-primary-600 hover:text-primary-700 font-medium",
    footerActionText: "text-neutral-500",
    dividerText: "text-neutral-500",
    identityPreviewEditButton: "text-primary-600",
    formFieldSuccessText: "text-[#1E7D4F]",
    alertText: "text-neutral-700",
    logoBox: "justify-center",
    logoImage: "h-10 w-auto",
    // Login/cadastro por e-mail e senha apenas: ocultamos os provedores sociais
    // (Google/SSO) e o divisor "ou".
    socialButtons: "hidden",
    socialButtonsBlockButton:
      "border border-neutral-300 hover:bg-neutral-100",
    dividerRow: "hidden",
    formButtonPrimary: "bg-primary-600 hover:bg-primary-700 text-white",
    formFieldInput:
      "border border-neutral-300 focus:ring-2 focus:ring-primary-500",
    footerAction: "justify-center",
    dividerLine: "bg-neutral-200",
    otpCodeFieldInput: "border border-neutral-300",
  },
};

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  return null;
}

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-neutral-100 px-4 py-12">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/cadastro`}
        fallbackRedirectUrl={`${basePath}/painel/perfil`}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-neutral-100 px-4 py-12">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
        fallbackRedirectUrl={`${basePath}/painel/perfil`}
        forceRedirectUrl={`${basePath}/painel/perfil`}
      />
    </div>
  );
}

// Protege rotas do painel: usuários deslogados vão para o login.
function Protected({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Show when="signed-in">{children}</Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

// Invalida o cache do React Query quando o usuário autenticado muda.
function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Acesse sua conta",
            subtitle: "Área exclusiva para advogados cadastrados.",
          },
        },
        signUp: {
          start: {
            title: "Crie sua conta",
            subtitle: "Cadastre-se para publicar seu perfil.",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <ScrollToTop />
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/advogados" component={Advogados} />
            <Route path="/cadastro" component={Cadastro} />
            <Route path="/cadastro/fluxo" component={CadastroFluxo} />
            <Route path="/termos-de-uso" component={TermosDeUso} />
            <Route path="/politica-de-privacidade" component={PoliticaDePrivacidade} />
            <Route path="/quem-somos" component={QuemSomos} />
            <Route path="/blog/:slug" component={Post} />
            <Route path="/blog" component={Blog} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route path="/login">
              <Redirect to="/sign-in" />
            </Route>
            <Route path="/painel/perfil">
              <Protected>
                <PainelPerfil />
              </Protected>
            </Route>
            <Route path="/painel/metricas">
              <Protected>
                <PainelMetricas />
              </Protected>
            </Route>
            <Route path="/painel/assinatura">
              <Protected>
                <PainelAssinatura />
              </Protected>
            </Route>
            <Route path="/admin" component={Admin} />
            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
