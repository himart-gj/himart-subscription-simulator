import type { ProductItem } from '../types/domain'

export interface ApplianceColorOption {
  name: string
  swatchClass: 'swatch-ivory' | 'swatch-beige' | 'swatch-sage' | 'swatch-silver' | 'swatch-charcoal'
}

export interface ProductEmpathyDetail {
  headline: string
  points: string[]
  recommendFor: string[]
  whyGood: string
  colors: ApplianceColorOption[]
}

const CURATED_EMPATHY_BY_ID: Record<string, ProductEmpathyDetail> = {
  'prod-fridge-bespoke': {
    headline: '주방 가구장에 딱 맞게 들어가는 대용량 키친핏 냉장고',
    points: [
      '툭 튀어나오지 않는 깔끔한 키친핏 빌트인 라인',
      'AI 인버터 절전 운전으로 24시간 전기요금 부담 절감',
      '구독 기간 내내 정기 살균케어 및 5년 무상 A/S 포함',
    ],
    recommendFor: [
      '이사·신혼 입주로 주방 인테리어 톤을 맞추고 싶은 집',
      '식재료가 많아 800L 이상 넉넉한 수납이 필요한 3~4인 가구',
      '고가 대형가전 초기 목돈 지출이 부담스러운 분',
    ],
    whyGood: '목돈 수백만 원을 한 번에 쓰지 않고 월 천원대 체감가로 주방 분위기를 바꿀 수 있어요.',
    colors: [
      { name: '에센스 화이트+베이지', swatchClass: 'swatch-beige' },
      { name: '새틴 화이트', swatchClass: 'swatch-ivory' },
      { name: '코타 차콜', swatchClass: 'swatch-charcoal' },
    ],
  },
  'prod-washtower-lg': {
    headline: '세탁부터 건조까지 손 뻗기 편한 원바디 세탁건조기',
    points: [
      '가운데 조작부 하나로 세탁기와 건조기를 한 번에 제어',
      '25kg 대용량 세탁 + 21kg 건조로 겨울 두꺼운 이불도 거뜬',
      '전문 케어 매니저의 통살균·배수필터 정기 관리 포함',
    ],
    recommendFor: [
      '건조기가 너무 높아 세탁물 꺼내기가 불편했던 분',
      '장마철·미세먼지철 빨래 널 공간이 부족한 집',
      '아이 옷과 이불 세탁이 잦아 위생 관리가 중요한 가정',
    ],
    whyGood: '세탁 후 세탁물을 옮기지 않아도 건조 코스가 자동으로 연동되어 가사 시간이 절반으로 줄어요.',
    colors: [
      { name: '네이처 베이지', swatchClass: 'swatch-beige' },
      { name: '릴리 화이트', swatchClass: 'swatch-ivory' },
      { name: '네이처 그린', swatchClass: 'swatch-sage' },
    ],
  },
  'prod-tv-qled': {
    headline: '거실을 영화관으로 바꿔주는 75형 대화면 4K QLED TV',
    points: [
      '낮에도 반사 적고 선명한 퀀텀닷 4K 화질 업스케일링',
      '스탠드형 또는 무타공·전문 벽걸이 설치 선택 가능',
      '고가 패널 수리비 걱정 없는 구독 전용 연장보증 지원',
    ],
    recommendFor: [
      '30평대 이상 거실에 걸맞은 큼직한 화면을 찾는 집',
      '주말마다 온 가족이 OTT 영화·스포츠 중계를 즐기는 분',
      '부모님 댁 오래된 TV를 선명한 대화면으로 바꿔드릴 분',
    ],
    whyGood: '대화면 TV에서 가장 걱정되는 보증기간 이후 패널 수리 부담까지 구독 보증으로 한 번에 해결돼요.',
    colors: [
      { name: '타이탄 블랙', swatchClass: 'swatch-charcoal' },
      { name: '슬림 실버 베젤', swatchClass: 'swatch-silver' },
    ],
  },
  'prod-ac-whisen': {
    headline: '거실과 안방을 동시에 식혀주는 오브제 2in1 에어컨',
    points: [
      '거실 스탠드 + 안방 벽걸이 2in1 실속 동시 구성',
      '자동 청정 건조로 여름철 내부 곰팡이·냄새 억제',
      '전문가의 열교환기 고압세척 및 필터 정기교체 케어',
    ],
    recommendFor: [
      '여름 성수기 전에 미리 설치해 대기 없이 시원하게 보낼 집',
      '에어컨 내부 곰팡이 냄새와 분해청소 비용이 신경 쓰이는 분',
      '거실과 침실 냉방을 한 번에 해결하고 싶은 입주 가구',
    ],
    whyGood: '매년 사설 업체에 맡기던 에어컨 전문 세척 케어까지 포함되어 내내 새 것처럼 쾌적해요.',
    colors: [
      { name: '카밍 베이지', swatchClass: 'swatch-beige' },
      { name: '웨딩 스노우 화이트', swatchClass: 'swatch-ivory' },
    ],
  },
  'prod-kimchi-lg': {
    headline: '김치부터 육류·쌀·야채까지 사계절 신선 보관 402L',
    points: [
      '유산균을 지키는 정온 냉각과 칸별 독립 보관 모드',
      '냉장고 옆에 나란히 두기 좋은 오브제 빌트인 디자인',
      '도어패킹 밀착 점검 및 탈취필터 정기 교체 케어',
    ],
    recommendFor: [
      '기존 냉장고만으로는 식재료·음료 수납이 늘 부족한 집',
      '김장 김치뿐 아니라 고기·밀키트·과일을 오래 두고 먹는 가정',
      '뚜껑형 김치냉장고에서 허리 펴고 꺼내는 스탠드형으로 바꿀 분',
    ],
    whyGood: '계절마다 필요한 칸을 냉동·냉장·김치 모드로 자유롭게 바꿀 수 있어 세컨드 냉장고로 최고예요.',
    colors: [
      { name: '크림 화이트', swatchClass: 'swatch-ivory' },
      { name: '클레이 베이지', swatchClass: 'swatch-beige' },
    ],
  },
  'prod-robovac-roborock': {
    headline: '먼지 비움부터 온수 물걸레 세척·건조까지 손댈 일 없는 로봇청소기',
    points: [
      '청소 후 자동 먼지 비움 + 온수 걸레 세척 + 열풍 건조 올인원',
      '더스트백·물걸레 패드 등 소모품 주기에 맞춘 정기 배송',
      '구독 기간 내 고장 걱정 덜어주는 장기 무상보증 포함',
    ],
    recommendFor: [
      '퇴근 후 청소기 돌리고 걸레 빨 기력이 없는 맞벌이 부부',
      '반려동물 털이나 아이 과자 부스러기가 매일 생기는 집',
      '180만~200만 원대 일시불 가격이 부담스러워 망설이던 분',
    ],
    whyGood: '경기광주점 단품 문의 1위 모델로, 소모품까지 챙겨 받으면서 월 커피 한 잔 값 체감가로 누릴 수 있어요.',
    colors: [
      { name: '퓨어 화이트', swatchClass: 'swatch-ivory' },
      { name: '스페이스 블랙', swatchClass: 'swatch-charcoal' },
    ],
  },
  'prod-cordless-dyson': {
    headline: '미세먼지 레이저 감지에 물청소 헤드까지 갖춘 올라운드 청소기',
    points: [
      '눈에 안 보이는 바닥 먼지를 비춰주는 일루미네이션 헤드',
      '물걸레 헤드 교체만으로 흘린 음료·찌든 바닥 물청소 해결',
      '정품 헤파필터 정기 배송 및 배터리 성능 점검 지원',
    ],
    recommendFor: [
      '로봇청소기가 못 닿는 계단·침구·창틀까지 수시로 치우는 집',
      '기존 무선청소기 배터리가 빨리 닳아 교체를 고민 중인 분',
      '가볍고 흡입력 강한 세컨드 청소기가 필요한 가정',
    ],
    whyGood: '무선청소기의 최대 단점인 필터·배터리 관리 부담을 하이마트 구독 케어로 덜어드려요.',
    colors: [
      { name: '옐로우 니켈', swatchClass: 'swatch-silver' },
      { name: '아이언 그레이', swatchClass: 'swatch-charcoal' },
    ],
  },
  'prod-ricecooker-cuckoo': {
    headline: '갓 지은 찰진 고압 밥맛과 부드러운 무압 밥맛을 한 대로',
    points: [
      '잡곡밥은 초고압으로 찰지게, 나물밥·덮밥은 무압으로 고슬하게',
      '밥맛을 좌우하는 고무 패킹·내솥 점검 케어로 늘 새 밥맛 유지',
      '36개월 실속 단기 약정으로 부담 없이 교체 가능',
    ],
    recommendFor: [
      '밥솥 코팅이 벗겨지거나 증기가 새서 밥맛이 예전 같지 않은 집',
      '잡곡밥과 흰쌀밥 취향이 다른 가족이 함께 사는 가정',
      '부담 없는 36개월 구독으로 주방 필수 가전을 바꾸고 싶은 분',
    ],
    whyGood: '구독플러스 최소 1구좌만 결합해도 기본 월 체감가가 0원으로 맞춰져 가장 가볍게 시작할 수 있어요.',
    colors: [
      { name: '매트 화이트', swatchClass: 'swatch-ivory' },
      { name: '어반 그레이지', swatchClass: 'swatch-beige' },
    ],
  },
  'prod-dishwasher-lg': {
    headline: '기름기 많은 식기도 100℃ 트루스팀으로 뽀득하게 살균 세척',
    points: [
      '4인 가족 냄비·프라이팬까지 한 번에 들어가는 14인용 대용량',
      '고온 트루스팀으로 물얼룩과 식기 유해균 깔끔 케어',
      '거름망·배수필터 정기 클리닝 및 주방 빌트인 맞춤 시공',
    ],
    recommendFor: [
      '저녁 식사 후 싱크대에 쌓인 설거지 때문에 지치는 집',
      '젖병·유아 식기 열탕 소독이 번거로운 육아 가정',
      '주방 하부장 공사까지 깔끔하게 상담받고 싶은 분',
    ],
    whyGood: '매장 전문 상담을 통해 우리 집 싱크대 규격에 맞는 빌트인·프리스탠딩 설치 여부까지 한 번에 안내해 드려요.',
    colors: [
      { name: '네이처 베이지', swatchClass: 'swatch-beige' },
      { name: '솔리드 화이트', swatchClass: 'swatch-ivory' },
    ],
  },
  'prod-airpurifier-lg': {
    headline: '360도 전 방향 청정에 사계절 온풍 기능까지 더한 청정기',
    points: [
      '거실 어느 곳에 두어도 사각지대 없이 빨아들이는 360° 흡입',
      '환절기·겨울철 실내 공기를 포근하게 데워주는 히트 온풍 모드',
      '번거로운 정품 극초미세먼지 필터 교체 주기 자동 관리',
    ],
    recommendFor: [
      '환기하기 어려운 미세먼지·꽃가루 시즌 비염이 신경 쓰이는 집',
      '아이나 반려동물이 바닥에서 자주 생활하는 가정',
      '정품 필터값과 청소 관리가 번거로워 방치해 두셨던 분',
    ],
    whyGood: '공기청정기는 제때 필터를 갈아주는 것이 핵심이라, 정기 케어가 포함된 구독과 궁합이 가장 좋은 가전이에요.',
    colors: [
      { name: '크리미 스노우', swatchClass: 'swatch-ivory' },
      { name: '클레이 브라운', swatchClass: 'swatch-beige' },
    ],
  },
}

