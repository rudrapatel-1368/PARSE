from fastapi import FastAPI
from pydantic import BaseModel
from dotenv import load_dotenv
import os
import google.generativeai as genai
import json

class BusinessInput(BaseModel):
    raw_text: str

app = FastAPI()

#This will run at the start
@app.get("/")        
#The "/" is just a fixed symbol for the front end to use to call the function below it
def main():
    return {"message" : "Hi from the backend"}

#To call a text from the website
@app.post("/ingest")  #Same as "/", "/ingest" is a keyword or a symbol the frontend js calls using fetch() fn
def ingest_input(data: BusinessInput):
    if len(data.raw_text.strip()) < 20:
        return {"Error" : "Please provide more info"}
    return {"returned" : data.raw_text}

#********************************************** STAGE 1 *********************************************************#
#Calling an actual API of gemini
load_dotenv()
Gkey = os.getenv("GEMINI_API_KEY")

genai.configure(api_key=Gkey)
model = genai.GenerativeModel("gemini-3.6-flash")

class StrContext(BaseModel):
    industry: str
    pain_points: list[str]
    goals: list[str]
    constraints: list[str]

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
        sturctured = json.loads(responce.text)
    except json.JSONDecodeError:
        return {"Error" : "Gemini didnt give a valid Json", "raw" : responce.text}
    
    return sturctured
    #Any real api call will give you multiple things like token usage, meta data etc. with the text so we seperate it by using .
class Recommendation(BaseModel):
    title: str
    addresses: str
    reasoning: str
    priority: str

class RecommendationList(BaseModel):
    recommendations: list[Recommendation]

#********************************************** STAGE 3 *********************************************************#
@app.post("/recomend")
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
        parsed = json.loads(response.text)
        validated = RecommendationList(**parsed)
    except (json.JSONDecodeError, Exception) as e:
        return {"error": "Gemini didn't return a valid recommendation list", "raw": response.text}

    return validated

#******************************************** STAGE 4 ***************************************************#

class SolBlueprint(BaseModel):
    solution_name: str
    components: list[str]
    workflow: list[str]
    diagram: str

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
        parsed = json.loads(response.text)
        validated = SolBlueprint(**parsed)
    except (json.JSONDecodeError, Exception) as e:
        return {"error": "Gemini didn't return a valid recommendation list", "raw": response.text}

    return validated