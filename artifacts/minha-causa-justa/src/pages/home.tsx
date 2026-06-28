import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, CheckCircle2, Shield, Search, MessageCircle } from "lucide-react";

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
        <section className="bg-[#1A3F73] text-white py-16 md:py-24">
          <div className="container mx-auto px-6 max-w-[1200px]">
            <div className="max-w-3xl">
              <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
                Você tem direitos.<br />
                A gente te ajuda a encontrar quem pode garantir eles.
              </h1>
              
              <div className="space-y-4 text-lg md:text-xl text-primary-50 leading-relaxed mb-10">
                <p>
                  Tem horas que a vida bate de frente com a gente. O INSS nega um benefício que você precisa, o plano de saúde recusa um tratamento, o patrão não paga o que deve, a pensão não chega. E aí vem aquela sensação de que o sistema foi feito pra te cansar — pra você desistir antes de lutar.
                </p>
                <p>
                  Mas a verdade é que você provavelmente tem direito a muito mais do que imagina. O que falta, na maioria das vezes, não é sorte. É saber por onde começar e ter ao seu lado alguém que entende do assunto.
                </p>
                <p>
                  A Minha Causa Justa existe pra isso: mostrar que existe um caminho, e conectar você com advogados que trabalham com situações como a sua todo dia.
                </p>
                <p className="font-medium text-white">
                  Você não precisa entender de lei. Precisa dar o primeiro passo.
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <Select value={problema} onValueChange={setProblema}>
                      <SelectTrigger className="bg-white text-neutral-900 border-0 h-12" data-testid="select-problema">
                        <SelectValue placeholder="Qual é o seu problema?" />
                      </SelectTrigger>
                      <SelectContent>
                        {problemas.map(p => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-full md:w-48">
                    <Select value={estado} onValueChange={setEstado}>
                      <SelectTrigger className="bg-white text-neutral-900 border-0 h-12" data-testid="select-estado">
                        <SelectValue placeholder="Seu estado" />
                      </SelectTrigger>
                      <SelectContent>
                        {estados.map(uf => (
                          <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={handleSearch} 
                    className="bg-[#E86100] hover:bg-[#C45200] text-white h-12 px-8 text-base font-medium"
                    data-testid="button-buscar-advogado"
                  >
                    Encontrar advogado
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2 — Qual situação */}
        <section className="bg-[#EEF5FC] py-16 md:py-24">
          <div className="container mx-auto px-6 max-w-[1200px]">
            <h2 className="text-3xl font-bold text-primary-900 mb-10 text-center">Qual situação se parece com a sua?</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { emoji: "🏥", title: "INSS negou meu benefício", desc: "Seu pedido foi recusado ou cortado sem explicação.", filter: "INSS — benefício negado ou cortado" },
                { emoji: "🤕", title: "Preciso do Auxílio Doença", desc: "Está afastado do trabalho e o INSS não reconhece sua situação.", filter: "Auxílio Doença" },
                { emoji: "👴", title: "Quero me aposentar", desc: "Não sabe se já tem direito ou como dar entrada.", filter: "Aposentadoria" },
                { emoji: "♿", title: "BPC/LOAS — benefício para quem precisa", desc: "Pessoa com deficiência ou idoso sem renda que foi negado.", filter: "BPC/LOAS" },
                { emoji: "💊", title: "Plano de saúde aumentou absurdamente", desc: "Reajuste abusivo ou negativa de cobertura indevida.", filter: "Plano de saúde — reajuste abusivo ou negativa de cobertura" },
                { emoji: "👶", title: "Pensão alimentícia", desc: "Precisa cobrar ou revisar o valor que o pai ou a mãe paga.", filter: "Pensão alimentícia" },
                { emoji: "⚰️", title: "Pensão por morte", desc: "Perdeu alguém e não sabe como garantir o benefício.", filter: "Pensão por morte" },
                { emoji: "📋", title: "Inventário e herança", desc: "Familiar faleceu e a família não sabe como dividir os bens.", filter: "Inventário e herança" }
              ].map((item, idx) => (
                <Link 
                  key={idx} 
                  href={`/advogados?problema=${encodeURIComponent(item.filter)}`}
                  className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm hover:shadow-md hover:border-primary-300 transition-all group"
                  data-testid={`card-situacao-${idx}`}
                >
                  <div className="text-4xl mb-4 group-hover:scale-110 transition-transform origin-left">{item.emoji}</div>
                  <h3 className="font-bold text-lg text-primary-900 mb-2 leading-tight">{item.title}</h3>
                  <p className="text-neutral-600 text-sm leading-relaxed">{item.desc}</p>
                </Link>
              ))}
            </div>

            <div className="mt-12 text-center">
              <Link href="/advogados" className="inline-flex items-center font-medium text-primary-600 hover:text-primary-800 transition-colors">
                Ver todas as áreas de atuação <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Section 3 — Simples assim */}
        <section className="bg-[#F5F4F2] py-16 md:py-24">
          <div className="container mx-auto px-6 max-w-[1200px]">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <h2 className="text-3xl font-bold text-primary-900 mb-6">Simples assim</h2>
              <p className="text-lg text-neutral-600 leading-relaxed">
                Nunca contratou um advogado? Não tem problema. Aqui não tem formulário complicado, não tem compromisso e ninguém vai te ligar tentando vender nada. É você no seu ritmo, entendendo as opções e decidindo com calma.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
              {[
                { step: "1", title: "Conta pra gente o que está acontecendo", desc: "Escolha o problema que mais se parece com a sua situação." },
                { step: "2", title: "Veja advogados disponíveis", desc: "Perfis com especialidade, localização e informações de contato." },
                { step: "3", title: "Entre em contato diretamente", desc: "Você fala com o advogado pelo canal que preferir. Sem intermediários." }
              ].map((item, idx) => (
                <div key={idx} className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-accent-100 flex items-center justify-center text-accent-500 text-2xl font-bold mb-6">
                    {item.step}
                  </div>
                  <h3 className="font-bold text-xl text-primary-900 mb-3">{item.title}</h3>
                  <p className="text-neutral-600 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 4 — Feito para quem precisa */}
        <section className="bg-[#EEF5FC] py-16 md:py-24">
          <div className="container mx-auto px-6 max-w-[1200px]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
              <div>
                <h2 className="text-3xl font-bold text-primary-900 mb-6">Feito para quem precisa de resposta, não de complicação</h2>
                <p className="text-lg text-neutral-600 leading-relaxed mb-8">
                  A maioria das pessoas que precisam de um advogado nunca teve um. Não sabe por onde começar, não sabe a quem recorrer, não sabe se existe alguém que resolva exatamente o que ela está passando. A Minha Causa Justa foi pensada pra esse momento — quando você precisa encontrar a pessoa certa, sem perder tempo nem cair em mãos erradas.
                </p>
              </div>
              
              <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="mt-1 bg-primary-100 p-2 rounded-lg text-primary-700 h-10 w-10 flex items-center justify-center shrink-0">
                    <Search className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-primary-900 mb-2">Direto ao ponto</h3>
                    <p className="text-neutral-600 leading-relaxed">Sem processos complicados para encontrar quem você precisa. Você descreve sua situação, vê os perfis disponíveis e entra em contato. Rápido e sem rodeios.</p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="mt-1 bg-primary-100 p-2 rounded-lg text-primary-700 h-10 w-10 flex items-center justify-center shrink-0">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-primary-900 mb-2">Advogados de verdade, para situações reais</h3>
                    <p className="text-neutral-600 leading-relaxed">Profissionais inscritos na OAB que trabalham com as causas do dia a dia — não com grandes empresas.</p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="mt-1 bg-primary-100 p-2 rounded-lg text-primary-700 h-10 w-10 flex items-center justify-center shrink-0">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-primary-900 mb-2">Você no controle</h3>
                    <p className="text-neutral-600 leading-relaxed">Ninguém vai te ligar para vender nada. Você busca, você escolhe, você decide.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5 — Blog */}
        <section className="bg-[#F5F4F2] py-16 md:py-24">
          <div className="container mx-auto px-6 max-w-[1200px]">
            <div className="max-w-3xl mb-12">
              <h2 className="text-3xl font-bold text-primary-900 mb-6">Entenda seus direitos antes de qualquer coisa</h2>
              <p className="text-lg text-neutral-600 leading-relaxed">
                Escrevemos sobre direitos do jeito que a gente gostaria de ter aprendido: sem complicação, sem letra miúda, sem precisar ter feito faculdade de direito pra entender.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              {[
                "INSS cortou seu benefício? Veja o que fazer em até 30 dias",
                "Plano de saúde negou exame ou cirurgia? Isso pode ser ilegal",
                "Pensão por morte: quem tem direito e como pedir"
              ].map((title, idx) => (
                <div key={idx} className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm flex flex-col">
                  <h3 className="font-bold text-lg text-primary-900 mb-4 flex-grow">{title}</h3>
                  <Link href="/" className="inline-flex items-center font-medium text-primary-500 hover:text-primary-700 transition-colors mt-4">
                    Ler mais <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </div>
              ))}
            </div>
            
            <div className="text-center md:text-left">
              <Link href="/" className="inline-flex items-center font-medium text-primary-600 hover:text-primary-800 transition-colors">
                Ver todos os artigos <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Section 6 — CTA principal */}
        <section className="bg-[#1A3F73] text-white py-20 text-center">
          <div className="container mx-auto px-6 max-w-[800px]">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Não deixa o seu direito passar em branco.</h2>
            <p className="text-xl text-primary-100 mb-10">Muita gente desiste porque não sabe por onde começar. A gente mostra o caminho.</p>
            <Button asChild size="lg" className="bg-[#E86100] hover:bg-[#C45200] text-white h-14 px-8 text-lg">
              <Link href="/advogados" data-testid="button-cta-encontrar">
                Encontrar um advogado agora
              </Link>
            </Button>
          </div>
        </section>

        {/* Section 7 — CTA advogados */}
        <section className="bg-[#F5F4F2] py-20 text-center border-t border-border/40">
          <div className="container mx-auto px-6 max-w-[800px]">
            <h2 className="text-2xl md:text-3xl font-bold text-primary-900 mb-4">Você é advogado?</h2>
            <p className="text-lg text-neutral-600 mb-8">Cadastre seu perfil e apareça para pessoas que estão exatamente com o problema que você resolve.</p>
            <Button asChild variant="outline" size="lg" className="border-primary-500 text-primary-600 hover:bg-primary-50 h-14 px-8 text-lg">
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
