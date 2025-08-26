from pydantic import BaseModel

class AccountCreate(BaseModel):
    phone: str

class VerifyCode(BaseModel):
    account_id: str
    code: str
    password: str | None = None

class CampaignCreate(BaseModel):
    account_id: str
    name: str
    interval_seconds: int
    max_steps: int

class CampaignStepCreate(BaseModel):
    campaign_id: str
    step_number: int
    message: str

class ContactCreate(BaseModel):
    account_id: str
    telegram_user_id: int
