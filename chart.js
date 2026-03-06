(function () {
  function createDailyCarbonChart(canvas) {
    if (!canvas || !window.Chart) {
      return null;
    }

    const items = window.CarbonTrackerConfig.ITEMS;

    return new window.Chart(canvas, {
      type: "bar",
      data: {
        labels: items.map(function (item) {
          return item.label;
        }),
        datasets: [
          {
            label: "입력값",
            data: items.map(function () {
              return 0;
            }),
            backgroundColor: items.map(function (item) {
              return item.color;
            }),
            borderRadius: 12,
            borderSkipped: false,
            maxBarThickness: 56,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 260,
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            displayColors: false,
            callbacks: {
              label: function (context) {
                const item = items[context.dataIndex];
                return item.label + ": " + context.raw + item.unit;
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              color: "#4e5d4f",
              font: {
                size: 13,
                weight: "700",
              },
            },
          },
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0,
              color: "#4e5d4f",
            },
            title: {
              display: true,
              text: "입력값",
              color: "#4e5d4f",
              font: {
                size: 12,
                weight: "700",
              },
            },
            grid: {
              color: "rgba(39, 48, 39, 0.08)",
            },
          },
        },
      },
    });
  }

  function updateDailyCarbonChart(chart, state) {
    if (!chart) {
      return;
    }

    const items = window.CarbonTrackerConfig.ITEMS;
    chart.data.datasets[0].data = items.map(function (item) {
      return state[item.key];
    });
    chart.update();
  }

  function createWeeklyTrendChart(canvas) {
    if (!canvas || !window.Chart) {
      return null;
    }

    return new window.Chart(canvas, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "탄소 배출량",
            data: [],
            borderColor: "#1f7a5c",
            backgroundColor: "rgba(31, 122, 92, 0.14)",
            pointBackgroundColor: "#1f7a5c",
            pointBorderColor: "#ffffff",
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 6,
            borderWidth: 3,
            fill: true,
            tension: 0.34,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 260,
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            displayColors: false,
            callbacks: {
              label: function (context) {
                return "탄소 배출량: " + Number(context.raw).toFixed(2) + " kg";
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              color: "#4e5d4f",
              font: {
                size: 12,
                weight: "700",
              },
            },
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: "#4e5d4f",
              callback: function (value) {
                return value + "kg";
              },
            },
            title: {
              display: true,
              text: "탄소 배출량(kg)",
              color: "#4e5d4f",
              font: {
                size: 12,
                weight: "700",
              },
            },
            grid: {
              color: "rgba(39, 48, 39, 0.08)",
            },
          },
        },
      },
    });
  }

  function updateWeeklyTrendChart(chart, labels, values) {
    if (!chart) {
      return;
    }

    chart.data.labels = labels;
    chart.data.datasets[0].data = values;
    chart.update();
  }

  window.CarbonTrackerChart = {
    createDailyCarbonChart: createDailyCarbonChart,
    createWeeklyTrendChart: createWeeklyTrendChart,
    updateDailyCarbonChart: updateDailyCarbonChart,
    updateWeeklyTrendChart: updateWeeklyTrendChart,
  };
})();
