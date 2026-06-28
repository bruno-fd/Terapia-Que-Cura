import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowRight, 
  Shield, 
  Search, 
  MessageCircle, 
  HeartCrack,
  Activity,
  BriefcaseBusiness,
  Accessibility,
  TrendingUp,
  Baby,
  Flower2,
  FileText
} from "lucide-react";

import heroPessoa from "@/assets/hero-pessoa.png";
import celularPessoa from "@/assets/celular-pessoa.png";
import familiaPessoa from "@/assets/familia-pessoa.png";
import confiancaPessoa from "@/assets/confianca-pessoa.png";

export default function Home() {
  const [, setLocation] = useLocation();
  const [problema, setProblema] = useState<string>("");
  const [estado, setEstado] = useState<string>("");

  const handleSearch = () => {
    let url = "/advogados";
    if (problema || estado) {
      url += "?";
      const params = new URLSearchParams();
      if (problema) params.append("problema", problema);
      if (estado) params.append("estado", estado);
      url += params.toString();
    }
    setLocation(url);
  };

  const estados = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", 
    "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
  ];

  const problemas = [
    "INSS — benefício negado ou cortado",
    "Auxílio Doença",
    "Aposentadoria",
    "BPC/LOAS",
    "Plano de saúde — reajuste abusivo ou negativa de cobertura",
    "Pensão alimentícia",
    "Pensão por morte",
    "Inventário e herança",
    "Demissão e direitos trabalhistas",
    "Outro"
  ];

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#F5F4F2]">
      <Navbar />

      <main className="flex-grow">
        {/* Section 1 — Hero */}
        <section className="bg-white py-12 md:py-24 overflow-hidden">
          <div className="container mx-auto px-6 max-w-[1200px]">
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
              <div className="w-full lg:w-1/2">
                <h1 className="text-4xl md:text-5xl lg:text-[56px] font-bold text-primary-900 leading-[1.1] mb-6 tracking-tight">
                  Você tem direitos.<br />
                  <span className="text-primary-500">A gente te ajuda a encontrar quem pode garantir eles.</span>
                </h1>
                
                <div className="space-y-5 text-lg text-neutral-600 leading-relaxed mb-10">
                  <p>
                    Tem horas que a vida bate de frente com a gente. O INSS nega um benefício que você precisa, o plano de saúde recusa um tratamento, o patrão não paga o que deve, a pensão não chega. E aí vem aquela sensação de que o sistema foi feito pra te cansar — pra você desistir antes de lutar.
                  </p>
                  <p>
                    Mas a verdade é que você provavelmente tem direito a muito mais do que imagina. O que falta, na maioria das vezes, não é sorte. É saber por onde começar e ter ao seu lado alguém que entende do assunto.
                  </p>
                  <p>
                    A Minha Causa Justa existe pra isso: mostrar que existe um caminho, e conectar você com advogados que trabalham com situações como a sua todo dia.
                  </p>
                  <p className="font-semibold text-primary-800 text-xl pt-2">
                    Você não precisa entender de lei. Precisa dar o primeiro passo.
                  </p>
                </div>

                <div className="bg-primary-50 p-6 rounded-[32px] border border-primary-100 shadow-sm relative z-10">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <Select value={problema} onValueChange={setProblema}>
                        <SelectTrigger className="bg-white text-neutral-900 border-0 h-14 rounded-2xl shadow-sm px-5" data-testid="select-problema">
                          <SelectValue placeholder="Qual é o seu problema?" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {problemas.map(p => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-full md:w-48">
                      <Select value={estado} onValueChange={setEstado}>
                        <SelectTrigger className="bg-white text-neutral-900 border-0 h-14 rounded-2xl shadow-sm px-5" data-testid="select-estado">
                          <SelectValue placeholder="Seu estado" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {estados.map(uf => (
                            <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      onClick={handleSearch} 
                      className="bg-accent-500 hover:bg-accent-600 text-white h-14 px-8 text-base font-medium rounded-full shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
                      data-testid="button-buscar-advogado"
                    >
                      Encontrar advogado
                    </Button>
                  </div>
                </div>
              </div>

              <div className="w-full lg:w-1/2 relative">
                <div className="absolute inset-0 bg-primary-100 rounded-[100px] rounded-tl-[30px] rounded-br-[30px] transform rotate-3 scale-105 -z-10"></div>
                <div className="absolute inset-0 bg-[#E86100]/10 rounded-[100px] rounded-tr-[30px] rounded-bl-[30px] transform -rotate-3 scale-105 -z-20"></div>
                <div className="relative h-[600px] w-full rounded-[100px] rounded-tl-[40px] rounded-br-[40px] overflow-hidden shadow-xl border-8 border-white">
                  <img 
                    src={heroPessoa} 
                    alt="Pessoa sorrindo e confiante" 
                    className="w-full h-full object-cover object-top"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary-900/40 to-transparent"></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2 — Qual situação */}
        <section className="bg-[#F5F4F2] py-20 md:py-28 relative">
          <div className="container mx-auto px-6 max-w-[1200px]">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-primary-900 tracking-tight">Qual situação se parece com a sua?</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: HeartCrack, title: "INSS negou meu benefício", desc: "Seu pedido foi recusado ou cortado sem explicação.", filter: "INSS — benefício negado ou cortado", bg: "bg-blue-50" },
                { icon: Activity, title: "Preciso do Auxílio Doença", desc: "Está afastado do trabalho e o INSS não reconhece sua situação.", filter: "Auxílio Doença", bg: "bg-indigo-50" },
                { icon: BriefcaseBusiness, title: "Quero me aposentar", desc: "Não sabe se já tem direito ou como dar entrada.", filter: "Aposentadoria", bg: "bg-cyan-50" },
                { icon: Accessibility, title: "BPC/LOAS — benefício para quem precisa", desc: "Pessoa com deficiência ou idoso sem renda que foi negado.", filter: "BPC/LOAS", bg: "bg-teal-50" },
                { icon: TrendingUp, title: "Plano de saúde aumentou absurdamente", desc: "Reajuste abusivo ou negativa de cobertura indevida.", filter: "Plano de saúde — reajuste abusivo ou negativa de cobertura", bg: "bg-orange-50" },
                { icon: Baby, title: "Pensão alimentícia", desc: "Precisa cobrar ou revisar o valor que o pai ou a mãe paga.", filter: "Pensão alimentícia", bg: "bg-pink-50" },
                { icon: Flower2, title: "Pensão por morte", desc: "Perdeu alguém e não sabe como garantir o benefício.", filter: "Pensão por morte", bg: "bg-purple-50" },
                { icon: FileText, title: "Inventário e herança", desc: "Familiar faleceu e a família não sabe como dividir os bens.", filter: "Inventário e herança", bg: "bg-emerald-50" }
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <Link 
                    key={idx} 
                    href={`/advogados?problema=${encodeURIComponent(item.filter)}`}
                    className="bg-white p-8 rounded-[32px] border border-neutral-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:border-primary-100 hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full"
                    data-testid={`card-situacao-${idx}`}
                  >
                    <div className={`w-16 h-16 rounded-2xl ${item.bg} text-primary-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                      <Icon strokeWidth={1.5} className="w-8 h-8" />
                    </div>
                    <h3 className="font-bold text-xl text-primary-900 mb-3 leading-tight">{item.title}</h3>
                    <p className="text-neutral-600 text-sm leading-relaxed flex-grow">{item.desc}</p>
                  </Link>
                );
              })}
            </div>

            <div className="mt-16 text-center">
              <Button asChild variant="outline" className="rounded-full h-12 px-8 text-base border-primary-200 text-primary-700 hover:bg-primary-50">
                <Link href="/advogados">
                  Ver todas as áreas de atuação <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Section 3 — Simples assim */}
        <section className="bg-white py-20 md:py-32">
          <div className="container mx-auto px-6 max-w-[1200px]">
            <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
              <div className="w-full lg:w-1/2 order-2 lg:order-1 relative">
                <div className="absolute -inset-4 bg-primary-50 rounded-[40px] transform rotate-2 z-0"></div>
                <div className="relative h-[500px] w-full rounded-[30px] overflow-hidden shadow-lg z-10">
                  <img 
                    src={celularPessoa} 
                    alt="Homem olhando para o celular" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              
              <div className="w-full lg:w-1/2 order-1 lg:order-2">
                <h2 className="text-3xl md:text-4xl font-bold text-primary-900 mb-6 tracking-tight">Simples assim</h2>
                <p className="text-lg text-neutral-600 leading-relaxed mb-12">
                  Nunca contratou um advogado? Não tem problema. Aqui não tem formulário complicado, não tem compromisso e ninguém vai te ligar tentando vender nada. É você no seu ritmo, entendendo as opções e decidindo com calma.
                </p>

                <div className="space-y-8">
                  {[
                    { step: "1", title: "Conta pra gente o que está acontecendo", desc: "Escolha o problema que mais se parece com a sua situação." },
                    { step: "2", title: "Veja advogados disponíveis", desc: "Perfis com especialidade, localização e informações de contato." },
                    { step: "3", title: "Entre em contato diretamente", desc: "Você fala com o advogado pelo canal que preferir. Sem intermediários." }
                  ].map((item, idx) => (
                    <div key={idx} className="flex gap-6 items-start">
                      <div className="w-12 h-12 rounded-full bg-accent-100 flex items-center justify-center text-accent-600 font-bold shrink-0 mt-1 shadow-sm">
                        {item.step}
                      </div>
                      <div>
                        <h3 className="font-bold text-xl text-primary-900 mb-2">{item.title}</h3>
                        <p className="text-neutral-600 leading-relaxed text-lg">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4 — Feito para quem precisa */}
        <section className="bg-[#EEF5FC] py-20 md:py-32 relative overflow-hidden">
          <div className="container mx-auto px-6 max-w-[1200px]">
            <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
              <div className="w-full lg:w-1/2 z-10">
                <h2 className="text-3xl md:text-4xl font-bold text-primary-900 mb-6 tracking-tight">Feito para quem precisa de resposta, não de complicação</h2>
                <p className="text-lg text-neutral-600 leading-relaxed mb-10">
                  A maioria das pessoas que precisam de um advogado nunca teve um. Não sabe por onde começar, não sabe a quem recorrer, não sabe se existe alguém que resolva exatamente o que ela está passando. A Minha Causa Justa foi pensada pra esse momento — quando você precisa encontrar a pessoa certa, sem perder tempo nem cair em mãos erradas.
                </p>
                
                <div className="space-y-8">
                  <div className="flex gap-5 bg-white p-6 rounded-[24px] shadow-sm border border-primary-100/50">
                    <div className="bg-primary-100 p-3 rounded-xl text-primary-700 h-12 w-12 flex items-center justify-center shrink-0">
                      <Search className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-primary-900 mb-2">Direto ao ponto</h3>
                      <p className="text-neutral-600 leading-relaxed">Sem processos complicados para encontrar quem você precisa. Você descreve sua situação, vê os perfis disponíveis e entra em contato. Rápido e sem rodeios.</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-5 bg-white p-6 rounded-[24px] shadow-sm border border-primary-100/50">
                    <div className="bg-primary-100 p-3 rounded-xl text-primary-700 h-12 w-12 flex items-center justify-center shrink-0">
                      <Shield className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-primary-900 mb-2">Advogados de verdade, para situações reais</h3>
                      <p className="text-neutral-600 leading-relaxed">Profissionais inscritos na OAB que trabalham com as causas do dia a dia — não com grandes empresas.</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-5 bg-white p-6 rounded-[24px] shadow-sm border border-primary-100/50">
                    <div className="bg-primary-100 p-3 rounded-xl text-primary-700 h-12 w-12 flex items-center justify-center shrink-0">
                      <MessageCircle className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-primary-900 mb-2">Você no controle</h3>
                      <p className="text-neutral-600 leading-relaxed">Ninguém vai te ligar para vender nada. Você busca, você escolhe, você decide.</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="w-full lg:w-1/2 relative">
                {/* Arch shape for image */}
                <div className="relative h-[650px] w-full rounded-t-[300px] rounded-b-[40px] overflow-hidden shadow-2xl border-[12px] border-white z-10">
                  <img 
                    src={familiaPessoa} 
                    alt="Família conversando em casa" 
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* Decorative blob behind */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[110%] bg-accent-100 rounded-full blur-[80px] -z-10 opacity-60"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5 — Blog */}
        <section className="bg-white py-20 md:py-32">
          <div className="container mx-auto px-6 max-w-[1200px]">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
              <div className="max-w-2xl">
                <h2 className="text-3xl md:text-4xl font-bold text-primary-900 mb-6 tracking-tight">Entenda seus direitos antes de qualquer coisa</h2>
                <p className="text-lg text-neutral-600 leading-relaxed">
                  Escrevemos sobre direitos do jeito que a gente gostaria de ter aprendido: sem complicação, sem letra miúda, sem precisar ter feito faculdade de direito pra entender.
                </p>
              </div>
              <Button asChild variant="outline" className="rounded-full shrink-0 hidden md:inline-flex h-12 px-8 text-base border-primary-200 text-primary-700 hover:bg-primary-50">
                <Link href="/">
                  Ver todos os artigos <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                "INSS cortou seu benefício? Veja o que fazer em até 30 dias",
                "Plano de saúde negou exame ou cirurgia? Isso pode ser ilegal",
                "Pensão por morte: quem tem direito e como pedir"
              ].map((title, idx) => (
                <div key={idx} className="bg-[#F5F4F2] p-8 rounded-[32px] flex flex-col group hover:bg-primary-50 transition-colors duration-300">
                  <div className="mb-6 w-full h-48 bg-white rounded-2xl overflow-hidden relative">
                     {idx === 0 && <img src={confiancaPessoa} alt={title} className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500" />}
                     {idx === 1 && <img src={familiaPessoa} alt={title} className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500" />}
                     {idx === 2 && <img src={celularPessoa} alt={title} className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500" />}
                  </div>
                  <h3 className="font-bold text-xl text-primary-900 mb-6 flex-grow leading-snug">{title}</h3>
                  <Link href="/" className="inline-flex items-center font-medium text-accent-600 hover:text-accent-700 transition-colors mt-auto">
                    Ler mais <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              ))}
            </div>
            
            <div className="mt-10 md:hidden text-center">
              <Button asChild variant="outline" className="rounded-full w-full h-14 text-base border-primary-200 text-primary-700 hover:bg-primary-50">
                <Link href="/">
                  Ver todos os artigos <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Section 6 — CTA principal */}
        <section className="py-12 md:py-24 px-6">
          <div className="container mx-auto max-w-[1200px]">
            <div className="bg-primary-800 text-white rounded-[40px] md:rounded-[60px] py-20 px-8 md:px-20 text-center relative overflow-hidden shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-r from-primary-900 to-primary-700 opacity-50"></div>
              <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 w-[600px] h-[600px] bg-primary-600/30 rounded-full blur-[80px]"></div>
              <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/3 w-[600px] h-[600px] bg-accent-500/20 rounded-full blur-[80px]"></div>
              
              <div className="relative z-10 max-w-[800px] mx-auto flex flex-col items-center">
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">Não deixa o seu direito passar em branco.</h2>
                <p className="text-xl md:text-2xl text-primary-100 mb-12 font-light">Muita gente desiste porque não sabe por onde começar. A gente mostra o caminho.</p>
                <Button asChild size="lg" className="bg-accent-500 hover:bg-accent-600 text-white h-16 px-10 text-lg rounded-full shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
                  <Link href="/advogados" data-testid="button-cta-encontrar">
                    Encontrar um advogado agora
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Section 7 — CTA advogados */}
        <section className="bg-white py-20 text-center border-t border-neutral-100">
          <div className="container mx-auto px-6 max-w-[800px]">
            <h2 className="text-3xl md:text-4xl font-bold text-primary-900 mb-6 tracking-tight">Você é advogado?</h2>
            <p className="text-xl text-neutral-600 mb-10 leading-relaxed">Cadastre seu perfil e apareça para pessoas que estão exatamente com o problema que você resolve.</p>
            <Button asChild variant="outline" size="lg" className="border-primary-200 text-primary-700 hover:bg-primary-50 h-16 px-10 text-lg rounded-full hover:border-primary-300 transition-all">
              <Link href="/cadastro" data-testid="button-cta-cadastro">
                Quero cadastrar meu perfil
              </Link>
            </Button>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
