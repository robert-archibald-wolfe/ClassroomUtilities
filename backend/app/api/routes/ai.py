"""AI generation routes for bellringers, lesson plans, and rubrics.

All AI generation uses self-hosted Ollama. No PHI is processed here -
only curriculum content, standards, and educational materials.
"""

from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentTenantId, CurrentUserId
from app.core.ollama import ollama

router = APIRouter()


# --- Bellringer Schemas ---


class BellringerRequest(BaseModel):
    """Request to generate bellringer activities."""
    topic: str
    subject: str
    grade_level: str
    learning_objective: str | None = None
    format_preference: str = "mixed"  # "multiple_choice", "short_answer", "discussion", "mixed"
    difficulty: str = "medium"  # "easy", "medium", "hard"
    count: int = 3


class BellringerOption(BaseModel):
    """A single bellringer option."""
    type: str  # "multiple_choice", "short_answer", "discussion"
    question: str
    options: list[str] | None = None  # For multiple choice
    answer_hint: str | None = None


class BellringerResponse(BaseModel):
    """Generated bellringer activities."""
    topic: str
    options: list[BellringerOption]


# --- Lesson Plan Schemas ---


class LessonPlanRequest(BaseModel):
    """Request to generate a lesson plan."""
    topic: str
    subject: str
    grade_level: str
    duration_minutes: int = 50
    standards: list[str] = []
    additional_context: str | None = None


class LessonPlanResponse(BaseModel):
    """Generated lesson plan."""
    title: str
    grade_level: str
    duration: str
    standards: list[str]
    objectives: list[str]
    materials: list[str]
    warm_up: str
    direct_instruction: str
    guided_practice: str
    independent_practice: str
    assessment: str
    differentiation: str
    closure: str


# --- Rubric Schemas ---


class RubricRequest(BaseModel):
    """Request to generate a rubric."""
    assignment_description: str
    criteria: list[str]
    rubric_type: str = "analytic"  # "analytic", "holistic", "single_point"
    scale: int = 4  # Number of performance levels
    grade_level: str


class RubricCriterion(BaseModel):
    """A single rubric criterion with level descriptors."""
    name: str
    weight: float | None = None
    levels: dict[str, str]  # e.g., {"4": "Excellent...", "3": "Good...", ...}


class RubricResponse(BaseModel):
    """Generated rubric."""
    title: str
    rubric_type: str
    scale: int
    criteria: list[RubricCriterion]


# --- Routes ---


@router.post("/bellringer", response_model=BellringerResponse)
async def generate_bellringer(
    request: BellringerRequest,
    tenant_id: CurrentTenantId,
) -> BellringerResponse:
    """Generate bellringer activities using AI."""

    # Check Ollama availability
    if not await ollama.health_check():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service is not available",
        )

    system_prompt = """You are an experienced teacher creating engaging bellringer activities.
Generate activities that are age-appropriate, thought-provoking, and aligned with learning objectives.
Respond in JSON format only."""

    user_prompt = f"""Create {request.count} bellringer activities for:
- Topic: {request.topic}
- Subject: {request.subject}
- Grade Level: {request.grade_level}
- Learning Objective: {request.learning_objective or 'General review'}
- Difficulty: {request.difficulty}
- Format: {request.format_preference}

Respond with a JSON object:
{{
  "options": [
    {{
      "type": "multiple_choice|short_answer|discussion",
      "question": "...",
      "options": ["A", "B", "C", "D"] or null,
      "answer_hint": "..." or null
    }}
  ]
}}"""

    try:
        response = await ollama.generate(
            prompt=user_prompt,
            system=system_prompt,
            temperature=0.7,
        )

        # Parse JSON from response
        import json
        # Try to extract JSON from the response
        json_start = response.find('{')
        json_end = response.rfind('}') + 1
        if json_start != -1 and json_end > json_start:
            data = json.loads(response[json_start:json_end])
            return BellringerResponse(
                topic=request.topic,
                options=[BellringerOption(**opt) for opt in data.get("options", [])],
            )
        else:
            raise ValueError("No valid JSON in response")

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate bellringer: {str(e)}",
        )


