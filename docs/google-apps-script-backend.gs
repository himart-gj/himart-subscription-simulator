// =========================================================================
// [롯데하이마트 경기광주점] 구독 × 라이프케어 시뮬레이터 보안 백엔드 (V1.2 하드닝 판)
// =========================================================================
// [V1.2 주요 보안 패치 내역]
// 1. TEMP_PLAIN_PASSWORD 소스 상수 완전 제거 → 스크립트 속성 일회성 주입 후 자동 소각(버전 기록 평문 노출 원천 차단)
// 2. submitLead 단시간 중복·도배 방지: CacheService 기반 연락처 SHA-256 해시 3분(180초) 쿨다운 + 분당 전역 버스트 상한(15건)
// 3. 관리자 Lockout DoS 완화: 클라이언트 인스턴스별 실패 버킷 분리 + 점진적 지연(Tarpit) + 비상 잠금해제 PIN(ADMIN_UNLOCK_HASH) 우회 복구
// 4. 에러 응답 캡슐화: 내부 예외/스택 트레이스/시트 ID 노출 완전 차단(Stackdriver 내부 로깅 + requestId 반환)
// 5. 수식 인젝션 방어 강화: 전각 기호(＝＋－＠｜), 탭/개행, 다중행 수식 시작 완벽 이스케이프
// =========================================================================

const SESSION_TTL_SECONDS = 3600;          // 관리자 세션 만료: 1시간 (활동 시 슬라이딩 연장)
const LOCKOUT_TTL_SECONDS = 600;           // 오입력 잠금 유지: 10분
const MAX_CLIENT_LOGIN_ATTEMPTS = 5;       // 개별 기기(세션 버킷)당 허용 오입력 횟수
const MAX_GLOBAL_LOGIN_ATTEMPTS = 20;      // 전역 무차별 대입 방어 임계치 (10분 기준)
const LEAD_COOLDOWN_SECONDS = 180;         // 동일 연락처 재접수 쿨다운: 3분(180초)
const LEAD_GLOBAL_BURST_PER_MIN = 15;      // 분당 전체 상담 접수 최대 허용 건수 (스팸 폭탄 방어)
const NOTIFY_EMAIL = "";                   // 필요 시 알림 수신 이메일 입력 (미사용 시 빈 문자열 유지)

/**
 * [최초 1회 실행 1] 분리된 2개 구글 시트(마스터 카탈로그 DB / 비공개 고객 상담 DB) 자동 생성
 * 이미 CATALOG_SHEET_ID와 LEADS_SHEET_ID가 스크립트 속성에 존재하면 안전하게 건너뜁니다.
 */
function initSetupOnce() {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty("CATALOG_SHEET_ID") && props.getProperty("LEADS_SHEET_ID")) {
    Logger.log("이미 초기 시트 세팅이 완료되어 있습니다. 중복 생성을 건너뜁니다.");
    return;
  }

  const catalogSs = SpreadsheetApp.create("[하이마트 경기광주점] 구독시뮬레이터_상품정책_마스터DB");
  const productsSheet = catalogSs.getSheets()[0];
  productsSheet.setName("Products");
  const setsSheet = catalogSs.insertSheet("Sets");
  const policySheet = catalogSs.insertSheet("Policy");

  productsSheet.appendRow([
    "id", "category", "brand", "name", "modelName", "imageUrl",
    "price36", "price60", "careTagsJson", "isVisible", "updatedAt"
  ]);
  productsSheet.setFrozenRows(1);

  setsSheet.appendRow([
    "id", "setCategory", "name", "description", "badge",
    "defaultTerm", "itemsJson", "sortOrder", "isVisible", "updatedAt"
  ]);
  setsSheet.setFrozenRows(1);

  policySheet.appendRow(["key", "value", "description"]);
  policySheet.setFrozenRows(1);

  const defaultPolicies = [
    ["freed_40k_cashback_36", 20000, "구독플러스 72 (월 4만원) 36개월 시 월 현금캐시백"],
    ["freed_50k_cashback_36", 25000, "구독플러스 90 (월 5만원) 36개월 시 월 현금캐시백"],
    ["freed_60k_cashback_36", 30000, "구독플러스 108 (월 6만원) 36개월 시 월 현금캐시백"],
    ["freed_40k_cashback_60", 12000, "구독플러스 72 (월 4만원) 60개월 시 월 현금캐시백"],
    ["freed_50k_cashback_60", 15000, "구독플러스 90 (월 5만원) 60개월 시 월 현금캐시백"],
    ["freed_60k_cashback_60", 18000, "구독플러스 108 (월 6만원) 60개월 시 월 현금캐시백"],
    ["freed_max_accounts", 12, "1인당 최대 중복 가입 가능 구좌수"],
    ["freed_pay_months", 90, "상조회비 실제 납입 회차"],
    ["freed_defer_months", 30, "상조회비 0원 거치 회차"],
    ["freed_maturity_months", 120, "만기 100% 환급 기준 총 회차"],
    ["card_min_spend", 300000, "Hi-Class 롯데카드 전월 실적 기준 금액"],
    ["card_monthly_cashback", 18000, "Hi-Class 롯데카드 월 캐시백 금액"],
    ["policy_updated_date", Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd"), "정책 기준일자"]
  ];
  policySheet.getRange(2, 1, defaultPolicies.length, 3).setValues(defaultPolicies);

  const leadsSs = SpreadsheetApp.create("[비공개/열람주의] 하이마트 경기광주점_구독상담_고객DB");
  const leadsSheet = leadsSs.getSheets()[0];
  leadsSheet.setName("Leads");
  leadsSheet.appendRow([
    "접수일시(KST)", "고객성함", "연락처", "희망상담방식", "구독모드",
    "선택품목내역", "구독프리드구좌구성", "카드실적충족여부",
    "1~36개월_월체감결과", "37~60개월_월체감결과", "120회만기환급원금",
    "필수고지동의", "고객요청메모", "상담상태"
  ]);
  leadsSheet.setFrozenRows(1);
  leadsSheet.getRange("A:N").setNumberFormat("@");

  props.setProperties({
    CATALOG_SHEET_ID: catalogSs.getId(),
    LEADS_SHEET_ID: leadsSs.getId()
  });

  Logger.log("분리형 시트 2종 초기 생성 및 스크립트 속성 저장이 완료되었습니다.");
}

