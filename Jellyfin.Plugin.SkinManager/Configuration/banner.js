/*
 * SkinManager — featured hero banner (Netflix-style) for the Jellyfin home screen.
 * Injected into index.html by the plugin (File Transformation). Builds a rotating
 * hero from the latest movies/series and inserts it above the home sections.
 * Styling lives in the theme CSS (.kx-hero*).
 */
(function () {
    "use strict";

    var ROTATE_MS = 8000;
    var LIMIT = 8;
    var timer = null;
    var current = 0;
    var items = [];

    function isHome() {
        var h = (window.location.hash || "").toLowerCase();
        return h === "" || h === "#/" || h === "#/home.html" || h.indexOf("home") !== -1;
    }

    function ready() {
        return window.ApiClient
            && typeof window.ApiClient.getItems === "function"
            && typeof window.ApiClient.isLoggedIn === "function"
            && window.ApiClient.isLoggedIn();
    }

    function imageUrl(item, type, tag, maxWidth) {
        try {
            return window.ApiClient.getImageUrl(item.Id, { type: type, tag: tag, maxWidth: maxWidth });
        } catch (e) {
            return null;
        }
    }

    function fetchItems() {
        var userId = window.ApiClient.getCurrentUserId();
        return window.ApiClient.getItems(userId, {
            SortBy: "DateCreated,SortName",
            SortOrder: "Descending",
            IncludeItemTypes: "Movie,Series",
            Recursive: true,
            Limit: LIMIT,
            Fields: "Overview,Genres",
            ImageTypeLimit: 1,
            EnableImageTypes: "Backdrop,Logo",
            Filters: "IsNotFolder"
        }).then(function (res) {
            return (res.Items || []).filter(function (it) {
                return it.BackdropImageTags && it.BackdropImageTags.length;
            });
        });
    }

    function goToDetails(item) {
        try {
            window.location.hash = "#/details?id=" + item.Id + "&serverId=" + window.ApiClient.serverId();
        } catch (e) {
            window.location.hash = "#/details?id=" + item.Id;
        }
    }

    function el(tag, cls) {
        var e = document.createElement(tag);
        if (cls) { e.className = cls; }
        return e;
    }

    function renderContent(content, item) {
        content.innerHTML = "";

        var logoTag = item.ImageTags && item.ImageTags.Logo;
        if (logoTag) {
            var logo = el("img", "kx-hero__logo");
            logo.src = imageUrl(item, "Logo", logoTag, 500);
            content.appendChild(logo);
        } else {
            var title = el("div", "kx-hero__title");
            title.textContent = item.Name;
            content.appendChild(title);
        }

        var bits = [];
        if (item.ProductionYear) { bits.push(item.ProductionYear); }
        if (item.OfficialRating) { bits.push(item.OfficialRating); }
        if (typeof item.CommunityRating === "number") { bits.push("★ " + item.CommunityRating.toFixed(1)); }
        if (item.Genres && item.Genres.length) { bits.push(item.Genres.slice(0, 3).join(" · ")); }
        if (bits.length) {
            var meta = el("div", "kx-hero__meta");
            meta.textContent = bits.join("     ");
            content.appendChild(meta);
        }

        if (item.Overview) {
            var ov = el("div", "kx-hero__overview");
            ov.textContent = item.Overview;
            content.appendChild(ov);
        }

        var buttons = el("div", "kx-hero__buttons");
        var play = el("button", "kx-hero__btn kx-hero__btn--play");
        play.innerHTML = "▶︎&nbsp; Reproducir";
        play.addEventListener("click", function () { goToDetails(item); });
        var info = el("button", "kx-hero__btn kx-hero__btn--info");
        info.textContent = "Más información";
        info.addEventListener("click", function () { goToDetails(item); });
        buttons.appendChild(play);
        buttons.appendChild(info);
        content.appendChild(buttons);
    }

    function buildHero(list) {
        var hero = el("div", "kx-hero");

        list.forEach(function (item, i) {
            var slide = el("div", "kx-hero__slide" + (i === 0 ? " is-active" : ""));
            var url = imageUrl(item, "Backdrop", item.BackdropImageTags[0], 1920);
            if (url) { slide.style.backgroundImage = "url('" + url + "')"; }
            hero.appendChild(slide);
        });

        hero.appendChild(el("div", "kx-hero__scrim"));

        var content = el("div", "kx-hero__content");
        hero.appendChild(content);

        var dots = el("div", "kx-hero__dots");
        list.forEach(function (item, i) {
            var dot = el("div", "kx-hero__dot" + (i === 0 ? " is-active" : ""));
            dot.addEventListener("click", function () { show(i); });
            dots.appendChild(dot);
        });
        hero.appendChild(dots);

        renderContent(content, list[0]);

        hero.addEventListener("mouseenter", stopRotate);
        hero.addEventListener("mouseleave", startRotate);
        return hero;
    }

    function show(i) {
        var hero = document.querySelector(".kx-hero");
        if (!hero || !items.length) { return; }
        var slides = hero.querySelectorAll(".kx-hero__slide");
        var dots = hero.querySelectorAll(".kx-hero__dot");
        current = (i + slides.length) % slides.length;
        for (var s = 0; s < slides.length; s++) { slides[s].classList.toggle("is-active", s === current); }
        for (var d = 0; d < dots.length; d++) { dots[d].classList.toggle("is-active", d === current); }
        renderContent(hero.querySelector(".kx-hero__content"), items[current]);
    }

    function startRotate() {
        stopRotate();
        if (items.length > 1) {
            timer = setInterval(function () { show(current + 1); }, ROTATE_MS);
        }
    }

    function stopRotate() {
        if (timer) { clearInterval(timer); timer = null; }
    }

    function removeHero() {
        stopRotate();
        var hero = document.querySelector(".kx-hero");
        if (hero && hero.parentNode) { hero.parentNode.removeChild(hero); }
    }

    function tryRender() {
        if (!isHome()) { removeHero(); return; }
        if (!ready()) { return; }
        if (document.querySelector(".kx-hero")) { return; }

        var container = document.querySelector(".homeSectionsContainer");
        if (!container || !container.parentNode) { return; }
        if (container.getAttribute("data-kx-hero") === "loading") { return; }
        container.setAttribute("data-kx-hero", "loading");

        fetchItems().then(function (list) {
            container.removeAttribute("data-kx-hero");
            if (!list.length || !isHome() || document.querySelector(".kx-hero")) { return; }
            if (!container.parentNode) { return; }
            items = list;
            current = 0;
            var hero = buildHero(list);
            container.parentNode.insertBefore(hero, container);
            startRotate();
        }).catch(function () {
            container.removeAttribute("data-kx-hero");
        });
    }

    var debounce = null;
    function schedule() {
        if (debounce) { clearTimeout(debounce); }
        debounce = setTimeout(tryRender, 250);
    }

    function init() {
        if (!window.ApiClient) { setTimeout(init, 500); return; }
        try {
            var observer = new MutationObserver(schedule);
            observer.observe(document.body, { childList: true, subtree: true });
        } catch (e) { /* ignore */ }
        window.addEventListener("hashchange", function () { removeHero(); schedule(); });
        schedule();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
