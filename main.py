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

#Calling an actual API of gemini
load_dotenv()
Gkey = os.getenv("GEMINI_API_KEY")

genai.configure(api_key=Gkey)
model = genai.GenerativeModel("gemini-3.6-flash")

class StrContext():
    industry: str
    pain_points: list[str]
    goals: list[str]
    constrains: list[str]

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
        