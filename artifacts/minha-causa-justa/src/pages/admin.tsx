import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from "@/components/RichTextEditor";
import { BLOG_CATEGORIES } from "@/data/blog";
import {
  getAdminPassword,
  setAdminPassword,
  clearAdminPassword,
  generateIdeas as apiGenerateIdeas,
  createPost as apiCreatePost,
  listAdminPosts as apiListAdminPosts,
  updatePost as apiUpdatePost,
  deletePost as apiDeletePost,
} from "@/lib/admin";

const ADMIN_PASSWORD = "123456";
const ERROR_COLOR = "#C0392B";
const SUCCESS_COLOR = "#1E7D4F";
const WARNING_COLOR = "#B97D00";

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
function AdminLogin({ onAuthed }: { onAuthed: () => void }) {
  const [senha, setSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (senha !== ADMIN_PASSWORD) {
      setError("Senha incorreta.");
      return;
    }
    setAdminPassword(senha);
    onAuthed();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-100 px-4 py-12">
      <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-neutral-200 p-8">
        <h1 className="text-xl font-bold text-primary-800 text-center">
          Painel administrativo
        </h1>
        <p className="mt-1 text-sm text-neutral-500 text-center">
          Acesso restrito. Informe a senha para continuar.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <div>
            <label
              htmlFor="admin-senha"
              className="block text-sm font-bold text-neutral-700 mb-1.5"
            >
              Senha
            </label>
            <div className="relative">
              <input
                id="admin-senha"
                type={showPassword ? "text" : "password"}
                value={senha}
                onChange={(e) => {
                  setSenha(e.target.value);
                  setError("");
                }}
                placeholder="Sua senha"
                className="w-full h-12 px-4 pr-12 rounded-lg border border-neutral-300 text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                data-testid="input-admin-senha"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm" style={{ color: ERROR_COLOR }}>
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full h-12 bg-primary-600 hover:bg-primary-700 text-white text-base font-medium rounded-lg"
            data-testid="button-admin-entrar"
          >
            Entrar
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-neutral-200 text-center">
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
function AdminPanel({ onLogout }: { onLogout: () => void }) {
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
    <div className="min-h-screen bg-[#F5F4F2]">
      {/* Cabeçalho do painel */}
      <header className="bg-white border-b border-neutral-200">
        <div className="container mx-auto px-6 max-w-[1280px] h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold text-primary-800">
              Painel administrativo
            </span>
            <Badge className="bg-primary-50 text-primary-700 border-transparent">
              Gerador de posts
            </Badge>
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
      </main>
    </div>
  );
}

// ============================================================
// Página /admin
// ============================================================
export default function Admin() {
  const [authed, setAuthed] = useState(
    () => getAdminPassword() === ADMIN_PASSWORD,
  );

  const handleLogout = () => {
    clearAdminPassword();
    setAuthed(false);
  };

  if (!authed) {
    return <AdminLogin onAuthed={() => setAuthed(true)} />;
  }
  return <AdminPanel onLogout={handleLogout} />;
}
