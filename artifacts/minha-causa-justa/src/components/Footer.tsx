import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="bg-[#0D2B52] text-white py-12 md:py-16">
      <div className="container mx-auto px-6 max-w-[1200px]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 mb-12">
          
          {/* Column 1 */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-primary-100">Institucional</h3>
            <ul className="space-y-3">
              <li><Link href="/" className="text-sm text-neutral-300 hover:text-white transition-colors">Quem somos</Link></li>
              <li><Link href="/" className="text-sm text-neutral-300 hover:text-white transition-colors">Termos de uso</Link></li>
              <li><Link href="/" className="text-sm text-neutral-300 hover:text-white transition-colors">Política de privacidade</Link></li>
            </ul>
          </div>

          {/* Column 2 */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-primary-100">Para quem precisa</h3>
            <ul className="space-y-3">
              <li><Link href="/advogados" className="text-sm text-neutral-300 hover:text-white transition-colors">Encontrar advogado</Link></li>
              <li><Link href="/" className="text-sm text-neutral-300 hover:text-white transition-colors">Áreas de atuação</Link></li>
              <li><Link href="/" className="text-sm text-neutral-300 hover:text-white transition-colors">Blog</Link></li>
            </ul>
          </div>

          {/* Column 3 */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-primary-100">Para advogados</h3>
            <ul className="space-y-3">
              <li><Link href="/cadastro" className="text-sm text-neutral-300 hover:text-white transition-colors">Cadastre seu perfil</Link></li>
              <li><Link href="/cadastro" className="text-sm text-neutral-300 hover:text-white transition-colors">Dúvidas frequentes</Link></li>
              <li><Link href="/" className="text-sm text-neutral-300 hover:text-white transition-colors">Fale conosco</Link></li>
            </ul>
          </div>

          {/* Column 4 */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-primary-100">Contato</h3>
            <ul className="space-y-3">
              <li><a href="mailto:contato@minhacausajusta.com.br" className="text-sm text-neutral-300 hover:text-white transition-colors">contato@minhacausajusta.com.br</a></li>
              <li><a href="#" className="text-sm text-neutral-300 hover:text-white transition-colors">Instagram</a></li>
              <li><a href="#" className="text-sm text-neutral-300 hover:text-white transition-colors">Facebook</a></li>
              <li><a href="#" className="text-sm text-neutral-300 hover:text-white transition-colors">TikTok</a></li>
            </ul>
          </div>

        </div>

        <div className="pt-8 border-t border-primary-700 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-neutral-400">© 2025 Minha Causa Justa. Todos os direitos reservados.</p>
          <p className="text-xs text-neutral-400 text-center md:text-right max-w-2xl">
            Este site tem caráter informativo e não presta serviços jurídicos. O contato com advogados é feito diretamente entre as partes.
          </p>
        </div>
      </div>
    </footer>
  );
}
