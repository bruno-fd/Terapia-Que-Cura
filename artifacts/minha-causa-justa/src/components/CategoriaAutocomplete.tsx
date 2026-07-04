import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { buscarCategorias, type ResultadoBusca } from "@/data/categories";

interface CategoriaAutocompleteProps {
  value: string;
  onSelect: (resultado: ResultadoBusca) => void;
  onClear?: () => void;
  onQueryChange?: (texto: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  testId?: string;
}

// Busca livre de categorias: pesquisa ao mesmo tempo nas macrocategorias
// (ex.: "Trabalho e Emprego") e nas subcategorias (ex.: "Rescisão Indireta").
// Campo vazio mostra as 12 macrocategorias como ponto de partida.
export function CategoriaAutocomplete({
  value,
  onSelect,
  onClear,
  onQueryChange,
  placeholder = "Qual é o seu problema?",
  className = "",
  inputClassName = "",
  testId = "input-categoria",
}: CategoriaAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sugestões agrupadas: "Áreas" (macros) primeiro, depois "Temas específicos"
  // (subcategorias). A navegação por teclado percorre a MESMA ordem exibida.
  const encontrados = buscarCategorias(query.trim()).slice(0, 10);
  const macros = encontrados.filter((r) => r.tipo === "macro");
  const subs = encontrados.filter((r) => r.tipo === "sub");
  const sugestoes = [...macros, ...subs];

  const handleChange = (v: string) => {
    setQuery(v);
    setActiveIndex(-1);
    setOpen(true);
    onQueryChange?.(v);
    if (v.trim() === "" && onClear) onClear();
  };

  const selecionar = (r: ResultadoBusca) => {
    onSelect(r);
    setQuery(r.nome);
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (!open) {
      if (e.key === "ArrowDown") {
        setOpen(true);
        setActiveIndex(0);
        e.preventDefault();
      }
      return;
    }
    if (sugestoes.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % sugestoes.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? sugestoes.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const alvo =
        activeIndex >= 0 && activeIndex < sugestoes.length
          ? sugestoes[activeIndex]
          : sugestoes[0];
      if (alvo) selecionar(alvo);
    }
  };

  const renderOption = (r: ResultadoBusca, index: number) => (
    <li
      key={r.tipo === "macro" ? `m-${r.slug}` : `s-${r.macroSlug}-${r.nome}`}
      role="option"
      aria-selected={index === activeIndex}
      onMouseDown={(e) => {
        e.preventDefault();
        selecionar(r);
      }}
      onMouseEnter={() => setActiveIndex(index)}
      className={`cursor-pointer px-4 py-2.5 text-sm ${
        index === activeIndex ? "bg-primary-50" : "hover:bg-primary-50"
      }`}
      data-testid={`${testId}-option-${index}`}
    >
      {r.tipo === "macro" ? (
        <span className="flex items-center gap-2 font-medium text-neutral-900">
          <span aria-hidden="true">{r.emoji}</span>
          {r.nome}
        </span>
      ) : (
        <span className="flex flex-col">
          <span className="text-neutral-900">{r.nome}</span>
          <span className="text-xs text-neutral-500">em {r.macroNome}</span>
        </span>
      )}
    </li>
  );

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <Input
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={inputClassName}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={`${testId}-listbox`}
        data-testid={testId}
      />

      {open && sugestoes.length > 0 && (
        <ul
          id={`${testId}-listbox`}
          role="listbox"
          className="scroll-visible absolute z-50 mt-1 w-full max-h-72 overflow-y-auto rounded-lg border border-neutral-200 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
          data-testid={`${testId}-listbox`}
        >
          {macros.length > 0 && (
            <li
              role="presentation"
              className="px-4 pt-2.5 pb-1 text-[11px] font-bold uppercase tracking-wide text-neutral-400"
            >
              Áreas
            </li>
          )}
          {macros.map((r) => renderOption(r, sugestoes.indexOf(r)))}

          {subs.length > 0 && (
            <li
              role="presentation"
              className="px-4 pt-2.5 pb-1 text-[11px] font-bold uppercase tracking-wide text-neutral-400"
            >
              Temas específicos
            </li>
          )}
          {subs.map((r) => renderOption(r, sugestoes.indexOf(r)))}
        </ul>
      )}
    </div>
  );
}
