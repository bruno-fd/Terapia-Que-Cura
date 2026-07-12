import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListPublishedPostsQueryKey,
  type BlogPost as ApiBlogPost,
} from "@workspace/api-client-react";
import {
  Eye,
  EyeOff,
  Loader2,
  Lightbulb,
  PenLine,
  Pencil,
  Send,
  Save,
  X,
  Trash2,
  ChevronDown,
  LogOut,
  ExternalLink,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from "@/components/RichTextEditor";
import { BLOG_CATEGORIES } from "@/data/blog";
import { subcategoriasDaCategoria } from "@/data/categories";
import {
  generateIdeas as apiGenerateIdeas,
  createPost as apiCreatePost,
  listAdminPosts as apiListAdminPosts,
  updatePost as apiUpdatePost,
  deletePost as apiDeletePost,
  listAdminPsicologos as apiListAdminPsicologos,
  getAdminPsicologo as apiGetAdminPsicologo,
  updateAdminPsicologo as apiUpdateAdminPsicologo,
  listBlogDailyRuns as apiListBlogDailyRuns,
} from "@/lib/admin";
import type {
  AdminPsicologo,
  AdminPsicologoDetail,
  BlogDailyRunsResponse,
} from "@workspace/api-client-react";

const ERROR_COLOR = "#C0392B";
const SUCCESS_COLOR = "#1E7D4F";
const WARNING_COLOR = "#B97D00";

// Base da aplicação (prefixo de rota do artifact), usada nos redirecionamentos
// do login. import.meta.env.BASE_URL já vem com barra final.
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// Lista de e-mails com acesso ao painel. Espelha o allowlist do back-end
// (requireAdmin), aqui apenas para UX: quem decide o acesso é o servidor.
const ADMIN_EMAILS = ["bf.damasio@gmail.com"];

function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.some(
    (e) => e.toLowerCase() === email.trim().toLowerCase(),
  );
}