/**
 * [비밀번호 / 비상 잠금해제 PIN 무흔적 등록 함수]
 * 코드에 평문(TEMP_PLAIN_PASSWORD)을 적지 마세요! (버전 기록 노출 방지)
 * 1. [프로젝트 설정 > 스크립트 속성]에서 아래 일회성 키를 추가 후 저장:
 *    - INIT_ADMIN_PASSWORD_ONCE : 새 관리자 비밀번호 (8자 이상)
 *    - INIT_UNLOCK_PIN_ONCE     : (선택·권장) 외부인 오입력 잠금 시 우회할 관리자 비상 PIN (6자 이상)
 * 2. 편집기에서 registerAdminPassword 함수를 1회 실행하면,
 *    SHA-256 + Salt 해시로 변환 저장한 뒤 평문 속성(INIT_*_ONCE)을 즉시 자동 삭제합니다!
 * (기존에 등록된 ADMIN_SALT / ADMIN_PW_HASH는 그대로 유지·호환됩니다.)
 */
function registerAdminPassword() {
  const props = PropertiesService.getScriptProperties();
  const plainPw = String(props.getProperty("INIT_ADMIN_PASSWORD_ONCE") || "").trim();
  const plainUnlockPin = String(props.getProperty("INIT_UNLOCK_PIN_ONCE") || "").trim();

  if (!plainPw && !plainUnlockPin) {
    throw new Error(
      "[프로젝트 설정 > 스크립트 속성]에 INIT_ADMIN_PASSWORD_ONCE(8자 이상) 또는 INIT_UNLOCK_PIN_ONCE(6자 이상)를 추가한 뒤 실행해 주세요."
    );
  }

  let salt = props.getProperty("ADMIN_SALT");
  if (!salt) {
    salt = Utilities.getUuid() + "-" + Utilities.getUuid();
  }

  const updates = { ADMIN_SALT: salt };

  if (plainPw) {
    if (plainPw.length < 8) {
      props.deleteProperty("INIT_ADMIN_PASSWORD_ONCE");
      throw new Error("관리자 비밀번호는 최소 8자리 이상이어야 합니다.");
    }
    updates.ADMIN_PW_HASH = sha256Hex_(salt + ":" + plainPw);
  }

  if (plainUnlockPin) {
    if (plainUnlockPin.length < 6) {
      props.deleteProperty("INIT_UNLOCK_PIN_ONCE");
      throw new Error("비상 잠금해제 PIN은 최소 6자리 이상이어야 합니다.");
    }
    updates.ADMIN_UNLOCK_HASH = sha256Hex_(salt + ":UNLOCK:" + plainUnlockPin);
  }

  props.setProperties(updates);
  // 평문 일회성 속성 즉시 영구 삭제 (Zero Plaintext Retention)
  props.deleteProperty("INIT_ADMIN_PASSWORD_ONCE");
  props.deleteProperty("INIT_UNLOCK_PIN_ONCE");

  const cache = CacheService.getScriptCache();
  cache.remove("LOGIN_FAIL_COUNT");
  cache.remove("LOGIN_FAIL_GLOBAL");

  Logger.log("관리자 인증 해시 저장 및 일회성 평문 속성 자동 소각이 완료되었습니다.");
}

