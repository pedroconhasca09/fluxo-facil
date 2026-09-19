/**
 * @module js/chart.js
 * Encapsula toda a interação com a biblioteca Chart.js, mantendo o resto da
 * aplicação agnóstico em relação a qual biblioteca de gráficos é usada.
 *
 * Se um dia a biblioteca for trocada (ex.: por D3 ou ApexCharts), somente
 * este arquivo precisa mudar — `app.js` continua chamando as mesmas duas
 * funções (`inicializarGrafico` e `atualizarGrafico`).
 */

import { ROTULOS_CATEGORIA } from "../utils/helpers.js";

/**
 * Paleta de cores fixas para as fatias do gráfico, na mesma ordem das
 * categorias cadastradas no formulário. Cores fixas (em vez de aleatórias)
 * garantem que "Alimentação" sempre apareça na mesma cor entre renderizações,
 * o que ajuda a leitura visual do usuário.
 * @type {string[]}
 */
const PALETA_CORES = [
  "#2563eb", // alimentacao
  "#f59e0b", // moradia
  "#10b981", // transporte
  "#ef4444", // saude
  "#8b5cf6", // lazer
  "#ec4899", // educacao
  "#14b8a6", // salario
  "#6b7280", // outros
];

/**
 * Cria e retorna uma instância do Chart.js (gráfico de pizza) já configurada
 * com boas práticas de acessibilidade básicas (o `<canvas>` já recebe
 * `role="img"` e `aria-label` diretamente no HTML).
 *
 * @param {CanvasRenderingContext2D|HTMLCanvasElement} contexto - Contexto/canvas alvo do gráfico.
 * @returns {import("chart.js").Chart|null} Instância do gráfico criado.
 */
export function inicializarGrafico(contexto) {
  if (!contexto) {
    console.warn("[CHART] Canvas do gráfico não encontrado. O dashboard seguirá sem gráfico.");
    return null;
  }

  const ChartGlobal = globalThis.Chart;
  if (typeof ChartGlobal !== "function") {
    console.warn("[CHART] Biblioteca Chart.js indisponível. O dashboard seguirá sem gráfico.");
    return null;
  }

  try {
    return new ChartGlobal(contexto, {
      type: "pie",
      data: {
        labels: [],
        datasets: [
          {
            data: [],
            backgroundColor: PALETA_CORES,
            borderColor: "var(--color-surface)",
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "bottom",
          },
          tooltip: {
            callbacks: {
              label: (contextoTooltip) => {
                const valor = contextoTooltip.parsed ?? 0;
                const valorFormatado = new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(valor);
                return ` ${contextoTooltip.label}: ${valorFormatado}`;
              },
            },
          },
        },
      },
    });
  } catch (erro) {
    console.error("[CHART] Erro ao inicializar o gráfico:", erro);
    return null;
  }
}

/**
 * Atualiza os dados de um gráfico já existente, evitando recriar a
 * instância a cada nova transação (o que seria custoso e causaria
 * "piscadas" visuais desnecessárias).
 *
 * @param {import("chart.js").Chart|null} grafico - Instância retornada por `inicializarGrafico`.
 * @param {Record<string, number>} totaisPorCategoria - Mapa "categoria -> total gasto".
 * @returns {void}
 */
export function atualizarGrafico(grafico, totaisPorCategoria) {
  if (!grafico) return;

  const categorias = Object.keys(totaisPorCategoria);

  grafico.data.labels = categorias.map(
    (categoria) => ROTULOS_CATEGORIA[categoria] ?? categoria
  );
  grafico.data.datasets[0].data = categorias.map(
    (categoria) => totaisPorCategoria[categoria]
  );

  grafico.update();
}
