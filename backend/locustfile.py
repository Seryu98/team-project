from locust import HttpUser, task, between
import random

# =============================================
# 🚀 Sol Matching 부하테스트 (Board + Project)
# =============================================

class SolMatchingUser(HttpUser):
    wait_time = between(1, 3)

    def on_start(self):
        """로그인 (OAuth2 형식)"""
        user_id = f"uid_{random.randint(1, 1000):04d}"
        password = "Test0001!"

        payload = {
            "username": user_id,
            "password": password
        }

        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        res = self.client.post("/auth/login", data=payload, headers=headers, name="로그인")

        if res.status_code == 200:
            self.token = res.json().get("access_token")
        else:
            self.token = None

    # -------------------------------
    # 📰 게시판 기능
    # -------------------------------

    @task(5)
    def list_board_posts(self):
        """게시글 목록"""
        self.client.get("/board/?page=1", name="게시글 목록 조회")

    @task(10)
    def view_board_post(self):
        """게시글 상세"""
        post_id = random.randint(1, 100)
        headers = {"Authorization": f"Bearer {self.token}"} if self.token else {}
        # ✅ 수정 (정상 응답 200)
        self.client.get(f"/public/board/{post_id}", headers=headers, name="게시글 상세 조회")

    @task(1)
    def create_board_post(self):
        """게시글 작성"""
        if not self.token:
            return
        headers = {"Authorization": f"Bearer {self.token}"}
        data = {
            "title": f"[테스트] 게시글 {random.randint(1000,9999)}",
            "content": "이것은 Locust 자동 테스트 게시글입니다.",
            "category_id": 1
        }
        self.client.post("/board", json=data, headers=headers, name="게시글 작성")

    @task(3)
    def create_comment(self):
        """댓글 작성"""
        if not self.token:
            return
        headers = {"Authorization": f"Bearer {self.token}"}
        post_id = random.randint(1, 100)
        data = {"content": f"테스트 댓글 {random.randint(1,9999)}"}
        self.client.post(
            f"/board/{post_id}/comments",
            json=data,
            headers=headers,
            name="댓글 작성"
        )

    # -------------------------------
    # 🧩 프로젝트 모집 기능
    # -------------------------------

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
            return
        headers = {"Authorization": f"Bearer {self.token}"}
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
        self.client.post("/recipe/", json=data, headers=headers, name="프로젝트 작성")

    @task(2)
    def apply_to_project(self):
        """프로젝트 지원"""
        if not self.token:
            return
        headers = {"Authorization": f"Bearer {self.token}"}
        post_id = random.randint(1, 50)
        answers = [{"field_id": 1, "answer_text": "테스트 지원"}]
        self.client.post(
            f"/recipe/{post_id}/apply",
            json=answers,
            headers=headers,
            name="프로젝트 지원"
        )
