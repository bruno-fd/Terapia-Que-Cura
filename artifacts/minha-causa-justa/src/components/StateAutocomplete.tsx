import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ESTADOS_UF, normalizar } from "@/lib/ibge";

interface StateAutocompleteProps {
  value: string;
  onSelect: (uf: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  testId?: string;
}

function rotuloDoUf(uf: string) {
  const e = ESTADOS_UF.find((x) => x.uf === uf);
  return e ? `${e.uf} - ${e.nome}` : "";
}

export function StateAutocomplete({
  value,
  onSelect,
  placeholder = "Digite o estado...",
  disabled = false,
  className = "",
  inputClassName = "",
  testId = "input-estado",
}: StateAutocompleteProps) {
  const [query, setQuery] = useState(rotuloDoUf(value));
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(rotuloDoUf(value));
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
        setQuery(rotuloDoUf(value));
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value]);

  const termo = normalizar(query.trim());
  const sugestoes =
    !query.trim() || query === rotuloDoUf(value)
      ? ESTADOS_UF
      : ESTADOS_UF.filter(
          (e) =>
            normalizar(e.uf).includes(termo) || normalizar(e.nome).includes(termo)
        );

  const handleChange = (v: string) => {
    setQuery(v);
    setActiveIndex(-1);
    setOpen(true);
  };

  const selecionar = (uf: string) => {
    onSelect(uf);
    setQuery(rotuloDoUf(uf));
    setOpen(false);
    setActiveIndex(-1);
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
        selecionar(sugestoes[activeIndex].uf);
      }
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={(e) => {
            e.target.select();
            setOpen(true);
          }}
          onBlur={() => {
            setOpen(false);
            setActiveIndex(-1);
            setQuery(rotuloDoUf(value));
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={inputClassName}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls={`${testId}-listbox`}
          data-testid={testId}
        />
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
      </div>

      {open && sugestoes.length > 0 && (
        <ul
          id={`${testId}-listbox`}
          role="listbox"
          className="scroll-visible absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border border-neutral-200 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
          data-testid={`${testId}-listbox`}
        >
          {sugestoes.map((e, index) => (
            <li
              key={e.uf}
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(ev) => {
                ev.preventDefault();
                selecionar(e.uf);
              }}
              onMouseEnter={() => setActiveIndex(index)}
              className={`cursor-pointer px-4 py-2.5 text-sm text-neutral-800 ${
                index === activeIndex ? "bg-primary-50" : "hover:bg-primary-50"
              }`}
              data-testid={`${testId}-option-${index}`}
            >
              {e.uf} - {e.nome}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