/**
 * 공개 카탈로그 조회 전용 (GET) — 고객 상담 시트(LEADS_SHEET_ID) 접근 코드 자체가 없음
 */
function doGet(e) {
  const requestId = Utilities.getUuid().slice(0, 8);
  try {
    const action = (e && e.parameter && e.parameter.action) ? String(e.parameter.action) : "getCatalog";
    if (action === "getCatalog") {
      return jsonResponse_({ ok: true, data: readCatalogData_(false) });
    }
    return jsonResponse_({ ok: false, code: "UNSUPPORTED_ACTION", error: "허용되지 않은 조회 요청입니다." });
  } catch (err) {
    logServerError_("doGet", requestId, err);
    return jsonResponse_({
      ok: false,
      code: "SERVER_ERROR",
      requestId: requestId,
      error: "상품 정보를 불러오는 중 일시적인 오류가 발생했습니다."
    });
  }
}

/**
 * 고객 상담 Write-Only 접수 및 관리자 인증·카탈로그 수정 (POST)
 */
function doPost(e) {
  const requestId = Utilities.getUuid().slice(0, 8);
  try {
    if (!e || !e.postData || typeof e.postData.contents !== "string") {
      return jsonResponse_({ ok: false, code: "BAD_REQUEST", error: "잘못된 요청 형식입니다." });
    }

    // 과도한 대용량 페이로드 DoS 방어 (512KB 상한)
    if (e.postData.contents.length > 524288) {
      return jsonResponse_({ ok: false, code: "PAYLOAD_TOO_LARGE", error: "요청 데이터 크기가 허용 범위를 초과했습니다." });
    }

    const body = safeJsonParse_(e.postData.contents, null);
    if (!body || typeof body !== "object") {
      return jsonResponse_({ ok: false, code: "INVALID_JSON", error: "요청 데이터를 해석할 수 없습니다." });
    }

    const action = String(body.action || "");
    const payload = (body.payload && typeof body.payload === "object") ? body.payload : {};
    const token = String(body.token || "");

    if (action === "submitLead") {
      return handleSubmitLead_(payload);
    }

    if (action === "adminLogin") {
      return handleAdminLogin_(payload);
    }

    if (action === "adminLogout") {
      if (token && token.length >= 20 && token.length <= 128) {
        CacheService.getScriptCache().remove("ADMIN_SESSION_" + token);
      }
      return jsonResponse_({ ok: true });
    }

    if (!verifyAdminToken_(token)) {
      return jsonResponse_({
        ok: false,
        code: "UNAUTHORIZED",
        error: "관리자 인증이 만료되었거나 유효하지 않습니다. 다시 로그인해 주세요."
      });
    }

    if (action === "adminGetCatalog") {
      return jsonResponse_({ ok: true, data: readCatalogData_(true) });
    }
    if (action === "saveProduct") {
      return handleSaveProduct_(payload);
    }
    if (action === "deleteProduct") {
      return handleDeleteRowById_("Products", payload.id);
    }
    if (action === "saveSet") {
      return handleSaveSet_(payload);
    }
    if (action === "deleteSet") {
      return handleDeleteRowById_("Sets", payload.id);
    }
    if (action === "savePolicy") {
      return handleSavePolicy_(payload);
    }
    if (action === "bulkSyncCatalog") {
      return handleBulkSyncCatalog_(payload);
    }

    return jsonResponse_({ ok: false, code: "UNSUPPORTED_ACTION", error: "지원하지 않는 작업 요청입니다." });
  } catch (err) {
    logServerError_("doPost", requestId, err);
    return jsonResponse_({
      ok: false,
      code: "SERVER_ERROR",
      requestId: requestId,
      error: "요청 처리 중 일시적인 서버 오류가 발생했습니다."
    });
  }
}

/**
 * 고객 상담 Write-Only 접수 + CacheService 기반 연락처 해시 쿨다운(3분) & 분당 전역 도배 차단
 */
