from __future__ import annotations
import os, uuid
from fastapi import FastAPI, Request, Depends, Form, HTTPException
from fastapi.responses import RedirectResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from sqlalchemy import select

# Use absolute imports
from db import SessionLocal
from models import Account, Campaign, CampaignStep, Contact
from telethon_manager import MANAGER, _xor, SESSION_SECRET

app = FastAPI(title="Telegram Follow-up UI")
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Dependency

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/", response_class=HTMLResponse)
async def index(request: Request, db: Session = Depends(get_db)):
    from datetime import datetime, timedelta
    from telethon_manager import MANAGER
    
    # Get basic data
    accounts = db.execute(select(Account)).scalars().all()
    campaigns = db.execute(select(Campaign)).scalars().all()
    contacts = db.execute(select(Contact)).scalars().all()
    
    # Enrich contacts with user info and next message time
    enriched_contacts = []
    for contact in contacts:
        # Get account for this contact
        account = next((acc for acc in accounts if acc.id == contact.account_id), None)
        if not account or account.status != "active":
            continue
            
        # Get user info from Telegram
        try:
            user_info = await MANAGER.get_user_info(account, contact.telegram_user_id)
        except:
            user_info = {'id': contact.telegram_user_id, 'full_name': f'User {contact.telegram_user_id}', 'username': None}
        
        # Calculate next message time
        campaign = next((c for c in campaigns if c.account_id == contact.account_id and c.active), None)
        next_message_time = None
        if campaign and contact.last_message_at and not contact.replied and contact.current_step <= campaign.max_steps:
            next_message_time = contact.last_message_at + timedelta(seconds=campaign.interval_seconds)
        elif campaign and not contact.last_message_at and not contact.replied:
            next_message_time = "Agora"
            
        enriched_contacts.append({
            'contact': contact,
            'user_info': user_info,
            'next_message_time': next_message_time,
            'campaign': campaign
        })
    
    return templates.TemplateResponse("index.html", {
        "request": request, 
        "accounts": accounts, 
        "campaigns": campaigns, 
        "enriched_contacts": enriched_contacts
    })

# ---- Account onboarding ----
@app.get("/accounts/new", response_class=HTMLResponse)
def account_new(request: Request):
    return templates.TemplateResponse("account_new.html", {"request": request})

@app.post("/accounts")
async def account_create(phone: str = Form(...), db: Session = Depends(get_db)):
    acc = Account(id=str(uuid.uuid4()), phone=phone, status="pending_code")
    db.add(acc); db.commit()
    await MANAGER.send_code(acc.id, acc.phone)
    return RedirectResponse(url=f"/accounts/{acc.id}/verify", status_code=302)

@app.get("/accounts/{account_id}/verify", response_class=HTMLResponse)
def account_verify_form(account_id: str, request: Request, db: Session = Depends(get_db)):
    acc = db.get(Account, account_id)
    return templates.TemplateResponse("account_verify.html", {"request": request, "account": acc})

@app.post("/accounts/{account_id}/verify")
async def account_verify(account_id: str, code: str = Form(...), password: str = Form("") , db: Session = Depends(get_db)):
    acc = db.get(Account, account_id)
    session_str = await MANAGER.verify_code(acc, code, password or None)
    acc.string_session = _xor(session_str, SESSION_SECRET)
    acc.status = "active"
    db.commit()
    return RedirectResponse(url=f"/", status_code=302)

# ---- Campaigns ----
@app.get("/campaigns/new", response_class=HTMLResponse)
def campaign_new(request: Request, db: Session = Depends(get_db)):
    accounts = db.execute(select(Account).where(Account.status=="active")).scalars().all()
    return templates.TemplateResponse("campaign_new.html", {"request": request, "accounts": accounts})

@app.post("/campaigns")
def campaign_create(request: Request, account_id: str = Form(...), name: str = Form(...), interval_seconds: int = Form(...), max_steps: int = Form(...), db: Session = Depends(get_db)):
    camp = Campaign(id=str(uuid.uuid4()), account_id=account_id, name=name, interval_seconds=interval_seconds, max_steps=max_steps, active=True)
    db.add(camp); db.commit()
    return RedirectResponse(url=f"/campaigns/{camp.id}", status_code=302)

@app.get("/campaigns/{campaign_id}", response_class=HTMLResponse)
def campaign_view(campaign_id: str, request: Request, db: Session = Depends(get_db)):
    camp = db.get(Campaign, campaign_id)
    steps = camp.steps if camp else []
    contacts = db.execute(select(Contact).where(Contact.account_id==camp.account_id)).scalars().all() if camp else []
    return templates.TemplateResponse("campaign_view.html", {"request": request, "campaign": camp, "steps": steps, "contacts": contacts})

@app.post("/campaigns/{campaign_id}/steps")
def campaign_add_step(campaign_id: str, step_number: int = Form(...), message: str = Form(...), db: Session = Depends(get_db)):
    s = CampaignStep(id=str(uuid.uuid4()), campaign_id=campaign_id, step_number=step_number, message=message)
    db.add(s); db.commit()
    return RedirectResponse(url=f"/campaigns/{campaign_id}", status_code=302)

# ---- Contacts ----
@app.get("/contacts/new", response_class=HTMLResponse)
def contact_new(request: Request, db: Session = Depends(get_db)):
    accounts = db.execute(select(Account).where(Account.status=="active")).scalars().all()
    return templates.TemplateResponse("contact_new.html", {"request": request, "accounts": accounts})

@app.post("/contacts")
async def contact_create(request: Request, account_id: str = Form(...), identifier: str = Form(...), db: Session = Depends(get_db)):
    """Create contact by resolving username or phone to Telegram user ID"""
    # Get account
    account = db.get(Account, account_id)
    if not account:
        raise HTTPException(404, "Account not found")
    
    try:
        # Resolve identifier to user ID
        from telethon_manager import MANAGER
        telegram_user_id = await MANAGER.resolve_user_identifier(account, identifier.strip())
        
        # Create contact
        c = Contact(id=str(uuid.uuid4()), account_id=account_id, telegram_user_id=telegram_user_id)
        db.add(c)
        db.commit()
        
        return RedirectResponse(url="/", status_code=302)
        
    except ValueError as e:
        # Return error to user
        accounts = db.execute(select(Account).where(Account.status=="active")).scalars().all()
        return templates.TemplateResponse("contact_new.html", {
            "request": request, 
            "accounts": accounts, 
            "error": str(e),
            "identifier": identifier
        })
    except Exception as e:
        raise HTTPException(500, f"Error creating contact: {str(e)}")
