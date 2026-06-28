import { Link, useSearch } from "wouter";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BlogSidebar } from "@/components/BlogSidebar";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { BLOG_POSTS } from "@/data/blog";

export default function Blog() {
  // Lê a categoria do query param (?categoria=...) para filtrar os cards
  const search = useSearch();
  const params = new URLSearchParams(search);
  const activeCategory = params.get("categoria");

  const posts = activeCategory
    ? BLOG_POSTS.filter((post) => post.category === activeCategory)
    : BLOG_POSTS;

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
              Informações sobre direitos do cidadão, escritas de forma simples e
              direta.
            </p>
          </header>

          {/* Layout de duas colunas */}
          <div className="flex flex-col lg:flex-row gap-10 lg:gap-12 items-start">
            {/* Coluna principal — lista de posts */}
            <div className="flex-1 w-full">
              {activeCategory && (
                <p className="text-sm text-neutral-500 mb-6">
                  Mostrando posts da categoria{" "}
                  <span className="font-bold text-primary-600">
                    {activeCategory}
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
                {posts.map((post) => (
                  <article
                    key={post.slug}
                    className="bg-white rounded-2xl border border-neutral-200 p-6 md:p-8 transition-shadow hover:shadow-md"
                  >
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

              {/* Paginação simples (visual) */}
              <nav
                className="mt-10 flex items-center justify-center gap-6 text-sm text-neutral-500"
                aria-label="Paginação"
              >
                <span className="text-primary-600 cursor-default select-none">
                  &larr; Anterior
                </span>
                <span>Página 1 de 3</span>
                <span className="text-primary-600 cursor-default select-none">
                  Próxima &rarr;
                </span>
              </nav>
            </div>

            {/* Sidebar */}
            <BlogSidebar activeCategory={activeCategory} />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
