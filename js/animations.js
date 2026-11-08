(() => {
    if (!Element.prototype.animate) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const slides = new WeakMap();

    function slideIn(element, distance, { duration = 800, delay = 0 } = {}) {
        if (!element || reduceMotion.matches) return;

        slides.get(element)?.cancel();
        const animation = element.animate(
            [{ opacity: 0, translate: "0 " + distance + "px" }, { opacity: 1, translate: "none" }],
            { duration, delay, easing: "ease", fill: "backwards" }
        );
        slides.set(element, animation);
    }

    const heroItems = [
        "main h1", ".companion", ".scene-art", ".discovery-copy p", ".scene-subtitle",
        ".scene-description", ".scene-pricing", ".scene-stops", ".journey-button",
        ".booking-button", ".package-details-link",
    ].join(", ");

    if ("IntersectionObserver" in window) {
        const selector = [
            ".guild-nav > a", ".guild-nav summary", heroItems,
            ".section-head", ".card", ".card-note", ".guild-story h2", ".story-panel",
            ".guild-founder", ".faq-intro", ".faq-item", ".journey-gallery h2",
            ".journey-places figure", ".journey-day", ".package-inclusions", ".reference-footer",
        ].join(", ");
        const items = document.querySelectorAll(selector);
        const revealThreshold = .12;
        const maxSlideDistance = 64;
        const stagger = 600 / Math.max(items.length, 1);
        let previousScrollY = window.scrollY;
        let direction = 1;

        window.addEventListener("scroll", () => {
            const scrollY = window.scrollY;
            if (scrollY === previousScrollY) return;
            direction = scrollY < previousScrollY ? -1 : 1;
            previousScrollY = scrollY;
        }, { passive: true });

        const revealObserver = new IntersectionObserver(entries => {
            const entering = entries.filter(entry => entry.intersectionRatio >= revealThreshold);
            entering.sort((a, b) => direction * (a.boundingClientRect.top - b.boundingClientRect.top));

            entering.forEach(({ target, boundingClientRect }, index) => {
                revealObserver.unobserve(target);
                const exitObserver = direction > 0 ? exitBelowObserver : exitAboveObserver;
                exitObserver.observe(target);
                if (target.contains(document.activeElement)) return;

                const distance = Math.min(boundingClientRect.height * .3, maxSlideDistance);
                const delay = Math.min(index * stagger, 240);
                slideIn(target, direction * distance, { delay });
            });
        }, { threshold: revealThreshold });

        function rearmReveal(entries, observer) {
            for (const { target, isIntersecting } of entries) {
                if (isIntersecting) continue;
                observer.unobserve(target);
                revealObserver.observe(target);
            }
        }

        // Buffer the side the slide moves toward so its own movement cannot trigger a replay.
        const slideBuffer = (maxSlideDistance + 8) + "px";
        const exitBelowObserver = new IntersectionObserver(rearmReveal, { rootMargin: "0px 0px " + slideBuffer });
        const exitAboveObserver = new IntersectionObserver(rearmReveal, { rootMargin: slideBuffer + " 0px 0px" });

        items.forEach(element => revealObserver.observe(element));
        document.addEventListener("focusin", event => {
            const target = event.target.closest(selector);
            slides.get(target)?.finish();
        });
    } else {
        document.querySelectorAll(heroItems).forEach(element => slideIn(element, 24));
    }

    const menu = document.querySelector(".nation-menu");
    menu?.addEventListener("toggle", () => {
        if (menu.open) slideIn(menu.querySelector(".nation-options"), -12, { duration: 360 });
    });

    document.addEventListener("ui:open", event => {
        const popup = event.target;
        if (popup.matches(".inquiry-code-list")) {
            const distance = popup.classList.contains("opens-above") ? 8 : -8;
            slideIn(popup, distance, { duration: 360 });
        } else {
            slideIn(popup, 24);
        }
    });

    function pressControl(event) {
        if (reduceMotion.matches) return;
        const control = event.target.closest("button:not(:disabled), a[href], summary");
        if (!control) return;

        control.animate(
            [{ filter: "brightness(.82)" }, { filter: "brightness(1)" }],
            { duration: 160, easing: "ease-out" }
        );
    }

    document.addEventListener("pointerdown", event => {
        if (event.button === 0) pressControl(event);
    });
    document.addEventListener("click", event => {
        if (event.detail === 0) pressControl(event);
    }, true);
})();
