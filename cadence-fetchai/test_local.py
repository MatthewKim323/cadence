"""
Send a test message directly to the orchestrator to verify the pipeline works locally.
Run this WHILE run_all.py is running, in a separate terminal.
"""
from datetime import datetime
from uuid import uuid4

from uagents import Agent, Context
from uagents_core.contrib.protocols.chat import (
    ChatAcknowledgement,
    ChatMessage,
    TextContent,
)

ORCHESTRATOR = "agent1qf4jwuuge0a6uhyxl32jvw6t6eprexul49cgnz2ffh6z3frlkrg0xffxl66"

client = Agent(
    name="test-client",
    seed="cadence-test-client-temp-seed",
    port=9000,
    endpoint=["http://127.0.0.1:9000/submit"],
)


@client.on_event("startup")
async def send_test(ctx: Context):
    ctx.logger.info(f"Sending test message to orchestrator...")
    await ctx.send(ORCHESTRATOR, ChatMessage(
        timestamp=datetime.now(),
        msg_id=uuid4(),
        content=[TextContent(type="text", text="Write a 100-word essay about why dogs are great")],
    ))
    ctx.logger.info("Message sent! Waiting for response...")


@client.on_message(ChatAcknowledgement)
async def got_ack(ctx: Context, sender: str, msg: ChatAcknowledgement):
    ctx.logger.info(f"Got acknowledgement from orchestrator")


@client.on_message(ChatMessage)
async def got_response(ctx: Context, sender: str, msg: ChatMessage):
    for item in msg.content:
        if isinstance(item, TextContent):
            ctx.logger.info(f"RESPONSE:\n{item.text[:500]}")


if __name__ == "__main__":
    client.run()
