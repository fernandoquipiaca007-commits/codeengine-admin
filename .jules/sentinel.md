## 2025-05-14 - Exposição do VITE_SUPABASE_SERVICE_ROLE_KEY
**Vulnerability:** A chave de serviço do Supabase (`VITE_SUPABASE_SERVICE_ROLE_KEY`) estava exposta no código frontend via variáveis de ambiente do Vite. Esta chave ignora as políticas de segurança de nível de linha (RLS), permitindo acesso administrativo total ao banco de dados e ao storage por qualquer usuário através do console do navegador.
**Learning:** Variáveis de ambiente prefixadas com `VITE_` são automaticamente incluídas no bundle do cliente pelo Vite. Chaves sensíveis que devem permanecer privadas (como chaves de serviço de backend) nunca devem usar esse prefixo ou ser incluídas no código frontend.
**Prevention:** Removido o uso da chave de serviço no frontend. O aplicativo agora utiliza exclusivamente a chave anônima autenticada, garantindo que todas as operações de dados sejam protegidas por Row Level Security (RLS) no Supabase.

## 2025-05-14 - Vazamento de Informações Técnicas em Erros do Supabase
**Vulnerability:** A função `handleSupabaseError` estava lançando mensagens de erro originais do banco de dados para a interface do usuário, o que pode revelar detalhes internos da arquitetura, nomes de tabelas ou restrições de segurança para atacantes.
**Learning:** Mensagens de erro de banco de dados podem conter informações valiosas para reconhecimento de vetores de ataque.
**Prevention:** Refatorada a função `handleSupabaseError` para registrar o erro detalhado apenas no console administrativo (para depuração) e lançar uma mensagem genérica e amigável para o usuário.
