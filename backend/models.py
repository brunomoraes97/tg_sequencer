from __future__ import annotations
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, DateTime, BigInteger, ForeignKey, Text
from sqlalchemy.orm import relationship
from db import Base, engine

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True)               # uuid string
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

    accounts = relationship("Account", back_populates="user")

class Account(Base):
    __tablename__ = "accounts"
    id = Column(String, primary_key=True)               # uuid string
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    phone = Column(String, nullable=False)
    name = Column(String, nullable=True)                # user-friendly name
    tag = Column(String, nullable=True)                 # user tag/label
    status = Column(String, default="pending_code")    # pending_code|active|error
    string_session = Column(Text)                       # encrypted string session
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="accounts")
    campaigns = relationship("Campaign", back_populates="account")

class Campaign(Base):
    __tablename__ = "campaigns"
    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    account_id = Column(String, ForeignKey("accounts.id"), nullable=False)
    name = Column(String, nullable=False)
    interval_seconds = Column(Integer, default=86400)
    max_steps = Column(Integer, default=3)
    active = Column(Boolean, default=True)

    account = relationship("Account", back_populates="campaigns")
    steps = relationship("CampaignStep", back_populates="campaign", order_by="CampaignStep.step_number")
    contacts = relationship("Contact", back_populates="campaign")

class CampaignStep(Base):
    __tablename__ = "campaign_steps"
    id = Column(String, primary_key=True)
    campaign_id = Column(String, ForeignKey("campaigns.id"), nullable=False)
    step_number = Column(Integer, nullable=False)
    message = Column(Text, nullable=False)
    # Optional per-step interval; if null, fall back to campaign.interval_seconds
    interval_seconds = Column(Integer, nullable=True)

    campaign = relationship("Campaign", back_populates="steps")

class Contact(Base):
    __tablename__ = "contacts"
    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    account_id = Column(String, ForeignKey("accounts.id"), nullable=False)
    campaign_id = Column(String, ForeignKey("campaigns.id"), nullable=True)  # specific campaign assignment
    telegram_user_id = Column(BigInteger, nullable=False)
    name = Column(String, nullable=True)                # user-friendly name
    tag = Column(String, nullable=True)                 # user tag/label
    replied = Column(Boolean, default=False)
    current_step = Column(Integer, default=1)
    last_message_at = Column(DateTime, nullable=True)

    campaign = relationship("Campaign", back_populates="contacts")

class MessageLog(Base):
    __tablename__ = "messages_sent"
    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    account_id = Column(String, ForeignKey("accounts.id"), nullable=False)
    contact_id = Column(String, ForeignKey("contacts.id"), nullable=False)
    step_number = Column(Integer, nullable=False)
    sent_at = Column(DateTime, default=datetime.utcnow)

# create tables on first run
Base.metadata.create_all(bind=engine)
