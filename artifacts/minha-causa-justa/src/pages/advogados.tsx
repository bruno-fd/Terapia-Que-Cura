import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Phone, Check } from "lucide-react";

// Mock Data
const MOCK_LAWYERS = [
  {
    id: 1,
    name: "Dra. Carla Mendes Santos",
    oab: "OAB/SP 145.782",
    primaryArea: "Direito Previdenciário",
    secondaryArea: "Direito da Saúde",
    states: "SP, RJ",
    badges: ["INSS", "Auxílio Doença", "Aposentadoria", "BPC/LOAS"],
    about: "Advogada previdenciária com 12 anos de experiência. Atuo exclusivamente com causas contra o INSS e operadoras de saúde.",
    phone: "(11) 9 8765-4321"
  },
  {
    id: 2,
    name: "Dr. Marcos Oliveira",
    oab: "OAB/MG 98.433",
    primaryArea: "Direito do Trabalho",
    secondaryArea: "Direito do Consumidor",
    states: "MG, DF, GO",
    badges: ["Demissão", "Rescisão", "Direitos Trabalhistas", "Consumidor"],
    about: "Especialista em demissão sem justa causa e rescisão indireta. Mais de 800 causas trabalhistas encerradas.",
    phone: "(31) 9 7654-3210"
  },
  {
    id: 3,
    name: "Dra. Patrícia Lima Costa",
    oab: "OAB/RJ 212.100",
    primaryArea: "Direito de Família",
    secondaryArea: "Direito das Sucessões",
    states: "RJ, ES",
    badges: ["Pensão Alimentícia", "Pensão por Morte", "Inventário", "Herança"],
    about: "Atuo com famílias em momentos difíceis. Linguagem clara, processo transparente, sem surpresas.",
    phone: "(21) 9 6543-2109"
  },
  {
    id: 4,
    name: "Dr. Ricardo Souza Neto",
    oab: "OAB/RS 67.890",
    primaryArea: "Direito Previdenciário",
    secondaryArea: "",
    states: "RS, SC, PR",
    badges: ["INSS", "BPC/LOAS", "Aposentadoria por Invalidez", "Revisão de Benefício"],
    about: "Mais de 1.200 benefícios conquistados para clientes do Sul do Brasil. Primeira consulta gratuita.",
    phone: "(51) 9 5432-1098"
  },
  {
    id: 5,
    name: "Dra. Fernanda Almeida",
    oab: "OAB/BA 54.321",
    primaryArea: "Direito da Saúde",
    secondaryArea: "Direito do Consumidor",
    states: "BA, SE, AL",
    badges: ["Plano de Saúde", "Negativa de Cobertura", "Reajuste Abusivo", "Consumidor"],
    about: "Especializada em obrigar planos de saúde a cumprir o contrato. Resultados em 30 a 60 dias.",
    phone: "(71) 9 4321-0987"
  },
  {
    id: 6,
    name: "Dr. Thiago Corrêa Barbosa",
    oab: "OAB/CE 33.456",
    primaryArea: "Direito de Família",
    secondaryArea: "",
    states: "CE, PI, MA",
    badges: ["Pensão Alimentícia", "Divórcio", "Guarda", "Família"],
    about: "Cuido de questões de família com respeito e agilidade. Atendimento humanizado em todos os casos.",
    phone: "(85) 9 3210-9876"
  }
];

