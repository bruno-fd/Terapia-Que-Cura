// Declaração mínima de import.meta.env para esta lib, que é consumida por apps
// Vite. Evita depender do pacote vite só para os tipos de import.meta.env.
interface ImportMeta {
  readonly env: {
    readonly BASE_URL: string;
  };
}
