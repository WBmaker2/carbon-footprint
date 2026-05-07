(function () {
  const config = window.CarbonTrackerConfig;
  const dateUtils = window.CarbonTrackerDate;
  const storage = window.CarbonTrackerStorage;
  const chartApi = window.CarbonTrackerChart;
  const calculations = window.CarbonTrackerCalculations;

  const loadResult = storage.loadDailyRecords();
  let lastKnownTodayKey = getTodayKey();
  let selectedDateKey = lastKnownTodayKey;
  let dailyRecords =
    loadResult && isObject(loadResult.records) ? loadResult.records : {};
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

  function formatCsvValue(value) {
    const text = value === null || value === undefined ? "" : String(value);
    if (text.indexOf(",") === -1 && text.indexOf('"') === -1 && text.indexOf("\n") === -1) {
      return text;
    }

    return '"' + text.replace(/"/g, '""') + '"';
  }

  function getDateKey(date) {
    return dateUtils.getLocalDateKey(date);
  }

  function getToday() {
    return new Date();
  }

  function getTodayKey() {
    return dateUtils.getTodayKey();
  }

  function isDateToday(dateKey) {
    return dateKey === getTodayKey();
  }

  function getSelectedDateLabel(dateKey) {
    const selectedDate = getDateFromKey(dateKey);

    if (isDateToday(dateKey)) {
      return "오늘";
    }

    return formatShortDate(selectedDate) + " 과거 기록";
  }

  function getDateFromKey(dateKey) {
    return dateUtils.getDateFromKey(dateKey);
  }

  function getDateForFilename(date) {
    return getDateKey(date || getToday());
  }

  function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function showOperationStatus(message, isError) {
    const statusElement = document.getElementById("backupStatus");
    if (!statusElement) {
      return;
    }

    statusElement.hidden = false;
    statusElement.textContent = message;
    statusElement.classList.remove("status-success", "status-error");
    statusElement.classList.add(isError ? "status-error" : "status-success");
  }

  function clearOperationStatus() {
    const statusElement = document.getElementById("backupStatus");
    if (!statusElement) {
      return;
    }

    statusElement.hidden = true;
    statusElement.textContent = "";
    statusElement.classList.remove("status-success", "status-error");
  }

  function getStorageErrorMessage(storageError) {
    if (!storageError || typeof storageError !== "object") {
      return "원인을 확인할 수 없습니다.";
    }

    return storageError.userMessage || storageError.message || "원인을 확인할 수 없습니다.";
  }

  function downloadTextFile(fileName, content, type) {
    const blob = new Blob([content], { type: type });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = objectUrl;
    anchor.download = fileName;
    anchor.rel = "noopener";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    setTimeout(function () {
      window.URL.revokeObjectURL(objectUrl);
    }, 0);
  }

  function getImportMode() {
    const checked = document.querySelector("input[name='importMode']:checked");
    if (!checked) {
      return "merge";
    }

    return checked.value === "replace" ? "replace" : "merge";
  }

  function buildWeeklySummaryCsvContent() {
    const recentRecords = getRecentRecords().slice().reverse();
    const rows = [];
    const csvHeader = [
      "날짜",
      "전체 탄소(kg)",
      "학생 실천 탄소(kg)",
      "학생 실천 수량",
      "플라스틱(개)",
      "종이(장)",
      "캔(개)",
      "일반쓰레기(개)",
      "기본조명(분)",
      "에어컨·온풍기(분)",
    ];
    rows.push(csvHeader.map(formatCsvValue).join(","));

    recentRecords.forEach(function (entry) {
      const totalCarbon = calculations.getTotalCarbon(entry.state);
      const controllableCarbon = calculations.getControllableCarbon(entry.state);
      const row = [
        entry.dateKey,
        totalCarbon.toFixed(2),
        controllableCarbon.toFixed(2),
        calculations.getStudentActionCount(entry.state),
        entry.state.plastic,
        entry.state.paper,
        entry.state.can,
        entry.state.general,
        entry.state.baseLightingMinutes,
        entry.state.hvacMinutes,
      ];
      rows.push(row.map(formatCsvValue).join(","));
    });

    const weeklyCarbon = recentRecords.reduce(function (total, entry) {
      return total + calculations.getTotalCarbon(entry.state);
    }, 0);
    const weeklyActionCount = recentRecords.reduce(function (total, entry) {
      return total + calculations.getStudentActionCount(entry.state);
    }, 0);
    const summaryRow = [
      "최근7일합계",
      weeklyCarbon.toFixed(2),
      "",
      weeklyActionCount,
      "",
      "",
      "",
      "",
      "",
      "",
    ];
    rows.push(summaryRow.map(formatCsvValue).join(","));

    return rows.join("\n");
  }

  function getBackupFileName() {
    return "carbon-footprint-backup-" + getDateForFilename(getToday()) + ".json";
  }

  function getWeeklySummaryCsvFileName() {
    return "carbon-footprint-7day-summary-" + getDateForFilename(getToday()) + ".csv";
  }

  function getLastNDates(count) {
    const dates = [];
    const today = getToday();

    for (let index = 0; index < count; index += 1) {
      const date = new Date(today);
      date.setDate(today.getDate() - index);
      dates.push(date);
    }

    return dates;
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

  function createElement(tagName, className, textContent) {
    const element = document.createElement(tagName);

    if (className) {
      element.className = className;
    }

    if (textContent !== undefined) {
      element.textContent = textContent;
    }

    return element;
  }

  function createControlCard(item) {
    const wrapper = document.createElement("article");
    const controlCopy = createElement("div", "control-copy");
    const controlTitle = createElement("div", "control-title");
    const controlSwatch = createElement("span", "control-swatch");
    const title = createElement("strong", "", item.label);
    const description = createElement("p", "", item.description);
    const controlActions = createElement("div", "control-actions");
    const decreaseButton = createElement("button", "action-button decrease-button", "−");
    const valueChip = createElement("div", "value-chip");
    const increaseButton = createElement("button", "action-button increase-button", "+");

    wrapper.className = "control-card";
    wrapper.dataset.key = item.key;

    controlSwatch.setAttribute("aria-hidden", "true");
    controlSwatch.style.backgroundColor = item.color;
    controlTitle.append(controlSwatch, title);
    controlCopy.append(controlTitle, description);

    decreaseButton.type = "button";
    increaseButton.type = "button";
    valueChip.setAttribute("aria-live", "polite");
    decreaseButton.style.backgroundColor = item.color;
    increaseButton.style.backgroundColor = item.color;
    decreaseButton.setAttribute("aria-label", item.label + " 줄이기");
    increaseButton.setAttribute("aria-label", item.label + " 늘리기");
    controlActions.append(decreaseButton, valueChip, increaseButton);

    wrapper.append(controlCopy, controlActions);

    return wrapper;
  }

  function renderControls() {
    const grid = document.getElementById("controlGrid");
    grid.innerHTML = "";

    config.ITEMS.forEach(function (item) {
      grid.appendChild(createControlCard(item));
    });
  }

  function updateStorageStatus() {
    const statusElement = document.getElementById("storageStatus");
    if (!statusElement || !storage.getLastStorageError) {
      return;
    }

    const storageError = storage.getLastStorageError();
    if (!storageError) {
      statusElement.hidden = true;
      statusElement.textContent = "";
      statusElement.classList.remove("status-success", "status-error");
      return;
    }

    statusElement.hidden = false;
    statusElement.classList.remove("status-success");
    statusElement.textContent = storageError.userMessage || storageError.message;
    statusElement.classList.add("status-error");
  }

  function downloadBackupJson() {
    try {
      const payload = storage.createBackupPayload(dailyRecords);
      downloadTextFile(
        getBackupFileName(),
        JSON.stringify(payload, null, 2),
        "application/json;charset=utf-8"
      );
      showOperationStatus("백업 파일을 내보냈어요: " + payload.exportedAt, false);
    } catch (error) {
      showOperationStatus("백업 내보내기에 실패했어요: " + error.message, true);
    }
  }

  function importBackupFile(file) {
    if (!file) {
      showOperationStatus("가져올 백업 파일을 선택해 주세요.", true);
      return;
    }

    return file
      .text()
      .then(function (rawText) {
        const trimmed = rawText.trim();
        if (!trimmed) {
          throw new Error("파일 내용이 비어 있어요.");
        }

        let parsed;
        try {
          parsed = JSON.parse(trimmed);
        } catch (error) {
          throw new Error("백업 파일 형식이 올바른 JSON이 아닙니다.");
        }
        const payload = storage.parseBackupPayload(parsed);
        const mode = getImportMode();
        const incomingCount = Object.keys(payload.dailyRecords || {}).length;

        if (incomingCount === 0 && mode === "replace") {
          const shouldClear = window.confirm(
            "선택한 백업에 기록이 없습니다.\n\n" +
              "교체 모드면 현재 모든 날짜 기록이 삭제됩니다. 진행할까요?"
          );

          if (!shouldClear) {
            throw new Error("가져오기를 취소했습니다.");
          }
        }

        const importResult =
          mode === "replace"
            ? storage.replaceDailyRecordsWithResult(payload.dailyRecords)
            : storage.mergeDailyRecordsWithResult(dailyRecords, payload.dailyRecords);

        dailyRecords = importResult.records;
        state = storage.getStateForDate(selectedDateKey, dailyRecords);
        render();

        if (!importResult.ok) {
          const storageError = importResult.error;
          throw new Error(
            getStorageErrorMessage(storageError)
          );
        }

        const modeLabel = mode === "replace" ? "교체" : "병합";
        showOperationStatus(
          modeLabel + "로 백업을 복원했어요. 복원 기록 " + incomingCount + "건, 적용일자 " +
          (payload.exportedAt ? payload.exportedAt : "미상"),
          false
        );
      })
      .catch(function (error) {
        state = storage.getStateForDate(selectedDateKey, dailyRecords);
        render();
        showOperationStatus("백업 가져오기에 실패했어요: " + error.message, true);
      });
  }

  function downloadWeeklySummaryCsv() {
    try {
      const fileName = getWeeklySummaryCsvFileName();
      const csv = "\uFEFF" + buildWeeklySummaryCsvContent();
      downloadTextFile(fileName, csv, "text/csv;charset=utf-8");
      showOperationStatus("최근 7일 요약 CSV를 다운로드했어요: " + fileName, false);
    } catch (error) {
      showOperationStatus("CSV 다운로드에 실패했어요: " + error.message, true);
    }
  }

  function updateSelectedDateUI() {
    const selectedDate = getDateFromKey(selectedDateKey);
    const isTodaySelected = isDateToday(selectedDateKey);
    const selectedDateLabel = isTodaySelected
      ? "오늘"
      : formatShortDate(selectedDate);
    const titleText = isTodaySelected
      ? "오늘 기록을 수정하고 있어요"
      : selectedDateLabel + " 과거 기록을 수정하고 있어요";
    const descriptionText = isTodaySelected
      ? "기본 조명 360분을 기준으로, 오늘의 쓰레기와 에어컨·온풍기 사용을 입력하거나 고칠 수 있어요."
      : formatShortDate(selectedDate) +
        "에 저장한 과거 기록을 불러와 수정할 수 있어요. 선택한 날짜의 항목만 바꾸며, 다른 날짜 기록은 유지됩니다.";

    const dateInput = document.getElementById("recordDate");
    dateInput.max = getTodayKey();
    dateInput.value = selectedDateKey;
    document.getElementById("selectedDateTitle").textContent = titleText;
    document.getElementById("selectedDateDescription").textContent = descriptionText;
  }

  function getResetConfirmMessage() {
    const selectedDate = getDateFromKey(selectedDateKey);
    const isTodaySelected = isDateToday(selectedDateKey);
    const selectedDateLabel = isTodaySelected
      ? "오늘"
      : formatShortDate(selectedDate) + " (과거)";
    const affectedScope = isTodaySelected
      ? "오늘 기록(선택 날짜)"
      : getSelectedDateLabel(selectedDateKey);

    return (
      `${selectedDateLabel} 기록을 초기화할까요?\n\n` +
      `삭제 대상: ${affectedScope}만\n` +
      "다른 날짜 기록은 유지되지만, 삭제된 값은 되돌릴 수 없습니다."
    );
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
    const viewModel = calculations.buildSummaryViewModel(state, {
      isTodaySelected: isDateToday(selectedDateKey),
    });

    document.getElementById("summaryPanelKicker").textContent =
      viewModel.summaryPanelKicker;
    document.getElementById("tipPanelKicker").textContent =
      viewModel.tipPanelKicker;
    document.getElementById("totalCount").textContent = viewModel.totalCountText;
    document.getElementById("totalCountDescription").textContent =
      viewModel.totalCountDescription;
    document.getElementById("totalCarbon").textContent = viewModel.totalCarbonText;
    document.getElementById("totalCarbonDescription").textContent =
      viewModel.totalCarbonDescription;
    document.getElementById("topItem").textContent = viewModel.topItemText;
    document.getElementById("topItemDescription").textContent =
      viewModel.topItemDescription;
    document.getElementById("ecoStatus").textContent = viewModel.ecoStatusText;
    document.getElementById("statusDescription").textContent =
      viewModel.statusDescription;
    document.getElementById("tipTitle").textContent = viewModel.tipTitle;
    document.getElementById("tipText").textContent = viewModel.tipText;

    const statusCard = document.querySelector(".status-card");
    statusCard.classList.remove("good", "normal", "alert");
    statusCard.classList.add(viewModel.statusClassName);
  }

  function createHistoryItem(viewModel) {
    const item = document.createElement("button");
    const details = createElement("div");
    const title = createElement("h3", "", viewModel.title);
    const description = createElement(
      "p",
      "",
      viewModel.description
    );
    const historyValue = createElement(
      "div",
      "history-value",
      viewModel.valueText
    );

    item.type = "button";
    item.className =
      "history-item" +
      (viewModel.isEmpty ? " empty" : "") +
      (viewModel.isActive ? " active" : "");
    item.dataset.dateKey = viewModel.dateKey;
    details.append(title, description);
    item.append(details, historyValue);

    return item;
  }

  function renderHistory() {
    const recentRecords = getRecentRecords();
    const viewModel = calculations.buildWeeklySummaryViewModel(recentRecords, {
      selectedDateKey: selectedDateKey,
      formatShortDate: formatShortDate,
      formatCompactDate: formatCompactDate,
    });

    document.getElementById("weeklyActiveDays").textContent =
      viewModel.weeklyActiveDaysText;
    document.getElementById("weeklyCarbon").textContent =
      viewModel.weeklyCarbonText;
    document.getElementById("weeklyTopItem").textContent =
      viewModel.weeklyTopItemText;

    const historyList = document.getElementById("historyList");
    historyList.innerHTML = "";

    viewModel.historyItems.forEach(function (historyItem) {
      historyList.appendChild(createHistoryItem(historyItem));
    });

    chartApi.updateWeeklyTrendChart(
      weeklyTrendChartInstance,
      viewModel.trendLabels,
      viewModel.trendValues
    );
  }

  function render() {
    updateSelectedDateUI();
    updateStorageStatus();
    updateControlValues();
    updateSummary();
    renderHistory();
    chartApi.updateDailyCarbonChart(dailyChartInstance, state);
  }

  function persistSelectedState() {
    const saveResult = storage.saveStateForDate(
      selectedDateKey,
      state,
      dailyRecords
    );

    dailyRecords = saveResult.records;
    state = storage.getStateForDate(selectedDateKey, dailyRecords);

    if (!saveResult.ok) {
      return;
    }
  }

  function loadSelectedDate(dateKey) {
    selectedDateKey = dateKey;
    state = storage.getStateForDate(selectedDateKey, dailyRecords);
    render();
  }

  function updateState(key, delta) {
    const item = calculations.getItemByKey(key);
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

      const item = calculations.getItemByKey(card.dataset.key);
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
    const exportButton = document.getElementById("exportBackupButton");
    const importButton = document.getElementById("importBackupButton");
    const importInput = document.getElementById("backupFileInput");
    const exportCsvButton = document.getElementById("exportCsvButton");

    dateInput.addEventListener("change", function () {
      const currentTodayKey = getTodayKey();
      const nextDateKey = dateInput.value || currentTodayKey;
      loadSelectedDate(nextDateKey > currentTodayKey ? currentTodayKey : nextDateKey);
    });

    todayButton.addEventListener("click", function () {
      loadSelectedDate(getTodayKey());
    });

    clearAllButton.addEventListener("click", function () {
      const shouldClear = window.confirm(
        "이 브라우저(localStorage)에 저장된 모든 날짜 기록을 삭제할까요?\n\n" +
          "오늘·어제·수업 중 수정한 기록까지 포함해 되돌릴 수 없습니다.\n" +
          "삭제 후에는 브라우저에서 날짜 기록을 복구할 수 없습니다."
      );

      if (!shouldClear) {
        return;
      }

      const clearAllResult = storage.clearAllData();
      if (!clearAllResult.ok) {
        showOperationStatus(
          "전체 기록 삭제 결과를 저장소에 반영하지 못했어요. " +
            getStorageErrorMessage(clearAllResult.error),
          true
        );
        render();
        return;
      }

      dailyRecords = clearAllResult.records;
      selectedDateKey = getTodayKey();
      state = storage.getStateForDate(selectedDateKey, dailyRecords);
      render();
    });

    if (exportButton) {
      exportButton.addEventListener("click", function () {
        clearOperationStatus();
        downloadBackupJson();
      });
    }

    if (importButton && importInput) {
      importButton.addEventListener("click", function () {
        clearOperationStatus();
        importInput.click();
      });

      importInput.addEventListener("change", function () {
        const file = importInput.files && importInput.files[0];
        importInput.value = "";
        clearOperationStatus();
        importBackupFile(file);
      });
    }

    if (exportCsvButton) {
      exportCsvButton.addEventListener("click", function () {
        clearOperationStatus();
        downloadWeeklySummaryCsv();
      });
    }
  }

  function bindResetEvent() {
    const resetButton = document.getElementById("resetButton");
    resetButton.addEventListener("click", function () {
      const previousState = Object.assign({}, state);
      const previousRecords = Object.assign({}, dailyRecords);

      const shouldClear = window.confirm(getResetConfirmMessage());

      if (!shouldClear) {
        return;
      }

      const clearResult = storage.clearStateForDate(
        selectedDateKey,
        dailyRecords
      );
      if (!clearResult.ok) {
        state = previousState;
        dailyRecords = previousRecords;
        showOperationStatus(
          "선택 날짜 초기화 저장 반영에 실패했어요. 화면은 그대로 유지되고 저장은 적용되지 않았을 수 있어요. " +
            getStorageErrorMessage(clearResult.error),
          true
        );
        render();
        return;
      }

      state = Object.assign({}, config.DEFAULT_STATE);
      dailyRecords = clearResult.records;
      render();
    });
  }

  function refreshTodayBoundary() {
    const currentTodayKey = getTodayKey();

    if (lastKnownTodayKey === currentTodayKey) {
      return;
    }

    lastKnownTodayKey = currentTodayKey;
    if (selectedDateKey > currentTodayKey) {
      selectedDateKey = currentTodayKey;
      state = storage.getStateForDate(selectedDateKey, dailyRecords);
    }

    initDate();
    render();
  }

  function bindTodayBoundaryEvents() {
    window.addEventListener("focus", refreshTodayBoundary);
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) {
        refreshTodayBoundary();
      }
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
    bindTodayBoundaryEvents();
    initCharts();
    render();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