export default function Advogados() {
  const [, setLocation] = useLocation();
  const [problema, setProblema] = useState<string>("");
  const [estado, setEstado] = useState<string>("");
  const [filteredLawyers, setFilteredLawyers] = useState(MOCK_LAWYERS);
  
  const [contactLawyer, setContactLawyer] = useState<typeof MOCK_LAWYERS[0] | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const probParam = params.get("problema");
    const estParam = params.get("estado");
    
    if (probParam) setProblema(probParam);
    if (estParam) setEstado(estParam);
    
    if (probParam || estParam) {
      applyFilters(probParam || "", estParam || "");
    }
  }, []);

  const applyFilters = (prob: string, est: string) => {
    let filtered = MOCK_LAWYERS;
    if (prob) {
      // Very simple filter matching text
      filtered = filtered.filter(l => 
        l.primaryArea.toLowerCase().includes(prob.toLowerCase().split(' ')[0]) || 
        l.secondaryArea.toLowerCase().includes(prob.toLowerCase().split(' ')[0]) ||
        l.badges.some(b => prob.toLowerCase().includes(b.toLowerCase())) ||
        prob.toLowerCase().includes(l.primaryArea.toLowerCase()) ||
        (prob === "INSS — benefício negado ou cortado" && l.badges.includes("INSS")) ||
        (prob === "Auxílio Doença" && l.badges.includes("Auxílio Doença")) ||
        (prob === "Aposentadoria" && l.badges.includes("Aposentadoria")) ||
        (prob === "BPC/LOAS" && l.badges.includes("BPC/LOAS")) ||
        (prob === "Plano de saúde — reajuste abusivo ou negativa de cobertura" && l.badges.includes("Plano de Saúde")) ||
        (prob === "Pensão alimentícia" && l.badges.includes("Pensão Alimentícia")) ||
        (prob === "Pensão por morte" && l.badges.includes("Pensão por Morte")) ||
        (prob === "Inventário e herança" && l.badges.includes("Inventário")) ||
        (prob === "Demissão e direitos trabalhistas" && l.badges.includes("Demissão"))
      );
    }
    if (est) {
      filtered = filtered.filter(l => l.states.includes(est));
    }
    setFilteredLawyers(filtered);
  };

  const handleSearch = () => {
    applyFilters(problema, estado);
    
    // Update URL without reload
    const url = new URL(window.location.href);
    if (problema) url.searchParams.set("problema", problema);
    else url.searchParams.delete("problema");
    
    if (estado) url.searchParams.set("estado", estado);
    else url.searchParams.delete("estado");
    
    window.history.pushState({}, '', url);
  };

  const estados = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", 
    "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
  ];

  const problemas = [
    "INSS — benefício negado ou cortado",
    "Auxílio Doença",
    "Aposentadoria",
    "BPC/LOAS",
    "Plano de saúde — reajuste abusivo ou negativa de cobertura",
    "Pensão alimentícia",
    "Pensão por morte",
    "Inventário e herança",
    "Demissão e direitos trabalhistas",
    "Outro"
  ];

  const getInitials = (name: string) => {
    return name.replace("Dr. ", "").replace("Dra. ", "").split(" ").map(n => n[0]).slice(0, 2).join("");
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#F5F4F2]">
      <Navbar />

      <main className="flex-grow">
        {/* Hero with filters */}
        <section className="bg-[#1A3F73] text-white py-12 md:py-16">
          <div className="container mx-auto px-6 max-w-[1200px]">
            <h1 className="text-3xl md:text-4xl font-bold mb-3">Encontrar Advogado</h1>
            <p className="text-primary-100 text-lg mb-8">Use os filtros abaixo para encontrar um profissional na sua área e no seu estado.</p>
            
            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Select value={problema} onValueChange={setProblema}>
                    <SelectTrigger className="bg-white text-neutral-900 border-0 h-12" data-testid="filter-select-problema">
                      <SelectValue placeholder="Qual é o seu problema?" />
                    </SelectTrigger>
                    <SelectContent>
                      {problemas.map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full md:w-48">
                  <Select value={estado} onValueChange={setEstado}>
                    <SelectTrigger className="bg-white text-neutral-900 border-0 h-12" data-testid="filter-select-estado">
                      <SelectValue placeholder="Seu estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {estados.map(uf => (
                        <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleSearch} 
                  className="bg-[#E86100] hover:bg-[#C45200] text-white h-12 px-8 text-base font-medium"
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
            {filteredLawyers.length === 0 ? (
              <div className="text-center py-20">
                <h3 className="text-2xl font-bold text-primary-900 mb-2">Nenhum advogado encontrado</h3>
                <p className="text-neutral-600">Tente ajustar seus filtros para ver mais resultados.</p>
                <Button 
                  variant="outline" 
                  className="mt-6 border-primary-500 text-primary-600"
                  onClick={() => { setProblema(""); setEstado(""); applyFilters("", ""); }}
                  data-testid="button-limpar-filtros"
                >
                  Limpar filtros
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredLawyers.map((lawyer) => (
                  <div key={lawyer.id} className="bg-white p-6 rounded-lg border border-neutral-300 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full" data-testid={`lawyer-card-${lawyer.id}`}>
                    <div className="flex gap-4 mb-4">
                      <Avatar className="h-20 w-20 shrink-0 bg-primary-100 border border-primary-100">
                        <AvatarFallback className="text-primary-800 font-bold text-xl">{getInitials(lawyer.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex flex-col items-start gap-1 mb-1">
                          <h3 className="font-bold text-lg text-primary-900 leading-tight">{lawyer.name}</h3>
                          <Badge variant="secondary" className="bg-[#1E7D4F]/10 text-[#1E7D4F] hover:bg-[#1E7D4F]/20 font-medium px-2 py-0.5 rounded-full border-[#1E7D4F]/20">
                            <Check className="w-3 h-3 mr-1" /> {lawyer.oab}
                          </Badge>
                        </div>
                        <p className="text-neutral-700 text-sm">
                          {lawyer.primaryArea}
                          {lawyer.secondaryArea && <span> • {lawyer.secondaryArea}</span>}
                        </p>
                        <p className="text-neutral-500 text-xs mt-1">
                          Atende: {lawyer.states}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {lawyer.badges.map(badge => (
                        <Badge key={badge} variant="secondary" className="bg-primary-50 text-primary-800 hover:bg-primary-100 rounded-sm font-normal text-xs">
                          {badge}
                        </Badge>
                      ))}
                    </div>

                    <p className="text-neutral-700 text-sm mb-6 flex-grow line-clamp-2">
                      "{lawyer.about}"
                    </p>

                    <Button 
                      variant="outline" 
                      className="w-full border-primary-500 text-primary-600 hover:bg-primary-50"
                      onClick={() => setContactLawyer(lawyer)}
                      data-testid={`button-ver-contato-${lawyer.id}`}
                    >
                      Ver contato
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* CTA advogados */}
        <section className="bg-[#EEF5FC] py-16 text-center border-t border-border/40">
          <div className="container mx-auto px-6 max-w-[800px]">
            <h2 className="text-2xl md:text-3xl font-bold text-primary-900 mb-4">Você é advogado e não está aqui?</h2>
            <p className="text-lg text-neutral-600 mb-8">Cadastre seu perfil e apareça para pessoas que precisam exatamente do que você faz.</p>
            <Button asChild size="lg" className="bg-[#E86100] hover:bg-[#C45200] text-white h-14 px-8 text-lg">
              <button onClick={() => setLocation("/cadastro")} data-testid="button-cta-bottom-cadastro">
                Quero cadastrar meu perfil
              </button>
            </Button>
          </div>
        </section>
      </main>

      <Footer />

      {/* Contact Modal */}
      <Dialog open={!!contactLawyer} onOpenChange={(open) => !open && setContactLawyer(null)}>
        <DialogContent className="sm:max-w-md text-center p-8 bg-white" data-testid="modal-contato">
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
              className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white text-lg h-12"
              onClick={() => window.open(`https://wa.me/55${contactLawyer?.phone.replace(/\D/g, '')}`, '_blank')}
              data-testid="button-chamar-whatsapp"
            >
              Chamar no WhatsApp
            </Button>
            <Button 
              variant="ghost" 
              className="w-full text-neutral-500 hover:text-neutral-900"
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
