from fastapi import FastAPI
from pydantic import BaseModel

class BusinessInput(BaseModel):
    raw_text: str

app = FastAPI()

@app.get("/")
def main():
    return {"message" : "Hi from the backend"}

@app.post("/ingest")
def ingest_input(data: BusinessInput):
    if len(data.raw_text.strip()) < 20:
        return {"Error" : "Please provide more info"}
    return {"revieved" : data.raw_text}
