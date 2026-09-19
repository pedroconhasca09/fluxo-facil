/**
 * @module js/storage
 * Camada de persistência da aplicação. Toda a comunicação com o
 * `localStorage` fica isolada neste módulo — nenhum outro arquivo acessa
 * `localStorage` diretamente.
 *
 * Por que isolar em um módulo próprio?
 * Se um dia a aplicação migrar para outra forma de persistência (ex.: uma
 * API REST, IndexedDB), basta reescrever as funções deste arquivo. O resto
 * da aplicação (state.js, ui.js, app.js) não precisa saber COMO os dados
 * são guardados, apenas QUE existem funções para ler e salvar.
 */

/** Chave usada para guardar a lista de transações no localStorage. */
const CHAVE_TRANSACOES = "financas-pessoais:transacoes";

/** Chave usada para guardar a preferência de tema (claro/escuro). */
const CHAVE_TEMA = "financas-pessoais:tema";

const CHAVE_TESTE_STORAGE = "financas-pessoais:teste-storage";

let avisoStorageIndisponivelEmitido = false;

const storageDisponivel = verificarAcessoStorage();

function verificarAcessoStorage() {
  try {
    localStorage.setItem(CHAVE_TESTE_STORAGE, CHAVE_TESTE_STORAGE);
    localStorage.removeItem(CHAVE_TESTE_STORAGE);
    return true;
  } catch {
    return false;
  }
}

function registrarAvisoStorageIndisponivel() {
  if (avisoStorageIndisponivelEmitido) return;
  console.warn("[STORAGE] localStorage indisponível. A aplicação seguirá sem persistência.");
  avisoStorageIndisponivelEmitido = true;
}

/**
 * Informa se o `localStorage` está funcional no ambiente atual.
 *
 * @returns {boolean}
 */
export function verificarDisponibilidadeStorage() {
  return storageDisponivel;
}

/**
 * Lê a lista de transações persistida no localStorage.
 *
 * @returns {Array<Object>} Lista de transações, ou array vazio se não
 * houver dados salvos ou se o conteúdo estiver corrompido.
 */
export function obterTransacoes() {
  if (!storageDisponivel) {
    registrarAvisoStorageIndisponivel();
    return [];
  }

  try {
    const dadosBrutos = localStorage.getItem(CHAVE_TRANSACOES);
    if (!dadosBrutos) return [];

    const transacoes = JSON.parse(dadosBrutos);
    return Array.isArray(transacoes) ? transacoes : [];
  } catch (erro) {
    // Um JSON corrompido não deve quebrar a aplicação inteira.
    console.error("Falha ao ler transações do localStorage:", erro);
    return [];
  }
}

/**
 * Persiste a lista de transações no localStorage, sobrescrevendo o valor
 * anterior.
 *
 * @param {Array<Object>} transacoes - Lista completa de transações.
 * @returns {void}
 */
export function salvarTransacoes(transacoes) {
  if (!storageDisponivel) {
    registrarAvisoStorageIndisponivel();
    return;
  }

  try {
    localStorage.setItem(CHAVE_TRANSACOES, JSON.stringify(transacoes));
  } catch (erro) {
    console.error("Falha ao salvar transações no localStorage:", erro);
  }
}

/**
 * Lê a preferência de tema salva anteriormente.
 *
 * @returns {"claro"|"escuro"|null} Tema salvo, ou `null` se o usuário nunca
 * escolheu um tema (nesse caso, a aplicação usa a preferência do sistema).
 */
export function obterTemaSalvo() {
  if (!storageDisponivel) {
    registrarAvisoStorageIndisponivel();
    return null;
  }

  try {
    return localStorage.getItem(CHAVE_TEMA);
  } catch (erro) {
    console.error("Falha ao ler tema do localStorage:", erro);
    return null;
  }
}

/**
 * Persiste a preferência de tema escolhida pelo usuário.
 *
 * @param {"claro"|"escuro"} tema - Tema a ser salvo.
 * @returns {void}
 */
export function salvarTema(tema) {
  if (!storageDisponivel) {
    registrarAvisoStorageIndisponivel();
    return;
  }

  try {
    localStorage.setItem(CHAVE_TEMA, tema);
  } catch (erro) {
    console.error("Falha ao salvar tema no localStorage:", erro);
  }
}
