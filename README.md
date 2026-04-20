# awai-lp

https://docs.google.com/spreadsheets/d/1JrfwkxJgk82RoyYBwTBorZahNrXPQKiysrALsrypo9c/edit?usp=sharing

## Contact Mail Settings

`backend/.env` に Xserver の SMTP-AUTH 情報を設定してください。`CONTACT_SMTP_HOST` には固定値を入れず、Xserver のサーバーパネルで確認した SMTP ホストを設定します。

```env
CONTACT_FROM_EMAIL=no-reply@awai-consulting.co.jp
CONTACT_TO_EMAIL=contact@awai-consulting.co.jp
CONTACT_AUTO_REPLY_SUBJECT=【株式会社あわいコンサルティング】お問い合わせを受け付けました
CONTACT_SMTP_HOST=sv***.xserver.jp
CONTACT_SMTP_PORT=465
CONTACT_SMTP_USERNAME=no-reply@awai-consulting.co.jp
CONTACT_SMTP_PASSWORD=your-smtp-password
CONTACT_SMTP_USE_SSL=true
CONTACT_SMTP_USE_STARTTLS=false
CONTACT_ALLOWED_ORIGINS=http://localhost:5500,http://127.0.0.1:5500,http://localhost:8080,http://127.0.0.1:8080
```

デフォルトは Xserver 推奨の SSL 465 を想定しています。587 を使う場合は `CONTACT_SMTP_PORT=587`、`CONTACT_SMTP_USE_SSL=false`、`CONTACT_SMTP_USE_STARTTLS=true` に切り替えてください。
