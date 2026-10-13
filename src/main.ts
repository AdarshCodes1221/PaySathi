import "./style.css";

const screens = Array.from(document.querySelectorAll<HTMLElement>(".screen"));
const toast = document.querySelector<HTMLDivElement>("#toast");

let balance = 4250;
let rechargeAmount = 200;
let paymentAmount = 500;
let paymentPin = "1234";
let selectedBank = "NIC Asia Bank";
let otpTimer: number | undefined;
let authMode: "mobile" | "email" = "mobile";
const transactions: Array<{title: string; detail: string; amount: string; tone: "in" | "out"}> = [];

function show(id: string) {
  screens.forEach(s => s.classList.toggle("hidden", s.id !== id));
  const screen = document.querySelector<HTMLElement>(`#${id}`);
  screen?.scrollTo({top: 0, behavior: "smooth"});
  if (id === "payment-success") {
    const date = document.querySelector("#receiptDate");
    if (date) date.textContent = new Date().toLocaleDateString();
  }

  document.querySelectorAll<HTMLElement>(".bottom-nav").forEach(nav => {
    ["Home", "Pay", "Campus", "Budget"].forEach((label, index) => {
      const span = nav.querySelectorAll("button span")[index];
      if (span) span.textContent = label;
    });
  });
}

function notify(message: string) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2200);
}

function money(n: number) {
  return `Rs. ${n.toLocaleString("en-IN")}`;
}

function refreshBalance() {
  const el = document.querySelector("#balance");
  if (el) el.textContent = money(balance);
}

function renderActivity() {
  const list = document.querySelector<HTMLElement>("#activityList");
  const count = document.querySelector<HTMLElement>("#activityCount");
  if (!list || !count) return;
  count.textContent = `${transactions.length} transaction${transactions.length === 1 ? "" : "s"}`;
  if (!transactions.length) {
    list.innerHTML = '<div class="empty-activity"><span>◷</span><b>No activity yet</b><small>Your payments and wallet updates will appear here.</small></div>';
    return;
  }
  list.innerHTML = transactions.map(item => `
    <div class="activity-row">
      <span class="activity-icon ${item.tone}">${item.tone === "in" ? "↓" : "↑"}</span>
      <div><b>${item.title}</b><small>${item.detail}</small></div>
      <strong class="${item.tone}">${item.tone === "in" ? "+" : "-"}${item.amount}</strong>
    </div>
  `).join("");
}

function value(selector: string) {
  return document.querySelector<HTMLInputElement>(selector)?.value.trim() || "";
}

function startOtpTimer() {
  const label = document.querySelector<HTMLElement>(".otp-meta span");
  const resend = document.querySelector<HTMLButtonElement>(".otp-meta .link");
  if (!label || !resend) return;
  let seconds = 30;
  resend.disabled = true;
  resend.style.opacity = "0.5";
  window.clearInterval(otpTimer);
  const update = () => {
    label.textContent = `Resend OTP in 00:${String(seconds).padStart(2, "0")}`;
    if (seconds <= 0) {
      window.clearInterval(otpTimer);
      label.textContent = "You can request a new code";
      resend.disabled = false;
      resend.style.opacity = "1";
    }
    seconds -= 1;
  };
  update();
  otpTimer = window.setInterval(update, 1000);
}

function validateMobile(mobile: string) {
  return /^[+\d][\d\s-]{7,}$/.test(mobile);
}

function setAuthMode(mode: "mobile" | "email") {
  authMode = mode;
  document.querySelectorAll<HTMLButtonElement>("[data-auth-mode]").forEach(button => {
    button.classList.toggle("active", button.dataset.authMode === mode);
    button.setAttribute("aria-selected", String(button.dataset.authMode === mode));
  });
  const mobileLabel = document.querySelector<HTMLElement>("#mobileLabel");
  const mobile = document.querySelector<HTMLInputElement>("#mobile");
  const emailField = document.querySelector<HTMLElement>("#emailField");
  if (mobileLabel) mobileLabel.textContent = mode === "email" ? "Mobile Number (optional)" : "Mobile Number";
  if (mobile) {
    mobile.placeholder = mode === "email" ? "Optional: +977 98XXXXXXXX" : "+977 98XXXXXXXX";
    mobile.required = mode === "mobile";
  }
  if (emailField) emailField.classList.toggle("mode-required", mode === "email");
  const otpTitle = document.querySelector("#otpTitle");
  const otpSubtitle = document.querySelector("#otpSubtitle");
  if (otpTitle) otpTitle.textContent = mode === "email" ? "Verify your email" : "Verify your number";
  if (otpSubtitle) otpSubtitle.textContent = mode === "email"
    ? "Enter the 6-digit OTP sent to your email address."
    : "A quick security check to protect your wallet.";
  notify(`${mode === "email" ? "Email" : "Mobile"} sign up selected`);
}

