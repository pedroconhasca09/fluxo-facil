/**
 * @file js/boot-check.js
 * Script CLÁSSICO (propositalmente sem `type="module"`, sem import/export).
 *
 * Por quê não é um ES Module como os demais arquivos de `src/js/`?
 * Módulos ES6 são bloqueados pelo navegador por política de CORS quando a
 * página é aberta via `file://` (origin "null") — é exatamente essa falha
 * que este arquivo precisa detectar e avisar ao usuário. Se ele também
 * fosse um módulo, seria bloqueado junto com `app.js` e nunca executaria.
 *
 * Duas verificações, escritas na região `#aviso-sistema` (aria-live) já
 * usada por `app.js` para avisos de degradação (gráfico/storage):
 *   1. Imediata: se o protocolo for "file:", os módulos serão bloqueados
 *      com certeza — avisamos na hora, sem esperar.
 *   2. Tardia (timeout): rede de segurança para qualquer outra falha
 *      silenciosa de carregamento do módulo (404, extensão do navegador, etc.).
 */
(function () {
  const avisoSistema = document.getElementById("aviso-sistema");

  /**
   * @param {string} mensagem
   * @returns {void}
   */
  function exibirAviso(mensagem) {
    if (!avisoSistema) return;
    avisoSistema.textContent = mensagem;
    avisoSistema.dataset.type = "erro";
    avisoSistema.hidden = false;
  }

  if (window.location.protocol === "file:") {
    exibirAviso(
      "Esta aplicação usa ES Modules e não funciona aberta diretamente do arquivo (file://). " +
        "Sirva o projeto por um servidor local: use a extensão Live Server do VS Code, ou rode " +
        '"python -m http.server 8000" na pasta do projeto e acesse http://localhost:8000.'
    );
  }

  setTimeout(function verificarBootDaAplicacao() {
    // document.documentElement.dataset.appBoot é definido por app.js assim que ele executa.
    if (document.documentElement.dataset.appBoot) return;

    if (avisoSistema && avisoSistema.hidden) {
      exibirAviso(
        "Não foi possível iniciar o JavaScript da aplicação. Verifique o console do navegador " +
          "e confirme que o projeto está sendo servido via http://."
      );
    }
  }, 1500);
})();