function handleSubmitLead_(payload) {
  // 1. 숨김 허니팟 필드 봇 트랩 (성공처럼 응답하고 조용히 폐기)
  if (payload.honeypot && String(payload.honeypot).trim() !== "") {
    return jsonResponse_({ ok: true });
  }

  const name = sanitizeCell_(payload.name || payload.customerName, 40);
  const rawPhone = String(payload.phone || payload.customerPhone || "").replace(/[^0-9-]/g, "").slice(0, 20);
  const phoneDigits = rawPhone.replace(/\D/g, "");
  const agreed =
    payload.agreedToTerms === true ||
    payload.agreedLegalAndPrivacy === true ||
    payload.agreeAll === true;

  if (!name || name.length < 2 || phoneDigits.length < 9 || phoneDigits.length > 11) {
    return jsonResponse_({ ok: false, code: "VALIDATION_ERROR", error: "성함과 정확한 연락처를 입력해 주세요." });
  }
  if (!agreed) {
    return jsonResponse_({ ok: false, code: "CONSENT_REQUIRED", error: "필수 고지사항 및 개인정보 수집·이용에 동의해 주세요." });
  }

  // 2. CacheService 기반 단시간 도배/중복 접수 차단 (연락처 평문 대신 Salted SHA-256 해시 키 사용)
  const props = PropertiesService.getScriptProperties();
  const salt = props.getProperty("ADMIN_SALT") || "HIMART_GJ_DEFAULT_PEPPER";
  const cache = CacheService.getScriptCache();

  const phoneCooldownKey = "LEAD_CD_" + sha256Hex_("LEAD:" + salt + ":" + phoneDigits).slice(0, 32);
  if (cache.get(phoneCooldownKey)) {
    return jsonResponse_({
      ok: false,
      code: "RATE_LIMITED",
      error: "이미 최근에 상담 신청이 접수되었습니다. 3분 후 다시 시도해 주세요."
    });
  }

  // 분당 전역 버스트 제한 (무작위 번호 대량 스팸 공격 및 이메일 쿼터 고갈 방어)
  const minuteBucket = Math.floor(Date.now() / 60000);
  const burstKey = "LEAD_BURST_" + minuteBucket;
  const currentBurst = Number(cache.get(burstKey) || "0");
  if (currentBurst >= LEAD_GLOBAL_BURST_PER_MIN) {
    return jsonResponse_({
      ok: false,
      code: "RATE_LIMITED",
      error: "현재 상담 접수가 일시적으로 집중되고 있습니다. 1분 후 다시 시도해 주세요."
    });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    // Lock 획득 후 재검증(Double-checked locking)으로 동시 따닥 요청 완벽 차단
    if (cache.get(phoneCooldownKey)) {
      return jsonResponse_({
        ok: false,
        code: "RATE_LIMITED",
        error: "이미 상담 신청이 접수되었습니다. 잠시 후 다시 확인해 주세요."
      });
    }

    const leadsSheetId = props.getProperty("LEADS_SHEET_ID");
    if (!leadsSheetId) throw new Error("LEADS_SHEET_NOT_CONFIGURED");

    const sheet = SpreadsheetApp.openById(leadsSheetId).getSheetByName("Leads");
    if (!sheet) throw new Error("LEADS_TAB_MISSING");

    const kstNow = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd HH:mm:ss");
    const contactMethod = sanitizeCell_(
      payload.contactMethod || payload.consultChannel || payload.channel || "전화 상담",
      30
    );
    const modeSummary = sanitizeCell_(payload.modeSummary || payload.mode || "-", 40);
    const itemsSummary = sanitizeCell_(payload.itemsSummary || payload.cartSummary || "-", 1000);
    const freedSummary = sanitizeCell_(payload.freedSummary || payload.lifeCareSummary || "-", 200);
    const cardStatusSummary = sanitizeCell_(payload.cardStatusSummary || payload.cardSummary || "-", 120);
    const period1Summary = sanitizeCell_(payload.period1Summary || payload.phaseASummary || "-", 150);
    const period2Summary = sanitizeCell_(payload.period2Summary || payload.phaseBSummary || "해당 없음", 150);
    const maturityRefundSummary = sanitizeCell_(
      payload.maturityRefundSummary !== undefined
        ? payload.maturityRefundSummary
        : (payload.maturityRefundTotal ? Number(payload.maturityRefundTotal).toLocaleString() + "원" : "미선택 (0원)"),
      100
    );
    const memoText = sanitizeCell_(payload.memo || payload.note || "", 500);

    const rowData = [
      kstNow,
      name,
      sanitizeCell_(rawPhone, 20),
      contactMethod,
      modeSummary,
      itemsSummary,
      freedSummary,
      cardStatusSummary,
      period1Summary,
      period2Summary,
      maturityRefundSummary,
      "동의완료",
      memoText,
      "신규접수"
    ];

    sheet.appendRow(rowData);
    const lastRow = sheet.getLastRow();
    sheet.getRange(lastRow, 1, 1, rowData.length).setNumberFormat("@");

    // 성공 기록 직후 3분 연락처 쿨다운 + 분당 전역 버스트 카운터 갱신
    cache.put(phoneCooldownKey, "1", LEAD_COOLDOWN_SECONDS);
    cache.put(burstKey, String(currentBurst + 1), 90);

    if (NOTIFY_EMAIL) {
      MailApp.sendEmail({
        to: NOTIFY_EMAIL,
        subject: "[하이마트 경기광주점] 신규 구독×라이프케어 상담 접수",
        body:
          "접수일시: " + kstNow +
          "\n고객성함: " + name +
          "\n희망상담방식: " + contactMethod +
          "\n선택품목: " + itemsSummary +
          "\n\n※ 개인정보 보호를 위해 상세 연락처는 비공개 고객 상담 구글 시트에서만 확인하실 수 있습니다."
      });
    }

    return jsonResponse_({ ok: true, message: "맞춤 견적 및 상담 신청이 안전하게 접수되었습니다." });
  } finally {
    lock.releaseLock();
  }
}

