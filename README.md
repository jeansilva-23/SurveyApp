# SurveyAPP

SurveyAPP é um aplicativo móvel corporativo projetado para criar e gerenciar pesquisas de satisfação, formulários internos e censos organizacionais. Desenvolvido com **React Native (Expo)** no frontend e **Supabase** no backend.

## 📱 Principais Funcionalidades

- **Múltiplos Tipos de Pesquisas:** Escolha única, Múltipla escolha, Texto curto, Texto longo, Escala e NPS.
- **Builder Drag-and-Drop:** Criação fácil de pesquisas reorganizando as perguntas e testando os fluxos.
- **Autenticação Segura:** Login por E-mail/Senha, OAuth com Google e recuperação de senha.
- **Separação por Organização:** Dados isolados (multi-tenant) via Row Level Security (RLS) no Supabase.
- **Relatórios Avançados:** Dashboard com métricas em tempo real, gráficos visuais (Pizza e Barras) utilizando SVG nativo, com exportação de dados em **PDF** e **CSV**.
- **Resposta Pública:** Compartilhamento através de Link e QR Code, possibilitando respostas fora do app (fluxo web) de forma anônima ou com coleta de identificação.
- **Identidade Visual:** Design moderno com um mascote exclusivo e customizado, navegação fluída, feedback háptico, e suporte nativo ao Dark Mode (em desenvolvimento).

## 🛠 Stack de Tecnologias

- **Framework Mobile:** [Expo](https://expo.dev/) (SDK 52 Estável) + React Native 0.76
- **Navegação:** [React Navigation](https://reactnavigation.org/) (Stack + Bottom Tabs + Deep Linking)
- **Gerenciamento de Estado:** [Zustand](https://zustand-demo.pmnd.rs/) (Auth e Tema)
- **Fetching de Dados:** [TanStack React Query](https://tanstack.com/query/latest)
- **Validação e Formulários:** [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **Backend as a Service:** [Supabase](https://supabase.com/) (Auth, Postgres DB, RLS, Storage)
- **Pacotes Adicionais:**
  - `expo-file-system` & `expo-sharing`: Para manipulação de relatórios CSV/PDF.
  - `expo-print`: Para gerar relatórios baseados em HTML para PDF.
  - `react-native-svg` & `victory-native`: Para geração de gráficos performáticos.
  - `react-native-reanimated` (v4.x): Para animações fluídas (como o Drag-and-Drop).
  - `react-native-draggable-flatlist`: Para ordenar perguntas.
  - `react-native-qrcode-svg`: Para renderização de QR Codes.

## 🚀 Como Executar Localmente

### Pré-requisitos

- [Node.js](https://nodejs.org/en/) (Versão 18+)
- **[JDK 17](https://adoptium.net/)** (Obrigatório para compilar o app nativo via Gradle. O React Native 0.76 exige especificamente a versão 17).
- [Android Studio](https://developer.android.com/studio) (Necessário para obter as ferramentas de build C++ e o emulador).
- Conta no [Supabase](https://supabase.com) (Para configuração do backend)

### 1. Clonar e Instalar

```bash
git clone <seu-repositorio>
cd SurveyAPP
npm install
```

> **⚠️ Atenção usuários de Windows:** Antes de tentar rodar o app nativamente pela primeira vez, você **precisa** garantir duas coisas na pasta `android/`:
>
> 1. Ter o arquivo `android/local.properties` configurado com o caminho do SDK do Android. Exemplo: `sdk.dir=C\:\\Users\\SeuUsuario\\AppData\\Local\\Android\\Sdk`
> 2. Se você tem mais de um Java instalado, deve forçar o JDK 17 adicionando a linha `org.gradle.java.home=C:/Program Files/Java/jdk-17.0.18` (ou o seu caminho do JDK 17 com barras invertidas) no arquivo `android/gradle.properties`.

### 2. Configurar o Supabase (Backend)

Ação voltada para aplicação que ainda não possui o SupaBase configurado. No caso do nosso projeto da OSM, já está configurado e base no SupaBase já existe.

1. Crie um projeto no Supabase.
2. Atualize o arquivo `app.json` no nó `extra` com as suas chaves do Supabase:

```json
"extra": {
  "supabaseUrl": "SUA_URL_AQUI",
  "supabaseAnonKey": "SUA_ANON_KEY_AQUI"
}
```

3. Execute o script SQL contido na documentação gerada (migrations) no painel do SQL Editor do Supabase para criar as tabelas `organizations`, `profiles`, `surveys`, `survey_questions`, `survey_responses` e `survey_answers`, bem como habilitar as políticas de segurança.

### 3. Executar o Aplicativo

**Para testar em um emulador Android / Dispositivo Físico (Build Nativo)**:
Como o projeto utiliza pacotes que requerem código nativo moderno, é recomendado rodar um build de desenvolvimento local:

```bash
npx expo run:android --port 8081
```

_(Se a compilação falhar com erros de "operator new" no C++, certifique-se de que não está usando o NDK 27 junto com uma versão incompatível do React Native, ou faça um `cd android && ./gradlew clean` para limpar o cache)._

**Para desenvolvimento Web ou via Expo Go (Apenas funcionalidades JS)**:

```bash
npx expo start
```

- Pressione **w** para abrir a versão Web no navegador.
- Escaneie o QRCode no app **Expo Go** (Atenção: algumas bibliotecas nativas de gráficos podem não ser 100% compatíveis com o Expo Go).

## 🏗 Arquitetura

- `src/components/common/`: Componentes visuais reaproveitáveis (Botões, Inputs, Cards, etc).
- `src/hooks/`: Hooks customizados (ex: `useAuth`).
- `src/navigation/`: Definição de rotas do aplicativo (Root, Auth, Main Stack).
- `src/screens/`: Telas agrupadas por fluxo (`auth`, `home`, `surveys`, `reports`, `respond`).
- `src/services/`: Camada de comunicação de dados (Integração com Supabase).
- `src/store/`: Estado global do aplicativo utilizando Zustand.
- `src/theme/`: Configurações visuais globais e de design tokens.
- `src/types/`: Definições tipadas e tipos do banco de dados (gerados).

## 🔒 Deep Linking e Telas Públicas

O app suporta acesso por meio de URIs (`surveyapp://`) e web (`https://surveyapp.io`).
Para o usuário responder uma pesquisa externamente sem login, ele será encaminhado para a rota `/survey/:slug`.
Essas configurações estão no `RootNavigator.tsx`.

## 🎨 Autor & Design

Desenvolvido com foco num design moderno, paleta de cores equilibrada e uso de feedback imediato ao usuário.
