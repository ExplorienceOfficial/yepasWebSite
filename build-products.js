const fs = require('fs');
const path = require('path');

const productsData = [
    {
        id: 1,
        slug: "sade-roll-ekmek",
        title: "Sade Roll Ekmek",
        category: "roll",
        categoryName: "Roll Ekmekler",
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
        categoryName: "Roll Ekmekler",
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
        categoryName: "Roll Ekmekler",
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
        categoryName: "Roll Ekmekler",
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
        categoryName: "Roll Ekmekler",
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
        categoryName: "Roll Ekmekler",
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
        categoryName: "Sandviç & Burger",
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
        categoryName: "Sandviç & Burger",
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
        categoryName: "Geleneksel & Özel",
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
        categoryName: "Geleneksel & Özel",
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
        categoryName: "Geleneksel & Özel",
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
        categoryName: "Sandviç & Burger",
        weight: "70 gr",
        shelfLife: "Günlük Sipariş",
        package: "Paketli Ambalaj",
        image: "assets/lezzetlerimiz/12.jpg",
        badge: "Pratik Cep Yapılı",
        desc: "Fırında kabararak kendiliğinden cep oluşturan, döner, köfte ve falafel büfeleri için ideal pita ekmeği.",
        ingredients: "Buğday unu, içme suyu, maya, çok az şeker, tuz."
    }
];

