(() => {
    const trigger = document.querySelector("[data-inquiry-package]");
    const packages = {
        mondstadt: { name: "Mondstadt", days: 3, nights: 2, rate: 12500 },
        liyue: { name: "Liyue", days: 4, nights: 3, rate: 15000 },
        inazuma: { name: "Inazuma", days: 4, nights: 3, rate: 18000 },
        sumeru: { name: "Sumeru", days: 3, nights: 3, rate: 14000 },
        fontaine: { name: "Fontaine", days: 5, nights: 4, rate: 20000 },
        natlan: { name: "Natlan", days: 4, nights: 3, rate: 14800, includedNights: "Three", activities: "Guided highlights and cultural stops" },
        snezhnaya: { name: "Snezhnaya", days: 5, nights: 4, rate: 22000, includedNights: "Four" },
    };
    if (!trigger || !window.HTMLDialogElement) return;

    // Geographic calling codes from Google's libphonenumber PhoneNumberMetadata.xml.
    const callingCodes = [
        1, 7, 20, 27, 30, 31, 32, 33, 34, 36, 39, 40, 41, 43, 44, 45,
        46, 47, 48, 49, 51, 52, 53, 54, 55, 56, 57, 58, 60, 61, 62, 63,
        64, 65, 66, 81, 82, 84, 86, 90, 91, 92, 93, 94, 95, 98, 211, 212,
        213, 216, 218, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232,
        233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248,
        249, 250, 251, 252, 253, 254, 255, 256, 257, 258, 260, 261, 262, 263, 264, 265,
        266, 267, 268, 269, 290, 291, 297, 298, 299, 350, 351, 352, 353, 354, 355, 356,
        357, 358, 359, 370, 371, 372, 373, 374, 375, 376, 377, 378, 380, 381, 382, 383,
        385, 386, 387, 389, 420, 421, 423, 500, 501, 502, 503, 504, 505, 506, 507, 508,
        509, 590, 591, 592, 593, 594, 595, 596, 597, 598, 599, 670, 672, 673, 674, 675,
        676, 677, 678, 679, 680, 681, 682, 683, 685, 686, 687, 688, 689, 690, 691, 692,
        850, 852, 853, 855, 856, 880, 886, 960, 961, 962, 963, 964, 965, 966, 967, 968,
        970, 971, 972, 973, 974, 975, 976, 977, 992, 993, 994, 995, 996, 998,
    ];
    const money = new Intl.NumberFormat("en-PH");
    const price = amount => "PHP " + money.format(amount);
    const duration = pkg => pkg.days + " Days / " + pkg.nights + " Nights";
    const dialog = document.createElement("dialog");
    dialog.className = "inquiry-dialog";
    dialog.id = "booking-inquiry";
    dialog.innerHTML = `
        <form class="inquiry-panel" data-panel="form">
            <button type="button" class="inquiry-close" data-close aria-label="Close inquiry">
                <img src="image/inquiry-close.svg" alt="">
            </button>
            <header class="inquiry-header">
                <h2 id="inquiry-title" tabindex="-1"></h2>
                <p>Share your plans and review a sample quote for your group.</p>
            </header>
            <section class="inquiry-summary" aria-label="Selected package and estimate">
                <div class="inquiry-summary-row">
                    <div>
                        <p class="inquiry-eyebrow">Selected package</p>
                        <h3 data-package-name></h3>
                    </div>
                    <button type="button" class="inquiry-change">Change package</button>
                </div>
                <div class="inquiry-summary-row">
                    <p data-duration></p>
                    <p><strong data-rate></strong> <span class="inquiry-muted">per person</span></p>
                </div>
                <p class="inquiry-muted" data-accommodation></p>
                <p class="inquiry-muted">Scheduled local transfers · <span data-activities></span></p>
                <div class="inquiry-summary-row inquiry-estimate" aria-live="polite">
                    <p>Estimated package total <span data-estimate-count></span></p>
                    <strong data-total></strong>
                </div>
                <p class="inquiry-hint">Sample estimate only. The Director confirms the final quote for actual inquiries.</p>
            </section>
            <div class="inquiry-fields">
                <label>Lead Traveler Name *
                    <input name="traveler" autocomplete="name" placeholder="Enter full name" required>
                </label>
                <label>Email Address *
                    <input name="email" type="email" autocomplete="email" placeholder="name@example.com" required>
                </label>
                <div class="inquiry-field">
                    <label for="inquiry-phone">Phone Number</label>
                    <div class="inquiry-phone-controls">
                        <div class="inquiry-code-picker">
                            <input name="phoneCode" type="text" inputmode="numeric" value="+63" role="combobox"
                                aria-label="Country or territory calling code" aria-autocomplete="list"
                                aria-controls="inquiry-calling-codes" aria-expanded="false"
                                autocomplete="off" title="Enter a supported dialing code, such as +63.">
                            <button type="button" class="inquiry-code-toggle" tabindex="-1" aria-label="Toggle dialing codes"></button>
                            <ul id="inquiry-calling-codes" class="inquiry-code-list" role="listbox" aria-label="Dialing codes" hidden></ul>
                        </div>
                        <input id="inquiry-phone" name="phone" type="tel" inputmode="numeric" pattern="[0-9]+" autocomplete="tel-national" placeholder="Phone number">
                    </div>
                </div>
                <div class="inquiry-field">
                    <label for="inquiry-date">Preferred Travel Date *</label>
                    <input id="inquiry-date" name="date" type="date" aria-describedby="inquiry-date-hint" required>
                    <p class="inquiry-hint" id="inquiry-date-hint">Choose today or a later date. Availability requires confirmation.</p>
                </div>
                <label>Number of Travelers *
                    <input name="travelers" type="number" min="1" step="1" required>
                </label>
                <label>Special requests (optional)
                    <textarea name="requests" rows="1" placeholder="Dietary needs, accessibility..."></textarea>
                </label>
            </div>
            <p class="inquiry-hint">* Required fields. This demo previews your inquiry on this page. Your details stay in this window.</p>
            <button class="inquiry-primary" type="submit">Submit Inquiry</button>
        </form>
        <section class="inquiry-panel inquiry-picker" data-panel="packages" hidden>
            <h2 id="inquiry-packages-title" tabindex="-1">Choose your nation</h2>
            <p class="inquiry-muted">Sample prices per person. Final quote requires review.</p>
            <div class="inquiry-options"></div>
            <button type="button" class="inquiry-keep">Keep current package</button>
        </section>
        <section class="inquiry-panel inquiry-received" data-panel="received" hidden>
            <button type="button" class="inquiry-close" data-close aria-label="Close inquiry">
                <img src="image/inquiry-confirm-close.svg" alt="">
            </button>
            <h2 id="inquiry-received-title" tabindex="-1">Inquiry received</h2>
            <p class="inquiry-status">Demo · Awaiting availability review</p>
            <p>Here’s a preview of your inquiry. Your details stayed in this window. Availability and final pricing require confirmation.</p>
            <div class="inquiry-summary">
                <h3 data-package-name></h3>
                <p data-review-details></p>
                <strong class="inquiry-review-total" data-total></strong>
                <p class="inquiry-muted">Estimate only. Availability, final price, and payment details require confirmation.</p>
            </div>
            <button type="button" class="inquiry-primary inquiry-review">Review inquiry details</button>
        </section>`;

    const form = dialog.querySelector("form");
    const packageOptions = dialog.querySelector(".inquiry-options");
    const panels = [...dialog.querySelectorAll("[data-panel]")];
    const count = form.elements.travelers;
    const date = form.elements.date;
    const phone = form.elements.phone;
    const phoneCode = form.elements.phoneCode;
    const phoneCodePicker = dialog.querySelector(".inquiry-code-picker");
    const phoneCodeToggle = dialog.querySelector(".inquiry-code-toggle");
    const phoneCodeList = dialog.querySelector(".inquiry-code-list");
    const changePackageButton = dialog.querySelector(".inquiry-change");
    let selected = trigger.dataset.inquiryPackage;

    phoneCode.pattern = "\\+?(?:" + callingCodes.join("|") + ")";
    for (const [id, pkg] of Object.entries(packages)) {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.package = id;
        button.innerHTML = `
            <span><b>${pkg.name}</b><small>${duration(pkg)}</small></span>
            <strong>${price(pkg.rate)}</strong>`;
        packageOptions.append(button);
    }

    function updateEstimate() {
        const travelers = count.valueAsNumber;
        const validCount = count.validity.valid && Number.isSafeInteger(travelers * packages[selected].rate);
        const group = travelers + (travelers === 1 ? " traveler" : " travelers");
        form.querySelector("[data-estimate-count]").textContent = validCount ? "· " + group : "";
        const total = validCount ? price(travelers * packages[selected].rate) : "—";
        dialog.querySelectorAll("[data-total]").forEach(element => { element.textContent = total; });
        return group;
    }

    function selectPackage(id) {
        selected = id;
        const pkg = packages[id];
        dialog.querySelector("#inquiry-title").textContent = pkg.name + " Booking Inquiry";
        dialog.querySelectorAll("[data-package-name]").forEach(element => { element.textContent = pkg.name; });
        form.querySelector("[data-duration]").textContent = duration(pkg);
        form.querySelector("[data-rate]").textContent = price(pkg.rate);
        form.querySelector("[data-accommodation]").textContent = (pkg.includedNights || "Two") + " nights of accommodation";
        form.querySelector("[data-activities]").textContent = pkg.activities || "Guided activities";
        packageOptions.querySelectorAll("button").forEach(button => {
            button.setAttribute("aria-pressed", String(button.dataset.package === id));
        });
        count.max = Math.floor(Number.MAX_SAFE_INTEGER / pkg.rate);
        updateEstimate();
    }

    function showPanel(name, focusTarget) {
        closePhoneCodes();
        const panel = panels.find(element => element.dataset.panel === name);
        const heading = panel.querySelector("h2");
        panels.forEach(element => { element.hidden = element !== panel; });
        dialog.dataset.view = name;
        dialog.setAttribute("aria-labelledby", heading.id);
        const wasOpen = dialog.open;
        if (!wasOpen) dialog.showModal();
        dialog.scrollTop = 0;
        (focusTarget || heading).focus({ preventScroll: true });
        (wasOpen ? panel : dialog).dispatchEvent(new Event("ui:open", { bubbles: true }));
    }

    function updateDateMinimum() {
        const today = new Date();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");
        date.min = today.getFullYear() + "-" + month + "-" + day;
    }

    function resizePhoneCode() {
        const length = Math.min(4, Math.max(2, phoneCode.value.length));
        phoneCodePicker.style.setProperty("--calling-code-length", length);
    }

    function positionPhoneCodes() {
        if (phoneCodeList.hidden) return;
        const field = phoneCodePicker.getBoundingClientRect();
        const bounds = dialog.getBoundingClientRect();
        const viewport = window.visualViewport;
        const viewportTop = viewport?.offsetTop ?? 0;
        const viewportBottom = viewportTop + (viewport?.height ?? window.innerHeight);
        const visibleTop = Math.max(bounds.top, viewportTop);
        const visibleBottom = Math.min(bounds.bottom, viewportBottom);
        if (field.bottom <= visibleTop || field.top >= visibleBottom) {
            closePhoneCodes();
            return;
        }
        const above = field.top - visibleTop;
        const below = visibleBottom - field.bottom;
        const preferredHeight = Math.min(phoneCodeList.scrollHeight + 2, 192);
        const openAbove = below < preferredHeight + 8 && above > below;
        phoneCodeList.classList.toggle("opens-above", openAbove);
        phoneCodeList.style.maxHeight = Math.max(0, Math.min(192, (openAbove ? above : below) - 8)) + "px";
    }

    function closePhoneCodes() {
        phoneCodeList.hidden = true;
        phoneCode.setAttribute("aria-expanded", "false");
        phoneCode.removeAttribute("aria-activedescendant");
    }

    function showPhoneCodes(query) {
        const wasOpen = !phoneCodeList.hidden;
        const digits = query.replace(/^\+/, "");
        const matches = callingCodes.filter(code => String(code).startsWith(digits));
        const entries = matches.map(code => {
            const option = document.createElement("li");
            option.id = "inquiry-code-" + code;
            option.setAttribute("role", "option");
            option.setAttribute("aria-selected", "false");
            option.textContent = "+" + code;
            return option;
        });
        closePhoneCodes();
        phoneCodeList.replaceChildren(...entries);
        if (!entries.length) return;
        phoneCodeList.hidden = false;
        phoneCodeList.scrollTop = 0;
        phoneCode.setAttribute("aria-expanded", "true");
        positionPhoneCodes();
        if (!wasOpen && !phoneCodeList.hidden) phoneCodeList.dispatchEvent(new Event("ui:open", { bubbles: true }));
    }

    function choosePhoneCode(option) {
        closePhoneCodes();
        phoneCode.focus({ preventScroll: true });
        phoneCode.value = option.textContent;
        phoneCode.setSelectionRange(phoneCode.value.length, phoneCode.value.length);
        resizePhoneCode();
    }

    function handlePhoneCodeKeys(event) {
        if (event.key === "Escape" && !phoneCodeList.hidden) {
            event.preventDefault();
            closePhoneCodes();
            return;
        }
        const active = phoneCodeList.hidden ? null : phoneCodeList.querySelector('[aria-selected="true"]');
        if (event.key === "Enter" && active) {
            event.preventDefault();
            choosePhoneCode(active);
            return;
        }
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;

        event.preventDefault();
        if (phoneCodeList.hidden) showPhoneCodes("");
        const movingDown = event.key === "ArrowDown";
        const next = active
            ? (movingDown ? active.nextElementSibling : active.previousElementSibling)
            : (movingDown ? phoneCodeList.firstElementChild : phoneCodeList.lastElementChild);
        if (!next) return;
        active?.setAttribute("aria-selected", "false");
        next.setAttribute("aria-selected", "true");
        phoneCode.setAttribute("aria-activedescendant", next.id);
        next.scrollIntoView({ block: "nearest" });
    }

    function formatPhoneCode() {
        if (/^[0-9]+$/.test(phoneCode.value)) phoneCode.value = "+" + phoneCode.value;
        resizePhoneCode();
    }

    trigger.addEventListener("click", () => {
        trigger.focus();
        form.reset();
        phoneCode.required = false;
        resizePhoneCode();
        updateDateMinimum();
        selectPackage(trigger.dataset.inquiryPackage);
        showPanel("form");
    });
    changePackageButton.addEventListener("click", () => showPanel("packages"));
    packageOptions.addEventListener("click", event => {
        const button = event.target.closest("[data-package]");
        if (!button) return;
        selectPackage(button.dataset.package);
        showPanel("form", changePackageButton);
    });
    dialog.querySelector(".inquiry-keep").addEventListener("click", () => showPanel("form", changePackageButton));
    dialog.querySelector(".inquiry-review").addEventListener("click", () => showPanel("form"));
    dialog.querySelectorAll("[data-close]").forEach(button => {
        button.addEventListener("click", () => dialog.close());
    });
    dialog.addEventListener("cancel", event => {
        if (dialog.dataset.view !== "packages") return;
        event.preventDefault();
        showPanel("form", changePackageButton);
    });
    dialog.addEventListener("close", () => {
        closePhoneCodes();
        form.reset();
        trigger.focus({ preventScroll: true });
    });
    count.addEventListener("input", updateEstimate);
    phoneCode.addEventListener("focus", () => phoneCode.select());
    phoneCode.addEventListener("input", () => {
        resizePhoneCode();
        showPhoneCodes(phoneCode.value);
    });
    phoneCode.addEventListener("change", formatPhoneCode);
    phoneCode.addEventListener("keydown", handlePhoneCodeKeys);
    phoneCodePicker.addEventListener("focusout", event => {
        if (!phoneCodePicker.contains(event.relatedTarget)) closePhoneCodes();
    });
    phoneCodeToggle.addEventListener("mousedown", event => event.preventDefault());
    phoneCodeToggle.addEventListener("click", () => {
        phoneCode.focus();
        if (phoneCodeList.hidden) showPhoneCodes("");
        else closePhoneCodes();
    });
    phoneCodeList.addEventListener("mousedown", event => {
        if (event.target.closest('[role="option"]')) event.preventDefault();
    });
    phoneCodeList.addEventListener("click", event => {
        const option = event.target.closest('[role="option"]');
        if (option) choosePhoneCode(option);
    });
    dialog.addEventListener("scroll", positionPhoneCodes);
    window.addEventListener("resize", positionPhoneCodes);
    window.visualViewport?.addEventListener("resize", positionPhoneCodes);
    phone.addEventListener("input", () => {
        const digits = phone.value.replace(/\D/g, "");
        phoneCode.required = digits.length > 0;
        if (digits === phone.value) return;
        const caret = phone.value.slice(0, phone.selectionStart).replace(/\D/g, "").length;
        phone.value = digits;
        phone.setSelectionRange(caret, caret);
    });
    date.addEventListener("focus", updateDateMinimum);
    
form.addEventListener("submit", async event => {
    event.preventDefault();

    phoneCode.required = phone.value !== "";

    if (!phoneCode.reportValidity()) return;

    formatPhoneCode();
    updateDateMinimum();

    if (!date.reportValidity()) return;

    const group = updateEstimate();

    const formData = {
        traveler: form.elements.traveler.value.trim(),
        email: form.elements.email.value.trim(),

        phone: phone.value
            ? phoneCode.value + phone.value
            : "",

        package: selected,
        date: date.value,
        travelers: count.value,
        requests: form.elements.requests.value.trim()
    };

    const submitButton = form.querySelector(
        'button[type="submit"]'
    );

    submitButton.disabled = true;
    submitButton.textContent = "Submitting...";

    try {
        const response = await fetch(
            "api/submit-inquiry.php",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(formData)
            }
        );

        const responseText = await response.text();
        let result;

        try {
            result = JSON.parse(responseText);
        } catch {
            if (responseText.trimStart().startsWith("<")) {
                throw new Error(
                    "The inquiry API returned PHP or HTML instead of JSON. Open the site through XAMPP Apache at http://localhost/teyvat-travel/mondstadt.html, not VS Code Live Server."
                );
            }
            throw new Error("The server returned an invalid response. Check the Apache PHP error log.");
        }

        if (!response.ok || !result.success) {
            throw new Error(
                result.message || "Unable to submit inquiry."
            );
        }

        const dateLabel = date.valueAsDate.toLocaleDateString(
            "en-PH",
            {
                dateStyle: "long",
                timeZone: "UTC"
            }
        );

        dialog.querySelector(
            "[data-review-details]"
        ).textContent =
            group + " · " + dateLabel + " pending review";

        // Display the successful submission confirmation
        showPanel("received");

        console.log("Saved inquiry ID:", result.id);

    } catch (error) {

        alert(error.message);

    } finally {

        submitButton.disabled = false;
        submitButton.textContent = "Submit Inquiry";

    }
});


    document.body.append(dialog);
    trigger.hidden = false;
})();
