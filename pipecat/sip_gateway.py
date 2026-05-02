"""
Call20 — SIP Gateway (Phase 2)
Handles SIP trunk integration with DIDWW, routes calls to voice agents.
"""
import asyncio
import os
import uuid
import json
import httpx
import logging
from typing import Optional

import aiohttp
from aiohttp import web, WSMsgType

logger = logging.getLogger(__name__)

# ── Configuration ─────────────────────────────────────────────────────────────

CALL20_API_URL = os.getenv("CALL20_API_URL", "http://localhost:8000/api/v1")
VOICE_AGENT_URL = os.getenv("VOICE_AGENT_URL", "ws://localhost:8765/call")
DIDWW_API_KEY = os.getenv("DIDWW_API_KEY", "")
DIDWW_API_URL = "https://api.didww.com/v3"

# ── DIDWW SIP Trunk Management ────────────────────────────────────────────────

async def provision_sip_trunk(
    tenant_id: str,
    did_id: str,
    did_number: str,
    agent_config_id: str,
) -> dict:
    """
    Provision a SIP trunk in DIDWW for a DID number.
    Routes inbound calls to our voice agent WebSocket.
    """
    async with httpx.AsyncClient() as client:
        # Create SIP trunk
        trunk_response = await client.post(
            f"{DIDWW_API_URL}/sip_trunks",
            headers={
                "Authorization": f"Bearer {DIDWW_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "data": {
                    "type": "sip_trunks",
                    "attributes": {
                        "name": f"call20-{tenant_id}-{did_id}",
                        "transport": "wss",
                        "sip_uri": f"wss://{os.getenv('PUBLIC_HOST', 'localhost')}/sip/{did_id}",
                        "enabled": True,
                    },
                }
            },
        )
        trunk_response.raise_for_status()
        trunk_data = trunk_response.json()

        # Associate DID with SIP trunk
        await client.post(
            f"{DIDWW_API_URL}/did_sip_trunk_links",
            headers={
                "Authorization": f"Bearer {DIDWW_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "data": {
                    "type": "did_sip_trunk_links",
                    "attributes": {
                        "did_id": did_id,
                        "sip_trunk_id": trunk_data["data"]["id"],
                    },
                }
            },
        )

        return trunk_data


async def release_sip_trunk(sip_trunk_id: str) -> None:
    """Release a SIP trunk from DIDWW."""
    async with httpx.AsyncClient() as client:
        await client.delete(
            f"{DIDWW_API_URL}/sip_trunks/{sip_trunk_id}",
            headers={"Authorization": f"Bearer {DIDWW_API_KEY}"},
        )


# ── Call Recording ────────────────────────────────────────────────────────────

async def start_call_recording(
    call_id: str,
    from_number: str,
    to_number: str,
) -> str:
    """Start recording a call. Returns recording_id."""
    # In production, use DIDWW recording API or Pipecat recording
    recording_id = f"rec_{uuid.uuid4().hex[:12]}"
    logger.info(f"Starting recording {recording_id} for call {call_id}")
    return recording_id


async def stop_call_recording(recording_id: str) -> str:
    """Stop recording and return the recording URL."""
    # In production, retrieve recording URL from storage
    recording_url = f"https://storage.call20.ai/recordings/{recording_id}.wav"
    logger.info(f"Stopped recording {recording_id}, URL: {recording_url}")
    return recording_url


# ── Sentiment Analysis ────────────────────────────────────────────────────────

async def analyze_sentiment(transcript_text: str) -> float:
    """
    Analyze call sentiment using a simple heuristic or external API.
    Returns score between -1.0 (negative) and 1.0 (positive).
    """
    # In production, use a dedicated sentiment analysis service
    # For now, use keyword-based scoring
    positive_words = [
        "thank", "thanks", "great", "good", "excellent", "perfect",
        "happy", "satisfied", "helpful", "wonderful", "amazing",
    ]
    negative_words = [
        "angry", "frustrated", "unhappy", "terrible", "awful", "bad",
        "worst", "hate", "complaint", "issue", "problem", "disappointed",
    ]

    text_lower = transcript_text.lower()
    pos_count = sum(1 for word in positive_words if word in text_lower)
    neg_count = sum(1 for word in negative_words if word in text_lower)

    total = pos_count + neg_count
    if total == 0:
        return 0.0

    score = (pos_count - neg_count) / total
    return round(score, 2)


# ── Resolution Detection ──────────────────────────────────────────────────────

