from __future__ import annotations

import asyncio
import logging
import smtplib
import socket
import ssl
from email.message import EmailMessage

from app.core.config import Settings
from app.schemas.contact import ContactSubmission

logger = logging.getLogger(__name__)


class ContactSendError(Exception):
    pass


class ContactConfigurationError(ContactSendError):
    pass


class ContactMailService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def send_contact_emails(self, submission: ContactSubmission) -> None:
        await asyncio.to_thread(self._send_contact_emails_sync, submission)

    def _send_contact_emails_sync(self, submission: ContactSubmission) -> None:
        admin_message = self._build_admin_notification(submission)
        auto_reply_message = self._build_auto_reply(submission)

        try:
            with self._open_smtp_connection() as smtp:
                smtp.send_message(admin_message)
                smtp.send_message(auto_reply_message)
        except ContactConfigurationError:
            logger.exception("SMTP settings are invalid for contact email delivery")
            raise
        except smtplib.SMTPAuthenticationError as exc:
            logger.exception(
                "SMTP authentication failed while sending contact emails: smtp_code=%s",
                exc.smtp_code,
            )
            raise ContactSendError("SMTP authentication failed") from exc
        except smtplib.SMTPConnectError as exc:
            logger.exception(
                "SMTP connection failed while sending contact emails: smtp_code=%s",
                exc.smtp_code,
            )
            raise ContactSendError("SMTP connection failed") from exc
        except (TimeoutError, socket.timeout) as exc:
            logger.exception("SMTP timeout while sending contact emails")
            raise ContactSendError("SMTP timeout") from exc
        except smtplib.SMTPServerDisconnected as exc:
            logger.exception("SMTP server disconnected during contact email delivery")
            raise ContactSendError("SMTP server disconnected") from exc
        except smtplib.SMTPException as exc:
            logger.exception(
                "SMTP send failed while sending contact emails: %s",
                exc.__class__.__name__,
            )
            raise ContactSendError("SMTP send failed") from exc
        except OSError as exc:
            logger.exception(
                "SMTP network error while sending contact emails: %s",
                exc.__class__.__name__,
            )
            raise ContactSendError("SMTP network error") from exc

    def _build_admin_notification(self, submission: ContactSubmission) -> EmailMessage:
        message = EmailMessage()
        message["From"] = self.settings.contact_from_email
        message["To"] = self.settings.contact_to_email
        message["Reply-To"] = submission.email
        message["Subject"] = (
            f"【お問い合わせ】{submission.company_name} / {submission.person_name}"
        )
        message.set_content(
            "\n".join(
                [
                    "LPのお問い合わせフォームから新しいお問い合わせが届きました。",
                    "",
                    "お問い合わせ内容",
                    "------------------------------",
                    f"会社名: {submission.company_name}",
                    f"担当者名: {submission.person_name}",
                    f"メールアドレス: {submission.email}",
                    f"電話番号: {submission.phone}",
                    "",
                    "本文:",
                    submission.message,
                ]
            )
        )
        return message

    def _build_auto_reply(self, submission: ContactSubmission) -> EmailMessage:
        message = EmailMessage()
        message["From"] = self.settings.contact_from_email
        message["To"] = submission.email
        message["Subject"] = self.settings.contact_auto_reply_subject
        message.set_content(
            "\n".join(
                [
                    "※このメールはシステムからの自動返信です",
                    "",
                    "お世話になっております。",
                    "株式会社あわいコンサルティングでございます。",
                    "",
                    "この度はお問い合わせいただき、誠にありがとうございます。",
                    "以下の内容でお問い合わせを受け付けいたしました。",
                    "",
                    "ーーーーーーーーーーー",
                    f"会社名：{submission.company_name}",
                    f"担当者名：{submission.person_name}",
                    f"メールアドレス：{submission.email}",
                    f"電話番号：{submission.phone}",
                    "",
                    "お問い合わせ内容：",
                    submission.message,
                    "ーーーーーーーーーーー",
                    "",
                    "内容を確認のうえ、1営業日以内に担当者よりご連絡させていただきます。",
                    "今しばらくお待ちくださいますようお願いいたします。",
                ]
            )
        )
        return message

    def _open_smtp_connection(self) -> smtplib.SMTP:
        if self.settings.contact_smtp_use_ssl and self.settings.contact_smtp_use_starttls:
            raise ContactConfigurationError(
                "SSL and STARTTLS cannot both be enabled for SMTP"
            )

        timeout_seconds = 15
        try:
            if self.settings.contact_smtp_use_ssl:
                smtp = smtplib.SMTP_SSL(
                    host=self.settings.contact_smtp_host,
                    port=self.settings.contact_smtp_port,
                    timeout=timeout_seconds,
                    context=ssl.create_default_context(),
                )
            else:
                smtp = smtplib.SMTP(
                    host=self.settings.contact_smtp_host,
                    port=self.settings.contact_smtp_port,
                    timeout=timeout_seconds,
                )
                smtp.ehlo()
                if self.settings.contact_smtp_use_starttls:
                    smtp.starttls(context=ssl.create_default_context())
                    smtp.ehlo()

            smtp.login(
                self.settings.contact_smtp_username,
                self.settings.contact_smtp_password,
            )
            return smtp
        except Exception:
            logger.exception(
                "Failed to establish SMTP session for host=%s port=%s ssl=%s starttls=%s",
                self.settings.contact_smtp_host,
                self.settings.contact_smtp_port,
                self.settings.contact_smtp_use_ssl,
                self.settings.contact_smtp_use_starttls,
            )
            raise
