import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Check, TrendingUp, UserCircle, BarChart3, Handshake, Image as ImageIcon, Crosshair, MessageSquare, Phone, ArrowRight } from "lucide-react";

import advogadoHero from "@/assets/advogado-hero.png";
import advogadaPerfil from "@/assets/advogada-perfil.png";

export default function Cadastro() {
  const scrollToPlans = () => {
    const plansSection = document.getElementById("planos");
    if (plansSection) {
      plansSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  const beneficios = [
    {
      icon: TrendingUp,
      title: "Visibilidade para quem já quer contratar",
      desc: "O usuário que chega à Minha Causa Justa já identificou que tem um problema jurídico. Ele não está navegando por acaso, está procurando um profissional. Você aparece no momento certo."
    },
    {
      icon: UserCircle,
      title: "Perfil completo, do seu jeito",
      desc: "Foto, especialidades, áreas de atuação, estados atendidos, descrição do seu trabalho e forma de contato. Tudo o que o cliente precisa saber antes de falar com você."
    },
    {
      icon: BarChart3,
      title: "Números reais no seu painel",
      desc: "Veja quantas pessoas visualizaram seu perfil, em quais áreas e em qual período. Sem achismo, você acompanha o retorno do seu investimento."
    },
    {
      icon: Handshake,
      title: "Sem intermediário, sem comissão",
      desc: "O contato é direto entre você e o cliente. A Minha Causa Justa não fica no meio da negociação, não cobra por contato e não leva percentual de honorários."
    }
  ];

  const paraQuem = [
    "Você atua em causas populares: INSS e previdência, trabalho e emprego, família, plano de saúde, consumidor ou herança e inventário",
    "Está construindo sua carteira de clientes e precisa de visibilidade",
    "Atende pessoas físicas, não grandes empresas",
    "Quer aparecer para clientes na sua cidade ou estado",
    "Está inscrito na OAB e atua de forma regular"
  ];

  const faqs = [
    {
      q: "Como funciona o cadastro?",
      a: "Você preenche seu perfil com foto, especialidades, área de atuação, estados onde atende e suas informações de contato. Depois de confirmado o pagamento, seu perfil entra no ar imediatamente."
    },
    {
      q: "Quantos clientes vou receber?",
      a: "Não trabalhamos com promessa de número de contatos. Nenhuma plataforma honesta faz isso. O que garantimos é que seu perfil ficará visível para todos os usuários que buscarem advogados na sua área e estado. O volume depende do tráfego da plataforma, que cresce a cada mês."
    },
    {
      q: "Preciso fechar contrato com a plataforma?",
      a: "Não. A assinatura é mensal e sem fidelidade. Você cancela quando quiser, sem burocracia e sem multa."
    },
    {
      q: "O contato com o cliente passa pela plataforma?",
      a: "Não. O usuário vê suas informações de contato diretamente no perfil e fala com você pelo canal que preferir: WhatsApp, telefone ou e-mail. A plataforma não intermedia nem acompanha essa conversa."
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
  ];

  const dicas = [
    {
      icon: ImageIcon,
      title: "Foto profissional",
      desc: "Não precisa ser de estúdio, mas precisa ser nítida, com boa iluminação e fundo neutro. Perfil com foto recebe muito mais atenção do que perfil sem foto."
    },
    {
      icon: Crosshair,
      title: "Seja específico nas áreas de atuação",
      desc: "\"Advogado trabalhista especializado em demissão sem justa causa e rescisão indireta\" comunica muito mais do que \"direito do trabalho\". Quanto mais específico, mais o cliente se identifica."
    },
    {
      icon: MessageSquare,
      title: "Escreva como você fala",
      desc: "O usuário da plataforma não é advogado. No campo \"sobre mim\", use linguagem simples. Explique o que você resolve, não o que você estudou."
    },
    {
      icon: Phone,
      title: "Informe como prefere ser contatado",
      desc: "WhatsApp converte mais do que e-mail para esse público. Se você atende pelo WhatsApp, deixe isso claro no perfil."
    }
  ];

  const faqLeft = faqs.slice(0, 4);
  const faqRight = faqs.slice(4);

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#F5F4F2]">
      <Navbar />

      <main className="flex-grow">
        {/* Section 1 — Hero */}
        <section className="bg-white py-12 md:py-24 overflow-hidden">
          <div className="container mx-auto px-6 max-w-[1200px]">
            <div className="flex flex-col lg:flex-row items-center lg:items-start gap-12 lg:gap-20">
              <div className="w-full lg:w-1/2">
                <h1 className="text-4xl md:text-5xl lg:text-[52px] font-bold text-primary-900 leading-[1.1] mb-6 tracking-tight">
                  Pessoas com problemas jurídicos estão procurando um advogado agora.{" "}
                  <span className="text-primary-500">Seu perfil está aqui?</span>
                </h1>

                <div className="space-y-5 text-lg text-neutral-600 leading-relaxed mb-10">
                  <p>
                    Todo dia, brasileiros pesquisam na internet o que fazer quando o INSS nega um benefício, quando o plano de saúde recusa uma cirurgia, quando a pensão não chega. Eles estão com um problema real, já decidiram que precisam de ajuda e estão procurando alguém de confiança para falar.
                  </p>
                  <p className="font-semibold text-primary-800 text-xl pt-2">
                    A Minha Causa Justa é o lugar onde eles chegam. E onde você pode estar.
                  </p>
                </div>

                <Button
                  onClick={scrollToPlans}
                  className="bg-accent-500 hover:bg-accent-600 text-white h-14 px-8 text-base font-medium rounded-full shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
                  data-testid="button-hero-cadastro"
                >
                  Quero cadastrar meu perfil
                </Button>
              </div>

              <div className="w-full lg:w-1/2 relative">
                <div className="absolute inset-0 bg-primary-100 rounded-[100px] rounded-tl-[30px] rounded-br-[30px] transform rotate-3 scale-105 -z-10"></div>
                <div className="absolute inset-0 bg-[#E86100]/10 rounded-[100px] rounded-tr-[30px] rounded-bl-[30px] transform -rotate-3 scale-105 -z-20"></div>
                <div className="relative h-[600px] w-full rounded-[100px] rounded-tl-[40px] rounded-br-[40px] overflow-hidden shadow-xl border-8 border-white">
                  <img
                    src={advogadoHero}
                    alt="Advogada confiante em seu escritório"
                    className="w-full h-full object-cover object-top"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary-900/40 to-transparent"></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2 — Planos */}
        <section id="planos" className="bg-[#EEF5FC] py-20 md:py-28">
          <div className="container mx-auto px-6 max-w-[1200px]">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-primary-900 tracking-tight">Conheça os planos</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Plano Mensal */}
              <div className="bg-white rounded-[32px] p-8 md:p-10 flex flex-col shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100" data-testid="card-plano-mensal">
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-primary-700 mb-3">Plano Mensal</h3>
                  <div className="text-4xl md:text-5xl font-bold text-primary-900 mb-3">
                    R$ 49,90<span className="text-lg text-neutral-500 font-normal">/mês</span>
                  </div>
                  <p className="text-neutral-600">Cobrança mensal recorrente no cartão. Cancele quando quiser.</p>
                </div>

                <ul className="space-y-4 mb-10 flex-grow">
                  {[
                    "Perfil completo na plataforma",
                    "Visível para todos os usuários da sua área e estado",
                    "Painel com visualizações do seu perfil",
                    "Atualização de dados a qualquer momento"
                  ].map((benefit, idx) => (
                    <li key={idx} className="flex gap-3 text-neutral-700">
                      <span className="bg-primary-50 text-primary-600 rounded-full h-6 w-6 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="h-4 w-4" strokeWidth={2.5} />
                      </span>
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={scrollToPlans}
                  variant="outline"
                  className="w-full h-14 text-base font-medium rounded-full border-primary-200 text-primary-700 hover:bg-primary-50 hover:border-primary-300 transition-all"
                  data-testid="button-assinar-mensal"
                >
                  Cadastrar agora
                </Button>
              </div>

              {/* Plano Anual */}
              <div className="bg-white rounded-[32px] p-8 md:p-10 flex flex-col relative shadow-[0_20px_50px_rgb(0,0,0,0.08)] border-2 border-accent-500" data-testid="card-plano-anual">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-accent-100 text-accent-700 font-bold px-5 py-1.5 rounded-full text-sm shadow-sm">
                  Mais vantajoso
                </div>
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-accent-600 mb-3">Plano Anual</h3>
                  <div className="text-4xl md:text-5xl font-bold text-primary-900 mb-3">
                    R$ 39,90<span className="text-lg text-neutral-500 font-normal">/mês</span>
                  </div>
                  <p className="text-neutral-600">Cobrado anualmente. Equivale a 2 meses grátis em relação ao plano mensal.</p>
                </div>

                <ul className="space-y-4 mb-10 flex-grow">
                  {[
                    "Tudo do plano mensal",
                    "Destaque maior nos resultados de busca",
                    "Selo de perfil verificado"
                  ].map((benefit, idx) => (
                    <li key={idx} className="flex gap-3 text-neutral-700">
                      <span className="bg-accent-100 text-accent-600 rounded-full h-6 w-6 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="h-4 w-4" strokeWidth={2.5} />
                      </span>
                      <span className={idx === 0 ? "font-semibold text-primary-900" : ""}>{benefit}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={scrollToPlans}
                  className="w-full h-14 text-base font-medium rounded-full bg-accent-500 hover:bg-accent-600 text-white shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
                  data-testid="button-assinar-anual"
                >
                  Cadastrar agora
                </Button>
              </div>
            </div>

            <p className="text-center text-sm text-neutral-500 mt-10 max-w-2xl mx-auto">
              *Pagamento via cartão de crédito. Cancelamento disponível a qualquer momento. Consulte os termos de uso para mais detalhes.
            </p>
          </div>
        </section>

        {/* Section 3 — O que muda */}
        <section className="bg-white py-20 md:py-28">
          <div className="container mx-auto px-6 max-w-[1200px]">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-primary-900 tracking-tight">
                O que muda quando seu perfil está na plataforma
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {beneficios.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={idx}
                    className="bg-[#F5F4F2] p-8 rounded-[32px] flex gap-5 hover:bg-primary-50 transition-colors duration-300"
                    data-testid={`card-beneficio-${idx}`}
                  >
                    <div className="w-14 h-14 rounded-2xl bg-white text-primary-600 flex items-center justify-center shrink-0 shadow-sm">
                      <Icon strokeWidth={1.5} className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-primary-900 mb-2 leading-tight">{item.title}</h3>
                      <p className="text-neutral-600 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Section 4 — Para quem é */}
        <section className="bg-[#F5F4F2] py-20 md:py-28 overflow-hidden">
          <div className="container mx-auto px-6 max-w-[1200px]">
            <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
              <div className="w-full lg:w-1/2 order-2 lg:order-1 relative lg:-mt-12">
                <div className="relative h-[520px] w-full rounded-t-[260px] rounded-b-[40px] overflow-hidden shadow-2xl border-[12px] border-white z-10">
                  <img
                    src={advogadaPerfil}
                    alt="Advogada trabalhando em seu escritório"
                    className="w-full h-full object-cover object-center"
                  />
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[110%] bg-accent-100 rounded-full blur-[80px] -z-10 opacity-60"></div>
              </div>

              <div className="w-full lg:w-1/2 order-1 lg:order-2">
                <h2 className="text-3xl md:text-4xl font-bold text-primary-900 mb-8 tracking-tight">
                  Esse perfil foi pensado para você se...
                </h2>

                <ul className="space-y-5 mb-8">
                  {paraQuem.map((item, idx) => (
                    <li key={idx} className="flex gap-4 text-neutral-700 text-lg">
                      <span className="bg-primary-100 text-primary-700 rounded-full h-7 w-7 flex items-center justify-center shrink-0 mt-1">
                        <Check className="h-4 w-4" strokeWidth={2.5} />
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <p className="text-neutral-600 leading-relaxed pt-6 border-t border-neutral-200">
                  Não importa se você formou em faculdade pública ou particular, se tem cinco anos de carreira ou quinze, se trabalha sozinho ou em parceria com um colega. O que importa é que você atende gente real, com problemas reais e quer que essas pessoas te encontrem.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5 — FAQ */}
        <section className="bg-[#EEF5FC] py-20 md:py-28">
          <div className="container mx-auto px-6 max-w-[1100px]">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-primary-900 tracking-tight">
                Dúvidas <span className="text-primary-500">frequentes</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start" data-testid="faq-accordion">
              {[faqLeft, faqRight].map((column, colIdx) => (
                <Accordion key={colIdx} type="single" collapsible className="flex flex-col gap-4">
                  {column.map((item, idx) => (
                    <AccordionItem
                      key={idx}
                      value={`col-${colIdx}-item-${idx}`}
                      className="bg-white rounded-[24px] border border-neutral-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] px-6 overflow-hidden"
                    >
                      <AccordionTrigger className="text-left font-bold text-primary-900 hover:text-primary-700 hover:no-underline py-5">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-neutral-600 leading-relaxed pb-5">
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ))}
            </div>
          </div>
        </section>

        {/* Section 6 — Dicas */}
        <section className="bg-white py-20 md:py-28">
          <div className="container mx-auto px-6 max-w-[1200px]">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-primary-900 tracking-tight">Um bom perfil faz diferença</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {dicas.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={idx}
                    className="bg-white p-8 rounded-[32px] border border-neutral-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 flex flex-col h-full"
                    data-testid={`card-dica-${idx}`}
                  >
                    <div className="w-16 h-16 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center mb-6">
                      <Icon strokeWidth={1.5} className="w-8 h-8" />
                    </div>
                    <h3 className="font-bold text-lg text-primary-900 mb-3 leading-tight">{item.title}</h3>
                    <p className="text-neutral-600 text-sm leading-relaxed flex-grow">{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Section 7 — CTA final */}
        <section className="py-12 md:py-24 px-6 bg-[#F5F4F2]">
          <div className="container mx-auto max-w-[1200px]">
            <div className="bg-primary-800 text-white rounded-[40px] md:rounded-[60px] py-20 px-8 md:px-20 text-center relative overflow-hidden shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-r from-primary-900 to-primary-700 opacity-50"></div>
              <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 w-[600px] h-[600px] bg-primary-600/30 rounded-full blur-[80px]"></div>
              <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/3 w-[600px] h-[600px] bg-accent-500/20 rounded-full blur-[80px]"></div>

              <div className="relative z-10 max-w-[800px] mx-auto flex flex-col items-center">
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
                  Sua próxima cliente pode estar procurando um advogado agora mesmo.
                </h2>
                <p className="text-xl md:text-2xl text-primary-100 mb-12 font-light">
                  O cadastro leva menos de 10 minutos. Seu perfil entra no ar imediatamente.
                </p>
                <Button
                  onClick={scrollToPlans}
                  size="lg"
                  className="bg-accent-500 hover:bg-accent-600 text-white h-16 px-10 text-lg rounded-full shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
                  data-testid="button-cta-final-cadastro"
                >
                  Cadastrar meu perfil agora <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