/**
 * 관리자 인증 + 외부인 고의 오입력 Lockout DoS 완화 아키텍처
 * - 1계층: clientInstanceId 해시 버킷별 5회 제한 (외부인 1명의 오입력이 관리자 기기를 잠그지 않음)
 * - 2계층: 오입력 시 점진적 지연(Progressive Tarpit 800ms~2,800ms)으로 고속 대입 공격 억제
 * - 3계층: 전역 폭주(10분 20회 이상) 시에도 진짜 관리자는 ADMIN_UNLOCK_HASH(비상 PIN)로 즉시 우회 로그인 가능
 */
function handleAdminLogin_(payload) {
  const props = PropertiesService.getScriptProperties();
  const savedSalt = props.getProperty("ADMIN_SALT");
  const savedHash = props.getProperty("ADMIN_PW_HASH");
  const savedUnlockHash = props.getProperty("ADMIN_UNLOCK_HASH") || "";

  if (!savedSalt || !savedHash) {
    return jsonResponse_({
      ok: false,
      code: "AUTH_NOT_CONFIGURED",
      error: "서버에 관리자 비밀번호가 아직 초기 등록되지 않았습니다."
    });
  }

  const cache = CacheService.getScriptCache();
  const rawClientId = String(payload.clientInstanceId || "anon").slice(0, 100);
  const clientBucketKey =
    "LOGIN_FAIL_C_" + sha256Hex_(savedSalt + ":CID:" + rawClientId).slice(0, 24);
  const globalFailKey = "LOGIN_FAIL_GLOBAL";

  const clientFails = Number(cache.get(clientBucketKey) || "0");
  const globalFails = Number(cache.get(globalFailKey) || "0");

  const inputPw = String(payload.password || "");
  const inputUnlock = String(payload.unlockCode || "").trim();

  // 비상 잠금해제 PIN 검증 여부 판별 (스크립트 속성에 ADMIN_UNLOCK_HASH가 등록되어 있을 때 동작)
  const unlockValid =
    Boolean(savedUnlockHash) &&
    Boolean(inputUnlock) &&
    timingSafeEqual_(sha256Hex_(savedSalt + ":UNLOCK:" + inputUnlock), savedUnlockHash);

  const isLocked =
    clientFails >= MAX_CLIENT_LOGIN_ATTEMPTS || globalFails >= MAX_GLOBAL_LOGIN_ATTEMPTS;

  if (isLocked && !unlockValid) {
    Utilities.sleep(1500);
    return jsonResponse_({
      ok: false,
      code: "LOCKED_OUT",
      error: savedUnlockHash
        ? "오입력 보호 잠금이 작동 중입니다. 관리자 비상 잠금해제 PIN을 함께 입력하거나 10분 후 시도해 주세요."
        : "비밀번호 입력 오류 횟수 초과로 보호 잠금이 작동 중입니다. 10분 후 다시 시도해 주세요."
    });
  }

  const inputHash = sha256Hex_(savedSalt + ":" + inputPw);
  if (!timingSafeEqual_(inputHash, savedHash)) {
    const nextClientFails = clientFails + 1;
    const nextGlobalFails = globalFails + 1;
    cache.put(clientBucketKey, String(nextClientFails), LOCKOUT_TTL_SECONDS);
    cache.put(globalFailKey, String(nextGlobalFails), LOCKOUT_TTL_SECONDS);

    // 점진적 지연(Progressive Tarpit) 부과 및 남은 횟수 오라클 제거
    Utilities.sleep(Math.min(2800, nextClientFails * 700));

    if (nextClientFails >= MAX_CLIENT_LOGIN_ATTEMPTS || nextGlobalFails >= MAX_GLOBAL_LOGIN_ATTEMPTS) {
      return jsonResponse_({
        ok: false,
        code: "LOCKED_OUT",
        error: savedUnlockHash
          ? "연속 오입력으로 보호 잠금이 활성화되었습니다. 관리자 비상 잠금해제 PIN을 함께 입력해 주세요."
          : "연속 오입력으로 10분간 로그인이 제한됩니다."
      });
    }

    return jsonResponse_({
      ok: false,
      code: "INVALID_CREDENTIALS",
      error: "비밀번호가 일치하지 않습니다."
    });
  }

  // 정상 인증 성공 시 해당 기기 버킷 및(비상 PIN 동반 시) 전역 잠금 카운터 초기화
  cache.remove(clientBucketKey);
  if (unlockValid) {
    cache.remove(globalFailKey);
  }

  const sessionToken = Utilities.getUuid() + "-" + Utilities.getUuid();
  cache.put("ADMIN_SESSION_" + sessionToken, "VALID", SESSION_TTL_SECONDS);

  return jsonResponse_({
    ok: true,
    token: sessionToken,
    expiresInSeconds: SESSION_TTL_SECONDS
  });
}

