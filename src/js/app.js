/**
 * @module js/app
 * Ponto de entrada da aplicação (importado via `<script type="module">` no
 * `index.html`). Responsável por:
 *   1. Selecionar os elementos do DOM necessários;
 *   2. Carregar o estado inicial (transações e tema) do `localStorage`;
 *   3. Registrar os ouvintes de evento (submit do formulário, clique no
 *      botão de tema, exclusão de transações);
 *   4. Orquestrar o ciclo de dados entre os módulos: uma ação do usuário
 *      atualiza o estado (`state.js`), o novo estado é persistido
 *      (`storage.js`) e a interface é redesenhada (`ui.js` e `chart.js`).
 *
 * Fluxo de dados resumido (unidirecional, inspirado em arquiteturas Flux):
 *
 *   Evento do usuário -> state.js (calcula novo estado)
 *                     -> storage.js (persiste no localStorage)
 *                     -> ui.js + chart.js (redesenham a tela)
 */

import {
  obterTransacoes,
  salvarTransacoes,
  obterTemaSalvo,
  salvarTema,
  verificarDisponibilidadeStorage,
} from "./storage.js";
import {
  adicionarTransacao,
  removerTransacao,
  calcularResumo,
  agruparSaidasPorCategoria,
} from "./state.js";
import {
  renderizarTabela,
  renderizarResumo,
  aplicarTema,
  obterTemaInicial,
  exibirErroCampo,
} from "./ui.js";
import { inicializarGrafico, atualizarGrafico } from "./chart.js";
import { gerarId, obterDataAtualISO } from "../utils/helpers.js";

/* ==========================================================================
   1. SELEÇÃO DOS ELEMENTOS DO DOM
   Centralizar os seletores no topo facilita localizar rapidamente qualquer
   referência usada pelo restante do arquivo.
   ========================================================================== */
const formulario = document.getElementById("form-transacao");
const campoDescricao = document.getElementById("input-descricao");
const campoValor = document.getElementById("input-valor");
const campoTipo = document.getElementById("input-tipo");
const campoCategoria = document.getElementById("input-categoria");
const campoData = document.getElementById("input-data");
const erroDescricao = document.getElementById("erro-descricao");
const erroValor = document.getElementById("erro-valor");

const corpoTabela = document.getElementById("corpo-tabela-transacoes");
const tabelaVazia = document.getElementById("tabela-vazia");

const elSaldo = document.getElementById("valor-saldo");
const elEntradas = document.getElementById("valor-entradas");
const elSaidas = document.getElementById("valor-saidas");

const canvasGrafico = document.getElementById("grafico-categorias");
const graficoVazio = document.getElementById("grafico-vazio");
const avisoSistema = document.getElementById("aviso-sistema");

const botaoTema = document.getElementById("btn-tema");
const iconeTema = document.getElementById("icone-tema");

/* ==========================================================================
   2. ESTADO EM MEMÓRIA DA APLICAÇÃO
   Mantemos uma cópia das transações em memória (`transacoes`) para evitar
   ler o localStorage a cada interação. Toda alteração passa por `state.js`
   (que retorna um NOVO array, mantendo imutabilidade) e, em seguida, é
   sincronizada com `storage.js`.
   ========================================================================== */
let transacoes = [];
let grafico = null;

/* ==========================================================================
   3. FUNÇÃO CENTRAL DE RENDERIZAÇÃO
   Sempre que o estado muda, esta função é chamada para redesenhar todas as
   partes visuais dependentes dos dados (resumo, tabela e gráfico). Isso
   evita duplicar a lógica de "o que atualizar" em cada evento.
   ========================================================================== */
function renderizarAplicacao() {
  const resumo = calcularResumo(transacoes);
  renderizarResumo(resumo, { elSaldo, elEntradas, elSaidas });
  renderizarTabela(transacoes, corpoTabela, tabelaVazia, aoExcluirTransacao);

  const totaisPorCategoria = agruparSaidasPorCategoria(transacoes);

  if (grafico) {
    graficoVazio.hidden = Object.keys(totaisPorCategoria).length > 0;
    atualizarGrafico(grafico, totaisPorCategoria);
    return;
  }

  graficoVazio.hidden = false;
}

function exibirAvisoSistema(mensagem, tipo = "aviso") {
  if (!avisoSistema) {
    console.warn(`[APP] ${mensagem}`);
    return;
  }

  avisoSistema.textContent = mensagem;
  avisoSistema.dataset.type = tipo;
  avisoSistema.hidden = false;
}

