import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Instagram, Linkedin, Globe, Link2, Phone, X, MapPin, PartyPopper, ArrowDown } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetPerfil,
  useUpdatePerfil,
  getGetPerfilQueryKey,
  type UpdateProfileInput,
} from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { StateAutocomplete } from "@/components/StateAutocomplete";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CityAutocomplete } from "@/components/CityAutocomplete";
import { AREAS, PUBLICO_ATENDIDO, getInitial, maskPhone } from "@/lib/dashboard";
import { subcategoriasDaCategoria } from "@/data/categories";

const ABOUT_LIMIT = 500;
const MAX_PHOTO_MB = 5;
const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

type Profile = UpdateProfileInput;

const EMPTY_PROFILE: Profile = {
  nome: "",
  crp: "",
  photo: null,
  about: "",
  areas: [],
  subcategorias: [],
  cidades: [],
  atendeOnline: false,
  publicoAtendido: [],
  precoSessao: "",
  whatsapp: "",
  instagram: "",
  linkedin: "",
  website: "",
  outro: "",
};

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`bg-white rounded-2xl border border-neutral-200 p-6 ${className}`}>
      {children}
    </section>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-bold text-primary-800">{children}</h2>;
}

export default function PainelPerfil() {
  const queryClient = useQueryClient();
  const { data: loaded, isLoading, isError, refetch } = useGetPerfil();
  const updateMutation = useUpdatePerfil();

  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  // Guarda a referência dos dados já carregados no formulário. Como o React
  // Query reutiliza a mesma referência quando os dados não mudam, isto evita
  // sobrescrever edições em refetches e ressincroniza ao trocar de usuário.
  const hydratedFrom = useRef<typeof loaded | null>(null);
  const [photoError, setPhotoError] = useState("");
  const [areaError, setAreaError] = useState("");
  const [nomeError, setNomeError] = useState("");
  const [crpError, setCrpError] = useState("");
  const [selectedUf, setSelectedUf] = useState("");
  const [whatsappError, setWhatsappError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Preenche o formulário sempre que chega um conjunto novo de dados do
  // servidor (primeira carga ou troca de usuário), sem clobber em refetches.
  useEffect(() => {
    if (loaded && hydratedFrom.current !== loaded) {
      setProfile({
        nome: loaded.nome,
        crp: loaded.crp,
        photo: loaded.photo ?? null,
        about: loaded.about,
        areas: loaded.areas,
        subcategorias: loaded.subcategorias,
        cidades: loaded.cidades,
        atendeOnline: loaded.atendeOnline,
        publicoAtendido: loaded.publicoAtendido,
        precoSessao: loaded.precoSessao,
        whatsapp: loaded.whatsapp,
        instagram: loaded.instagram,
        linkedin: loaded.linkedin,
        website: loaded.website,
        outro: loaded.outro,
      });
      hydratedFrom.current = loaded;
    }
  }, [loaded]);

  const ready = loaded != null && hydratedFrom.current === loaded;

  const saving = updateMutation.isPending;

  const update = (patch: Partial<Profile>) => {
    setProfile((p) => ({ ...p, ...patch }));
    setShowSuccess(false);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setPhotoError("Formato inválido. Use JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
      setPhotoError("Arquivo maior que 5MB. Escolha uma imagem menor.");
      return;
    }
    setPhotoError("");
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          update({ photo: reader.result as string });
          return;
        }
        ctx.drawImage(img, 0, 0);
        try {
          update({ photo: canvas.toDataURL("image/webp", 0.85) });
        } catch {
          update({ photo: reader.result as string });
        }
      };
      img.onerror = () => update({ photo: reader.result as string });
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const toggleArea = (area: string) => {
    const isSelected = profile.areas.includes(area);
    if (isSelected && profile.areas.length === 1) {
      setAreaError("Selecione ao menos uma área.");
      return;
    }
    setAreaError("");
    if (isSelected) {
      // Ao desmarcar uma macrocategoria, remove também os temas dela.
      const subsDaArea = new Set(subcategoriasDaCategoria(area));
      update({
        areas: profile.areas.filter((a) => a !== area),
        subcategorias: profile.subcategorias.filter((s) => !subsDaArea.has(s)),
      });
    } else {
      update({ areas: [...profile.areas, area] });
    }
  };

  const toggleSubcategoria = (sub: string) => {
    const isSelected = profile.subcategorias.includes(sub);
    update({
      subcategorias: isSelected
        ? profile.subcategorias.filter((s) => s !== sub)
        : [...profile.subcategorias, sub],
    });
  };

  const togglePublico = (publico: string) => {
    update({
      publicoAtendido: profile.publicoAtendido.includes(publico)
        ? profile.publicoAtendido.filter((p) => p !== publico)
        : [...profile.publicoAtendido, publico],
    });
  };

  const addCidade = (nome: string) => {
    if (!selectedUf) return;
    const exists = profile.cidades.some(
      (c) => c.nome === nome && c.uf === selectedUf,
    );
    if (exists) return;
    update({ cidades: [...profile.cidades, { nome, uf: selectedUf }] });
  };

  const removeCidade = (nome: string, uf: string) => {
    update({
      cidades: profile.cidades.filter((c) => !(c.nome === nome && c.uf === uf)),
    });
  };

  const aboutOver = profile.about.length > ABOUT_LIMIT;

  // Perfil ainda não pronto para ser encontrado: usado para dar as boas-vindas
  // e incentivar quem acabou de criar a conta (pós-pagamento) a concluir o
  // preenchimento. O aviso some sozinho quando o perfil fica completo.
  const perfilIncompleto =
    !profile.about.trim() ||
    profile.areas.length === 0 ||
    !profile.whatsapp.trim();
  const primeiroNome = profile.nome.trim().split(/\s+/).filter(Boolean)[0] ?? "";

  const focusField = (id: string) => {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.focus();
  };

  const handleSave = () => {
    setSaveError("");
    if (!profile.nome.trim()) {
      setNomeError("Informe seu nome completo.");
      focusField("nome");
      return;
    }
    setNomeError("");
    if (!profile.crp.trim()) {
      setCrpError("Informe seu número de CRP.");
      focusField("crp");
      return;
    }
    setCrpError("");
    if (!profile.whatsapp.trim()) {
      setWhatsappError("Informe um WhatsApp para contato.");
      focusField("whatsapp");
      return;
    }
    if (aboutOver) return;
    setWhatsappError("");

    updateMutation.mutate(
      { data: profile },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetPerfilQueryKey() });
          setShowSuccess(true);
          window.scrollTo({ top: 0, behavior: "smooth" });
        },
        onError: (err) => {
          setSaveError(
            err instanceof Error
              ? err.message
              : "Não foi possível salvar. Tente novamente.",
          );
        },
      },
    );
  };

  const badgeClass = (active: boolean) =>
    `px-4 py-2 rounded-full text-sm font-medium border transition-colors cursor-pointer ${
      active
        ? "bg-primary-500 text-white border-primary-500"
        : "bg-white text-primary-800 border-primary-300 hover:bg-primary-50"
    }`;

  if (isError && !loaded) {
    return (
      <DashboardLayout active="perfil">
        <div className="flex flex-col items-center justify-center gap-4 py-32 text-center" data-testid="perfil-erro">
          <p className="text-sm text-neutral-600">Não foi possível carregar seu perfil.</p>
          <Button
            onClick={() => void refetch()}
            className="bg-primary-600 hover:bg-primary-700 text-white"
            data-testid="button-recarregar-perfil"
          >
            Tentar novamente
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  if (isLoading || !ready) {
    return (
      <DashboardLayout active="perfil">
        <div className="flex items-center justify-center py-32" data-testid="perfil-carregando">
          <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout active="perfil">
      {/* Boas-vindas comemorativas: aparece enquanto o perfil não está pronto
          para ser encontrado (ex.: logo após criar a conta pós-pagamento). */}
      {perfilIncompleto && !showSuccess && (
        <div
          className="mb-6 overflow-hidden rounded-2xl border border-primary-200 bg-gradient-to-br from-primary-50 to-accent-50 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
          data-testid="banner-boas-vindas"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-100 text-accent-700">
              <PartyPopper className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-primary-900">
                {primeiroNome
                  ? `Bem-vindo(a), ${primeiroNome}!`
                  : "Bem-vindo(a) à Terapia Que Cura!"}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-neutral-700">
                Seu pagamento foi confirmado e sua conta já está ativa. Falta
                pouco: complete seu perfil abaixo para começar a aparecer para
                quem procura um psicólogo. Quanto mais completo, mais clientes
                você atrai.
              </p>
              <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary-700">
                <ArrowDown className="h-4 w-4" /> Comece pela sua foto e pelo
                &ldquo;Sobre mim&rdquo;
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Banner de sucesso */}
      {showSuccess && (
        <div
          className="mb-6 rounded-lg bg-[#1E7D4F]/10 border border-[#1E7D4F]/30 text-[#1E7D4F] px-4 py-3 text-sm font-medium flex items-center gap-2"
          data-testid="banner-sucesso"
        >
          <Check className="h-4 w-4" /> Perfil atualizado com sucesso!
        </div>
      )}

      {/* Banner de erro */}
      {saveError && (
        <div
          className="mb-6 rounded-lg bg-[#C0392B]/10 border border-[#C0392B]/30 text-[#C0392B] px-4 py-3 text-sm font-medium flex items-center gap-2"
          data-testid="banner-erro"
        >
          <X className="h-4 w-4" /> {saveError}
        </div>
      )}

      {/* Cabeçalho */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary-800">Meu Perfil</h1>
        <p className="mt-1 text-sm text-neutral-500">
          As informações abaixo aparecem para quem busca psicólogos na plataforma.
        </p>
      </div>

      <div className="space-y-6 pb-28 md:pb-6">
        {/* Seção 1 — Foto de perfil */}
        <Card>
          <SectionTitle>Foto de perfil</SectionTitle>
          <div className="mt-4 flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="h-[100px] w-[100px] rounded-full overflow-hidden shrink-0 bg-primary-100 flex items-center justify-center">
              {profile.photo ? (
                <img src={profile.photo} alt="Foto de perfil" className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-primary-800">{getInitial(profile.nome)}</span>
              )}
            </div>
            <div className="flex flex-col items-center sm:items-start gap-2">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-primary-300 text-primary-700 hover:bg-primary-50"
                  onClick={() => fileRef.current?.click()}
                  data-testid="button-alterar-foto"
                >
                  Alterar foto
                </Button>
                {profile.photo && (
                  <button
                    onClick={() => {
                      update({ photo: null });
                      setPhotoError("");
                    }}
                    className="text-sm text-[#C0392B] hover:underline"
                    data-testid="button-remover-foto"
                  >
                    Remover
                  </button>
                )}
              </div>
              <p className="text-xs text-neutral-500">JPG, PNG ou WEBP. Máximo 5MB. A foto será otimizada automaticamente.</p>
              {photoError && (
                <p className="text-xs text-[#C0392B]" data-testid="text-foto-erro">{photoError}</p>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={handlePhotoSelect}
                data-testid="input-foto"
              />
            </div>
          </div>
        </Card>

        {/* Seção 2 — Dados cadastrais */}
        <Card>
          <SectionTitle>Dados cadastrais</SectionTitle>
          <p className="mt-1 text-sm text-neutral-500">
            Seu nome e CRP aparecem no seu perfil público.
          </p>
          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="nome" className="block text-sm font-bold text-neutral-700 mb-1.5">
                Nome completo<span className="text-[#C0392B]"> *</span>
              </label>
              <input
                id="nome"
                type="text"
                value={profile.nome}
                onChange={(e) => {
                  update({ nome: e.target.value });
                  if (nomeError) setNomeError("");
                }}
                placeholder="Ex: Dra. Carla Mendes Santos"
                className={`w-full h-11 px-4 rounded-lg border text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                  nomeError ? "border-[#C0392B]" : "border-neutral-300"
                }`}
                data-testid="input-nome"
              />
              {nomeError && (
                <p className="mt-1.5 text-sm text-[#C0392B]" data-testid="error-nome">{nomeError}</p>
              )}
            </div>
            <div>
              <label htmlFor="crp" className="block text-sm font-bold text-neutral-700 mb-1.5">
                CRP<span className="text-[#C0392B]"> *</span>
              </label>
              <input
                id="crp"
                type="text"
                value={profile.crp}
                onChange={(e) => {
                  update({ crp: e.target.value });
                  if (crpError) setCrpError("");
                }}
                placeholder="Ex: CRP SP/145.782"
                className={`w-full h-11 px-4 rounded-lg border text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                  crpError ? "border-[#C0392B]" : "border-neutral-300"
                }`}
                data-testid="input-crp"
              />
              {crpError && (
                <p className="mt-1.5 text-sm text-[#C0392B]" data-testid="error-crp">{crpError}</p>
              )}
              {loaded?.crpVerificada ? (
                <p
                  className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-[#1E7D4F]"
                  data-testid="crp-verificado"
                >
                  <Check className="h-4 w-4" /> Inscrição verificada no CRP
                  {loaded.crpSituacao ? ` (${loaded.crpSituacao})` : ""}
                </p>
              ) : loaded?.crpVerificacaoPendente ? (
                <p
                  className="mt-1.5 text-sm font-medium text-[#B97D00]"
                  data-testid="crp-pendente"
                >
                  Verificação do CRP pendente de análise manual.
                </p>
              ) : null}
            </div>
          </div>
        </Card>

        {/* Seção 3 — Sobre mim */}
        <Card>
          <SectionTitle>Sobre mim</SectionTitle>
          <p className="mt-1 text-sm text-neutral-500">
            Escreva como você fala. Explique o que você resolve, não onde se formou.
          </p>
          <div className="mt-3 relative">
            <textarea
              rows={6}
              value={profile.about}
              onChange={(e) => update({ about: e.target.value })}
              placeholder="Ex: Atuo há 8 anos com terapia cognitivo-comportamental em São Paulo. Meu foco é ajudar adultos que lidam com ansiedade e burnout no dia a dia do trabalho."
              className={`w-full px-4 py-3 rounded-lg border text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none ${
                aboutOver ? "border-[#C0392B] focus:ring-[#C0392B]" : "border-neutral-300"
              }`}
              data-testid="input-sobre-mim"
            />
            <span
              className={`absolute bottom-3 right-3 text-xs ${
                aboutOver ? "text-[#C0392B]" : "text-neutral-500"
              }`}
              data-testid="text-contador"
            >
              {profile.about.length}/{ABOUT_LIMIT}
            </span>
          </div>
        </Card>

        {/* Seção 4 — Áreas de atuação */}
        <Card>
          <SectionTitle>Áreas de atuação</SectionTitle>
          <p className="mt-1 text-sm text-neutral-500">
            Selecione ao menos uma área. Clique para marcar ou desmarcar.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {AREAS.map((area) => (
              <button
                key={area}
                type="button"
                onClick={() => toggleArea(area)}
                className={badgeClass(profile.areas.includes(area))}
                data-testid={`badge-area-${area}`}
              >
                {area}
              </button>
            ))}
          </div>
          {areaError && (
            <p className="mt-3 text-sm text-[#C0392B]" data-testid="text-area-erro">{areaError}</p>
          )}

          {/* Temas específicos por área selecionada (opcional) */}
          {profile.areas.length > 0 && (
            <div className="mt-6 border-t border-neutral-100 pt-6">
              <h3 className="text-sm font-bold text-primary-800">Temas de atuação (opcional)</h3>
              <p className="mt-1 text-sm text-neutral-500">
                Marque os temas específicos que você atende. Isso ajuda os clientes a te encontrarem com mais precisão.
              </p>
              <div className="mt-4 space-y-5">
                {profile.areas.map((area) => {
                  const subs = subcategoriasDaCategoria(area);
                  if (subs.length === 0) return null;
                  return (
                    <div key={area} data-testid={`grupo-subcategorias-${area}`}>
                      <p className="text-sm font-medium text-neutral-700 mb-2">{area}</p>
                      <div className="flex flex-wrap gap-2">
                        {subs.map((sub) => (
                          <button
                            key={sub}
                            type="button"
                            onClick={() => toggleSubcategoria(sub)}
                            className={badgeClass(profile.subcategorias.includes(sub))}
                            data-testid={`badge-subcategoria-${sub}`}
                          >
                            {sub}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>

        {/* Seção 5 — Locais de atendimento */}
        <Card>
          <SectionTitle>Locais de atendimento</SectionTitle>
          <p className="mt-1 text-sm text-neutral-500">
            Selecione os estados e as cidades onde você atende. Você pode atender em várias cidades e estados.
          </p>

          {/* Passo 1: estado */}
          <div className="mt-4">
            <StateAutocomplete
              value={selectedUf}
              onSelect={setSelectedUf}
              placeholder="Selecione um estado..."
              inputClassName="w-full bg-white pr-10"
              testId="select-estado-painel"
            />
          </div>

          {/* Passo 2: autocomplete de cidades */}
          {selectedUf && (
            <div className="mt-3">
              <CityAutocomplete
                uf={selectedUf}
                onSelect={addCidade}
                testId="autocomplete-cidade-painel"
              />
            </div>
          )}

          {/* Passo 3: cidades selecionadas */}
          <div className="mt-4 flex flex-wrap gap-2">
            {profile.cidades.map((c) => (
              <span
                key={`${c.nome}-${c.uf}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-primary-100 px-3 py-1.5 text-sm text-primary-800"
                data-testid={`tag-cidade-${c.nome}-${c.uf}`}
              >
                {c.nome}, {c.uf}
                <button
                  type="button"
                  onClick={() => removeCidade(c.nome, c.uf)}
                  className="rounded-full p-0.5 text-primary-600 transition-colors hover:bg-primary-200 hover:text-primary-900"
                  aria-label={`Remover ${c.nome}, ${c.uf}`}
                  data-testid={`button-remover-cidade-${c.nome}-${c.uf}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
            {profile.atendeOnline && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#1E7D4F]/30 bg-[#1E7D4F]/10 px-3 py-1.5 text-sm font-medium text-[#1E7D4F]" data-testid="tag-online">
                🌐 Online - Todo o Brasil
              </span>
            )}
          </div>

          {profile.cidades.length === 0 && !profile.atendeOnline && (
            <p className="mt-3 text-sm text-neutral-500">
              Nenhum local adicionado ainda. Selecione um estado e busque suas cidades.
            </p>
          )}

          {/* Atendimento online */}
          <label className="mt-5 flex cursor-pointer items-center gap-2.5">
            <Checkbox
              checked={profile.atendeOnline}
              onCheckedChange={(v) => update({ atendeOnline: v === true })}
              data-testid="checkbox-online"
            />
            <span className="text-sm text-neutral-700">Também atendo online em todo o Brasil</span>
          </label>
        </Card>

        {/* Seção 5b — Público atendido e valor da sessão */}
        <Card>
          <SectionTitle>Público atendido e valor da sessão</SectionTitle>
          <p className="mt-1 text-sm text-neutral-500">
            Opcional. Ajuda quem busca um psicólogo para um perfil específico a
            encontrar você.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {PUBLICO_ATENDIDO.map((publico) => (
              <button
                key={publico}
                type="button"
                onClick={() => togglePublico(publico)}
                className={badgeClass(profile.publicoAtendido.includes(publico))}
                data-testid={`badge-publico-${publico}`}
              >
                {publico}
              </button>
            ))}
          </div>
          <div className="mt-6">
            <label htmlFor="preco-sessao" className="block text-sm font-bold text-neutral-700 mb-1.5">
              Valor da sessão
            </label>
            <input
              id="preco-sessao"
              type="text"
              value={profile.precoSessao}
              onChange={(e) => update({ precoSessao: e.target.value })}
              placeholder="Ex: R$150 - R$250"
              className="w-full h-11 px-4 rounded-lg border border-neutral-300 text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              data-testid="input-preco-sessao"
            />
          </div>
        </Card>

        {/* Seção 6 — Links e contato */}
        <Card>
          <SectionTitle>Links e contato</SectionTitle>
          <div className="mt-4 space-y-4">
            <ContactField
              id="whatsapp"
              icon={<Phone className="h-4 w-4" />}
              label="WhatsApp"
              required
              value={profile.whatsapp}
              onChange={(v) => {
                update({ whatsapp: maskPhone(v) });
                if (whatsappError) setWhatsappError("");
              }}
              placeholder="(11) 99999-9999"
              inputMode="numeric"
              testId="input-whatsapp"
              error={whatsappError}
            />
            <ContactField
              id="instagram"
              icon={<Instagram className="h-4 w-4" />}
              label="Instagram"
              value={profile.instagram}
              onChange={(v) => update({ instagram: v })}
              placeholder="@seuusuario"
              testId="input-instagram"
            />
            <ContactField
              id="linkedin"
              icon={<Linkedin className="h-4 w-4" />}
              label="LinkedIn"
              value={profile.linkedin}
              onChange={(v) => update({ linkedin: v })}
              placeholder="linkedin.com/in/seuperfil"
              testId="input-linkedin"
            />
            <ContactField
              id="website"
              icon={<Globe className="h-4 w-4" />}
              label="Website"
              value={profile.website}
              onChange={(v) => update({ website: v })}
              placeholder="www.seusite.com.br"
              testId="input-website"
            />
            <ContactField
              id="outro"
              icon={<Link2 className="h-4 w-4" />}
              label="Outro link"
              value={profile.outro}
              onChange={(v) => update({ outro: v })}
              placeholder="https://..."
              testId="input-outro"
            />
          </div>
        </Card>

        {/* Ações desktop */}
        <div className="hidden md:flex justify-end gap-3">
          <Button
            variant="outline"
            className="border-primary-300 text-primary-700 hover:bg-primary-50"
            onClick={() => setShowPreview(true)}
            data-testid="button-ver-previa"
          >
            Ver prévia do perfil
          </Button>
          <Button
            className="bg-primary-600 hover:bg-primary-700 text-white"
            onClick={handleSave}
            disabled={saving}
            data-testid="button-salvar"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...
              </>
            ) : (
              "Salvar alterações"
            )}
          </Button>
        </div>
      </div>

      {/* Barra fixa mobile */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-neutral-200 shadow-[0_-2px_10px_rgb(0,0,0,0.06)] p-4 flex gap-3 z-40">
        <Button
          variant="outline"
          className="flex-1 border-primary-300 text-primary-700 hover:bg-primary-50"
          onClick={() => setShowPreview(true)}
          data-testid="button-ver-previa-mobile"
        >
          Ver prévia
        </Button>
        <Button
          className="flex-1 bg-primary-600 hover:bg-primary-700 text-white"
          onClick={handleSave}
          disabled={saving}
          data-testid="button-salvar-mobile"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
        </Button>
      </div>

      {/* Modal de prévia */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl" data-testid="modal-previa">
          <DialogHeader>
            <DialogTitle className="text-primary-800">Prévia do seu perfil</DialogTitle>
            <DialogDescription className="text-neutral-500">
              É assim que seu perfil aparece na listagem de psicólogos.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="flex gap-4">
              <div className="h-16 w-16 rounded-full overflow-hidden shrink-0 bg-primary-100 flex items-center justify-center">
                {profile.photo ? (
                  <img src={profile.photo} alt="Foto" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xl font-bold text-primary-800">{getInitial(profile.nome)}</span>
                )}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-primary-900 leading-tight">{profile.nome || "Seu nome"}</h3>
                <span className="inline-flex items-center gap-1 mt-1 text-[#1E7D4F] text-xs font-medium bg-[#1E7D4F]/10 border border-[#1E7D4F]/20 rounded-full px-2 py-0.5">
                  <Check className="h-3 w-3" /> {profile.crp || "CRP"}
                </span>
                {(profile.cidades.length > 0 || profile.atendeOnline) && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-neutral-500" data-testid="text-previa-locais">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span>
                      {profile.cidades.slice(0, 2).map((c) => `${c.nome}, ${c.uf}`).join(" · ")}
                      {profile.cidades.length > 2 && ` · +${profile.cidades.length - 2} cidades`}
                      {profile.atendeOnline && (profile.cidades.length > 0 ? " · 🌐 Online" : "🌐 Online - Todo o Brasil")}
                    </span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 mt-4">
              {profile.areas.map((area) => (
                <span key={area} className="bg-primary-50 text-primary-700 rounded-full text-xs px-2.5 py-1">
                  {area}
                </span>
              ))}
            </div>

            <p className="mt-3 text-sm text-neutral-600 italic line-clamp-2">"{profile.about}"</p>

            <Button
              disabled
              className="w-full mt-4 bg-accent-500 text-white rounded-full opacity-90 cursor-default"
              data-testid="button-previa-contato"
            >
              Ver contato
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

interface ContactFieldProps {
  id: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  required?: boolean;
  inputMode?: "text" | "numeric";
  testId: string;
  error?: string;
}

function ContactField({
  id,
  icon,
  label,
  value,
  onChange,
  placeholder,
  required,
  inputMode = "text",
  testId,
  error,
}: ContactFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-bold text-neutral-700 mb-1.5">
        {label}
        {required && <span className="text-[#C0392B]"> *</span>}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">{icon}</span>
        <input
          id={id}
          type="text"
          inputMode={inputMode}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full h-11 pl-10 pr-4 rounded-lg border text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
            error ? "border-[#C0392B]" : "border-neutral-300"
          }`}
          data-testid={testId}
        />
      </div>
      {error && (
        <p className="mt-1.5 text-sm text-[#C0392B]" data-testid={`error-${id}`}>
          {error}
        </p>
      )}
    </div>
  );
}
