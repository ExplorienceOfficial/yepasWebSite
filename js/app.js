/* ==========================================================================
   YEPAŞ - Yenimahalle Ekmek Pazarlama A.Ş. JavaScript App
   ========================================================================== */

// 1. Products Database
const productsData = [
    {
        id: 1,
        slug: "sade-roll-ekmek",
        title: "Sade Roll Ekmek",
        category: "roll",
        weight: "50 gr / 70 gr",
        shelfLife: "Günlük Sipariş / Taze",
        package: "Özel Jelatin Ambalajlı",
        image: "assets/lezzetlerimiz/1.jpg",
        badge: "En Çok Tercih Edilen",
        desc: "El değmeden tam otomatik hatlarda üretilen, otel, restoran, catering ve kurumsal tesisler için hijyenik tekli ambalajında günlük sade roll ekmek.",
        ingredients: "Buğday unu, içme suyu, maya, tuz, un geliştirici."
    },
    {
        id: 2,
        slug: "kepekli-roll-ekmek",
        title: "Kepekli Roll Ekmek",
        category: "roll",
        weight: "50 gr",
        shelfLife: "Günlük Sipariş / Taze",
        package: "Özel Jelatin Ambalajlı",
        image: "assets/lezzetlerimiz/2.jpg",
        badge: "Diyet & Lifli",
        desc: "Yüksek kepek ve lif oranı ile sindirimi kolaylaştıran, kurumsal beslenme programlarına uygun sağlıklı kepekli roll ekmek.",
        ingredients: "Tam kepekli buğday unu, kepek, içme suyu, maya, tuz."
    },
    {
        id: 3,
        slug: "tam-bugday-roll-ekmek",
        title: "Tam Buğday Roll Ekmek",
        category: "roll",
        weight: "50 gr",
        shelfLife: "Günlük Sipariş / Taze",
        package: "Özel Jelatin Ambalajlı",
        image: "assets/lezzetlerimiz/3.jpg",
        badge: "%100 Tam Buğday",
        desc: "Doğal rüşeym ve kepek dengesi korunarak üretilen, besin değeri yüksek %100 tam buğday roll ekmek.",
        ingredients: "Tam buğday unu, rüşeym, içme suyu, ekşi maya, tuz."
    },
    {
        id: 4,
        slug: "cavdarli-roll-ekmek",
        title: "Çavdarlı Roll Ekmek",
        category: "roll",
        weight: "50 gr",
        shelfLife: "Günlük Sipariş / Taze",
        package: "Özel Jelatin Ambalajlı",
        image: "assets/lezzetlerimiz/4.jpg",
        badge: "Geleneksel Çavdar",
        desc: "Yoğun aromalı çavdar unundan hazırlanan, tokluk hissi veren özel aromalı çavdar ekmeği.",
        ingredients: "Çavdar unu, buğday unu, içme suyu, çavdar ekşi mayası, tuz."
    },
    {
        id: 5,
        slug: "tuzsuz-roll-ekmek",
        title: "Tuzsuz Roll Ekmek",
        category: "roll",
        weight: "50 gr",
        shelfLife: "Günlük Sipariş / Taze",
        package: "Özel Jelatin Ambalajlı",
        image: "assets/lezzetlerimiz/5.jpg",
        badge: "Hastane & Diyet",
        desc: "Tuz ilavesiz olarak üretilen, hastaneler, diyet mönüleri ve sağlık odaklı toplu tüketim için ideal roll ekmek.",
        ingredients: "Buğday unu, içme suyu, özel hamur mayası."
    },
    {
        id: 6,
        slug: "aycekirdekli-roll-ekmek",
        title: "Ayçekirdekli Roll Ekmek",
        category: "roll",
        weight: "60 gr",
        shelfLife: "Günlük Sipariş / Taze",
        package: "Özel Jelatin Ambalajlı",
        image: "assets/lezzetlerimiz/6.jpg",
        badge: "Tohumlu Gurme",
        desc: "İçi ve üzeri bol ayçekirdeği içi ile zenginleştirilmiş, gurme kahvaltı ve sandviç mönüleri için taze roll ekmek.",
        ingredients: "Buğday unu, ayçekirdeği içi, içme suyu, maya, tuz."
    },
    {
        id: 7,
        slug: "susamli-sandvic-ekmegi",
        title: "Susamlı Sandviç Ekmeği",
        category: "fastfood",
        weight: "75 gr / 100 gr",
        shelfLife: "Günlük Sipariş",
        package: "Koli & Paket Ambalaj",
        image: "assets/lezzetlerimiz/7.jpg",
        badge: "Restoran & Kafe",
        desc: "Yumuşak dokulu, susam kaplamalı, sandviç ve soğuk büfe sunumları için özel boyutlandırılmış sandviç ekmeği.",
        ingredients: "Özel sandviç unu, susam, içme suyu, maya, bitkisel yağ, tuz."
    },
    {
        id: 8,
        slug: "susamli-hamburger-ekmegi",
        title: "Susamlı Hamburger Ekmeği",
        category: "fastfood",
        weight: "80 gr / 100 gr",
        shelfLife: "Günlük Sipariş",
        package: "Koli & Paket Ambalaj",
        image: "assets/lezzetlerimiz/8.jpg",
        badge: "Burger Serisi",
        desc: "Hafif ve pürüzsüz yapısıyla burger köftesinin suyunu emen, parçalanmayan yüksek kaliteli hamburger ekmeği.",
        ingredients: "Buğday unu, ayıklanmış susam, içme suyu, maya, şeker, tuz."
    },
    {
        id: 9,
        slug: "baston-ekmek",
        title: "Baston Ekmek (Standart Somun)",
        category: "tradition",
        weight: "200 gr / 250 gr",
        shelfLife: "Günlük Taze",
        package: "Kâğıt Kese / Kasa",
        image: "assets/lezzetlerimiz/9.jpg",
        badge: "Geleneksel Tat",
        desc: "Geleneksel fırıncılık usullerine uygun olarak pişirilen, çıtır kabuklu standart somun ekmek.",
        ingredients: "Tip 650 Buğday unu, ekşi maya, tuz, içme suyu."
    },
    {
        id: 10,
        slug: "tas-firin-koy-ekmegi",
        title: "Taş Fırın Köy Ekmeği",
        category: "tradition",
        weight: "400 gr",
        shelfLife: "2 Gün",
        package: "Hijyenik Ambalaj",
        image: "assets/lezzetlerimiz/10.jpg",
        badge: "Doğal Ekşi Mayalı",
        desc: "Uzun süre bayatlamayan, gözenekli iç yapısı ve yoğun mayalanma aroması ile katkısız taş fırın köy ekmeği.",
        ingredients: "Köy unu, tam buğday unu, doğal geleneksel ekşi maya, tuz, su."
    },
    {
        id: 11,
        slug: "zeytinli-otlu-ciabatta",
        title: "Zeytinli & Otlu Ciabatta",
        category: "tradition",
        weight: "120 gr",
        shelfLife: "Günlük Sipariş",
        package: "Özel Ambalaj",
        image: "assets/lezzetlerimiz/11.jpg",
        badge: "İtalyan Tipi İtina",
        desc: "Sızma zeytinyağı ve kekik ikilisi ile lezzetlendirilmiş, yüksek nem oranlı İtalyan usulü ciabatta ekmeği.",
        ingredients: "Sert buğday unu, sızma zeytinyağı, zeytin dilimleri, kekik, maya, tuz."
    },
    {
        id: 12,
        slug: "cepli-pita-ekmegi",
        title: "Cepli Pita Ekmeği",
        category: "fastfood",
        weight: "70 gr",
        shelfLife: "Günlük Sipariş",
        package: "Paketli Ambalaj",
        image: "assets/lezzetlerimiz/12.jpg",
        badge: "Pratik Cep Yapılı",
        desc: "Fırında kabararak kendiliğinden cep oluşturan, döner, köfte ve falafel büfeleri için ideal pita ekmeği.",
        ingredients: "Buğday unu, içme suyu, maya, çok az şeker, tuz."
    }
];

