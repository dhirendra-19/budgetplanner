from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from app.core.config import get_settings


@dataclass
class DeliveryResult:
    sent: bool
    detail: str = ""


def send_sms(to_number: str, message: str) -> DeliveryResult:
    settings = get_settings()
    if not settings.twilio_account_sid or not settings.twilio_auth_token or not settings.twilio_from_number:
        return DeliveryResult(sent=False, detail="Twilio not configured")
    try:
        from twilio.rest import Client

        client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        client.messages.create(from_=settings.twilio_from_number, to=to_number, body=message)
        return DeliveryResult(sent=True, detail="sent")
    except Exception as exc:
        return DeliveryResult(sent=False, detail=str(exc))


def send_email(to_email: str, subject: str, content: str) -> DeliveryResult:
    settings = get_settings()
    if not settings.sendgrid_api_key or not settings.sendgrid_from_email:
        return DeliveryResult(sent=False, detail="SendGrid not configured")
    try:
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail

        message = Mail(
            from_email=settings.sendgrid_from_email,
            to_emails=to_email,
            subject=subject,
            plain_text_content=content,
        )
        client = SendGridAPIClient(settings.sendgrid_api_key)
        client.send(message)
        return DeliveryResult(sent=True, detail="sent")
    except Exception as exc:
        return DeliveryResult(sent=False, detail=str(exc))
