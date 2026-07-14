import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, blogPostsTable } from "@workspace/db";

// Domínio canônico do site em produção. O sitemap precisa de URLs absolutas
// e o Google só aceita URLs do mesmo domínio verificado no Search Console.
const CANONICAL_ORIGIN = "https://terapiaquecura.com.br";

// Páginas públicas estáticas do SPA (rotas indexáveis; painel/admin/login ficam de fora).
const STATIC_PATHS = [
  "/",
  "/psicologos",
  "/cadastro",
  "/blog",
  "/quem-somos",
  "/termos-de-uso",
  "/politica-de-privacidade",
];

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const router: IRouter = Router();

// GET /api/sitemap.xml — sitemap dinâmico (páginas estáticas + posts do blog).
// Referenciado no robots.txt do site: "Sitemap: https://terapiaquecura.com.br/api/sitemap.xml".
router.get("/sitemap.xml", async (_req, res): Promise<void> => {
  const posts = await db
    .select({
      slug: blogPostsTable.slug,
      publishedAt: blogPostsTable.publishedAt,
      createdAt: blogPostsTable.createdAt,
    })
    .from(blogPostsTable)
    .where(eq(blogPostsTable.published, true))
    .orderBy(desc(blogPostsTable.createdAt));

  const urls: string[] = [];
  for (const path of STATIC_PATHS) {
    urls.push(`  <url><loc>${xmlEscape(`${CANONICAL_ORIGIN}${path}`)}</loc></url>`);
  }
  for (const p of posts) {
    const lastmod = (p.publishedAt ?? p.createdAt).toISOString().slice(0, 10);
    urls.push(
      `  <url><loc>${xmlEscape(`${CANONICAL_ORIGIN}/blog/${p.slug}`)}</loc><lastmod>${lastmod}</lastmod></url>`,
    );
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;
  res.set("Content-Type", "application/xml; charset=utf-8");
  res.set("Cache-Control", "public, max-age=3600");
  res.send(xml);
});

export default router;
