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
      key: "baseLightingMinutes",
      label: "기본 조명",
      unit: "분",
      step: 30,
      color: "#ffd54f",
      carbonFactor: 0.0008,
      defaultValue: 360,
      affectsEcoStatus: false,
      description: "하루 수업 기준 조명 사용 시간을 기록해요. 기본값은 6시간이에요.",
      tip: "기본 조명은 수업 운영에 필요한 기준 사용으로 보고 있어요.",
    },
    {
      key: "extraElectricityMinutes",
      label: "추가 전기사용",
      unit: "분",
      step: 10,
      color: "#f08c3a",
      carbonFactor: 0.0015,
      defaultValue: 0,
      affectsEcoStatus: true,
      description: "전자칠판, 프로젝터, 선풍기처럼 추가로 쓴 전기 시간을 기록해요.",
      tip: "쉬는 시간이나 사용하지 않을 때 전자기기를 끄면 추가 전기를 줄일 수 있어요.",
    },
  ];

  const DEFAULT_STATE = ITEMS.reduce(function (acc, item) {
    acc[item.key] = item.defaultValue || 0;
    return acc;
  }, {});

  const ECO_LEVELS = [
    {
      maxCarbon: 0.8,
      label: "좋음",
      className: "good",
      description: "학생들이 조절할 수 있는 쓰레기와 추가 전기사용이 잘 관리되고 있어요.",
    },
    {
      maxCarbon: 1.8,
      label: "보통",
      className: "normal",
      description: "기본 조명은 괜찮아요. 쓰레기나 추가 전기사용을 조금 더 줄여 보면 좋아요.",
    },
    {
      maxCarbon: Number.POSITIVE_INFINITY,
      label: "주의",
      className: "alert",
      description: "추가 전기사용이나 쓰레기 발생이 많아요. 줄일 수 있는 부분을 다시 살펴보세요.",
    },
  ];

  window.CarbonTrackerConfig = {
    ITEMS: ITEMS,
    DEFAULT_STATE: DEFAULT_STATE,
    ECO_LEVELS: ECO_LEVELS,
    HISTORY_DAYS: 7,
    STORAGE_KEY: "carbon-tracker-mvp-v1",
  };
})();
