import { Link } from "wouter";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import quemSomosFoto from "@assets/generated_images/quem-somos-foto.png";

export default function QuemSomos() {
  return (
    <div className="min-h-screen bg-[#F5F4F2]">
      <Navbar />

      <main>
        <div className="container mx-auto px-6 max-w-[1100px] pt-8 pb-16 md:pt-10 md:pb-24">
          <div className="mb-8">
            <Link
              href="/"
              className="text-sm text-primary-600 hover:underline inline-flex items-center gap-1 mb-8"
            >
              &larr; Voltar
            </Link>
          </div>

          <article className="prose prose-neutral max-w-none">
            <h1 className="text-3xl md:text-4xl font-bold text-primary-900 mb-8">
              Quem Somos
            </h1>

            <div className="flex flex-col lg:flex-row gap-10 lg:gap-14 items-start">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-primary-900 mb-5">
                  Por que a Minha Causa Justa existe
                </h2>
                <p className="text-neutral-700 leading-relaxed mb-6">
                  O Brasil é um país onde milhões de pessoas enfrentam, todos os dias,
                  situações que poderiam ser resolvidas com apoio jurídico adequado.
                  Benefícios do INSS negados, planos de saúde que recusam coberturas,
                  pensões que não chegam, heranças que ficam anos sem resolução. Problemas
                  reais, que afetam a vida de pessoas reais, e que muitas vezes ficam sem
                  solução simplesmente porque as pessoas não sabem por onde começar.
                </p>
                <p className="text-neutral-700 leading-relaxed mb-6">
                  Ao mesmo tempo, o Brasil tem mais de um milhão de advogados inscritos na
                  OAB. Profissionais qualificados, em todos os estados, especializados nas
                  mais diversas áreas do direito. Muitos deles trabalham exatamente com as
                  causas que mais afetam o cidadão comum, e que mais carecem de atenção.
                </p>
                <p className="text-neutral-700 leading-relaxed mb-10">
                  A Minha Causa Justa nasce para conectar esses dois lados. Não como
                  intermediária, não como consultora, não como prestadora de serviços
                  jurídicos, mas como um espaço de informação e visibilidade, onde quem
                  precisa de ajuda consegue encontrar quem pode ajudar.
                </p>

                <h2 className="text-2xl font-bold text-primary-900 mb-5 mt-12">
                  Para a população
                </h2>
                <p className="text-neutral-700 leading-relaxed mb-6">
                  Entender os próprios direitos não deveria ser um privilégio de quem tem
                  acesso à informação qualificada. Boa parte das pessoas que deixa de buscar
                  seus direitos não o faz por falta de interesse, mas por falta de clareza
                  sobre o que fazer, a quem recorrer e se o problema que está vivendo é
                  "suficientemente sério" para ser levado adiante.
                </p>
                <p className="text-neutral-700 leading-relaxed mb-6">
                  A Minha Causa Justa quer mudar isso. Por meio de conteúdo informativo e
                  acessível, buscamos esclarecer situações comuns do cotidiano brasileiro
                  sem juridiquês, sem complicação, sem promessas que não podemos cumprir.
                  Nosso papel é informar, não aconselhar. Esclarecer, não decidir por você.
                </p>
                <p className="text-neutral-700 leading-relaxed mb-10">
                  O que encontrar aqui são informações gerais sobre direitos e situações
                  frequentes, e um diretório de advogados que trabalham com essas áreas.
                  O que fazer com essa informação é sempre sua decisão.
                </p>

                <h2 className="text-2xl font-bold text-primary-900 mb-5 mt-12">
                  Para advogados
                </h2>
                <p className="text-neutral-700 leading-relaxed mb-6">
                  A Minha Causa Justa oferece um espaço de divulgação para advogados que
                  atuam com causas populares e que desejam ampliar sua presença digital de
                  forma simples e acessível.
                </p>
                <p className="text-neutral-700 leading-relaxed mb-6">
                  Funcionamos como um diretório, um espaço onde o profissional pode manter um
                  perfil com suas informações, áreas de atuação e forma de contato, visível
                  para pessoas que navegam pela plataforma por conta própria e por
                  iniciativa própria.
                </p>
                <p className="text-neutral-700 leading-relaxed mb-10">
                  Não fazemos intermediação. Não direcionamos usuários a advogados
                  específicos. Não participamos de nenhuma negociação. O contato entre o
                  cidadão e o advogado acontece diretamente, sempre por iniciativa do
                  usuário, que navega livremente pelo diretório e decide, sem qualquer
                  influência da plataforma, com quem deseja falar.
                </p>

                <h2 className="text-2xl font-bold text-primary-900 mb-5 mt-12">
                  O que a Minha Causa Justa não é
                </h2>
                <p className="text-neutral-700 leading-relaxed mb-6">
                  Não somos um escritório de advocacia. Não prestamos nenhum tipo de serviço
                  jurídico ou consultoria legal. Não recomendamos, endossamos nem avalizamos
                  nenhum profissional listado em nosso diretório. Não participamos de
                  nenhuma relação contratual entre advogados e seus clientes.
                </p>
                <p className="text-neutral-700 leading-relaxed mb-6">
                  Todo o conteúdo publicado na plataforma tem caráter exclusivamente
                  informativo e educativo. Para qualquer situação específica, a
                  orientação adequada vem sempre de um advogado, e é exatamente por isso que
                  ele está aqui.
                </p>
              </div>

              <div className="w-full lg:w-[380px] shrink-0">
                <div className="sticky top-24">
                  <div className="rounded-[24px] overflow-hidden shadow-lg border-4 border-white bg-white">
                    <img
                      src={quemSomosFoto}
                      alt="Equipe Minha Causa Justa"
                      className="w-full h-auto object-cover"
                    />
                  </div>
                  <p className="text-sm text-neutral-500 text-center mt-4 italic">
                    Minha Causa Justa
                  </p>
                </div>
              </div>
            </div>
          </article>

          <div className="mt-20 pt-8 border-t border-neutral-200 text-center">
            <p className="text-sm text-neutral-500 italic">
              Minha Causa Justa – minhacausajusta.com.br
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
