// Integração com a API pública do IBGE para carregar municípios por estado.
// Sem autenticação, HTTPS, fetch nativo. Cache em memória por sessão.

export interface EstadoUF {
  uf: string;
  nome: string;
}

export const ESTADOS_UF: EstadoUF[] = [
  { uf: "AC", nome: "Acre" },
  { uf: "AL", nome: "Alagoas" },
  { uf: "AP", nome: "Amapá" },
  { uf: "AM", nome: "Amazonas" },
  { uf: "BA", nome: "Bahia" },
  { uf: "CE", nome: "Ceará" },
  { uf: "DF", nome: "Distrito Federal" },
  { uf: "ES", nome: "Espírito Santo" },
  { uf: "GO", nome: "Goiás" },
  { uf: "MA", nome: "Maranhão" },
  { uf: "MT", nome: "Mato Grosso" },
  { uf: "MS", nome: "Mato Grosso do Sul" },
  { uf: "MG", nome: "Minas Gerais" },
  { uf: "PA", nome: "Pará" },
  { uf: "PB", nome: "Paraíba" },
  { uf: "PR", nome: "Paraná" },
  { uf: "PE", nome: "Pernambuco" },
  { uf: "PI", nome: "Piauí" },
  { uf: "RJ", nome: "Rio de Janeiro" },
  { uf: "RN", nome: "Rio Grande do Norte" },
  { uf: "RS", nome: "Rio Grande do Sul" },
  { uf: "RO", nome: "Rondônia" },
  { uf: "RR", nome: "Roraima" },
  { uf: "SC", nome: "Santa Catarina" },
  { uf: "SP", nome: "São Paulo" },
  { uf: "SE", nome: "Sergipe" },
  { uf: "TO", nome: "Tocantins" },
];

export function normalizar(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

interface MunicipioIBGE {
  nome: string;
}

const cidadesCache: Record<string, string[]> = {};

export async function carregarCidades(uf: string): Promise<string[]> {
  if (cidadesCache[uf]) return cidadesCache[uf];
  const res = await fetch(
    `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`,
  );
  if (!res.ok) {
    throw new Error(`Falha ao carregar cidades (${res.status})`);
  }
  const data: MunicipioIBGE[] = await res.json();
  const cidades = data
    .map((m) => m.nome)
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
  cidadesCache[uf] = cidades;
  return cidades;
}
