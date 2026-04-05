#!/usr/bin/env python3
"""
Send a ChatMessage to the orchestrator via the Almanac resolver
(same path ASI:One would use). Keep the orchestrator STOPPED so
the message should queue in the mailbox.
"""
import asyncio
import os
import sys
from datetime import datetime
from uuid import uuid4

from dotenv import load_dotenv
load_dotenv()

sys.path.insert(0, os.path.dirname(__file__))

from uagents import Agent, Context
from uagents_core.contrib.protocols.chat import (
    ChatAcknowledgement,
    ChatMessage,
    TextContent,
)

ORCHESTRATOR_ADDR = "agent1qf4jwuuge0a6uhyxl32jvw6t6eprexul49cgnz2ffh6z3frlkrg0xffxl66"

agent = Agent(
    name="mailbox-test-sender",
    seed="debug-mailbox-test-sender-seed-unique-12345",
    port=9090,
    endpoint=["http://127.0.0.1:9090/submit"],
)


@agent.on_event("startup")
async def send_test(ctx: Context):
    msg = ChatMessage(
        timestamp=datetime.utcnow(),
        msg_id=uuid4(),
        content=[TextContent(type="text", text="Hello from mailbox test sender! Write me a haiku about the ocean.")],
    )
    ctx.logger.info(f"Sending ChatMessage to orchestrator at {ORCHESTRATOR_ADDR}")
    try:
        await ctx.send(ORCHESTRATOR_ADDR, msg)
        ctx.logger.info("Message sent! Check if it appears in mailbox poll.")
    except Exception as e:
        ctx.logger.error(f"Send failed: {e}")


@agent.on_message(ChatAcknowledgement)
async def handle_ack(ctx: Context, sender: str, msg: ChatAcknowledgement):
    ctx.logger.info(f"Got ACK from {sender[:20]}...")


@agent.on_message(ChatMessage)
async def handle_response(ctx: Context, sender: str, msg: ChatMessage):
    for item in msg.content:
        if isinstance(item, TextContent):
            ctx.logger.info(f"RESPONSE: {item.text[:200]}")


agent.run()
