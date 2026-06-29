import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { carregarCidades, normalizar } from "@/lib/ibge";

interface CityAutocompleteProps {
  uf: string;
  onSelect: (cidade: string) => void;
  placeholder?: string;
  disabled?: boolean;
  clearOnSelect?: boolean;
  className?: string;
  inputClassName?: string;
  testId?: string;
}

export function CityAutocomplete({
  uf,
  onSelect,
  placeholder = "Digite o nome da cidade...",
  disabled = false,
  clearOnSelect = true,
  className = "",
  inputClassName = "",
  testId = "input-cidade",
}: CityAutocompleteProps) {
  const [cidades, setCidades] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(false);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchCidades = (sigla: string) => {
    if (!sigla) {
      setCidades([]);
      return;
    }
    setLoading(true);
    setErro(false);
    carregarCidades(sigla)
      .then(setCidades)
      .catch(() => setErro(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setQuery("");
    setOpen(false);
    setActiveIndex(-1);
    fetchCidades(uf);
  }, [uf]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const sugestoes =
    query.trim().length >= 2
      ? cidades
          .filter((c) => normalizar(c).includes(normalizar(query.trim())))
          .slice(0, 8)
      : [];

  const handleChange = (value: string) => {
    setQuery(value);
    setActiveIndex(-1);
    setOpen(value.trim().length >= 2);
  };

  const selecionar = (cidade: string) => {
    onSelect(cidade);
    setOpen(false);
    setActiveIndex(-1);
    setQuery(clearOnSelect ? "" : cidade);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (!open || sugestoes.length === 0) {
      if (e.key === "ArrowDown" && sugestoes.length > 0) {
        setOpen(true);
        setActiveIndex(0);
        e.preventDefault();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % sugestoes.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? sugestoes.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < sugestoes.length) {
        selecionar(sugestoes[activeIndex]);
      }
      // Enter com texto sem correspondência: ignorar.
    }
  };

  const isDisabled = disabled || !uf;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setOpen(query.trim().length >= 2)}
          onKeyDown={handleKeyDown}
          placeholder={isDisabled ? "Selecione um estado primeiro" : placeholder}
          disabled={isDisabled || loading}
          className={inputClassName}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls={`${testId}-listbox`}
          data-testid={testId}
        />
        {loading && (
          <Spinner className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-600" />
        )}
      </div>

      {erro && (
        <div className="mt-2 text-sm text-[#C0392B] flex items-center gap-2" data-testid={`${testId}-erro`}>
          <span>Não foi possível carregar as cidades. Tente novamente.</span>
          <button
            type="button"
            onClick={() => fetchCidades(uf)}
            className="font-medium underline hover:no-underline"
            data-testid={`${testId}-retry`}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {open && sugestoes.length > 0 && (
        <ul
          id={`${testId}-listbox`}
          role="listbox"
          className="scroll-visible absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border border-neutral-200 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
          data-testid={`${testId}-listbox`}
        >
          {sugestoes.map((cidade, index) => (
            <li
              key={cidade}
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(e) => {
                e.preventDefault();
                selecionar(cidade);
              }}
              onMouseEnter={() => setActiveIndex(index)}
              className={`cursor-pointer px-4 py-2.5 text-sm text-neutral-800 ${
                index === activeIndex ? "bg-primary-50" : "hover:bg-primary-50"
              }`}
              data-testid={`${testId}-option-${index}`}
            >
              {cidade}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
