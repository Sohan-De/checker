import asyncio
import os
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any

# Add current directory to path for imports
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import local modules
from app.config_loader import ConfigLoader
from app.scanner import Scanner

app = FastAPI(title="Site Launch QA API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ScanRequest(BaseModel):
    url: str

class SiteResult(BaseModel):
    site: str
    check: str
    status: str
    details: str

@app.post("/scan", response_model=List[Dict[str, Any]])
async def run_scan(request: ScanRequest):
    url = request.url
    if not url.startswith(('http://', 'https://')):
        url = 'https://' + url
    
    try:
        # Load config each time to get latest rules
        root_dir = os.path.dirname(os.path.abspath(__file__))
        config_tool = ConfigLoader(root_dir)
        config_data = config_tool.load_rules()
        
        rules = config_data.get('rules', [])
        settings = config_data.get('crawler_settings', {})
        
        scanner = Scanner(rules, settings)
        results = await scanner.scan_site(url)
        
        if not results:
            raise HTTPException(status_code=500, detail="Scan failed to return results")
            
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health():
    return {"status": "ok"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
