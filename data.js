(function () {
  const ITEMS = [
    {
      key: "plastic",
      label: "플라스틱",
      unit: "개",
      step: 1,
      color: "#ff8a65",
      carbonFactor: 0.12,
      description: "컵, 포장지, 비닐처럼 플라스틱 쓰레기를 기록해요.",
      tip: "플라스틱 사용을 줄이면 오래 남는 쓰레기를 줄일 수 있어요.",
    },
    {
      key: "paper",
      label: "종이",
      unit: "장",
      step: 1,
      color: "#4db6ac",
      carbonFactor: 0.05,
      description: "활동지, 메모지, 포장 종이 등을 기록해요.",
      tip: "종이는 앞뒤로 사용하면 낭비를 줄일 수 있어요.",
    },
    {
      key: "can",
      label: "캔",
      unit: "개",
      step: 1,
      color: "#7986cb",
      carbonFactor: 0.09,
      description: "음료수 캔이나 금속 용기를 기록해요.",
      tip: "캔은 분리배출하면 다시 사용할 수 있는 자원이 돼요.",
    },
    {
      key: "general",
      label: "일반쓰레기",
      unit: "개",
      step: 1,
      color: "#90a4ae",
      carbonFactor: 0.1,
      description: "분리배출이 어려운 일반쓰레기를 기록해요.",
      tip: "한 번 쓰고 버리는 물건을 줄이면 일반쓰레기도 줄어들어요.",
    },
    {
      key: "electricityMinutes",
      label: "전기사용",
      unit: "분",
      step: 10,
      color: "#ffd54f",
      carbonFactor: 0.02,
      description: "조명이나 전자기기를 사용한 시간을 10분씩 기록해요.",
      tip: "사용하지 않는 전자기기는 바로 끄는 습관이 중요해요.",
    },
  ];

  const DEFAULT_STATE = ITEMS.reduce(function (acc, item) {
    acc[item.key] = 0;
    return acc;
  }, {});

  const ECO_LEVELS = [
    {
      maxCarbon: 1.5,
      label: "좋음",
      className: "good",
      description: "오늘은 비교적 친환경적인 교실 활동을 하고 있어요.",
    },
    {
      maxCarbon: 3.5,
      label: "보통",
      className: "normal",
      description: "조금만 더 줄이면 더 친환경적인 하루가 될 수 있어요.",
    },
    {
      maxCarbon: Number.POSITIVE_INFINITY,
      label: "주의",
      className: "alert",
      description: "쓰레기와 전기 사용을 다시 살펴볼 필요가 있어요.",
    },
  ];

  const SAMPLE_RECORD_TEMPLATES = [
    {
      offsetDays: 0,
      state: {
        plastic: 2,
        paper: 4,
        can: 1,
        general: 1,
        electricityMinutes: 20,
      },
    },
    {
      offsetDays: 1,
      state: {
        plastic: 1,
        paper: 2,
        can: 0,
        general: 2,
        electricityMinutes: 30,
      },
    },
    {
      offsetDays: 2,
      state: {
        plastic: 3,
        paper: 1,
        can: 1,
        general: 0,
        electricityMinutes: 10,
      },
    },
    {
      offsetDays: 3,
      state: {
        plastic: 0,
        paper: 3,
        can: 0,
        general: 1,
        electricityMinutes: 40,
      },
    },
  ];

  window.CarbonTrackerConfig = {
    ITEMS: ITEMS,
    DEFAULT_STATE: DEFAULT_STATE,
    ECO_LEVELS: ECO_LEVELS,
    HISTORY_DAYS: 7,
    SAMPLE_RECORD_TEMPLATES: SAMPLE_RECORD_TEMPLATES,
    STORAGE_KEY: "carbon-tracker-mvp-v1",
  };
})();
