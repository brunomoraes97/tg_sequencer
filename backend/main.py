from __future__ import annotations
import os, uuid
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import select
from datetime import datetime, timedelta
from typing import List

# Use absolute imports
from db import SessionLocal
from models import Account, Campaign, CampaignStep, Contact
from telethon_manager import MANAGER
from schemas import *

app = FastAPI(title="Telegram Follow-up API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Dashboard endpoint
@app.get("/api/dashboard", response_model=DashboardResponse)
async def get_dashboard(db: Session = Depends(get_db)):
    """Get complete dashboard data with enriched contact information"""
    
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
            enriched_contacts.append(ContactResponse(
                id=contact.id,
                account_id=contact.account_id,
                telegram_user_id=contact.telegram_user_id,
                name=contact.name,
                tag=contact.tag,
                current_step=contact.current_step,
                replied=contact.replied,
                last_message_at=contact.last_message_at
            ))
            continue
            
        # Get user info from Telegram
        try:
            user_info_dict = await MANAGER.get_user_info(account, contact.telegram_user_id)
            user_info = UserInfo(**user_info_dict)
        except:
            user_info = UserInfo(
                id=contact.telegram_user_id,
                first_name=None,
                last_name=None,
                username=None,
                phone=None,
                is_bot=False,
                is_verified=False,
                full_name=f"User {contact.telegram_user_id}"
            )
        
        # Calculate next message time
        campaign = next((c for c in campaigns if c.account_id == contact.account_id and c.active), None)
        next_message_time = None
        if campaign and contact.last_message_at and not contact.replied and contact.current_step <= campaign.max_steps:
            next_time = contact.last_message_at + timedelta(seconds=campaign.interval_seconds)
            next_message_time = next_time.isoformat()
        elif campaign and not contact.last_message_at and not contact.replied:
            next_message_time = "now"
            
        enriched_contacts.append(ContactResponse(
            id=contact.id,
            account_id=contact.account_id,
            telegram_user_id=contact.telegram_user_id,
            name=contact.name,
            tag=contact.tag,
            current_step=contact.current_step,
            replied=contact.replied,
            last_message_at=contact.last_message_at,
            user_info=user_info,
            next_message_time=next_message_time
        ))
    
    return DashboardResponse(
        accounts=[AccountResponse.from_orm(acc) for acc in accounts],
        campaigns=[CampaignResponse.from_orm(camp) for camp in campaigns],
        contacts=enriched_contacts
    )

# Account endpoints
@app.post("/api/accounts", response_model=AccountResponse)
async def create_account(account_data: AccountCreate, db: Session = Depends(get_db)):
    """Create new account and send verification code"""
    acc = Account(id=str(uuid.uuid4()), phone=account_data.phone, status="pending_code")
    db.add(acc)
    db.commit()
    
    try:
        await MANAGER.send_code(acc.id, acc.phone)
        return AccountResponse.from_orm(acc)
    except Exception as e:
        db.delete(acc)
        db.commit()
        raise HTTPException(500, f"Error sending code: {str(e)}")

@app.post("/api/accounts/{account_id}/verify", response_model=AccountResponse)
async def verify_account(account_id: str, verify_data: AccountVerify, db: Session = Depends(get_db)):
    """Verify account with SMS code"""
    acc = db.get(Account, account_id)
    if not acc:
        raise HTTPException(404, "Account not found")
    
    try:
        session_str = await MANAGER.verify_code(acc.id, verify_data.code, verify_data.password)
        acc.string_session = session_str
        acc.status = "active"
        db.commit()
        return AccountResponse.from_orm(acc)
    except Exception as e:
        raise HTTPException(400, f"Verification failed: {str(e)}")

@app.get("/api/accounts", response_model=List[AccountResponse])
def get_accounts(db: Session = Depends(get_db)):
    """Get all accounts"""
    accounts = db.execute(select(Account)).scalars().all()
    return [AccountResponse.from_orm(acc) for acc in accounts]

@app.put("/api/accounts/{account_id}", response_model=AccountResponse)
def update_account(account_id: str, account_data: AccountUpdate, db: Session = Depends(get_db)):
    """Update account name and tag"""
    acc = db.get(Account, account_id)
    if not acc:
        raise HTTPException(404, "Account not found")
    
    if account_data.name is not None:
        acc.name = account_data.name
    if account_data.tag is not None:
        acc.tag = account_data.tag
    acc.updated_at = datetime.utcnow()
    db.commit()
    return AccountResponse.from_orm(acc)

@app.delete("/api/accounts/{account_id}")
def delete_account(account_id: str, db: Session = Depends(get_db)):
    """Delete account and all related data"""
    acc = db.get(Account, account_id)
    if not acc:
        raise HTTPException(404, "Account not found")
    
    # Delete related campaigns and contacts
    campaigns = db.execute(select(Campaign).where(Campaign.account_id == account_id)).scalars().all()
    for campaign in campaigns:
        # Delete campaign steps
        steps = db.execute(select(CampaignStep).where(CampaignStep.campaign_id == campaign.id)).scalars().all()
        for step in steps:
            db.delete(step)
        db.delete(campaign)
    
    # Delete contacts
    contacts = db.execute(select(Contact).where(Contact.account_id == account_id)).scalars().all()
    for contact in contacts:
        db.delete(contact)
    
    db.delete(acc)
    db.commit()
    return {"message": "Account deleted successfully"}

# Campaign endpoints
@app.post("/api/campaigns", response_model=CampaignResponse)
def create_campaign(campaign_data: CampaignCreate, db: Session = Depends(get_db)):
    """Create new campaign"""
    camp = Campaign(
        id=str(uuid.uuid4()),
        account_id=campaign_data.account_id,
        name=campaign_data.name,
        interval_seconds=campaign_data.interval_seconds,
        max_steps=campaign_data.max_steps
    )
    db.add(camp)
    db.commit()
    return CampaignResponse.from_orm(camp)

@app.get("/api/campaigns", response_model=List[CampaignResponse])
def get_campaigns(db: Session = Depends(get_db)):
    """Get all campaigns with steps"""
    campaigns = db.execute(select(Campaign)).scalars().all()
    return [CampaignResponse.from_orm(camp) for camp in campaigns]

@app.put("/api/campaigns/{campaign_id}", response_model=CampaignResponse)
def update_campaign(campaign_id: str, campaign_data: CampaignCreate, db: Session = Depends(get_db)):
    """Update campaign"""
    camp = db.get(Campaign, campaign_id)
    if not camp:
        raise HTTPException(404, "Campaign not found")
    
    camp.name = campaign_data.name
    camp.interval_seconds = campaign_data.interval_seconds
    # Remove max_steps update since it's determined by steps count
    db.commit()
    return CampaignResponse.from_orm(camp)

@app.delete("/api/campaigns/{campaign_id}")
def delete_campaign(campaign_id: str, db: Session = Depends(get_db)):
    """Delete campaign and all its steps"""
    camp = db.get(Campaign, campaign_id)
    if not camp:
        raise HTTPException(404, "Campaign not found")
    
    # Delete all steps
    steps = db.execute(select(CampaignStep).where(CampaignStep.campaign_id == campaign_id)).scalars().all()
    for step in steps:
        db.delete(step)
    
    db.delete(camp)
    db.commit()
    return {"message": "Campaign deleted successfully"}

@app.get("/api/campaigns/{campaign_id}", response_model=CampaignResponse)
def get_campaign(campaign_id: str, db: Session = Depends(get_db)):
    """Get specific campaign with steps"""
    camp = db.get(Campaign, campaign_id)
    if not camp:
        raise HTTPException(404, "Campaign not found")
    return CampaignResponse.from_orm(camp)

@app.post("/api/campaigns/{campaign_id}/steps", response_model=CampaignStepResponse)
def add_campaign_step(campaign_id: str, step_data: CampaignStepCreate, db: Session = Depends(get_db)):
    """Add step to campaign"""
    step = CampaignStep(
        id=str(uuid.uuid4()),
        campaign_id=campaign_id,
        step_number=step_data.step_number,
        message=step_data.message
    )
    db.add(step)
    db.commit()
    return CampaignStepResponse.from_orm(step)

# Contact endpoints
@app.post("/api/contacts", response_model=ContactResponse)
async def create_contact(contact_data: ContactCreate, db: Session = Depends(get_db)):
    """Create contact by resolving username or phone to Telegram user ID"""
    # Get account
    account = db.get(Account, contact_data.account_id)
    if not account:
        raise HTTPException(404, "Account not found")
    
    try:
        # Resolve identifier to user ID
        telegram_user_id = await MANAGER.resolve_user_identifier(account, contact_data.identifier.strip())
        
        # Create contact
        contact = Contact(
            id=str(uuid.uuid4()),
            account_id=contact_data.account_id,
            telegram_user_id=telegram_user_id,
            name=contact_data.name,
            tag=contact_data.tag
        )
        db.add(contact)
        db.commit()
        
        return ContactResponse.from_orm(contact)
        
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Error creating contact: {str(e)}")

@app.get("/api/contacts", response_model=List[ContactResponse])
def get_contacts(db: Session = Depends(get_db)):
    """Get all contacts"""
    contacts = db.execute(select(Contact)).scalars().all()
    return [ContactResponse.from_orm(contact) for contact in contacts]

@app.put("/api/contacts/{contact_id}", response_model=ContactResponse)
def update_contact(contact_id: str, contact_data: ContactUpdate, db: Session = Depends(get_db)):
    """Update contact name and tag"""
    contact = db.get(Contact, contact_id)
    if not contact:
        raise HTTPException(404, "Contact not found")
    
    if contact_data.name is not None:
        contact.name = contact_data.name
    if contact_data.tag is not None:
        contact.tag = contact_data.tag
    db.commit()
    return ContactResponse.from_orm(contact)

@app.delete("/api/contacts/{contact_id}")
def delete_contact(contact_id: str, db: Session = Depends(get_db)):
    """Delete contact"""
    contact = db.get(Contact, contact_id)
    if not contact:
        raise HTTPException(404, "Contact not found")
    
    db.delete(contact)
    db.commit()
    return {"message": "Contact deleted successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
