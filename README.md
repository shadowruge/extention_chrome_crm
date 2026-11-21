# WhatsApp CRM Extension

## 📖 Visão Geral
Extensão independente para Chrome e Firefox que adiciona recursos locais de CRM e produtividade ao WhatsApp Web. Não é afiliada, patrocinada ou aprovada pela WhatsApp/Meta.

## 🛠️ Tecnologias
- **Manifest V3** - Manifestos específicos para Chrome e Firefox
- **HTML/CSS/JS** - Interface nativa
- **WebExtensions Storage** - Armazenamento local no perfil do navegador
- **Painel lateral** - `sidePanel` no Chrome e `sidebar_action` no Firefox

## 📁 Estrutura do Projeto
```
extention_chrome_crm/
├── manifest.json          # Configuração Chrome
├── manifest.firefox.json  # Configuração Firefox/Mozilla Add-ons
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
│       ├── background.js  # Lógica de background
│       ├── background-worker.js # Inicializador do service worker Chrome
│       └── ...            # Scripts auxiliares
└── README.md              # Documentação do projeto
```

## 🚀 Funcionalidades implementadas no MVP

### 1. Gestão de Clientes
- Cadastro e exclusão de clientes com nome e etiqueta
- Alteração da etiqueta do cliente diretamente na lista
- Lista persistida no armazenamento local da extensão
- Etiquetas: Novo, Qualificado, Em Negociação, Cliente

### 2. Respostas Rápidas
- Biblioteca de mensagens-modelo
- Salvar, editar, excluir e usar respostas
- Inserir respostas no campo de mensagem do WhatsApp Web

### 3. Calendário de Anotações
- Anotações por data no painel lateral, com criação, edição e exclusão
- Datas com anotações destacadas no calendário mensal
- Anotações incluídas no backup JSON e apagadas com os demais dados
- Etiquetas continuam apenas no cadastro e na lista de clientes

### 4. Painel Lateral
- Acessível via ícone da extensão ou atalho (Ctrl+Shift+Y / Cmd+Shift+Y)
- Navegação entre seções (Dashboard, Clientes, Respostas, Calendário, Relatórios)
- Botão no cabeçalho para alternar a posição da barra lateral no Chrome; no Firefox a posição é definida pelo navegador
- Interface responsiva para WhatsApp Web
- Relatórios com atendimentos iniciados por cliente e frequência diária dos últimos sete dias
- Os gráficos contam a abertura de uma conversa pelo cadastro do CRM, não mensagens enviadas
- Exportação e exclusão local dos dados, com aviso e consentimento de privacidade
- Doação opcional por Pix; a extensão permanece gratuita

## 📦 Gerar pacote para Firefox/Mozilla Add-ons

Execute:

```sh
npm run package:firefox
```

O arquivo para enviar à Mozilla será `dist/whatsapp-crm-firefox.zip`. A pasta `dist/firefox/` contém a versão extraída para teste temporário; seu `manifest.json` já é o específico do Firefox. O ZIP inclui somente os arquivos de execução e a licença, sem `node_modules`, testes ou arquivos do Git.

Para testar no Firefox, abra `about:debugging#/runtime/this-firefox`, clique em **Load Temporary Add-on...** e selecione `dist/firefox/manifest.json`. Para publicar, carregue o ZIP no [AMO Developer Hub](https://addons.mozilla.org/developers/). A validação automática e a revisão da Mozilla ainda são necessárias; gerar o ZIP não publica o complemento.

### 5. Integração com WhatsApp Web
- Abre uma conversa existente pelo telefone cadastrado no CRM
- Insere respostas rápidas no campo de mensagem para revisão e envio manual

## 📋 Próximos Passos / Fase 2

1. **Integração Supabase** - Autenticação e sincronização entre dispositivos
2. **Modelo de Dados Completo** - Histórico de conversas, arquivos, etc.
3. **IA Suggestions** - Sugestões de respostas via IA (backend seguro)
4. **Kanban/Vendas** - Pipeline de vendas visual
5. **Relatórios Avançados** - Métricas e gráficos adicionais de produtividade

## 🔒 Privacidade e segurança
- Dados de clientes, respostas e anotações do calendário ficam no armazenamento local do navegador; o MVP não usa Supabase nem envia esses dados a um servidor.
- A extensão pede consentimento no primeiro uso e permite exportar ou apagar os dados.
- O armazenamento local não é criptografado por senha da extensão; proteja o dispositivo e o perfil do Chrome.
- A página de privacidade da extensão está em `src/pages/privacy.html`; a versão Markdown está em [PRIVACY.md](./PRIVACY.md) e pode ser publicada em uma URL pública para a listagem da loja.
- A extensão interage com elementos do WhatsApp Web, que podem mudar sem aviso.

## ✉️ Contato
**by InfoDevBrasil** — [infodevbrasil@gmail.com](mailto:infodevbrasil@gmail.com)

## 🧪 Testes
Execute `npm test` para rodar testes de comportamento, APIs dos painéis, métricas e payload Pix, além das verificações de sintaxe e estrutura dos dois manifestos.
Execute `npm run generate:pix` depois de alterar dados do recebedor para reconstruir o QR.
Execute `npm run package:firefox` para gerar o pacote de distribuição da Mozilla.

## 📦 Como Testar no Chrome

1. Abra o Chrome e navegue até `chrome://extensions/`
2. Ative "Modo desenvolvedor" (top right)
3. Clique em "Carregar extensão não compactada"
4. Selecione a pasta `/home/izaias/Modelos/extention_chrome_crm`
5. Clique no ícone da extensão para abrir o popup
6. Clique em **Abrir painel CRM** no popup (ou use `Ctrl+Shift.Y` / `Cmd+Shift+Y`)

## 🌐 Publicação no Chrome
Para a Chrome Web Store, prepare um pacote com o manifesto Chrome (sem chave privada), envie pelo Chrome Web Store Developer Dashboard e complete a ficha da loja e as declarações de privacidade. Consulte a documentação oficial antes do envio.