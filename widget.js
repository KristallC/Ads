class VastaricAd extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    async connectedCallback() {
        // Адрес JSON
        const src = this.getAttribute('src') || 'https://kristallc.github.io/Ads/ads.json';

        try {
            // Добавляем ?v=timestamp, чтобы GitHub Pages не отдавал старый кэш при обновлении рекламы
            const response = await fetch(`${src}?v=${Math.floor(Date.now() / 60000)}`);
            if (!response.ok) return;

            const ads = await response.json();
            const activeAds = ads.filter(ad => ad.active && ad.weight > 0);

            // Если активной рекламы нет — просто ничего не рисуем, блок остаётся невидимым
            if (activeAds.length === 0) return;

            const selectedAd = this.pickAd(activeAds);
            this.render(selectedAd);
        } catch (err) {
            console.warn('[Vastaric Ads] Ошибка загрузки:', err);
        }
    }

    pickAd(ads) {
        // Стараемся не показывать одну и ту же рекламу два раза подряд при обновлении страницы
        const lastId = sessionStorage.getItem('vastaric_last_ad');
        let pool = ads;
        if (ads.length > 1 && lastId) {
            const filtered = ads.filter(ad => ad.id !== lastId);
            if (filtered.length > 0) pool = filtered;
        }

        // Взвешенный рандом (Weighted Random)
        const totalWeight = pool.reduce((sum, ad) => sum + ad.weight, 0);
        let random = Math.random() * totalWeight;

        for (const ad of pool) {
            if (random < ad.weight) {
                sessionStorage.setItem('vastaric_last_ad', ad.id);
                return ad;
            }
            random -= ad.weight;
        }
        return pool[0];
    }

    render(ad) {
        const badgeText = ad.badge || 'Реклама';

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
                .card {
                    background-color: #111827;
                    border: 1px solid #1f2937;
                    border-radius: 12px;
                    overflow: hidden;
                    transition: border-color 0.25s ease, transform 0.25s ease;
                    text-decoration: none;
                    display: block;
                    color: inherit;
                }
                .card:hover {
                    border-color: #374151;
                    transform: translateY(-2px);
                }
                .media {
                    position: relative;
                    width: 100%;
                    aspect-ratio: 16 / 9;
                    background-color: #1f2937;
                    overflow: hidden;
                }
                .media img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    display: block;
                    transition: transform 0.4s ease;
                }
                .card:hover .media img {
                    transform: scale(1.04);
                }
                .badge {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background: rgba(17, 24, 39, 0.78);
                    backdrop-filter: blur(6px);
                    color: #9ca3af;
                    font-size: 10px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.6px;
                    padding: 4px 8px;
                    border-radius: 6px;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                }
                .badge-inline {
                    display: inline-block;
                    background: #1f2937;
                    color: #9ca3af;
                    font-size: 10px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.6px;
                    padding: 3px 7px;
                    border-radius: 5px;
                    margin-bottom: 8px;
                }
                .body {
                    padding: 16px;
                }
                .title {
                    color: #f9fafb;
                    font-size: 15px;
                    font-weight: 700;
                    margin: 0 0 6px 0;
                    line-height: 1.3;
                }
                .text {
                    color: #9ca3af;
                    font-size: 12.5px;
                    line-height: 1.45;
                    margin: 0 0 14px 0;
                }
                .cta {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                    box-sizing: border-box;
                    padding: 9px 12px;
                    border-radius: 8px;
                    font-size: 12.5px;
                    font-weight: 600;
                    color: #f59e0b;
                    background: rgba(245, 158, 11, 0.08);
                    border: 1px solid rgba(245, 158, 11, 0.35);
                    transition: all 0.2s ease;
                }
                .card:hover .cta {
                    background: #f59e0b;
                    color: #111827;
                    border-color: #f59e0b;
                    box-shadow: 0 0 12px rgba(245, 158, 11, 0.35);
                }
            </style>

            <a class="card" href="${ad.url}" target="_blank" rel="noopener noreferrer">
                ${ad.image ? `
                    <div class="media" id="media-box">
                        <img src="${ad.image}" alt="${ad.title}" loading="lazy">
                        <span class="badge">${badgeText}</span>
                    </div>
                ` : ''}
                <div class="body">
                    <span class="badge-inline" id="fallback-badge" style="display: ${ad.image ? 'none' : 'inline-block'};">${badgeText}</span>
                    <h4 class="title">${ad.title}</h4>
                    <p class="text">${ad.text}</p>
                    <div class="cta">${ad.cta || 'Подробнее'} ↗</div>
                </div>
            </a>
        `;

        // Перехват ошибки загрузки картинки
        const img = this.shadowRoot.querySelector('img');
        if (img) {
            img.addEventListener('error', () => {
                const mediaBox = this.shadowRoot.getElementById('media-box');
                const fallbackBadge = this.shadowRoot.getElementById('fallback-badge');
                if (mediaBox) mediaBox.remove();
                if (fallbackBadge) fallbackBadge.style.display = 'inline-block';
            });
        }
    }
}

customElements.define('vastaric-ad', VastaricAd);
