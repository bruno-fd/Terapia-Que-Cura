import { useState, type ReactNode } from "react";
import { Link } from "wouter";
import { User, BarChart3, CreditCard, ExternalLink, LogOut, Menu, X } from "lucide-react";
import { useClerk, useUser } from "@clerk/react";
import logoUrl from "@assets/logo-terapia-que-cura.png";
import { PainelStatusBanner } from "@/components/PainelStatusBanner";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

type ActiveItem = "perfil" | "metricas" | "assinatura";

interface DashboardLayoutProps {
  active: ActiveItem;
  children: ReactNode;
}

interface NavItem {
  key: ActiveItem;
  label: string;
  href: string;
  icon: typeof User;
}

const NAV_ITEMS: NavItem[] = [
  { key: "perfil", label: "Meu Perfil", href: "/painel/perfil", icon: User },
  { key: "metricas", label: "Desempenho", href: "/painel/metricas", icon: BarChart3 },
  { key: "assinatura", label: "Minha Assinatura", href: "/painel/assinatura", icon: CreditCard },
];

export function DashboardLayout({ active, children }: DashboardLayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { signOut } = useClerk();
  const { user } = useUser();

  const displayName =
    user?.fullName ||
    user?.primaryEmailAddress?.emailAddress ||
    "Psicólogo";

  const handleLogout = () => {
    void signOut({ redirectUrl: basePath || "/" });
  };

  const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="flex flex-col py-4">
      {NAV_ITEMS.map(({ key, label, href, icon: Icon }) => {
        const isActive = key === active;
        return (
          <Link
            key={key}
            href={href}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors border-l-[3px] ${
              isActive
                ? "bg-primary-50 border-primary-500 text-primary-800"
                : "border-transparent text-neutral-700 hover:bg-primary-50"
            }`}
            data-testid={`sidebar-link-${key}`}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" />
            {label}
          </Link>
        );
      })}

      <a
        href="/psicologos"
        target="_blank"
        rel="noopener noreferrer"
        onClick={onNavigate}
        className="flex items-center gap-3 px-5 py-3 text-sm font-medium text-neutral-700 hover:bg-primary-50 border-l-[3px] border-transparent transition-colors"
        data-testid="sidebar-link-perfil-publico"
      >
        <ExternalLink className="h-[18px] w-[18px] shrink-0" />
        Ver meu perfil público
      </a>

      <div className="my-3 mx-5 border-t border-neutral-200" />

      <button
        onClick={() => {
          onNavigate?.();
          handleLogout();
        }}
        className="flex items-center gap-3 px-5 py-3 text-sm font-medium text-[#C0392B] hover:bg-[#C0392B]/5 border-l-[3px] border-transparent transition-colors text-left"
        data-testid="sidebar-link-sair"
      >
        <LogOut className="h-[18px] w-[18px] shrink-0" />
        Sair
      </button>
    </nav>
  );

  return (
    <div className="min-h-screen flex flex-col font-sans bg-neutral-100">
      {/* NAV do painel */}
      <header className="sticky top-0 z-50 bg-white border-b border-neutral-200 shadow-sm text-neutral-900">
        <div className="h-16 px-4 md:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-2 -ml-2 text-neutral-600 hover:text-primary-600"
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menu"
              data-testid="button-painel-menu"
            >
              <Menu className="h-6 w-6" />
            </button>
            <Link href="/" className="flex items-center hover:opacity-90 transition-opacity" data-testid="link-painel-logo">
              <img src={logoUrl} alt="Terapia Que Cura" className="h-11 w-auto" />
            </Link>
          </div>

          <span className="hidden md:block text-sm text-neutral-500">Área do Psicólogo</span>

          <div className="flex items-center gap-4">
            <span className="hidden sm:block text-sm text-neutral-700 truncate max-w-[200px]">{displayName}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-primary-700 font-medium hover:underline"
              data-testid="button-painel-sair"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Menu lateral (desktop) */}
        <aside className="hidden md:block w-[220px] shrink-0 bg-white border-r border-neutral-200 shadow-sm">
          <div className="sticky top-16">
            <SidebarContent />
          </div>
        </aside>

        {/* Overlay mobile */}
        {menuOpen && (
          <div className="md:hidden fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setMenuOpen(false)}
              data-testid="overlay-painel-menu"
            />
            <aside className="absolute top-0 left-0 h-full w-[260px] bg-white shadow-xl flex flex-col">
              <div className="h-16 px-5 flex items-center justify-between border-b border-neutral-200 bg-white">
                <Link href="/" onClick={() => setMenuOpen(false)} className="flex items-center hover:opacity-90 transition-opacity" data-testid="link-painel-drawer-logo">
                  <img src={logoUrl} alt="Terapia Que Cura" className="h-10 w-auto" />
                </Link>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="text-neutral-600 hover:text-primary-600 p-1"
                  aria-label="Fechar menu"
                  data-testid="button-fechar-painel-menu"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <SidebarContent onNavigate={() => setMenuOpen(false)} />
            </aside>
          </div>
        )}

        {/* Conteúdo principal */}
        <main className="flex-1 min-w-0 p-5 md:p-8">
          <div className="max-w-[900px] mx-auto">
            <PainelStatusBanner />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
