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
    const resolveContactApiUrl = () => {
        const metaBaseUrl = document.querySelector('meta[name="awai-api-base-url"]')?.content?.trim();
        const configuredBaseUrl = metaBaseUrl || window.AWAI_API_BASE_URL;

        if (configuredBaseUrl) {
            return new URL('/api/contact', configuredBaseUrl).toString();
        }

        if (window.location.protocol === 'file:') {
            return 'http://127.0.0.1:8000/api/contact';
        }

        const isLocalStaticServer = ['5500', '8080'].includes(window.location.port);

        if (isLocalStaticServer) {
            return `${window.location.protocol}//${window.location.hostname}:8000/api/contact`;
        }

        return '/api/contact';
    };

    const contactApiUrl = resolveContactApiUrl();

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
    const contactForm = document.querySelector('#contact-form');
    const privacyConsent = document.querySelector('#privacy-consent');
    const contactSubmit = document.querySelector('#contact-submit');
    const contactFeedback = document.querySelector('#contact-feedback');
    const contactSubmitDefaultLabel = contactSubmit ? contactSubmit.textContent : '';

    if (contactForm && privacyConsent && contactSubmit) {
        let isSubmitting = false;

        const syncSubmitState = () => {
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

        syncSubmitState();

        contactForm.addEventListener('input', syncSubmitState);
        contactForm.addEventListener('change', syncSubmitState);
        contactForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            if (!contactForm.checkValidity()) {
                contactForm.reportValidity();
                syncSubmitState();
                return;
            }

            const formData = new FormData(contactForm);
            formData.delete('privacy_consent');

            isSubmitting = true;
            setFeedback('');
            contactSubmit.textContent = '送信中...';
            syncSubmitState();

            try {
                const response = await fetch(contactApiUrl, {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (!response.ok || !result.data?.sent) {
                    throw new Error(result.error?.message || 'お問い合わせの送信に失敗しました。時間をおいて再度お試しください。');
                }

                setFeedback(result.data.message || 'お問い合わせを受け付けました。', 'success');
                contactForm.reset();
            } catch (error) {
                setFeedback(error.message || 'お問い合わせの送信に失敗しました。時間をおいて再度お試しください。', 'error');
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
