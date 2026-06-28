import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoUrl from "@assets/minhacausajusta_1782681470221.webp";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-border/40 shadow-sm transition-all duration-200">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between max-w-[1200px]">
        <Link href="/" className="flex items-center hover:opacity-90 transition-opacity" onClick={closeMenu} data-testid="link-logo">
          <img src={logoUrl} alt="Minha Causa Justa" className="h-11 w-auto" />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/advogados" className={`text-sm font-medium transition-colors hover:text-primary-600 ${location === '/advogados' ? 'text-primary-600' : 'text-neutral-700'}`} data-testid="link-encontrar-advogado">
            Encontrar Advogado
          </Link>
          <Link href="/" className="text-sm font-medium text-neutral-700 transition-colors hover:text-primary-600" data-testid="link-areas-atuacao">
            Áreas de Atuação
          </Link>
          <Link href="/blog" className={`text-sm font-medium transition-colors hover:text-primary-600 ${location.startsWith('/blog') ? 'text-primary-600' : 'text-neutral-700'}`} data-testid="link-blog">
            Blog
          </Link>
          <Link href="/cadastro" className="text-sm font-medium text-neutral-700 transition-colors hover:text-primary-600" data-testid="link-sou-advogado-text">
            Sou Advogado
          </Link>
          <Button asChild variant="outline" className="border-primary text-primary hover:bg-primary-50">
            <Link href="/cadastro" data-testid="button-sou-advogado">
              Sou Advogado
            </Link>
          </Button>
        </nav>

        {/* Mobile Toggle */}
        <button
          className="md:hidden p-2 -mr-2 text-neutral-700 hover:text-primary-600 transition-colors"
          onClick={toggleMenu}
          aria-label="Menu"
          data-testid="button-mobile-menu"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Nav */}
      {isOpen && (
        <div className="md:hidden bg-white border-b border-border/40 absolute top-16 left-0 w-full shadow-lg">
          <div className="flex flex-col px-6 py-4 space-y-4">
            <Link href="/advogados" className="text-base font-medium text-neutral-700 py-2 border-b border-neutral-100" onClick={closeMenu} data-testid="mobile-link-encontrar-advogado">
              Encontrar Advogado
            </Link>
            <Link href="/" className="text-base font-medium text-neutral-700 py-2 border-b border-neutral-100" onClick={closeMenu} data-testid="mobile-link-areas-atuacao">
              Áreas de Atuação
            </Link>
            <Link href="/blog" className="text-base font-medium text-neutral-700 py-2 border-b border-neutral-100" onClick={closeMenu} data-testid="mobile-link-blog">
              Blog
            </Link>
            <Button asChild variant="outline" className="w-full mt-4 border-primary text-primary hover:bg-primary-50 justify-center">
              <Link href="/cadastro" onClick={closeMenu} data-testid="mobile-button-sou-advogado">
                Sou Advogado
              </Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
