# app/core/email_utils.py
import os
import smtplib
from email.mime.text import MIMEText
import dns.resolver  # ✅ 추가: 도메인 검증용

EMAIL_MODE = os.getenv("EMAIL_MODE", "dev")
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
EMAIL_USER = os.getenv("EMAIL_USER")
EMAIL_PASS = os.getenv("EMAIL_PASS")

def send_email_smtp(to_email: str, subject: str, body: str) -> None:
    """Gmail SMTP로 메일 발송 (EMAIL_MODE=prod 일 때만 실제 발송)"""
    if EMAIL_MODE != "prod":
        # 개발 모드에선 콘솔만
        print(f"[DEV EMAIL] To={to_email}\nSubject={subject}\nBody=\n{body}\n")
        return

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = EMAIL_USER
    msg["To"] = to_email

    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=5) as smtp:
            smtp.starttls()
            smtp.login(EMAIL_USER, EMAIL_PASS)
            smtp.send_message(msg)
            print(f"[EMAIL SENT] ✅ To={to_email}")
    except smtplib.SMTPRecipientsRefused:
        print(f"[EMAIL ERROR] ❌ 수신자 주소 거부됨: {to_email}")
        # ✅ 문구 개선: 실제 존재하지 않는 이메일일 때 사용자에게 명확히 전달
        raise ValueError("유효하지 않은 이메일 주소입니다. 이메일을 다시 확인해주세요.")
    except smtplib.SMTPConnectError:
        print(f"[EMAIL ERROR] ❌ SMTP 서버 연결 실패")
        raise ValueError("이메일 서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.")
    except smtplib.SMTPAuthenticationError:
        print(f"[EMAIL ERROR] ❌ SMTP 로그인 실패: 아이디 또는 비밀번호 오류")
        raise ValueError("SMTP 인증 실패: 이메일 계정 정보를 확인해주세요.")
    except Exception as e:
        print(f"[EMAIL ERROR] ⚠️ 이메일 발송 중 예외 발생: {e}")
        # ✅ 문구 개선: “이메일 발송 중 오류가 발생했습니다.” → 구체적인 안내
        raise ValueError("이메일 전송 처리 중 문제가 발생했습니다. (관리자 확인 필요)")


# ✅ 추가: 이메일 도메인 유효성 검사 함수
def is_valid_email_domain(email: str) -> bool:
    """
    이메일 도메인 유효성 검사 (MX 레코드 존재 여부 확인)
    예: test@gmail.com → gmail.com MX 조회
    """
    try:
        domain = email.split("@")[-1]
        if not domain or "." not in domain:
            print(f"[EMAIL CHECK] ❌ 잘못된 이메일 형식: {email}")
            return False

        answers = dns.resolver.resolve(domain, "MX")
        if len(answers) > 0:
            print(f"[EMAIL CHECK] ✅ 유효한 도메인: {domain}")
            return True
        else:
            print(f"[EMAIL CHECK] ❌ MX 레코드 없음: {domain}")
            return False
    except dns.resolver.NXDOMAIN:
        print(f"[EMAIL CHECK] ❌ 존재하지 않는 도메인: {email}")
        return False
    except Exception as e:
        print(f"[EMAIL CHECK] ⚠️ 도메인 확인 중 오류: {email}, {e}")
        return False
