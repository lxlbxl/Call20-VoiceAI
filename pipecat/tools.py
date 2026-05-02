"""
Call20 — Tool Execution Framework (Phase 2)
Handles tool calls from the LLM (book_appointment, send_sms, transfer, etc.)
"""
import os
import httpx
import logging
from typing import Any

logger = logging.getLogger(__name__)

CALL20_API_URL = os.getenv("CALL20_API_URL", "http://localhost:8000/api/v1")
ADMIN_TOKEN = os.getenv("CALL20_ADMIN_TOKEN", "")


async def execute_tool(tool_name: str, arguments: dict, call_context: dict) -> dict:
    """
    Execute a tool call from the LLM.
    Returns the result to send back to the LLM.
    """
    handlers = {
        "book_appointment": _book_appointment,
        "check_availability": _check_availability,
        "send_sms": _send_sms,
        "transfer_to_human": _transfer_to_human,
        "get_business_hours": _get_business_hours,
        "get_service_info": _get_service_info,
    }

    handler = handlers.get(tool_name)
    if not handler:
        logger.warning(f"Unknown tool: {tool_name}")
        return {"error": f"Unknown tool: {tool_name}"}

    try:
        result = await handler(arguments, call_context)
        return result
    except Exception as e:
        logger.error(f"Tool execution error ({tool_name}): {e}")
        return {"error": str(e)}


# ── Tool Handlers ─────────────────────────────────────────────────────────────

async def _book_appointment(arguments: dict, context: dict) -> dict:
    """Book an appointment via the business's calendar system."""
    # In production, integrate with Google Calendar, Calendly, etc.
    date = arguments.get("date")
    time = arguments.get("time")
    service = arguments.get("service", "general")
    caller_number = context.get("from_number", "")

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{CALL20_API_URL}/appointments",
            headers={"Authorization": f"Bearer {ADMIN_TOKEN}"},
            json={
                "date": date,
                "time": time,
                "service": service,
                "caller_number": caller_number,
            },
        )

        if response.status_code == 201:
            data = response.json()
            return {
                "success": True,
                "message": f"Appointment booked for {date} at {time}. Confirmation sent via SMS.",
                "appointment_id": data.get("id"),
            }
        else:
            return {
                "success": False,
                "message": "Sorry, I couldn't book that appointment. Please try again or call during business hours.",
            }


async def _check_availability(arguments: dict, context: dict) -> dict:
    """Check available appointment slots."""
    date = arguments.get("date")
    service = arguments.get("service", "general")

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{CALL20_API_URL}/appointments/availability",
            headers={"Authorization": f"Bearer {ADMIN_TOKEN}"},
            params={"date": date, "service": service},
        )

        if response.status_code == 200:
            slots = response.json().get("slots", [])
            if slots:
                slot_str = ", ".join(slots[:5])
                return {
                    "success": True,
                    "message": f"Available slots on {date}: {slot_str}",
                    "slots": slots,
                }
            else:
                return {
                    "success": True,
                    "message": f"No available slots on {date}. Would you like me to check another date?",
                    "slots": [],
                }
        else:
            return {
                "success": False,
                "message": "I couldn't check availability right now. Please try again later.",
            }


async def _send_sms(arguments: dict, context: dict) -> dict:
    """Send an SMS to the caller."""
    message = arguments.get("message", "")
    to_number = context.get("from_number", "")

    if not to_number:
        return {"success": False, "message": "No caller number available."}

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{CALL20_API_URL}/sms",
            headers={"Authorization": f"Bearer {ADMIN_TOKEN}"},
            json={
                "to_number": to_number,
                "content": message,
            },
        )

        if response.status_code == 201:
            return {
                "success": True,
                "message": "SMS sent successfully.",
            }
        else:
            return {
                "success": False,
                "message": "Failed to send SMS. Please try again.",
            }


async def _transfer_to_human(arguments: dict, context: dict) -> dict:
    """Transfer the call to a human agent."""
    reason = arguments.get("reason", "customer request")
    call_id = context.get("call_id", "")

    # In production, integrate with Twilio Transfer, DIDWW transfer, etc.
    fallback_phone = context.get("fallback_phone", "")

    if fallback_phone:
        return {
            "success": True,
            "message": f"Transferring you to a human agent. Reason: {reason}",
            "action": "transfer",
            "destination": fallback_phone,
        }
    else:
        return {
            "success": False,
            "message": "I'm sorry, but no human agents are available right now. Please try again during business hours.",
            "action": "end_call",
        }


async def _get_business_hours(arguments: dict, context: dict) -> dict:
    """Get the business's operating hours."""
    agent_config_id = context.get("agent_config_id", "")

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{CALL20_API_URL}/agents/{agent_config_id}",
            headers={"Authorization": f"Bearer {ADMIN_TOKEN}"},
        )

        if response.status_code == 200:
            data = response.json()
            business_hours = data.get("business_hours", {})
            return {
                "success": True,
                "message": f"Business hours: {business_hours}",
                "business_hours": business_hours,
            }
        else:
            return {
                "success": False,
                "message": "I couldn't retrieve the business hours right now.",
            }


async def _get_service_info(arguments: dict, context: dict) -> dict:
    """Get information about a specific service."""
    service_name = arguments.get("service", "")

    # In production, query the knowledge base or service catalog
    return {
        "success": True,
        "message": f"Service information for {service_name} retrieved.",
        "info": f"Details about {service_name}",
    }