@router.post("/lesson", response_model=LessonPlanResponse)
async def generate_lesson_plan(
    request: LessonPlanRequest,
    tenant_id: CurrentTenantId,
) -> LessonPlanResponse:
    """Generate a lesson plan using AI."""

    if not await ollama.health_check():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service is not available",
        )

    standards_text = ", ".join(request.standards) if request.standards else "None specified"

    system_prompt = """You are an experienced curriculum designer creating detailed, standards-aligned lesson plans.
Create practical, engaging lessons with clear learning objectives and varied activities.
Respond in JSON format only."""

    user_prompt = f"""Create a {request.duration_minutes}-minute lesson plan:
- Topic: {request.topic}
- Subject: {request.subject}
- Grade Level: {request.grade_level}
- Standards: {standards_text}
- Additional Context: {request.additional_context or 'None'}

Respond with a JSON object:
{{
  "title": "...",
  "grade_level": "{request.grade_level}",
  "duration": "{request.duration_minutes} minutes",
  "standards": [...],
  "objectives": ["Students will be able to..."],
  "materials": [...],
  "warm_up": "5-minute activity description",
  "direct_instruction": "Main teaching content",
  "guided_practice": "Teacher-led practice",
  "independent_practice": "Student work time",
  "assessment": "How to check understanding",
  "differentiation": "Modifications for different learners",
  "closure": "Wrap-up activity"
}}"""

    try:
        response = await ollama.generate(
            prompt=user_prompt,
            system=system_prompt,
            temperature=0.7,
            max_tokens=2000,
        )

        import json
        json_start = response.find('{')
        json_end = response.rfind('}') + 1
        if json_start != -1 and json_end > json_start:
            data = json.loads(response[json_start:json_end])
            return LessonPlanResponse(**data)
        else:
            raise ValueError("No valid JSON in response")

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate lesson plan: {str(e)}",
        )


@router.post("/rubric", response_model=RubricResponse)
async def generate_rubric(
    request: RubricRequest,
    tenant_id: CurrentTenantId,
) -> RubricResponse:
    """Generate an assessment rubric using AI."""

    if not await ollama.health_check():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service is not available",
        )

    criteria_text = ", ".join(request.criteria)
    scale_labels = {
        4: ["Exemplary (4)", "Proficient (3)", "Developing (2)", "Beginning (1)"],
        3: ["Proficient (3)", "Developing (2)", "Beginning (1)"],
        5: ["Exemplary (5)", "Proficient (4)", "Developing (3)", "Beginning (2)", "Not Yet (1)"],
    }
    levels = scale_labels.get(request.scale, [str(i) for i in range(request.scale, 0, -1)])

    system_prompt = """You are an expert in educational assessment creating clear, fair rubrics.
Create rubrics with specific, measurable descriptors for each performance level.
Respond in JSON format only."""

    user_prompt = f"""Create a {request.rubric_type} rubric:
- Assignment: {request.assignment_description}
- Criteria to assess: {criteria_text}
- Scale: {request.scale}-point ({', '.join(levels)})
- Grade Level: {request.grade_level}

Respond with a JSON object:
{{
  "title": "Rubric for [Assignment]",
  "rubric_type": "{request.rubric_type}",
  "scale": {request.scale},
  "criteria": [
    {{
      "name": "Criterion Name",
      "weight": 0.25,
      "levels": {{
        "{request.scale}": "Description of exemplary performance...",
        "{request.scale - 1}": "Description of proficient performance...",
        ...
      }}
    }}
  ]
}}"""

    try:
        response = await ollama.generate(
            prompt=user_prompt,
            system=system_prompt,
            temperature=0.7,
            max_tokens=2000,
        )

        import json
        json_start = response.find('{')
        json_end = response.rfind('}') + 1
        if json_start != -1 and json_end > json_start:
            data = json.loads(response[json_start:json_end])
            return RubricResponse(
                title=data.get("title", "Rubric"),
                rubric_type=data.get("rubric_type", request.rubric_type),
                scale=data.get("scale", request.scale),
                criteria=[RubricCriterion(**c) for c in data.get("criteria", [])],
            )
        else:
            raise ValueError("No valid JSON in response")

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate rubric: {str(e)}",
        )


@router.get("/health")
async def ai_health_check() -> dict:
    """Check AI service availability and list models."""
    is_healthy = await ollama.health_check()

    if not is_healthy:
        return {
            "status": "unavailable",
            "models": [],
        }

    models = await ollama.list_models()
    return {
        "status": "available",
        "models": [m.get("name") for m in models],
    }
