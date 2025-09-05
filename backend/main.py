from __future__ import annotations
import os, uuid
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import select, delete
from datetime import datetime, timedelta
from typing import List

# Use absolute imports
from db import SessionLocal
from models import User, Account, Campaign, CampaignStep, Contact, MessageLog
from telethon_manager import MANAGER, _xor, SESSION_SECRET
from schemas import *
from auth import (
    get_password_hash, 
    verify_password, 
    create_access_token, 
    get_current_active_user, 
    ACCESS_TOKEN_EXPIRE_MINUTES
)

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

# Auth endpoints
@app.post("/api/auth/register", response_model=UserResponse)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    # Check if user already exists
    existing_user = db.execute(select(User).where(User.email == user_data.email)).scalar_one_or_none()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    user = User(
        id=str(uuid.uuid4()),
        email=user_data.email,
        hashed_password=hashed_password
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return UserResponse.model_validate(user)

@app.post("/api/auth/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login user and return access token"""
    user = db.execute(select(User).where(User.email == form_data.username)).scalar_one_or_none()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """Get current user information"""
    return UserResponse.model_validate(current_user)

# Dashboard endpoint
@app.get("/api/dashboard", response_model=DashboardResponse)
async def get_dashboard(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """Get complete dashboard data with enriched contact information for current user"""
    
    # Get data filtered by user
    accounts = db.execute(select(Account).where(Account.user_id == current_user.id)).scalars().all()
    campaigns = db.execute(select(Campaign).where(Campaign.user_id == current_user.id)).scalars().all()
    contacts = db.execute(select(Contact).where(Contact.user_id == current_user.id)).scalars().all()
    
    # Enrich contacts with user info and next message time
    enriched_contacts = []
    for contact in contacts:
        # Get account for this contact
        account = next((acc for acc in accounts if acc.id == contact.account_id), None)
        if not account or account.status != "active":
            enriched_contacts.append(ContactResponse(
                id=contact.id,
                user_id=contact.user_id,
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
            user_id=contact.user_id,
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
        accounts=[AccountResponse.model_validate(acc) for acc in accounts],
        campaigns=[CampaignResponse.model_validate(camp) for camp in campaigns],
        contacts=enriched_contacts
    )

# Account endpoints
@app.post("/api/accounts", response_model=AccountResponse)
async def create_account(account_data: AccountCreate, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """Create new account and send verification code"""
    acc = Account(
        id=str(uuid.uuid4()), 
        user_id=current_user.id,
        phone=account_data.phone, 
        status="pending_code"
    )
    db.add(acc)
    db.commit()
    
    try:
        await MANAGER.send_code(acc.id, acc.phone)
        return AccountResponse.model_validate(acc)
    except Exception as e:
        db.delete(acc)
        db.commit()
        raise HTTPException(500, f"Error sending code: {str(e)}")

@app.post("/api/accounts/{account_id}/verify", response_model=AccountResponse)
async def verify_account(account_id: str, verify_data: AccountVerify, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """Verify account with SMS code"""
    print(f"Verifying account {account_id} for user {current_user.id}")
    print(f"Verify data: code={verify_data.code}, password={'***' if verify_data.password else None}")
    
    acc = db.execute(select(Account).where(Account.id == account_id, Account.user_id == current_user.id)).scalar_one_or_none()
    if not acc:
        print(f"Account not found: {account_id}")
        raise HTTPException(404, "Account not found")
    
    print(f"Found account: {acc.phone}, status: {acc.status}")
    
    try:
        session_str = await MANAGER.verify_code(acc, verify_data.code, verify_data.password)
        # Store encoded session string for safety/compatibility
        acc.string_session = _xor(session_str, SESSION_SECRET)
        acc.status = "active"
        db.commit()
        print(f"Verification successful for account {account_id}")
        return AccountResponse.model_validate(acc)
    except Exception as e:
        print(f"Verification failed for account {account_id}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(400, f"Verification failed: {str(e)}")

@app.get("/api/accounts", response_model=List[AccountResponse])
def get_accounts(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """Get all accounts for current user"""
    accounts = db.execute(select(Account).where(Account.user_id == current_user.id)).scalars().all()
    return [AccountResponse.model_validate(acc) for acc in accounts]

@app.put("/api/accounts/{account_id}", response_model=AccountResponse)
def update_account(account_id: str, account_data: AccountUpdate, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """Update account name and tag"""
    acc = db.execute(select(Account).where(Account.id == account_id, Account.user_id == current_user.id)).scalar_one_or_none()
    if not acc:
        raise HTTPException(404, "Account not found")
    
    if account_data.name is not None:
        acc.name = account_data.name
    if account_data.tag is not None:
        acc.tag = account_data.tag
    acc.updated_at = datetime.utcnow()
    db.commit()
    return AccountResponse.model_validate(acc)

@app.delete("/api/accounts/{account_id}")
def delete_account(account_id: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """Delete account and all related data"""
    acc = db.execute(select(Account).where(Account.id == account_id, Account.user_id == current_user.id)).scalar_one_or_none()
    if not acc:
        raise HTTPException(404, "Account not found")
    
    # Delete related campaigns and contacts
    campaigns = db.execute(select(Campaign).where(Campaign.account_id == account_id, Campaign.user_id == current_user.id)).scalars().all()
    for campaign in campaigns:
        # Delete campaign steps
        steps = db.execute(select(CampaignStep).where(CampaignStep.campaign_id == campaign.id)).scalars().all()
        for step in steps:
            db.delete(step)
        db.delete(campaign)
    
    # Delete contacts
    contacts = db.execute(select(Contact).where(Contact.account_id == account_id, Contact.user_id == current_user.id)).scalars().all()
    for contact in contacts:
        db.delete(contact)
    
    db.delete(acc)
    db.commit()
    return {"message": "Account deleted successfully"}

# Campaign endpoints
@app.post("/api/campaigns", response_model=CampaignResponse)
def create_campaign(campaign_data: CampaignCreate, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """Create new campaign"""
    # Verify account belongs to current user
    account = db.execute(select(Account).where(Account.id == campaign_data.account_id, Account.user_id == current_user.id)).scalar_one_or_none()
    if not account:
        raise HTTPException(404, "Account not found")
    
    camp = Campaign(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        account_id=campaign_data.account_id,
        name=campaign_data.name,
        interval_seconds=campaign_data.interval_seconds,
        max_steps=campaign_data.max_steps
    )
    db.add(camp)
    db.commit()
    return CampaignResponse.model_validate(camp)

@app.get("/api/campaigns", response_model=List[CampaignResponse])
def get_campaigns(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """Get all campaigns with steps for current user"""
    campaigns = db.execute(select(Campaign).where(Campaign.user_id == current_user.id)).scalars().all()
    return [CampaignResponse.model_validate(camp) for camp in campaigns]

@app.put("/api/campaigns/{campaign_id}", response_model=CampaignResponse)
def update_campaign(campaign_id: str, campaign_data: CampaignUpdate, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """Update campaign"""
    camp = db.execute(select(Campaign).where(Campaign.id == campaign_id, Campaign.user_id == current_user.id)).scalar_one_or_none()
    if not camp:
        raise HTTPException(404, "Campaign not found")
    
    # Update only provided fields
    if campaign_data.name is not None:
        camp.name = campaign_data.name
    if campaign_data.interval_seconds is not None:
        camp.interval_seconds = campaign_data.interval_seconds
    if campaign_data.active is not None:
        camp.active = campaign_data.active
    if campaign_data.account_id is not None:
        # Verify new account belongs to current user
        account = db.execute(select(Account).where(Account.id == campaign_data.account_id, Account.user_id == current_user.id)).scalar_one_or_none()
        if not account:
            raise HTTPException(400, "Account not found or doesn't belong to you")
        camp.account_id = campaign_data.account_id
    
    db.commit()
    return CampaignResponse.model_validate(camp)

@app.delete("/api/campaigns/{campaign_id}")
def delete_campaign(campaign_id: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """Delete campaign and all its steps"""
    camp = db.execute(select(Campaign).where(Campaign.id == campaign_id, Campaign.user_id == current_user.id)).scalar_one_or_none()
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
def get_campaign(campaign_id: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """Get specific campaign with steps"""
    camp = db.execute(select(Campaign).where(Campaign.id == campaign_id, Campaign.user_id == current_user.id)).scalar_one_or_none()
    if not camp:
        raise HTTPException(404, "Campaign not found")
    return CampaignResponse.model_validate(camp)

@app.post("/api/campaigns/{campaign_id}/steps", response_model=CampaignStepResponse)
def add_campaign_step(campaign_id: str, step_data: CampaignStepCreate, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """Add step to campaign"""
    # Verify campaign belongs to current user
    campaign = db.execute(select(Campaign).where(Campaign.id == campaign_id, Campaign.user_id == current_user.id)).scalar_one_or_none()
    if not campaign:
        raise HTTPException(404, "Campaign not found")
    
    step = CampaignStep(
        id=str(uuid.uuid4()),
        campaign_id=campaign_id,
        step_number=step_data.step_number,
        message=step_data.message
    )
    db.add(step)
    db.commit()
    return CampaignStepResponse.model_validate(step)

@app.put("/api/campaigns/{campaign_id}/steps/{step_id}", response_model=CampaignStepResponse)
def update_campaign_step(campaign_id: str, step_id: str, step_data: CampaignStepCreate, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """Update campaign step"""
    # Verify campaign belongs to current user
    campaign = db.execute(select(Campaign).where(Campaign.id == campaign_id, Campaign.user_id == current_user.id)).scalar_one_or_none()
    if not campaign:
        raise HTTPException(404, "Campaign not found")
    
    step = db.get(CampaignStep, step_id)
    if not step or step.campaign_id != campaign_id:
        raise HTTPException(404, "Step not found")
    
    step.step_number = step_data.step_number
    step.message = step_data.message
    db.commit()
    return CampaignStepResponse.model_validate(step)

@app.delete("/api/campaigns/{campaign_id}/steps/{step_id}")
def delete_campaign_step(campaign_id: str, step_id: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """Delete campaign step"""
    # Verify campaign belongs to current user
    campaign = db.execute(select(Campaign).where(Campaign.id == campaign_id, Campaign.user_id == current_user.id)).scalar_one_or_none()
    if not campaign:
        raise HTTPException(404, "Campaign not found")
    
    step = db.get(CampaignStep, step_id)
    if not step or step.campaign_id != campaign_id:
        raise HTTPException(404, "Step not found")
    
    db.delete(step)
    db.commit()
    return {"message": "Step deleted successfully"}

@app.post("/api/campaigns/{campaign_id}/contacts/{contact_id}")
def assign_contact_to_campaign(campaign_id: str, contact_id: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """Assign contact to campaign"""
    campaign = db.execute(select(Campaign).where(Campaign.id == campaign_id, Campaign.user_id == current_user.id)).scalar_one_or_none()
    contact = db.execute(select(Contact).where(Contact.id == contact_id, Contact.user_id == current_user.id)).scalar_one_or_none()
    
    if not campaign:
        raise HTTPException(404, "Campaign not found")
    if not contact:
        raise HTTPException(404, "Contact not found")
    if contact.account_id != campaign.account_id:
        raise HTTPException(400, "Contact and campaign must belong to the same account")
    
    contact.campaign_id = campaign_id
    contact.current_step = 1
    contact.replied = False
    contact.last_message_at = None
    db.commit()
    
    return {"message": "Contact assigned to campaign successfully"}

@app.delete("/api/campaigns/{campaign_id}/contacts/{contact_id}")
def remove_contact_from_campaign(campaign_id: str, contact_id: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """Remove contact from campaign"""
    # Verify campaign belongs to current user
    campaign = db.execute(select(Campaign).where(Campaign.id == campaign_id, Campaign.user_id == current_user.id)).scalar_one_or_none()
    if not campaign:
        raise HTTPException(404, "Campaign not found")
    
    contact = db.execute(select(Contact).where(Contact.id == contact_id, Contact.user_id == current_user.id, Contact.campaign_id == campaign_id)).scalar_one_or_none()
    if not contact:
        raise HTTPException(404, "Contact not found in this campaign")
    
    contact.campaign_id = None
    db.commit()
    
    return {"message": "Contact removed from campaign successfully"}

# Contact endpoints
@app.get("/api/debug/user-info")
def debug_user_info(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """Debug endpoint to show current user and their accounts"""
    accounts = db.execute(select(Account).where(Account.user_id == current_user.id)).scalars().all()
    return {
        "user_id": current_user.id,
        "user_email": current_user.email,
        "accounts": [{"id": acc.id, "phone": acc.phone, "status": acc.status} for acc in accounts]
    }

@app.post("/api/contacts", response_model=ContactResponse)
async def create_contact(contact_data: ContactCreate, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """Create contact by resolving username or phone to Telegram user ID"""
    # SECURITY: Validate account ownership FIRST - NEVER allow cross-user access
    account = db.execute(select(Account).where(Account.id == contact_data.account_id, Account.user_id == current_user.id)).scalar_one_or_none()
    if not account:
        # Log security violation attempt
        import sys
        sys.stderr.write(f"SECURITY VIOLATION: User {current_user.id} ({current_user.email}) attempted to use account {contact_data.account_id} that doesn't belong to them\n")
        sys.stderr.flush()
        raise HTTPException(status_code=403, detail="Access denied: Account does not belong to current user")
    
    # Verify campaign belongs to current user if specified
    if contact_data.campaign_id:
        campaign = db.execute(select(Campaign).where(Campaign.id == contact_data.campaign_id, Campaign.user_id == current_user.id)).scalar_one_or_none()
        if not campaign:
            raise HTTPException(status_code=403, detail="Access denied: Campaign does not belong to current user")
    # Verify campaign belongs to current user if specified
    if contact_data.campaign_id:
        campaign = db.execute(select(Campaign).where(Campaign.id == contact_data.campaign_id, Campaign.user_id == current_user.id)).scalar_one_or_none()
        if not campaign:
            raise HTTPException(status_code=403, detail="Access denied: Campaign does not belong to current user")

    try:
        # Resolve identifier to user ID
        telegram_user_id = await MANAGER.resolve_user_identifier(account, contact_data.identifier.strip())
        
        # Create contact
        contact = Contact(
            id=str(uuid.uuid4()),
            user_id=current_user.id,
            account_id=contact_data.account_id,
            campaign_id=contact_data.campaign_id,
            telegram_user_id=telegram_user_id,
            name=contact_data.name,
            tag=contact_data.tag
        )
        db.add(contact)
        db.commit()
        
        return ContactResponse.model_validate(contact)
        
    except ValueError as e:
        # Surface clear session/identifier errors to the client
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import sys
        sys.stderr.write(f"Unexpected error creating contact: {str(e)}\n")
        sys.stderr.flush()
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/contacts", response_model=List[ContactResponse])
def get_contacts(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """Get all contacts for current user"""
    contacts = db.execute(select(Contact).where(Contact.user_id == current_user.id)).scalars().all()
    return [ContactResponse.model_validate(contact) for contact in contacts]

@app.put("/api/contacts/{contact_id}", response_model=ContactResponse)
def update_contact(contact_id: str, contact_data: ContactUpdate, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """Update contact name, tag and campaign assignment"""
    contact = db.execute(select(Contact).where(Contact.id == contact_id, Contact.user_id == current_user.id)).scalar_one_or_none()
    if not contact:
        raise HTTPException(404, "Contact not found")
    
    if contact_data.name is not None:
        contact.name = contact_data.name
    if contact_data.tag is not None:
        contact.tag = contact_data.tag
    if contact_data.campaign_id is not None:
        # Verify campaign belongs to current user and same account
        if contact_data.campaign_id:
            campaign = db.execute(select(Campaign).where(Campaign.id == contact_data.campaign_id, Campaign.user_id == current_user.id)).scalar_one_or_none()
            if not campaign or campaign.account_id != contact.account_id:
                raise HTTPException(400, "Campaign not found or doesn't belong to the same account")
        contact.campaign_id = contact_data.campaign_id
        # Reset progress when assigned to new campaign
        if contact_data.campaign_id:
            contact.current_step = 1
            contact.replied = False
            contact.last_message_at = None
    
    db.commit()
    return ContactResponse.model_validate(contact)

@app.delete("/api/contacts/{contact_id}")
def delete_contact(contact_id: str, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """Delete contact"""
    contact = db.execute(select(Contact).where(Contact.id == contact_id, Contact.user_id == current_user.id)).scalar_one_or_none()
    if not contact:
        raise HTTPException(404, "Contact not found")
    
    # Delete related messages first
    db.execute(delete(MessageLog).where(MessageLog.contact_id == contact_id, MessageLog.user_id == current_user.id))
    
    # Delete the contact
    db.delete(contact)
    db.commit()
    return {"message": "Contact deleted successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
