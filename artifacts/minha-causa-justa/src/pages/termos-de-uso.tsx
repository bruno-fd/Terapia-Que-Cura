import { Link } from "wouter";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function TermosDeUso() {
  return (
    <div className="min-h-screen bg-[#F5F4F2]">
      <Navbar />

      <main>
        <div className="container mx-auto px-6 max-w-[800px] pt-8 pb-16 md:pt-10 md:pb-24">
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
              Termos de Uso
            </h1>
            <p className="text-sm text-neutral-500 mb-10">
              <strong>Última atualização:</strong> {new Date().toLocaleDateString("pt-BR")}
            </p>

            <p className="text-lg text-neutral-700 leading-relaxed mb-8">
              Bem-vindo à Terapia Que Cura. Antes de usar a plataforma, leia com atenção o que
              está escrito aqui. A ideia é ser direto e claro, sem jargão desnecessário.
            </p>
            <p className="text-neutral-700 leading-relaxed mb-10">
              Ao acessar ou usar o site terapiaquecura.com.br, você concorda com tudo que está
              descrito neste documento. Se não concordar com algum ponto, pedimos que não utilize
              a plataforma.
            </p>

            <h2 className="text-2xl font-bold text-primary-900 mt-12 mb-4">
              O que é a Terapia Que Cura
            </h2>
            <p className="text-neutral-700 leading-relaxed mb-6">
              A Terapia Que Cura é uma plataforma de divulgação de psicólogos. Funcionamos como
              um diretório: reunimos perfis de psicólogos em diferentes áreas e estados, e
              publicamos conteúdo informativo sobre saúde mental.
            </p>
            <p className="text-neutral-700 leading-relaxed mb-6">
              Não somos uma clínica de psicologia. Não prestamos atendimento psicológico. Não
              indicamos, recomendamos nem garantimos nenhum profissional listado na plataforma.
              Não participamos de nenhuma negociação entre você e o psicólogo que escolher
              contatar.
            </p>
            <p className="text-neutral-700 leading-relaxed mb-10">
              O conteúdo que publicamos – artigos, textos informativos, explicações sobre temas
              de saúde mental – tem finalidade exclusivamente educativa. Não é diagnóstico nem
              aconselhamento psicológico. Para qualquer avaliação ou tratamento, consulte um
              psicólogo.
            </p>

            <h2 className="text-2xl font-bold text-primary-900 mt-12 mb-4">
              Para quem visita o site
            </h2>
            <p className="text-neutral-700 leading-relaxed mb-6">
              Qualquer pessoa pode navegar pela plataforma, ler o conteúdo e consultar os
              perfis de psicólogos sem precisar se cadastrar.
            </p>
            <p className="text-neutral-700 leading-relaxed mb-6">
              Ao usar o site, você se compromete a:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-neutral-700 leading-relaxed mb-6">
              <li>Utilizar a plataforma apenas para finalidades legais e legítimas</li>
              <li>Não tentar acessar áreas restritas ou dados de outros usuários</li>
              <li>
                Não realizar coleta automatizada de dados sem nossa autorização expressa
              </li>
              <li>
                Não usar o site para enviar, publicar ou transmitir conteúdo falso, ofensivo,
                discriminatório ou que prejudique terceiros
              </li>
            </ul>
            <p className="text-neutral-700 leading-relaxed mb-6">
              A decisão de entrar em contato com qualquer psicólogo listado aqui é inteiramente
              sua. O contato é feito diretamente entre você e o profissional – a Terapia Que
              Cura não participa dessa conversa.
            </p>
            <p className="text-neutral-700 leading-relaxed mb-10">
              Qualquer relação que você estabeleça com um psicólogo encontrado nesta plataforma
              é de responsabilidade exclusiva de vocês dois. Não respondemos por valores
              cobrados, acordos, resultados do atendimento ou qualquer problema que possa
              surgir dessa relação.
            </p>

            <h2 className="text-2xl font-bold text-primary-900 mt-12 mb-4">
              Para psicólogos cadastrados
            </h2>
            <p className="text-neutral-700 leading-relaxed mb-6">
              O cadastro na plataforma é exclusivo para psicólogos com inscrição ativa em um
              Conselho Regional de Psicologia (CRP).
            </p>
            <p className="text-neutral-700 leading-relaxed mb-6">
              Ao se cadastrar, você declara que:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-neutral-700 leading-relaxed mb-6">
              <li>Sua inscrição no CRP está ativa e regular</li>
              <li>Todas as informações fornecidas são verdadeiras e atualizadas</li>
              <li>
                Está ciente das normas do Código de Ética Profissional do Psicólogo, aprovado
                pela Resolução CFP nº 010/2005 e suas atualizações
              </li>
              <li>
                Possui todos os direitos sobre as imagens e textos que incluir no seu perfil
              </li>
            </ul>
            <p className="text-neutral-700 leading-relaxed mb-6">
              Verificamos sua situação no CRP antes da ativação do perfil. Quando a verificação
              automática não puder ser concluída, o cadastro passa por revisão manual da nossa
              equipe.
            </p>
            <p className="text-neutral-700 leading-relaxed mb-6">
              Você é o único responsável pelo conteúdo do seu perfil e por mantê-lo atualizado.
              Se sua situação no CRP mudar – suspensão, cassação ou qualquer irregularidade –
              você deve nos avisar imediatamente pelo e-mail{" "}
              <a
                href="mailto:contato@terapiaquecura.com.br"
                className="text-primary-600 hover:underline"
              >
                contato@terapiaquecura.com.br
              </a>
              .
            </p>
            <p className="text-neutral-700 leading-relaxed mb-6">
              É proibido:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-neutral-700 leading-relaxed mb-6">
              <li>Criar mais de um perfil na plataforma</li>
              <li>Ceder ou compartilhar suas credenciais de acesso com terceiros</li>
              <li>Incluir informações falsas ou enganosas no perfil</li>
              <li>
                Utilizar a plataforma de qualquer forma que contrarie o Código de Ética
                Profissional do Psicólogo ou a legislação brasileira
              </li>
            </ul>
            <p className="text-neutral-700 leading-relaxed mb-10">
              Você é inteiramente responsável pelos tributos sobre os serviços que prestar aos
              seus clientes. A Terapia Que Cura não tem nenhuma responsabilidade tributária
              sobre isso.
            </p>

            <h3 className="text-xl font-bold text-primary-800 mt-8 mb-3">
              Responsabilidade por conteúdo e indenização
            </h3>
            <p className="text-neutral-700 leading-relaxed mb-6">
              Você é responsável por todo o conteúdo que publicar no seu perfil. Ao cadastrar
              informações, textos e imagens na plataforma, você garante que possui todos os
              direitos necessários sobre esse material e que ele não viola direitos de
              terceiros, leis ou normas do CFP.
            </p>
            <p className="text-neutral-700 leading-relaxed mb-10">
              Se qualquer conteúdo publicado por você causar dano à Terapia Que Cura ou a
              terceiros – incluindo custos com defesa jurídica, indenizações ou multas –, você
              se compromete a ressarcir integralmente a plataforma por esses danos. Isso
              inclui reclamações feitas por outros usuários ou por terceiros em razão do seu uso
              da plataforma.
            </p>

            <h3 className="text-xl font-bold text-primary-800 mt-8 mb-3">
              Autorização para comunicação
            </h3>
            <p className="text-neutral-700 leading-relaxed mb-10">
              Ao se cadastrar, você autoriza a Terapia Que Cura a enviar comunicações
              relacionadas à sua conta por e-mail, WhatsApp ou outros canais informados no
              cadastro. Isso inclui avisos sobre sua assinatura, atualizações da plataforma e
              informações operacionais relevantes. Você pode revogar essa autorização a
              qualquer momento entrando em contato pelo e-mail{" "}
              <a
                href="mailto:contato@terapiaquecura.com.br"
                className="text-primary-600 hover:underline"
              >
                contato@terapiaquecura.com.br
              </a>
              , tendo ciência de que isso pode limitar o uso de algumas funcionalidades.
            </p>

            <h2 className="text-2xl font-bold text-primary-900 mt-12 mb-4">
              Planos, pagamentos e cancelamento
            </h2>
            <p className="text-neutral-700 leading-relaxed mb-6">
              O cadastro de perfil é pago mediante assinatura, conforme os planos disponíveis
              na página de cadastro. Os valores podem ser atualizados com aviso prévio de 30
              dias.
            </p>
            <p className="text-neutral-700 leading-relaxed mb-6">
              O pagamento é feito por cartão de crédito com cobrança recorrente e automática na
              periodicidade contratada – mensal ou anual. A renovação acontece
              automaticamente ao fim de cada período, sem necessidade de nova ação sua. Caso não
              queira renovar, você deve cancelar antes do vencimento.
            </p>
            <p className="text-neutral-700 leading-relaxed mb-10">
              Se o pagamento não for processado, o perfil pode ser suspenso ou removido da
              plataforma sem aviso prévio adicional.
            </p>

            <h3 className="text-xl font-bold text-primary-800 mt-8 mb-3">
              Chargeback e disputa de cobrança
            </h3>
            <p className="text-neutral-700 leading-relaxed mb-10">
              Se você contestar uma cobrança junto à operadora do seu cartão sem antes entrar
              em contato com a Terapia Que Cura, sua conta será suspensa automaticamente até a
              resolução da disputa. Solicitações de estorno devem ser feitas diretamente pelo
              e-mail{" "}
              <a
                href="mailto:contato@terapiaquecura.com.br"
                className="text-primary-600 hover:underline"
              >
                contato@terapiaquecura.com.br
              </a>{" "}
              antes de qualquer contestação junto ao cartão.
            </p>

            <h3 className="text-xl font-bold text-primary-800 mt-8 mb-3">
              Cancelamento do plano mensal
            </h3>
            <p className="text-neutral-700 leading-relaxed mb-10">
              Você pode cancelar sua assinatura mensal a qualquer momento pelo painel de
              controle. O perfil fica ativo até o fim do período já pago. Não fazemos
              reembolso proporcional pelo período não utilizado, salvo nos casos previstos em
              lei.
            </p>

            <h3 className="text-xl font-bold text-primary-800 mt-8 mb-3">
              Cancelamento do plano anual
            </h3>
            <p className="text-neutral-700 leading-relaxed mb-10">
              O plano anual possui cláusula de fidelidade pelo período contratado. O
              cancelamento antecipado implica multa rescisória equivalente a 50% do valor das
              parcelas restantes até o término do contrato. O acesso ao perfil é interrompido
              imediatamente após o cancelamento antecipado.
            </p>

            <h3 className="text-xl font-bold text-primary-800 mt-8 mb-3">
              Direito de arrependimento
            </h3>
            <p className="text-neutral-700 leading-relaxed mb-10">
              Se você cancelar dentro de 7 dias corridos da primeira contratação e ainda não
              tiver feito uso efetivo da plataforma, tem direito a reembolso integral, nos
              termos do art. 49 do Código de Defesa do Consumidor. O uso continuado da
              plataforma durante esse período é considerado utilização efetiva do serviço,
              afastando o direito ao reembolso integral, nos termos do art. 187 do Código
              Civil.
            </p>

            <h2 className="text-2xl font-bold text-primary-900 mt-12 mb-4">
              Condutas proibidas
            </h2>
            <p className="text-neutral-700 leading-relaxed mb-6">
              Além do que já foi descrito, é expressamente proibido a qualquer usuário da
              plataforma:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-neutral-700 leading-relaxed mb-10">
              <li>
                Fazer engenharia reversa, descompilar ou tentar extrair o código-fonte da
                plataforma
              </li>
              <li>
                Usar robôs, scrapers, spiders ou qualquer ferramenta automatizada para coletar
                dados do site sem autorização
              </li>
              <li>
                Usar proxies ou qualquer recurso para simular múltiplos acessos simultâneos
              </li>
              <li>Criar perfis falsos ou se passar por outro profissional</li>
              <li>
                Tentar hackear, interferir ou prejudicar o funcionamento da plataforma
              </li>
              <li>Inserir vírus, malware ou qualquer código malicioso</li>
              <li>
                Reproduzir, redistribuir ou vender o conteúdo ou a base de dados da plataforma
              </li>
              <li>
                Usar a plataforma para fins ilícitos, fraudulentos, abusivos ou que violem
                direitos de terceiros
              </li>
            </ul>

            <h2 className="text-2xl font-bold text-primary-900 mt-12 mb-4">
              Nossos conteúdos e propriedade intelectual
            </h2>
            <p className="text-neutral-700 leading-relaxed mb-6">
              Todos os textos, artigos, design, logotipo e demais conteúdos produzidos pela
              Terapia Que Cura são de nossa propriedade. Você não pode reproduzir, copiar,
              distribuir ou usar esse conteúdo sem nossa autorização expressa por escrito.
            </p>
            <p className="text-neutral-700 leading-relaxed mb-10">
              Ao cadastrar seu perfil, você nos concede autorização para exibir as informações
              e imagens do perfil dentro da plataforma durante o período de assinatura. Essa
              autorização se encerra automaticamente com o cancelamento da conta.
            </p>

            <h2 className="text-2xl font-bold text-primary-900 mt-12 mb-4">
              O que não garantimos
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-neutral-700 leading-relaxed mb-6">
              <li>
                Não garantimos a veracidade das informações inseridas pelos psicólogos em seus
                perfis
              </li>
              <li>
                Não garantimos a qualidade, a competência ou os resultados dos serviços de
                qualquer profissional listado
              </li>
              <li>
                Não garantimos que a plataforma estará disponível 100% do tempo – sistemas
                podem ter falhas ou passar por manutenção
              </li>
              <li>
                Não nos responsabilizamos por sites externos acessados por links disponíveis no
                nosso site
              </li>
              <li>
                Não nos responsabilizamos por danos decorrentes de uso inadequado da plataforma
                ou de terceiros
              </li>
            </ul>
            <p className="text-neutral-700 leading-relaxed mb-10">
              Se ocorrer algum dano decorrente do uso da plataforma que seja de nossa
              responsabilidade, nossa obrigação fica limitada ao valor pago pelo psicólogo nos
              últimos 3 meses. Não respondemos por lucros cessantes, perda de oportunidade,
              danos indiretos ou danos morais decorrentes do uso ou da impossibilidade de uso
              da plataforma, salvo o que a lei expressamente determinar.
            </p>

            <h2 className="text-2xl font-bold text-primary-900 mt-12 mb-4">
              Suspensão e encerramento de contas
            </h2>
            <p className="text-neutral-700 leading-relaxed mb-10">
              Podemos suspender ou encerrar o acesso de qualquer usuário que viole estes
              Termos, forneça informações falsas no cadastro, pratique atos ilícitos ou
              antiéticos, perca a habilitação profissional no CRP, ou seja alvo de determinação
              de autoridade competente. Isso pode acontecer sem aviso prévio, dependendo da
              gravidade da situação, sem que caiba direito a reembolso pelo período não
              utilizado.
            </p>

            <h2 className="text-2xl font-bold text-primary-900 mt-12 mb-4">
              Alterações nestes Termos
            </h2>
            <p className="text-neutral-700 leading-relaxed mb-10">
              Podemos atualizar estes Termos quando necessário. Sempre que fizermos alterações
              relevantes, avisaremos os psicólogos cadastrados por e-mail com antecedência
              mínima de 15 dias. A versão atualizada entra em vigor na data indicada no topo do
              documento. Usar a plataforma após a atualização significa que você concorda com
              os novos termos.
            </p>

            <h2 className="text-2xl font-bold text-primary-900 mt-12 mb-4">
              Lei aplicável e foro
            </h2>
            <p className="text-neutral-700 leading-relaxed mb-10">
              Estes Termos são regidos pelas leis brasileiras, em especial pelo Código de
              Defesa do Consumidor (Lei nº 8.078/1990), pelo Marco Civil da Internet (Lei nº
              12.965/2014) e pela Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
              Eventuais disputas serão resolvidas no foro da Comarca de Porto Alegre, Rio
              Grande do Sul, com renúncia expressa a qualquer outro foro, por mais privilegiado
              que seja.
            </p>

            <h2 className="text-2xl font-bold text-primary-900 mt-12 mb-4">Fale conosco</h2>
            <p className="text-neutral-700 leading-relaxed mb-6">
              Dúvidas, reclamações ou solicitações? Entre em contato pelo e-mail{" "}
              <a
                href="mailto:contato@terapiaquecura.com.br"
                className="text-primary-600 hover:underline"
              >
                contato@terapiaquecura.com.br
              </a>
              . Respondemos em até 5 dias úteis.
            </p>
          </article>

          <div className="mt-16 pt-8 border-t border-neutral-200 text-center">
            <p className="text-sm text-neutral-500 italic">
              Terapia Que Cura – terapiaquecura.com.br
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
