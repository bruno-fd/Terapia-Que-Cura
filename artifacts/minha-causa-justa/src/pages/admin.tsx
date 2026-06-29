import { useEffect, useState } from "react";
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
  Copy,
  Check,
  RefreshCw,
  Trash2,
  ChevronDown,
  LogOut,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BLOG_CATEGORIES } from "@/data/blog";
import {
  getAdminPassword,
  setAdminPassword,
  clearAdminPassword,
  generateIdeas as apiGenerateIdeas,
  createPost as apiCreatePost,
  listAdminPosts as apiListAdminPosts,
  deletePost as apiDeletePost,
} from "@/lib/admin";

const ADMIN_PASSWORD = "123456";
const ERROR_COLOR = "#C0392B";

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
// Painel principal do gerador
// ============================================================
function AdminPanel({ onLogout }: { onLogout: () => void }) {
  const queryClient = useQueryClient();

  const [category, setCategory] = useState<string>("");
  const [theme, setTheme] = useState("");

  const [ideas, setIdeas] = useState<string[]>([]);
  const [loadingIdeas, setLoadingIdeas] = useState(false);

  const [post, setPost] = useState<ApiBlogPost | null>(null);
  const [loadingPost, setLoadingPost] = useState(false);

  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const [adminPosts, setAdminPosts] = useState<ApiBlogPost[]>([]);
  const [deletingId, setDeletingId] = useState<number | null>(null);

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
      setError("Selecione uma macrocategoria para o post ser publicado no local correto.");
      return;
    }
    if (!theme.trim()) {
      setError("Escolha uma ideia ou digite um tema.");
      return;
    }
    setError("");
    setLoadingPost(true);
    setCopied(false);
    try {
      const created = await apiCreatePost(category, theme.trim());
      setPost(created);
      queryClient.invalidateQueries({
        queryKey: getListPublishedPostsQueryKey(),
      });
      void refreshAdminPosts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar o post.");
    } finally {
      setLoadingPost(false);
    }
  };

  const handleCopy = async () => {
    if (!post) return;
    const lines: string[] = [];
    lines.push(post.title);
    if (post.subtitle) lines.push(post.subtitle);
    lines.push("");
    for (const section of post.body) {
      if (section.heading) {
        lines.push(section.heading);
      }
      for (const p of section.paragraphs) {
        lines.push(p);
      }
      lines.push("");
    }
    if (post.oabClosing) {
      lines.push(post.oabClosing);
      lines.push("");
    }
    lines.push(
      "Este conteúdo tem caráter exclusivamente informativo e educativo. Não constitui aconselhamento jurídico.",
    );
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Não foi possível copiar o texto.");
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await apiDeletePost(id);
      if (post?.id === id) setPost(null);
      queryClient.invalidateQueries({
        queryKey: getListPublishedPostsQueryKey(),
      });
      await refreshAdminPosts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir o post.");
    } finally {
      setDeletingId(null);
    }
  };

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
                Escolha uma ideia acima ou escreva um tema livre.
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
                    post...
                  </>
                ) : (
                  <>
                    <PenLine className="h-5 w-5 mr-2" /> Escrever post
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

          {/* Painel de saída */}
          <div className="flex-1 w-full min-w-0 space-y-6">
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 md:p-8">
              {!post && !loadingPost && (
                <div className="text-center text-neutral-500 py-16">
                  <PenLine className="h-10 w-10 mx-auto mb-4 text-neutral-300" />
                  <p>
                    O post gerado aparece aqui e é publicado automaticamente na
                    categoria escolhida.
                  </p>
                </div>
              )}

              {loadingPost && (
                <div className="text-center text-neutral-500 py-16">
                  <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-primary-500" />
                  <p>Gerando o post seguindo as regras editoriais e da OAB...</p>
                </div>
              )}

              {post && !loadingPost && (
                <article>
                  <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                    <Badge className="bg-primary-50 text-primary-700 border-transparent">
                      {post.category}
                    </Badge>
                    <span className="text-sm text-neutral-500">
                      Leitura de aproximadamente {post.readingMinutes} minutos
                    </span>
                  </div>

                  <p className="text-sm text-[#1E7D4F] mb-4">
                    Post publicado no blog.{" "}
                    <Link
                      href={`/blog/${post.slug}`}
                      className="underline inline-flex items-center gap-1"
                    >
                      Ver no site <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </p>

                  <h1 className="text-2xl md:text-3xl font-bold text-primary-900 leading-tight mb-3">
                    {post.title}
                  </h1>
                  {post.subtitle && (
                    <p className="text-lg text-neutral-600 leading-relaxed mb-4">
                      {post.subtitle}
                    </p>
                  )}

                  {post.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-6">
                      {post.keywords.map((kw) => (
                        <span
                          key={kw}
                          className="text-xs text-neutral-600 bg-neutral-100 border border-neutral-200 rounded-full px-3 py-1"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}

                  <hr className="my-6 border-neutral-200" />

                  <div className="space-y-5">
                    {post.body.map((section, index) => (
                      <section key={index}>
                        {section.heading && (
                          <h2 className="text-xl font-bold text-primary-800 mt-8 mb-3">
                            {section.heading}
                          </h2>
                        )}
                        {section.paragraphs.map((p, pIndex) => (
                          <p
                            key={pIndex}
                            className="text-neutral-700 leading-loose mb-4"
                          >
                            {p}
                          </p>
                        ))}
                      </section>
                    ))}
                  </div>

                  {post.oabClosing && (
                    <div className="mt-8 rounded-2xl bg-primary-50 border border-primary-100 p-6">
                      <p className="text-neutral-700 leading-loose">
                        {post.oabClosing}
                      </p>
                    </div>
                  )}

                  <p className="text-sm text-neutral-500 italic mt-6">
                    Este conteúdo tem caráter exclusivamente informativo e
                    educativo. Não constitui aconselhamento jurídico.
                  </p>

                  <div className="flex flex-wrap gap-3 mt-8">
                    <Button
                      type="button"
                      onClick={handleCopy}
                      variant="outline"
                      className="h-11 rounded-lg border-neutral-300"
                      data-testid="button-copiar"
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4 mr-2" /> Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" /> Copiar texto
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      onClick={handleWritePost}
                      disabled={loadingPost}
                      className="h-11 rounded-lg bg-primary-600 hover:bg-primary-700 text-white"
                      data-testid="button-nova-versao"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" /> Gerar nova versão
                    </Button>
                  </div>
                </article>
              )}
            </div>

            {/* Gestão de posts gerados */}
            {adminPosts.length > 0 && (
              <div className="bg-white rounded-2xl border border-neutral-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
                <h2 className="font-bold text-primary-800 mb-4">
                  Posts publicados ({adminPosts.length})
                </h2>
                <ul className="divide-y divide-neutral-200">
                  {adminPosts.map((p) => (
                    <li
                      key={p.id}
                      className="py-3 flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/blog/${p.slug}`}
                          className="text-sm font-medium text-neutral-800 hover:text-primary-700 line-clamp-1"
                        >
                          {p.title}
                        </Link>
                        <span className="text-xs text-neutral-500">
                          {p.category}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id)}
                        disabled={deletingId === p.id}
                        className="text-neutral-400 hover:text-[#C0392B] disabled:opacity-50 shrink-0"
                        aria-label="Excluir post"
                        data-testid={`button-excluir-${p.id}`}
                      >
                        {deletingId === p.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
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
  const [authed, setAuthed] = useState(() => getAdminPassword() === ADMIN_PASSWORD);

  const handleLogout = () => {
    clearAdminPassword();
    setAuthed(false);
  };

  if (!authed) {
    return <AdminLogin onAuthed={() => setAuthed(true)} />;
  }
  return <AdminPanel onLogout={handleLogout} />;
}
