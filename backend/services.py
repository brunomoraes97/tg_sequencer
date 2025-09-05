from __future__ import annotations
from datetime import datetime, timedelta
import uuid
from sqlalchemy import select
from sqlalchemy.orm import Session

# Use absolute imports
from db import SessionLocal
from models import Account, Campaign, CampaignStep, Contact, MessageLog
from telethon_manager import MANAGER

def uuid_str() -> str:
    return str(uuid.uuid4())

def due_contacts(db: Session, campaign: Campaign) -> list[Contact]:
    """Get contacts that are due for next message in this specific campaign"""
    now = datetime.utcnow()
    q = db.execute(select(Contact).where(
        Contact.campaign_id == campaign.id, 
        Contact.replied == False
    ))
    contacts: list[Contact] = list(q.scalars())
    due = []
    for c in contacts:
        if c.current_step > campaign.max_steps:
            continue
        if not c.last_message_at:
            due.append(c)
            continue
        delta = now - c.last_message_at
        if delta.total_seconds() >= campaign.interval_seconds:
            due.append(c)
    return due

async def send_followups_for_account(account: Account):
    client = await MANAGER.get_client(account)
    await MANAGER.ensure_reply_handler(account)

    with SessionLocal() as db:
        db_acc = db.get(Account, account.id)
        if not db_acc or db_acc.status != "active":
            return
        camps = db.execute(select(Campaign).where(Campaign.account_id==account.id, Campaign.active==True)).scalars()
        for camp in camps:
            steps = {s.step_number: s.message for s in camp.steps}
            for c in due_contacts(db, camp):  # Now using campaign-specific contacts
                msg = steps.get(c.current_step)
                if not msg:
                    continue
                try:
                    await client.send_message(c.telegram_user_id, msg)
                    c.current_step += 1
                    c.last_message_at = datetime.utcnow()
                    db.add(MessageLog(
                        id=uuid_str(), 
                        user_id=account.user_id,
                        account_id=account.id, 
                        contact_id=c.id, 
                        step_number=c.current_step-1
                    ))
                    db.commit()
                except Exception as e:
                    # log or mark error; keep going
                    db.commit()
