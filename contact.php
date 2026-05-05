<?php

declare(strict_types=1);

mb_language('Japanese');
mb_internal_encoding('UTF-8');

const CONTACT_SUCCESS_MESSAGE = 'お問い合わせを受け付けました。担当者より1営業日以内にご連絡いたします。';
const CONTACT_ERROR_MESSAGE = 'お問い合わせの送信に失敗しました。時間をおいて再度お試しください。';

$config = load_mail_config(__DIR__ . '/config/mail.php', __DIR__ . '/config/mail.local.php');
$expectsJson = expects_json_response();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond_error(405, 'METHOD_NOT_ALLOWED', 'POST リクエストのみ受け付けています。', $expectsJson);
}

$input = [
    'company_name' => normalize_text($_POST['company_name'] ?? ''),
    'person_name' => normalize_text($_POST['person_name'] ?? ''),
    'email' => normalize_text($_POST['email'] ?? ''),
    'phone' => normalize_text($_POST['phone'] ?? ''),
    'message' => normalize_multiline_text($_POST['message'] ?? ''),
    'privacy_consent' => normalize_text($_POST['privacy_consent'] ?? ''),
    'website' => normalize_text($_POST['website'] ?? ''),
    'return_to' => normalize_text($_POST['return_to'] ?? ''),
];

if ($input['website'] !== '') {
    respond_success(CONTACT_SUCCESS_MESSAGE, $expectsJson, $input['return_to']);
}

$errors = validate_contact_input($input);

if ($errors !== []) {
    respond_validation_error($errors, $expectsJson, $input['return_to']);
}

error_log('[DEBUG] contact input: ' . print_r($input, true));

try {
    send_contact_mail($config, $input);
    send_auto_reply_mail($config, $input);
} catch (Throwable $exception) {
    error_log('[contact.php] ' . $exception->getMessage());
    respond_error(500, 'CONTACT_SEND_FAILED', CONTACT_ERROR_MESSAGE, $expectsJson, $input['return_to']);
}

respond_success(CONTACT_SUCCESS_MESSAGE, $expectsJson, $input['return_to']);

function load_mail_config(string $baseConfigPath, string $localConfigPath): array
{
    $baseConfig = require $baseConfigPath;
    $localConfig = file_exists($localConfigPath) ? require $localConfigPath : [];

    return array_replace_recursive($baseConfig, $localConfig);
}

function expects_json_response(): bool
{
    $accept = strtolower((string) ($_SERVER['HTTP_ACCEPT'] ?? ''));
    $contentType = strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? ''));
    $requestedWith = strtolower((string) ($_SERVER['HTTP_X_REQUESTED_WITH'] ?? ''));

    return str_contains($accept, 'application/json')
        || str_contains($contentType, 'application/json')
        || $requestedWith === 'xmlhttprequest';
}

function normalize_text(string $value): string
{
    $value = trim($value);
    $value = str_replace(["\r\n", "\r"], "\n", $value);

    return preg_replace('/\s+/u', ' ', $value) ?? '';
}

function normalize_multiline_text(string $value): string
{
    $value = trim($value);
    $value = str_replace(["\r\n", "\r"], "\n", $value);

    return preg_replace("/\n{3,}/u", "\n\n", $value) ?? '';
}

function validate_contact_input(array $input): array
{
    $errors = [];

    foreach (['company_name', 'person_name', 'email', 'phone', 'message'] as $field) {
        if ($input[$field] === '') {
            $errors[$field] = '必須項目です。';
        }
    }

    if ($input['email'] !== '' && !is_safe_email($input['email'])) {
        $errors['email'] = 'メールアドレスの形式が正しくありません。';
    }

    if ($input['privacy_consent'] === '') {
        $errors['privacy_consent'] = '個人情報の取扱いへの同意が必要です。';
    }

    foreach (['company_name', 'person_name', 'email', 'phone'] as $field) {
        if (contains_header_injection_chars($input[$field])) {
            $errors[$field] = '入力内容に利用できない文字が含まれています。';
        }
    }

    return $errors;
}

function contains_header_injection_chars(string $value): bool
{
    return preg_match('/[\r\n]/', $value) === 1;
}