function readCatalogData_(includeHidden) {
  const catalogId = PropertiesService.getScriptProperties().getProperty("CATALOG_SHEET_ID");
  if (!catalogId) throw new Error("CATALOG_SHEET_NOT_CONFIGURED");
  const ss = SpreadsheetApp.openById(catalogId);

  const pSheet = ss.getSheetByName("Products");
  const pValues = pSheet ? pSheet.getDataRange().getValues() : [];
  const products = [];
  for (let i = 1; i < pValues.length; i++) {
    const r = pValues[i];
    if (!r[0]) continue;
    const isVisible = r[9] === true || String(r[9]).toUpperCase() === "TRUE";
    if (!includeHidden && !isVisible) continue;
    products.push({
      id: String(r[0]),
      category: String(r[1] || ""),
      brand: String(r[2] || ""),
      name: String(r[3] || ""),
      modelName: String(r[4] || ""),
      imageUrl: sanitizeUrl_(r[5]),
      price36: Number(r[6] || 0),
      price60: Number(r[7] || 0),
      careTags: safeJsonParse_(r[8], []),
      isVisible: isVisible,
      updatedAt: String(r[10] || "")
    });
  }

  const sSheet = ss.getSheetByName("Sets");
  const sValues = sSheet ? sSheet.getDataRange().getValues() : [];
  const sets = [];
  for (let i = 1; i < sValues.length; i++) {
    const r = sValues[i];
    if (!r[0]) continue;
    const isVisible = r[8] === true || String(r[8]).toUpperCase() === "TRUE";
    if (!includeHidden && !isVisible) continue;
    sets.push({
      id: String(r[0]),
      setCategory: String(r[1] || "혼합"),
      name: String(r[2] || ""),
      description: String(r[3] || ""),
      badge: String(r[4] || ""),
      defaultTerm: Number(r[5]) === 36 ? 36 : 60,
      items: safeJsonParse_(r[6], []),
      sortOrder: Number(r[7] || i),
      isVisible: isVisible,
      updatedAt: String(r[9] || "")
    });
  }
  sets.sort(function(a, b) { return a.sortOrder - b.sortOrder; });

  const polSheet = ss.getSheetByName("Policy");
  const polValues = polSheet ? polSheet.getDataRange().getValues() : [];
  const policy = {};
  for (let i = 1; i < polValues.length; i++) {
    const k = String(polValues[i][0] || "").trim();
    if (!k) continue;
    const rawVal = polValues[i][1];
    policy[k] = (rawVal !== "" && !isNaN(Number(rawVal))) ? Number(rawVal) : String(rawVal);
  }

  return { products: products, sets: sets, policy: policy };
}

function handleSaveProduct_(item) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty("CATALOG_SHEET_ID"));
    const sheet = ss.getSheetByName("Products");
    const id = sanitizeCell_(item.id || ("prod_" + new Date().getTime()), 50);
    const nowIso = new Date().toISOString();
    const safeTags = Array.isArray(item.careTags)
      ? item.careTags.slice(0, 10).map(function(t) { return sanitizeCell_(t, 40); }).filter(Boolean)
      : [];

    const row = [
      id,
      sanitizeCell_(item.category, 60),
      sanitizeCell_(item.brand, 50),
      sanitizeCell_(item.name, 120),
      sanitizeCell_(item.modelName, 80),
      sanitizeUrl_(item.imageUrl),
      Math.max(0, Math.round(Number(item.price36 || 0))),
      Math.max(0, Math.round(Number(item.price60 || 0))),
      JSON.stringify(safeTags),
      item.isVisible !== false,
      nowIso
    ];

    upsertRowById_(sheet, id, row);
    return jsonResponse_({ ok: true, id: id, data: readCatalogData_(true) });
  } finally {
    lock.releaseLock();
  }
}