function validarElementosEssenciais() {
  const elementosEssenciais = {
    formulario,
    campoDescricao,
    campoValor,
    campoTipo,
    campoCategoria,
    campoData,
    erroDescricao,
    erroValor,
    corpoTabela,
    tabelaVazia,
    elSaldo,
    elEntradas,
    elSaidas,
    graficoVazio,
    botaoTema,
    iconeTema,
  };

  const faltando = Object.entries(elementosEssenciais)
    .filter(([, elemento]) => !elemento)
    .map(([nome]) => nome);

  if (faltando.length > 0) {
    throw new Error(`Elementos obrigatórios ausentes no DOM: ${faltando.join(", ")}`);
  }
}

/* ==========================================================================
   4. MANIPULADORES DE EVENTO
   ========================================================================== */

/**
 * Valida os campos do formulário manualmente (além da validação nativa do
 * HTML5 via `required`/`min`), permitindo mensagens de erro personalizadas
 * e em português, anunciadas por `role="alert"` (ver `index.html`).
 *
 * @returns {boolean} `true` se todos os campos são válidos.
 */
function validarFormulario() {
  let valido = true;

  if (campoDescricao.value.trim().length < 2) {
    exibirErroCampo(erroDescricao, "Informe uma descrição com pelo menos 2 caracteres.");
    valido = false;
  } else {
    exibirErroCampo(erroDescricao, "");
  }

  const valorNumerico = Number(campoValor.value);
  if (!campoValor.value || Number.isNaN(valorNumerico) || valorNumerico <= 0) {
    exibirErroCampo(erroValor, "Informe um valor numérico maior que zero.");
    valido = false;
  } else {
    exibirErroCampo(erroValor, "");
  }

  return valido;
}

/**
 * Trata o envio do formulário de nova transação: valida, monta o objeto da
 * transação, atualiza o estado, persiste e redesenha a tela.
 *
 * @param {SubmitEvent} evento
 * @returns {void}
 */
function aoSubmeterFormulario(evento) {
  // Impede o comportamento padrão do navegador (recarregar a página).
  evento.preventDefault();

  if (!validarFormulario()) return;

  const novaTransacao = {
    id: gerarId(),
    descricao: campoDescricao.value.trim(),
    valor: Number(campoValor.value),
    tipo: campoTipo.value,
    categoria: campoCategoria.value,
    data: campoData.value || obterDataAtualISO(),
  };

  transacoes = adicionarTransacao(transacoes, novaTransacao);
  salvarTransacoes(transacoes);
  renderizarAplicacao();

  formulario.reset();
  campoData.value = obterDataAtualISO();
  campoDescricao.focus();
}

/**
 * Remove uma transação pelo `id`, persiste a nova lista e redesenha a tela.
 * Passada como callback para `ui.js`, que a associa ao clique de cada botão
 * "Excluir" gerado dinamicamente na tabela.
 *
 * @param {string} id - Identificador da transação a remover.
 * @returns {void}
 */
function aoExcluirTransacao(id) {
  transacoes = removerTransacao(transacoes, id);
  salvarTransacoes(transacoes);
  renderizarAplicacao();
}

/**
 * Alterna entre tema claro e escuro, persistindo a escolha do usuário para
 * que ela seja respeitada em futuras visitas.
 *
 * @returns {void}
 */
function aoAlternarTema() {
  const temaAtual = document.documentElement.getAttribute("data-theme") === "dark" ? "escuro" : "claro";
  const novoTema = temaAtual === "escuro" ? "claro" : "escuro";

  aplicarTema(novoTema, { botao: botaoTema, icone: iconeTema });
  salvarTema(novoTema);
}

/* ==========================================================================
   5. INICIALIZAÇÃO DA APLICAÇÃO
   ========================================================================== */
function inicializar() {
  // Sinaliza que o módulo executou, permitindo ao fallback em index.html distinguir esse caso.
  document.documentElement.dataset.appBoot = "ok";

  try {
    validarElementosEssenciais();

    if (!verificarDisponibilidadeStorage()) {
      exibirAvisoSistema(
        "Seu navegador bloqueou o armazenamento local. As transações funcionarão, mas não serão salvas após recarregar.",
        "aviso"
      );
    }

    transacoes = obterTransacoes();
    grafico = inicializarGrafico(canvasGrafico);

    if (!grafico) {
      graficoVazio.textContent = "Não foi possível carregar o gráfico no momento. O restante do dashboard segue funcional.";
      graficoVazio.hidden = false;
    }

    campoData.value = obterDataAtualISO();
    const temaInicial = obterTemaInicial(obterTemaSalvo());
    aplicarTema(temaInicial, { botao: botaoTema, icone: iconeTema });

    formulario.addEventListener("submit", aoSubmeterFormulario);
    botaoTema.addEventListener("click", aoAlternarTema);

    renderizarAplicacao();
  } catch (erro) {
    console.error("[APP] Falha ao inicializar o dashboard:", erro);
    exibirAvisoSistema(
      "Falha ao inicializar o dashboard. Recarregue a página e verifique o console para detalhes.",
      "erro"
    );
  }
}

inicializar();
