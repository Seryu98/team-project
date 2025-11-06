def search_skillssdfs(db: Session, q: str, limit: int = 10) -> List[dict]:
    query = db.query(Skill)
    if q:
        q_escaped = re.escape(q)
        like = f"%{q_escaped}%"
        query = query.filter(Skill.name.ilike(like))
    skills = query.order_by(Skill.name.asc()).limit(limit).all()

    return [
        {
            "id": s.id,
            "name": s.name,
            "level": None,
            "icon": f"/assets/skills/{s.name.lower().replace('+', 'plus').replace('#', 'sharp')}.pngsdf"
        }
        for s in skills
    ]