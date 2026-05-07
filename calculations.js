(function () {
  const config = window.CarbonTrackerConfig;

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

  function isEmptyState(currentState) {
    return config.ITEMS.every(function (item) {
      return (
        Number(currentState[item.key] || 0) ===
        Number(config.DEFAULT_STATE[item.key] || 0)
      );
    });
  }

  function getTip(topItem, controllableCarbon, isTodaySelected) {
    const emptyContextText = isTodaySelected ? "지금은" : "이 날짜에는";
    const actionContextText = isTodaySelected ? "오늘은" : "이 날짜에는";
    const compareContextText = isTodaySelected ? "지금처럼" : "이 날짜 기록처럼";

    if (!topItem && controllableCarbon === 0) {
      return {
        title: "기본 조명은 기준 사용으로 보고 있어요",
        text: emptyContextText + " 에어컨·온풍기 사용과 쓰레기 기록이 거의 없어서 좋은 상태예요.",
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
        text: topItem.tip + " " + actionContextText + " " + topItem.label + "부터 줄여 보면 좋아요.",
      };
    }

    return {
      title: "잘 살펴보고 있어요",
      text: topItem.tip + " " + compareContextText + " 학생이 줄일 수 있는 부분을 계속 비교해 보세요.",
    };
  }

  function buildSummaryViewModel(currentState, options) {
    const safeOptions = options || {};
    const isTodaySelected = Boolean(safeOptions.isTodaySelected);
    const totalCarbon = getTotalCarbon(currentState);
    const controllableCarbon = getControllableCarbon(currentState);
    const baselineLightingCarbon = getBaselineLightingCarbon(currentState);
    const studentActionCount = getStudentActionCount(currentState);
    const topItem = getTopItem(currentState);
    const ecoLevel = getEcoLevel(controllableCarbon);
    const tip = getTip(topItem, controllableCarbon, isTodaySelected);

    return {
      summaryPanelKicker: isTodaySelected ? "오늘의 대시보드" : "선택 날짜 대시보드",
      tipPanelKicker: isTodaySelected ? "오늘의 한마디" : "선택 날짜 한마디",
      totalCountText: String(studentActionCount),
      totalCountDescription: "기본 조명은 제외하고 학생이 줄이거나 조절할 수 있는 기록만 세어요.",
      totalCarbonText: totalCarbon.toFixed(2) + " kg",
      totalCarbonDescription:
        "기본 조명 " +
        baselineLightingCarbon.toFixed(2) +
        "kg를 포함한 전체 예상 탄소예요.",
      topItemText: topItem ? topItem.label : "아직 없음",
      topItemDescription: topItem
        ? "학생이 줄일 수 있는 항목 중 " + topItem.label + "이 가장 많이 나왔어요."
        : "기본 조명은 기준 사용으로 보고 있어요. 추가 사용이나 쓰레기가 거의 없어요.",
      ecoStatusText: ecoLevel.label,
      statusDescription:
        ecoLevel.description +
        " 학생 실천 탄소는 " +
        controllableCarbon.toFixed(2) +
        "kg로 계산했어요.",
      statusClassName: ecoLevel.className,
      tipTitle: tip.title,
      tipText: tip.text,
      totalCarbon: totalCarbon,
      controllableCarbon: controllableCarbon,
      baselineLightingCarbon: baselineLightingCarbon,
      studentActionCount: studentActionCount,
      topItem: topItem,
      ecoLevel: ecoLevel,
    };
  }

  function getHistoryDescription(
    entryTopItem,
    totalCount,
    totalCarbon,
    controllableCarbon,
    isEmpty
  ) {
    if (isEmpty) {
      return "기록이 없어요. 눌러서 새로 입력할 수 있어요.";
    }

    if (entryTopItem) {
      return (
        "실천 " +
        totalCount +
        "단위 · 전체 " +
        totalCarbon.toFixed(2) +
        "kg · 주요 대상: " +
        entryTopItem.label
      );
    }

    return (
      "기본 조명 중심 · 전체 " +
      totalCarbon.toFixed(2) +
      "kg · 학생 실천 탄소 " +
      controllableCarbon.toFixed(2) +
      "kg"
    );
  }

  function buildHistoryItemViewModel(entry, selectedDateKey, formatShortDate) {
    const entryTopItem = getTopItem(entry.state);
    const totalCount = getStudentActionCount(entry.state);
    const totalCarbon = getTotalCarbon(entry.state);
    const controllableCarbon = getControllableCarbon(entry.state);
    const isEmpty = isEmptyState(entry.state);
    const isActive = entry.dateKey === selectedDateKey;

    return {
      dateKey: entry.dateKey,
      title: formatShortDate(entry.date),
      description: getHistoryDescription(
        entryTopItem,
        totalCount,
        totalCarbon,
        controllableCarbon,
        isEmpty
      ),
      valueText: isActive
        ? "선택 중"
        : isEmpty
          ? "기록 없음"
          : controllableCarbon.toFixed(2) + " kg",
      isEmpty: isEmpty,
      isActive: isActive,
      totalCarbon: totalCarbon,
      controllableCarbon: controllableCarbon,
      studentActionCount: totalCount,
      topItem: entryTopItem,
    };
  }

  function buildWeeklySummaryViewModel(recentRecords, options) {
    const safeOptions = options || {};
    const selectedDateKey = safeOptions.selectedDateKey;
    const formatShortDate = safeOptions.formatShortDate;
    const formatCompactDate = safeOptions.formatCompactDate;
    const activeRecords = recentRecords.filter(function (entry) {
      return !isEmptyState(entry.state);
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
    const orderedRecords = recentRecords.slice().reverse();

    return {
      weeklyActiveDaysText: String(activeRecords.length) + "일",
      weeklyCarbonText: weeklyCarbon.toFixed(2) + " kg",
      weeklyTopItemText: weeklyTopItem ? weeklyTopItem.label : "아직 없음",
      historyItems: recentRecords.map(function (entry) {
        return buildHistoryItemViewModel(entry, selectedDateKey, formatShortDate);
      }),
      trendLabels: orderedRecords.map(function (entry) {
        return formatCompactDate(entry.date);
      }),
      trendValues: orderedRecords.map(function (entry) {
        return Number(getControllableCarbon(entry.state).toFixed(2));
      }),
      activeDays: activeRecords.length,
      weeklyCarbon: weeklyCarbon,
      weeklyTopItem: weeklyTopItem,
    };
  }

  window.CarbonTrackerCalculations = {
    buildHistoryItemViewModel: buildHistoryItemViewModel,
    buildSummaryViewModel: buildSummaryViewModel,
    buildWeeklySummaryViewModel: buildWeeklySummaryViewModel,
    getBaselineLightingCarbon: getBaselineLightingCarbon,
    getComparableValue: getComparableValue,
    getControllableCarbon: getControllableCarbon,
    getControllableItems: getControllableItems,
    getEcoLevel: getEcoLevel,
    getItemByKey: getItemByKey,
    getStudentActionCount: getStudentActionCount,
    getTopItem: getTopItem,
    getTopItemFromRecords: getTopItemFromRecords,
    getTotalCarbon: getTotalCarbon,
    isEmptyState: isEmptyState,
  };
})();