function handleSaveSet_(setObj) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty("CATALOG_SHEET_ID"));
    const sheet = ss.getSheetByName("Sets");
    const id = sanitizeCell_(setObj.id || ("set_" + new Date().getTime()), 50);
    const nowIso = new Date().toISOString();
    const safeItems = Array.isArray(setObj.items)
      ? setObj.items.slice(0, 20).map(function(it) {
          return {
            productId: sanitizeCell_(it.productId, 60),
            term: Number(it.term) === 36 ? 36 : 60,
            qty: Math.max(1, Math.min(20, Math.round(Number(it.qty || 1))))
          };
        })
      : [];

    const row = [
      id,
      sanitizeCell_(setObj.setCategory || "혼합", 30),
      sanitizeCell_(setObj.name, 120),
      sanitizeCell_(setObj.description, 250),
      sanitizeCell_(setObj.badge || "", 40),
      Number(setObj.defaultTerm) === 36 ? 36 : 60,
      JSON.stringify(safeItems),
      Number(setObj.sortOrder || 99),
      setObj.isVisible !== false,
      nowIso
    ];

    upsertRowById_(sheet, id, row);
    return jsonResponse_({ ok: true, id: id, data: readCatalogData_(true) });
  } finally {
    lock.releaseLock();
  }
}

function handleSavePolicy_(policyObj) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty("CATALOG_SHEET_ID"));
    savePolicyInternal_(ss, policyObj);
    return jsonResponse_({ ok: true, data: readCatalogData_(true) });
  } finally {
    lock.releaseLock();
  }
}

function savePolicyInternal_(ss, policyObj) {
  const ALLOWED_POLICY_KEYS = {
    freed_40k_cashback_36: true,
    freed_50k_cashback_36: true,
    freed_60k_cashback_36: true,
    freed_40k_cashback_60: true,
    freed_50k_cashback_60: true,
    freed_60k_cashback_60: true,
    freed_max_accounts: true,
    freed_pay_months: true,
    freed_defer_months: true,
    freed_maturity_months: true,
    card_min_spend: true,
    card_monthly_cashback: true,
    policy_updated_date: true
  };

  const sheet = ss.getSheetByName("Policy");
  const values = sheet.getDataRange().getValues();
  const keyRowMap = {};

  for (let i = 1; i < values.length; i++) {
    const k = String(values[i][0] || "").trim();
    if (k) keyRowMap[k] = i + 1;
  }

  Object.keys(policyObj || {}).forEach(function(k) {
    const safeKey = sanitizeCell_(k, 60);
    if (!ALLOWED_POLICY_KEYS[safeKey]) return;

    const val = policyObj[k];
    const safeVal = (typeof val === "number" || (!isNaN(Number(val)) && String(val).trim() !== ""))
      ? Math.max(0, Math.round(Number(val)))
      : sanitizeCell_(val, 100);

    if (keyRowMap[safeKey]) {
      sheet.getRange(keyRowMap[safeKey], 2).setValue(safeVal);
    } else {
      sheet.appendRow([safeKey, safeVal, "정책 항목"]);
    }
  });
}

function handleBulkSyncCatalog_(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty("CATALOG_SHEET_ID"));
    const nowIso = new Date().toISOString();

    if (Array.isArray(payload.products)) {
      const pSheet = ss.getSheetByName("Products");
      if (pSheet.getLastRow() > 1) {
        pSheet.getRange(2, 1, pSheet.getLastRow() - 1, 11).clearContent();
      }
      if (payload.products.length > 0) {
        const pRows = payload.products.slice(0, 200).map(function(p, idx) {
          const safeTags = Array.isArray(p.careTags)
            ? p.careTags.slice(0, 10).map(function(t) { return sanitizeCell_(t, 40); }).filter(Boolean)
            : [];
          return [
            sanitizeCell_(p.id || ("prod_" + idx), 50),
            sanitizeCell_(p.category, 60),
            sanitizeCell_(p.brand, 50),
            sanitizeCell_(p.name, 120),
            sanitizeCell_(p.modelName, 80),
            sanitizeUrl_(p.imageUrl),
            Math.max(0, Math.round(Number(p.price36 || 0))),
            Math.max(0, Math.round(Number(p.price60 || 0))),
            JSON.stringify(safeTags),
            p.isVisible !== false,
            nowIso
          ];
        });
        pSheet.getRange(2, 1, pRows.length, 11).setValues(pRows);
      }
    }

    if (Array.isArray(payload.sets)) {
      const sSheet = ss.getSheetByName("Sets");
      if (sSheet.getLastRow() > 1) {
        sSheet.getRange(2, 1, sSheet.getLastRow() - 1, 10).clearContent();
      }
      if (payload.sets.length > 0) {
        const sRows = payload.sets.slice(0, 50).map(function(s, idx) {
          const safeItems = Array.isArray(s.items)
            ? s.items.slice(0, 20).map(function(it) {
                return {
                  productId: sanitizeCell_(it.productId, 60),
                  term: Number(it.term) === 36 ? 36 : 60,
                  qty: Math.max(1, Math.min(20, Math.round(Number(it.qty || 1))))
                };
              })
            : [];
          return [
            sanitizeCell_(s.id || ("set_" + idx), 50),
            sanitizeCell_(s.setCategory || "혼합", 30),
            sanitizeCell_(s.name, 120),
            sanitizeCell_(s.description, 250),
            sanitizeCell_(s.badge || "", 40),
            Number(s.defaultTerm) === 36 ? 36 : 60,
            JSON.stringify(safeItems),
            Number(s.sortOrder || (idx + 1)),
            s.isVisible !== false,
            nowIso
          ];
        });
        sSheet.getRange(2, 1, sRows.length, 10).setValues(sRows);
      }
    }

    if (payload.policy && typeof payload.policy === "object") {
      savePolicyInternal_(ss, payload.policy);
    }

    return jsonResponse_({ ok: true, data: readCatalogData_(true) });
  } finally {
    lock.releaseLock();
  }
}

