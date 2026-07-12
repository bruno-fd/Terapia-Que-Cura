import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { CATEGORIAS } from "@/data/categories";

interface BlogSidebarProps {
  // Slug da categoria atualmente ativa (destacada na lista). Opcional.
  activeSlug?: string | null;
  // Quando true, o bloco CTA acompanha a rolagem (fixo durante a leitura)
  stickyCta?: boolean;
}

export function BlogSidebar({
  activeSlug = null,
  stickyCta = false,
}: BlogSidebarProps) {
  return (
    <aside
      className={`w-full lg:w-[300px] shrink-0 space-y-8 ${
        stickyCta ? "lg:self-stretch" : ""
      }`}
    >
      {/* Bloco 1 — Categorias */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-6">
        <h2 className="text-lg font-bold text-primary-800 mb-4">Categorias</h2>
        <ul className="divide-y divide-neutral-200">
          <li>
            <Link
              href="/blog"
              className={`block py-2.5 text-sm transition-colors hover:text-primary-600 ${
                !activeSlug
                  ? "text-primary-600 font-bold"
                  : "text-neutral-700"
              }`}
            >
              Todas as categorias
            </Link>
          </li>
          {CATEGORIAS.map((categoria) => {
            const isActive = activeSlug === categoria.slug;
            return (
              <li key={categoria.slug}>
                <Link
                  href={`/blog?categoria=${categoria.slug}`}
                  className={`block py-2.5 text-sm transition-colors hover:text-primary-600 ${
                    isActive
                      ? "text-primary-600 font-bold"
                      : "text-neutral-700"
                  }`}
                >
                  {categoria.nome}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Bloco 2 — Botão fixo de navegação (sempre genérico) */}
      <div
        className={`bg-primary-50 rounded-2xl p-6 ${
          stickyCta ? "lg:sticky lg:top-24" : ""
        }`}
      >
        <p className="text-neutral-700 mb-4">Precisa de apoio psicológico?</p>
        <Button
          asChild
          className="w-full bg-primary-600 hover:bg-primary-700 text-white"
        >
          <Link href="/psicologos">Encontrar um psicólogo</Link>
        </Button>
      </div>
    </aside>
  );
}
