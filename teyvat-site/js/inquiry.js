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

    const page = new URL(window.location.href);
    const apiUrl = new URL("api/submit-inquiry.php", page);
    const isFilePreview = page.protocol === "file:";
    const bookingPage = getBookingPage();

    function getBookingPage() {
        const documentRoot = "/xampp/htdocs/";
        const rootIndex = page.pathname.toLowerCase().indexOf(documentRoot);
        if (isFilePreview && rootIndex !== -1) {
            return new URL(page.pathname.slice(rootIndex + documentRoot.length - 1), "http://localhost");
        }
        if (["localhost", "127.0.0.1", "[::1]"].includes(page.hostname)) {
            // A local static preview usually serves the repository at a different port or path.
            return new URL(page.pathname.split("/").pop(), "http://localhost/ITelect/ITE1/teyvat-site/");
        }
        return null;
    }

    const phoneLengthList = new Intl.ListFormat("en", { type: "disjunction" });
    const emailDomainSuggestions = new Map([
        ["gmal.com", "gmail.com"],
        ["gmaol.com", "gmail.com"],
        ["gmial.com", "gmail.com"],
        ["gmai.com", "gmail.com"],
        ["gmail.con", "gmail.com"],
        ["hotmial.com", "hotmail.com"],
        ["outlok.com", "outlook.com"],
        ["yaahoo.com", "yahoo.com"],
        ["yaho.com", "yahoo.com"],
    ]);
    // Keep this domain check in sync with the booking API.
    const schoolEmailDomain = /(?:^|\.)(?:edu(?:\.[a-z]{2})?|(?:ac|sch)\.[a-z]{2}|k12\.[a-z]{2}\.us|school|deped\.gov\.ph)$/i;
    const money = new Intl.NumberFormat("en-PH");
    const price = amount => "PHP " + money.format(amount);
    const duration = pkg => pkg.days + " Days / " + pkg.nights + " Nights";
    const dialog = document.createElement("dialog");
    dialog.className = "inquiry-dialog";
    dialog.id = "booking-inquiry";
    dialog.innerHTML = `
        <form class="inquiry-panel" data-panel="form" novalidate>
            <button type="button" class="inquiry-close" data-close aria-label="Close inquiry">
                <img src="image/inquiry-close.svg" alt="">
            </button>
            <header class="inquiry-header">
                <h2 id="inquiry-title" tabindex="-1"></h2>
                <p>Share your plans and review a sample quote for your group.</p>
                <div class="inquiry-feedback" data-file-notice hidden>
                    <p>To send an inquiry, open this site through a PHP server such as XAMPP Apache.</p>
                </div>
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
                <div class="inquiry-field">
                    <label for="inquiry-traveler">Lead Traveler Name *</label>
                    <input id="inquiry-traveler" name="traveler" autocomplete="name" placeholder="Enter full name" required>
                </div>
                <div class="inquiry-field">
                    <label for="inquiry-email">Personal Email Address *</label>
                    <input id="inquiry-email" name="email" type="email" autocomplete="email" placeholder="name@example.com" required>
                    <p class="inquiry-hint" data-email-suggestion hidden>
                        Did you mean <button class="inquiry-email-correction" type="button"></button>?
                    </p>
                </div>
                <div class="inquiry-field">
                    <label for="inquiry-phone">Mobile Number</label>
                    <div class="inquiry-phone-controls">
                        <div class="inquiry-code-picker">
                            <input name="phoneCode" type="text" inputmode="numeric" value="+63" role="combobox"
                                aria-label="Country or territory calling code" aria-autocomplete="list"
                                aria-controls="inquiry-calling-codes" aria-expanded="false"
                                autocomplete="off" title="Enter a supported dialing code, such as +63.">
                            <button type="button" class="inquiry-code-toggle" tabindex="-1" aria-label="Toggle dialing codes"></button>
                            <ul id="inquiry-calling-codes" class="inquiry-code-list" role="listbox" aria-label="Dialing codes" hidden></ul>
                        </div>
                        <input id="inquiry-phone" name="phone" type="tel" inputmode="numeric" pattern="[0-9 ]+" autocomplete="tel-national" placeholder="Mobile number" aria-describedby="inquiry-phone-hint" readonly>
                    </div>
                    <p class="inquiry-hint" id="inquiry-phone-hint">Loading mobile number rules…</p>
                </div>
                <div class="inquiry-field">
                    <label for="inquiry-date">Preferred Travel Date *</label>
                    <input id="inquiry-date" name="date" type="date" aria-describedby="inquiry-date-hint" required>
                    <p class="inquiry-hint" id="inquiry-date-hint">Choose today or a later date. Availability requires confirmation.</p>
                </div>
                <div class="inquiry-field">
                    <label for="inquiry-travelers">Number of Travelers *</label>
                    <input id="inquiry-travelers" name="travelers" type="number" min="1" max="1000000" step="1" required>
                </div>
                <div class="inquiry-field">
                    <label for="inquiry-requests">Special requests (optional)</label>
                    <textarea id="inquiry-requests" name="requests" rows="1" placeholder="Dietary needs, accessibility..."></textarea>
                </div>
            </div>
            <p class="inquiry-hint">* Required fields. We save your details so the travel team can review your inquiry.</p>
            <div class="inquiry-actions">
                <p class="inquiry-feedback" role="alert" data-submit-error></p>
                <button class="inquiry-primary" type="submit">Submit Inquiry</button>
            </div>
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
            <p class="inquiry-status">Awaiting availability review</p>
            <p>Your inquiry was saved. Availability and final pricing require confirmation.</p>
            <p class="inquiry-reference">Booking reference <strong data-booking-reference></strong></p>
            <div class="inquiry-summary">
                <h3 data-receipt-package></h3>
                <p data-review-details></p>
                <strong class="inquiry-review-total" data-receipt-total></strong>
                <p class="inquiry-muted">Estimate only. Availability, final price, and payment details require confirmation.</p>
            </div>
            <details class="inquiry-review">
                <summary>Review inquiry details</summary>
                <dl>
                    <div><dt>Lead traveler</dt><dd data-submitted="traveler"></dd></div>
                    <div><dt>Email</dt><dd data-submitted="email"></dd></div>
                    <div><dt>Phone</dt><dd data-submitted="phone"></dd></div>
                    <div><dt>Special requests</dt><dd data-submitted="requests"></dd></div>
                </dl>
            </details>
        </section>`;

    const form = dialog.querySelector("form");
    const packageOptions = dialog.querySelector(".inquiry-options");
    const panels = [...dialog.querySelectorAll("[data-panel]")];
    const count = form.elements.travelers;
    const date = form.elements.date;
    const email = form.elements.email;
    const emailSuggestion = form.querySelector("[data-email-suggestion]");
    const emailCorrection = emailSuggestion.querySelector("button");
    const phone = form.elements.phone;
    const phoneHint = form.querySelector("#inquiry-phone-hint");
    const phoneCode = form.elements.phoneCode;
    const phoneCodePicker = dialog.querySelector(".inquiry-code-picker");
    const phoneCodeToggle = dialog.querySelector(".inquiry-code-toggle");
    const phoneCodeList = dialog.querySelector(".inquiry-code-list");
    const changePackageButton = dialog.querySelector(".inquiry-change");
    const submitButton = form.querySelector('button[type="submit"]');
    const submitError = form.querySelector("[data-submit-error]");
    const fieldErrors = new Map();
    const encoder = new TextEncoder();
    const receipt = dialog.querySelector('[data-panel="received"]');
    const review = receipt.querySelector(".inquiry-review");
    const reviewFields = Object.fromEntries(
        [...review.querySelectorAll("[data-submitted]")].map(field => [field.dataset.submitted, field])
    );
    let selected = trigger.dataset.inquiryPackage;
    let submitting = false;
    let savedWhileClosed = false;
    let checkingServer = false;
    let emailDomains = [];
    let phoneRules = null;
    let phoneRulesError = "Loading mobile number rules…";
    let previousPhoneDigits = "";

    if (isFilePreview) {
        form.querySelector("[data-file-notice]").hidden = false;
        submitButton.disabled = true;
    }

    for (const field of form.querySelectorAll(".inquiry-fields :is(input, textarea)")) {
        const error = document.createElement("p");
        error.id = "inquiry-error-" + field.name;
        error.className = "inquiry-field-error";
        const description = field.getAttribute("aria-describedby");
        field.setAttribute("aria-describedby", description ? description + " " + error.id : error.id);
        field.closest(".inquiry-field").append(error);
        fieldErrors.set(field, error);
    }
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
        for (const element of dialog.querySelectorAll("[data-total]")) element.textContent = total;
        return group;
    }

    function selectPackage(id) {
        selected = id;
        const pkg = packages[id];
        dialog.querySelector("#inquiry-title").textContent = pkg.name + " Booking Inquiry";
        for (const element of dialog.querySelectorAll("[data-package-name]")) element.textContent = pkg.name;
        form.querySelector("[data-duration]").textContent = duration(pkg);
        form.querySelector("[data-rate]").textContent = price(pkg.rate);
        form.querySelector("[data-accommodation]").textContent = (pkg.includedNights || "Two") + " nights of accommodation";
        form.querySelector("[data-activities]").textContent = pkg.activities || "Guided activities";
        packageOptions.querySelectorAll("button").forEach(button => {
            button.setAttribute("aria-pressed", String(button.dataset.package === id));
        });
        updateEstimate();
    }

    function showPanel(name, focusTarget) {
        closePhoneCodes();
        if (name !== "form" && phone.hasAttribute("data-rejected-input")) validateField(phone);
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

    function showFieldError(field, message) {
        delete field.dataset.rejectedInput;
        if (message) field.setAttribute("aria-invalid", "true");
        else field.removeAttribute("aria-invalid");
        fieldErrors.get(field).textContent = message;
        return !message;
    }

    function selectedCallingCode() {
        return phoneCode.value.replace(/^\+/, "");
    }

    function selectedPhoneRule() {
        const code = selectedCallingCode();
        return phoneRules && Object.hasOwn(phoneRules, code) ? phoneRules[code] : null;
    }

    function phoneDigits(value) {
        return value.replace(/\D/g, "");
    }

    function formatPhoneInput() {
        const digits = phoneDigits(phone.value);
        let formatted = digits;
        const AsYouType = window.libphonenumber?.AsYouType;
        if (digits && AsYouType && selectedPhoneRule()) {
            const prefix = "+" + selectedCallingCode();
            const international = new AsYouType().input(prefix + digits);
            if (international.startsWith(prefix)) {
                const national = international.slice(prefix.length).replace(/\D+/g, " ").trim();
                if (phoneDigits(national) === digits) formatted = national;
            }
        }
        if (formatted === phone.value) return;
        let remaining = phoneDigits(phone.value.slice(0, phone.selectionStart)).length;
        phone.value = formatted;
        let caret = 0;
        while (caret < formatted.length && remaining > 0) {
            if (formatted[caret] !== " ") remaining--;
            caret++;
        }
        phone.setSelectionRange(caret, caret);
    }

    function rejectPhoneInput(message) {
        showFieldError(phone, message);
        phone.dataset.rejectedInput = "";
    }

    function blocksPhoneInsertion(insertedDigits) {
        if (!insertedDigits) return false;
        const max = selectedPhoneRule()?.lengths.at(-1);
        const existing = phoneDigits(phone.value).length;
        const selected = phoneDigits(phone.value.slice(phone.selectionStart, phone.selectionEnd)).length;
        const nextLength = existing - selected + insertedDigits;
        if (max && (nextLength <= max || nextLength < existing)) return false;
        rejectPhoneInput(phoneLimitMessage(max));
        return true;
    }

    function phoneEntryHint() {
        if (isFilePreview) return "Open this page through a PHP server to enter a mobile number.";
        return phoneRules ? "Choose a supported calling code to enter a mobile number." : phoneRulesError;
    }

    function phoneLimitMessage(max) {
        return max ? "Enter up to " + max + " digits." : phoneEntryHint();
    }

    function allowedPhoneLengthMessage(lengths) {
        const prefix = lengths.length === 1 ? "Enter exactly " : "Enter ";
        return prefix + phoneLengthList.format(lengths.map(String)) + " digits.";
    }

    function updatePhoneHint() {
        const rule = selectedPhoneRule();
        const lengths = rule?.lengths;
        phone.readOnly = !lengths && !phone.value;
        const code = selectedCallingCode();
        phone.placeholder = code === "63" ? "917 123 4567" : "Mobile number";
        formatPhoneInput();
        if (!lengths) {
            phoneHint.textContent = phoneEntryHint();
            return;
        }
        const allowed = phoneLengthList.format(lengths.map(String));
        phoneHint.textContent = lengths.length === 1
            ? "Enter exactly " + allowed + " digits after +" + code + "."
            : "Maximum " + lengths.at(-1) + " digits after +" + code + ". Allowed lengths are " + allowed + " digits.";
        if (code === "63") {
            phoneHint.textContent += " Start with " + phoneLengthList.format([...rule.firstDigits]);
        }
    }

    function domainEditDistance(typed, provider) {
        const distances = [Array.from({ length: provider.length + 1 }, (_, index) => index)];
        for (let row = 1; row <= typed.length; row++) {
            const previous = distances[row - 1];
            const current = [row];
            for (let column = 1; column <= provider.length; column++) {
                const cost = typed[row - 1] === provider[column - 1] ? 0 : 1;
                current[column] = Math.min(previous[column] + 1, current[column - 1] + 1, previous[column - 1] + cost);
                if (row > 1 && column > 1 &&
                    typed[row - 1] === provider[column - 2] && typed[row - 2] === provider[column - 1]) {
                    current[column] = Math.min(current[column], distances[row - 2][column - 2] + 1);
                }
            }
            distances.push(current);
        }
        return distances[typed.length][provider.length];
    }

    function suggestEmailDomain(domain) {
        const normalized = domain.replace(/[,;]/g, ".").replace(/\.{2,}/g, ".").replace(/^\.|\.$/g, "");
        if (normalized.length < 4 || schoolEmailDomain.test(normalized) || emailDomains.includes(domain)) return "";
        if (emailDomains.includes(normalized)) return normalized;
        if (emailDomainSuggestions.has(normalized)) return emailDomainSuggestions.get(normalized);

        const [name, ...suffixLabels] = normalized.split(".");
        const suffix = suffixLabels.join(".");
        if (!suffix) {
            const exactNames = emailDomains.filter(provider => provider.startsWith(name + "."));
            if (exactNames.length === 1) return exactNames[0];
        }
        let match = "";
        let bestDistance = Infinity;
        for (const provider of emailDomains) {
            if (Math.abs(normalized.length - provider.length) > 3) continue;
            const distance = domainEditDistance(normalized, provider);
            if (distance > 3 || distance > bestDistance) continue;
            if (distance > 1) {
                const [providerName, ...providerSuffixLabels] = provider.split(".");
                const nameDistance = domainEditDistance(name, providerName);
                const suffixDistance = domainEditDistance(suffix, providerSuffixLabels.join("."));
                const closeParts = nameDistance <= (providerName.length >= 5 ? 2 : 1) &&
                    suffixDistance <= (nameDistance === 0 ? 2 : 1);
                const missingDot = !suffix && distance === 2 &&
                    domainEditDistance(normalized, provider.replaceAll(".", "")) <= 1;
                if (!closeParts && !missingDot) continue;
            }
            // Equal matches are ambiguous, so leave the address as entered.
            match = distance === bestDistance ? "" : provider;
            bestDistance = distance;
        }
        return match;
    }

    function updateEmailSuggestion() {
        const address = email.value.trim();
        const parts = address.match(/^([a-z0-9.!#$%&'*+/=?^_\x60{|}~-]{1,64})(@+\s*)([a-z0-9.,;-]{1,63})$/i);
        let correction = "";
        if (parts) {
            const [, name, separator, typedDomain] = parts;
            const domain = typedDomain.toLowerCase();
            if (!invalidEmailDots(name)) {
                const provider = suggestEmailDomain(domain) ||
                    (separator !== "@" && emailDomains.includes(domain) ? domain : "");
                if (provider) correction = name + "@" + provider;
            }
        }
        emailSuggestion.hidden = !correction;
        emailCorrection.textContent = correction;
    }

    function invalidEmailDots(name) {
        return name.startsWith(".") || name.endsWith(".") || name.includes("..");
    }

    function emailError(value) {
        if (!value) return "Enter your email address.";
        const [name, domain] = value.split("@");
        if (value.length > 254 || name.length > 64) return "Enter a shorter email address.";
        if (email.validity.typeMismatch || !domain?.includes(".") || invalidEmailDots(name)) {
            return "Enter a complete email address, such as name@example.com.";
        }
        return schoolEmailDomain.test(domain) ? "Use a personal email address. School email addresses are not accepted." : "";
    }

    function mobileError(value) {
        const rule = selectedPhoneRule();
        if (!rule) return phoneEntryHint();
        const digits = phoneDigits(value);
        const code = selectedCallingCode();
        if (digits.length > rule.lengths.at(-1)) return phoneLimitMessage(rule.lengths.at(-1));
        if (code === "63" && digits.startsWith("0")) return "Omit the leading 0 after +63.";
        if (digits && !rule.firstDigits.includes(digits[0])) {
            const allowed = phoneLengthList.format([...rule.firstDigits]);
            return "Mobile numbers after +" + code + " must start with " + allowed + ".";
        }
        if (!rule.lengths.includes(digits.length)) return allowedPhoneLengthMessage(rule.lengths);
        return rule.pattern.test(digits) ? "" : "Enter a valid mobile number for this calling code.";
    }

    function fieldError(field) {
        const value = field.value.trim();
        if (field.name === "traveler") {
            if (!value) return "Enter the lead traveler’s name.";
            if (/\p{N}/u.test(value)) return "Enter a name without numbers.";
            if (encoder.encode(value).length > 120) return "Enter a shorter name.";
        }
        if (field === phoneCode && !field.validity.valid) return "Enter a supported dialing code, such as +63.";
        if (field === phone && value) return mobileError(value) || field.validationMessage;
        if (field === date && field.validity.rangeUnderflow) return "Choose today or a later date.";
        if (field === email) return emailError(value) || field.validationMessage;
        if (field.name === "requests" && encoder.encode(value).length > 65535) return "Shorten your special requests.";
        return field.validationMessage;
    }

    function validateField(field) {
        return showFieldError(field, fieldError(field));
    }

    function focusInvalidField() {
        form.querySelector('[aria-invalid="true"]')?.focus();
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
        const matches = Object.keys(phoneRules || {}).filter(code => code.startsWith(digits));
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
        updatePhoneHint();
        if (phoneCode.hasAttribute("aria-invalid")) validateField(phoneCode);
        if (phone.value) validateField(phone);
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

    function openInquiry() {
        trigger.focus();
        if (savedWhileClosed) {
            savedWhileClosed = false;
            showPanel("received");
            return;
        }
        if (submitting) {
            showPanel("form");
            return;
        }
        form.reset();
        submitError.textContent = "";
        phoneCode.required = false;
        resizePhoneCode();
        updatePhoneHint();
        updateDateMinimum();
        selectPackage(trigger.dataset.inquiryPackage);
        showPanel("form");
    }

    trigger.addEventListener("click", async () => {
        if (checkingServer) return;
        if (bookingPage && bookingPage.href !== page.origin + page.pathname && !savedWhileClosed && !submitting) {
            checkingServer = true;
            try {
                // A PHP endpoint rejects HEAD with a JSON response. A static preview cannot run it.
                const response = isFilePreview ? null : await fetch(apiUrl, {
                    method: "HEAD",
                    cache: "no-store",
                    signal: AbortSignal.timeout(3000)
                }).catch(() => null);
                const isPhp = response?.status === 405 &&
                    response.headers.get("content-type")?.startsWith("application/json");
                if (isFilePreview || (response && response.status < 500 && !isPhp)) {
                    bookingPage.searchParams.set("booking", "open");
                    bookingPage.hash = page.hash;
                    window.location.assign(bookingPage);
                    return;
                }
            } finally {
                checkingServer = false;
            }
        }
        openInquiry();
    });
    changePackageButton.addEventListener("click", () => showPanel("packages"));
    packageOptions.addEventListener("click", event => {
        const button = event.target.closest("[data-package]");
        if (!button) return;
        selectPackage(button.dataset.package);
        showPanel("form", changePackageButton);
    });
    dialog.querySelector(".inquiry-keep").addEventListener("click", () => showPanel("form", changePackageButton));
    dialog.querySelectorAll("[data-close]").forEach(button => {
        button.addEventListener("click", () => dialog.close());
    });
    dialog.addEventListener("cancel", event => {
        if (dialog.dataset.view !== "packages") return;
        event.preventDefault();
        showPanel("form", changePackageButton);
    });
    dialog.addEventListener("close", () => {
        if (dialog.open) return;
        closePhoneCodes();
        if (!submitting) form.reset();
        if (!savedWhileClosed) {
            Object.values(reviewFields).forEach(field => { field.textContent = ""; });
        }
        trigger.focus({ preventScroll: true });
    });
    count.addEventListener("input", updateEstimate);
    phoneCode.addEventListener("focus", () => phoneCode.select());
    phoneCode.addEventListener("input", () => {
        resizePhoneCode();
        updatePhoneHint();
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
    phone.addEventListener("beforeinput", event => {
        if (!event.cancelable) return;
        if (event.data && blocksPhoneInsertion(phoneDigits(event.data).length)) {
            event.preventDefault();
            return;
        }
        const caret = phone.selectionStart;
        if (caret !== phone.selectionEnd) return;
        // Delete the adjacent digit when the caret is beside an inserted space.
        if (event.inputType === "deleteContentBackward" && phone.value[caret - 1] === " ") {
            phone.setSelectionRange(caret - 2, caret);
        } else if (event.inputType === "deleteContentForward" && phone.value[caret] === " ") {
            phone.setSelectionRange(caret, caret + 2);
        }
    });
    phone.addEventListener("paste", event => {
        if (!event.clipboardData) return;
        event.preventDefault();
        const digits = phoneDigits(event.clipboardData.getData("text"));
        if (!digits || blocksPhoneInsertion(digits.length)) return;
        phone.setRangeText(digits, phone.selectionStart, phone.selectionEnd, "end");
        phone.dispatchEvent(new Event("input", { bubbles: true }));
    });
    phone.addEventListener("input", event => {
        const digits = phoneDigits(phone.value);
        const max = selectedPhoneRule()?.lengths.at(-1);
        // Some input methods and autofill bypass the cancellable beforeinput event.
        if (digits.length > (max ?? 0) && digits.length > previousPhoneDigits.length) {
            phone.value = previousPhoneDigits;
            phone.setSelectionRange(phone.value.length, phone.value.length);
            formatPhoneInput();
            rejectPhoneInput(phoneLimitMessage(max));
            event.stopPropagation();
            return;
        }
        previousPhoneDigits = digits;
        formatPhoneInput();
        phoneCode.required = phone.value !== "";
        if (!max && !phone.value) phone.readOnly = true;
    });
    email.addEventListener("input", updateEmailSuggestion);
    email.addEventListener("change", updateEmailSuggestion);
    emailCorrection.addEventListener("click", () => {
        email.value = emailCorrection.textContent;
        email.focus();
        email.dispatchEvent(new Event("input", { bubbles: true }));
    });
    date.addEventListener("focus", updateDateMinimum);
    form.addEventListener("reset", () => {
        previousPhoneDigits = "";
        for (const field of fieldErrors.keys()) showFieldError(field, "");
        emailSuggestion.hidden = true;
        emailCorrection.textContent = "";
    });
    form.addEventListener("input", event => {
        const field = event.target;
        if (!fieldErrors.has(field)) return;
        const rule = field === phone ? selectedPhoneRule() : null;
        const digits = rule ? phoneDigits(phone.value) : "";
        const checkPhone = digits && (!rule.firstDigits.includes(digits[0]) || digits.length >= rule.lengths.at(-1));
        if ((field.name === "traveler" && field.value) || field.hasAttribute("aria-invalid") ||
            checkPhone) {
            validateField(field);
        }
        if (field === phone && phoneCode.hasAttribute("aria-invalid")) validateField(phoneCode);
        if (field === phoneCode && phone.value) validateField(phone);
    });
    form.addEventListener("focusout", event => {
        const field = event.target;
        if (!fieldErrors.has(field)) return;
        if (field.hasAttribute("data-rejected-input") ||
            (!field.hasAttribute("aria-invalid") && (field.value || field.validity.badInput))) {
            validateField(field);
        }
    });
    form.addEventListener("submit", async event => {
        event.preventDefault();
        if (isFilePreview || submitting || !dialog.open || dialog.dataset.view !== "form") return;

        phoneCode.required = phone.value !== "";
        formatPhoneCode();
        updateDateMinimum();
        submitError.textContent = "";
        const allFieldsValid = [...fieldErrors.keys()].map(validateField).every(Boolean);
        if (!allFieldsValid) {
            focusInvalidField();
            return;
        }

        // Capture the exact submission before the request so the receipt reflects what was sent.
        const formData = {
            traveler: form.elements.traveler.value.trim(),
            email: email.value.trim(),
            phone: phone.value ? phoneCode.value + phoneDigits(phone.value) : "",
            package: selected,
            date: date.value,
            travelers: count.value,
            requests: form.elements.requests.value.trim()
        };
        const pkg = packages[formData.package];
        const group = updateEstimate();
        const dateLabel = date.valueAsDate.toLocaleDateString("en-PH", {
            dateStyle: "long",
            timeZone: "UTC"
        });

        submitting = true;
        changePackageButton.disabled = true;
        submitButton.disabled = true;
        submitButton.textContent = "Submitting...";

        try {
            const response = await fetch(apiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });
            let result;

            try {
                result = await response.json();
            } catch {
                if (response.status >= 500) {
                    throw new Error("The booking server is unavailable. Please try again later.");
                }
                throw new Error("The booking service returned an unexpected response. Open the site through a PHP server such as XAMPP Apache and try again.");
            }

            if (!response.ok || !result?.success) {
                if (response.status === 422 && result?.errors) {
                    let unhandledError = false;
                    for (const [name, message] of Object.entries(result.errors)) {
                        const field = form.elements.namedItem(name);
                        if (fieldErrors.has(field)) showFieldError(field, message);
                        else unhandledError = true;
                    }
                    if (dialog.open) focusInvalidField();
                    if (!unhandledError) return;
                }
                throw new Error(result?.message || "Unable to submit inquiry.");
            }

            receipt.querySelector("[data-booking-reference]").textContent = result.id ?? "Unavailable";
            receipt.querySelector("[data-receipt-package]").textContent = pkg.name;
            receipt.querySelector("[data-review-details]").textContent = group + " · " + dateLabel;
            receipt.querySelector("[data-receipt-total]").textContent = price(Number(formData.travelers) * pkg.rate);
            Object.entries(reviewFields).forEach(([name, field]) => {
                field.textContent = formData[name] || "Not provided";
            });
            review.open = false;
            form.reset();
            if (dialog.open) {
                showPanel("received");
            } else {
                savedWhileClosed = true;
            }
        } catch (error) {
            submitError.textContent = error instanceof TypeError
                ? "Could not reach the booking service. Check your connection and try again."
                : error.message;
        } finally {
            submitting = false;
            changePackageButton.disabled = false;
            submitButton.disabled = false;
            submitButton.textContent = "Submit Inquiry";
        }
    });

    document.body.append(dialog);
    trigger.hidden = false;
    if (!isFilePreview) {
        fetch(new URL("data/email-domains.json", page))
            .then(response => response.ok ? response.json() : null)
            .then(data => {
                if (!Array.isArray(data?.domains)) return;
                emailDomains = data.domains;
                updateEmailSuggestion();
            })
            .catch(() => {});
        const formatter = document.createElement("script");
        formatter.src = new URL("js/vendor/libphonenumber-1.13.15/libphonenumber-min.js", page);
        formatter.addEventListener("load", formatPhoneInput);
        document.head.append(formatter);
        fetch(new URL("data/phone-lengths.json?v=2", page), { cache: "no-cache", signal: AbortSignal.timeout(5000) })
            .then(response => {
                if (!response.ok) throw new Error("Phone metadata unavailable");
                return response.json();
            })
            .then(data => {
                const rules = Object.entries(data.callingCodes).map(([code, rule]) => {
                    if (!Array.isArray(rule.lengths) || !rule.lengths.length ||
                        typeof rule.firstDigits !== "string" || typeof rule.pattern !== "string") {
                        throw new Error("Invalid mobile number rules");
                    }
                    return [code, { ...rule, pattern: new RegExp("^(?:" + rule.pattern + ")$") }];
                });
                if (!rules.length) throw new Error("Mobile number rules are empty");
                phoneRules = Object.fromEntries(rules);
                phoneCode.pattern = "\\+?(?:" + Object.keys(phoneRules).join("|") + ")";
                updatePhoneHint();
                if (phone.value) validateField(phone);
            })
            .catch(() => {
                phoneRulesError = "Mobile number rules couldn’t load. Leave the number blank to continue, or reload the page to try again.";
                updatePhoneHint();
                if (phone.hasAttribute("aria-invalid")) validateField(phone);
            });
    }
    if (!isFilePreview && page.searchParams.get("booking") === "open") {
        page.searchParams.delete("booking");
        window.history.replaceState(window.history.state, "", page);
        openInquiry();
    }
})();
