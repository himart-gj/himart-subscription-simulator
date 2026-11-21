/**
 * 롯데하이마트 경기광주점 — Google Apps Script 보안 백엔드 템플릿
 *
 * [초기 설정 방법]
 * 1. Google Sheets에서 [확장 프로그램 > Apps Script] 열기
 * 2. 아래 코드를 붙여넣고 저장
 * 3. Apps Script [프로젝트 설정 > 스크립트 속성]에 다음 키 등록:
 *    - ADMIN_PASSWORD_SHA256 : 관리자 비밀번호의 SHA-256 해시(소문자 64자)
 *    - SPREADSHEET_ID        : 연결할 비공개 스프레드시트 ID
 * 4. [배포 > 새 배포 > 웹 앱] 실행 주체: 나, 액세스 권한: 모든 사용자
 * 5. 생성된 웹 앱 URL을 프론트엔드 환경변수 VITE_GAS_API_URL 에 입력
 *
 * [보안 구조]
 * - 프론트엔드에는 비밀번호/해시 일체 미보관 (Zero-Secret)
 * - 고객 상담 명단(Leads)은 단방향 쓰기(POST)만 허용하며 GET 조회 API를 제공하지 않음 (Write-Only)
 * - 임시 세션 토큰은 CacheService에 2시간 TTL로 저장
 */

const CATALOG_SHEET = 'CatalogJSON'
const LEADS_SHEET = 'ConsultationLeads'
const SESSION_TTL_SECONDS = 7200

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || ''
  if (action === 'getCatalog') {
    const ss = getSpreadsheet()
    const sheet = ss.getSheetByName(CATALOG_SHEET)
    if (!sheet) {
      return jsonOut({ ok: true, snapshot: null })
    }
    const raw = sheet.getRange('A1').getValue()
    if (!raw) {
      return jsonOut({ ok: true, snapshot: null })
    }
    return jsonOut({ ok: true, snapshot: JSON.parse(String(raw)) })
  }
  return jsonOut({ ok: false, error: 'UNSUPPORTED_ACTION' })
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}')
    const action = body.action

    if (action === 'adminLogin') {
      return handleAdminLogin(String(body.password || ''))
    }

    if (action === 'saveCatalog') {
      return handleSaveCatalog(String(body.token || ''), body.snapshot)
    }

    if (action === 'submitLead') {
      return handleSubmitLead(String(body.referenceCode || ''), body.payload)
    }

    return jsonOut({ ok: false, error: 'UNSUPPORTED_ACTION' })
  } catch (err) {
    return jsonOut({ ok: false, error: String(err && err.message ? err.message : err) })
  }
}

function handleAdminLogin(password) {
  const props = PropertiesService.getScriptProperties()
  const expectedHash = (props.getProperty('ADMIN_PASSWORD_SHA256') || '').trim().toLowerCase()
  if (!expectedHash) {
    return jsonOut({ ok: false, error: '서버에 ADMIN_PASSWORD_SHA256 속성이 설정되지 않았습니다.' })
  }

  const inputHash = sha256Hex(password)
  if (!timingSafeEqual(inputHash, expectedHash)) {
    return jsonOut({ ok: false, error: '비밀번호가 일치하지 않습니다.' })
  }

  const token = Utilities.getUuid() + '-' + Utilities.getUuid()
  CacheService.getScriptCache().put('admin_sess_' + token, 'valid', SESSION_TTL_SECONDS)
  return jsonOut({ ok: true, token: token })
}

function handleSaveCatalog(token, snapshot) {
  const valid = CacheService.getScriptCache().get('admin_sess_' + token)
  if (valid !== 'valid') {
    return jsonOut({ ok: false, error: 'UNAUTHORIZED' })
  }

  const ss = getSpreadsheet()
  let sheet = ss.getSheetByName(CATALOG_SHEET)
  if (!sheet) {
    sheet = ss.insertSheet(CATALOG_SHEET)
  }
  sheet.getRange('A1').setValue(JSON.stringify(snapshot))
  sheet.getRange('A2').setValue(new Date().toISOString())
  return jsonOut({ ok: true })
}

function handleSubmitLead(referenceCode, payload) {
  if (!payload || !payload.customerName || !payload.customerPhone) {
    return jsonOut({ ok: false, error: '필수 입력 항목이 누락되었습니다.' })
  }
  const ss = getSpreadsheet()
  let sheet = ss.getSheetByName(LEADS_SHEET)
  if (!sheet) {
    sheet = ss.insertSheet(LEADS_SHEET)
    sheet.appendRow([
      '접수시각',
      '접수번호',
      '고객명',
      '연락처',
      '상담방식',
      '선택품목',
      '구독프리드구성',
      '제휴카드상태',
      '1~36개월체감',
      '37~60개월체감',
      '만기환급예상액',
      '메모',
    ])
  }

  const s = payload.summary || {}
  sheet.appendRow([
    new Date(),
    safeCell(referenceCode),
    safeCell(payload.customerName),
    safeCell(payload.customerPhone),
    safeCell(payload.consultChannel),
    safeCell(s.itemsText),
    safeCell(s.lifeCareText),
    safeCell(s.cardStatusText),
    safeCell(s.phaseASummary),
    safeCell(s.phaseBSummary || '-'),
    Number(s.maturityRefundTotal || 0),
    safeCell(payload.memo || ''),
  ])
  return jsonOut({ ok: true })
}

function safeCell(val) {
  const str = String(val || '').trim()
  if (/^[=+\-@\t\r\n]/.test(str)) {
    return "'" + str
  }
  return str
}

function sha256Hex(text) {
  const raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8)
  return raw
    .map(function (byte) {
      const v = byte < 0 ? byte + 256 : byte
      return ('0' + v.toString(16)).slice(-2)
    })
    .join('')
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

function getSpreadsheet() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID')
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet()
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  )
}