function is_safe_email(string $email): bool
{
    return !contains_header_injection_chars($email)
        && filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

function send_contact_mail(array $config, array $input): void
{
    $subject = sprintf(
        '【お問い合わせ】%s / %s様',
        $input['company_name'],
        $input['person_name']
    );

    $body = implode("\n", [
        'Pマーク新規LPのお問い合わせフォームから新しいお問い合わせが届きました。',
        '',
        '会社名：' . $input['company_name'],
        '担当者名：' . $input['person_name'],
        'メールアドレス：' . $input['email'],
        '電話番号：' . $input['phone'],
        '',
        'お問い合わせ内容：',
        $input['message'],
    ]);

    $headers = build_mail_headers($config['from_email'], $input['email']);
    send_mail($config, $config['to_email'], $subject, $body, $headers);
}

function send_auto_reply_mail(array $config, array $input): void
{
    $body = implode("\n", [
        '※このメールはシステムからの自動返信です',
        '',
        'お世話になっております。',
        '株式会社あわいコンサルティングでございます。',
        '',
        'この度はお問い合わせいただき、誠にありがとうございます。',
        '以下の内容でお問い合わせを受け付けいたしました。',
        '',
        'ーーーーーーーーーーー',
        '会社名：' . $input['company_name'],
        '担当者名：' . $input['person_name'],
        'メールアドレス：' . $input['email'],
        '電話番号：' . $input['phone'],
        '',
        'お問い合わせ内容：',
        $input['message'],
        'ーーーーーーーーーーー',
        '',
        '内容を確認のうえ、1営業日以内に担当者よりご連絡させていただきます。',
        '今しばらくお待ちくださいますようお願いいたします。',
    ]);

    $headers = build_mail_headers($config['from_email']);
    send_mail($config, $input['email'], $config['auto_reply_subject'], $body, $headers);
}

function build_mail_headers(string $fromEmail, ?string $replyToEmail = null): array
{
    $headers = [
        'From' => $fromEmail,
        'MIME-Version' => '1.0',
        'Content-Type' => 'text/plain; charset=UTF-8',
        'Content-Transfer-Encoding' => '8bit',
    ];

    if ($replyToEmail !== null && $replyToEmail !== '') {
        $headers['Reply-To'] = $replyToEmail;
    }

    return $headers;
}

function send_mail(array $config, string $to, string $subject, string $body, array $headers): void
{
    if (($config['transport'] ?? 'mail') !== 'mail') {
        throw new RuntimeException('現在の構成では mail transport のみをサポートしています。');
    }

    $additionalParams = '';

    if (!empty($config['return_path']) && !contains_header_injection_chars((string) $config['return_path'])) {
        $additionalParams = '-f' . $config['return_path'];
    }

    $sent = $additionalParams !== ''
        ? mb_send_mail($to, $subject, $body, $headers, $additionalParams)
        : mb_send_mail($to, $subject, $body, $headers);

    if (!$sent) {
        throw new RuntimeException('メール送信に失敗しました。');
    }
}

function respond_success(string $message, bool $expectsJson, string $returnTo = ''): void
{
    if ($expectsJson) {
        send_json(200, [
            'data' => [
                'sent' => true,
                'message' => $message,
            ],
        ]);
    }

    redirect_with_feedback($returnTo, 'success', $message);
}

function respond_validation_error(array $errors, bool $expectsJson, string $returnTo = ''): void
{
    if ($expectsJson) {
        send_json(422, [
            'error' => [
                'code' => 'INVALID_CONTACT_FORM',
                'message' => '入力内容をご確認ください。',
                'fields' => $errors,
            ],
        ]);
    }

    $firstError = reset($errors);
    redirect_with_feedback($returnTo, 'error', is_string($firstError) ? $firstError : '入力内容をご確認ください。');
}

function respond_error(
    int $statusCode,
    string $code,
    string $message,
    bool $expectsJson,
    string $returnTo = ''
): void {
    if ($expectsJson) {
        send_json($statusCode, [
            'error' => [
                'code' => $code,
                'message' => $message,
            ],
        ]);
    }

    if ($statusCode === 405) {
        http_response_code(405);
        header('Allow: POST');
        header('Content-Type: text/plain; charset=UTF-8');
        echo $message;
        exit;
    }

    redirect_with_feedback($returnTo, 'error', $message);
}

function send_json(int $statusCode, array $payload): void
{
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=UTF-8');
    header('Cache-Control: no-store');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function redirect_with_feedback(string $returnTo, string $status, string $message): void
{
    $target = $returnTo !== '' ? $returnTo : 'index.html#contact-form';
    $target = sanitize_return_to($target);
    [$path, $hash] = split_hash_fragment($target);
    $separator = str_contains($path, '?') ? '&' : '?';
    $location = $path . $separator . http_build_query([
        'contact_status' => $status,
        'contact_message' => $message,
    ]) . $hash;

    header('Location: ' . $location, true, 303);
    exit;
}

function sanitize_return_to(string $returnTo): string
{
    if (
        $returnTo === ''
        || preg_match('/^(?:https?:)?\/\//i', $returnTo) === 1
        || preg_match('/[\r\n]/', $returnTo) === 1
    ) {
        return 'index.html#contact-form';
    }

    if ($returnTo[0] !== '/') {
        return ltrim($returnTo, './');
    }

    return $returnTo;
}

function split_hash_fragment(string $target): array
{
    $parts = explode('#', $target, 2);
    $path = $parts[0] !== '' ? $parts[0] : 'index.html';
    $hash = isset($parts[1]) && $parts[1] !== '' ? '#' . $parts[1] : '';

    return [$path, $hash];
}
