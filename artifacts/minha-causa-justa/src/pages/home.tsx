import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Search, MessageCircle } from "lucide-react";
import { CATEGORIAS } from "@/data/categories";
import { BLOG_POSTS, type BlogPost } from "@/data/blog";
import { usePublishedPosts } from "@/data/published-posts";

import heroPessoa from "@/assets/hero-pessoa.webp";
import celularPessoa from "@/assets/celular-pessoa.webp";
import familiaPessoa from "@/assets/familia-pessoa.webp";
import confiancaPessoa from "@/assets/confianca-pessoa.webp";

// Imagens usadas nos cards do blog na home. Cada categoria recebe uma imagem
// que conversa com o tema; as demais caem num sorteio deterministico (estavel
// por slug) entre as tres imagens disponiveis.
const BLOG_IMAGENS = [confiancaPessoa, familiaPessoa, celularPessoa];

const IMAGEM_POR_CATEGORIA: Record<string, string> = {
  "Família e Parentalidade": familiaPessoa,
  "Relacionamentos e Casais": familiaPessoa,
  "Ansiedade e Estresse": celularPessoa,
  "Depressão e Transtornos de Humor": celularPessoa,
  "Autoconhecimento e Desenvolvimento Pessoal": confiancaPessoa,
  "Luto, Envelhecimento e Cuidados Paliativos": confiancaPessoa,
};

function imagemDoPost(post: BlogPost): string {
  const daCategoria = IMAGEM_POR_CATEGORIA[post.category];
  if (daCategoria) return daCategoria;
  let hash = 0;
  for (let i = 0; i < post.slug.length; i++) {
    hash = (hash + post.slug.charCodeAt(i)) % BLOG_IMAGENS.length;
  }
  return BLOG_IMAGENS[hash];
}

// Escolhe imagens distintas para os cards de blog em destaque na home, evitando
// repetir a mesma foto entre eles. Preferimos a imagem da categoria; se ela ja
// tiver sido usada por outro card, caimos para a proxima foto ainda livre.
function imagensDistintasDaHome(posts: BlogPost[]): string[] {
  const usadas = new Set<string>();
  return posts.map((post) => {
    let escolhida = imagemDoPost(post);
    if (usadas.has(escolhida)) {
      const livre = BLOG_IMAGENS.find((img) => !usadas.has(img));
      if (livre) escolhida = livre;
    }
    usadas.add(escolhida);
    return escolhida;
  });
}