// Document Loaded Init
document.addEventListener("DOMContentLoaded", () => {
    // If we are on urun.html
    if (window.location.pathname.includes("urun.html")) {
        initProductPage();
        initMobileNav();
        return;
    }

    // Otherwise, we are on index.html
    initHeroSlider();
    renderProducts('all');
    initProductFilters();
    initMobileNav();
    initScrollSpy();
    initFaq();
});

// 2. Hero Photo Slider Implementation (Requirement 2)
function initHeroSlider() {
    const slidesWrapper = document.querySelector(".slides-wrapper");
    const indicatorsContainer = document.querySelector(".slider-indicators");
    
    if (!slidesWrapper || !indicatorsContainer) return;

    // Dynamically generate the 8 slides from assets/general/ (removed 3-74c915637a.jpg for the about section)
    const generalImages = [
        "1-a9d0831b70.jpg", "2-f5e3c773fd.jpg", 
        "4-25a8580171.jpg", "5-18dd4a9af3.jpg", "6-802e09c169.jpg", 
        "7-d79e2fc265.jpg", "8-a35edb4950.jpg", "9-054aac7518.jpg"
    ];

    slidesWrapper.innerHTML = generalImages.map((img, index) => `
        <div class="slide ${index === 0 ? 'active' : ''}">
            <img src="assets/general/${img}" alt="YEPAŞ Genel Tanıtım ${index + 1}" class="slide-img" />
            <div class="slide-overlay">
                <div class="container">
                    <div class="slide-content">
                        <span class="slide-tag">Yenimahalle Ekmek Pazarlama A.Ş.</span>
                        <h1 class="slide-title">Ankara'nın En Modern Entegre Ekmek Üretim Tesisleri</h1>
                        <p class="slide-desc">Oteller, hastaneler, kamu kurumları ve restoranlar için el değmeden, tam otomatik hatlarda günlük taze ekmek üretimi yapıyoruz.</p>
                        <div class="slide-buttons">
                            <a href="#urunlerimiz" class="btn btn-primary">Ürünlerimizi İnceleyin</a>
                            <a href="#iletisim" class="btn btn-outline" style="color:white; border-color:white;">İletişim</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    indicatorsContainer.innerHTML = generalImages.map((_, index) => `
        <span class="indicator ${index === 0 ? 'active' : ''}"></span>
    `).join('');

    const slides = document.querySelectorAll(".slide");
    const indicators = document.querySelectorAll(".indicator");
    const prevBtn = document.querySelector(".slider-prev");
    const nextBtn = document.querySelector(".slider-next");

    let currentIndex = 0;
    let autoPlayTimer = null;

    function goToSlide(index) {
        slides.forEach(slide => slide.classList.remove("active"));
        indicators.forEach(ind => ind.classList.remove("active"));

        currentIndex = (index + slides.length) % slides.length;

        slides[currentIndex].classList.add("active");
        if (indicators[currentIndex]) {
            indicators[currentIndex].classList.add("active");
        }
    }

    function nextSlide() {
        goToSlide(currentIndex + 1);
    }

    function prevSlide() {
        goToSlide(currentIndex - 1);
    }

    function startAutoPlay() {
        stopAutoPlay();
        autoPlayTimer = setInterval(nextSlide, 5000);
    }

    function stopAutoPlay() {
        if (autoPlayTimer) clearInterval(autoPlayTimer);
    }

    if (nextBtn) {
        nextBtn.addEventListener("click", () => {
            nextSlide();
            startAutoPlay();
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener("click", () => {
            prevSlide();
            startAutoPlay();
        });
    }

    indicators.forEach((ind, i) => {
        ind.addEventListener("click", () => {
            goToSlide(i);
            startAutoPlay();
        });
    });

    // Touch Swipe Support
    let touchStartX = 0;
    let touchEndX = 0;

    const sliderElement = document.querySelector(".hero-slider");
    if (sliderElement) {
        sliderElement.addEventListener("touchstart", e => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        sliderElement.addEventListener("touchend", e => {
            touchEndX = e.changedTouches[0].screenX;
            if (touchStartX - touchEndX > 50) nextSlide();
            if (touchEndX - touchStartX > 50) prevSlide();
            startAutoPlay();
        }, { passive: true });
    }

    startAutoPlay();
}

// 3. Products Catalog Render & Filtering (Requirement 6)
function renderProducts(categoryFilter = 'all') {
    const productsGrid = document.getElementById("productsGrid");
    if (!productsGrid) return;

    const filtered = categoryFilter === 'all' 
        ? productsData 
        : productsData.filter(p => p.category === categoryFilter);

    productsGrid.innerHTML = filtered.map(item => `
        <div class="product-card" data-id="${item.id}">
            <div class="product-img-box">
                <a href="${item.slug}.html">
                    <img src="${item.image}" alt="${item.title}" loading="lazy" />
                </a>
                <span class="product-badge">${item.badge}</span>
            </div>
            <div class="product-content">
                <h3 class="product-title"><a href="${item.slug}.html" style="color:inherit; text-decoration:none;">${item.title}</a></h3>
                <p class="product-desc">${item.desc}</p>
                <div class="product-meta">
                    <div class="product-spec">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                        <span>${item.weight}</span>
                    </div>
                    <a class="btn btn-outline-orange" href="${item.slug}.html">
                        Detaylı İncele
                    </a>
                </div>
            </div>
        </div>
    `).join('');
}

function initProductFilters() {
    const filterBtns = document.querySelectorAll(".filter-btn");
    filterBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            filterBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            const filterValue = btn.getAttribute("data-filter");
            renderProducts(filterValue);
        });
    });
}

// 4. Product Modal Popup
window.openProductModal = function(productId) {
    const product = productsData.find(p => p.id === productId);
    if (!product) return;

    const modal = document.getElementById("productModal");
    const modalBody = document.getElementById("modalBody");

    if (!modal || !modalBody) return;

    modalBody.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; align-items: center;">
            <img src="${product.image}" alt="${product.title}" style="width:100%; height:280px; object-fit:cover; border-radius:12px;" />
            <div>
                <span class="product-badge" style="position:static; display:inline-block; margin-bottom:0.8rem;">${product.badge}</span>
                <h2 style="color:var(--primary-blue); font-size:1.8rem; margin-bottom:0.5rem;">${product.title}</h2>
                <p style="color:var(--text-muted); font-size:0.95rem; margin-bottom:1.5rem;">${product.desc}</p>
                
                <div style="background:var(--bg-secondary); padding:1rem; border-radius:10px; margin-bottom:1.5rem;">
                    <div style="display:flex; justify-between; margin-bottom:0.4rem; font-size:0.9rem;">
                        <strong>Gramaj:</strong> <span>${product.weight}</span>
                    </div>
                    <div style="display:flex; justify-between; margin-bottom:0.4rem; font-size:0.9rem;">
                        <strong>Tazelik & Raf Ömrü:</strong> <span>${product.shelfLife}</span>
                    </div>
                    <div style="display:flex; justify-between; font-size:0.9rem;">
                        <strong>Ambalaj Tipi:</strong> <span>${product.package}</span>
                    </div>
                </div>

                <p style="font-size:0.85rem; color:var(--text-body);"><strong>İçindekiler:</strong> ${product.ingredients}</p>
                
                <a href="#iletisim" onclick="closeModal('productModal')" class="btn btn-primary" style="margin-top:1.5rem; width:100%;">
                    Toptan Sipariş & Bilgi Al
                </a>
            </div>
        </div>
    `;

    modal.classList.add("active");
};

window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove("active");
};


