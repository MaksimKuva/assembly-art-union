#!/usr/bin/env python3
"""Private localhost service that delivers Assembly applications by email."""

from __future__ import annotations

import json
import os
import re
import smtplib
import ssl
import threading
import time
from collections import defaultdict, deque
from datetime import datetime
from email.header import Header
from email.message import EmailMessage
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from zoneinfo import ZoneInfo


MAX_BODY_BYTES = 32_768
RATE_LIMIT_WINDOW_SECONDS = 15 * 60
RATE_LIMIT_MAX_REQUESTS = 5
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
CONTROL_RE = re.compile(r"[\x00-\x1f\x7f]+")

REQUEST_LABELS = {
    "collaboration": "Коллаборация / совместный проект",
    "partnership": "Партнёрство",
    "specialist": "Специалист / подрядчик",
    "team": "Единомышленник / команда",
    "mentor": "Наставник / консультант",
}
INTEREST_LABELS = {
    "art": "Искусство",
    "business": "Бизнес-партнёрства",
    "fashion": "Мода",
    "music": "Музыка",
    "tech": "ИИ и IT-технологии",
    "investment": "Инвестиции и капитал",
    "wellness": "Красота и здоровье",
}
HELP_LABELS = {
    "introduction": "Познакомить с нужными людьми",
    "announce": "Анонсировать запрос",
    "feedback": "Дать обратную связь по идее",
}
NEXT_STEP_LABELS = {
    "personal-invitation": "Получить личное приглашение на встречу",
    "one-to-one": "Обсудить участие один на один",
    "announcements": "Получать анонсы будущих событий",
}


class ValidationError(ValueError):
    pass


def clean_text(value: object, limit: int = 2_000) -> str:
    if value is None:
        return ""
    if isinstance(value, list):
        value = ", ".join(str(item) for item in value)
    return CONTROL_RE.sub(" ", str(value)).strip()[:limit]


def clean_list(value: object, labels: dict[str, str]) -> list[str]:
    values = value if isinstance(value, list) else ([value] if value else [])
    return [labels[item] for item in values if item in labels]


def validate_payload(payload: object) -> dict[str, object]:
    if not isinstance(payload, dict):
        raise ValidationError("Некорректный формат заявки.")

    if clean_text(payload.get("website"), 200):
        raise ValidationError("Заявка отклонена.")

    name = clean_text(payload.get("name"), 160)
    occupation = clean_text(payload.get("occupation"), 240)
    email = clean_text(payload.get("email"), 254).lower()
    application_type = clean_text(payload.get("application_type"), 20)
    next_step = clean_text(payload.get("next_step"), 80)
    consent = payload.get("consent") in (True, "true", "on", "1", 1)

    if not name or not occupation or not email or not next_step or not consent:
        raise ValidationError("Заполните обязательные поля и подтвердите согласие.")
    if not EMAIL_RE.fullmatch(email):
        raise ValidationError("Проверьте адрес электронной почты.")
    if application_type not in {"guest", "participant"}:
        raise ValidationError("Не удалось определить тип заявки.")
    if next_step not in NEXT_STEP_LABELS:
        raise ValidationError("Выберите удобный способ продолжить знакомство.")

    started_at = clean_text(payload.get("form_started_at"), 32)
    if started_at:
        try:
            elapsed = time.time() - (float(started_at) / 1_000)
            if elapsed < 2:
                raise ValidationError("Отправьте заявку ещё раз через несколько секунд.")
        except ValueError as exc:
            raise ValidationError("Не удалось проверить форму.") from exc

    event_title = clean_text(payload.get("event_title"), 240)
    if application_type == "guest" and not event_title:
        raise ValidationError("Выберите мероприятие.")

    return {
        "application_type": application_type,
        "event_id": clean_text(payload.get("event_id"), 120),
        "event_title": event_title,
        "event_date": clean_text(payload.get("event_date"), 160),
        "event_place": clean_text(payload.get("event_place"), 240),
        "name": name,
        "occupation": occupation,
        "phone": clean_text(payload.get("phone"), 80),
        "email": email,
        "link": clean_text(payload.get("link"), 500),
        "request": clean_list(payload.get("request"), REQUEST_LABELS),
        "request_details": clean_text(payload.get("request_details"), 4_000),
        "interest": clean_list(payload.get("interest"), INTEREST_LABELS),
        "interest_other": clean_text(payload.get("interest_other"), 500),
        "help": clean_list(payload.get("help"), HELP_LABELS),
        "help_details": clean_text(payload.get("help_details"), 4_000),
        "next_step": NEXT_STEP_LABELS[next_step],
        "utm_source": clean_text(payload.get("utm_source"), 200),
        "utm_medium": clean_text(payload.get("utm_medium"), 200),
        "utm_campaign": clean_text(payload.get("utm_campaign"), 200),
        "utm_content": clean_text(payload.get("utm_content"), 200),
        "utm_term": clean_text(payload.get("utm_term"), 200),
        "yclid": clean_text(payload.get("yclid"), 300),
        "gclid": clean_text(payload.get("gclid"), 300),
        "fbclid": clean_text(payload.get("fbclid"), 300),
        "vk_click_id": clean_text(payload.get("vk_click_id"), 300),
        "attribution_landing_path": clean_text(payload.get("attribution_landing_path"), 500),
        "attribution_referrer_origin": clean_text(payload.get("attribution_referrer_origin"), 500),
        "attribution_captured_at": clean_text(payload.get("attribution_captured_at"), 100),
    }


