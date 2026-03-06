(function () {
  const config = window.CarbonTrackerConfig;
  const storage = window.CarbonTrackerStorage;
  const chartApi = window.CarbonTrackerChart;

  const today = new Date();
  const todayKey = getDateKey(today);
  let selectedDateKey = todayKey;
  let dailyRecords = storage.loadDailyRecords();
  let state = storage.getStateForDate(selectedDateKey, dailyRecords);
  let dailyChartInstance = null;
  let weeklyTrendChartInstance = null;

  function formatToday() {
    return new Intl.DateTimeFormat("ko-KR", {
      dateStyle: "full",
    }).format(new Date());
  }

  function formatShortDate(date) {
    return new Intl.DateTimeFormat("ko-KR", {
      month: "long",
      day: "numeric",
      weekday: "short",
    }).format(date);
  }

  function formatCompactDate(date) {
    return new Intl.DateTimeFormat("ko-KR", {
      month: "numeric",
      day: "numeric",
    }).format(date);
  }

  function getDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
  }

  function getDateFromKey(dateKey) {
    const parts = dateKey.split("-").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function getLastNDates(count) {
    const dates = [];

    for (let index = 0; index < count; index += 1) {
      const date = new Date(today);
      date.setDate(today.getDate() - index);
      dates.push(date);
    }

    return dates;
  }

  function getItemByKey(key) {
    return config.ITEMS.find(function (item) {
      return item.key === key;
    });
  }

  function getControllableItems() {
    return config.ITEMS.filter(function (item) {
      return item.affectsEcoStatus !== false;
    });
  }

  function getDefaultValue(item) {
    return Number(config.DEFAULT_STATE[item.key] || 0);
  }

  function getComparableValue(item, currentState) {
    const normalizedValue = Number(currentState[item.key] || 0) / item.step;
    const normalizedDefault = getDefaultValue(item) / item.step;
    return Math.max(0, normalizedValue - normalizedDefault);
  }

  function getStudentActionCount(currentState) {
    return getControllableItems().reduce(function (total, item) {
      return total + getComparableValue(item, currentState);
    }, 0);
  }

  function getTotalCarbon(currentState) {
    return config.ITEMS.reduce(function (total, item) {
      return total + Number(currentState[item.key] || 0) * item.carbonFactor;
    }, 0);
  }

  function getControllableCarbon(currentState) {
    return getControllableItems().reduce(function (total, item) {
      return total + Number(currentState[item.key] || 0) * item.carbonFactor;
    }, 0);
  }

  function getBaselineLightingCarbon(currentState) {
    const lightingItem = getItemByKey("baseLightingMinutes");
    if (!lightingItem) {
      return 0;
    }

    return Number(currentState[lightingItem.key] || 0) * lightingItem.carbonFactor;
  }

  function getTopItem(currentState) {
    let topItem = null;
    let topValue = -1;

    getControllableItems().forEach(function (item) {
      const comparableValue = getComparableValue(item, currentState);

      if (comparableValue > topValue) {
        topItem = item;
        topValue = comparableValue;
      }
    });

    if (!topItem || topValue <= 0) {
      return null;
    }

    return topItem;
  }

  function getEcoLevel(controllableCarbon) {
    return config.ECO_LEVELS.find(function (level) {
      return controllableCarbon <= level.maxCarbon;
    });
  }

  function getTopItemFromRecords(records) {
    const totalsByItem = getControllableItems().reduce(function (acc, item) {
      acc[item.key] = 0;
      return acc;
    }, {});

    Object.keys(records).forEach(function (dateKey) {
      const currentState = records[dateKey];

      getControllableItems().forEach(function (item) {
        totalsByItem[item.key] += getComparableValue(item, currentState);
      });
    });

    let topItem = null;
    let topValue = -1;

    getControllableItems().forEach(function (item) {
      if (totalsByItem[item.key] > topValue) {
        topItem = item;
        topValue = totalsByItem[item.key];
      }
    });

    if (!topItem || topValue <= 0) {
      return null;
    }

    return topItem;
  }

  function getRecentRecords() {
    return getLastNDates(config.HISTORY_DAYS).map(function (date) {
      const dateKey = getDateKey(date);
      const dayState = storage.getStateForDate(dateKey, dailyRecords);
      return {
        date: date,
        dateKey: dateKey,
        state: dayState,
      };
    });
  }

  function getTip(topItem, controllableCarbon) {
    if (!topItem && controllableCarbon === 0) {
      return {
        title: "기본 조명은 기준 사용으로 보고 있어요",
        text: "지금은 에어컨·온풍기 사용과 쓰레기 기록이 거의 없어서 좋은 상태예요.",
      };
    }

    if (!topItem) {
      return {
        title: "기록을 시작해 보세요",
        text: "쓰레기나 에어컨·온풍기 사용을 기록하면 학생들이 줄일 수 있는 부분을 바로 알 수 있어요.",
      };
    }

    if (controllableCarbon >= 1.8) {
      return {
        title: "학생이 줄일 수 있는 부분을 찾아보세요",
        text: topItem.tip + " 오늘은 " + topItem.label + "부터 줄여 보면 좋아요.",
      };
    }

    return {
      title: "잘 살펴보고 있어요",
      text: topItem.tip + " 지금처럼 학생이 줄일 수 있는 부분을 계속 비교해 보세요.",
    };
  }

  function createControlCard(item) {
    const wrapper = document.createElement("article");
    wrapper.className = "control-card";
    wrapper.innerHTML =
      '<div class="control-copy">' +
      '  <div class="control-title">' +
      '    <span class="control-swatch" aria-hidden="true"></span>' +
      "    <strong></strong>" +
      "  </div>" +
      "  <p></p>" +
      "</div>" +
      '<div class="control-actions">' +
      '  <button class="action-button decrease-button" type="button" aria-label=""></button>' +
      '  <div class="value-chip" aria-live="polite"></div>' +
      '  <button class="action-button increase-button" type="button" aria-label=""></button>' +
      "</div>";

    wrapper.dataset.key = item.key;
    wrapper.querySelector(".control-swatch").style.backgroundColor = item.color;
    wrapper.querySelector(".control-title strong").textContent = item.label;
    wrapper.querySelector(".control-copy p").textContent = item.description;

    const decreaseButton = wrapper.querySelector(".decrease-button");
    const increaseButton = wrapper.querySelector(".increase-button");

    decreaseButton.textContent = "−";
    increaseButton.textContent = "+";
    decreaseButton.style.backgroundColor = item.color;
    increaseButton.style.backgroundColor = item.color;
    decreaseButton.setAttribute("aria-label", item.label + " 줄이기");
    increaseButton.setAttribute("aria-label", item.label + " 늘리기");

    return wrapper;
  }

  function renderControls() {
    const grid = document.getElementById("controlGrid");
    grid.innerHTML = "";

    config.ITEMS.forEach(function (item) {
      grid.appendChild(createControlCard(item));
    });
  }

  function updateSelectedDateUI() {
    const selectedDate = getDateFromKey(selectedDateKey);
    const isTodaySelected = selectedDateKey === todayKey;
    const titleText = isTodaySelected
      ? "오늘 기록을 수정하고 있어요"
      : formatShortDate(selectedDate) + " 기록을 수정하고 있어요";
    const descriptionText = isTodaySelected
      ? "기본 조명 360분을 기준으로, 오늘의 쓰레기와 에어컨·온풍기 사용을 입력하거나 고칠 수 있어요."
      : formatShortDate(selectedDate) +
        "에 저장한 기록을 불러왔어요. 기본 조명 기준 위에 쓰레기와 에어컨·온풍기 사용을 수정할 수 있어요.";

    document.getElementById("recordDate").value = selectedDateKey;
    document.getElementById("selectedDateTitle").textContent = titleText;
    document.getElementById("selectedDateDescription").textContent = descriptionText;
  }

  function updateControlValues() {
    config.ITEMS.forEach(function (item) {
      const card = document.querySelector('[data-key="' + item.key + '"]');
      if (!card) {
        return;
      }

      const valueChip = card.querySelector(".value-chip");
      valueChip.textContent = state[item.key] + item.unit;
    });
  }

  function updateSummary() {
    const totalCarbon = getTotalCarbon(state);
    const controllableCarbon = getControllableCarbon(state);
    const baselineLightingCarbon = getBaselineLightingCarbon(state);
    const topItem = getTopItem(state);
    const ecoLevel = getEcoLevel(controllableCarbon);
    const tip = getTip(topItem, controllableCarbon);

    document.getElementById("totalCount").textContent = String(
      getStudentActionCount(state)
    );
    document.getElementById("totalCountDescription").textContent =
      "기본 조명은 제외하고 학생이 줄이거나 조절할 수 있는 기록만 세어요.";
    document.getElementById("totalCarbon").textContent = totalCarbon.toFixed(2) + " kg";
    document.getElementById("totalCarbonDescription").textContent =
      "기본 조명 " +
      baselineLightingCarbon.toFixed(2) +
      "kg를 포함한 전체 예상 탄소예요.";
    document.getElementById("topItem").textContent = topItem
      ? topItem.label
      : "아직 없음";
    document.getElementById("topItemDescription").textContent = topItem
      ? "학생이 줄일 수 있는 항목 중 " + topItem.label + "이 가장 많이 나왔어요."
      : "기본 조명은 기준 사용으로 보고 있어요. 추가 사용이나 쓰레기가 거의 없어요.";
    document.getElementById("ecoStatus").textContent = ecoLevel.label;
    document.getElementById("statusDescription").textContent =
      ecoLevel.description +
      " 학생 실천 탄소는 " +
      controllableCarbon.toFixed(2) +
      "kg로 계산했어요.";
    document.getElementById("tipTitle").textContent = tip.title;
    document.getElementById("tipText").textContent = tip.text;

    const statusCard = document.querySelector(".status-card");
    statusCard.classList.remove("good", "normal", "alert");
    statusCard.classList.add(ecoLevel.className);
  }

  function renderHistory() {
    const recentRecords = getRecentRecords();
    const activeRecords = recentRecords.filter(function (entry) {
      return !storage.isEmptyState(entry.state);
    });
    const weeklyCarbon = activeRecords.reduce(function (total, entry) {
      return total + getTotalCarbon(entry.state);
    }, 0);
    const weeklyTopItem = getTopItemFromRecords(
      activeRecords.reduce(function (acc, entry) {
        acc[entry.dateKey] = entry.state;
        return acc;
      }, {})
    );

    document.getElementById("weeklyActiveDays").textContent =
      String(activeRecords.length) + "일";
    document.getElementById("weeklyCarbon").textContent =
      weeklyCarbon.toFixed(2) + " kg";
    document.getElementById("weeklyTopItem").textContent = weeklyTopItem
      ? weeklyTopItem.label
      : "아직 없음";

    const historyList = document.getElementById("historyList");
    historyList.innerHTML = "";

    recentRecords.forEach(function (entry) {
      const item = document.createElement("button");
      const entryTopItem = getTopItem(entry.state);
      const totalCount = getStudentActionCount(entry.state);
      const totalCarbon = getTotalCarbon(entry.state);
      const controllableCarbon = getControllableCarbon(entry.state);
      const isEmpty = storage.isEmptyState(entry.state);
      const isActive = entry.dateKey === selectedDateKey;

      item.type = "button";
      item.className =
        "history-item" +
        (isEmpty ? " empty" : "") +
        (isActive ? " active" : "");
      item.dataset.dateKey = entry.dateKey;
      item.innerHTML =
        "<div>" +
        "  <h3>" +
        formatShortDate(entry.date) +
        "</h3>" +
        "  <p>" +
        (isEmpty
          ? "기록이 없어요. 눌러서 새로 입력할 수 있어요."
          : entryTopItem
            ? "실천 " +
              totalCount +
              "단위 · 전체 " +
              totalCarbon.toFixed(2) +
              "kg · 주요 대상: " +
              entryTopItem.label
            : "기본 조명 중심 · 전체 " +
              totalCarbon.toFixed(2) +
              "kg · 학생 실천 탄소 " +
              controllableCarbon.toFixed(2) +
              "kg") +
        "</p>" +
        "</div>" +
        '<div class="history-value">' +
        (isActive
          ? "선택 중"
          : isEmpty
            ? "기록 없음"
            : controllableCarbon.toFixed(2) + " kg") +
        "</div>";

      historyList.appendChild(item);
    });

    const trendLabels = recentRecords
      .slice()
      .reverse()
      .map(function (entry) {
        return formatCompactDate(entry.date);
      });
    const trendValues = recentRecords
      .slice()
      .reverse()
      .map(function (entry) {
        return Number(getControllableCarbon(entry.state).toFixed(2));
      });

    chartApi.updateWeeklyTrendChart(weeklyTrendChartInstance, trendLabels, trendValues);
  }

  function render() {
    updateSelectedDateUI();
    updateControlValues();
    updateSummary();
    renderHistory();
    chartApi.updateDailyCarbonChart(dailyChartInstance, state);
  }

  function persistSelectedState() {
    dailyRecords = storage.saveStateForDate(selectedDateKey, state, dailyRecords);
  }

  function loadSelectedDate(dateKey) {
    selectedDateKey = dateKey;
    state = storage.getStateForDate(selectedDateKey, dailyRecords);
    render();
  }

  function updateState(key, delta) {
    const item = getItemByKey(key);
    if (!item) {
      return;
    }

    state[key] = Math.max(0, Number(state[key] || 0) + delta);
    persistSelectedState();
    render();
  }

  function bindControlEvents() {
    const grid = document.getElementById("controlGrid");

    grid.addEventListener("click", function (event) {
      const button = event.target.closest("button");
      if (!button) {
        return;
      }

      const card = event.target.closest(".control-card");
      if (!card) {
        return;
      }

      const item = getItemByKey(card.dataset.key);
      if (!item) {
        return;
      }

      const delta = button.classList.contains("increase-button") ? item.step : -item.step;
      updateState(item.key, delta);
    });
  }

  function bindHistoryEvents() {
    const historyList = document.getElementById("historyList");

    historyList.addEventListener("click", function (event) {
      const button = event.target.closest(".history-item");
      if (!button) {
        return;
      }

      loadSelectedDate(button.dataset.dateKey);
    });
  }

  function bindDateEvents() {
    const dateInput = document.getElementById("recordDate");
    const todayButton = document.getElementById("todayButton");
    const clearAllButton = document.getElementById("clearAllButton");

    dateInput.max = todayKey;
    dateInput.addEventListener("change", function () {
      const nextDateKey = dateInput.value || todayKey;
      loadSelectedDate(nextDateKey > todayKey ? todayKey : nextDateKey);
    });

    todayButton.addEventListener("click", function () {
      loadSelectedDate(todayKey);
    });

    clearAllButton.addEventListener("click", function () {
      const shouldClear = window.confirm(
        "이 브라우저에 저장된 모든 날짜 기록을 삭제할까요?"
      );

      if (!shouldClear) {
        return;
      }

      storage.clearAllData();
      dailyRecords = {};
      selectedDateKey = todayKey;
      state = storage.getStateForDate(todayKey, dailyRecords);
      render();
    });
  }

  function bindResetEvent() {
    const resetButton = document.getElementById("resetButton");
    resetButton.addEventListener("click", function () {
      state = Object.assign({}, config.DEFAULT_STATE);
      dailyRecords = storage.clearStateForDate(selectedDateKey, dailyRecords);
      render();
    });
  }

  function initCharts() {
    const dailyFallback = document.getElementById("chartFallback");
    const trendFallback = document.getElementById("trendFallback");
    const dailyCanvas = document.getElementById("carbonChart");
    const trendCanvas = document.getElementById("weeklyTrendChart");

    if (!window.Chart) {
      dailyFallback.hidden = false;
      trendFallback.hidden = false;
      dailyCanvas.hidden = true;
      trendCanvas.hidden = true;
      return;
    }

    dailyChartInstance = chartApi.createDailyCarbonChart(dailyCanvas);
    weeklyTrendChartInstance = chartApi.createWeeklyTrendChart(trendCanvas);
  }

  function initDate() {
    document.getElementById("todayDate").textContent = formatToday();
  }

  function init() {
    initDate();
    renderControls();
    bindControlEvents();
    bindHistoryEvents();
    bindDateEvents();
    bindResetEvent();
    initCharts();
    render();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