function handleDeleteRowById_(sheetName, id) {
  if (sheetName !== "Products" && sheetName !== "Sets") {
    return jsonResponse_({ ok: false, code: "FORBIDDEN", error: "허용되지 않은 대상입니다." });
  }
  const cleanId = String(id || "").trim();
  if (!cleanId) return jsonResponse_({ ok: false, code: "VALIDATION_ERROR", error: "삭제할 항목 ID가 없습니다." });

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty("CATALOG_SHEET_ID"));
    const sheet = ss.getSheetByName(sheetName);
    const values = sheet.getDataRange().getValues();
    for (let i = values.length - 1; i >= 1; i--) {
      if (String(values[i][0]) === cleanId) {
        sheet.deleteRow(i + 1);
        break;
      }
    }
    return jsonResponse_({ ok: true, data: readCatalogData_(true) });
  } finally {
    lock.releaseLock();
  }
}

function upsertRowById_(sheet, id, rowArray) {
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(id)) {
      sheet.getRange(i + 1, 1, 1, rowArray.length).setValues([rowArray]);
      return;
    }
  }
  sheet.appendRow(rowArray);
}

function verifyAdminToken_(token) {
  if (!token || typeof token !== "string" || token.length < 20 || token.length > 128) return false;
  const cache = CacheService.getScriptCache();
  const key = "ADMIN_SESSION_" + token;
  if (cache.get(key) === "VALID") {
    cache.put(key, "VALID", SESSION_TTL_SECONDS);
    return true;
  }
  return false;
}

function sha256Hex_(input) {
  const raw = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    input,
    Utilities.Charset.UTF_8
  );
  return raw
    .map(function(b) {
      return ("0" + ((b < 0 ? b + 256 : b) & 0xff).toString(16)).slice(-2);
    })
    .join("");
}

function timingSafeEqual_(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function sanitizeCell_(val, maxLen) {
  if (val === null || val === undefined) return "";
  let str = String(val)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[<>]/g, "")
    .trim();
  if (maxLen && str.length > maxLen) str = str.slice(0, maxLen);

  // 다중행 메모 내 각 줄 시작 및 전체 문자열 시작의 수식 인젝션(전각 기호 포함) 방어
  str = str
    .split(/\r?\n/)
    .map(function(line) {
      const trimmed = line.trim();
      if (!trimmed) return "";
      return /^[\s]*[=+\-@|\t\r\n＝＋－＠｜]/.test(trimmed) ? "'" + trimmed : trimmed;
    })
    .filter(Boolean)
    .join(" / ");

  if (/^[\s]*[=+\-@|\t\r\n＝＋－＠｜]/.test(str)) {
    str = "'" + str;
  }
  return str;
}

function sanitizeUrl_(url) {
  if (!url) return "";
  const trimmed = String(url).trim().slice(0, 1000);
  if (/^https:\/\//i.test(trimmed) && !/[<>"'`\s]/.test(trimmed)) return trimmed;
  if ((trimmed.indexOf("./") === 0 || (trimmed.indexOf("/") === 0 && trimmed.indexOf("//") !== 0)) && trimmed.indexOf("..") === -1) {
    return trimmed.replace(/[<>"'`\s\\]/g, "");
  }
  return "";
}

function safeJsonParse_(str, fallback) {
  try {
    return str ? JSON.parse(String(str)) : fallback;
  } catch (e) {
    return fallback;
  }
}

function logServerError_(context, requestId, err) {
  try {
    console.error(JSON.stringify({
      context: context,
      requestId: requestId,
      errorName: err && err.name ? String(err.name) : "Error",
      timestamp: new Date().toISOString()
    }));
  } catch (ignore) {}
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
