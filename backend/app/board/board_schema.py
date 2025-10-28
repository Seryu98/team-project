# backend/app/board/board_schema.py

from datetime import datetime, date
from typing import List, Optional
from pydantic import BaseModel, Field


# 게시글 카드/상세 공통으로 쓰는 작성자 정보
class Author(BaseModel):
    id: int
    nickname: str
    profile_image: Optional[str] = None


# 게시글 카드 응답
class BoardPostCard(BaseModel):
    id: int
    title: str
    content_preview: str
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    author: Author
    created_at: datetime
    view_count: int
    like_count: int
    badge: Optional[str] = None
    model_config = {"from_attributes": True}


# 게시글 상세 응답
class BoardPostDetail(BaseModel):
    id: int
    title: str
    content: str
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    author: Author
    created_at: datetime
    updated_at: Optional[datetime] = None
    view_count: int
    like_count: int
    attachment_url: Optional[str] = None
    model_config = {"from_attributes": True}


# 목록 조회용 필터 파라미터
class BoardListQuery(BaseModel):
    # 정렬: created_at(desc 기본), view_count, like_count
    sort: str = Field(default="created_at")
    order: str = Field(default="desc")  # asc|desc
    # 카테고리 필터(다중)
    category_ids: Optional[List[int]] = None
    # 기간 필터 (created_at 기준)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    # 검색 (제목/내용)
    q: Optional[str] = None
    # 페이지네이션
    page: int = 1
    page_size: int = 10


# 생성/수정 요청
class BoardPostCreate(BaseModel):
    category_id: Optional[int] = None  # 홍보글/잡담글/자랑글/질문&답변/정보공유
    title: str
    content: str
    attachment_url: Optional[str] = None


class BoardPostUpdate(BaseModel):
    category_id: Optional[int] = None
    title: Optional[str] = None
    content: Optional[str] = None
    attachment_url: Optional[str] = None


# 댓글
class CommentCreate(BaseModel):
    content: str
    parent_id: Optional[int] = None  # 대댓글은 parent_id 지정


class CommentItem(BaseModel):
    id: int
    user: Author
    content: str
    status: str
    created_at: datetime
    parent_id: Optional[int] = None


class CommentThread(BaseModel):
    # 단일 depth(댓글 + 대댓글 배열)
    comment: CommentItem
    replies: List[CommentItem]


# 신고
class ReportCreate(BaseModel):
    target_type: str  # 'BOARD_POST' | 'COMMENT'
    target_id: int
    reason: str

# =========================================================
# 🧩 주간 인기글 응답 (Top3)
# =========================================================
class BoardWeeklyHot(BaseModel):
    id: int
    title: str
    category_name: Optional[str] = None
    author: Author
    created_at: datetime
    recent_views: int = 0
    recent_likes: int = 0
    comment_count: int = 0
    hot_score: float = 0.0
    model_config = {"from_attributes": True}

# ✅ 테스트 전용 간소 응답 (테스트에서는 author, created_at 검증 불필요)
class BoardWeeklyHotLite(BaseModel):
    id: int
    title: str
    recent_views: int
    recent_likes: int
    hot_score: float
    model_config = {"from_attributes": True}