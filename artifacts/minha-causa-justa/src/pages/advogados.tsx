import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Phone, Check, Instagram, Linkedin, Globe, MapPin, MessageCircle, Loader2 } from "lucide-react";
import { CityAutocomplete } from "@/components/CityAutocomplete";
import { StateAutocomplete } from "@/components/StateAutocomplete";
import { CATEGORIAS, categoriaPorSlug, slugDaCategoria } from "@/data/categories";
import { useListAdvogados, type PublicLawyer } from "@workspace/api-client-react";

// Tipo de exibição derivado do advogado público vindo da API.
interface Lawyer {
  id: number;
  name: string;
  oab: string;
  photo: string | null;
  primaryArea: string;
  secondaryArea: string;
  cities: string[];
  online: boolean;
  badges: string[];
  about: string;
  phone: string;
  instagram: string;
  website: string;
  linkedin: string;
}

function toViewLawyer(l: PublicLawyer): Lawyer {
  return {
    id: l.id,
    name: l.nome,
    oab: l.oab,
    photo: l.photo ?? null,
    primaryArea: l.areas[0] ?? "",
    secondaryArea: l.areas[1] ?? "",
    cities: l.cidades.map((c) => `${c.nome}, ${c.uf}`),
    online: l.atendeOnline,
    badges: l.areas,
    about: l.about,
    phone: l.whatsapp,
    instagram: "",
    website: "",
    linkedin: "",
  };
}

