import { Link, useRoute } from "wouter";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BlogSidebar } from "@/components/BlogSidebar";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import { getPostBySlug } from "@/data/blog";
import { usePublishedPosts } from "@/data/published-posts";
import { slugDaCategoria } from "@/data/categories";
import NotFound from "@/pages/not-found";

export default function Post() {
  const [, params] = useRoute("/blog/:slug");
  const slug = params?.slug;

  // Resolve o post tanto nos fixos quanto nos gerados no painel /admin
  const { posts: generatedPosts, isLoading } = usePublishedPosts();
  const generatedPost = slug
    ? generatedPosts.find((p) => p.slug === slug)
    : undefined;
  const staticPost = slug ? getPostBySlug(slug) : undefined;
  // Post gerado tem precedência sobre o fixo em caso de slug repetido
  const post = generatedPost ?? staticPost;

  // Enquanto os posts gerados carregam, evita um 404 prematuro
  if (!post) {
    if (isLoading) {
      return (
        <div className="min-h-screen bg-[#F5F4F2]">
          <Navbar />
          <main className="container mx-auto px-6 max-w-[1200px] py-24 text-center text-neutral-500">
            Carregando post...
          </main>
          <Footer />
        </div>
      );
    }
    return <NotFound />;
  }

  return (
    <div className="min-h-screen bg-[#F5F4F2]">
      <Navbar />

      <main>
        <div className="container mx-auto px-6 max-w-[1200px] pt-8 pb-16 md:pt-10 md:pb-24">
          {/* Layout de duas colunas */}
          <div className="flex flex-col lg:flex-row gap-10 lg:gap-12 items-start">
            {/* Coluna principal — conteúdo do post */}
            <article className="flex-1 w-full max-w-[760px]">
              {/* Breadcrumb */}
              <nav
                className="flex items-center flex-wrap gap-1 text-sm text-neutral-500 mb-5"
                aria-label="Você está em"
              >
                <Link href="/blog" className="text-primary-600 hover:underline">
                  Blog
                </Link>
                <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                <Link
                  href={`/blog?categoria=${slugDaCategoria(post.category) ?? ""}`}
                  className="text-primary-600 hover:underline"
                >
                  {post.category}
                </Link>
                <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                <span className="text-neutral-500 line-clamp-1">
                  {post.title}
                </span>
              </nav>

              {/* Tag de categoria */}
              <Badge className="mb-4 bg-primary-50 text-primary-700 border-transparent">
                {post.category}
              </Badge>

              {/* Título */}
              <h1 className="text-2xl md:text-3xl font-bold text-primary-900 leading-tight mb-4">
                {post.title}
              </h1>

              {/* Subtítulo/chamada (posts gerados) */}
              {post.subtitle && (
                <p className="text-lg text-neutral-600 leading-relaxed mb-4">
                  {post.subtitle}
                </p>
              )}

              {/* Meta */}
              <p className="text-sm text-neutral-500">
                Publicado em {post.date} &middot; Leitura de aproximadamente{" "}
                {post.readingMinutes} minutos
              </p>

              {/* Palavras-chave (posts gerados) */}
              {post.keywords && post.keywords.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {post.keywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="text-xs text-neutral-600 bg-neutral-100 border border-neutral-200 rounded-full px-3 py-1"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              )}

              {/* Divisória */}
              <hr className="my-8 border-neutral-200" />

              {/* Corpo do post */}
              <div className="space-y-6">
                {post.body.map((section, index) => (
                  <section key={index}>
                    {section.heading && (
                      <h2 className="text-xl font-bold text-primary-800 mt-10 mb-4">
                        {section.heading}
                      </h2>
                    )}
                    {section.paragraphs.map((paragraph, pIndex) => (
                      <p
                        key={pIndex}
                        className="text-neutral-700 leading-loose mb-4"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </section>
                ))}
              </div>

              {/* Encerramento padrão OAB (posts gerados) */}
              {post.oabClosing && (
                <div className="mt-10 rounded-2xl bg-primary-50 border border-primary-100 p-6">
                  <p className="text-neutral-700 leading-loose">
                    {post.oabClosing}
                  </p>
                </div>
              )}

              {/* Divisória final */}
              <hr className="my-8 border-neutral-200" />

              {/* Nota de rodapé do post */}
              <p className="text-sm text-neutral-500 italic">
                Este conteúdo tem caráter exclusivamente informativo e
                educativo. Não constitui aconselhamento jurídico. Para orientação
                sobre sua situação específica, consulte um profissional do
                direito.
              </p>
            </article>

            {/* Sidebar */}
            <BlogSidebar activeSlug={slugDaCategoria(post.category) ?? null} stickyCta />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
