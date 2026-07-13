import { Link, useSearch } from "wouter";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BlogSidebar } from "@/components/BlogSidebar";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { BLOG_POSTS } from "@/data/blog";
import { usePublishedPosts } from "@/data/published-posts";
import { categoriaPorSlug } from "@/data/categories";

export default function Blog() {
  // Lê o slug da categoria do query param (?categoria=...) para filtrar os cards
  const search = useSearch();
  const params = new URLSearchParams(search);
  const activeSlug = params.get("categoria");
  const activeCategoria = activeSlug ? categoriaPorSlug(activeSlug) : undefined;
  const activeCategoryName = activeCategoria?.nome ?? null;

  // Posts gerados no painel /admin aparecem antes dos posts fixos.
  // Em caso de slug repetido, o post gerado tem precedência.
  const { posts: generatedPosts } = usePublishedPosts();
  const generatedSlugs = new Set(generatedPosts.map((p) => p.slug));
  const allPosts = [
    ...generatedPosts,
    ...BLOG_POSTS.filter((p) => !generatedSlugs.has(p.slug)),
  ];

  const posts = activeCategoryName
    ? allPosts.filter((post) => post.category === activeCategoryName)
    : allPosts;

  // Paginação: 6 posts por página. A página atual vem do query param (?pagina=N).
  const POSTS_POR_PAGINA = 6;
  const totalPaginas = Math.max(1, Math.ceil(posts.length / POSTS_POR_PAGINA));
  const paginaSolicitada = Number.parseInt(params.get("pagina") ?? "1", 10);
  const paginaAtual = Math.min(
    Math.max(Number.isNaN(paginaSolicitada) ? 1 : paginaSolicitada, 1),
    totalPaginas,
  );
  const postsDaPagina = posts.slice(
    (paginaAtual - 1) * POSTS_POR_PAGINA,
    paginaAtual * POSTS_POR_PAGINA,
  );

  // Monta a URL de uma página preservando o filtro de categoria ativo.
  const hrefDaPagina = (pagina: number): string => {
    const p = new URLSearchParams();
    if (activeSlug) p.set("categoria", activeSlug);
    if (pagina > 1) p.set("pagina", String(pagina));
    const qs = p.toString();
    return qs ? `/blog?${qs}` : "/blog";
  };

  return (
    <div className="min-h-screen bg-[#F5F4F2]">
      <Navbar />

      <main>
        <div className="container mx-auto px-6 max-w-[1200px] pt-8 pb-16 md:pt-10 md:pb-24">
          {/* Cabeçalho da página */}
          <header className="mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-primary-800 mb-3">
              Blog
            </h1>
            <p className="text-neutral-500 text-base md:text-lg">
              Conteúdos sobre saúde mental e bem-estar, escritos de forma simples
              e acolhedora.
            </p>
          </header>

          {/* Layout de duas colunas */}
          <div className="flex flex-col lg:flex-row gap-10 lg:gap-12 items-start">
            {/* Coluna principal — lista de posts */}
            <div className="flex-1 w-full">
              {activeCategoryName && (
                <p className="text-sm text-neutral-500 mb-6">
                  Mostrando posts da categoria{" "}
                  <span className="font-bold text-primary-600">
                    {activeCategoryName}
                  </span>
                  .{" "}
                  <Link
                    href="/blog"
                    className="text-primary-600 hover:underline"
                  >
                    Ver todos
                  </Link>
                </p>
              )}

              <div className="space-y-6">
                {postsDaPagina.map((post) => (
                  <article
                    key={post.slug}
                    className="bg-white rounded-2xl border border-neutral-200 p-6 md:p-8 transition-shadow hover:shadow-md"
                  >
                    {post.coverImageUrl && (
                      <Link
                        href={`/blog/${post.slug}`}
                        className="block -mx-6 -mt-6 md:-mx-8 md:-mt-8 mb-6 overflow-hidden rounded-t-2xl"
                      >
                        <img
                          src={post.coverImageUrl}
                          alt={post.coverImageAlt || post.title}
                          loading="lazy"
                          className="w-full h-52 object-cover transition-transform duration-500 hover:scale-105"
                        />
                      </Link>
                    )}
                    <Badge className="mb-4 bg-primary-50 text-primary-700 border-transparent">
                      {post.category}
                    </Badge>
                    <h2 className="text-xl font-bold text-neutral-900 mb-3 leading-snug">
                      <Link
                        href={`/blog/${post.slug}`}
                        className="hover:text-primary-700 transition-colors"
                      >
                        {post.title}
                      </Link>
                    </h2>
                    <p className="text-neutral-700 mb-4 line-clamp-2">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <span className="text-sm text-neutral-500">
                        {post.date}
                      </span>
                      <Link
                        href={`/blog/${post.slug}`}
                        className="text-sm text-primary-600 inline-flex items-center gap-1 hover:underline"
                      >
                        Ler mais <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </article>
                ))}

                {posts.length === 0 && (
                  <div className="bg-white rounded-2xl border border-neutral-200 p-8 text-center text-neutral-500">
                    Nenhum post encontrado nesta categoria por enquanto.
                  </div>
                )}
              </div>

              {/* Paginação */}
              {totalPaginas > 1 && (
                <nav
                  className="mt-10 flex items-center justify-center gap-6 text-sm text-neutral-500"
                  aria-label="Paginação"
                >
                  {paginaAtual > 1 ? (
                    <Link
                      href={hrefDaPagina(paginaAtual - 1)}
                      className="text-primary-600 hover:underline"
                    >
                      &larr; Anterior
                    </Link>
                  ) : (
                    <span className="text-neutral-300 cursor-default select-none">
                      &larr; Anterior
                    </span>
                  )}
                  <span>
                    Página {paginaAtual} de {totalPaginas}
                  </span>
                  {paginaAtual < totalPaginas ? (
                    <Link
                      href={hrefDaPagina(paginaAtual + 1)}
                      className="text-primary-600 hover:underline"
                    >
                      Próxima &rarr;
                    </Link>
                  ) : (
                    <span className="text-neutral-300 cursor-default select-none">
                      Próxima &rarr;
                    </span>
                  )}
                </nav>
              )}
            </div>

            {/* Sidebar */}
            <BlogSidebar activeSlug={activeSlug} />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