function formatDatePtBr(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

// runDate vem como "YYYY-MM-DD". new Date() interpretaria como UTC meia-noite e
// deslocaria o dia no fuso do Brasil, então fixamos o meio-dia local.
function formatRunDatePtBr(runDate: string): string {
  return formatDatePtBr(`${runDate}T12:00:00`);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Fallback para posts antigos sem bodyHtml: monta o HTML a partir das
// seções estruturadas (body) para o editor poder recuperar o conteúdo.
function sectionsToHtml(body: ApiBlogPost["body"]): string {
  const parts: string[] = [];
  for (const section of body) {
    if (section.heading) {
      parts.push(`<h2>${escapeHtml(section.heading)}</h2>`);
    }
    for (const p of section.paragraphs) {
      parts.push(`<p>${escapeHtml(p)}</p>`);
    }
  }
  return parts.join("");
}

function initialBodyHtml(post: ApiBlogPost): string {
  return post.bodyHtml && post.bodyHtml.trim()
    ? post.bodyHtml
    : sectionsToHtml(post.body);
}

// ============================================================
// Gate de acesso
// ============================================================
// Tela de login do admin: autenticação real e segura, totalmente separada da
// base de psicólogos. Não há senha compartilhada; o acesso é liberado apenas
// para e-mails autorizados (validado no back-end).
function AdminLogin({ onEntrar }: { onEntrar: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-100 px-4 py-12">
      <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-neutral-200 p-8 text-center">
        <h1 className="text-xl font-bold text-primary-800">
          Painel administrativo
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          Acesso restrito. Entre com uma conta autorizada para continuar.
        </p>

        <Button
          onClick={onEntrar}
          className="mt-6 w-full h-12 bg-primary-600 hover:bg-primary-700 text-white text-base font-medium rounded-lg"
          data-testid="button-admin-entrar"
        >
          Entrar
        </Button>

        <div className="mt-4">
          <Link
            href="/"
            className="text-sm text-primary-500 hover:text-primary-600"
          >
            Voltar para o site
          </Link>
        </div>
      </div>
    </div>
  );
}

// Conta autenticada, porém sem permissão de administrador.
function AdminNaoAutorizado({
  email,
  onSair,
}: {
  email: string | null;
  onSair: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-100 px-4 py-12">
      <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-neutral-200 p-8 text-center">
        <h1 className="text-xl font-bold text-primary-800">
          Acesso não autorizado
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          {email ? (
            <>
              A conta <span className="font-medium">{email}</span> não tem
              permissão para acessar o painel administrativo.
            </>
          ) : (
            "Esta conta não tem permissão para acessar o painel administrativo."
          )}
        </p>

        <Button
          onClick={onSair}
          className="mt-6 w-full h-12 bg-primary-600 hover:bg-primary-700 text-white text-base font-medium rounded-lg"
          data-testid="button-admin-sair"
        >
          Sair e usar outra conta
        </Button>

        <div className="mt-4">
          <Link
            href="/"
            className="text-sm text-primary-500 hover:text-primary-600"
          >
            Voltar para o site
          </Link>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Painel de regras (colapsável)
// ============================================================
function RulesPanel() {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-2xl border border-neutral-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <span className="font-bold text-primary-800">
          Regras editoriais e do CFP
        </span>
        <ChevronDown
          className={`h-5 w-5 text-neutral-500 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 text-sm text-neutral-600 space-y-3 leading-relaxed">
          <p>
            <span className="font-bold text-neutral-800">Estrutura:</span>{" "}
            título de até 70 caracteres, subtítulo, introdução, 3 a 5 seções com
            subtítulo, encerramento padrão CFP. Entre 600 e 900 palavras.
          </p>
          <p>
            <span className="font-bold text-neutral-800">Linguagem:</span>{" "}
            simples e direta. Todo termo técnico é explicado logo após o uso.
            Nunca usar travessão.
          </p>
          <p>
            <span className="font-bold text-neutral-800">CFP:</span> nunca
            diagnosticar o leitor a distância, nunca afirmar que ele precisa de
            tratamento, nunca citar um psicólogo específico e nunca prometer
            resultado terapêutico.
          </p>
          <p>
            <span className="font-bold text-neutral-800">Encerramento:</span>{" "}
            informa que, se o leitor se identificou com a situação, pode ser
            importante conversar com um psicólogo, e que existem profissionais
            especializados no tema. Posts sobre ideação suicida, automutilação
            ou abuso incluem a orientação de segurança do CVV (188).
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Editor de um post (rascunho recém-gerado ou post existente)
// ============================================================
function PostEditor({
  post,
  saving,
  onSave,
  onClose,
}: {
  post: ApiBlogPost;
  saving: boolean;
  onSave: (
    input: {
      title: string;
      subtitle: string;
      excerpt: string;
      category: string;
      subcategoria: string | null;
      bodyHtml: string;
    },
    publishedOverride?: boolean,
  ) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(post.title);
  const [subtitle, setSubtitle] = useState(post.subtitle);
  const [excerpt, setExcerpt] = useState(post.excerpt);
  const [category, setCategory] = useState(post.category);
  const [subcategoria, setSubcategoria] = useState(post.subcategoria ?? "");
  const [bodyHtml, setBodyHtml] = useState(() => initialBodyHtml(post));

  // Reinicializa o formulário quando outro post é aberto no editor.
  useEffect(() => {
    setTitle(post.title);
    setSubtitle(post.subtitle);
    setExcerpt(post.excerpt);
    setCategory(post.category);
    setSubcategoria(post.subcategoria ?? "");
    setBodyHtml(initialBodyHtml(post));
  }, [post.id]);

  // Temas disponíveis para a macrocategoria selecionada.
  const subOptions = subcategoriasDaCategoria(category);

  // Ao trocar de macrocategoria, limpa o tema se ele não pertence à nova área.
  const handleCategoryChange = (nova: string) => {
    setCategory(nova);
    if (subcategoria && !subcategoriasDaCategoria(nova).includes(subcategoria)) {
      setSubcategoria("");
    }
  };

  const collect = () => ({
    title: title.trim(),
    subtitle: subtitle.trim(),
    excerpt: excerpt.trim(),
    category,
    subcategoria: subcategoria || null,
    bodyHtml,
  });

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
        <div className="flex items-center gap-3">
          <Badge
            className="border-transparent text-white"
            style={{
              backgroundColor: post.published ? SUCCESS_COLOR : WARNING_COLOR,
            }}
          >
            {post.published ? "Publicado" : "Rascunho"}
          </Badge>
          <span className="text-sm text-neutral-500">
            Leitura de aproximadamente {post.readingMinutes} minutos
          </span>
        </div>
        <div className="flex items-center gap-3">
          {post.published && (
            <Link
              href={`/blog/${post.slug}`}
              className="text-sm text-primary-600 hover:underline inline-flex items-center gap-1"
            >
              Ver no site <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          )}
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-neutral-500 hover:text-neutral-700 inline-flex items-center gap-1"
            data-testid="button-fechar-editor"
          >
            <X className="h-4 w-4" /> Fechar
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-neutral-700 mb-1.5">
            Título
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full h-11 px-4 rounded-lg border border-neutral-300 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            data-testid="input-editor-titulo"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-neutral-700 mb-1.5">
            Subtítulo
          </label>
          <input
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            className="w-full h-11 px-4 rounded-lg border border-neutral-300 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            data-testid="input-editor-subtitulo"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-neutral-700 mb-1.5">
              Categoria
            </label>
            <select
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-neutral-300 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              data-testid="select-editor-categoria"
            >
              {BLOG_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-neutral-700 mb-1.5">
              Tema (opcional)
            </label>
            <select
              value={subcategoria}
              onChange={(e) => setSubcategoria(e.target.value)}
              disabled={subOptions.length === 0}
              className="w-full h-11 px-3 rounded-lg border border-neutral-300 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-neutral-100 disabled:text-neutral-400"
              data-testid="select-editor-subcategoria"
            >
              <option value="">Sem tema específico</option>
              {subOptions.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-neutral-700 mb-1.5">
              Resumo (aparece no card da listagem)
            </label>
            <input
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              className="w-full h-11 px-4 rounded-lg border border-neutral-300 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              data-testid="input-editor-resumo"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-neutral-700 mb-1.5">
            Conteúdo
          </label>
          <RichTextEditor value={bodyHtml} onChange={setBodyHtml} />
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mt-6">
        {post.published ? (
          <>
            <Button
              type="button"
              onClick={() => onSave(collect())}
              disabled={saving}
              className="h-11 rounded-lg bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50"
              data-testid="button-salvar"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar alterações
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onSave(collect(), false)}
              disabled={saving}
              className="h-11 rounded-lg border-neutral-300 disabled:opacity-50"
              data-testid="button-despublicar"
            >
              <EyeOff className="h-4 w-4 mr-2" /> Despublicar
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              onClick={() => onSave(collect(), true)}
              disabled={saving}
              className="h-11 rounded-lg bg-accent-600 hover:bg-accent-700 text-white disabled:opacity-50"
              data-testid="button-publicar"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Publicar
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onSave(collect())}
              disabled={saving}
              className="h-11 rounded-lg border-neutral-300 disabled:opacity-50"
              data-testid="button-salvar-rascunho"
            >
              <Save className="h-4 w-4 mr-2" /> Salvar rascunho
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Métrica da publicação automática diária
// ============================================================
function runStatusInfo(status: string): { label: string; color: string } {
  switch (status) {
    case "published":
      return { label: "Publicado", color: SUCCESS_COLOR };
    case "rejected":
      return { label: "Reprovado", color: ERROR_COLOR };
    case "skipped":
      return { label: "Pulado", color: "#6B7280" };
    case "failed":
      return { label: "Falha", color: WARNING_COLOR };
    default:
      return { label: status, color: "#6B7280" };
  }
}

function DailyRunsPanel() {
  const [data, setData] = useState<BlogDailyRunsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [detalhes, setDetalhes] = useState(false);

  useEffect(() => {
    let ativo = true;
    void (async () => {
      try {
        const res = await apiListBlogDailyRuns();
        if (ativo) setData(res);
      } catch (e) {
        if (ativo) {
          setErro(
            e instanceof Error ? e.message : "Erro ao carregar a métrica.",
          );
        }
      } finally {
        if (ativo) setLoading(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, []);

  const TOTAL_CATEGORIAS = 12;
  const latest = data?.latest ?? null;
  const resumoUltimo = data?.days?.[0] ?? null;

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
        <h2 className="font-bold text-primary-800">Publicação automática diária</h2>
        {latest && latest.items.length > 0 && (
          <button
            type="button"
            onClick={() => setDetalhes((v) => !v)}
            className="text-sm text-primary-600 hover:underline"
            data-testid="button-toggle-detalhes-diario"
          >
            {detalhes ? "Ocultar detalhes" : "Ver detalhes"}
          </button>
        )}
      </div>
      <p className="text-sm text-neutral-500 mb-4">
        Um post por categoria por dia, publicado só depois de passar na
        verificação de veracidade. Quando reprovado, o revisor tenta corrigir o
        texto antes de publicar; só é descartado se a correção não resolver.
      </p>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-neutral-500 py-4">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando métrica...
        </div>
      )}

      {!loading && erro && (
        <p className="text-sm" style={{ color: ERROR_COLOR }}>
          {erro}
        </p>
      )}

      {!loading && !erro && !resumoUltimo && (
        <p className="text-sm text-neutral-500">
          Ainda não há execuções automáticas registradas.
        </p>
      )}

      {!loading && !erro && resumoUltimo && (
        <>
          <div className="rounded-xl border border-neutral-200 p-4 mb-4">
            <p className="text-sm text-neutral-500">
              Última execução: {formatRunDatePtBr(resumoUltimo.runDate)}
            </p>
            <p className="mt-1">
              <span
                className="text-2xl font-bold"
                style={{ color: SUCCESS_COLOR }}
                data-testid="text-taxa-aceitacao"
              >
                {resumoUltimo.published} de {TOTAL_CATEGORIAS}
              </span>{" "}
              <span className="text-sm text-neutral-600">posts publicados</span>
            </p>
            <div className="flex flex-wrap gap-2 mt-3 text-xs">
              <span
                className="px-2 py-1 rounded-full text-white"
                style={{ backgroundColor: ERROR_COLOR }}
              >
                {resumoUltimo.rejected} reprovados
              </span>
              <span className="px-2 py-1 rounded-full bg-neutral-200 text-neutral-700">
                {resumoUltimo.skipped} pulados
              </span>
              {resumoUltimo.failed > 0 && (
                <span
                  className="px-2 py-1 rounded-full text-white"
                  style={{ backgroundColor: WARNING_COLOR }}
                >
                  {resumoUltimo.failed} falhas
                </span>
              )}
            </div>
            {resumoUltimo.corrected > 0 && (
              <p className="text-xs text-neutral-500 mt-2">
                {resumoUltimo.corrected} publicado(s) após correção automática do
                revisor.
              </p>
            )}
          </div>

          {detalhes && latest && latest.items.length > 0 && (
            <ul className="space-y-2 mb-4">
              {latest.items.map((item) => {
                const info = runStatusInfo(item.status);
                return (
                  <li
                    key={`${item.category}-${item.createdAt}`}
                    className="border border-neutral-200 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-sm font-medium text-neutral-800">
                        {item.category}
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: info.color }}
                      >
                        {info.label}
                      </span>
                    </div>
                    {item.title && (
                      <p className="text-sm text-neutral-600 mt-1">
                        {item.title}
                      </p>
                    )}
                    {item.reason && (
                      <p className="text-xs text-neutral-500 mt-1">
                        {item.reason}
                      </p>
                    )}
                    {item.correctionRounds > 0 && (
                      <p
                        className="text-xs mt-1"
                        style={{ color: WARNING_COLOR }}
                      >
                        Corrigido pelo revisor: {item.correctionRounds}{" "}
                        rodada(s).
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {data && data.days.length > 1 && (
            <div className="border-t border-neutral-200 pt-3">
              <p className="text-xs font-bold text-neutral-600 mb-2">
                Histórico
              </p>
              <ul className="space-y-1">
                {data.days.map((d) => (
                  <li
                    key={d.runDate}
                    className="flex items-center justify-between text-sm text-neutral-600"
                  >
                    <span>{formatRunDatePtBr(d.runDate)}</span>
                    <span>
                      {d.published}/{TOTAL_CATEGORIAS} publicados
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================
// Painel principal do gerador + editor
// ============================================================
function BlogPanel() {
  const queryClient = useQueryClient();

  const [category, setCategory] = useState<string>("");
  const [theme, setTheme] = useState("");

  const [ideas, setIdeas] = useState<string[]>([]);
  const [loadingIdeas, setLoadingIdeas] = useState(false);
  const [loadingPost, setLoadingPost] = useState(false);
  const [error, setError] = useState("");

  const [adminPosts, setAdminPosts] = useState<ApiBlogPost[]>([]);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [editing, setEditing] = useState<ApiBlogPost | null>(null);
  const [saving, setSaving] = useState(false);

  // Filtros da lista de posts
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filterFrom, setFilterFrom] = useState<string>("");
  const [filterTo, setFilterTo] = useState<string>("");

  const refreshAdminPosts = async () => {
    try {
      const list = await apiListAdminPosts();
      setAdminPosts(list);
    } catch {
      // silencioso: a lista de gestão é secundária
    }
  };

  useEffect(() => {
    void refreshAdminPosts();
  }, []);

  const invalidatePublic = () => {
    queryClient.invalidateQueries({
      queryKey: getListPublishedPostsQueryKey(),
    });
  };

  const handleGenerateIdeas = async () => {
    if (!category) {
      setError("Selecione uma macrocategoria primeiro.");
      return;
    }
    setError("");
    setLoadingIdeas(true);
    setIdeas([]);
    try {
      const result = await apiGenerateIdeas(category);
      setIdeas(result.ideas);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar ideias.");
    } finally {
      setLoadingIdeas(false);
    }
  };

  const handleWritePost = async () => {
    if (!category) {
      setError(
        "Selecione uma macrocategoria para o post ficar no local correto.",
      );
      return;
    }
    if (!theme.trim()) {
      setError("Escolha uma ideia ou digite um tema.");
      return;
    }
    setError("");
    setLoadingPost(true);
    try {
      // Cria um rascunho: o post não vai ao ar até o admin clicar em Publicar.
      const created = await apiCreatePost(category, theme.trim());
      setEditing(created);
      await refreshAdminPosts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar o post.");
    } finally {
      setLoadingPost(false);
    }
  };

  const handleSave = async (
    input: {
      title: string;
      subtitle: string;
      excerpt: string;
      category: string;
      subcategoria: string | null;
      bodyHtml: string;
    },
    publishedOverride?: boolean,
  ) => {
    if (!editing) return;
    setError("");
    setSaving(true);
    try {
      const updated = await apiUpdatePost(editing.id, {
        ...input,
        ...(publishedOverride !== undefined
          ? { published: publishedOverride }
          : {}),
      });
      setEditing(updated);
      await refreshAdminPosts();
      invalidatePublic();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar o post.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await apiDeletePost(id);
      if (editing?.id === id) setEditing(null);
      invalidatePublic();
      await refreshAdminPosts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir o post.");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredPosts = useMemo(() => {
    return adminPosts.filter((p) => {
      if (filterCategory && p.category !== filterCategory) return false;
      // O filtro de data usa a data de publicação. Rascunhos (sem
      // publishedAt) ficam de fora quando um intervalo de datas é aplicado.
      if (filterFrom || filterTo) {
        if (!p.publishedAt) return false;
        const published = new Date(p.publishedAt);
        if (filterFrom) {
          const from = new Date(`${filterFrom}T00:00:00`);
          if (published < from) return false;
        }
        if (filterTo) {
          const to = new Date(`${filterTo}T23:59:59`);
          if (published > to) return false;
        }
      }
      return true;
    });
  }, [adminPosts, filterCategory, filterFrom, filterTo]);

  const hasFilters = filterCategory || filterFrom || filterTo;

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Painel de entrada */}
          <div className="w-full lg:w-[420px] shrink-0 space-y-6">
            {/* Bloco 1 — Macrotemas */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
              <h2 className="font-bold text-primary-800 mb-1">Macrocategoria</h2>
              <p className="text-sm text-neutral-500 mb-4">
                A categoria escolhida define onde o post aparece no blog.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {BLOG_CATEGORIES.map((cat) => {
                  const active = category === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`text-left text-sm px-3 py-2.5 rounded-lg border transition-colors ${
                        active
                          ? "bg-primary-600 text-white border-primary-600"
                          : "bg-white text-neutral-700 border-neutral-300 hover:border-primary-400"
                      }`}
                      data-testid={`button-macro-${cat}`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              <Button
                type="button"
                onClick={handleGenerateIdeas}
                disabled={!category || loadingIdeas}
                className="w-full h-11 mt-4 bg-accent-600 hover:bg-accent-700 text-white rounded-lg disabled:opacity-50"
                data-testid="button-gerar-ideias"
              >
                {loadingIdeas ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando
                    ideias...
                  </>
                ) : (
                  <>
                    <Lightbulb className="h-4 w-4 mr-2" /> Gerar 10 ideias de post
                  </>
                )}
              </Button>

              {ideas.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {ideas.map((idea) => (
                    <li key={idea}>
                      <button
                        type="button"
                        onClick={() => setTheme(idea)}
                        className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition-colors ${
                          theme === idea
                            ? "border-primary-500 bg-primary-50 text-primary-800"
                            : "border-neutral-200 hover:border-primary-300 text-neutral-700"
                        }`}
                      >
                        {idea}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Bloco 2 — Tema livre */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
              <h2 className="font-bold text-primary-800 mb-1">Tema do post</h2>
              <p className="text-sm text-neutral-500 mb-4">
                Escolha uma ideia acima ou escreva um tema livre. O post é criado
                como rascunho para você revisar antes de publicar.
              </p>
              <textarea
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                rows={3}
                placeholder="Ex.: pensão por morte, auxílio doença negado, voo cancelado direitos"
                className="w-full px-4 py-3 rounded-lg border border-neutral-300 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-y"
                data-testid="input-tema"
              />

              <Button
                type="button"
                onClick={handleWritePost}
                disabled={loadingPost}
                className="w-full h-12 mt-4 bg-primary-600 hover:bg-primary-700 text-white text-base rounded-lg disabled:opacity-50"
                data-testid="button-escrever-post"
              >
                {loadingPost ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Escrevendo
                    rascunho...
                  </>
                ) : (
                  <>
                    <PenLine className="h-5 w-5 mr-2" /> Gerar rascunho
                  </>
                )}
              </Button>

              {error && (
                <p className="text-sm mt-3" style={{ color: ERROR_COLOR }}>
                  {error}
                </p>
              )}
            </div>

            <RulesPanel />
          </div>

          {/* Painel de saída: editor + gestão */}
          <div className="flex-1 w-full min-w-0 space-y-6">
            <DailyRunsPanel />
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 md:p-8">
              {!editing && !loadingPost && (
                <div className="text-center text-neutral-500 py-16">
                  <PenLine className="h-10 w-10 mx-auto mb-4 text-neutral-300" />
                  <p>
                    Gere um rascunho ou selecione um post da lista para editar.
                    Nada vai ao ar até você clicar em Publicar.
                  </p>
                </div>
              )}

              {loadingPost && (
                <div className="text-center text-neutral-500 py-16">
                  <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-primary-500" />
                  <p>Gerando o rascunho seguindo as regras editoriais e do CFP...</p>
                </div>
              )}

              {editing && !loadingPost && (
                <PostEditor
                  key={editing.id}
                  post={editing}
                  saving={saving}
                  onSave={handleSave}
                  onClose={() => setEditing(null)}
                />
              )}
            </div>

            {/* Gestão de posts */}
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                <h2 className="font-bold text-primary-800">
                  Posts ({filteredPosts.length}
                  {hasFilters ? ` de ${adminPosts.length}` : ""})
                </h2>
              </div>

              {/* Filtros */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                <div>
                  <label className="block text-xs font-bold text-neutral-600 mb-1">
                    Categoria
                  </label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-neutral-300 bg-white text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    data-testid="select-filtro-categoria"
                  >
                    <option value="">Todas</option>
                    {BLOG_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-600 mb-1">
                    Publicado de
                  </label>
                  <input
                    type="date"
                    value={filterFrom}
                    onChange={(e) => setFilterFrom(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-neutral-300 bg-white text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    data-testid="input-filtro-de"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-600 mb-1">
                    Publicado até
                  </label>
                  <input
                    type="date"
                    value={filterTo}
                    onChange={(e) => setFilterTo(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-neutral-300 bg-white text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    data-testid="input-filtro-ate"
                  />
                </div>
              </div>

              {hasFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterCategory("");
                    setFilterFrom("");
                    setFilterTo("");
                  }}
                  className="text-xs text-primary-600 hover:underline mb-3"
                >
                  Limpar filtros
                </button>
              )}

              {filteredPosts.length === 0 ? (
                <p className="text-sm text-neutral-500 py-6 text-center">
                  Nenhum post encontrado com os filtros atuais.
                </p>
              ) : (
                <ul className="divide-y divide-neutral-200">
                  {filteredPosts.map((p) => (
                    <li
                      key={p.id}
                      className="py-3 flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            className="border-transparent text-white text-[11px]"
                            style={{
                              backgroundColor: p.published
                                ? SUCCESS_COLOR
                                : WARNING_COLOR,
                            }}
                          >
                            {p.published ? "Publicado" : "Rascunho"}
                          </Badge>
                          <span className="text-sm font-medium text-neutral-800 line-clamp-1">
                            {p.title}
                          </span>
                        </div>
                        <span className="text-xs text-neutral-500">
                          {p.category} &middot;{" "}
                          {p.publishedAt
                            ? `Publicado em ${formatDatePtBr(p.publishedAt)}`
                            : `Criado em ${formatDatePtBr(p.createdAt)}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditing(p)}
                          className="text-sm text-primary-600 hover:text-primary-800 inline-flex items-center gap-1"
                          data-testid={`button-editar-${p.id}`}
                        >
                          <Pencil className="h-4 w-4" /> Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id)}
                          disabled={deletingId === p.id}
                          className="text-neutral-400 hover:text-[#C0392B] disabled:opacity-50"
                          aria-label="Excluir post"
                          data-testid={`button-excluir-${p.id}`}
                        >
                          {deletingId === p.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
  );
}

// ============================================================
// Aba "Verificação": gestão manual de psicólogos
// ============================================================
type SituacaoCrp = "regular" | "irregular" | "invalido";

function mascararCpf(cpf: string | null | undefined): string {
  if (!cpf) return "Não informado";
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11) return "Não informado";
  return `${d.slice(0, 3)}.***.***-${d.slice(-2)}`;
}

function pagamentoBadge(status: string | null | undefined): {
  label: string;
  bg: string;
  color: string;
} {
  switch (status) {
    case "ativa":
      return { label: "Ativo", bg: "#E4F1EA", color: SUCCESS_COLOR };
    case "atrasada":
      return { label: "Atrasado", bg: "#F6ECD6", color: WARNING_COLOR };
    case "inativa":
      return { label: "Inativo", bg: "#F1F1F1", color: "#6B7280" };
    case "pendente":
      return { label: "Pendente", bg: "#F1F1F1", color: "#6B7280" };
    default:
      return { label: "—", bg: "#F1F1F1", color: "#9CA3AF" };
  }
}

const ACAO_LABEL: Record<string, string> = {
  perfil_ativado: "Perfil ativado",
  perfil_desativado: "Perfil desativado",
  marcado_verificado: "Marcado como verificado",
  marcado_nao_verificado: "Marcado como não verificado",
  situacao_regular: "Situação definida: Regular",
  situacao_irregular: "Situação definida: Irregular",
  situacao_invalido: "Situação definida: Inválido",
};

// Toggle on/off compacto reutilizável.
function Toggle({
  checked,
  disabled,
  onColor,
  onClick,
  label,
  testId,
}: {
  checked: boolean;
  disabled?: boolean;
  onColor: string;
  onClick: () => void;
  label: string;
  testId?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={onClick}
        data-testid={testId}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
        }`}
        style={{ backgroundColor: checked ? onColor : "#D1D5DB" }}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </button>
      <span className="text-xs text-neutral-600 whitespace-nowrap">{label}</span>
    </div>
  );
}

// Modal de detalhes de um psicólogo.
function DetalheModal({
  detail,
  loading,
  onClose,
}: {
  detail: AdminPsicologoDetail | null;
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-[600px] max-h-[90vh] overflow-y-auto bg-white rounded-2xl border border-neutral-200 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
        <div className="flex items-center justify-between p-5 border-b border-neutral-200">
          <h3 className="font-bold text-primary-800">Detalhes do psicólogo</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-700"
            aria-label="Fechar"
            data-testid="button-fechar-detalhe"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading || !detail ? (
          <div className="py-16 text-center text-neutral-500">
            <Loader2 className="h-6 w-6 mx-auto mb-3 animate-spin text-primary-500" />
            Carregando...
          </div>
        ) : (
          <div className="p-5 space-y-4 text-sm">
            <div>
              <p className="text-xs font-bold text-neutral-500">Nome</p>
              <p className="text-neutral-900">{detail.nome}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-bold text-neutral-500">E-mail</p>
                <p className="text-neutral-900 break-all">
                  {detail.email || "Não informado"}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-neutral-500">CPF</p>
                <p className="text-neutral-900">{mascararCpf(detail.cpf)}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-neutral-500">CRP</p>
                <p className="text-neutral-900">{detail.crp || "Não informado"}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-neutral-500">Cadastro</p>
                <p className="text-neutral-900">
                  {detail.createdAt ? formatDatePtBr(detail.createdAt) : "—"}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-neutral-500">
                Cidades de atendimento
              </p>
              <p className="text-neutral-900">
                {detail.cidades.length > 0
                  ? detail.cidades
                      .map((c) => `${c.nome}/${c.uf}`)
                      .join(", ")
                  : "Não informado"}
                {detail.atendeOnline ? " · Atende online" : ""}
              </p>
            </div>

            <div>
              <p className="text-xs font-bold text-neutral-500 mb-1">
                Categorias
              </p>
              {detail.areas.length > 0 ? (
                <div className="space-y-2">
                  {detail.areas.map((a) => {
                    const subsDaArea = subcategoriasDaCategoria(a);
                    const subsMarcados = detail.subcategorias.filter((s) =>
                      subsDaArea.includes(s),
                    );
                    return (
                      <div key={a} className="flex flex-wrap items-center gap-1.5">
                        <Badge className="bg-primary-50 text-primary-700 border-transparent text-[11px]">
                          {a}
                        </Badge>
                        {subsMarcados.map((s) => (
                          <Badge
                            key={s}
                            className="bg-accent-50 text-accent-700 border border-accent-100 text-[11px]"
                          >
                            {s}
                          </Badge>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-neutral-900">Não informado</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-bold text-neutral-500">Pagamento</p>
                <span
                  className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: pagamentoBadge(detail.paymentStatus).bg,
                    color: pagamentoBadge(detail.paymentStatus).color,
                  }}
                >
                  {pagamentoBadge(detail.paymentStatus).label}
                </span>
              </div>
              <div>
                <p className="text-xs font-bold text-neutral-500">Plano</p>
                <p className="text-neutral-900 capitalize">
                  {detail.plano ?? "—"}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-neutral-500 mb-2">
                Histórico de alterações
              </p>
              {detail.atividades.length === 0 ? (
                <p className="text-neutral-500">Nenhuma alteração registrada.</p>
              ) : (
                <ul className="space-y-2">
                  {detail.atividades.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-start justify-between gap-3 border-b border-neutral-100 pb-2"
                    >
                      <span className="text-neutral-800">
                        {ACAO_LABEL[a.acao] ?? a.acao}
                        <span className="text-neutral-400"> · por admin</span>
                      </span>
                      <span className="text-neutral-500 whitespace-nowrap">
                        {formatDatePtBr(a.data)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function VerificacaoPanel() {
  const [psicologos, setPsicologos] = useState<AdminPsicologo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);

  const [busca, setBusca] = useState("");
  const [fStatus, setFStatus] = useState<"" | "ativo" | "inativo">("");
  const [fVerif, setFVerif] = useState<"" | "verificado" | "nao">("");
  const [fSituacao, setFSituacao] = useState<
    "" | SituacaoCrp | "sem"
  >("");

  const [detailId, setDetailId] = useState<number | null>(null);
  const [detail, setDetail] = useState<AdminPsicologoDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const list = await apiListAdminPsicologos();
      setPsicologos(list);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao carregar psicólogos.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  // Aplica um patch no psicólogo e atualiza a linha com a resposta do servidor.
  const patchPsicologo = async (
    id: number,
    input: {
      adminAtivo?: boolean;
      crpVerificada?: boolean;
      situacaoCrp?: SituacaoCrp | null;
    },
  ) => {
    setSavingId(id);
    setError("");
    try {
      const updated = await apiUpdateAdminPsicologo(id, input);
      setPsicologos((prev) =>
        prev.map((a) =>
          a.id === id
            ? {
                ...a,
                adminAtivo: updated.adminAtivo,
                crpVerificada: updated.crpVerificada,
                situacaoCrp: updated.situacaoCrp,
                paymentStatus: updated.paymentStatus,
              }
            : a,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar alteração.");
    } finally {
      setSavingId(null);
    }
  };

  const abrirDetalhe = async (id: number) => {
    setDetailId(id);
    setDetail(null);
    setLoadingDetail(true);
    try {
      const d = await apiGetAdminPsicologo(id);
      setDetail(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar detalhe.");
      setDetailId(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const total = psicologos.length;
  const ativos = psicologos.filter((a) => a.adminAtivo).length;
  const pendentes = psicologos.filter((a) => !a.crpVerificada).length;

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return psicologos.filter((a) => {
      if (termo) {
        const alvo = `${a.nome} ${a.email} ${a.crp}`.toLowerCase();
        if (!alvo.includes(termo)) return false;
      }
      if (fStatus === "ativo" && !a.adminAtivo) return false;
      if (fStatus === "inativo" && a.adminAtivo) return false;
      if (fVerif === "verificado" && !a.crpVerificada) return false;
      if (fVerif === "nao" && a.crpVerificada) return false;
      if (fSituacao === "sem" && a.situacaoCrp) return false;
      if (
        fSituacao &&
        fSituacao !== "sem" &&
        a.situacaoCrp !== fSituacao
      )
        return false;
      return true;
    });
  }, [psicologos, busca, fStatus, fVerif, fSituacao]);

  const situacoes: { key: SituacaoCrp; label: string; color: string }[] = [
    { key: "regular", label: "Regular", color: SUCCESS_COLOR },
    { key: "irregular", label: "Irregular", color: WARNING_COLOR },
    { key: "invalido", label: "Inválido", color: ERROR_COLOR },
  ];

  return (
    <div className="space-y-6">
      {/* Cabeçalho + contadores */}
      <div>
        <h1 className="text-2xl font-bold text-primary-800">
          Gestão de Psicólogos
        </h1>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-sm font-medium">
            Total: {total}
          </span>
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium"
            style={{ backgroundColor: "#E4F1EA", color: SUCCESS_COLOR }}
          >
            Ativos: {ativos}
          </span>
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium"
            style={{ backgroundColor: "#F6ECD6", color: WARNING_COLOR }}
          >
            Pendentes de verificação: {pendentes}
          </span>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, e-mail ou CRP..."
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-neutral-300 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              data-testid="input-busca-psicologo"
            />
          </div>
          <select
            value={fStatus}
            onChange={(e) =>
              setFStatus(e.target.value as "" | "ativo" | "inativo")
            }
            className="h-10 px-3 rounded-lg border border-neutral-300 bg-white text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
            data-testid="select-filtro-status"
          >
            <option value="">Status: Todos</option>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </select>
          <select
            value={fVerif}
            onChange={(e) =>
              setFVerif(e.target.value as "" | "verificado" | "nao")
            }
            className="h-10 px-3 rounded-lg border border-neutral-300 bg-white text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
            data-testid="select-filtro-verificacao"
          >
            <option value="">Verificação: Todos</option>
            <option value="verificado">Verificado</option>
            <option value="nao">Não verificado</option>
          </select>
          <select
            value={fSituacao}
            onChange={(e) =>
              setFSituacao(e.target.value as "" | SituacaoCrp | "sem")
            }
            className="h-10 px-3 rounded-lg border border-neutral-300 bg-white text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
            data-testid="select-filtro-situacao"
          >
            <option value="">Situação: Todas</option>
            <option value="regular">Regular</option>
            <option value="irregular">Irregular</option>
            <option value="invalido">Inválido</option>
            <option value="sem">Sem marcação</option>
          </select>
        </div>
      </div>

      {error && (
        <p className="text-sm" style={{ color: ERROR_COLOR }}>
          {error}
        </p>
      )}

      {/* Tabela */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-neutral-500">
            <Loader2 className="h-6 w-6 mx-auto mb-3 animate-spin text-primary-500" />
            Carregando psicólogos...
          </div>
        ) : filtrados.length === 0 ? (
          <p className="py-16 text-center text-sm text-neutral-500">
            {psicologos.length === 0
              ? "Nenhum psicólogo cadastrado ainda."
              : "Nenhum psicólogo encontrado com os filtros atuais."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs font-bold text-neutral-500">
                  <th className="px-4 py-3">Nome e CRP</th>
                  <th className="px-4 py-3">E-mail</th>
                  <th className="px-4 py-3">Cadastro</th>
                  <th className="px-4 py-3">Pagamento</th>
                  <th className="px-4 py-3">Perfil ativo</th>
                  <th className="px-4 py-3">Verificado</th>
                  <th className="px-4 py-3">Situação CRP</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filtrados.map((a) => {
                  const pag = pagamentoBadge(a.paymentStatus);
                  const linhaSalvando = savingId === a.id;
                  return (
                    <tr
                      key={a.id}
                      className={linhaSalvando ? "opacity-60" : ""}
                      data-testid={`row-psicologo-${a.id}`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-bold text-neutral-800">
                          {a.nome}
                        </div>
                        <div className="text-xs text-neutral-500">
                          {a.crp || "CRP não informado"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-neutral-700">
                        {a.email || "—"}
                      </td>
                      <td className="px-4 py-3 text-neutral-500">
                        {a.createdAt ? formatDatePtBr(a.createdAt) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ backgroundColor: pag.bg, color: pag.color }}
                        >
                          {pag.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Toggle
                          checked={a.adminAtivo}
                          disabled={linhaSalvando}
                          onColor="#3B82F6"
                          label={a.adminAtivo ? "Ativo" : "Inativo"}
                          onClick={() =>
                            patchPsicologo(a.id, { adminAtivo: !a.adminAtivo })
                          }
                          testId={`toggle-ativo-${a.id}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Toggle
                          checked={a.crpVerificada}
                          disabled={linhaSalvando || !a.adminAtivo}
                          onColor={SUCCESS_COLOR}
                          label={
                            a.crpVerificada ? "Verificado" : "Não verificado"
                          }
                          onClick={() =>
                            patchPsicologo(a.id, {
                              crpVerificada: !a.crpVerificada,
                            })
                          }
                          testId={`toggle-verificado-${a.id}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        {!a.crpVerificada ? (
                          <span className="text-neutral-300">—</span>
                        ) : (
                          <div className="flex flex-col sm:flex-row gap-1.5">
                            {situacoes.map((s) => {
                              const sel = a.situacaoCrp === s.key;
                              return (
                                <button
                                  key={s.key}
                                  type="button"
                                  disabled={linhaSalvando || sel}
                                  onClick={() => {
                                    if (sel) return;
                                    if (
                                      (s.key === "irregular" ||
                                        s.key === "invalido") &&
                                      !window.confirm(
                                        s.key === "invalido"
                                          ? "Marcar como Inválido vai desativar o perfil e enviar um e-mail ao psicólogo. Confirmar?"
                                          : "Marcar como Irregular vai enviar um e-mail ao psicólogo. Confirmar?",
                                      )
                                    ) {
                                      return;
                                    }
                                    void patchPsicologo(a.id, {
                                      situacaoCrp: s.key,
                                    });
                                  }}
                                  className="px-2.5 py-1 rounded-md text-xs font-medium border transition-colors disabled:cursor-default"
                                  style={
                                    sel
                                      ? {
                                          backgroundColor: s.color,
                                          color: "#fff",
                                          borderColor: s.color,
                                        }
                                      : {
                                          backgroundColor: "#F5F5F5",
                                          color: "#6B7280",
                                          borderColor: "#D1D5DB",
                                        }
                                  }
                                  data-testid={`button-situacao-${s.key}-${a.id}`}
                                >
                                  {s.label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => abrirDetalhe(a.id)}
                          className="text-neutral-500 hover:text-primary-600"
                          aria-label="Ver detalhes"
                          data-testid={`button-detalhe-${a.id}`}
                        >
                          <Eye className="h-4 w-4 inline" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detailId !== null && (
        <DetalheModal
          detail={detail}
          loading={loadingDetail}
          onClose={() => {
            setDetailId(null);
            setDetail(null);
          }}
        />
      )}
    </div>
  );
}

// ============================================================
// Painel autenticado com abas (Verificação / Blog)
// ============================================================
type AdminTab = "verificacao" | "blog";

function AdminPanel({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<AdminTab>("verificacao");

  const tabClass = (active: boolean) =>
    `h-16 px-1 border-b-2 text-sm font-medium transition-colors ${
      active
        ? "border-primary-600 text-primary-800"
        : "border-transparent text-neutral-500 hover:text-neutral-700"
    }`;

  return (
    <div className="min-h-screen bg-[#F5F4F2]">
      <header className="bg-white border-b border-neutral-200">
        <div className="container mx-auto px-6 max-w-[1280px] h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="font-bold text-primary-800">
              Painel administrativo
            </span>
            <nav className="flex items-center gap-6">
              <button
                type="button"
                onClick={() => setTab("verificacao")}
                className={tabClass(tab === "verificacao")}
                data-testid="tab-verificacao"
              >
                Verificação
              </button>
              <button
                type="button"
                onClick={() => setTab("blog")}
                className={tabClass(tab === "blog")}
                data-testid="tab-blog"
              >
                Blog
              </button>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/blog"
              className="text-sm text-primary-600 hover:underline inline-flex items-center gap-1"
            >
              Ver blog <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            <button
              type="button"
              onClick={onLogout}
              className="text-sm text-neutral-500 hover:text-neutral-700 inline-flex items-center gap-1"
            >
              <LogOut className="h-4 w-4" /> Sair
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 max-w-[1280px] py-8 md:py-10">
        {tab === "verificacao" ? <VerificacaoPanel /> : <BlogPanel />}
      </main>
    </div>
  );
}

// ============================================================
// Página /admin
// ============================================================
export default function Admin() {
  const { user, isLoading, isAuthenticated, logout } = useAuth();

  // Redireciona para o login seguro, voltando direto para /admin após entrar.
  const entrar = () => {
    window.location.href = `/api/login?returnTo=${encodeURIComponent(
      `${basePath}/admin`,
    )}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-100">
        <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLogin onEntrar={entrar} />;
  }

  const email = user?.email ?? null;
  if (!isAdminEmail(email)) {
    return <AdminNaoAutorizado email={email} onSair={logout} />;
  }

  return <AdminPanel onLogout={logout} />;
}
