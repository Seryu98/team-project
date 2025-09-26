# app/utils/response.py
from typing import Any, Dict

#   성공 응답 헬퍼
# - 모든 API에서 성공 응답을 이 함수를 통해 반환
# - 팀 컨벤션 문서에 정의된 구조 { success, data, message } 준수
def ok(data: Any, message: str = "성공") -> Dict[str, Any]:
    return {
        "success": True,   # 성공 여부 (항상 True)
        "data": data,      # 실제 데이터(payload)
        "message": message # 부가 메시지 (기본값: "성공")
    }

#   실패 응답 헬퍼
# - 오류나 유효하지 않은 요청에서 반환
# - success=False 로 고정
# - data에는 None 또는 에러 관련 부가 데이터 가능
def fail(message: str, data: Any = None) -> Dict[str, Any]:
    return {
        "success": False,  # 실패 여부 (항상 False)
        "data": data,      # 에러 관련 데이터 (없으면 None)
        "message": message # 오류 설명 메시지
    }
