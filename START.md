RELATÓRIO DE ESTADO DO PROJETO
Extensão para Google Chrome integrada ao WhatsApp Web
Data: 17/11/2026
Etapa: MVP local e preparação para publicação
Status: cadastro local de clientes, etiquetas, respostas rápidas e indicadores implementados.

1. RESUMO EXECUTIVO
O projeto é uma extensão independente para Google Chrome que oferece recursos locais de produtividade e gestão junto ao WhatsApp Web. O MVP inclui clientes, etiquetas, respostas rápidas inseridas para revisão e gráficos de conversas abertas pelo CRM. Não é uma integração oficial da Meta e não envia mensagens automaticamente.

2. OBJETIVO DO PRODUTO
Criar uma camada complementar para organizar contatos e atendimentos, facilitar respostas e, futuramente, apoiar vendas, acompanhamento de clientes e análise de produtividade. A extensão não substitui o WhatsApp e não deve ser apresentada como integração oficial da Meta.

3. FUNCIONALIDADES
• Implementadas: cadastro e exclusão local de clientes, telefone, alteração de etiquetas, respostas rápidas, abertura de conversa pelo telefone, métricas de atendimento, exportação/exclusão de dados e doação Pix opcional.
• Privacidade: aviso com consentimento explícito antes de carregar dados do CRM; os dados ficam no perfil local do Chrome.
• Licença do código: MIT. A página de privacidade local ainda precisa ser publicada em uma URL pública antes da Chrome Web Store.
• Ainda não implementadas: sincronização entre dispositivos, equipe, Kanban, IA e relatórios avançados.

4. ARQUITETURA TÉCNICA
• Chrome Extensions Manifest V3: manifesto, permissões, scripts e recursos.
• HTML, CSS e JavaScript: interface, popup, configurações e painel.
• Content Scripts: integração da interface complementar com a página do WhatsApp Web.
• Chrome Runtime Messaging: comunicação entre popup, service worker e content scripts.
• Chrome Storage local: dados do CRM, respostas e registros de conversas abertas; não há sincronização remota.
• Permissões solicitadas: armazenamento local, painel lateral e acesso ao domínio do WhatsApp Web; a permissão ampla `tabs` foi removida.
• Supabase e serviços de IA não fazem parte do MVP atual.

5. INTEGRAÇÃO COM WHATSAPP WEB
A extensão insere respostas no campo de mensagem para o usuário revisar e enviar manualmente, e navega para conversas pelo telefone. Como a estrutura do WhatsApp Web pode mudar, essa integração exige manutenção e testes recorrentes. Para envio em escala ou operações empresariais, deve-se avaliar a WhatsApp Business Platform/API oficial.

6. SEGURANÇA, PRIVACIDADE E CONFORMIDADE
• Solicitar somente permissões indispensáveis.
• Informar quais dados são acessados, armazenados ou enviados a serviços externos.
• Manter chaves de API no servidor, nunca no código distribuído.
• Aplicar autenticação e regras de acesso por usuário/organização caso haja Supabase.
• Definir minimização, retenção e exclusão de dados, observando a LGPD.
• Não armazenar conversas sem finalidade clara e base legal apropriada.
• Respeitar as políticas do WhatsApp, da Chrome Web Store e dos serviços integrados.
• Evitar spam, raspagem massiva e mecanismos de contorno de segurança.

7. PRÓXIMAS FASES
• Revisar permissões, preparar política de privacidade e disclosures de dados locais.
• Completar testes em Chrome e documentar compatibilidade.
• Preparar imagens, descrição, suporte e pacote ZIP para a Chrome Web Store.
• Considerar sincronização/backend apenas se houver necessidade de produto multiusuário.

8. DECISÕES PENDENTES
• Finalidade principal: CRM, vendas/pedidos, automação, IA ou solução combinada.
• Público: uso individual, equipe ou produto SaaS.
• Funcionalidades prioritárias do MVP.
• Necessidade de sincronização entre computadores e usuários.
• Modelo de dados, permissões, retenção e tratamento de dados pessoais.
• Limites de automação e eventual uso da API oficial do WhatsApp Business.

9. PRÓXIMOS PASSOS
Antes da publicação, definir a política de privacidade, a experiência de consentimento, o suporte e o modelo de monetização, além de testar a extensão em uma instalação limpa do Chrome.

10. LIMITES DESTE RELATÓRIO
Este documento descreve um MVP local; não é uma especificação final, auditoria jurídica ou garantia de compatibilidade com futuras versões do WhatsApp Web. Os dados permanecem no Chrome deste perfil e não são sincronizados entre dispositivos.