/**
 * Resolves curated lifestyle empathy details for a product, with an automatic
 * category-aware generator so newly added Admin CMS products also look rich.
 */
export function getProductEmpathyDetail(product: ProductItem): ProductEmpathyDetail {
  const exact = CURATED_EMPATHY_BY_ID[product.id]
  if (exact) return exact

  const cat = `${product.category} ${product.name}`
  const defaultColors: ApplianceColorOption[] = [
    { name: '화이트/아이보리', swatchClass: 'swatch-ivory' },
    { name: '오브제/비스포크 베이지', swatchClass: 'swatch-beige' },
    { name: '메탈/차콜', swatchClass: 'swatch-charcoal' },
  ]

  if (cat.includes('냉장') || cat.includes('김치')) {
    return {
      headline: '넉넉한 수납과 주방 인테리어 톤을 동시에 살리는 프리미엄 냉장가전',
      points:
        product.careTags.length > 0
          ? product.careTags
          : ['정온 신선 보관 시스템', '정기 살균·패킹 케어 포함', '장기 무상 A/S 보증'],
      recommendFor: [
        '식재료 보관 공간이 부족해 대용량 교체를 고민 중인 가정',
        '초기 목돈 부담 없이 최신 빌트인 톤으로 주방을 꾸미고 싶은 분',
      ],
      whyGood: '구독플러스 현금 지원과 정기 방문케어로 초기 구매 부담과 사후 관리 걱정을 함께 덜어드려요.',
      colors: defaultColors,
    }
  }

  if (cat.includes('세탁') || cat.includes('건조') || cat.includes('워시')) {
    return {
      headline: '매일 쌓이는 빨래와 이불 세탁을 가볍게 끝내주는 세탁·건조 케어',
      points:
        product.careTags.length > 0
          ? product.careTags
          : ['대용량 살균 세탁·건조', '통살균·필터 정기 관리', '장기 무상 A/S 보증'],
      recommendFor: [
        '비 오는 날이나 겨울철 빨래 건조가 늘 스트레스인 집',
        '세탁조 위생 관리까지 전문가에게 맡기고 싶은 분',
      ],
      whyGood: '전문 케어 서비스로 눈에 보이지 않는 내부 위생까지 깔끔하게 유지하며 사용할 수 있어요.',
      colors: defaultColors,
    }
  }

  if (cat.includes('청소') || cat.includes('공기')) {
    return {
      headline: '퇴근 후 집안 청소와 실내 공기 관리를 자동으로 덜어주는 살림 효자템',
      points:
        product.careTags.length > 0
          ? product.careTags
          : ['소모품·필터 정기 케어', '강력한 미세먼지 집진', '구독 기간 무상보증 지원'],
      recommendFor: [
        '바쁜 일상 속 바닥 청소와 필터 관리 시간을 아끼고 싶은 맞벌이 가정',
        '아이·반려동물이 함께 지내 실내 위생이 중요한 집',
      ],
      whyGood: '잊기 쉬운 필터·소모품 교체까지 구독 케어로 챙겨드려 언제나 새 제품 컨디션을 유지해요.',
      colors: defaultColors.slice(0, 2),
    }
  }

  return {
    headline: `${product.brand} 인기 가전을 초기 목돈 부담 없이 시작하는 맞춤 구독`,
    points:
      product.careTags.length > 0
        ? product.careTags
        : ['롯데하이마트 공식 구독 케어', '약정 기간 연장 무상보증', '맞춤 혜택가 설계 지원'],
    recommendFor: [
      '일시불 목돈 지출 대신 월 천원대 체감가로 새 가전을 들이고 싶은 분',
      '무상 A/S 연장보증과 정기 관리를 함께 챙기고 싶은 가정',
    ],
    whyGood: '경기광주점 전담 매니저가 당월 지점 행사 혜택까지 더해 가장 유리한 조건으로 설계해 드려요.',
    colors: defaultColors.slice(0, 2),
  }
}
