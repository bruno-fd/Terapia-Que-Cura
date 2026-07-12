import logoUrl from "@assets/minhacausajusta_1782681470221.webp";

export default function Manutencao() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-neutral-50 px-6 py-16 text-center">
      <div className="flex w-full max-w-md flex-col items-center gap-8">
        <img
          src={logoUrl}
          alt="Terapia Que Cura"
          className="h-16 w-auto sm:h-20"
        />

        <div className="flex flex-col gap-3">
          <h1 className="text-2xl font-bold text-primary-800 sm:text-3xl">
            Site em construção
          </h1>
          <p className="text-base text-neutral-600 sm:text-lg">
            Estamos preparando novidades. Volte em breve.
          </p>
        </div>

        <div
          className="h-1 w-24 rounded-full bg-primary-600"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
