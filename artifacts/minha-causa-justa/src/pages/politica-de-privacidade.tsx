import { Link } from "wouter";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function PoliticaDePrivacidade() {
  return (
    <div className="min-h-screen bg-[#F5F4F2]">
      <Navbar />

      <main className="pt-16">
        <div className="container mx-auto px-6 max-w-[800px] py-16 md:py-24">
          <div className="mb-8">
            <Link
              href="/"
              className="text-sm text-primary-600 hover:underline inline-flex items-center gap-1 mb-8"
            >
              &larr; Voltar
            </Link>
          </div>

          <article className="prose prose-neutral max-w-none">
            <h1 className="text-3xl md:text-4xl font-bold text-primary-900 mb-2">
              Política de Privacidade
            </h1>
            <p className="text-sm text-neutral-500 mb-10">
              <strong>Última atualização:</strong> {new Date().toLocaleDateString("pt-BR")}
            </p>

            <p className="text-lg text-neutral-700 leading-relaxed mb-8">
              A sua privacidade importa para nós. Esta página explica, de forma clara e direta,
              quais dados coletamos quando você usa a Minha Causa Justa, para que servem, como
              protegemos essas informações e quais são os seus direitos.
            </p>
            <p className="text-neutral-700 leading-relaxed mb-10">
              Esta Política segue a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 – LGPD) e
              o Marco Civil da Internet (Lei nº 12.965/2014).
            </p>

            <h2 className="text-2xl font-bold text-primary-900 mt-12 mb-4">Quem somos</h2>
            <p className="text-neutral-700 leading-relaxed mb-6">
              A Minha Causa Justa é operada pela empresa responsável pelo site
              minhacausajusta.com.br, com sede no Brasil.
            </p>
            <p className="text-neutral-700 leading-relaxed mb-10">
              Para dúvidas sobre privacidade e proteção de dados, entre em contato com nosso
              responsável pelo tema pelo e-mail{" "}
              <a
                href="mailto:privacidade@minhacausajusta.com.br"
                className="text-primary-600 hover:underline"
              >
                privacidade@minhacausajusta.com.br
              </a>
              .
            </p>

            <h2 className="text-2xl font-bold text-primary-900 mt-12 mb-4">
              Quais dados coletamos e por quê
            </h2>

            <h3 className="text-xl font-bold text-primary-800 mt-8 mb-3">
              Se você só visita o site
            </h3>
            <p className="text-neutral-700 leading-relaxed mb-6">
              Quando você navega pela plataforma sem se cadastrar, coletamos automaticamente
              alguns dados técnicos: seu endereço de IP, o tipo de dispositivo e navegador que
              está usando, as páginas que você acessou e o tempo de navegação, e sua localização
              aproximada por estado ou cidade, identificada pelo IP.
            </p>
            <p className="text-neutral-700 leading-relaxed mb-6">
              Coletamos essas informações porque são necessárias para o funcionamento seguro da
              plataforma, para identificar possíveis abusos e para entender como as pessoas usam
              o site – o que nos ajuda a melhorá-lo. Fazemos isso com base no nosso legítimo
              interesse e, onde a lei exige, mediante seu consentimento via cookies.
            </p>
            <p className="text-neutral-700 leading-relaxed mb-8">
              Esses dados são mantidos por 6 meses, conforme o prazo estabelecido pelo Marco
              Civil da Internet, e depois são eliminados.
            </p>

            <h3 className="text-xl font-bold text-primary-800 mt-8 mb-3">
              Se você é advogado e se cadastra
            </h3>
            <p className="text-neutral-700 leading-relaxed mb-6">
              Para criar e manter seu perfil na plataforma, precisamos dos seguintes dados:
              nome completo, número de inscrição e seccional da OAB, CPF para verificação de
              identidade e cumprimento de obrigações fiscais, e-mail, telefone ou WhatsApp para
              exibição no perfil, foto, áreas de atuação, especialidades, estados onde atende e
              texto de apresentação.
            </p>
            <p className="text-neutral-700 leading-relaxed mb-6">
              Também coletamos dados de acesso à plataforma, como data, hora e IP de login,
              para garantir a segurança da sua conta.
            </p>
            <p className="text-neutral-700 leading-relaxed mb-6">
              Os dados de pagamento, como número de cartão de crédito, são processados
              diretamente pelo serviço de pagamento que contratamos. Nós não armazenamos esses
              dados.
            </p>
            <p className="text-neutral-700 leading-relaxed mb-6">
              Todos esses dados são necessários para que possamos prestar o serviço contratado
              por você. Sem eles, não conseguimos ativar e manter seu perfil na plataforma.
            </p>
            <p className="text-neutral-700 leading-relaxed mb-10">
              Enquanto sua assinatura estiver ativa, mantemos todos esses dados. Após o
              cancelamento, mantemos apenas o que a lei nos obriga a guardar – principalmente
              para fins fiscais – por até 5 anos.
            </p>

            <h2 className="text-2xl font-bold text-primary-900 mt-12 mb-4">
              O que fazemos com seus dados
            </h2>
            <p className="text-neutral-700 leading-relaxed mb-6">
              Usamos seus dados exclusivamente para as seguintes finalidades:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-neutral-700 leading-relaxed mb-10">
              <li>Operar a plataforma e exibir o diretório de advogados</li>
              <li>
                Verificar sua inscrição na OAB por meio do sistema público do Conselho Federal
              </li>
              <li>Gerenciar sua conta e processar pagamentos</li>
              <li>
                Enviar e-mails relacionados à sua conta – confirmações, alertas, atualizações
              </li>
              <li>
                Melhorar o funcionamento do site com base em dados de uso de forma agrupada e
                sem identificação pessoal
              </li>
              <li>Cumprir obrigações legais quando exigido</li>
            </ul>
            <p className="text-neutral-700 leading-relaxed mb-10">
              Não usamos seus dados para publicidade de terceiros. Não criamos perfis de
              comportamento para venda a anunciantes.
            </p>

            <h2 className="text-2xl font-bold text-primary-900 mt-12 mb-4">
              Com quem compartilhamos seus dados
            </h2>
            <p className="text-neutral-700 leading-relaxed mb-6">
              Não vendemos, alugamos nem cedemos seus dados a terceiros para fins comerciais.
              Ponto.
            </p>
            <p className="text-neutral-700 leading-relaxed mb-6">
              Compartilhamos dados apenas quando necessário para fazer a plataforma funcionar:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-neutral-700 leading-relaxed mb-6">
              <li>Com o serviço de hospedagem que armazena os dados do site</li>
              <li>Com o gateway de pagamento que processa as assinaturas</li>
              <li>
                Com ferramentas de análise de uso do site – de forma anonimizada
              </li>
              <li>Com o sistema público da OAB para verificar sua inscrição</li>
              <li>Com autoridades públicas quando exigido por lei ou por ordem judicial</li>
            </ul>
            <p className="text-neutral-700 leading-relaxed mb-6">
              Todos os fornecedores com acesso a dados pessoais são obrigados contratualmente a
              tratá-los de forma segura e apenas para a finalidade contratada.
            </p>
            <p className="text-neutral-700 leading-relaxed mb-10">
              As informações do seu perfil público – nome, OAB, foto, especialidades e contato
              – ficam visíveis para qualquer visitante do site. Isso é parte essencial do
              serviço que você contratou e para o qual você deu seu consentimento ao se
              cadastrar.
            </p>

            <h2 className="text-2xl font-bold text-primary-900 mt-12 mb-4">Cookies</h2>
            <p className="text-neutral-700 leading-relaxed mb-6">
              Usamos cookies – pequenos arquivos salvos no seu navegador – para três finalidades.
            </p>
            <ul className="list-disc pl-6 space-y-2 text-neutral-700 leading-relaxed mb-6">
              <li>
                <strong>Cookies essenciais:</strong> necessários para o funcionamento básico
                do site e não podem ser desativados.
              </li>
              <li>
                <strong>Cookies analíticos:</strong> coletam dados de navegação de forma
                anonimizada para nos ajudar a entender como o site é usado.
              </li>
              <li>
                <strong>Cookies funcionais:</strong> memorizam suas preferências de navegação,
                como o estado que você selecionou na busca.
              </li>
            </ul>
            <p className="text-neutral-700 leading-relaxed mb-10">
              Você pode aceitar ou recusar os cookies não essenciais pelo banner que aparece na
              sua primeira visita ao site, ou pelas configurações do seu navegador. Recusar
              cookies não impede o acesso ao site.
            </p>

            <h2 className="text-2xl font-bold text-primary-900 mt-12 mb-4">
              Segurança dos seus dados
            </h2>
            <p className="text-neutral-700 leading-relaxed mb-6">
              Adotamos medidas técnicas e administrativas para proteger suas informações contra
              acessos não autorizados, perdas ou vazamentos. O site usa protocolo HTTPS com
              criptografia. As senhas são armazenadas de forma criptografada. O acesso aos dados
              é restrito a quem realmente precisa deles para trabalhar.
            </p>
            <p className="text-neutral-700 leading-relaxed mb-10">
              Nenhum sistema é 100% infalível. Se ocorrer algum incidente de segurança que possa
              te afetar, avisaremos você e a Autoridade Nacional de Proteção de Dados (ANPD)
              dentro do prazo legal.
            </p>

            <h2 className="text-2xl font-bold text-primary-900 mt-12 mb-4">Seus direitos</h2>
            <p className="text-neutral-700 leading-relaxed mb-6">
              A LGPD garante a você os seguintes direitos em relação aos seus dados pessoais:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-neutral-700 leading-relaxed mb-6">
              <li>Confirmar se tratamos seus dados e pedir acesso a eles</li>
              <li>Pedir a correção de dados incorretos ou desatualizados</li>
              <li>Pedir a exclusão dos dados que coletamos com base no seu consentimento</li>
              <li>Pedir para saber com quem compartilhamos seus dados</li>
              <li>
                Revogar seu consentimento a qualquer momento, sem prejuízo do que já foi feito
                legalmente até então
              </li>
              <li>Se opor a tratamentos que entender inadequados</li>
              <li>
                Apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD)
              </li>
            </ul>
            <p className="text-neutral-700 leading-relaxed mb-10">
              Para exercer qualquer um desses direitos, envie um e-mail para{" "}
              <a
                href="mailto:privacidade@minhacausajusta.com.br"
                className="text-primary-600 hover:underline"
              >
                privacidade@minhacausajusta.com.br
              </a>{" "}
              informando seu nome, o e-mail cadastrado e o que você está solicitando. Respondemos
              em até 15 dias corridos.
            </p>

            <h2 className="text-2xl font-bold text-primary-900 mt-12 mb-4">
              Crianças e adolescentes
            </h2>
            <p className="text-neutral-700 leading-relaxed mb-10">
              A Minha Causa Justa não é destinada a menores de 18 anos e não coleta dados de
              menores intencionalmente. Se você identificar que um menor teve dados coletados
              pela plataforma, entre em contato pelo e-mail{" "}
              <a
                href="mailto:privacidade@minhacausajusta.com.br"
                className="text-primary-600 hover:underline"
              >
                privacidade@minhacausajusta.com.br
              </a>{" "}
              e excluiremos as informações imediatamente.
            </p>

            <h2 className="text-2xl font-bold text-primary-900 mt-12 mb-4">
              Links externos
            </h2>
            <p className="text-neutral-700 leading-relaxed mb-10">
              Nosso site pode conter links para outros sites. Não somos responsáveis pelas
              práticas de privacidade desses sites. Recomendamos que você leia a política de
              privacidade de qualquer site que visitar.
            </p>

            <h2 className="text-2xl font-bold text-primary-900 mt-12 mb-4">
              Atualizações desta Política
            </h2>
            <p className="text-neutral-700 leading-relaxed mb-10">
              Podemos atualizar esta Política quando necessário. Sempre que fizermos alterações
              relevantes, avisaremos os advogados cadastrados por e-mail com pelo menos 15 dias
              de antecedência. A data da última atualização aparece sempre no topo desta
              página.
            </p>

            <h2 className="text-2xl font-bold text-primary-900 mt-12 mb-4">
              Fale conosco sobre privacidade
            </h2>
            <p className="text-neutral-700 leading-relaxed mb-6">
              Para qualquer dúvida, solicitação ou reclamação sobre o uso dos seus dados, entre
              em contato com nosso responsável de privacidade pelo e-mail{" "}
              <a
                href="mailto:privacidade@minhacausajusta.com.br"
                className="text-primary-600 hover:underline"
              >
                privacidade@minhacausajusta.com.br
              </a>
              . Respondemos em até 15 dias corridos.
            </p>
          </article>

          <div className="mt-16 pt-8 border-t border-neutral-200 text-center">
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