// 6. Mobile Drawer Navigation Toggle
function initMobileNav() {
    const toggle = document.getElementById("mobileToggle");
    const menu = document.getElementById("navMenu");

    if (toggle && menu) {
        toggle.addEventListener("click", () => {
            menu.classList.toggle("active");
        });

        // Close menu when clicking link
        menu.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", () => {
                menu.classList.remove("active");
            });
        });
    }
}

// 7. Navbar Scroll Highlight & Sticky Shadow
function initScrollSpy() {
    const navbar = document.querySelector(".navbar");
    const sections = document.querySelectorAll("section[id]");
    const navLinks = document.querySelectorAll(".nav-link");

    window.addEventListener("scroll", () => {
        if (window.scrollY > 50) {
            navbar.style.boxShadow = "0 8px 24px rgba(10, 37, 64, 0.12)";
        } else {
            navbar.style.boxShadow = "0 2px 8px rgba(10, 37, 64, 0.04)";
        }

        let currentSection = "";
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 120;
            const sectionHeight = section.offsetHeight;
            if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
                currentSection = section.getAttribute("id");
            }
        });

        navLinks.forEach(link => {
            link.classList.remove("active");
            if (link.getAttribute("href") === `#${currentSection}`) {
                link.classList.add("active");
            }
        });
    });
}

