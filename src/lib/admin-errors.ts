/**
 * Mensagens de erro do admin. A URL carrega só um CÓDIGO (`?erro=codigo`); o texto
 * exibido vem sempre deste mapa. Código desconhecido gera a mensagem genérica, e
 * nenhum valor da URL chega à tela.
 */
export const ADMIN_ERRORS = {
  "acesso-negado": "Você não tem permissão para esta ação.",
  "sessao-expirada": "Sua sessão expirou. Entre novamente.",
  "operacao-falhou": "Não foi possível concluir a operação. Tente novamente.",
  "dados-invalidos": "Confira os campos informados.",
  "categoria-invalida": "Dados da categoria inválidos.",
  "categoria-com-produtos":
    "A categoria tem produtos (inclusive arquivados, que preservam o histórico de pedidos). Desative-a em vez de excluir.",
  "produto-invalido": "Confira os campos do produto.",
  "imagem-invalida": "A imagem deve ser JPG, PNG ou WebP de até 3 MB.",
  "upload-falhou": "Falha ao enviar a imagem.",
  "grupo-invalido": "Confira os dados do grupo de complementos.",
  "grupo-minimo-maior-maximo": "O mínimo não pode ser maior que o máximo.",
  "grupo-minimo-excede-opcoes": "O mínimo excede a quantidade de opções.",
  "horario-invalido": "Horários devem estar no formato HH:MM.",
  "mesa-nome-invalido": "Informe o nome da mesa.",
  "mesa-duplicada": "Já existe uma mesa com esse nome.",
  "pedido-mudou":
    "O pedido mudou enquanto você agia. Atualize a tela para ver as ações disponíveis.",
  "pedido-status-invalido":
    "Esta ação não está mais disponível para o status atual do pedido. Atualize a tela.",
} as const;

export type AdminErrorCode = keyof typeof ADMIN_ERRORS;

export const GENERIC_ADMIN_ERROR = "Ocorreu um erro. Tente novamente.";

/**
 * Converte o valor bruto de `?erro=` em texto seguro.
 * Retorna null quando não há erro; a mensagem genérica para qualquer valor desconhecido.
 */
export function adminErrorMessage(raw: string | string[] | undefined): string | null {
  const code = Array.isArray(raw) ? raw[0] : raw;
  if (code === undefined || code === "") return null;
  return Object.hasOwn(ADMIN_ERRORS, code)
    ? ADMIN_ERRORS[code as AdminErrorCode]
    : GENERIC_ADMIN_ERROR;
}

export function errorUrl(path: string, code?: AdminErrorCode): string {
  return code ? `${path}?erro=${code}` : path;
}
