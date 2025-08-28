from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# Account schemas
class AccountCreate(BaseModel):
    phone: str
    name: Optional[str] = None
    tag: Optional[str] = None

class AccountUpdate(BaseModel):
    name: Optional[str] = None
    tag: Optional[str] = None

class AccountVerify(BaseModel):
    code: str
    password: Optional[str] = None

class AccountResponse(BaseModel):
    id: str
    phone: str
    name: Optional[str] = None
    tag: Optional[str] = None
    status: str
    created_at: Optional[datetime]
    
    class Config:
        from_attributes = True

# Campaign schemas
class CampaignStepCreate(BaseModel):
    step_number: int
    message: str

class CampaignStepResponse(BaseModel):
    id: str
    step_number: int
    message: str
    
    class Config:
        from_attributes = True

class CampaignCreate(BaseModel):
    account_id: str
    name: str
    interval_seconds: int = 86400
    max_steps: int = 3

class CampaignUpdate(BaseModel):
    account_id: Optional[str] = None
    name: Optional[str] = None
    interval_seconds: Optional[int] = None
    active: Optional[bool] = None

class CampaignResponse(BaseModel):
    id: str
    account_id: str
    name: str
    interval_seconds: int
    max_steps: int
    active: bool
    steps: List[CampaignStepResponse] = []
    
    class Config:
        from_attributes = True

# Contact schemas
class ContactCreate(BaseModel):
    account_id: str
    identifier: str  # username or phone
    name: Optional[str] = None
    tag: Optional[str] = None
    campaign_id: Optional[str] = None

class ContactUpdate(BaseModel):
    name: Optional[str] = None
    tag: Optional[str] = None
    campaign_id: Optional[str] = None

class UserInfo(BaseModel):
    id: int
    first_name: Optional[str]
    last_name: Optional[str]
    username: Optional[str]
    phone: Optional[str]
    is_bot: bool
    is_verified: bool
    full_name: str

class ContactResponse(BaseModel):
    id: str
    account_id: str
    campaign_id: Optional[str] = None
    telegram_user_id: int
    name: Optional[str] = None
    tag: Optional[str] = None
    current_step: int
    replied: bool
    last_message_at: Optional[datetime]
    user_info: Optional[UserInfo] = None
    next_message_time: Optional[str] = None
    
    class Config:
        from_attributes = True

# Dashboard schema
class DashboardResponse(BaseModel):
    accounts: List[AccountResponse]
    campaigns: List[CampaignResponse] 
    contacts: List[ContactResponse]
