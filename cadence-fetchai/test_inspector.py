"""Minimal agent to test if the Inspector can find it."""
from uagents import Agent, Context, Model

class Message(Model):
    message: str

agent = Agent(
    name="InspectorTest",
    port=8001,
    seed="inspector-test-seed-12345",
    endpoint=["http://127.0.0.1:8001/submit"],
)

@agent.on_event("startup")
async def startup(ctx: Context):
    ctx.logger.info(f"Address: {agent.address}")
    ctx.logger.info("Try the Inspector link above in your browser.")

if __name__ == "__main__":
    agent.run()
