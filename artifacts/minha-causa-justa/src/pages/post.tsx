import { useEffect } from "react";
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

const CANONICAL_ORIGIN = "https://terapiaquecura.com.br";

/** Atualiza (ou cria) uma tag <meta> pelo seletor de atributo. */
function setMeta(selector: string, attr: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    const [attrName, attrVal] = selector.replace(/[\[\]']/g, "").split("=");
    el.setAttribute(attrName, attrVal);
    document.head.appendChild(el);
  }
  el.setAttribute(attr, content);
}

/** Atualiza (ou cria) a tag <link rel="canonical">. */
function setCanonical(href: string) {
  let el = document.querySelector<HTMLLinkElement>("link[rel='canonical']");
  if (!el) {
    el = document.createElement("link");
    el.rel = "canonical";
    document.head.appendChild(el);
  }
  el.href = href;
}

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

  // Atualiza title, meta description, canonical e OG tags para cada post
  useEffect(() => {
    if (!post) return;
    const description = post.excerpt ?? post.subtitle ?? "";
    const canonical = `${CANONICAL_ORIGIN}/blog/${post.slug}`;
    const image = post.coverImageUrl ?? `${CANONICAL_ORIGIN}/opengraph.webp`;

    document.title = `${post.title} | Terapia Que Cura`;
    setMeta("meta[name='description']", "content", description);
    setMeta("meta[property='og:title']", "content", post.title);
    setMeta("meta[property='og:description']", "content", description);
    setMeta("meta[property='og:image']", "content", image);
    setMeta("meta[property='og:type']", "content", "article");
    setMeta("meta[property='og:url']", "content", canonical);
    setMeta("meta[name='twitter:title']", "content", post.title);
    setMeta("meta[name='twitter:description']", "content", description);
    setMeta("meta[name='twitter:image']", "content", image);
    setCanonical(canonical);

    return () => {
      // Restaura os defaults ao sair da página do post
      document.title = "Terapia Que Cura";
      setMeta("meta[name='description']", "content", "Terapia Que Cura — encontre um psicólogo para cuidar da sua saúde mental.");
      setMeta("meta[property='og:title']", "content", "Terapia Que Cura");
      setMeta("meta[property='og:description']", "content", "Terapia Que Cura — encontre um psicólogo para cuidar da sua saúde mental.");
      setMeta("meta[property='og:image']", "content", `${CANONICAL_ORIGIN}/opengraph.webp`);
      setMeta("meta[property='og:type']", "content", "website");
      setMeta("meta[property='og:url']", "content", CANONICAL_ORIGIN);
      setMeta("meta[name='twitter:title']", "content", "Terapia Que Cura");
      setMeta("meta[name='twitter:description']", "content", "Terapia Que Cura — encontre um psicólogo para cuidar da sua saúde mental.");
      setMeta("meta[name='twitter:image']", "content", `${CANONICAL_ORIGIN}/opengraph.webp`);
      setCanonical(CANONICAL_ORIGIN);
    };
  }, [post]);

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

              {/* Tags de categoria e tema */}
              <div className="mb-4 flex flex-wrap gap-2">
                <Badge className="bg-primary-50 text-primary-700 border-transparent">
                  {post.category}
                </Badge>
                {post.subcategoria && (
                  <Badge className="bg-accent-50 text-accent-700 border border-accent-100">
                    {post.subcategoria}
                  </Badge>
                )}
              </div>

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

              {/* Imagem de capa (posts com foto temática do Pexels) */}
              {post.coverImageUrl && (
                <figure className="mt-8">
                  <img
                    src={post.coverImageUrl}
                    alt={post.coverImageAlt || post.title}
                    loading="lazy"
                    className="w-full aspect-[16/9] object-cover rounded-2xl border border-neutral-200"
                  />
                  {post.coverImageCredit && (
                    <figcaption className="mt-2 text-xs text-neutral-400">
                      Foto de{" "}
                      {post.coverImageCreditUrl ? (
                        <a
                          href={post.coverImageCreditUrl}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="hover:underline"
                        >
                          {post.coverImageCredit}
                        </a>
                      ) : (
                        post.coverImageCredit
                      )}{" "}
                      no Pexels
                    </figcaption>
                  )}
                </figure>
              )}

              {/* Divisória */}
              <hr className="my-8 border-neutral-200" />

              {/* Corpo do post */}
              {post.bodyHtml ? (
                <div
                  className="prose prose-neutral max-w-none prose-headings:text-primary-800 prose-headings:font-bold prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4 prose-p:text-neutral-700 prose-p:leading-loose prose-a:text-primary-600 prose-strong:text-neutral-800"
                  dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
                />
              ) : (
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
              )}

              {/* Encerramento padrão CFP (posts gerados) */}
              {post.crpClosing && (
                <div className="mt-10 rounded-2xl bg-primary-50 border border-primary-100 p-6">
                  <p className="text-neutral-700 leading-loose">
                    {post.crpClosing}
                  </p>
                </div>
              )}

              {/* Divisória final */}
              <hr className="my-8 border-neutral-200" />

              {/* Nota de rodapé do post */}
              <p className="text-sm text-neutral-500 italic">
                Este conteúdo tem caráter exclusivamente informativo e
                educativo. Não constitui diagnóstico, tratamento ou
                aconselhamento psicológico. Para orientação sobre sua situação
                específica, consulte um profissional de psicologia.
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
