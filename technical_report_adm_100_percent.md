# Relatório Técnico Completo: Finalização "ADM 100% Funcional"

Este documento serve como um **Dossiê Técnico** para a equipa técnica, documentando todas as alterações arquiteturais, schemas de base de dados, lógica de backend e interfaces de frontend aplicadas para finalizar o plano "ADM 100% Funcional".

---

## 1. Modificações na Base de Dados (Supabase)
O ficheiro responsável pelas migrações de base de dados encontra-se em `backend/supabase/adm-100-funcional-migration.sql`.

### Novas Colunas em `products`:
- **`use_shared_content`** (`BOOLEAN`): Define se o produto ignora a tradução e partilha os mesmos conteúdos/ficheiros para todas as linguagens.
- **`visibility`** (`TEXT`): Restringe a visibilidade do produto na Store (`'public'`, `'hidden'`, `'members_only'`).
- **`min_member_level`** (`INTEGER`): Associa o produto a um nível de gamificação mínimo.
- **`access_duration_days`** (`INTEGER`): Quantos dias o produto fica disponível após a data de aquisição (`created_at` na tabela `purchases`).

### Novas Tabelas:
- **`products_translations`**: Tabela associativa (1-N) para `products`, servindo títulos e descrições localizadas de acordo com o padrão i18n da plataforma.
- **`member_grants`**: Permite aos administradores dar permissão de acesso a um produto específico para um membro **sem registo de compra no Stripe**. Funciona com datas de expiração (`expires_at`) e foi desenhado para ser avaliado paralelamente à tabela de `purchases`.

### Novas Colunas em `course_lessons`:
- **`lesson_type`** (`TEXT`): `'video'`, `'audio'`, ou `'link'`. Omissão assume `'video'`.
- **`external_url`** (`TEXT`): URL para lições do tipo `'link'`.
- **`audio_storage_path`** (`TEXT`): Caminho do ficheiro no Supabase Storage para lições de áudio.

---

## 2. Modificações de Segurança & Backend (Node.js/Express)

A lógica de permissões passou de uma simples verificação `hasPurchase` para uma validação profunda baseada em tempo e permissões granulares (`Grants`).

### Modificações em `backend/lib/access.ts`
- **Função `memberHasProductAccess`**: Refatorizada para executar uma consulta combinada que determina se o utilizador possui acesso real ao conteúdo no momento do pedido.
  - Verifica a validade na tabela `member_grants`.
  - Verifica a validade na tabela `purchases`, calculando em tempo real `purchase.created_at + products.access_duration_days`. Se `access_duration_days` for nulo, o acesso é vitalício.

### Modificações nos Endpoints
- **`backend/api/downloads/get-download.ts`**: Atualizado para incluir o modelo acima. Ficheiros físicos agora bloqueiam o download mal o limite de dias estipulado no produto termine.
- **`backend/api/lessons/stream.ts`**: Atualizado para verificar `access.lesson.lesson_type`.
  - Retorna o URL assinado com `mimeType: 'audio.mp3'` usando `audio_storage_path` caso seja áudio.
  - Retorna `{ success: true, type: 'link', url: external_url }` não-assinado caso seja do tipo link.

---

## 3. Modificações no Storefront (Frontend Cliente)

O frontend foi ajustado para espelhar as regras restritas impostas pelo backend, ocultando conteúdos inacessíveis ou expirados.

### Hooks Refatorizados
- **`src/hooks/useLocalizedProduct.ts`**: 
  - Ajustado o query selector para carregar `visibility`, `min_member_level`, `access_duration_days`, e `use_shared_content`.
  - O Store ignora traduções caso o `use_shared_content` seja verdadeiro.
- **`src/hooks/useOwnedProducts.ts`**:
  - Incorporada a validação da coluna `access_duration_days` nas compras já feitas. Exclui a listagem de biblioteca na UI se a compra expirou. Adicionada a leitura de `member_grants` para que os utilizadores vejam conteúdos atribuídos via painel Admin.
- **`src/lib/learning-api.ts`**: A assinatura da função `getLessonStreamUrl` passou de `Promise<string>` para `Promise<{url: string, type: string}>` para informar os reproductores sobre o tipo de média em cache.

### Integração Multi-Formato em Aulas (Player Pro & Legacy)
- **`src/components/product/CourseCurriculum.tsx`**: Agora renderiza dinamicamente os ícones (Headphones, Link, Play) baseados na coluna `lesson_type` obtida de `course_lessons`.
- **`src/components/member/CoursePlayerPro.tsx`**:
  - Remodelado para aceitar conteúdos `audio` (oculta a tag `<video>` visualmente e exibe um placeholder).
  - Remodelado para aceitar `link` (apresenta um cartão de ação Call-To-Action redirecionando para a `external_url`).
  - Lógica incluída para enviar sinal de "Completed" ao backend instantaneamente quando a aula é um Link Externo.

---

## 4. Modificações no Painel de Administração

### Componentes de Interface
- **`admin/src/components/products/ProductTable.tsx` & `Products.tsx`**: 
  - Inclusão do dropdown de acesso rápido via `<select>` para os status `Rascunho`, `Ativo` e `Arquivado`.
  - Ação `handleChangeStatus` executa uma mutação leve no Supabase atualizando a coluna e recarregando o estado na tabela.
- **`admin/src/pages/Members.tsx`**: Nova página incluída e roteada no `App.tsx` para listar todos os utilizadores (tabela `members`) e gerir o seu nível, progresso e as novas permissões em `member_grants`.

### Correção de Desempenho
- **`admin/src/contexts/AuthContext.tsx`**:
  - Identificámos um _Double Fetching Glitch_ durante o Login. O `signInWithPassword` ativava o `loadAdminUser()`, e o hook `onAuthStateChange` disparava novamente a mesma query causando bloqueio da UI por 2 a 3 segundos.
  - Implementámos uma cache baseada em referência `loadedUserIdRef` para abortar as chamadas redundantes para o servidor Supabase, resultando em navegação e renderização instantâneas pós-login.

---

### Resumo do Estado Arquitetural

Todo o ecossistema comunica sem quebras. As regras restritivas impostas pelo produto (dias de expiração, visibilidade, nível VIP) operam a nível de Supabase Row-Level (filtros via joins no Postgres) e no Middleware Express da API. O front-end atua inteiramente como consumidor _Blind_ dessas regras, impossibilitando explorações do lado do cliente para roubar ficheiros desprotegidos.
