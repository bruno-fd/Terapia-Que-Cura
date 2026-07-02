import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useUser, useClerk, SignIn } from "@clerk/react";
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
import {
  generateIdeas as apiGenerateIdeas,
  createPost as apiCreatePost,
  listAdminPosts as apiListAdminPosts,
  updatePost as apiUpdatePost,
  deletePost as apiDeletePost,
  listAdminAdvogados as apiListAdminAdvogados,
  getAdminAdvogado as apiGetAdminAdvogado,
  updateAdminAdvogado as apiUpdateAdminAdvogado,
} from "@/lib/admin";
import type {
  AdminAdvogado,
  AdminAdvogadoDetail,
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
// Gate de senha
// ============================================================
// Tela de login do admin: autenticação real via Clerk (e-mail no navegador).
// Não há mais senha compartilhada; o acesso é liberado apenas para e-mails
// autorizados (validado no back-end).
function AdminLogin() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-100 px-4 py-12">
      <div className="mb-6 text-center">
        <h1 className="text-xl font-bold text-primary-800">
          Painel administrativo
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Acesso restrito. Entre com um e-mail autorizado.
        </p>
      </div>

      <SignIn
        routing="hash"
        fallbackRedirectUrl={`${basePath}/admin`}
        forceRedirectUrl={`${basePath}/admin`}
        signUpUrl={`${basePath}/sign-up`}
      />

      <div className="mt-6 text-center">
        <Link
          href="/"
          className="text-sm text-primary-500 hover:text-primary-600"
        >
          Voltar para o site
        </Link>
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
          Regras editoriais e da OAB
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
            subtítulo, encerramento padrão OAB e aviso legal. Entre 600 e 900
            palavras.
          </p>
          <p>
            <span className="font-bold text-neutral-800">Linguagem:</span>{" "}
            simples e direta. Todo termo jurídico é explicado logo após o uso.
            Nunca usar travessão.
          </p>
          <p>
            <span className="font-bold text-neutral-800">OAB:</span> nunca
            recomendar entrar com ação ou processar, nunca afirmar que o leitor
            foi lesado, nunca citar um advogado específico e nunca estimular o
            litígio.
          </p>
          <p>
            <span className="font-bold text-neutral-800">Encerramento:</span>{" "}
            informa que, se a situação aconteceu com o leitor, pode ser que seus
            direitos não tenham sido respeitados, e que existem profissionais
            especializados na área.
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
  const [bodyHtml, setBodyHtml] = useState(() => initialBodyHtml(post));

  // Reinicializa o formulário quando outro post é aberto no editor.
  useEffect(() => {
    setTitle(post.title);
    setSubtitle(post.subtitle);
    setExcerpt(post.excerpt);
    setCategory(post.category);
    setBodyHtml(initialBodyHtml(post));
  }, [post.id]);

  const collect = () => ({
    title: title.trim(),
    subtitle: subtitle.trim(),
    excerpt: excerpt.trim(),
    category,
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
              onChange={(e) => setCategory(e.target.value)}
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
                  <p>Gerando o rascunho seguindo as regras editoriais e da OAB...</p>
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
// Aba "Verificação": gestão manual de advogados
// ============================================================
type SituacaoOab = "regular" | "irregular" | "invalido";

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

// Modal de detalhes de um advogado.
function DetalheModal({
  detail,
  loading,
  onClose,
}: {
  detail: AdminAdvogadoDetail | null;
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-[600px] max-h-[90vh] overflow-y-auto bg-white rounded-2xl border border-neutral-200 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
        <div className="flex items-center justify-between p-5 border-b border-neutral-200">
          <h3 className="font-bold text-primary-800">Detalhes do advogado</h3>
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
                <p className="text-xs font-bold text-neutral-500">OAB</p>
                <p className="text-neutral-900">{detail.oab || "Não informado"}</p>
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
                <div className="flex flex-wrap gap-1.5">
                  {detail.areas.map((a) => (
                    <Badge
                      key={a}
                      className="bg-primary-50 text-primary-700 border-transparent text-[11px]"
                    >
                      {a}
                    </Badge>
                  ))}
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
  const [advogados, setAdvogados] = useState<AdminAdvogado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);

  const [busca, setBusca] = useState("");
  const [fStatus, setFStatus] = useState<"" | "ativo" | "inativo">("");
  const [fVerif, setFVerif] = useState<"" | "verificado" | "nao">("");
  const [fSituacao, setFSituacao] = useState<
    "" | SituacaoOab | "sem"
  >("");

  const [detailId, setDetailId] = useState<number | null>(null);
  const [detail, setDetail] = useState<AdminAdvogadoDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const list = await apiListAdminAdvogados();
      setAdvogados(list);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao carregar advogados.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  // Aplica um patch no advogado e atualiza a linha com a resposta do servidor.
  const patchAdvogado = async (
    id: number,
    input: {
      adminAtivo?: boolean;
      oabVerificada?: boolean;
      situacaoOab?: SituacaoOab | null;
    },
  ) => {
    setSavingId(id);
    setError("");
    try {
      const updated = await apiUpdateAdminAdvogado(id, input);
      setAdvogados((prev) =>
        prev.map((a) =>
          a.id === id
            ? {
                ...a,
                adminAtivo: updated.adminAtivo,
                oabVerificada: updated.oabVerificada,
                situacaoOab: updated.situacaoOab,
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
      const d = await apiGetAdminAdvogado(id);
      setDetail(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar detalhe.");
      setDetailId(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const total = advogados.length;
  const ativos = advogados.filter((a) => a.adminAtivo).length;
  const pendentes = advogados.filter((a) => !a.oabVerificada).length;

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return advogados.filter((a) => {
      if (termo) {
        const alvo = `${a.nome} ${a.email} ${a.oab}`.toLowerCase();
        if (!alvo.includes(termo)) return false;
      }
      if (fStatus === "ativo" && !a.adminAtivo) return false;
      if (fStatus === "inativo" && a.adminAtivo) return false;
      if (fVerif === "verificado" && !a.oabVerificada) return false;
      if (fVerif === "nao" && a.oabVerificada) return false;
      if (fSituacao === "sem" && a.situacaoOab) return false;
      if (
        fSituacao &&
        fSituacao !== "sem" &&
        a.situacaoOab !== fSituacao
      )
        return false;
      return true;
    });
  }, [advogados, busca, fStatus, fVerif, fSituacao]);

  const situacoes: { key: SituacaoOab; label: string; color: string }[] = [
    { key: "regular", label: "Regular", color: SUCCESS_COLOR },
    { key: "irregular", label: "Irregular", color: WARNING_COLOR },
    { key: "invalido", label: "Inválido", color: ERROR_COLOR },
  ];

  return (
    <div className="space-y-6">
      {/* Cabeçalho + contadores */}
      <div>
        <h1 className="text-2xl font-bold text-primary-800">
          Gestão de Advogados
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
              placeholder="Buscar por nome, e-mail ou OAB..."
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-neutral-300 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              data-testid="input-busca-advogado"
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
              setFSituacao(e.target.value as "" | SituacaoOab | "sem")
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
            Carregando advogados...
          </div>
        ) : filtrados.length === 0 ? (
          <p className="py-16 text-center text-sm text-neutral-500">
            {advogados.length === 0
              ? "Nenhum advogado cadastrado ainda."
              : "Nenhum advogado encontrado com os filtros atuais."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs font-bold text-neutral-500">
                  <th className="px-4 py-3">Nome e OAB</th>
                  <th className="px-4 py-3">E-mail</th>
                  <th className="px-4 py-3">Cadastro</th>
                  <th className="px-4 py-3">Pagamento</th>
                  <th className="px-4 py-3">Perfil ativo</th>
                  <th className="px-4 py-3">Verificado</th>
                  <th className="px-4 py-3">Situação OAB</th>
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
                      data-testid={`row-advogado-${a.id}`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-bold text-neutral-800">
                          {a.nome}
                        </div>
                        <div className="text-xs text-neutral-500">
                          {a.oab || "OAB não informada"}
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
                            patchAdvogado(a.id, { adminAtivo: !a.adminAtivo })
                          }
                          testId={`toggle-ativo-${a.id}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Toggle
                          checked={a.oabVerificada}
                          disabled={linhaSalvando || !a.adminAtivo}
                          onColor={SUCCESS_COLOR}
                          label={
                            a.oabVerificada ? "Verificado" : "Não verificado"
                          }
                          onClick={() =>
                            patchAdvogado(a.id, {
                              oabVerificada: !a.oabVerificada,
                            })
                          }
                          testId={`toggle-verificado-${a.id}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        {!a.oabVerificada ? (
                          <span className="text-neutral-300">—</span>
                        ) : (
                          <div className="flex flex-col sm:flex-row gap-1.5">
                            {situacoes.map((s) => {
                              const sel = a.situacaoOab === s.key;
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
                                          ? "Marcar como Inválido vai desativar o perfil e enviar um e-mail ao advogado. Confirmar?"
                                          : "Marcar como Irregular vai enviar um e-mail ao advogado. Confirmar?",
                                      )
                                    ) {
                                      return;
                                    }
                                    void patchAdvogado(a.id, {
                                      situacaoOab: s.key,
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
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-100">
        <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!isSignedIn) {
    return <AdminLogin />;
  }

  const email = user.primaryEmailAddress?.emailAddress ?? null;
  if (!isAdminEmail(email)) {
    return (
      <AdminNaoAutorizado email={email} onSair={() => void signOut()} />
    );
  }

  return <AdminPanel onLogout={() => void signOut()} />;
}
