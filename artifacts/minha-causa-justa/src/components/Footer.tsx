import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="bg-gradient-to-br from-[#7D0038] to-[#A3004A] text-white py-12 md:py-16">
      <div className="container mx-auto px-6 max-w-[1200px]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 mb-12">
          
          {/* Column 1 */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-primary-100">Institucional</h3>
            <ul className="space-y-3">
              <li><Link href="/quem-somos" className="text-sm text-primary-200 hover:text-white transition-colors">Quem somos</Link></li>
              <li><Link href="/termos-de-uso" className="text-sm text-primary-200 hover:text-white transition-colors">Termos de uso</Link></li>
              <li><Link href="/politica-de-privacidade" className="text-sm text-primary-200 hover:text-white transition-colors">Política de privacidade</Link></li>
            </ul>
          </div>

          {/* Column 2 */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-primary-100">Para quem precisa</h3>
            <ul className="space-y-3">
              <li><Link href="/psicologos" className="text-sm text-primary-200 hover:text-white transition-colors">Encontrar psicólogo</Link></li>
              <li><Link href="/" className="text-sm text-primary-200 hover:text-white transition-colors">Áreas de atuação</Link></li>
              <li><Link href="/blog" className="text-sm text-primary-200 hover:text-white transition-colors">Blog</Link></li>
            </ul>
          </div>

          {/* Column 3 */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-primary-100">Para psicólogos</h3>
            <ul className="space-y-3">
              <li><Link href="/cadastro" className="text-sm text-primary-200 hover:text-white transition-colors">Cadastre seu perfil</Link></li>
              <li><Link href="/cadastro" className="text-sm text-primary-200 hover:text-white transition-colors">Dúvidas frequentes</Link></li>
              <li><Link href="/" className="text-sm text-primary-200 hover:text-white transition-colors">Fale conosco</Link></li>
            </ul>
          </div>

          {/* Column 4 */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-primary-100">Contato</h3>
            <ul className="space-y-3">
              <li><a href="mailto:contato@terapiaquecura.com.br" className="text-sm text-primary-200 hover:text-white transition-colors">contato@terapiaquecura.com.br</a></li>
              <li><a href="#" className="text-sm text-primary-200 hover:text-white transition-colors">Instagram</a></li>
              <li><a href="#" className="text-sm text-primary-200 hover:text-white transition-colors">Facebook</a></li>
              <li><a href="#" className="text-sm text-primary-200 hover:text-white transition-colors">TikTok</a></li>
            </ul>
          </div>

        </div>

        <div className="pt-8 border-t border-primary-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-primary-300">© 2026 Terapia Que Cura. Todos os direitos reservados.</p>
          <p className="text-xs text-primary-300 text-center md:text-right max-w-2xl">
            Este site tem caráter informativo e não presta atendimento psicológico. O contato com psicólogos é feito diretamente entre as partes.
          </p>
        </div>
      </div>
    </footer>
  );
}
