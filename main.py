from fastapi import FastAPI
from pydantic import BaseModel
from dotenv import load_dotenv
import os

class BusinessInput(BaseModel):
    raw_text: str

app = FastAPI()

#This will run at the start
@app.get("/")        #The "/" is just a fixed symbol for the front end to use to call the function below it
def main():
    return {"message" : "Hi from the backend"}

#To call a text from the website
@app.post("/ingest")  #Same as "/", "/ingest" is a keyword or a symbol the frontend js calls using fetch() fn
def ingest_input(data: BusinessInput):
    if len(data.raw_text.strip()) < 20:
        return {"Error" : "Please provide more info"}
    return {"revieved" : data.raw_text}

