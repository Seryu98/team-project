from locust import HttpUser, task, between
import random

# =============================================
# 🚀 Sol Matching 부하테스트 (Board + Project)
# =============================================

class SolMatchingUser(HttpUser):
    wait_time = between(1, 3)

    def on_start(self):
        """시작 시 로그인"""
        self.login_count = 0  # 🔄 재로그인 횟수 카운터
        self.login()

    # ==================================================
    # 🔐 로그인 함수 (만료 시 재로그인용)
    # ==================================================
    def login(self):
        """OAuth2 로그인 및 토큰 저장"""
        user_id = f"uid_{random.randint(1, 1000):04d}"
        password = "Test0001!"

        payload = {"username": user_id, "password": password}
        headers = {"Content-Type": "application/x-www-form-urlencoded"}

        res = self.client.post("/auth/login", data=payload, headers=headers, name="로그인")
        if res.status_code == 200:
            data = res.json()
            self.token = data.get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
            self.login_count += 1
            print(f"🔄 토큰 재발급 완료 (총 {self.login_count}회)")
        else:
            self.token = None
            self.headers = {}
            print(f"❌ 로그인 실패 (status={res.status_code})")

    # ==================================================
    # 🧩 공통 요청 함수 (401 시 자동 재로그인)
    # ==================================================
    def safe_request(self, method, url, **kwargs):
        """401 발생 시 자동 재로그인 후 1회 재시도"""
        res = self.client.request(method, url, **kwargs)
        if res.status_code == 401:
            print(f"⚠️ 401 Unauthorized 발생 → 재로그인 시도 중... (URL: {url})")
            self.login()
            if self.token:
                if "headers" in kwargs:
                    kwargs["headers"].update(self.headers)
                else:
                    kwargs["headers"] = self.headers
                res = self.client.request(method, url, **kwargs)
        return res

    # ==================================================
    # 📰 게시판 기능
    # ==================================================
    @task(5)
    def list_board_posts(self):
        """게시글 목록"""
        self.client.get("/board/?page=1", name="게시글 목록 조회")

    @task(10)
    def view_board_post(self):
        """게시글 상세"""
        post_id = random.randint(1, 100)
        self.client.get(f"/public/board/{post_id}", headers=self.headers, name="게시글 상세 조회")

    @task(1)
    def create_board_post(self):
        """게시글 작성"""
        if not self.token:
            self.login()
        data = {
            "title": f"[테스트] 게시글 {random.randint(1000,9999)}",
            "content": "이것은 Locust 자동 테스트 게시글입니다.",
            "category_id": 1
        }
        self.safe_request(
            "POST",
            "/board",
            json=data,
            headers=self.headers,
            name="게시글 작성"
        )

    @task(3)
    def create_comment(self):
        """댓글 작성"""
        if not self.token:
            self.login()
        post_id = random.randint(1, 100)
        data = {"content": f"테스트 댓글 {random.randint(1,9999)}"}
        self.safe_request(
            "POST",
            f"/board/{post_id}/comments",
            json=data,
            headers=self.headers,
            name="댓글 작성"
        )

    # ==================================================
    # 🧩 프로젝트 모집 기능
    # ==================================================
    @task(5)
    def list_project_posts(self):
        """프로젝트 목록"""
        self.client.get("/recipe/list?page=1", name="프로젝트 목록 조회")

    @task(5)
    def view_project_post(self):
        """프로젝트 상세"""
        post_id = random.randint(1, 50)
        self.client.get(f"/recipe/{post_id}", name="프로젝트 상세 조회")

    @task(1)
    def create_project_post(self):
        """프로젝트 작성"""
        if not self.token:
            self.login()
        data = {
            "title": f"테스트 프로젝트 {random.randint(1000,9999)}",
            "description": "이것은 Locust 테스트용 프로젝트입니다.",
            "capacity": 3,
            "type": "PROJECT",
            "field": "AI",
            "start_date": "2025-10-01",
            "end_date": "2025-12-31",
            "skills": [1, 2],
            "application_fields": [1, 2],
        }
        self.safe_request(
            "POST",
            "/recipe/",
            json=data,
            headers=self.headers,
            name="프로젝트 작성"
        )

    @task(2)
    def apply_to_project(self):
        """프로젝트 지원"""
        if not self.token:
            self.login()
        post_id = random.randint(1, 50)
        answers = [{"field_id": 1, "answer_text": "테스트 지원"}]
        self.safe_request(
            "POST",
            f"/recipe/{post_id}/apply",
            json=answers,
            headers=self.headers,
            name="프로젝트 지원"
        )
        
    # ==================================================
    # 🧾 테스트 종료 시 요약
    # ==================================================
    def on_stop(self):
        """Locust 유저 종료 시점"""
        print(f"🧾 [User 종료] 총 재로그인 횟수: {self.login_count}회")