function generateHTML(product) {
    const related = productsData.filter(p => p.id !== product.id).slice(0, 3);

    const relatedCards = related.map(item => `
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

    return `<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="YEPAŞ ${product.title} - Toptan sipariş, gramaj bilgileri ve detaylar. Yenimahalle Ekmek Pazarlama A.Ş.">
    <meta name="keywords" content="${product.title}, yepaş ekmek, toptan roll ekmek, ankara fırın, ${product.categoryName}">
    <meta name="author" content="YEPAŞ Yenimahalle Ekmek Pazarlama A.Ş.">
    <title>${product.title} | YEPAŞ Ekmek Fabrikası</title>
    
    <!-- Favicon & Fonts -->
    <link rel="icon" type="image/png" href="assets/logo.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    
    <!-- CSS Design System -->
    <link rel="stylesheet" href="css/style.css">
</head>
<body>

    <!-- 1. Top Bar -->
    <div class="top-bar">
        <div class="container top-bar-content">
            <div class="top-info">
                <div class="top-info-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    <span>0312 276 30 70</span>
                </div>
                <div class="top-info-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    <span>info@yepas.com.tr</span>
                </div>
                <div class="top-info-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    <span>Sincan OSB, Ankara</span>
                </div>
            </div>
            <div class="top-socials">
                <a href="https://x.com/YepasEkmek" target="_blank" class="social-icon" title="X (Twitter)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/></svg>
                </a>
                <a href="https://instagram.com/yepasekmek" target="_blank" class="social-icon" title="Instagram">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                </a>
                <a href="https://facebook.com/yepasekmek" target="_blank" class="social-icon" title="Facebook">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                </a>
                <a href="https://wa.me/903122763070" target="_blank" class="social-icon" title="WhatsApp">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                </a>
            </div>
        </div>
    </div>

    <!-- 2. Navbar Navigation -->
    <nav class="navbar" style="position: relative; background: white; border-bottom: 1px solid #eee;">
        <div class="container navbar-container">
            <a href="index.html" class="brand-logo">
                <img src="assets/logo.png" alt="YEPAŞ Logo" style="height: 105px; width: auto; display: block;" />
            </a>
            <ul class="nav-menu" id="navMenu">
                <li><a href="index.html#anasayfa" class="nav-link">Ana Sayfa</a></li>
                <li><a href="index.html#kurumsal" class="nav-link">Kurumsal</a></li>
                <li><a href="index.html#urunlerimiz" class="nav-link active">Ürünlerimiz</a></li>
                <li><a href="index.html#kalite-sertifikalar" class="nav-link">Kalite & Sertifikalar</a></li>
                <li><a href="index.html#sss" class="nav-link">SSS</a></li>
                <li><a href="index.html#iletisim" class="nav-link">İletişim</a></li>
            </ul>
            <div class="nav-actions">
                <a href="tel:+903122763070" class="btn btn-outline" style="border-color: #eaeaea; color: var(--primary-blue); gap: 0.5rem; padding: 0.6rem 1.2rem; background: #fff;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary-orange)" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    <span style="font-weight: 700; font-size: 1rem;">0312 276 30 70</span>
                </a>
                <a href="https://wa.me/903122763070" class="btn btn-primary" target="_blank" style="gap: 0.5rem; padding: 0.6rem 1.2rem; font-size: 1rem;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                    <span>Fiyat Teklifi Al</span>
                </a>
                <button class="mobile-toggle" id="mobileToggle" aria-label="Menüyü Aç/Kapat">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                </button>
            </div>
        </div>
    </nav>

    <!-- BREADCRUMB HERO -->
    <div style="background: #F8F9FA; padding: 2rem 0; border-bottom: 1px solid #EAEAEA;">
        <div class="container">
            <div style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 0.5rem;">
                <a href="index.html" style="color: var(--text-muted); text-decoration: none;">Ana Sayfa</a> &nbsp;/&nbsp; 
                <a href="index.html#urunlerimiz" style="color: var(--text-muted); text-decoration: none;">Ürünlerimiz</a> &nbsp;/&nbsp; 
                <span style="color: var(--primary-orange); font-weight: 600;">${product.title}</span>
            </div>
            <h1 style="color: var(--primary-blue); font-size: 2.2rem; font-weight: 800; margin: 0;">${product.title}</h1>
        </div>
    </div>

    <!-- PRODUCT DETAIL SECTION -->
    <section class="section-padding" style="background: #ffffff; min-height: 60vh;">
        <div class="container">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 3.5rem; align-items: start;">
                <!-- Left: Product Image & Badge -->
                <div style="position: relative; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08); border: 1px solid #F0F0F0;">
                    <img src="${product.image}" alt="${product.title}" style="width: 100%; height: 420px; object-fit: cover; display: block;" />
                    <span class="product-badge" style="top: 20px; left: 20px; font-size: 0.9rem; padding: 0.4rem 1rem;">${product.badge}</span>
                </div>

                <!-- Right: Content & Specs -->
                <div>
                    <span class="section-tag">${product.categoryName}</span>
                    <h2 style="color: var(--primary-blue); font-size: 2.4rem; font-weight: 800; margin-bottom: 1rem; line-height: 1.2;">${product.title}</h2>
                    <p style="color: var(--text-body); font-size: 1.1rem; line-height: 1.7; margin-bottom: 2rem;">${product.desc}</p>
                    
                    <!-- Spec Grid -->
                    <div style="background: #F8F9FA; border: 1px solid #EAEAEA; border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem;">
                        <h4 style="color: var(--primary-blue); font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem; border-bottom: 1px solid #EAEAEA; padding-bottom: 0.5rem;">Ürün Teknik Özellikleri</h4>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                            <div>
                                <span style="font-size: 0.85rem; color: var(--text-muted); display: block;">Gramaj / Boyut</span>
                                <strong style="color: var(--primary-blue); font-size: 1rem;">${product.weight}</strong>
                            </div>
                            <div>
                                <span style="font-size: 0.85rem; color: var(--text-muted); display: block;">Tazelik & Raf Ömrü</span>
                                <strong style="color: var(--primary-blue); font-size: 1rem;">${product.shelfLife}</strong>
                            </div>
                            <div>
                                <span style="font-size: 0.85rem; color: var(--text-muted); display: block;">Ambalaj Tipi</span>
                                <strong style="color: var(--primary-blue); font-size: 1rem;">${product.package}</strong>
                            </div>
                            <div>
                                <span style="font-size: 0.85rem; color: var(--text-muted); display: block;">Üretim Standartı</span>
                                <strong style="color: var(--primary-blue); font-size: 1rem;">ISO 22000 & Helal Sertifikalı</strong>
                            </div>
                        </div>

                        <div style="margin-top: 1.2rem; padding-top: 1rem; border-top: 1px solid #EAEAEA;">
                            <span style="font-size: 0.85rem; color: var(--text-muted); display: block;">İçindekiler</span>
                            <span style="color: var(--text-body); font-size: 0.95rem;">${product.ingredients}</span>
                        </div>
                    </div>

                    <!-- Call To Action Buttons -->
                    <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                        <a href="https://wa.me/903122763070?text=Merhaba,%20${encodeURIComponent(product.title)}%20ürünü%20hakkında%20toptan%20fiyat%20teklifi%20almak%20istiyorum." target="_blank" class="btn btn-primary" style="padding: 1rem 2rem; font-size: 1.05rem; gap: 0.6rem; background: #25D366; border-color: #25D366;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.487-1.761-1.66-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51h-.57c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                            <span>WhatsApp İle Toptan Sipariş Ver</span>
                        </a>
                        <a href="tel:+903122763070" class="btn btn-secondary" style="padding: 1rem 1.8rem; font-size: 1.05rem;">
                            <span>Hemen Ara: 0312 276 30 70</span>
                        </a>
                    </div>
                </div>
            </div>

            <!-- Diğer Ürünlerimiz / Related Products -->
            <div style="margin-top: 5rem; padding-top: 3rem; border-top: 1px solid #EAEAEA;">
                <div class="section-header" style="margin-bottom: 2rem;">
                    <span class="section-tag">Diğer Çeşitlerimiz</span>
                    <h3 style="color: var(--primary-blue); font-size: 1.8rem; font-weight: 800; margin: 0;">İlginizi Çekebilecek Diğer Ürünler</h3>
                </div>
                <div class="products-grid">
                    ${relatedCards}
                </div>
            </div>
        </div>
    </section>

    <!-- FOOTER SECTION -->
    <footer class="footer-classic">
        <div class="container">
            <div class="footer-classic-grid">
                <!-- Column 1 -->
                <div class="fc-col">
                    <h4 class="fc-title">Yerimiz</h4>
                    <div class="fc-line"></div>
                    <div class="fc-item">
                        <svg class="fc-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
                        <span>Ahi Evran Mah. Çatalca Sok. No:11 Sincan / ANKARA</span>
                    </div>
                </div>

                <!-- Column 2 -->
                <div class="fc-col">
                    <h4 class="fc-title">İletişim</h4>
                    <div class="fc-line"></div>
                    <div class="fc-item">
                        <svg class="fc-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79a15.053 15.053 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.11-.27c1.21.5 2.53.77 3.9.77a1 1 0 0 1 1 1v3.5a1 1 0 0 1-1 1A19.93 19.93 0 0 1 2 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.37.27 2.69.77 3.9a1 1 0 0 1-.27 1.11l-2.2 2.2z"/></svg>
                        <span>+903122763070</span>
                    </div>
                    <div class="fc-item">
                        <svg class="fc-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                        <span>info@yepas.com.tr</span>
                    </div>
                </div>

                <!-- Column 3 -->
                <div class="fc-col">
                    <h4 class="fc-title">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style="vertical-align: middle; margin-right: 5px;"><path d="M24 4.557a9.83 9.83 0 0 1-2.828.775 4.932 4.932 0 0 0 2.165-2.724 9.864 9.864 0 0 1-3.127 1.195 4.916 4.916 0 0 0-8.39 4.482A13.945 13.945 0 0 1 1.671 3.149a4.93 4.93 0 0 0 1.523 6.574 4.903 4.903 0 0 1-2.229-.616c-.054 2.281 1.581 4.415 3.949 4.89a4.935 4.935 0 0 1-2.224.084 4.928 4.928 0 0 0 4.6 3.419A9.9 9.9 0 0 1 0 19.54a13.94 13.94 0 0 0 7.548 2.212c9.057 0 14.01-7.503 14.01-14.01 0-.213-.005-.425-.014-.636A10.012 10.012 0 0 0 24 4.557z"/></svg> 
                        Takip Et
                    </h4>
                    <div class="fc-line"></div>
                    <div class="fc-socials">
                        <a href="https://x.com/YepasEkmek" target="_blank" class="fc-social-box" style="background-color: #55ACEE;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
                        </a>
                        <a href="#" class="fc-social-box" style="background-color: #3B5998;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M22.675 0H1.325C.593 0 0 .593 0 1.325v21.351C0 23.407.593 24 1.325 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116c.73 0 1.323-.593 1.323-1.325V1.325C24 .593 23.407 0 22.675 0z"/></svg>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </footer>

    <!-- FLOATING ACTION BUTTONS -->
    <div class="floating-actions">
        <a href="tel:+903122763070" class="fab-btn fab-phone" aria-label="Bizi Arayın">
            <svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                <path d="M6.62 10.79a15.053 15.053 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.11-.27c1.21.5 2.53.77 3.9.77a1 1 0 0 1 1 1v3.5a1 1 0 0 1-1 1A19.93 19.93 0 0 1 2 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.37.27 2.69.77 3.9a1 1 0 0 1-.27 1.11l-2.2 2.2z"/>
            </svg>
        </a>
        <a href="https://wa.me/903122763070" class="fab-btn fab-wa" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp İletişim">
            <div class="fab-badge"></div>
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.487-1.761-1.66-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51h-.57c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
        </a>
    </div>

    <script src="js/app.js"></script>
</body>
</html>`;
}

productsData.forEach(product => {
    const htmlContent = generateHTML(product);
    const filePath = path.join(__dirname, `${product.slug}.html`);
    fs.writeFileSync(filePath, htmlContent, 'utf8');
    console.log(`Generated: ${product.slug}.html`);
});

console.log("All 12 product HTML files generated successfully!");
