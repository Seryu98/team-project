# app/models/__init__.py
# 이 파일은 다른 모듈에서 User를 한 단계 위에서 불러올 수 있게 해주는 "연결자" 역할이에요.
# 예: from app import models; models.User 이런 식으로 접근 가능
# 모든 모델을 한곳에 모아 Base에서 인식되도록 연결

from app.users.user_model import User
from app.project_post.recipe_model import (
    RecipePost,
    RecipePostSkill,
    RecipeFile,
    RecipePostRequiredField,
)
from app.project_post.post_member_model import PostMember
from app.meta.skill_model import Skill
from app.meta.application_field_model import ApplicationField

