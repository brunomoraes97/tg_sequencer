from __future__ import annotations
import os, asyncio, uuid
from typing import Dict
from telethon import TelegramClient, events
from telethon.sessions import StringSession
from telethon.errors import SessionPasswordNeededError
from sqlalchemy import select
from sqlalchemy.orm import Session

# Use absolute imports
from db import SessionLocal
from models import Account, Contact

API_ID = int(os.getenv("TG_API_ID", "0"))
API_HASH = os.getenv("TG_API_HASH", "")
SESSION_SECRET = os.getenv("SESSION_SECRET", "")

# --- Simple base64 encoding to avoid null characters ---
import base64

def _xor(data: str, key: str) -> str:
    if not key:
        return data
    
    # For now, just use base64 to avoid null character issues
    # In production, replace with proper encryption like Fernet
    try:
        # If data looks like base64, decode it
        if len(data) % 4 == 0 and all(c in 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=' for c in data):
            return base64.b64decode(data).decode('utf-8')
    except:
        pass
    
    # Encode to base64
    return base64.b64encode(data.encode('utf-8')).decode('ascii')

class TelethonManager:
    def __init__(self):
        self.clients: Dict[str, TelegramClient] = {}
        self.login_clients: Dict[str, TelegramClient] = {}  # temporary during login
        self.phone_code_hashes: Dict[str, str] = {}  # store phone_code_hash
        self.reply_handlers_installed: set[str] = set()
        self._lock = asyncio.Lock()

    async def _create_client_from_session(self, session_str: str | None) -> TelegramClient:
        session = StringSession(session_str or None)
        client = TelegramClient(session, API_ID, API_HASH)
        await client.connect()
        return client

    async def send_code(self, account_id: str, phone: str) -> None:
        client = await self._create_client_from_session(None)
        result = await client.send_code_request(phone)
        self.login_clients[account_id] = client
        self.phone_code_hashes[account_id] = result.phone_code_hash

    async def verify_code(self, account: Account, code: str, password: str | None) -> str:
        client = self.login_clients.get(account.id)
        phone_code_hash = self.phone_code_hashes.get(account.id)
        
        if not client or not phone_code_hash:
            raise ValueError("Login session not found. Please request code again.")
        
        try:
            try:
                await client.sign_in(account.phone, code, phone_code_hash=phone_code_hash)
            except SessionPasswordNeededError:
                if not password:
                    raise
                await client.sign_in(password=password)
        finally:
            pass
        
        session_str = client.session.save()
        await client.disconnect()
        
        # Cleanup
        self.login_clients.pop(account.id, None)
        self.phone_code_hashes.pop(account.id, None)
        
        return session_str

    async def get_client(self, account: Account) -> TelegramClient:
        async with self._lock:
            if account.id in self.clients:
                return self.clients[account.id]
            # decrypt and start client
            session_str = _xor(account.string_session or "", SESSION_SECRET)
            client = await self._create_client_from_session(session_str)
            self.clients[account.id] = client
            return client

    async def resolve_user_identifier(self, account: Account, identifier: str) -> int:
        """
        Resolve username (@user) or phone (+5511999999999) to Telegram user ID
        """
        client = await self.get_client(account)
        try:
            entity = await client.get_entity(identifier)
            return entity.id
        except Exception as e:
            raise ValueError(f"Could not find user '{identifier}': {str(e)}")

    async def get_user_info(self, account: Account, user_id: int) -> dict:
        """
        Get detailed information about a Telegram user
        """
        client = await self.get_client(account)
        try:
            user = await client.get_entity(user_id)
            return {
                'id': user.id,
                'first_name': getattr(user, 'first_name', None),
                'last_name': getattr(user, 'last_name', None),
                'username': getattr(user, 'username', None),
                'phone': getattr(user, 'phone', None),
                'is_bot': getattr(user, 'bot', False),
                'is_verified': getattr(user, 'verified', False),
                'full_name': f"{getattr(user, 'first_name', '')} {getattr(user, 'last_name', '')}".strip()
            }
        except Exception as e:
            return {
                'id': user_id,
                'first_name': None,
                'last_name': None,
                'username': None,
                'phone': None,
                'is_bot': False,
                'is_verified': False,
                'full_name': f"User {user_id}",
                'error': str(e)
            }

    async def ensure_reply_handler(self, account: Account):
        if account.id in self.reply_handlers_installed:
            return
        client = await self.get_client(account)
        # mark replies
        @client.on(events.NewMessage(incoming=True))
        async def _(event):
            uid = int(event.sender_id)
            with SessionLocal() as db:
                q = db.execute(select(Contact).where(Contact.account_id==account.id, Contact.telegram_user_id==uid))
                c = q.scalar_one_or_none()
                if c and not c.replied:
                    c.replied = True
                    db.commit()
        self.reply_handlers_installed.add(account.id)

MANAGER = TelethonManager()
