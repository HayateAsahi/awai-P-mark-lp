# awai-lp

https://docs.google.com/spreadsheets/d/1JrfwkxJgk82RoyYBwTBorZahNrXPQKiysrALsrypo9c/edit?usp=sharing

## PHP Contact Form

このリポジトリのお問い合わせ送信は PHP で運用します。フォーム送信先は `contact.php` で、管理者通知メールと入力者向け自動返信メールを送信します。

公開ディレクトリに配置する主なファイル:

```text
index.html
contact.php
css/
js/
img/
config/
  .htaccess
  mail.php
```

### 設定手順

1. `config/mail.php` をベース設定として確認します。
2. 本番の実値は `config/mail.local.php` として配置します。
3. `config/.htaccess` で設定ファイルへの直接アクセスを拒否します。
4. `index.html` と `contact.php` を同じ公開ディレクトリにアップロードします。

`config/mail.local.php` の例:

```php
<?php

return [
    'transport' => 'mail',
    'from_email' => 'no-reply@awai-consulting.co.jp',
    'to_email' => 'contact@awai-consulting.co.jp',
    'auto_reply_subject' => '【株式会社あわいコンサルティング】お問い合わせを受け付けました',
    'return_path' => 'no-reply@awai-consulting.co.jp',
];
```

Xserver の標準的な構成では、まず `mb_send_mail` を使うこの設定で動作確認してください。SMTP 認証が必要な環境向けに `config/mail.local.php.example` へ想定項目を残していますが、現状の実装は `mail` transport を前提にしています。

### 動作仕様

- 送信先は `contact.php`
- 管理者通知: `contact@awai-consulting.co.jp`
- 送信元: `no-reply@awai-consulting.co.jp`
- Reply-To: 入力者メールアドレス
- 自動返信件名: `【株式会社あわいコンサルティング】お問い合わせを受け付けました`
- POST 以外は拒否
- 必須チェック、メール形式チェック、ヘッダーインジェクション対策あり
- `Accept: application/json` の場合は JSON を返却
- 通常フォーム送信時は元ページへリダイレクトしてメッセージを表示
- ハニーポット `website` 項目で簡易スパム対策を実施

### Git 管理しないファイル

- `config/mail.local.php`

`config/mail.local.php.example` をテンプレートとして使い、実際の認証情報は Git に含めないでください。


# 🚀 デプロイ手順（Xserver / pmark/initial）

## ■ 前提

* サーバー：Xserver
* 接続方法：SSH + scp
* 公開ディレクトリ：

```
/home/utas/awai-consulting.co.jp/public_html/pmark/initial/
```

---

## ■ ① ローカルで作業ディレクトリへ移動

```powershell
cd C:\Users\wasab\Desktop\Project\awai\pmark\initial
```

---

## ■ ② デプロイ（ファイルアップロード）

```powershell
scp -P 10022 -r .\index.html .\contact.php .\css .\js .\img .\config utas@sv8069.xserver.jp:/home/utas/awai-consulting.co.jp/public_html/pmark/initial/
```

---

## ■ ③ サーバーにSSH接続

```powershell
ssh -p 10022 utas@sv8069.xserver.jp
```

---

## ■ ④ ディレクトリへ移動

```bash
cd /home/utas/awai-consulting.co.jp/public_html/pmark/initial
```

---

## ■ ⑤ パーミッション設定（必須）

```bash
chmod 755 css js img config
find css js img config -type f -exec chmod 644 {} \;
find . -maxdepth 1 -type f -exec chmod 644 {} \;
```

---

## ■ ⑥ ブラウザ確認

```
https://awai-consulting.co.jp/pmark/initial/
```

---

## ■ ⑦ キャッシュクリア

* Windows: `Ctrl + F5`
* またはシークレットウィンドウ

---

## ■ よくあるエラーと対処

### ❌ CSS / 画像が反映されない

→ パーミッション不足

```bash
chmod 755 ディレクトリ
chmod 644 ファイル
```

---

### ❌ スタイルが古い

→ キャッシュ

```
Ctrl + F5
```

---

### ❌ スタイル崩れ（サブディレクトリ）

→ パス確認

```html
<!-- NG -->
/css/style.css

<!-- OK -->
./css/style.css
css/style.css
```

---

### ❌ 404エラー

→ index.htmlがない

---

## ■ 注意事項

* `public_html` 直下は触らない（既存サイト破壊防止）
* 必要なファイルのみアップする
* `.env` や `.git` はアップしない

---

## ■ ディレクトリ構成

```
public_html/
└── pmark/
    └── initial/
        ├── index.html
        ├── contact.php
        ├── css/
        ├── js/
        ├── img/
        └── config/
```

---

## ■ 補足

* scpは「差分」ではなく「上書き」
* 毎回必要なファイルは再アップすること

---

## ■ 結論

* デプロイ = scp + 権限設定
* 問題の8割は「パーミッション or キャッシュ」
* サブディレクトリではパスに注意

---
