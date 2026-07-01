import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetPerfil,
  useUpdatePerfil,
  getGetPerfilQueryKey,
  type UpdateProfileInput,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { getInitial, maskPhone } from "@/lib/dashboard";
import { ProvaSocial, PROVA_SOCIAL } from "@/components/cadastro/ProvaSocial";
import type { FunnelData } from "@/lib/cadastro-funnel";
import {
  getAssinatura,
  type SubscriptionState,
} from "@/lib/assinatura";
import {
  ArrowLeft,
  Loader2,
  Check,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";

const ABOUT_LIMIT = 500;
const MAX_PHOTO_MB = 5;
const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

interface Props {
  data: FunnelData;
  onConcluir: () => void;
  onBack: () => void;
}

export function StepPerfil({ data, onConcluir, onBack }: Props) {
  const queryClient = useQueryClient();
  const { data: loaded } = useGetPerfil();
  const updateMutation = useUpdatePerfil();
  const fileRef = useRef<HTMLInputElement>(null);
  const hidratado = useRef(false);

  const [profile, setProfile] = useState<UpdateProfileInput>({
    nome: data.nome,
    oab: data.oab ? `OAB/${data.seccional} ${data.oab}`.trim() : "",
    photo: null,
    about: "",
    areas: data.areas,
    cidades: data.cidades,
    atendeOnline: data.atendeOnline,
    whatsapp: data.telefone,
    instagram: "",
    linkedin: "",
    website: "",
    outro: "",
    // Verificação da OAB (etapa 1): o token assinado prova o status ao servidor,
    // que grava oabVerificada com segurança. A flag "pendente" cobre o fallback.
    oabToken: data.oabToken,
    oabVerificacaoPendente: data.oabVerificacaoPendente,
  });
  const [oabErro, setOabErro] = useState("");
  const [photoErro, setPhotoErro] = useState("");
  const [saveErro, setSaveErro] = useState("");
  const [assinatura, setAssinatura] = useState<SubscriptionState | null>(null);

  // Estado do pagamento, para o banner desta etapa (confirmado x aguardando).
  useEffect(() => {
    let ativo = true;
    getAssinatura()
      .then((s) => {
        if (ativo) setAssinatura(s.hasSubscription ? s : null);
      })
      .catch(() => {
        if (ativo) setAssinatura(null);
      });
    return () => {
      ativo = false;
    };
  }, []);

  // Mescla dados já salvos no servidor (se o advogado retomou o cadastro)
  // sem sobrescrever o que veio do funil. Roda uma única vez.
  useEffect(() => {
    if (loaded && !hidratado.current) {
      hidratado.current = true;
      setProfile((p) => ({
        ...p,
        nome: p.nome || loaded.nome,
        oab: loaded.oab || p.oab,
        photo: loaded.photo ?? p.photo,
        about: loaded.about || p.about,
        areas: p.areas.length ? p.areas : loaded.areas,
        cidades: p.cidades.length ? p.cidades : loaded.cidades,
        atendeOnline: p.atendeOnline || loaded.atendeOnline,
        whatsapp: p.whatsapp || loaded.whatsapp,
        instagram: loaded.instagram || p.instagram,
        linkedin: loaded.linkedin || p.linkedin,
        website: loaded.website || p.website,
        outro: loaded.outro || p.outro,
      }));
    }
  }, [loaded]);

  const update = (patch: Partial<UpdateProfileInput>) =>
    setProfile((p) => ({ ...p, ...patch }));

  const aboutOver = profile.about.length > ABOUT_LIMIT;

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setPhotoErro("Formato inválido. Use JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
      setPhotoErro("Arquivo maior que 5MB. Escolha uma imagem menor.");
      return;
    }
    setPhotoErro("");
    const reader = new FileReader();
    reader.onload = () => update({ photo: reader.result as string });
    reader.readAsDataURL(file);
  };

  const salvar = () => {
    setSaveErro("");
    if (!profile.oab.trim()) {
      setOabErro("Informe seu número de OAB.");
      return;
    }
    if (aboutOver) return;
    updateMutation.mutate(
      { data: profile },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetPerfilQueryKey() });
          onConcluir();
        },
        onError: (err) =>
          setSaveErro(
            err instanceof Error
              ? err.message
              : "Não foi possível salvar. Tente novamente.",
          ),
      },
    );
  };

  const saving = updateMutation.isPending;

  return (
    <div data-testid="step-perfil">
      <ProvaSocial>{PROVA_SOCIAL.perfil}</ProvaSocial>
      <h2 className="text-2xl md:text-3xl font-bold text-primary-900 mb-2">
        Conclua seu perfil
      </h2>
      <p className="text-neutral-600 mb-8">
        Já preenchemos o que você informou. Complete os campos abaixo para
        publicar.
      </p>

      {assinatura?.status === "ativa" ? (
        <div
          className="mb-8 flex items-start gap-3 rounded-2xl border border-[#1E7D4F]/30 bg-[#1E7D4F]/10 p-4"
          data-testid="banner-pagamento-confirmado"
        >
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#1E7D4F]" />
          <div>
            <p className="font-bold text-primary-900">Pagamento confirmado</p>
            <p className="text-sm text-neutral-700">
              Sua assinatura está ativa. Conclua o perfil para publicar agora
              mesmo.
            </p>
          </div>
        </div>
      ) : (
        <div
          className="mb-8 flex items-start gap-3 rounded-2xl border border-[#B97D00]/30 bg-[#B97D00]/10 p-4"
          data-testid="banner-pagamento-aguardando"
        >
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#B97D00]" />
          <div>
            <p className="font-bold text-primary-900">
              Aguardando confirmação do pagamento
            </p>
            <p className="text-sm text-neutral-700">
              Você já pode concluir o perfil. Assim que o pagamento for
              confirmado, ele fica publicado automaticamente.
            </p>
          </div>
        </div>
      )}

      {saveErro && (
        <div
          className="mb-6 rounded-lg border border-[#C0392B]/30 bg-[#C0392B]/10 px-4 py-3 text-sm font-medium text-[#C0392B]"
          data-testid="banner-erro"
        >
          {saveErro}
        </div>
      )}

      <div className="space-y-6">
        <div>
          <span className="block text-sm font-bold text-neutral-700 mb-2">
            Foto de perfil
          </span>
          <div className="flex items-center gap-5">
            <div className="h-[88px] w-[88px] shrink-0 overflow-hidden rounded-full bg-primary-100 flex items-center justify-center">
              {profile.photo ? (
                <img
                  src={profile.photo}
                  alt="Foto de perfil"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-primary-800">
                  {getInitial(profile.nome)}
                </span>
              )}
            </div>
            <div>
              <Button
                variant="outline"
                size="sm"
                className="border-primary-300 text-primary-700 hover:bg-primary-50"
                onClick={() => fileRef.current?.click()}
                data-testid="button-foto"
              >
                Adicionar foto
              </Button>
              <p className="mt-1.5 text-xs text-neutral-500">
                JPG, PNG ou WEBP. Máximo 5MB.
              </p>
              {photoErro && (
                <p className="mt-1 text-xs text-[#C0392B]">{photoErro}</p>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={handlePhoto}
                data-testid="input-foto"
              />
            </div>
          </div>
        </div>

        <div>
          <label
            htmlFor="cad-oab"
            className="block text-sm font-bold text-neutral-700 mb-1.5"
          >
            OAB<span className="text-[#C0392B]"> *</span>
          </label>
          <input
            id="cad-oab"
            type="text"
            value={profile.oab}
            onChange={(e) => {
              update({ oab: e.target.value });
              if (oabErro) setOabErro("");
            }}
            placeholder="Ex: OAB/SP 145.782"
            className={`w-full h-12 px-4 rounded-lg border text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              oabErro ? "border-[#C0392B]" : "border-neutral-300"
            }`}
            data-testid="input-oab"
          />
          {oabErro && (
            <p className="mt-1.5 text-sm text-[#C0392B]" data-testid="erro-oab">
              {oabErro}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="cad-whatsapp"
            className="block text-sm font-bold text-neutral-700 mb-1.5"
          >
            WhatsApp
          </label>
          <input
            id="cad-whatsapp"
            type="tel"
            inputMode="numeric"
            value={profile.whatsapp}
            onChange={(e) => update({ whatsapp: maskPhone(e.target.value) })}
            placeholder="(11) 99999-9999"
            className="w-full h-12 px-4 rounded-lg border border-neutral-300 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            data-testid="input-whatsapp"
          />
        </div>

        <div>
          <label
            htmlFor="cad-about"
            className="block text-sm font-bold text-neutral-700 mb-1.5"
          >
            Sobre você
          </label>
          <div className="relative">
            <textarea
              id="cad-about"
              rows={5}
              value={profile.about}
              onChange={(e) => update({ about: e.target.value })}
              placeholder="Explique, em linguagem simples, o que você resolve para o cliente."
              className={`w-full px-4 py-3 rounded-lg border text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none ${
                aboutOver
                  ? "border-[#C0392B] focus:ring-[#C0392B]"
                  : "border-neutral-300"
              }`}
              data-testid="input-about"
            />
            <span
              className={`absolute bottom-3 right-3 text-xs ${
                aboutOver ? "text-[#C0392B]" : "text-neutral-500"
              }`}
            >
              {profile.about.length}/{ABOUT_LIMIT}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={onBack}
          className="h-12 px-5 rounded-full text-primary-700 hover:bg-primary-50"
          data-testid="button-voltar"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <Button
          onClick={salvar}
          disabled={saving}
          className="h-12 px-7 rounded-full bg-[#1E7D4F] hover:bg-[#1A6B44] text-white font-medium disabled:opacity-60"
          data-testid="button-concluir"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
            </>
          ) : (
            <>
              Concluir cadastro <Check className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
