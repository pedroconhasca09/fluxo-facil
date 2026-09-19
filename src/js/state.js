/**
 * @module js/state
 * Regras de negócio do domínio "finanças pessoais": adicionar, remover e
 * calcular totais a partir da lista de transações.
 *
 * Todas as funções aqui são PURAS: recebem dados de entrada e retornam
 * novos dados de saída, sem modificar os argumentos originais (imutabilidade)
 * e sem tocar em DOM, localStorage ou qualquer outro efeito colateral.
 * Isso torna a lógica fácil de entender, testar e depurar isoladamente.
 */

/**
 * @typedef {Object} Transacao
 * @property {string} id - Identificador único da transação.
 * @property {string} descricao - Texto livre descrevendo a transação.
 * @property {number} valor - Valor monetário (sempre positivo).
 * @property {"entrada"|"saida"} tipo - Se é um ganho ou um gasto.
 * @property {string} categoria - Categoria da transação (ex.: "alimentacao").
 * @property {string} data - Data no formato "YYYY-MM-DD".
 */

/**
 * Retorna uma NOVA lista de transações com a nova transação adicionada ao
 * final. Não modifica o array recebido (princípio da imutabilidade).
 *
 * @param {Transacao[]} transacoes - Lista atual de transações.
 * @param {Transacao} novaTransacao - Transação a ser adicionada.
 * @returns {Transacao[]} Nova lista de transações.
 */
export function adicionarTransacao(transacoes, novaTransacao) {
  return [...transacoes, novaTransacao];
}

/**
 * Retorna uma NOVA lista de transações sem o item cujo `id` foi informado.
 *
 * @param {Transacao[]} transacoes - Lista atual de transações.
 * @param {string} id - Identificador da transação a ser removida.
 * @returns {Transacao[]} Nova lista de transações, sem o item removido.
 */
export function removerTransacao(transacoes, id) {
  return transacoes.filter((transacao) => transacao.id !== id);
}

/**
 * Calcula o resumo financeiro (entradas, saídas e saldo) a partir da lista
 * de transações. Centralizar esse cálculo aqui evita que a mesma soma seja
 * refeita (e potencialmente divergente) em múltiplos lugares da UI.
 *
 * @param {Transacao[]} transacoes - Lista de transações.
 * @returns {{entradas: number, saidas: number, saldo: number}} Totais calculados.
 */
export function calcularResumo(transacoes) {
  const entradas = transacoes
    .filter((transacao) => transacao.tipo === "entrada")
    .reduce((total, transacao) => total + transacao.valor, 0);

  const saidas = transacoes
    .filter((transacao) => transacao.tipo === "saida")
    .reduce((total, transacao) => total + transacao.valor, 0);

  return {
    entradas,
    saidas,
    saldo: entradas - saidas,
  };
}

/**
 * Agrupa o valor total de SAÍDAS por categoria — dado usado para montar o
 * gráfico de pizza (faz mais sentido analisar "para onde o dinheiro foi"
 * do que misturar entradas e saídas na mesma fatia).
 *
 * @param {Transacao[]} transacoes - Lista de transações.
 * @returns {Record<string, number>} Mapa "categoria -> total gasto".
 */
export function agruparSaidasPorCategoria(transacoes) {
  return transacoes
    .filter((transacao) => transacao.tipo === "saida")
    .reduce((acumulador, transacao) => {
      const totalAtual = acumulador[transacao.categoria] ?? 0;
      acumulador[transacao.categoria] = totalAtual + transacao.valor;
      return acumulador;
    }, /** @type {Record<string, number>} */ ({}));
}
