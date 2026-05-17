export type ErrorContext =
  | 'load'
  | 'save'
  | 'delete'
  | 'upload'
  | 'auth'
  | 'stripe'
  | 'network'
  | 'generic';

export interface MappedError {
  title: string;
  message: string;
  hint?: string;
  technical?: string;
}

function extractTechnical(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'Erro desconhecido';
}

function matches(text: string, patterns: string[]): boolean {
  const lower = text.toLowerCase();
  return patterns.some((p) => lower.includes(p));
}

const CONTEXT_DEFAULTS: Record<ErrorContext, MappedError> = {
  load: {
    title: 'Erro ao carregar',
    message: 'Não foi possível carregar os dados.',
    hint: 'Verifique sua conexão e tente novamente.',
  },
  save: {
    title: 'Erro ao guardar',
    message: 'Não foi possível guardar as alterações.',
    hint: 'Revise os campos e tente novamente.',
  },
  delete: {
    title: 'Erro ao excluir',
    message: 'Não foi possível remover o registro.',
    hint: 'Tente novamente em alguns instantes.',
  },
  upload: {
    title: 'Erro no upload',
    message: 'Não foi possível concluir o upload.',
    hint: 'Use imagem JPG, PNG ou WebP até 5 MB.',
  },
  auth: {
    title: 'Acesso negado',
    message: 'Você não possui permissão para esta ação.',
    hint: 'Sua sessão pode ter expirado. Entre novamente.',
  },
  stripe: {
    title: 'Erro no pagamento',
    message: 'Erro ao sincronizar com Stripe.',
    hint: 'Confira as chaves e o produto no painel Stripe.',
  },
  network: {
    title: 'Problema de conexão',
    message: 'Não foi possível comunicar com o servidor.',
    hint: 'Verifique sua internet e tente novamente.',
  },
  generic: {
    title: 'Algo deu errado',
    message: 'Ocorreu um erro inesperado.',
    hint: 'Tente novamente. Se persistir, contacte o suporte.',
  },
};

export function mapError(error: unknown, context: ErrorContext = 'generic'): MappedError {
  const technical = extractTechnical(error);
  const base = { ...CONTEXT_DEFAULTS[context], technical };

  if (matches(technical, ['failed to fetch', 'network', 'networkerror', 'fetch'])) {
    return {
      title: 'Problema de conexão',
      message: 'Problema de conexão com a internet.',
      hint: 'Verifique sua rede e tente novamente.',
      technical,
    };
  }

  if (matches(technical, ['jwt', 'session', 'not authenticated', 'invalid login', 'refresh'])) {
    return {
      title: 'Sessão expirada',
      message: 'Sua sessão expirou. Entre novamente.',
      hint: 'Faça login outra vez para continuar.',
      technical,
    };
  }

  if (matches(technical, ['permission', 'rls', 'row-level security', '42501', '403'])) {
    return {
      title: 'Sem permissão',
      message: 'Você não possui permissão para esta ação.',
      hint: 'Contacte um administrador se precisar de acesso.',
      technical,
    };
  }

  if (
    matches(technical, [
      'storage',
      'upload',
      'bucket',
      'payload too large',
      'file size',
      'mime',
    ])
  ) {
    return {
      title: 'Falha no upload',
      message: 'Falha ao enviar arquivo para o armazenamento.',
      hint: 'Confira o formato e o tamanho do ficheiro.',
      technical,
    };
  }

  if (matches(technical, ['stripe', 'payment', 'checkout'])) {
    return {
      title: 'Erro no Stripe',
      message: 'Erro ao processar pagamento ou sincronizar com Stripe.',
      hint: 'Verifique a configuração do produto no Stripe.',
      technical,
    };
  }

  if (matches(technical, ['duplicate', 'unique', '23505', 'already exists', 'slug'])) {
    return {
      title: 'Registro duplicado',
      message: 'Já existe um registro com estes dados.',
      hint: 'Altere o título, código ou slug e tente novamente.',
      technical,
    };
  }

  if (matches(technical, ['pgrst', 'postgres', 'supabase', 'database', '42703', '42'])) {
    return {
      title: 'Erro de base de dados',
      message: 'Erro de comunicação com o banco de dados.',
      hint: 'Aguarde alguns segundos e tente novamente.',
      technical,
    };
  }

  if (matches(technical, ['timeout', 'timed out'])) {
    return {
      title: 'Tempo esgotado',
      message: 'A operação demorou demais para responder.',
      hint: 'Verifique sua conexão e tente novamente.',
      technical,
    };
  }

  return base;
}

export function logAdminError(scope: string, error: unknown, extra?: Record<string, unknown>) {
  console.error(`[Admin:${scope}]`, error, extra ?? '');
}

export const SUCCESS = {
  featuredSaved: 'Destaque guardado com sucesso.',
  featuredDeleted: 'Destaque removido com sucesso.',
  productPublished: 'Produto publicado com sucesso.',
  productUpdated: 'Produto atualizado com sucesso.',
  productDeleted: 'Produto removido com sucesso.',
  couponCreated: 'Cupom criado com sucesso.',
  couponUpdated: 'Cupom atualizado com sucesso.',
  imageUpdated: 'Imagem atualizada com sucesso.',
  notificationSent: 'Notificação enviada com sucesso.',
  campaignActivated: 'Campanha ativada com sucesso.',
  categorySaved: 'Categoria guardada com sucesso.',
  newsSaved: 'Notícia publicada com sucesso.',
} as const;
