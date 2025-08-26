from __future__ import annotations
import asyncio, os
from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select

# Use absolute imports
from db import SessionLocal
from models import Account
from services import send_followups_for_account

async def tick():
    with SessionLocal() as db:
        accs = db.execute(select(Account).where(Account.status=="active")).scalars().all()
        for acc in accs:
            await send_followups_for_account(acc)

async def main():
    scheduler = AsyncIOScheduler()
    interval = int(os.getenv("WORKER_TICK", "30"))  # seconds
    scheduler.add_job(tick, "interval", seconds=interval, id="tick")
    scheduler.start()
    print(f"[worker] started, tick={interval}s")
    try:
        await asyncio.Event().wait()
    finally:
        scheduler.shutdown(wait=False)

if __name__ == "__main__":
    asyncio.run(main())
