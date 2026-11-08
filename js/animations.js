(() => {
    if (!Element.prototype.animate) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    function slideIn(element, distance, duration, opacity = 0) {
        if (reduceMotion.matches) return;

        element.animate(
            [{ opacity, translate: "0 " + distance + "px" }, { opacity: 1, translate: "none" }],
            { duration, easing: "ease-out" }
        );
    }

    const heroItems = "main h1, .discovery-copy p, .journey-button, .scene-subtitle, .scene-description, .scene-actions";

    if ("IntersectionObserver" in window) {
        const revealThreshold = .12;
        let previousScrollY = window.scrollY;
        let slideDistance = 12;

        window.addEventListener("scroll", () => {
            const scrollY = window.scrollY;
            if (scrollY === previousScrollY) return;
            slideDistance = scrollY < previousScrollY ? -12 : 12;
            previousScrollY = scrollY;
        }, { passive: true });


        const revealObserver = new IntersectionObserver(entries => {
            for (const { target, intersectionRatio } of entries) {
                if (intersectionRatio < revealThreshold) continue;

                revealObserver.unobserve(target);
                exitObserver.observe(target);

                const isHero = target.matches(heroItems);
                slideIn(target, slideDistance, isHero ? 450 : 360, isHero ? 0 : .72);
            }
        }, { threshold: revealThreshold });

        // Rearm beyond the slide distance so the animation itself cannot retrigger a reveal.
        const exitObserver = new IntersectionObserver(entries => {
            for (const { target, isIntersecting } of entries) {
                if (isIntersecting) continue;
                exitObserver.unobserve(target);
                revealObserver.observe(target);
            }
        }, { rootMargin: "24px 0px" });

        const sections = [
            heroItems,
            ".section-head", ".card", ".card-note", ".guild-story h2", ".story-panel",
            ".guild-founder", ".faq-intro", ".faq-item", ".journey-gallery h2",
            ".journey-places figure", ".journey-day", ".package-inclusions", ".reference-footer",
        ];
        document.querySelectorAll(sections.join(", ")).forEach(element => revealObserver.observe(element));
    } else {
        document.querySelectorAll(heroItems).forEach(element => slideIn(element, 12, 450));
    }

    const menu = document.querySelector(".nation-menu");
    menu?.addEventListener("toggle", () => {
        if (menu.open) slideIn(menu.querySelector(".nation-options"), -8, 220, .6);
    });

    document.addEventListener("ui:open", event => {
        const element = event.target;
        const distance = element.classList.contains("opens-above") ? 8 : -8;
        slideIn(element, distance, 220, .65);
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