document.addEventListener("click", (event) => {
  const target = event.target as HTMLElement;
  const go = target.closest<HTMLElement>("[data-go]")?.dataset.go;
  const demo = target.closest<HTMLElement>("[data-demo]")?.dataset.demo;
  const action = target.closest<HTMLElement>("[data-action]")?.dataset.action;
  const authButton = target.closest<HTMLButtonElement>("[data-auth-mode]");

  if (authButton) {
    setAuthMode(authButton.dataset.authMode === "email" ? "email" : "mobile");
    return;
  }

  if (go) {
    if (go === "review") {
      const mobile = value("#recipientMobile");
      const amount = Number(value("#amount") || 0);
      if (!validateMobile(mobile)) return notify("Enter a valid recipient mobile number.");
      if (!amount || amount <= 0) return notify("Enter a valid amount.");
      if (amount > balance) return notify("Insufficient wallet balance.");
      paymentAmount = amount;

      const note = value("#note") || "Hostel expenses";

      const a = document.querySelector("#summaryAmount");
      const b = document.querySelector("#reviewAmount");
      const hero = document.querySelector("#reviewHeroAmount");
      const c = document.querySelector("#totalAmount");
      const d = document.querySelector("#pinAmount");
      const e = document.querySelector("#successAmount");
      const m = document.querySelector("#reviewMobile");
      const n = document.querySelector("#reviewNote");

      [a,b,hero,c,d,e].forEach(x => { if (x) x.textContent = money(amount); });
      if (m) m.textContent = mobile;
      if (n) n.textContent = note;
    }

    if (go === "home") {
      refreshBalance();
    }
    if (go === "activity") {
      renderActivity();
    }

    show(go);
    return;
  }

  if (demo) {
    notify(demo);
    return;
  }

  if (action === "signup") {
    const name = value("#fullName");
    const mobile = value("#mobile");
    const email = value("#email");
    const password = document.querySelector<HTMLInputElement>("#password")?.value || "";
    const terms = document.querySelector<HTMLInputElement>("#terms");

    if (!name) return notify("Please enter your name.");
    if (authMode === "mobile" && !validateMobile(mobile)) return notify("Enter a valid mobile number.");
    if (authMode === "email" && (!email || !email.includes("@"))) return notify("Enter a valid email.");
    if (password.length < 8) return notify("Password must contain at least 8 characters.");
    if (!terms?.checked) return notify("Please accept the Terms and Privacy Policy.");

    const first = name.split(" ")[0];
    const firstEl = document.querySelector("#userFirstName");
    if (firstEl) firstEl.textContent = first;

    notify("Account details saved.");
    show("otp");
    startOtpTimer();
    return;
  }

  if (action === "forgot-password") {
    if (!validateMobile(value("#forgotMobile"))) return notify("Enter a valid mobile number.");
    notify("Verification code sent.");
    show("otp");
    startOtpTimer();
    return;
  }

  if (action === "resend-otp") {
    notify("A new OTP has been sent.");
    startOtpTimer();
    return;
  }

  if (action === "verify") {
    const digits = Array.from(document.querySelectorAll<HTMLInputElement>(".otp")).map(x => x.value).join("");
    if (!/^\d{6}$/.test(digits)) return notify("Enter the complete 6-digit OTP.");
    notify("Number verified.");
    show("create-pin");
    return;
  }

  if (action === "create-pin") {
    const pins = Array.from(document.querySelectorAll<HTMLInputElement>("#create-pin .pin:not(.confirm-pin)")).map(x => x.value).join("");
    const confirms = Array.from(document.querySelectorAll<HTMLInputElement>("#create-pin .confirm-pin")).map(x => x.value).join("");
    if (!/^\d{4}$/.test(pins)) return notify("Create a 4-digit payment PIN.");
    if (pins !== confirms) return notify("PINs do not match.");
    paymentPin = pins;
    notify("Payment PIN created.");
    show("link-bank");
    return;
  }

  if (action === "link-bank") {
    if (!value("#bankHolder")) return notify("Enter the account holder name.");
    const linked = document.querySelector("#linkedBankName");
    const dashboard = document.querySelector("#dashboardBank");
    if (linked) linked.textContent = selectedBank;
    if (dashboard) dashboard.textContent = selectedBank;
    notify("Bank account linked.");
    show("bank-linked");
    return;
  }

  if (action === "confirm-payment") {
    const entered = Array.from(document.querySelectorAll<HTMLInputElement>(".payment-pin .pin")).map(x => x.value).join("");
    if (entered.length !== 4) return notify("Enter your 4-digit PIN.");
    if (entered !== paymentPin) return notify("Incorrect PIN. Try 1234 for this demo.");
    if (paymentAmount > balance) return notify("Insufficient wallet balance.");
    balance -= paymentAmount;
    transactions.unshift({title: "Money sent", detail: "To Rahul Sharma", amount: money(paymentAmount), tone: "out"});
    refreshBalance();
    const success = document.querySelector("#successAmount");
    if (success) success.textContent = money(paymentAmount);
    show("payment-success");
    return;
  }

  if (action === "recharge") {
    if (!/^\d{10}$/.test(value("#rechargeMobile"))) return notify("Enter a valid 10-digit mobile number.");
    if (rechargeAmount > balance) return notify("Insufficient wallet balance.");
    balance -= rechargeAmount;
    transactions.unshift({title: "Mobile recharge", detail: "NTC mobile recharge", amount: money(rechargeAmount), tone: "out"});
    refreshBalance();
    notify(`${money(rechargeAmount)} recharge successful.`);
    show("home");
    return;
  }

  if (action === "download-receipt") {
    const receipt = `PaySathi payment receipt\nAmount: ${money(paymentAmount)}\nSent to: Rahul Sharma\nDate: ${new Date().toLocaleDateString()}\nTransaction ID: PS-${Date.now().toString().slice(-6)}`;
    const blob = new Blob([receipt], {type: "text/plain"});
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "paysathi-receipt.txt";
    link.click();
    URL.revokeObjectURL(link.href);
    notify("Receipt downloaded.");
    return;
  }

  if (action === "share-payment") {
    const shareData = {title: "PaySathi payment", text: `Payment of ${money(paymentAmount)} sent to Rahul Sharma.`};
    if (navigator.share) {
      navigator.share(shareData).catch(() => notify("Sharing cancelled."));
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(shareData.text).then(() => notify("Payment details copied."));
    } else {
      notify("Payment details ready to share.");
    }
  }

  if (action === "copy-receive") {
    const text = "PaySathi ID: PS-AARAV-4821";
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => notify("PaySathi ID copied."));
    } else {
      notify(text);
    }
    return;
  }

  if (action === "share-receive") {
    const shareData = {title: "PaySathi", text: "Send money to Aarav Sharma on PaySathi: PS-AARAV-4821"};
    if (navigator.share) {
      navigator.share(shareData).catch(() => notify("Sharing cancelled."));
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(shareData.text).then(() => notify("Payment details copied."));
    } else {
      notify("Payment details ready to share.");
    }
  }
});

