import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Check, TrendingUp, UserCircle, BarChart3, Handshake, Image as ImageIcon, Crosshair, MessageSquare, Phone } from "lucide-react";

export default function Cadastro() {
  const scrollToPlans = () => {
    const plansSection = document.getElementById("planos");
    if (plansSection) {
      plansSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#F5F4F2]">
      <Navbar />

      <main className="flex-grow">
        {/* Hero */}
        <section className="bg-[#1A3F73] text-white py-16 md:py-24">
          <div className="container mx-auto px-6 max-w-[1200px]">
            <div className="max-w-3xl">
              <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-6">
                Pessoas com problemas jurídicos estão procurando um advogado agora. Seu perfil está aqui?
              </h1>
              <p className="text-lg md:text-xl text-primary-50 leading-relaxed mb-10">
                Todo dia, brasileiros pesquisam na internet o que fazer quando o INSS nega um benefício, quando o plano de saúde recusa uma cirurgia, quando a pensão não chega. Eles estão com um problema real, já decidiram que precisam de ajuda — e estão procurando alguém de confiança para falar. A Minha Causa Justa é o lugar onde eles chegam. E onde você pode estar.
              </p>
              <Button 
                onClick={scrollToPlans} 
                className="bg-[#E86100] hover:bg-[#C45200] text-white h-14 px-8 text-lg font-medium"
                data-testid="button-hero-cadastro"
              >
                Quero cadastrar meu perfil
              </Button>
            </div>
          </div>
        </section>

        {/* Plans section */}
        <section id="planos" className="bg-[#F5F4F2] py-16 md:py-24">
          <div className="container mx-auto px-6 max-w-[1200px]">
            <h2 className="text-3xl font-bold text-primary-900 mb-12 text-center">Conheça os planos</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Card 1 */}
              <div className="bg-white border border-neutral-300 rounded-xl p-8 flex flex-col" data-testid="card-plano-mensal">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-neutral-900 mb-2">Plano Mensal</h3>
                  <div className="text-4xl font-bold text-primary-800 mb-2">R$ 49,90<span className="text-lg text-neutral-500 font-normal">/mês</span></div>
                  <p className="text-neutral-600 text-sm">Cobrança mensal recorrente no cartão. Cancele quando quiser.</p>
                </div>
                
                <ul className="space-y-4 mb-8 flex-grow">
                  {[
                    "Perfil completo na plataforma",
                    "Visível para todos os usuários da sua área e estado",
                    "Painel com visualizações do seu perfil",
                    "Atualização de dados a qualquer momento"
                  ].map((benefit, idx) => (
                    <li key={idx} className="flex gap-3 text-neutral-700">
                      <Check className="h-5 w-5 text-[#1E7D4F] shrink-0 mt-0.5" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
                
                <Button variant="outline" className="w-full h-12 text-base font-medium border-primary-500 text-primary-600 hover:bg-primary-50" data-testid="button-assinar-mensal">
                  Cadastrar agora
                </Button>
              </div>

              {/* Card 2 */}
              <div className="bg-white border-2 border-[#E86100] rounded-xl p-8 flex flex-col relative shadow-md" data-testid="card-plano-anual">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#FDE8D5] text-[#C45200] font-bold px-4 py-1 rounded-full text-sm">
                  Mais vantajoso
                </div>
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-neutral-900 mb-2">Plano Anual</h3>
                  <div className="text-4xl font-bold text-primary-800 mb-2">R$ 39,90<span className="text-lg text-neutral-500 font-normal">/mês</span></div>
                  <p className="text-neutral-600 text-sm">Cobrado anualmente. Equivale a 2 meses grátis.</p>
                </div>
                
                <ul className="space-y-4 mb-8 flex-grow">
                  {[
                    "Tudo do plano mensal",
                    "Destaque maior nos resultados de busca",
                    "Selo de perfil verificado"
                  ].map((benefit, idx) => (
                    <li key={idx} className="flex gap-3 text-neutral-700">
                      <Check className="h-5 w-5 text-[#1E7D4F] shrink-0 mt-0.5" />
                      <span className={idx === 0 ? "font-medium" : ""}>{benefit}</span>
                    </li>
                  ))}
                </ul>
                
                <Button className="w-full h-12 text-base font-medium bg-[#E86100] hover:bg-[#C45200] text-white" data-testid="button-assinar-anual">
                  Cadastrar agora
                </Button>
              </div>
            </div>
            
            <p className="text-center text-sm text-neutral-500 mt-8 max-w-2xl mx-auto">
              *Pagamento via cartão de crédito. Cancelamento disponível a qualquer momento. Consulte os termos de uso para mais detalhes.
            </p>
          </div>
        </section>

        {/* What you get */}
        <section className="bg-[#EEF5FC] py-16 md:py-24">
          <div className="container mx-auto px-6 max-w-[1200px]">
            <h2 className="text-3xl font-bold text-primary-900 mb-12 text-center max-w-2xl mx-auto">
              O que muda quando seu perfil está na plataforma
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
              <div className="flex gap-4">
                <div className="mt-1 bg-primary-100 p-2 rounded-lg text-primary-700 h-10 w-10 flex items-center justify-center shrink-0">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-primary-900 mb-2">Visibilidade para quem já quer contratar</h3>
                  <p className="text-neutral-700 leading-relaxed">O usuário que chega à Minha Causa Justa já identificou que tem um problema jurídico. Ele não está navegando por acaso — está procurando um profissional. Você aparece no momento certo.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="mt-1 bg-primary-100 p-2 rounded-lg text-primary-700 h-10 w-10 flex items-center justify-center shrink-0">
                  <UserCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-primary-900 mb-2">Perfil completo, do seu jeito</h3>
                  <p className="text-neutral-700 leading-relaxed">Foto, especialidades, áreas de atuação, estados atendidos, descrição do seu trabalho e forma de contato. Tudo o que o cliente precisa saber antes de falar com você.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="mt-1 bg-primary-100 p-2 rounded-lg text-primary-700 h-10 w-10 flex items-center justify-center shrink-0">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-primary-900 mb-2">Números reais no seu painel</h3>
                  <p className="text-neutral-700 leading-relaxed">Veja quantas pessoas visualizaram seu perfil, em quais áreas e em qual período. Sem achismo — você acompanha o retorno do seu investimento.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="mt-1 bg-primary-100 p-2 rounded-lg text-primary-700 h-10 w-10 flex items-center justify-center shrink-0">
                  <Handshake className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-primary-900 mb-2">Sem intermediário, sem comissão</h3>
                  <p className="text-neutral-700 leading-relaxed">O contato é direto entre você e o cliente. A Minha Causa Justa não fica no meio da negociação, não cobra por contato e não leva percentual de honorários.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* For who */}
        <section className="bg-[#F5F4F2] py-16 md:py-24">
          <div className="container mx-auto px-6 max-w-[800px]">
            <div className="bg-white rounded-2xl p-8 md:p-12 border border-neutral-200 shadow-sm">
              <h2 className="text-2xl md:text-3xl font-bold text-primary-900 mb-8">Esse perfil foi pensado para você se...</h2>
              
              <ul className="space-y-4 mb-8">
                {[
                  "Você atua em causas populares: INSS, trabalhista, família, previdência, consumidor ou inventários",
                  "Está construindo sua carteira de clientes e precisa de visibilidade",
                  "Atende pessoas físicas, não grandes empresas",
                  "Quer aparecer para clientes na sua cidade ou estado",
                  "Está inscrito na OAB e atua de forma regular"
                ].map((item, idx) => (
                  <li key={idx} className="flex gap-3 text-neutral-800 text-lg">
                    <Check className="h-6 w-6 text-[#1E7D4F] shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              
              <p className="text-neutral-600 leading-relaxed pt-6 border-t border-neutral-100">
                Não importa se você formou em faculdade pública ou particular, se tem cinco anos de carreira ou quinze, se trabalha sozinho ou em parceria com um colega. O que importa é que você atende gente real, com problemas reais — e quer que essas pessoas te encontrem.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-[#EEF5FC] py-16 md:py-24">
          <div className="container mx-auto px-6 max-w-[800px]">
            <h2 className="text-3xl font-bold text-primary-900 mb-10 text-center">Dúvidas frequentes</h2>
            
            <Accordion type="single" collapsible className="w-full bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden" data-testid="faq-accordion">
              {[
                {
                  q: "Como funciona o cadastro?",
                  a: "Você preenche seu perfil com foto, especialidades, área de atuação, estados onde atende e suas informações de contato. Depois de confirmado o pagamento, seu perfil entra no ar em até 24 horas."
                },
                {
                  q: "Quantos clientes vou receber?",
                  a: "Não trabalhamos com promessa de número de contatos — nenhuma plataforma honesta faz isso. O que garantimos é que seu perfil ficará visível para todos os usuários que buscarem advogados na sua área e estado. O volume depende do tráfego da plataforma, que cresce a cada mês."
                },
                {
                  q: "Preciso fechar contrato com a plataforma?",
                  a: "Não. A assinatura é mensal e sem fidelidade. Você cancela quando quiser, sem burocracia e sem multa."
                },
                {
                  q: "O contato com o cliente passa pela plataforma?",
                  a: "Não. O usuário vê suas informações de contato diretamente no perfil e fala com você pelo canal que preferir — WhatsApp, telefone ou e-mail. A plataforma não intermedia nem acompanha essa conversa."
                },
                {
                  q: "A plataforma cobra alguma comissão sobre os honorários?",
                  a: "Não. Você paga apenas a mensalidade do perfil. O que você negocia e recebe dos seus clientes é inteiramente seu."
                },
                {
                  q: "Posso atualizar meu perfil depois de publicado?",
                  a: "Sim, a qualquer momento. Você tem acesso ao painel para editar foto, descrição, especialidades e dados de contato sem custo adicional."
                },
                {
                  q: "Como cancelo minha assinatura?",
                  a: "Pelo próprio painel, em qualquer momento. O perfil fica no ar até o fim do período já pago e é desativado automaticamente após o cancelamento."
                }
              ].map((item, idx) => (
                <AccordionItem key={idx} value={`item-${idx}`} className="border-b border-neutral-100 last:border-0 px-6">
                  <AccordionTrigger className="text-left font-bold text-primary-900 hover:text-primary-700 hover:no-underline py-4">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-neutral-700 leading-relaxed pb-4">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Profile tips */}
        <section className="bg-[#F5F4F2] py-16 md:py-24">
          <div className="container mx-auto px-6 max-w-[1200px]">
            <h2 className="text-3xl font-bold text-primary-900 mb-12 text-center">Um bom perfil faz diferença</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
                <div className="w-12 h-12 bg-primary-50 rounded-lg flex items-center justify-center text-primary-600 mb-4">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg text-primary-900 mb-3">Foto profissional</h3>
                <p className="text-neutral-700 text-sm leading-relaxed">Não precisa ser de estúdio, mas precisa ser nítida, com boa iluminação e fundo neutro. Perfil com foto recebe muito mais atenção do que perfil sem foto.</p>
              </div>

              <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
                <div className="w-12 h-12 bg-primary-50 rounded-lg flex items-center justify-center text-primary-600 mb-4">
                  <Crosshair className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg text-primary-900 mb-3">Seja específico nas áreas de atuação</h3>
                <p className="text-neutral-700 text-sm leading-relaxed">"Advogado trabalhista especializado em demissão sem justa causa e rescisão indireta" comunica muito mais do que "direito do trabalho". Quanto mais específico, mais o cliente se identifica.</p>
              </div>

              <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
                <div className="w-12 h-12 bg-primary-50 rounded-lg flex items-center justify-center text-primary-600 mb-4">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg text-primary-900 mb-3">Escreva como você fala</h3>
                <p className="text-neutral-700 text-sm leading-relaxed">O usuário da plataforma não é advogado. No campo 'sobre mim', use linguagem simples. Explique o que você resolve, não o que você estudou.</p>
              </div>

              <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
                <div className="w-12 h-12 bg-primary-50 rounded-lg flex items-center justify-center text-primary-600 mb-4">
                  <Phone className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg text-primary-900 mb-3">Informe como prefere ser contactado</h3>
                <p className="text-neutral-700 text-sm leading-relaxed">WhatsApp converte mais do que e-mail para esse público. Se você atende pelo WhatsApp, deixe isso claro no perfil.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-[#1A3F73] text-white py-20 text-center">
          <div className="container mx-auto px-6 max-w-[800px]">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Sua próxima cliente pode estar procurando um advogado agora mesmo.</h2>
            <p className="text-xl text-primary-100 mb-10">O cadastro leva menos de 10 minutos. Seu perfil entra no ar em até 24 horas.</p>
            <Button 
              onClick={scrollToPlans}
              size="lg" 
              className="bg-[#E86100] hover:bg-[#C45200] text-white h-14 px-8 text-lg"
              data-testid="button-cta-final-cadastro"
            >
              Cadastrar meu perfil agora
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
