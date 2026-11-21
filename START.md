RELATÓRIO DE ESTADO DO PROJETO
Extensão para Chrome e Firefox integrada ao WhatsApp Web
Data: 17/11/2026
Etapa: MVP local e preparação para publicação
Status: cadastro local de clientes, etiquetas, respostas rápidas, anotações em calendário e indicadores implementados.

1. RESUMO EXECUTIVO
O projeto é uma extensão independente para Google Chrome e Firefox que oferece recursos locais de produtividade e gestão junto ao WhatsApp Web. O MVP inclui clientes, etiquetas, respostas rápidas inseridas para revisão, anotações em calendário e gráficos de conversas abertas pelo CRM. Não é uma integração oficial da Meta e não envia mensagens automaticamente.

2. OBJETIVO DO PRODUTO
Criar uma camada complementar para organizar contatos e atendimentos, facilitar respostas e, futuramente, apoiar vendas, acompanhamento de clientes e análise de produtividade. A extensão não substitui o WhatsApp e não deve ser apresentada como integração oficial da Meta.

3. FUNCIONALIDADES
• Implementadas: cadastro e exclusão local de clientes, telefone, alteração de etiquetas, respostas rápidas, calendário de anotações, alternância de posição da barra lateral no Chrome, abertura de conversa pelo telefone, métricas de atendimento, exportação/exclusão de dados e doação Pix opcional.
• Privacidade: aviso com consentimento explícito antes de carregar dados do CRM; os dados ficam no perfil local do Chrome.
• Licença do código: MIT. A página de privacidade local ainda precisa ser publicada em uma URL pública antes da Chrome Web Store.
• Ainda não implementadas: sincronização entre dispositivos, equipe, Kanban, IA e relatórios avançados.

4. ARQUITETURA TÉCNICA
• Manifest V3: manifestos separados para Chrome e Firefox.
• HTML, CSS e JavaScript: interface, popup, configurações e painel.
• Content Scripts: integração da interface complementar com a página do WhatsApp Web.
• WebExtensions Messaging: comunicação entre popup, background scripts e content scripts.
• Armazenamento local: dados do CRM, respostas e registros de conversas abertas; não há sincronização remota.
• Permissões solicitadas: armazenamento local e acesso ao domínio do WhatsApp Web; a permissão ampla `tabs` foi removida.
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

7. PACOTE FIREFOX / MOZILLA ADD-ONS
• Gerar o pacote com `npm run package:firefox`.
• O ZIP `dist/whatsapp-crm-firefox.zip` usa `sidebar_action` e scripts de background compatíveis com Firefox.
• Testar temporariamente em `about:debugging#/runtime/this-firefox`, selecionando `dist/firefox/manifest.json`.
• Enviar o ZIP pelo AMO Developer Hub e concluir a validação e revisão da Mozilla.

8. PRÓXIMAS FASES
• Revisar permissões, preparar política de privacidade e disclosures de dados locais.
• Completar testes em Chrome e documentar compatibilidade.
• Preparar imagens, descrição, suporte e pacote ZIP para a Chrome Web Store.
• Considerar sincronização/backend apenas se houver necessidade de produto multiusuário.

9. DECISÕES PENDENTES
• Finalidade principal: CRM, vendas/pedidos, automação, IA ou solução combinada.
• Público: uso individual, equipe ou produto SaaS.
• Funcionalidades prioritárias do MVP.
• Necessidade de sincronização entre computadores e usuários.
• Modelo de dados, permissões, retenção e tratamento de dados pessoais.
• Limites de automação e eventual uso da API oficial do WhatsApp Business.

10. PRÓXIMOS PASSOS
Antes da publicação, definir a política de privacidade, a experiência de consentimento, o suporte e o modelo de monetização, além de testar a extensão em uma instalação limpa do Chrome.

11. LIMITES DESTE RELATÓRIO
Este documento descreve um MVP local; não é uma especificação final, auditoria jurídica ou garantia de compatibilidade com futuras versões do WhatsApp Web. Os dados permanecem no Chrome deste perfil e não são sincronizados entre dispositivos.
