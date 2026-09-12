from fastapi import FastAPI
from fastapi import Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ValidationError
from dotenv import load_dotenv
import os
import google.generativeai as genai
import json


#==================================== MODELS =====================================#
# All request/response shapes live here, in dependency order:
# a class that references another must come after it.

class BusinessInput(BaseModel):
    raw_text: str

class StrContext(BaseModel):
    industry: str
    pain_points: list[str]
    goals: list[str]
    constraints: list[str]

class Recommendation(BaseModel):
    title: str
    addresses: str
    reasoning: str
    priority: str

class RecommendationList(BaseModel):          # needs Recommendation
    recommendations: list[Recommendation]

class SolBlueprint(BaseModel):
    solution_name: str
    components: list[str]
    workflow: list[str]
    diagram: str

class ExportRequest(BaseModel):               # needs StrContext, RecommendationList, SolBlueprint
    context: StrContext
    recommendations: RecommendationList
    blueprint: SolBlueprint


#==================================== SETUP =====================================#
#Calling an actual API of gemini
load_dotenv()
Gkey = os.getenv("GEMINI_API_KEY")

genai.configure(api_key=Gkey)
model = genai.GenerativeModel("gemini-3.6-flash")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def clean_json(text):
    text = text.strip()
    if text.startswith("```"):
        parts = text.split("\n", 1)
        if len(parts) == 2:                 # guard: no newline means there is no first line to drop
            text = parts[1]                 # drop the first line (```json)
        text = text.rsplit("```", 1)[0]     # drop the trailing ```
    return text


#==================================== ENDPOINTS =====================================#

#This will run at the start
@app.get("/")
#The "/" is just a fixed symbol for the front end to use to call the function below it
def main():
    return {"message" : "Hi from the backend"}

#********************************************** STAGE 1 *********************************************************#
#To call a text from the website
@app.post("/ingest")  #Same as "/", "/ingest" is a keyword or a symbol the frontend js calls using fetch() fn
def ingest_input(data: BusinessInput):
    if len(data.raw_text.strip()) < 20:
        return {"error" : "Please provide more info"}
    return {"returned" : data.raw_text}

#********************************************** STAGE 2 *********************************************************#
#Creating a structure
@app.post("/structure")
def str_context(data: BusinessInput):
    prompt = f"""Extract structured info from this business description.
    Return ONLY valid JSON, no extra text, in this exact shape:
    {{"industry": "...", "pain_points": ["..."], "goals": ["..."], "constraints": ["..."]}}

    Business description: {data.raw_text}""" #Here the {data.text} is just a variable in which the input busness discription is stored.

    responce = model.generate_content(prompt)

    try:
        sturctured = json.loads(clean_json(responce.text))
        validated = StrContext(**sturctured)
    except (json.JSONDecodeError, ValidationError) as e:
        return {"error" : "Gemini didnt give a valid structure", "detail" : str(e), "raw" : responce.text}

    return validated
    #Any real api call will give you multiple things like token usage, meta data etc. with the text so we seperate it by using .

#********************************************** STAGE 3 *********************************************************#
@app.post("/recommend")
def recommend(data: StrContext):
    prompt = f"""Based on this business context, suggest 2-3 recommendations.
    Each recommendation MUST address a specific pain point or goal listed below —
    do not suggest anything that isn't grounded in this context.

    Return ONLY valid JSON, no extra text, in this exact shape:
    {{"recommendations": [{{"title": "...", "addresses": "...", "reasoning": "...", "priority": "high/medium/low"}}]}}

    Industry: {data.industry}
    Pain points: {data.pain_points}
    Goals: {data.goals}
    Constraints: {data.constraints}"""

    response = model.generate_content(prompt)

    try:
        parsed = json.loads(clean_json(response.text))
        validated = RecommendationList(**parsed)
    except (json.JSONDecodeError, ValidationError) as e:
        return {"error": "Gemini didn't return a valid recommendation list", "detail": str(e), "raw": response.text}

    return validated

#******************************************** STAGE 4 ***************************************************#
@app.post("/solution")
def solution(data: Recommendation):
    prompt = f"""Design a simple, buildable solution for this recommendation.
    Keep it realistic for a small team to build in days, not months — no enterprise-grade architecture.

    Return ONLY valid JSON, no extra text, in this exact shape:
    {{"solution_name": "...", "components": ["..."], "workflow": ["..."], "diagram": "mermaid syntax here"}}

    The "diagram" field must contain valid Mermaid flowchart syntax as a single string, e.g.:
    "flowchart TD\\n  A[Start] --> B[End]"

    Recommendation: {data.title}
    Addresses: {data.addresses}
    Reasoning: {data.reasoning}
    Priority: {data.priority}"""

    response = model.generate_content(prompt)

    try:
        parsed = json.loads(clean_json(response.text))
        validated = SolBlueprint(**parsed)
    except (json.JSONDecodeError, ValidationError) as e:
        return {"error": "Gemini didn't return a valid solution blueprint", "detail": str(e), "raw": response.text}

    return validated

#******************************************** STAGE 5 ***************************************************#
@app.post("/export")
def export(data: ExportRequest):
    rec_lines = ""
    for rec in data.recommendations.recommendations:
        rec_lines += f"- **{rec.title}** (priority: {rec.priority})\n  {rec.reasoning}\n\n"
    comp_lines = f"**components:** {', '.join(data.blueprint.components)}\n **Workflow:** {'->'.join(data.blueprint.workflow)}"
    final_doc = f"""# Business Transformation Plan

## Business Summary
**Industry:** {data.context.industry}
**Pain Points:** {', '.join(data.context.pain_points)}
**Goals:** {', '.join(data.context.goals)}

## Recommendations
{rec_lines}

## Selected
#  Solution: {data.blueprint.solution_name}
{comp_lines}

### Diagram
```mermaid
{data.blueprint.diagram}
```
"""
    return Response(
        content=final_doc,
        media_type="text/markdown",
        headers={"Content-Disposition" : "attachment; filename=solution.md"}
    )