// Gerador de números pseudoaleatórios determinístico (mulberry32).
// Para a mesma semente, sempre produz a mesma sequência.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Alternância justa: embaralha a lista de profissionais (Fisher-Yates) usando
// uma semente. A ordem deixa de seguir a data de cadastro, de modo que todos
// tenham a mesma chance de aparecer no topo, e não apenas quem chegou primeiro.
function shuffleFair<T>(list: T[], seed: number): T[] {
  const rand = mulberry32(seed);
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function Advogados() {
  const [, setLocation] = useLocation();
  const [categoria, setCategoria] = useState<string>("");
  const [estado, setEstado] = useState<string>("");
  const [cidade, setCidade] = useState<string>("");
  // Filtros efetivamente aplicados (só mudam ao clicar em "Buscar"), separados
  // do estado dos campos para que a lista não filtre enquanto o usuário digita.
  const [applied, setApplied] = useState({ cat: "", est: "", cid: "" });
  // Ordem sorteada de forma justa, definida uma vez por visita (estável durante a navegação).
  const [rotationSeed] = useState(() => Date.now());

  const { data: publicLawyers, isLoading } = useListAdvogados();
  const rotatedLawyers = useMemo(
    () => shuffleFair((publicLawyers ?? []).map(toViewLawyer), rotationSeed),
    [publicLawyers, rotationSeed],
  );

  const filteredLawyers = useMemo(() => {
    let filtered: Lawyer[] = rotatedLawyers;
    if (applied.cat && applied.cat !== "Outro") {
      filtered = filtered.filter((l) => l.badges.includes(applied.cat));
    }
    if (applied.est) {
      filtered = filtered.filter((l) => l.cities.some((c) => c.endsWith(`, ${applied.est}`)));
    }
    if (applied.cid) {
      filtered = filtered.filter((l) => l.cities.includes(applied.cid));
    }
    return filtered;
  }, [rotatedLawyers, applied]);

  const [contactLawyer, setContactLawyer] = useState<Lawyer | null>(null);
  const [detailLawyer, setDetailLawyer] = useState<Lawyer | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const catParam = params.get("categoria");
    const estParam = params.get("estado");
    const cidParam = params.get("cidade");

    const catNome = catParam ? categoriaPorSlug(catParam)?.nome ?? "" : "";
    if (catNome) setCategoria(catNome);
    if (estParam) setEstado(estParam);
    if (cidParam) setCidade(cidParam);

    if (catNome || estParam || cidParam) {
      setApplied({ cat: catNome, est: estParam || "", cid: cidParam || "" });
    }
  }, []);

  const handleSearch = () => {
    setApplied({ cat: categoria, est: estado, cid: cidade });

    // Update URL without reload (slug nos query strings)
    const url = new URL(window.location.href);
    const slug = categoria && categoria !== "Outro" ? slugDaCategoria(categoria) : undefined;
    if (slug) url.searchParams.set("categoria", slug);
    else url.searchParams.delete("categoria");

    if (estado) url.searchParams.set("estado", estado);
    else url.searchParams.delete("estado");

    if (cidade) url.searchParams.set("cidade", cidade);
    else url.searchParams.delete("cidade");

    window.history.pushState({}, '', url);
  };

  const handleEstadoChange = (uf: string) => {
    setEstado(uf);
    setCidade("");
  };

  const opcoesCategoria = [...CATEGORIAS.map((c) => c.nome), "Outro"];

  const getInitials = (name: string) => {
    return name.replace("Dr. ", "").replace("Dra. ", "").split(" ").map(n => n[0]).slice(0, 2).join("");
  };

  const safeUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "http:" || parsed.protocol === "https:" ? url : null;
    } catch {
      return null;
    }
  };

  const formatLocation = (lawyer: Lawyer) => {
    const shown = lawyer.cities.slice(0, 2).join(" · ");
    const extra =
      lawyer.cities.length > 2 ? ` · +${lawyer.cities.length - 2} cidades` : "";
    const online = lawyer.online ? " · 🌐 Online" : "";
    return `${shown}${extra}${online}`;
  };

  const SocialLinks = ({ lawyer, size = "sm" }: { lawyer: Lawyer; size?: "sm" | "lg" }) => {
    const box = size === "lg" ? "h-9 w-9" : "h-7 w-7";
    const icon = size === "lg" ? "h-5 w-5" : "h-3.5 w-3.5";
    const links = [
      lawyer.instagram && {
        key: "ig",
        href: `https://instagram.com/${lawyer.instagram}`,
        label: `Instagram de ${lawyer.name}`,
        Icon: Instagram
      },
      lawyer.website && safeUrl(lawyer.website) && {
        key: "web",
        href: lawyer.website,
        label: `Site de ${lawyer.name}`,
        Icon: Globe
      },
      lawyer.linkedin && safeUrl(lawyer.linkedin) && {
        key: "in",
        href: lawyer.linkedin,
        label: `LinkedIn de ${lawyer.name}`,
        Icon: Linkedin
      }
    ].filter(Boolean) as { key: string; href: string; label: string; Icon: typeof Instagram }[];

    if (links.length === 0) return null;

    return (
      <div className="flex items-center gap-1.5">
        {links.map(({ key, href, label, Icon }) => (
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            title={label}
            onClick={(e) => e.stopPropagation()}
            className={`${box} rounded-full bg-primary-50 text-primary-600 flex items-center justify-center hover:bg-primary-100 hover:text-primary-700 transition-colors shrink-0`}
            data-testid={`social-${key}-${lawyer.id}`}
          >
            <Icon className={icon} strokeWidth={1.75} />
          </a>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#F5F4F2]">
      <Navbar />

      <main className="flex-grow">
        {/* Hero with filters */}
        <section className="bg-white py-12 md:py-16 border-b border-neutral-100">
          <div className="container mx-auto px-6 max-w-[1200px]">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-900 mb-3 tracking-tight">Encontrar advogado</h1>
            <p className="text-neutral-600 text-lg mb-8 max-w-2xl">Use os filtros abaixo para encontrar um profissional na sua área e no seu estado.</p>

            <div className="bg-primary-50 p-4 md:p-6 rounded-[32px] border border-primary-100 shadow-sm">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Select value={categoria} onValueChange={setCategoria}>
                    <SelectTrigger className="bg-white text-neutral-900 border-0 h-14 rounded-2xl shadow-sm px-5" data-testid="filter-select-problema">
                      <SelectValue placeholder="Qual é o seu problema?" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {opcoesCategoria.map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full md:w-48">
                  <StateAutocomplete
                    value={estado}
                    onSelect={handleEstadoChange}
                    placeholder="Estado"
                    inputClassName="bg-white text-neutral-900 border-0 h-14 rounded-2xl shadow-sm px-5 pr-10"
                    testId="filter-select-estado"
                  />
                </div>
                <div className="w-full md:w-56">
                  <CityAutocomplete
                    uf={estado}
                    onSelect={(nome) => setCidade(`${nome}, ${estado}`)}
                    clearOnSelect={false}
                    placeholder="Digite sua cidade..."
                    inputClassName="bg-white text-neutral-900 border-0 h-14 rounded-2xl shadow-sm px-5"
                    testId="filter-autocomplete-cidade"
                  />
                </div>
                <Button
                  onClick={handleSearch}
                  className="bg-accent-500 hover:bg-accent-600 text-white h-14 px-8 text-base font-medium rounded-full shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
                  data-testid="button-aplicar-filtros"
                >
                  Buscar
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Lawyer cards section */}
        <section className="py-16 bg-[#F5F4F2]">
          <div className="container mx-auto px-6 max-w-[1200px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-20" data-testid="advogados-carregando">
                <Loader2 className="h-7 w-7 animate-spin text-primary-500" />
              </div>
            ) : filteredLawyers.length === 0 ? (
              <div className="text-center py-20">
                <h3 className="text-2xl font-bold text-primary-900 mb-2">Nenhum advogado encontrado</h3>
                <p className="text-neutral-600">Tente ajustar seus filtros para ver mais resultados.</p>
                <Button
                  variant="outline"
                  className="mt-6 rounded-full border-primary-200 text-primary-700 hover:bg-primary-50"
                  onClick={() => { setCategoria(""); setEstado(""); setCidade(""); setApplied({ cat: "", est: "", cid: "" }); }}
                  data-testid="button-limpar-filtros"
                >
                  Limpar filtros
                </Button>
              </div>
            ) : (
              <>
                <p className="text-sm text-neutral-500 mb-6" data-testid="text-ordem-alternada">
                  A ordem dos profissionais é alternada a cada visita para dar a mesma visibilidade a todos.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredLawyers.map((lawyer) => (
                  <div key={lawyer.id} className="bg-white p-6 md:p-8 rounded-[28px] border border-neutral-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-shadow flex flex-col h-full" data-testid={`lawyer-card-${lawyer.id}`}>
                    <div className="flex gap-4 mb-5">
                      <Avatar className="h-20 w-20 shrink-0 bg-primary-100 border-2 border-white shadow-sm">
                        {lawyer.photo && (
                          <AvatarImage src={lawyer.photo} alt={lawyer.name} className="object-cover" />
                        )}
                        <AvatarFallback className="text-primary-800 font-bold text-xl">{getInitials(lawyer.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <h3 className="font-bold text-lg text-primary-900 leading-tight">{lawyer.name}</h3>
                          <SocialLinks lawyer={lawyer} />
                        </div>
                        <Badge variant="secondary" className="bg-[#1E7D4F]/10 text-[#1E7D4F] hover:bg-[#1E7D4F]/20 font-medium px-2 py-0.5 rounded-full border border-[#1E7D4F]/20">
                          <Check className="w-3 h-3 mr-1" /> {lawyer.oab}
                        </Badge>
                        <p className="text-neutral-700 text-sm mt-2">
                          {lawyer.primaryArea}
                          {lawyer.secondaryArea && <span> • {lawyer.secondaryArea}</span>}
                        </p>
                        <p className="text-neutral-500 text-xs mt-1 flex items-center gap-1" data-testid={`lawyer-location-${lawyer.id}`}>
                          <MapPin className="w-3 h-3 shrink-0" /> {formatLocation(lawyer)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {lawyer.badges.map(badge => (
                        <Badge key={badge} variant="secondary" className="bg-primary-50 text-primary-700 hover:bg-primary-100 rounded-full font-normal text-xs px-3 py-1">
                          {badge}
                        </Badge>
                      ))}
                    </div>

                    <p className="text-neutral-600 text-sm mb-6 flex-grow line-clamp-2 italic">
                      "{lawyer.about}"
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3 mt-auto">
                      <Button
                        variant="outline"
                        className="flex-1 h-12 rounded-full border-primary-200 text-primary-700 hover:bg-primary-50 hover:border-primary-300 font-medium"
                        onClick={() => setDetailLawyer(lawyer)}
                        data-testid={`button-saiba-mais-${lawyer.id}`}
                      >
                        Saiba mais
                      </Button>
                      <Button
                        className="flex-1 h-12 rounded-full bg-accent-500 hover:bg-accent-600 text-white font-medium shadow-sm hover:shadow-md transition-all"
                        onClick={() => setContactLawyer(lawyer)}
                        data-testid={`button-entrar-contato-${lawyer.id}`}
                      >
                        Entrar em contato
                      </Button>
                    </div>
                  </div>
                ))}
                </div>
              </>
            )}
          </div>
        </section>

        {/* CTA advogados */}
        <section className="bg-[#EEF5FC] py-16 text-center border-t border-border/40">
          <div className="container mx-auto px-6 max-w-[800px]">
            <h2 className="text-2xl md:text-3xl font-bold text-primary-900 mb-4 tracking-tight">Você é advogado e não está aqui?</h2>
            <p className="text-lg text-neutral-600 mb-8">Cadastre seu perfil e apareça para pessoas que precisam exatamente do que você faz.</p>
            <Button
              size="lg"
              className="bg-accent-500 hover:bg-accent-600 text-white h-14 px-8 text-lg rounded-full shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
              onClick={() => setLocation("/cadastro")}
              data-testid="button-cta-bottom-cadastro"
            >
              Quero cadastrar meu perfil
            </Button>
          </div>
        </section>
      </main>

      <Footer />

      {/* Detail Modal — Saiba mais */}
      <Dialog open={!!detailLawyer} onOpenChange={(open) => !open && setDetailLawyer(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0 bg-white rounded-[28px]" data-testid="modal-detalhe">
          {detailLawyer && (
            <>
              <DialogHeader className="sr-only">
                <DialogTitle>Perfil de {detailLawyer.name}</DialogTitle>
                <DialogDescription>Informações completas sobre {detailLawyer.name}.</DialogDescription>
              </DialogHeader>

              {/* Header band */}
              <div className="bg-primary-50 px-6 md:px-8 pt-8 pb-6 rounded-t-[28px]">
                <div className="flex flex-col sm:flex-row gap-5 items-start">
                  <Avatar className="h-24 w-24 shrink-0 bg-primary-100 border-4 border-white shadow-md">
                    {detailLawyer.photo && (
                      <AvatarImage src={detailLawyer.photo} alt={detailLawyer.name} className="object-cover" />
                    )}
                    <AvatarFallback className="text-primary-800 font-bold text-2xl">{getInitials(detailLawyer.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h2 className="text-2xl font-bold text-primary-900 leading-tight">{detailLawyer.name}</h2>
                      <SocialLinks lawyer={detailLawyer} size="lg" />
                    </div>
                    <Badge variant="secondary" className="bg-[#1E7D4F]/10 text-[#1E7D4F] font-medium px-2.5 py-0.5 rounded-full border border-[#1E7D4F]/20">
                      <Check className="w-3 h-3 mr-1" /> {detailLawyer.oab}
                    </Badge>
                    <p className="text-neutral-700 mt-3 font-medium">
                      {detailLawyer.primaryArea}
                      {detailLawyer.secondaryArea && <span> • {detailLawyer.secondaryArea}</span>}
                    </p>
                    <p className="text-neutral-500 text-sm mt-1 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 shrink-0" /> {formatLocation(detailLawyer)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="px-6 md:px-8 py-6 space-y-6">
                <div>
                  <h3 className="font-bold text-primary-900 mb-3">Especialidades</h3>
                  <div className="flex flex-wrap gap-2">
                    {detailLawyer.badges.map(badge => (
                      <Badge key={badge} variant="secondary" className="bg-primary-50 text-primary-700 hover:bg-primary-100 rounded-full font-normal text-sm px-3 py-1">
                        {badge}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-primary-900 mb-3">Sobre mim</h3>
                  <p className="text-neutral-600 leading-relaxed">{detailLawyer.about}</p>
                </div>

                <Button
                  className="w-full h-14 rounded-full bg-accent-500 hover:bg-accent-600 text-white text-base font-medium shadow-md hover:shadow-lg transition-all"
                  onClick={() => {
                    const lawyer = detailLawyer;
                    setDetailLawyer(null);
                    setContactLawyer(lawyer);
                  }}
                  data-testid="button-detalhe-contato"
                >
                  <MessageCircle className="w-5 h-5 mr-2" /> Entrar em contato com {detailLawyer.name.replace("Dr. ", "").replace("Dra. ", "").split(" ")[0]}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Contact Modal */}
      <Dialog open={!!contactLawyer} onOpenChange={(open) => !open && setContactLawyer(null)}>
        <DialogContent className="sm:max-w-md text-center p-8 bg-white rounded-[28px]" data-testid="modal-contato">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-primary-900 text-center mb-2">Falar com advogado</DialogTitle>
            <DialogDescription className="text-center text-neutral-600">
              Entre em contato diretamente com {contactLawyer?.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="py-8 flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
              <Phone className="w-8 h-8" />
            </div>
            <p className="text-3xl font-bold text-neutral-900 mb-2">{contactLawyer?.phone}</p>
            <p className="text-sm text-neutral-500">WhatsApp disponível</p>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white text-lg h-12 rounded-full"
              onClick={() => window.open(`https://wa.me/55${contactLawyer?.phone.replace(/\D/g, '')}?text=${encodeURIComponent('Olá, encontrei seu perfil no Minha Causa Justa e preciso de ajuda jurídica')}`, '_blank')}
              data-testid="button-chamar-whatsapp"
            >
              <MessageCircle className="w-5 h-5 mr-2" /> Chamar no WhatsApp
            </Button>
            <Button
              variant="ghost"
              className="w-full text-neutral-500 hover:text-neutral-900 rounded-full"
              onClick={() => setContactLawyer(null)}
              data-testid="button-fechar-modal"
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