def display(value: object) -> str:
    if isinstance(value, list):
        return ", ".join(value) if value else "—"
    return str(value).strip() if value else "—"


def build_message(data: dict[str, object], sender: str, recipient: str) -> EmailMessage:
    is_event = data["application_type"] == "guest"
    subject_context = data["event_title"] if is_event else "Заявка в сообщество"
    subject = f"[Ассамблея] {subject_context} — {data['name']}"
    now = datetime.now(ZoneInfo("Europe/Moscow")).strftime("%d.%m.%Y %H:%M МСК")

    lines = [
        "Новая заявка с сайта assembly-art-union.ru",
        "",
        f"Тип заявки: {'Регистрация на событие' if is_event else 'Участие в сообществе'}",
        f"Событие: {display(data['event_title'])}",
        f"Дата события: {display(data['event_date'])}",
        f"Место: {display(data['event_place'])}",
        "",
        f"Имя: {display(data['name'])}",
        f"Род деятельности: {display(data['occupation'])}",
        f"Телефон: {display(data['phone'])}",
        f"Email: {display(data['email'])}",
        f"Сайт / социальная сеть: {display(data['link'])}",
        "",
        f"Что ищет: {display(data['request'])}",
        f"Запрос своими словами: {display(data['request_details'])}",
        f"Интересующие сферы: {display(data['interest'])}",
        f"Другое направление: {display(data['interest_other'])}",
        f"Как помочь: {display(data['help'])}",
        f"Подробнее о помощи: {display(data['help_details'])}",
        f"Следующий шаг: {display(data['next_step'])}",
        "",
        "Атрибуция:",
        f"utm_source: {display(data['utm_source'])}",
        f"utm_medium: {display(data['utm_medium'])}",
        f"utm_campaign: {display(data['utm_campaign'])}",
        f"utm_content: {display(data['utm_content'])}",
        f"utm_term: {display(data['utm_term'])}",
        f"yclid: {display(data['yclid'])}",
        f"gclid: {display(data['gclid'])}",
        f"fbclid: {display(data['fbclid'])}",
        f"vk_click_id: {display(data['vk_click_id'])}",
        f"Первая страница: {display(data['attribution_landing_path'])}",
        f"Источник перехода: {display(data['attribution_referrer_origin'])}",
        f"Атрибуция зафиксирована: {display(data['attribution_captured_at'])}",
        "",
        f"Получено: {now}",
        "Согласие на обработку персональных данных: получено.",
        "",
        "Чтобы ответить заявителю, нажмите «Ответить» в Gmail.",
    ]

    message = EmailMessage()
    message["Subject"] = str(Header(subject, "utf-8"))
    message["From"] = f"Ассамблея <{sender}>"
    message["To"] = recipient
    message["Reply-To"] = str(data["email"])
    message.set_content("\n".join(lines), charset="utf-8")
    return message


