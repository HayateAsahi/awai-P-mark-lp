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

    // Scroll reveal
    const revealSections = document.querySelectorAll('.reveal-section');

    if (!revealSections.length) {
        return;
    }

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
});