document.addEventListener("input", (event) => {
  const target = event.target as HTMLInputElement;

  if (target.classList.contains("otp") || target.classList.contains("pin")) {
    target.value = target.value.replace(/\D/g, "").slice(0,1);
    if (target.value) {
      const fields = Array.from(document.querySelectorAll<HTMLInputElement>(".otp, .pin"));
      const index = fields.indexOf(target);
      fields[index + 1]?.focus();
    }
  }

  if (target.id === "amount") {
    paymentAmount = Number(target.value || 0);
    const summary = document.querySelector("#summaryAmount");
    if (summary) summary.textContent = money(paymentAmount);
  }

  if (target.id === "bankSearch") {
    const q = target.value.toLowerCase();
    document.querySelectorAll<HTMLElement>(".bank").forEach(bank => {
      bank.style.display = bank.textContent?.toLowerCase().includes(q) ? "flex" : "none";
    });
  }

  if (target.id === "billSearch") {
    const query = target.value.toLowerCase();
    document.querySelectorAll<HTMLElement>("#bills .service").forEach(service => {
      service.style.display = service.textContent?.toLowerCase().includes(query) ? "flex" : "none";
    });

  }

  if (target.id === "password") {
    const strength = document.querySelector<HTMLElement>(".password-strength");
    const bar = strength?.querySelector<HTMLElement>("i");
    const label = strength?.querySelector("span");
    if (strength && bar && label) {
      const score = Number(target.value.length >= 8) + Number(/[A-Z]/.test(target.value)) + Number(/\d/.test(target.value));
      bar.style.background = score >= 3 ? "var(--green)" : score === 2 ? "var(--amber)" : "var(--error)";
      bar.style.width = `${Math.max(18, score * 18)}px`;
      label.textContent = score >= 3 ? "Strong password" : score === 2 ? "Good password — add a symbol" : "Use 8+ characters";
    }
  }
});

document.addEventListener("change", (event) => {
  const target = event.target as HTMLInputElement;
  if (target.id !== "qrUpload" || !target.files?.length) return;
  const file = target.files[0];
  if (!file.type.startsWith("image/")) {
    target.value = "";
    notify("Choose a valid QR image.");
    return;
  }
  notify("QR image selected. Scanning is simulated in this prototype.");
});

document.addEventListener("keydown", (event) => {
  const target = event.target as HTMLInputElement;
  if ((target.classList.contains("otp") || target.classList.contains("pin")) && event.key === "Backspace" && !target.value) {
    const fields = Array.from(document.querySelectorAll<HTMLInputElement>(".otp, .pin"));
    const index = fields.indexOf(target);
    fields[index - 1]?.focus();
  }
});

