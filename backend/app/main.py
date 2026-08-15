from fastapi import FastAPI

app = FastAPI(title="SkillCampus API", version="0.1.0")


@app.get("/")
def root():
    return {"name": "SkillCampus API", "status": "ok"}


@app.get("/health")
def health():
    return {"status": "healthy"}