class RateLimiter:
    def __init__(self) -> None:
        self._requests: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def allow(self, key: str) -> bool:
        now = time.monotonic()
        with self._lock:
            bucket = self._requests[key]
            while bucket and bucket[0] < now - RATE_LIMIT_WINDOW_SECONDS:
                bucket.popleft()
            if len(bucket) >= RATE_LIMIT_MAX_REQUESTS:
                return False
            bucket.append(now)
            return True


RATE_LIMITER = RateLimiter()


class ApplicationHandler(BaseHTTPRequestHandler):
    server_version = "AssemblyForm/1.0"

    def _json(self, status: int, payload: dict[str, object]) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(body)

    def _client_key(self) -> str:
        # Nginx replaces X-Real-IP with the connected client's address.
        # The first X-Forwarded-For value can be supplied by a caller.
        return (self.headers.get("X-Real-IP", "").strip() or self.client_address[0])[:100]

    def _origin_allowed(self) -> bool:
        origin = self.headers.get("Origin", "")
        allowed = {
            item.strip()
            for item in os.environ.get(
                "FORM_ALLOWED_ORIGINS",
                "https://assembly-art-union.ru,https://www.assembly-art-union.ru",
            ).split(",")
            if item.strip()
        }
        return origin in allowed

    def do_GET(self) -> None:  # noqa: N802
        if self.path == "/health":
            self._json(HTTPStatus.OK, {"ok": True})
            return
        self._json(HTTPStatus.NOT_FOUND, {"ok": False})

    def do_POST(self) -> None:  # noqa: N802
        if self.path != "/api/applications":
            self._json(HTTPStatus.NOT_FOUND, {"ok": False})
            return
        if not self._origin_allowed():
            self._json(HTTPStatus.FORBIDDEN, {"ok": False, "error": "Запрос отклонён."})
            return
        if not RATE_LIMITER.allow(self._client_key()):
            self._json(
                HTTPStatus.TOO_MANY_REQUESTS,
                {"ok": False, "error": "Слишком много попыток. Попробуйте позднее."},
            )
            return
        if not self.headers.get("Content-Type", "").lower().startswith("application/json"):
            self._json(HTTPStatus.UNSUPPORTED_MEDIA_TYPE, {"ok": False, "error": "Некорректный формат."})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if length <= 0 or length > MAX_BODY_BYTES:
            self._json(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, {"ok": False, "error": "Заявка слишком большая."})
            return

        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            data = validate_payload(payload)
            sender = os.environ["SMTP_USERNAME"].strip()
            password = os.environ["SMTP_APP_PASSWORD"].replace(" ", "").strip()
            recipient = os.environ.get("FORM_RECIPIENT", sender).strip()
            if not sender or not password or not recipient:
                raise RuntimeError("Mail configuration is incomplete")
            message = build_message(data, sender, recipient)
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(
                os.environ.get("SMTP_HOST", "smtp.gmail.com"),
                int(os.environ.get("SMTP_PORT", "465")),
                timeout=15,
                context=context,
            ) as smtp:
                smtp.login(sender, password)
                smtp.send_message(message)
            self._json(HTTPStatus.OK, {"ok": True})
        except ValidationError as exc:
            self._json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": str(exc)})
        except (json.JSONDecodeError, UnicodeDecodeError):
            self._json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "Не удалось прочитать заявку."})
        except Exception:
            self.log_error("application delivery failed")
            self._json(
                HTTPStatus.BAD_GATEWAY,
                {"ok": False, "error": "Не удалось отправить заявку. Попробуйте ещё раз или напишите на почту проекта."},
            )

    def log_message(self, fmt: str, *args: object) -> None:
        # Never print request bodies or applicant contact data.
        print(f"{self.log_date_time_string()} {self.address_string()} {fmt % args}", flush=True)


def main() -> None:
    host = os.environ.get("FORM_BIND_HOST", "127.0.0.1")
    port = int(os.environ.get("FORM_BIND_PORT", "8787"))
    server = ThreadingHTTPServer((host, port), ApplicationHandler)
    print(f"Assembly form service listening on {host}:{port}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