document.addEventListener("click", (event) => {
  const target = event.target as HTMLElement;

  const otpKey = target.closest<HTMLElement>("[data-otp-key]")?.dataset.otpKey;
  if (otpKey) {
    const fields = Array.from(document.querySelectorAll<HTMLInputElement>("#otp .otp"));
    if (otpKey === "clear") {
      const last = [...fields].reverse().find(field => field.value);
      if (last) {
        last.value = "";
        last.focus();
      }
    } else {
      const next = fields.find(field => !field.value);
      if (next) {
        next.value = otpKey;
        next.dispatchEvent(new Event("input", {bubbles: true}));
      }
    }
    return;
  }

  const key = target.closest<HTMLElement>("[data-key]")?.dataset.key;
  if (key) {
    const fields = Array.from(document.querySelectorAll<HTMLInputElement>(".payment-pin .pin"));
    if (key === "clear") {
      const last = [...fields].reverse().find(field => field.value);
      if (last) last.value = "";
    } else {
      const next = fields.find(field => !field.value);
      if (next) {
        next.value = key;
        next.dispatchEvent(new Event("input", {bubbles: true}));
      }
    }
    return;
  }

  const bank = target.closest<HTMLElement>("[data-bank]");
  if (bank) {
    document.querySelectorAll(".bank").forEach(x => x.classList.remove("selected"));
    bank.classList.add("selected");
    selectedBank = bank.dataset.bank || selectedBank;

    const linked = document.querySelector("#linkedBankName");
    const dashboard = document.querySelector("#dashboardBank");
    if (linked) linked.textContent = selectedBank;
    if (dashboard) dashboard.textContent = selectedBank;

    notify(`${selectedBank} selected`);
  }

  const recharge = target.closest<HTMLElement>("[data-recharge]");
  if (recharge) {
    rechargeAmount = Number(recharge.dataset.recharge || 200);
    document.querySelectorAll("[data-recharge]").forEach(x => x.classList.remove("active"));
    recharge.classList.add("active");
    const amount = document.querySelector("#rechargeAmount");
    if (amount) amount.textContent = money(rechargeAmount);
    const button = document.querySelector<HTMLButtonElement>("#recharge .btn.primary");
    if (button) button.textContent = `Recharge ${money(rechargeAmount)}`;
  }

  const preset = target.closest<HTMLElement>("[data-preset]");
  if (preset) {
    const amount = Number(preset.dataset.preset || 0);
    const input = document.querySelector<HTMLInputElement>("#amount");
    if (input) input.value = String(amount);
    paymentAmount = amount;
    document.querySelector("#summaryAmount")!.textContent = money(amount);
    document.querySelectorAll("[data-preset]").forEach(x => x.classList.remove("active"));
    preset.classList.add("active");
  }

  const recipient = target.closest<HTMLElement>("[data-recipient]");
  if (recipient) {
    const input = document.querySelector<HTMLInputElement>("#recipientMobile");
    if (input) input.value = recipient.dataset.recipient || "";
    notify(`${recipient.textContent?.trim() || "Recipient"} selected`);
  }

  const rechargeNumber = target.closest<HTMLElement>("[data-recharge-number]");
  if (rechargeNumber) {
    const input = document.querySelector<HTMLInputElement>("#rechargeMobile");
    if (input) input.value = rechargeNumber.dataset.rechargeNumber || "";
    notify("Mobile number selected");
  }

  const add = target.closest<HTMLElement>("[data-add-money]");
  if (add) {
    balance += 1000;
    transactions.unshift({title: "Money added", detail: "Added from linked bank", amount: money(1000), tone: "in"});
    refreshBalance();
    notify("Rs. 1,000 added to your wallet.");
  }

  const eye = target.closest<HTMLElement>("[data-password]");
  if (eye) {
    const input = document.querySelector<HTMLInputElement>("#password");
    if (input) {
      input.type = input.type === "password" ? "text" : "password";
      eye.setAttribute("aria-label", input.type === "password" ? "Show password" : "Hide password");
    }
  }

  const operator = target.closest<HTMLButtonElement>(".operator button");
  if (operator) {
    operator.parentElement?.querySelectorAll("button").forEach(x => x.classList.remove("active"));
    operator.classList.add("active");
    notify(`${operator.textContent?.trim()} selected`);
  }

  const service = target.closest<HTMLButtonElement>(".service");
  if (service && !service.dataset.go) {
    document.querySelectorAll(".service").forEach(x => x.classList.remove("selected"));
    service.classList.add("selected");
    notify(`${service.querySelector("b")?.textContent || "Service"} selected`);
  }
});

show("welcome");
