#이 파일은 단순히 user.py에 있는 User를 한 단계 위에서 불러올 수 있게 해주는 “연결자” 역할이에요.
#그래서 from app.models import User 라는 간단한 코드가 가능해집니다.
#만약 이 파일이 없다면, 항상 from app.models.user import User처럼 구체적으로 적어야 합니다.
#app/models/__init__.py
from .user import User
from .pr_recipe import RecipePost, RecipePostSkill, RecipeFile, RecipePostRequiredField
from .skill import Skill
from .required_field import ApplicationField  # ✅ 새 이름
from .post_member import PostMember