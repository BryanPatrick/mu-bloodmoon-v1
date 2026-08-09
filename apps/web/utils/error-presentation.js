const SUPPORTED_STATUS_CODES = new Set([403, 404, 500])

/**
 * Keeps the public error surface intentionally small. Unknown and server-side
 * failures always become the generic 500 presentation.
 *
 * @param {unknown} error
 */
export const normalizeErrorStatus = (error) => {
  if (!error || typeof error !== 'object') return 500

  const candidate = Number(error.statusCode || error.status)
  if (SUPPORTED_STATUS_CODES.has(candidate)) return candidate
  if (Number.isFinite(candidate) && candidate >= 400 && candidate < 500) return 404
  return 500
}

/** @param {number} statusCode */
export const getErrorPresentation = (statusCode) => {
  if (statusCode === 404) {
    return {
      kicker: 'Caminho perdido',
      title: 'Pagina nao encontrada',
      description: 'A pagina que voce procura nao existe ou foi movida.',
      documentTitle: 'Pagina nao encontrada | Blood Moon'
    }
  }

  if (statusCode === 403) {
    return {
      kicker: 'Acesso restrito',
      title: 'Acesso nao autorizado',
      description: 'Sua conta nao possui permissao para acessar esta area.',
      documentTitle: 'Acesso restrito | Blood Moon'
    }
  }

  return {
    kicker: 'Falha temporaria',
    title: 'Nao foi possivel carregar esta pagina',
    description:
      'Tente novamente em instantes. Se o problema continuar, use o codigo abaixo ao falar com o suporte.',
    documentTitle: 'Erro temporario | Blood Moon'
  }
}

/**
 * Only exposes correlation identifiers already declared as public error data.
 * Error messages, causes and stacks are deliberately ignored.
 *
 * @param {unknown} error
 */
export const getSafeRequestId = (error) => {
  if (!error || typeof error !== 'object') return ''
  const data = error.data
  if (!data || typeof data !== 'object') return ''

  const candidate = data.requestId || data.correlationId
  return typeof candidate === 'string' && /^[a-zA-Z0-9._:-]{8,80}$/.test(candidate) ? candidate : ''
}