export default function Home() {
  const [, setLocation] = useLocation();

  // 3 posts para a seção do blog: os publicados no painel /admin vêm primeiro
  // (mais recentes), e os posts fixos completam caso ainda não haja 3 publicados.
  const { posts: postsPublicados } = usePublishedPosts();
  const slugsPublicados = new Set(postsPublicados.map((p) => p.slug));
  const postsHome: BlogPost[] = [
    ...postsPublicados,
    ...BLOG_POSTS.filter((p) => !slugsPublicados.has(p.slug)),
  ].slice(0, 3);
  const imagensHome = imagensDistintasDaHome(postsHome);

  return (
    <div className="min-h-screen flex flex-col font-sans bg-background">
      <Navbar />

      <main className="flex-grow">
        {/* Section 1 — Hero */}
        <section className="bg-gradient-to-br from-white to-primary-50 py-6 md:py-24 overflow-hidden">
          <div className="container mx-auto px-6 max-w-[1200px]">
            <div className="flex flex-col lg:flex-row items-center lg:items-start gap-12 lg:gap-20">
              <div className="w-full lg:w-1/2">
                {/* Mobile: hero curta com CTA */}
                <div className="lg:hidden">
                  <h1 className="text-3xl sm:text-4xl font-bold text-primary-900 leading-[1.15] mb-3 tracking-tight">
                    Sua saúde mental importa.<br />
                    <span className="text-primary-500">Te ajudamos a encontrar quem pode cuidar dela.</span>
                  </h1>
                  <p className="text-base text-neutral-600 leading-relaxed mb-3">
                    Tem horas que a vida exige muito da gente. A ansiedade não passa, o relacionamento desgasta, o luto pesa, o trabalho esgota. E junto vem aquela sensação de que ninguém entenderia e que você precisa lidar com tudo sozinho.
                  </p>
                  <p className="text-base font-semibold text-red-600 leading-relaxed mb-5">
                    Dê o primeiro passo. Encontre um psicólogo.
                  </p>
                  <Button
                    onClick={() => setLocation("/psicologos")}
                    className="bg-primary-500 hover:bg-primary-600 text-white h-14 px-8 text-base font-medium rounded-full shadow-md hover:shadow-lg transition-all w-full"
                    data-testid="button-cta-hero-mobile"
                  >
                    Encontrar um psicólogo
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>

                {/* Desktop: hero completa */}
                <h1 className="hidden lg:block text-4xl md:text-5xl lg:text-[56px] font-bold text-primary-900 leading-[1.1] mb-6 tracking-tight">
                  Sua saúde mental importa.<br />
                  <span className="text-primary-500">Te ajudamos a encontrar quem pode cuidar dela.</span>
                </h1>

                <div className="hidden lg:block space-y-5 text-lg text-neutral-600 leading-relaxed mb-10">
                  <p>
                    Tem horas que a vida exige muito da gente. A ansiedade não passa, o relacionamento desgasta, o luto pesa, o trabalho esgota. E junto vem aquela sensação de que ninguém entenderia e que você precisa lidar com tudo sozinho.
                  </p>
                  <p>
                    Mas a verdade é que buscar apoio psicológico pode fazer mais diferença do que você imagina.
                  </p>
                  <p>
                    A Terapia Que Cura existe para isso: mostrar que existe um caminho, e conectar você com psicólogos que trabalham com situações como a sua todo dia.
                  </p>
                  <p className="font-semibold text-red-600 text-xl pt-2">
                    Dê o primeiro passo. Encontre um psicólogo.
                  </p>
                  <Button
                    onClick={() => setLocation("/psicologos")}
                    className="bg-primary-500 hover:bg-primary-600 text-white h-14 px-8 text-base font-medium rounded-full shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
                    data-testid="button-cta-hero-desktop"
                  >
                    Encontrar um psicólogo
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </div>

              <div className="hidden lg:block w-full lg:w-1/2 relative">
                <div className="absolute inset-0 bg-primary-100 rounded-[100px] rounded-tl-[30px] rounded-br-[30px] transform rotate-3 scale-105 -z-10"></div>
                <div className="absolute inset-0 bg-accent-100/50 rounded-[100px] rounded-tr-[30px] rounded-bl-[30px] transform -rotate-3 scale-105 -z-20"></div>
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
        <section className="bg-background py-20 md:py-28 relative">
          <div className="container mx-auto px-6 max-w-[1200px]">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-primary-900 tracking-tight">Qual situação se parece com a sua?</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {CATEGORIAS.map((cat, idx) => (
                <Link
                  key={cat.slug}
                  href={`/psicologos?categoria=${cat.slug}`}
                  className="bg-white p-8 rounded-[32px] border border-neutral-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:border-primary-100 hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full"
                  data-testid={`card-situacao-${idx}`}
                >
                  <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mb-6 text-2xl font-bold text-primary-600 group-hover:scale-110 transition-transform duration-300">
                    <span aria-hidden="true">{cat.emoji || cat.nome.charAt(0)}</span>
                  </div>
                  <h3 className="font-bold text-xl text-primary-900 mb-3 leading-tight">{cat.nome}</h3>
                  <p className="text-neutral-600 text-sm leading-relaxed flex-grow">{cat.descricao}</p>
                </Link>
              ))}
            </div>

            <div className="mt-16 text-center">
              <Button asChild variant="outline" className="rounded-full h-12 px-8 text-base border-primary-200 text-primary-700 hover:bg-primary-50">
                <Link href="/psicologos">
                  Ver todas as áreas de atuação <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Section 3 — Simples assim */}
        <section className="bg-white py-20 md:py-32 overflow-hidden">
          <div className="container mx-auto px-6 max-w-[1200px]">
            <div className="flex flex-col lg:flex-row items-center lg:items-start gap-16 lg:gap-24">
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
                <h2 className="text-3xl md:text-4xl font-bold text-primary-900 mb-6 tracking-tight">Como funciona</h2>
                <p className="text-lg text-neutral-600 leading-relaxed mb-12">
                  Nunca fez terapia? Não tem problema. Aqui não tem formulário complicado, não tem compromisso e ninguém vai te ligar tentando vender nada. É você no seu ritmo, entendendo as opções e decidindo com calma.
                </p>

                <div className="space-y-8">
                  {[
                    { step: "1", title: "Conta para a gente o que está acontecendo", desc: "Escolha o tema que mais se parece com o que você está sentindo." },
                    { step: "2", title: "Veja psicólogos disponíveis", desc: "Perfis com especialidade, localização e informações de contato." },
                    { step: "3", title: "Entre em contato diretamente", desc: "Você fala com o psicólogo pelo canal que preferir. Sem intermediários." }
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
        <section className="bg-primary-50 py-20 md:py-32 relative overflow-hidden">
          <div className="container mx-auto px-6 max-w-[1200px]">
            <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
              <div className="w-full lg:w-1/2 z-10">
                <h2 className="text-3xl md:text-4xl font-bold text-primary-900 mb-6 tracking-tight">Feito para quem precisa de acolhimento, não de complicação</h2>
                <p className="text-lg text-neutral-600 leading-relaxed mb-10">
                  A maioria das pessoas que precisam de apoio psicológico nunca fez terapia. Não sabe por onde começar, não sabe a quem recorrer, não sabe se existe alguém que entenda exatamente o que ela está sentindo. A Terapia Que Cura foi pensada para esse momento, quando você precisa encontrar a pessoa certa, sem perder tempo nem cair em mãos erradas.
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
                      <h3 className="font-bold text-lg text-primary-900 mb-2">Psicólogos de verdade, para situações reais</h3>
                      <p className="text-neutral-600 leading-relaxed">Profissionais inscritos no CRP que trabalham com os temas que mais afetam o dia a dia das pessoas.</p>
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

        {/* Section 5 — Blog (só aparece quando há posts publicados) */}
        {postsHome.length > 0 && (
        <section className="bg-white py-20 md:py-32">
          <div className="container mx-auto px-6 max-w-[1200px]">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
              <div className="max-w-2xl">
                <h2 className="text-3xl md:text-4xl font-bold text-primary-900 mb-6 tracking-tight">Entenda sua mente antes de qualquer coisa</h2>
                <p className="text-lg text-neutral-600 leading-relaxed">
                  Escrevemos sobre saúde mental do jeito que a gente gostaria de ter aprendido: sem complicação, sem jargão técnico, sem precisar ter feito faculdade de psicologia para entender.
                </p>
              </div>
              <Button asChild variant="outline" className="rounded-full shrink-0 hidden md:inline-flex h-12 px-8 text-base border-primary-200 text-primary-700 hover:bg-primary-50">
                <Link href="/blog">
                  Ver todos os artigos <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {postsHome.map((post, index) => (
                <div key={post.slug} className="bg-background p-8 rounded-[32px] flex flex-col group hover:bg-primary-50 transition-colors duration-300">
                  <div className="mb-6 w-full h-48 bg-white rounded-2xl overflow-hidden relative">
                    <img src={post.coverImageUrl ?? imagensHome[index]} alt={post.coverImageAlt || post.title} loading="lazy" className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <h3 className="font-bold text-xl text-primary-900 mb-6 flex-grow leading-snug">{post.title}</h3>
                  <Link href={`/blog/${post.slug}`} className="inline-flex items-center font-medium text-accent-600 hover:text-accent-700 transition-colors mt-auto">
                    Ler mais <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              ))}
            </div>
            
            <div className="mt-10 md:hidden text-center">
              <Button asChild variant="outline" className="rounded-full w-full h-14 text-base border-primary-200 text-primary-700 hover:bg-primary-50">
                <Link href="/blog">
                  Ver todos os artigos <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
        )}

        {/* Section 6 — CTA principal */}
        <section className="py-12 md:py-24 px-6">
          <div className="container mx-auto max-w-[1200px]">
            <div className="bg-primary-800 text-white rounded-[40px] md:rounded-[60px] py-20 px-8 md:px-20 text-center relative overflow-hidden shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-r from-primary-900 to-primary-700 opacity-50"></div>
              <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 w-[600px] h-[600px] bg-primary-600/30 rounded-full blur-[80px]"></div>
              <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/3 w-[600px] h-[600px] bg-accent-500/20 rounded-full blur-[80px]"></div>
              
              <div className="relative z-10 max-w-[800px] mx-auto flex flex-col items-center">
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">Cuidar de você não pode esperar.</h2>
                <p className="text-xl md:text-2xl text-primary-100 mb-12 font-light">Muita gente desiste porque não sabe por onde começar. A gente mostra o caminho.</p>
                <Button asChild size="lg" className="bg-primary-500 hover:bg-primary-600 text-white h-16 px-10 text-lg rounded-full shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
                  <Link href="/psicologos" data-testid="button-cta-encontrar">
                    Encontrar um psicólogo agora
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Section 7 — CTA psicólogos */}
        <section className="bg-white py-20 text-center border-t border-neutral-100">
          <div className="container mx-auto px-6 max-w-[800px]">
            <h2 className="text-3xl md:text-4xl font-bold text-primary-900 mb-6 tracking-tight">Você é psicólogo?</h2>
            <p className="text-xl text-neutral-600 mb-10 leading-relaxed">Cadastre seu perfil e apareça para pessoas que precisam exatamente do que você oferece.</p>
            <Button asChild size="lg" className="bg-primary-500 hover:bg-primary-600 text-white h-16 px-10 text-lg rounded-full transition-all">
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