// 8. Contact Form Submission Handler
window.handleContactSubmit = function(event) {
    event.preventDefault();
    alert("Teşekkür Ederiz! Mesajınız ve sipariş talebiniz YEPAŞ müşteri temsilcilerine iletilmiştir. En kısa sürede sizinle iletişime geçilecektir.");
    event.target.reset();
    return false;
};

// 9. FAQ Accordion Logic
function initFaq() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const questionBtn = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');
        
        questionBtn.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            
            // Close all other faqs
            faqItems.forEach(otherItem => {
                otherItem.classList.remove('active');
                otherItem.querySelector('.faq-answer').style.maxHeight = null;
            });

            if (!isActive) {
                item.classList.add('active');
                answer.style.maxHeight = answer.scrollHeight + "px";
            }
        });
    });
}

// 10. Product Detail Page Logic (urun.html)
function initProductPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('p');

    if (!slug) {
        document.getElementById('product-detail-container').innerHTML = `
            <h2>Ürün Bulunamadı</h2>
            <p>Geçersiz bir ürün sayfasına ulaştınız.</p>
            <a href="index.html" class="btn btn-primary" style="margin-top: 1rem;">Ana Sayfaya Dön</a>
        `;
        return;
    }

    const product = productsData.find(p => p.slug === slug);

    if (!product) {
        document.getElementById('product-detail-container').innerHTML = `
            <h2>Ürün Bulunamadı</h2>
            <p>Aradığınız ürün stoklarımızda veya veritabanımızda bulunmamaktadır.</p>
            <a href="index.html" class="btn btn-primary" style="margin-top: 1rem;">Ana Sayfaya Dön</a>
        `;
        return;
    }

    // Set page title for SEO
    document.title = product.title + " | YEPAŞ Ekmek Fabrikası";

    // Inject Product Details
    document.getElementById('product-detail-container').innerHTML = `
        <div class="product-detail-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; align-items: start;">
            <div class="product-detail-image" style="border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
                <img src="${product.image}" alt="${product.title}" style="width: 100%; height: auto; display: block;" />
            </div>
            <div class="product-detail-content">
                <span class="product-badge" style="background: var(--primary-orange-light); color: var(--primary-orange); padding: 5px 12px; border-radius: 20px; font-weight: 700; font-size: 0.85rem;">${product.badge}</span>
                <h1 style="color: var(--primary-blue); font-size: 2.5rem; margin: 1rem 0;">${product.title}</h1>
                <p style="font-size: 1.1rem; line-height: 1.7; color: #555; margin-bottom: 2rem;">${product.desc}</p>
                
                <h3 style="font-size: 1.2rem; color: #333; border-bottom: 1px solid #ddd; padding-bottom: 0.5rem; margin-bottom: 1rem;">Ürün Özellikleri</h3>
                <ul style="list-style: none; margin-bottom: 2rem;">
                    <li style="margin-bottom: 0.8rem; display: flex; align-items: center; gap: 10px;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary-orange)" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                        <strong>Gramaj:</strong> ${product.weight}
                    </li>
                    <li style="margin-bottom: 0.8rem; display: flex; align-items: center; gap: 10px;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary-orange)" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        <strong>Raf Ömrü:</strong> ${product.shelfLife}
                    </li>
                    <li style="margin-bottom: 0.8rem; display: flex; align-items: center; gap: 10px;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary-orange)" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                        <strong>Ambalaj:</strong> ${product.package}
                    </li>
                </ul>

                <h3 style="font-size: 1.2rem; color: #333; border-bottom: 1px solid #ddd; padding-bottom: 0.5rem; margin-bottom: 1rem;">İçindekiler</h3>
                <p style="font-size: 1rem; color: #555; background: #f9f9f9; padding: 1rem; border-radius: 8px;">${product.ingredients}</p>
                
                <div style="margin-top: 3rem; display: flex; gap: 1rem;">
                    <a href="https://wa.me/903122763070" class="btn btn-primary" target="_blank">Sipariş İçin Ulaşın</a>
                    <a href="index.html#urunlerimiz" class="btn btn-outline">Tüm Ürünlere Dön</a>
                </div>
            </div>
        </div>
    `;

    // Make it responsive for mobile
    if (window.innerWidth <= 768) {
        document.querySelector('.product-detail-grid').style.gridTemplateColumns = '1fr';
    }
}
