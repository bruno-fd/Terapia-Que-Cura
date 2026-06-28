import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { BLOG_CATEGORIES } from "@/data/blog";

interface BlogSidebarProps {
  // Categoria atualmente ativa (destacada na lista). Opcional.
  activeCategory?: string | null;
}

export function BlogSidebar({ activeCategory = null }: BlogSidebarProps) {
  return (
    <aside className="w-full lg:w-[300px] shrink-0 space-y-8">
      {/* Bloco 1 — Categorias */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-6">
        <h2 className="text-lg font-bold text-primary-800 mb-4">Categorias</h2>
        <ul className="divide-y divide-neutral-200">
          <li>
            <Link
              href="/blog"
              className={`block py-2.5 text-sm transition-colors hover:text-primary-600 ${
                !activeCategory
                  ? "text-primary-600 font-bold"
                  : "text-neutral-700"
              }`}
            >
              Todas as categorias
            </Link>
          </li>
          {BLOG_CATEGORIES.map((category) => {
            const isActive = activeCategory === category;
            return (
              <li key={category}>
                <Link
                  href={`/blog?categoria=${encodeURIComponent(category)}`}
                  className={`block py-2.5 text-sm transition-colors hover:text-primary-600 ${
                    isActive
                      ? "text-primary-600 font-bold"
                      : "text-neutral-700"
                  }`}
                >
                  {category}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Bloco 2 — Botão fixo de navegação (sempre genérico) */}
      <div className="bg-primary-50 rounded-2xl p-6">
        <p className="text-neutral-700 mb-4">Precisa de orientação jurídica?</p>
        <Button
          asChild
          className="w-full bg-primary-600 hover:bg-primary-700 text-white"
        >
          <Link href="/advogados">Encontrar um advogado</Link>
        </Button>
      </div>
    </aside>
  );
}
