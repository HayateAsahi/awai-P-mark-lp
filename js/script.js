// Tailwind config
window.tailwind = window.tailwind || {};
window.tailwind.config = {
    theme: {
        extend: {
            fontFamily: {
                sans: ['"Noto Sans JP"', 'sans-serif']
            },
            colors: {
                sky: { 100: '#e0f2fe', 800: '#075985', 900: '#0c4a6e' },
                amber: { 500: '#f59e0b', 600: '#d97706' },
                slate: { 50: '#f8fafc', 800: '#1e293b', 900: '#0f172a' }
            }
        }
    }
};

// UI behavior
document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.querySelector('#contact-form');
    const contactApiUrl = contactForm?.getAttribute('action') || 'contact.php';

    // Header offset sync
    const root = document.documentElement;
    const siteHeader = document.querySelector('.site-header');

    const syncHeaderHeight = () => {
        if (!siteHeader) {
            return;
        }

        root.style.setProperty('--site-header-height', `${siteHeader.offsetHeight}px`);
    };

    syncHeaderHeight();
    window.addEventListener('load', syncHeaderHeight);
    window.addEventListener('resize', syncHeaderHeight);

    if (siteHeader && 'ResizeObserver' in window) {
        const headerResizeObserver = new ResizeObserver(() => {
            syncHeaderHeight();
        });

        headerResizeObserver.observe(siteHeader);
    }

    // Keep submit disabled until the full contact form is valid.
    const privacyConsent = document.querySelector('#privacy-consent');
    const contactSubmit = document.querySelector('#contact-submit');
    const contactFeedback = document.querySelector('#contact-feedback');
    const contactSubmitDefaultLabel = contactSubmit ? contactSubmit.textContent : '';

    if (contactForm && privacyConsent && contactSubmit) {
        let isSubmitting = false;
        const emailInput = contactForm.querySelector('input[name="email"]');
        const phoneInput = contactForm.querySelector('input[name="phone"]');
        const emailError = document.querySelector('#contact-email-error');
        const phoneError = document.querySelector('#contact-phone-error');
        const fieldRules = [
            {
                input: emailInput,
                error: emailError,
                message: 'メールアドレスの形式が正しくありません。',
                isValid: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
            },
            {
                input: phoneInput,
                error: phoneError,
                message: '電話番号は数字・ハイフンを含む6〜20文字で入力してください。',
                isValid: (value) => /^[\d\-+() ]{6,20}$/.test(value)
            }
        ];

        const syncFieldErrors = () => {
            let isValid = true;

            fieldRules.forEach(({ input, error, message, isValid: validateValue }) => {
                if (!input || !error) {
                    return;
                }

                const value = input.value.trim();
                const hasFormatError = value !== '' && !validateValue(value);

                input.setCustomValidity(hasFormatError ? message : '');
                input.setAttribute('aria-invalid', hasFormatError ? 'true' : 'false');
                error.textContent = hasFormatError ? message : '';

                if (hasFormatError) {
                    isValid = false;
                }
            });

            return isValid;
        };

        const syncSubmitState = () => {
            syncFieldErrors();
            contactSubmit.disabled = isSubmitting || !contactForm.checkValidity();
        };

        const setFeedback = (message, type = '') => {
            if (!contactFeedback) {
                return;
            }

            contactFeedback.textContent = message;
            contactFeedback.className = 'contact-form__feedback';

            if (type) {
                contactFeedback.classList.add(`contact-form__feedback--${type}`);
            }
        };

        const applyFeedbackFromQuery = () => {
            const params = new URLSearchParams(window.location.search);
            const status = params.get('contact_status');
            const message = params.get('contact_message');

            if (!status || !message) {
                return;
            }

            setFeedback(message, status === 'success' ? 'success' : 'error');
            params.delete('contact_status');
            params.delete('contact_message');

            const nextSearch = params.toString();
            const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`;
            window.history.replaceState({}, document.title, nextUrl);
        };

        applyFeedbackFromQuery();
        syncSubmitState();

        contactForm.addEventListener('input', syncSubmitState);
        contactForm.addEventListener('change', syncSubmitState);
        contactForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const hasValidInlineFields = syncFieldErrors();

            if (!contactForm.checkValidity()) {
                if (hasValidInlineFields) {
                    contactForm.reportValidity();
                }
                syncSubmitState();
                return;
            }

            const formData = new FormData(contactForm);

            isSubmitting = true;
            setFeedback('');
            contactSubmit.textContent = '送信中...';
            syncSubmitState();

            try {
                const response = await fetch(contactApiUrl, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        Accept: 'application/json'
                    }
                });
                const isJson = response.headers.get('content-type')?.includes('application/json');
                const result = isJson ? await response.json() : null;

                if (!response.ok || !result?.data?.sent) {
                    if (result?.error?.fields) {
                        const firstFieldError = Object.values(result.error.fields)[0];
                        throw new Error(firstFieldError || result.error.message || '入力内容をご確認ください。');
                    }

                    throw new Error(result?.error?.message || 'お問い合わせの送信に失敗しました。時間をおいて再度お試しください。');
                }

                setFeedback(result.data.message || 'お問い合わせを受け付けました。', 'success');
                contactForm.reset();
            } catch (error) {
                const message = error instanceof Error && error.message
                    ? error.message
                    : 'お問い合わせの送信に失敗しました。時間をおいて再度お試しください。';
                setFeedback(message, 'error');
            } finally {
                isSubmitting = false;
                contactSubmit.textContent = contactSubmitDefaultLabel;
                syncSubmitState();
            }
        });
    }

    // Scroll reveal
    const revealSections = document.querySelectorAll('.reveal-section');

    if (revealSections.length) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) {
                    return;
                }

                entry.target.classList.add('reveal-section--visible');
                observer.unobserve(entry.target);
            });
        }, {
            threshold: 0.1
        });

        revealSections.forEach((section) => {
            observer.observe(section);
        });
    }
});
