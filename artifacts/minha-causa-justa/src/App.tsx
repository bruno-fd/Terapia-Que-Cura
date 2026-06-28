import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Advogados from "@/pages/advogados";
import Cadastro from "@/pages/cadastro";
import TermosDeUso from "@/pages/termos-de-uso";
import PoliticaDePrivacidade from "@/pages/politica-de-privacidade";
import QuemSomos from "@/pages/quem-somos";
import Blog from "@/pages/blog";
import Post from "@/pages/post";
import Login from "@/pages/login";
import PainelPerfil from "@/pages/painel-perfil";
import PainelMetricas from "@/pages/painel-metricas";
import PainelAssinatura from "@/pages/painel-assinatura";

const queryClient = new QueryClient();

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/advogados" component={Advogados} />
      <Route path="/cadastro" component={Cadastro} />
      <Route path="/termos-de-uso" component={TermosDeUso} />
      <Route path="/politica-de-privacidade" component={PoliticaDePrivacidade} />
      <Route path="/quem-somos" component={QuemSomos} />
      <Route path="/blog/:slug" component={Post} />
      <Route path="/blog" component={Blog} />
      <Route path="/login" component={Login} />
      <Route path="/painel/perfil" component={PainelPerfil} />
      <Route path="/painel/metricas" component={PainelMetricas} />
      <Route path="/painel/assinatura" component={PainelAssinatura} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <ScrollToTop />
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
