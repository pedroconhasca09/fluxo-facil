/**
 * @module utils/helpers
 * Funções utilitárias puras (sem efeitos colaterais) usadas por toda a
 * aplicação. Ficam em `src/utils/` — e não em `src/js/` — porque não lidam
 * com estado ou DOM, apenas transformam dados de entrada em saída.
 *
 * Manter funções puras aqui facilita testes unitários futuros: dado o mesmo
 * argumento, o retorno é sempre o mesmo, sem depender de localStorage, DOM
 * ou variáveis externas.
 */

/**
 * Formata um número como moeda brasileira (BRL) usando a API nativa
 * `Intl.NumberFormat`, evitando bibliotecas externas só para isso.
 *
 * @param {number} valor - Valor numérico a ser formatado (ex.: 1500.5).
 * @returns {string} Valor formatado (ex.: "R$ 1.500,50").
 */
export function formatarMoeda(valor) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(valor) || 0);
}

/**
 * Formata uma data no formato "YYYY-MM-DD" (padrão do <input type="date">)
 * para o formato brasileiro "DD/MM/AAAA".
 *
 * Por que não usar `new Date(dataISO)` diretamente?
 * `new Date("2024-01-31")` é interpretado como UTC meia-noite. Em fusos
 * horários negativos (como o do Brasil, UTC-3), isso pode exibir o dia
 * anterior. Por isso fazemos o parse manual dos componentes da string.
 *
 * @param {string} dataISO - Data no formato "YYYY-MM-DD".
 * @returns {string} Data formatada (ex.: "31/01/2024").
 */
export function formatarData(dataISO) {
  if (!dataISO) return "";
  const [ano, mes, dia] = dataISO.split("-");
  return `${dia}/${mes}/${ano}`;
}

/**
 * Gera um identificador único para cada transação.
 * Usa `crypto.randomUUID()` (disponível nos navegadores modernos) com um
 * fallback simples baseado em timestamp + número aleatório para ambientes
 * onde a API não exista.
 *
 * @returns {string} Identificador único.
 */
export function gerarId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Retorna a data atual no formato "YYYY-MM-DD", útil para preencher o campo
 * de data do formulário com um valor padrão amigável.
 *
 * @returns {string} Data atual formatada para uso em <input type="date">.
 */
export function obterDataAtualISO() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

/**
 * Mapa de rótulos amigáveis (em português) para cada valor bruto de
 * categoria armazenado no estado. Centralizar aqui evita strings mágicas
 * espalhadas por `ui.js` e `chart.js`.
 * @type {Record<string, string>}
 */
export const ROTULOS_CATEGORIA = {
  alimentacao: "Alimentação",
  moradia: "Moradia",
  transporte: "Transporte",
  saude: "Saúde",
  lazer: "Lazer",
  educacao: "Educação",
  salario: "Salário",
  outros: "Outros",
};
