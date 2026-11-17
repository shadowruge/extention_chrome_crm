# WhatsApp CRM Extension

## 📖 Visão Geral
Extensão independente para Google Chrome que adiciona recursos locais de CRM e produtividade ao WhatsApp Web. Não é afiliada, patrocinada ou aprovada pela WhatsApp/Meta.

## 🛠️ Tecnologias
- **Manifest V3** - API mais moderna e segura do Chrome
- **HTML/CSS/JS** - Interface nativa
- **Chrome Storage** - Armazenamento local (pode ser migrado para Supabase)
- **Service Worker** - Background scripts para gerenciamento de dados

## 📁 Estrutura do Projeto
```
extention_chrome_crm/
├── manifest.json          # Configuração da extensão
├── assets/                # Ícones da extensão
├── src/
│   ├── pages/
│   │   ├── popup.html     # Popup clicável no ícone
│   │   └── sidepanel.html # Painel lateral
│   ├── components/
│   │   ├── popup.css      # Estilos do popup
│   │   ├── sidepanel.css  # Estilos do painel lateral
│   │   └── content.css    # Estilos injetados no WhatsApp Web
│   └── scripts/
│       ├── content.js     # Content script (WhatsApp Web)
│       ├── background.js  # Service worker (background)
│       └── ...            # Scripts auxiliares
└── README.md              # Documentação do projeto
```

## 🚀 Funcionalidades implementadas no MVP

### 1. Gestão de Clientes
- Cadastro e exclusão de clientes com nome e etiqueta
- Alteração da etiqueta do cliente diretamente na lista
- Lista persistida no Chrome Storage
- Etiquetas: Novo, Qualificado, Em Negociação, Cliente

### 2. Respostas Rápidas
- Biblioteca de mensagens-modelo
- Salvar, editar, excluir e usar respostas
- Inserir respostas no campo de mensagem do WhatsApp Web

### 3. Painel Lateral
- Acessível via ícone da extensão ou atalho (Ctrl+Shift+Y / Cmd+Shift+Y)
- Navegação entre seções (Dashboard, Clientes, Respostas, Etiquetas, Relatórios)
- Interface responsiva para WhatsApp Web
- Relatórios com atendimentos iniciados por cliente e frequência diária dos últimos sete dias
- Os gráficos contam a abertura de uma conversa pelo cadastro do CRM, não mensagens enviadas
- Exportação e exclusão local dos dados, com aviso e consentimento de privacidade
- Doação opcional por Pix; a extensão permanece gratuita

### 4. Integração com WhatsApp Web
- Abre uma conversa existente pelo telefone cadastrado no CRM
- Insere respostas rápidas no campo de mensagem para revisão e envio manual

## 📋 Próximos Passos / Fase 2

1. **Integração Supabase** - Autenticação e sincronização entre dispositivos
2. **Modelo de Dados Completo** - Histórico de conversas, arquivos, etc.
3. **IA Suggestions** - Sugestões de respostas via IA (backend seguro)
4. **Kanban/Vendas** - Pipeline de vendas visual
5. **Relatórios Avançados** - Métricas e gráficos adicionais de produtividade

## 🔒 Privacidade e segurança
- Dados de clientes e respostas ficam no armazenamento local do Chrome; o MVP não usa Supabase nem envia esses dados a um servidor.
- A extensão pede consentimento no primeiro uso e permite exportar ou apagar os dados.
- O armazenamento local não é criptografado por senha da extensão; proteja o dispositivo e o perfil do Chrome.
- A página local de privacidade está em `src/pages/privacy.html`; ela precisa ser hospedada em uma URL pública e revisada antes da publicação.
- A extensão interage com elementos do WhatsApp Web, que podem mudar sem aviso.

## ✉️ Contato
**by InfoDevBrasil** — [infodevbrasil@gmail.com](mailto:infodevbrasil@gmail.com)

## 🧪 Testes
Execute `npm test` para rodar testes de comportamento do service worker, métricas e payload Pix, além das verificações de sintaxe e estrutura.
Execute `npm run generate:pix` depois de alterar dados do recebedor para reconstruir o QR.

## 📦 Como Testar

1. Abra o Chrome e navegue até `chrome://extensions/`
2. Ative "Modo desenvolvedor" (top right)
3. Clique em "Carregar extensão não compactada"
4. Selecione a pasta `/home/izaias/Modelos/extention_chrome_crm`
5. Clique no ícone da extensão para abrir o popup
6. Use o painel lateral (clique no ícone novamente ou use atalho)

## 🌐 Publicação
Para a Chrome Web Store, gere um arquivo ZIP da extensão (sem chave privada), envie pelo Chrome Web Store Developer Dashboard e complete a ficha da loja e as declarações de privacidade. Consulte a documentação oficial antes do envio.