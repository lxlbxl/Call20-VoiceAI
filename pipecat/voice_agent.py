"""
Call20 — Pipecat Voice Agent (Phase 2)
Handles inbound calls via SIP, runs the voice pipeline with STT → LLM → TTS.
"""
import asyncio
import json
import os
import uuid
import httpx

from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineTask
from pipecat.processors.frameworks.openai import OpenAILLMContext
from pipecat.transports.services.websocket import WebsocketTransport, WebsocketParams
from pipecat.services.cartesia import CartesiaTTSService
from pipecat.services.deepgram import DeepgramSTTService
from pipecat.services.google import GoogleLLMService
from pipecat.transports.services.daily import DailyParams, DailyTransport
from pipecat.transports.services.websocket import WebsocketParams

import aiohttp

# ── Configuration ─────────────────────────────────────────────────────────────

API_BASE_URL = os.getenv("CALL20_API_URL", "http://localhost:8000/api/v1")
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY", "")
CARTESIA_API_KEY = os.getenv("CARTESIA_API_KEY", "")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
DIDWW_API_KEY = os.getenv("DIDWW_API_KEY", "")

# ── Agent Config Fetcher ──────────────────────────────────────────────────────

async def fetch_agent_config(agent_config_id: str) -> dict:
    """Fetch agent configuration from the Call20 API."""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{API_BASE_URL}/agents/{agent_config_id}",
            headers={"Authorization": f"Bearer {os.getenv('CALL20_ADMIN_TOKEN', '')}"},
        )
        response.raise_for_status()
        return response.json()


# ── Call Logger ───────────────────────────────────────────────────────────────

async def log_call_start(
    from_number: str,
    to_number: str,
    agent_config_id: str,
) -> str:
    """Log call start to Call20 API. Returns call_id."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{API_BASE_URL}/calls/webhook/call-started",
            json={
                "from_number": from_number,
                "to_number": to_number,
                "agent_config_id": agent_config_id,
            },
        )
        response.raise_for_status()
        return response.json()["call_id"]


async def log_call_end(
    call_id: str,
    duration_seconds: int,
    sentiment_score: float = None,
    resolution: str = None,
    handoff_reason: str = None,
    summary: str = None,
):
    """Log call end to Call20 API."""
    async with httpx.AsyncClient() as client:
        await client.post(
            f"{API_BASE_URL}/calls/webhook/call-ended",
            json={
                "call_id": call_id,
                "duration_seconds": duration_seconds,
                "sentiment_score": sentiment_score,
                "resolution": resolution,
                "handoff_reason": handoff_reason,
                "summary": summary,
            },
        )


# ── Tool Definitions ──────────────────────────────────────────────────────────

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "book_appointment",
            "description": "Book an appointment for the caller",
            "parameters": {
                "type": "object",
                "properties": {
                    "date": {"type": "string", "description": "Appointment date (YYYY-MM-DD)"},
                    "time": {"type": "string", "description": "Appointment time (HH:MM)"},
                    "service": {"type": "string", "description": "Type of service needed"},
                },
                "required": ["date", "time"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "check_availability",
            "description": "Check available appointment slots",
            "parameters": {
                "type": "object",
                "properties": {
                    "date": {"type": "string", "description": "Date to check"},
                    "service": {"type": "string", "description": "Type of service"},
                },
                "required": ["date"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "send_sms",
            "description": "Send an SMS to the caller",
            "parameters": {
                "type": "object",
                "properties": {
                    "message": {"type": "string", "description": "SMS content"},
                },
                "required": ["message"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "transfer_to_human",
            "description": "Transfer the call to a human agent",
            "parameters": {
                "type": "object",
                "properties": {
                    "reason": {"type": "string", "description": "Reason for transfer"},
                },
                "required": ["reason"],
            },
        },
    },
]


# ── Voice Pipeline Builder ────────────────────────────────────────────────────

async def create_voice_pipeline(
    agent_config: dict,
    call_id: str,
    from_number: str,
) -> tuple:
    """
    Create the voice processing pipeline:
    STT (Deepgram) → LLM (Gemini Flash) → TTS (Cartesia)
    """
    # STT
    stt = DeepgramSTTService(
        api_key=DEEPGRAM_API_KEY,
        language="en",
        model="nova-2",
    )

    # LLM
    llm = GoogleLLMService(
        api_key=GOOGLE_API_KEY,
        model="gemini-2.0-flash",
        temperature=0.7,
        system_prompt=agent_config.get("persona_prompt", "You are a helpful assistant."),
        tools=TOOLS,
    )

    # TTS
    tts = CartesiaTTSService(
        api_key=CARTESIA_API_KEY,
        voice_id=agent_config.get("voice_id", "820a3788-2b37-5d2f-b239-400a18403c56"),
        language="en",
    )

    return stt, llm, tts


# ── Main Pipeline Runner ──────────────────────────────────────────────────────

async def run_call_pipeline(
    from_number: str,
    to_number: str,
    agent_config_id: str,
    websocket: aiohttp.WebSocketResponse,
):
    """
    Run the full voice pipeline for an inbound call.
    """
    start_time = asyncio.get_event_loop().time()

    # Fetch agent config
    agent_config = await fetch_agent_config(agent_config_id)

    # Log call start
    call_id = await log_call_start(from_number, to_number, agent_config_id)

    # Create transport
    transport = WebsocketTransport(
        websocket=websocket,
        params=WebsocketParams(
            audio_out_enabled=True,
            add_wav_header=True,
        )
    )

    # Create pipeline
    stt, llm, tts = await create_voice_pipeline(agent_config, call_id, from_number)

    # Create pipeline
    pipeline = Pipeline([
        transport.input(),
        stt,
        llm,
        tts,
        transport.output(),
    ])

    # Create task
    task = PipelineTask(pipeline)

    # Run pipeline
    runner = PipelineRunner()
    await runner.run(task)

    # Calculate duration
    duration = int(asyncio.get_event_loop().time() - start_time)

    # Log call end
    await log_call_end(call_id, duration)


# ── SIP/WebSocket Entry Point ────────────────────────────────────────────────

async def handle_inbound_call(
    from_number: str,
    to_number: str,
    agent_config_id: str,
    websocket: aiohttp.WebSocketResponse,
):
    """
    Entry point for inbound calls from DIDWW SIP trunk.
    DIDWW routes calls to our WebSocket endpoint.
    """
    try:
        await run_call_pipeline(from_number, to_number, agent_config_id, websocket)
    except Exception as e:
        print(f"Call pipeline error: {e}")
        # Log error
        import traceback
        traceback.print_exc()


# ── Server Entry Point ────────────────────────────────────────────────────────

if __name__ == "__main__":
    import aiohttp
    from aiohttp import web

    async def websocket_handler(request):
        """Handle WebSocket connections from SIP gateway."""
        ws = web.WebSocketResponse()
        await ws.prepare(request)

        from_number = request.query.get("from", "")
        to_number = request.query.get("to", "")
        agent_config_id = request.query.get("agent_id", "")

        await handle_inbound_call(from_number, to_number, agent_config_id, ws)
        return ws

    async def health_handler(request):
        """Health check endpoint."""
        return web.json_response({"status": "healthy"})

    app = web.Application()
    app.router.add_get("/call", websocket_handler)
    app.router.add_get("/health", health_handler)

    port = int(os.getenv("PORT", "8765"))
    web.run_app(app, port=port)