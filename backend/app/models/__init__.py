# app/models/__init__.py
# 모든 모델을 한곳에 모아 SQLAlchemy Base에서 인식되도록 연결

from app.users.user_model import User
from app.profile.profile_model import Profile
from app.profile.follow_model import Follow
from app.profile.user_skill_model import UserSkill
from app.meta.skill_model import Skill  # ✅ meta의 Skill만 사용
from app.meta.application_field_model import ApplicationField
from app.project_post.recipe_model import (
    RecipePost,
    RecipePostSkill,
    RecipeFile,
    RecipePostRequiredField,
    Application,
    ApplicationAnswer,
)
from app.project_post.post_member_model import PostMember