/**
 * @module js/ui
 * Responsável por TODA a manipulação do DOM da aplicação: renderizar a
 * tabela de transações, os cards de resumo e controlar o Dark Mode.
 *
 * Por que isolar a manipulação do DOM em um único módulo?
 * `state.js` calcula os dados (lógica pura), e `ui.js` apenas os exibe.
 * Essa separação (padrão inspirado em MVC/MVVM) permite trocar a forma de
 * renderização no futuro (ex.: migrar para um framework) sem tocar nas
 * regras de negócio.
 *
 * Segurança (OWASP - XSS): em nenhum momento usamos `innerHTML` com dados
 * vindos do usuário (descrição da transação). Sempre criamos elementos via
 * `document.createElement` e atribuímos texto via `textContent`, que nunca
 * interpreta o conteúdo como HTML/script.
 */

import { formatarMoeda, formatarData, ROTULOS_CATEGORIA } from "../utils/helpers.js";

/**
 * Renderiza a tabela de transações no `<tbody>` informado, substituindo
 * completamente o conteúdo anterior. Para uma lista de transações do porte
 * de um app pessoal, recriar as linhas a cada atualização é simples e
 * suficientemente performático — mantendo o código legível.
 *
 * @param {Array<import("./state.js").Transacao>} transacoes - Lista de transações a exibir.
 * @param {HTMLTableSectionElement} corpoTabela - Elemento `<tbody>` alvo.
 * @param {HTMLElement} mensagemVazia - Elemento exibido quando não há transações.
 * @param {(id: string) => void} aoExcluir - Callback chamado com o `id` da transação ao clicar em excluir.
 * @returns {void}
 */
export function renderizarTabela(transacoes, corpoTabela, mensagemVazia, aoExcluir) {
  // Limpa o conteúdo atual antes de recriar as linhas.
  corpoTabela.innerHTML = "";

  const naoHaTransacoes = transacoes.length === 0;
  mensagemVazia.hidden = !naoHaTransacoes;
  if (naoHaTransacoes) return;

  // Exibe as transações mais recentes primeiro (melhor experiência de uso).
  const transacoesOrdenadas = [...transacoes].sort(
    (a, b) => new Date(b.data) - new Date(a.data)
  );

  for (const transacao of transacoesOrdenadas) {
    corpoTabela.appendChild(criarLinhaTransacao(transacao, aoExcluir));
  }
}

/**
 * Cria o elemento `<tr>` correspondente a uma transação.
 * Função auxiliar privada (não exportada) para manter `renderizarTabela` legível.
 *
 * @param {import("./state.js").Transacao} transacao - Dados da transação.
 * @param {(id: string) => void} aoExcluir - Callback de exclusão.
 * @returns {HTMLTableRowElement}
 */
function criarLinhaTransacao(transacao, aoExcluir) {
  const linha = document.createElement("tr");

  const celulaDescricao = document.createElement("td");
  celulaDescricao.textContent = transacao.descricao;

  const celulaCategoria = document.createElement("td");
  celulaCategoria.textContent = ROTULOS_CATEGORIA[transacao.categoria] ?? transacao.categoria;

  const celulaTipo = document.createElement("td");
  const selo = document.createElement("span");
  selo.className = `badge ${transacao.tipo === "entrada" ? "badge--entrada" : "badge--saida"}`;
  selo.textContent = transacao.tipo === "entrada" ? "Entrada" : "Saída";
  celulaTipo.appendChild(selo);

  const celulaValor = document.createElement("td");
  celulaValor.classList.add(transacao.tipo === "entrada" ? "valor--entrada" : "valor--saida");
  celulaValor.textContent = formatarMoeda(transacao.valor);

  const celulaData = document.createElement("td");
  celulaData.textContent = formatarData(transacao.data);

  const celulaAcao = document.createElement("td");
  const botaoExcluir = document.createElement("button");
  botaoExcluir.type = "button";
  botaoExcluir.className = "btn btn--excluir";
  botaoExcluir.textContent = "Excluir";
  // `aria-label` fornece contexto completo para leitores de tela, já que
  // vários botões "Excluir" existem na mesma tela (um por linha).
  botaoExcluir.setAttribute("aria-label", `Excluir transação: ${transacao.descricao}`);
  botaoExcluir.addEventListener("click", () => aoExcluir(transacao.id));
  celulaAcao.appendChild(botaoExcluir);

  linha.append(
    celulaDescricao,
    celulaCategoria,
    celulaTipo,
    celulaValor,
    celulaData,
    celulaAcao
  );

  return linha;
}

/**
 * Atualiza os três cards de resumo (saldo, entradas, saídas) com os valores
 * calculados em `state.js`. O contêiner pai desses cards já possui
 * `aria-live="polite"` no HTML, então qualquer mudança de texto feita aqui
 * é anunciada automaticamente por leitores de tela.
 *
 * @param {{saldo: number, entradas: number, saidas: number}} resumo - Totais calculados.
 * @param {{elSaldo: HTMLElement, elEntradas: HTMLElement, elSaidas: HTMLElement}} elementos - Referências dos elementos do DOM.
 * @returns {void}
 */
export function renderizarResumo(resumo, { elSaldo, elEntradas, elSaidas }) {
  elSaldo.textContent = formatarMoeda(resumo.saldo);
  elEntradas.textContent = formatarMoeda(resumo.entradas);
  elSaidas.textContent = formatarMoeda(resumo.saidas);
}

/**
 * Aplica o tema (claro/escuro) no documento, alterando o atributo
 * `data-theme` do `<html>` — usado pelas variáveis CSS em `global.css` — e
 * sincronizando o ícone/estado do botão de alternância.
 *
 * @param {"claro"|"escuro"} tema - Tema a ser aplicado.
 * @param {{botao: HTMLButtonElement, icone: HTMLElement}} elementos - Referências do botão de tema.
 * @returns {void}
 */
export function aplicarTema(tema, { botao, icone }) {
  document.documentElement.setAttribute("data-theme", tema === "escuro" ? "dark" : "light");

  const estaEscuro = tema === "escuro";
  icone.textContent = estaEscuro ? "☀️" : "🌙";
  botao.setAttribute("aria-pressed", String(estaEscuro));
  botao.setAttribute(
    "aria-label",
    estaEscuro ? "Alternar para modo claro" : "Alternar para modo escuro"
  );
}

/**
 * Determina o tema inicial da aplicação seguindo a ordem de prioridade:
 * 1. Preferência explícita salva pelo usuário (localStorage);
 * 2. Preferência do sistema operacional (`prefers-color-scheme`);
 * 3. Tema claro como padrão final.
 *
 * @param {"claro"|"escuro"|null} temaSalvo - Valor retornado por `storage.js`.
 * @returns {"claro"|"escuro"}
 */
export function obterTemaInicial(temaSalvo) {
  if (temaSalvo === "claro" || temaSalvo === "escuro") return temaSalvo;

  const prefereEscuro = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefereEscuro ? "escuro" : "claro";
}

/**
 * Exibe uma mensagem de erro de validação abaixo do campo correspondente,
 * associada via `aria-describedby` (já presente no HTML) e `role="alert"`
 * para que leitores de tela anunciem o erro assim que ele aparecer.
 *
 * @param {HTMLElement} elementoErro - Elemento `<span>` que exibirá a mensagem.
 * @param {string} mensagem - Texto do erro (string vazia limpa o erro).
 * @returns {void}
 */
export function exibirErroCampo(elementoErro, mensagem) {
  elementoErro.textContent = mensagem;
}
