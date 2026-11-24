import type { ProductItem } from '../types/domain'

export interface ProductEmpathyDetail {
  headline: string
  points: string[]
  recommendFor: string[]
  whyGood: string
}

/**
 * Resolves lifestyle empathy details for all 147+ catalog items using their
 * real careTags and category context.
 */
export function getProductEmpathyDetail(product: ProductItem): ProductEmpathyDetail {
  const cat = `${product.category} ${product.name}`
  const points =
    product.careTags.length > 0
      ? product.careTags
      : ['롯데하이마트 공식 구독 케어', '총 5년 무상 A/S 연장보증', '맞춤 혜택가 설계 지원']

  if (cat.includes('김치')) {
    return {
      headline: '김장 김치부터 육류·쌀·야채까지 사계절 정온 보관하는 김치냉장고',
      points,
      recommendFor: [
        '기존 냉장고만으로는 사계절 식재료 수납이 부족한 가정',
        '완전분해 스팀세척과 5년 무상보증까지 한 번에 챙기고 싶은 분',
      ],
      whyGood: '계절마다 냉동·냉장·김치 모드로 활용하면서 전문 케어 매니저의 분해 세척까지 받을 수 있어요.',
    }
  }

  if (cat.includes('냉장') || cat.includes('냉동')) {
    return {
      headline: '넉넉한 수납과 주방 인테리어 톤을 동시에 살리는 냉장·냉동 가전',
      points,
      recommendFor: [
        '이사·입주나 노후 냉장고 교체로 목돈 지출이 부담스러운 가정',
        '냉장실 스팀 살균과 후면 기계실 세척 케어까지 맡기고 싶은 분',
      ],
      whyGood: '초기 목돈 수백만 원 부담 없이 월 천원대 추천 체감가로 주방 분위기를 바꿀 수 있어요.',
    }
  }

  if (cat.includes('세탁') || cat.includes('건조') || cat.includes('원바디') || cat.includes('워시콤보') || cat.includes('스타일러') || cat.includes('의류')) {
    return {
      headline: '매일 쌓이는 빨래·이불 세탁과 의류 위생을 가볍게 끝내는 의류케어',
      points,
      recommendFor: [
        '비 오는 날·미세먼지철 빨래 건조와 세탁조 위생이 늘 신경 쓰이는 집',
        '사설 세탁조 분해청소 비용 없이 공식 케어와 5년 보증을 받고 싶은 분',
      ],
      whyGood: '눈에 보이지 않는 세탁조·열교환기 분해 세척까지 구독 케어로 깔끔하게 관리돼요.',
    }
  }

  if (cat.includes('에어컨')) {
    return {
      headline: '거실과 안방 냉방은 물론 까다로운 열교환기 분해세척까지 포함된 에어컨',
      points,
      recommendFor: [
        '여름철 에어컨 내부 곰팡이·냄새 관리가 걱정되는 가정',
        '초기 설치 목돈 부담 없이 2in1·벽걸이 에어컨을 미리 준비하실 분',
      ],
      whyGood: '주기적인 판넬·열교환기 고압 분해세척과 총 5년 무상 A/S가 함께 제공돼요.',
    }
  }

  if (cat.includes('TV') || cat.includes('올레드') || cat.includes('QNED') || cat.includes('스탠바이미')) {
    return {
      headline: '거실과 침실을 영화관으로 바꿔주는 대화면·무빙 스마트 스크린',
      points,
      recommendFor: [
        '선명한 올레드·미니LED 대화면이나 방마다 옮겨 쓰는 스탠바이미를 찾는 분',
        '고가 디스플레이 파손보장보험과 5년 무상 연장보증을 함께 챙기고 싶은 집',
      ],
      whyGood: 'TV 구독 시 가장 걱정되는 파손·패널 수리 부담을 데미지 케어보험과 5년 보증으로 덜어드려요.',
    }
  }

  if (cat.includes('로봇') || cat.includes('청소기')) {
    return {
      headline: '퇴근 후 바닥 먼지 흡입부터 물걸레·자동 비움까지 대신해 주는 청소 가전',
      points,
      recommendFor: [
        '맞벌이·육아·반려동물로 매일 바닥 청소할 시간이 부족한 가정',
        '배터리·더스트백·물걸레 등 정품 소모품 정기배송까지 편하게 받고 싶은 분',
      ],
      whyGood: '잊기 쉬운 정품 배터리·먼지봉투·물걸레 정기배송과 5년 무상보증이 포함되어 늘 새 컨디션을 유지해요.',
    }
  }

  if (cat.includes('정수기')) {
    return {
      headline: '복잡한 생수 주문 없이 매일 깨끗한 냉·온·정수를 마시는 직수 정수기',
      points,
      recommendFor: [
        '생수 페트병 분리수거가 번거롭고 깔끔한 주방 조리대 공간을 원하는 집',
        '정품 필터 정기 교체와 내부·토출구 살균 클리닝을 함께 받고 싶은 분',
      ],
      whyGood: '주기별 필터 교체·클리닝과 5년 무상보증에 구독플러스 지원까지 더해 체감 부담을 확 낮췄어요.',
    }
  }

  if (cat.includes('인덕션') || cat.includes('전기레인지') || cat.includes('오븐') || cat.includes('밥솥') || cat.includes('커피') || cat.includes('음식물')) {
    return {
      headline: '요리와 식사 준비 시간을 줄이고 주방 위생까지 챙기는 필수 주방가전',
      points,
      recommendFor: [
        '고무패킹·필터·세척타블렛 정기배송이나 상판·추출기 전문 세척이 필요한 분',
        '36개월 실속 구독으로 최신 인덕션·밥솥·커피머신·음식물처리기를 들이실 가정',
      ],
      whyGood: '주방가전 수명을 좌우하는 정품 소모품 배송·전문 세척과 5년 무상보증이 기본 포함돼요.',
    }
  }

  if (cat.includes('비데') || cat.includes('환풍기') || cat.includes('휴젠뜨') || cat.includes('안마') || cat.includes('면도기')) {
    return {
      headline: '매일 쓰는 욕실 쾌적함과 가족 컨디션을 높여주는 홈케어·헬스가전',
      points,
      recommendFor: [
        '욕실 습기·곰팡이 제거나 비데 정품필터·면도날·발패드 정기 관리가 필요한 집',
        '부모님 효도 선물이나 우리 집 힐링 가전을 월 천원대 체감가로 시작하실 분',
      ],
      whyGood: '소모품 정기배송·분해 세척과 5년 연장보증이 결합되어 사후 유지비 걱정이 없어요.',
    }
  }

  if (cat.includes('노트북') || cat.includes('그램') || cat.includes('갤럭시') || cat.includes('서피스') || cat.includes('아이패드') || cat.includes('모니터')) {
    return {
      headline: '파손보장보험 1년과 5년 연장보증까지 든든하게 챙기는 프리미엄 IT 구독',
      points,
      recommendFor: [
        '대학생 신학기·재택근무용 최신 AI 노트북·아이패드 초기 목돈이 부담스러운 분',
        '휴대 중 액정·외관 파손에 대비해 데미지 케어보험과 장기 보증이 꼭 필요한 분',
      ],
      whyGood: '고가 IT 기기에서 가장 아까운 일시불 지출과 수리비 부담을 36개월 구독+케어보험으로 해결해요.',
    }
  }

  return {
    headline: `${product.brand} 인기 가전을 초기 목돈 부담 없이 시작하는 맞춤 구독`,
    points,
    recommendFor: [
      '일시불 목돈 지출 대신 월 천원대 체감가로 새 가전을 들이고 싶은 분',
      '5년 무상 A/S 연장보증과 정기 관리를 함께 챙기고 싶은 가정',
    ],
    whyGood: '경기광주점 전담 매니저가 당월 지점 행사 혜택까지 더해 가장 유리한 조건으로 안내해 드려요.',
  }
}