async def detect_resolution(
    transcript_text: str,
    tools_triggered: list,
) -> str:
    """
    Detect call resolution based on transcript and tools used.
    Returns: 'resolved', 'unresolved', 'transferred', 'voicemail'
    """
    text_lower = transcript_text.lower()

    if "transfer" in text_lower or "human" in text_lower:
        return "transferred"

    if any(tool.get("name") == "transfer_to_human" for tool in tools_triggered):
        return "transferred"

    if "voicemail" in text_lower or "leave a message" in text_lower:
        return "voicemail"

    if any(word in text_lower for word in ["booked", "confirmed", "scheduled", "done", "resolved"]):
        return "resolved"

    return "unresolved"


# ── Call Summary Generation ───────────────────────────────────────────────────

async def generate_call_summary(
    transcript_text: str,
    agent_persona: str,
) -> str:
    """
    Generate a brief call summary using the LLM.
    """
    # In production, use Gemini Flash for summary
    # For now, return first 200 chars of transcript
    return transcript_text[:200] + "..." if len(transcript_text) > 200 else transcript_text


# ── SIP WebSocket Handler ─────────────────────────────────────────────────────

async def handle_sip_websocket(request):
    """
    Handle WebSocket connections from DIDWW SIP trunk.
    This is the entry point for all inbound calls.
    """
    ws = web.WebSocketResponse()
    await ws.prepare(request)

    did_id = request.match_info.get("did_id", "")
    from_number = request.query.get("from", "")
    to_number = request.query.get("to", "")

    logger.info(f"SIP connection: DID={did_id}, From={from_number}, To={to_number}")

    try:
        # Fetch agent config for this DID
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{CALL20_API_URL}/dids/{did_id}",
                headers={"Authorization": f"Bearer {os.getenv('CALL20_ADMIN_TOKEN', '')}"},
            )
            did_data = response.json()
            agent_config_id = did_data.get("agent_config_id")

        if not agent_config_id:
            logger.error(f"No agent config for DID {did_id}")
            await ws.close()
            return ws

        # Connect to voice agent
        voice_ws_url = f"{VOICE_AGENT_URL}?from={from_number}&to={to_number}&agent_id={agent_config_id}"

        async with aiohttp.ClientSession() as session:
            async with session.ws_connect(voice_ws_url) as voice_ws:
                # Forward audio to voice agent and back
                async def forward_to_agent():
                    async for msg in ws:
                        if msg.type == WSMsgType.BINARY:
                            await voice_ws.send_bytes(msg.data)
                        elif msg.type == WSMsgType.TEXT:
                            data = json.loads(msg.data)
                            if data.get("event") == "call_ended":
                                break
                        elif msg.type == WSMsgType.ERROR:
                            break

                async def forward_from_agent():
                    async for msg in voice_ws:
                        if msg.type == WSMsgType.BINARY:
                            await ws.send_bytes(msg.data)
                        elif msg.type == WSMsgType.ERROR:
                            break

                # Run both concurrently
                await asyncio.gather(forward_to_agent(), forward_from_agent())

        # Stop recording
        recording_url = await stop_call_recording(recording_id)

        # Log call end
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{CALL20_API_URL}/calls/webhook/call-ended",
                json={
                    "call_id": did_data.get("id", ""),
                    "duration_seconds": 0,  # In production, calculate from audio
                    "recording_url": recording_url,
                },
            )

    except Exception as e:
        logger.error(f"SIP handler error: {e}")
    finally:
        await ws.close()

    return ws


# ── Outbound Call (Phase 5) ───────────────────────────────────────────────────

async def make_outbound_call(
    from_did: str,
    to_number: str,
    agent_config_id: str,
    initial_message: str = "",
) -> str:
    """
    Make an outbound call via DIDWW API.
    Returns call_id.
    """
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{DIDWW_API_URL}/outbound_calls",
            headers={
                "Authorization": f"Bearer {DIDWW_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "data": {
                    "type": "outbound_calls",
                    "attributes": {
                        "from_number": from_did,
                        "to_number": to_number,
                        "sip_trunk_id": os.getenv("OUTBOUND_SIP_TRUNK_ID", ""),
                        "webhook_url": f"{os.getenv('CALL20_API_URL', '')}/api/v1/calls/webhook/call-ended",
                    },
                }
            },
        )
        response.raise_for_status()
        return response.json()["data"]["id"]


# ── Server Entry Point ────────────────────────────────────────────────────────

if __name__ == "__main__":
    app = web.Application()
    app.router.add_get("/sip/{did_id}", handle_sip_websocket)

    port = int(os.getenv("SIP_PORT", "8766"))
    web.run_app(app, port=port)