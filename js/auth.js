import { initializePageMotion } from "./motion.js";

const ACCOUNT_STORAGE_KEY = "chatly.accounts.v1";
const ACTIVE_USER_KEY = "chatly.activeUser";

initializePageMotion();

function readAccounts() {
  const saved = localStorage.getItem(ACCOUNT_STORAGE_KEY);
  return saved ? JSON.parse(saved) : [];
}

function showFeedback(message, type = "danger") {
  const feedback = document.querySelector("#authFeedback");
  if (!feedback) return;
  feedback.className = `alert alert-${type}`;
  feedback.textContent = message;
}

function makeUid() {
  return `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function nameFromEmail(email) {
  const localPart = email.split("@")[0];
  return localPart
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Chatly User";
}

const loginForm = document.querySelector("#loginForm");
if (loginForm) {
  const notice = sessionStorage.getItem("chatly.notice");
  if (notice) {
    showFeedback(notice, "success");
    sessionStorage.removeItem("chatly.notice");
  }

  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!loginForm.reportValidity()) return;

    const email = document.querySelector("#loginEmail").value.trim().toLowerCase();
    const accounts = readAccounts();
    const account = accounts.find((item) => item.email === email);
    const user = account
      ? { uid: account.uid, fullName: account.fullName, email: account.email }
      : { uid: `preview-${encodeURIComponent(email)}`, fullName: nameFromEmail(email), email };

    sessionStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(user));
    window.location.href = "dashboard.html";
  });
}

const signupForm = document.querySelector("#signupForm");
if (signupForm) {
  const passwordInput = document.querySelector("#signupPassword");
  const confirmInput = document.querySelector("#confirmPassword");

  function validatePasswordMatch() {
    confirmInput.setCustomValidity(
      confirmInput.value && confirmInput.value !== passwordInput.value
        ? "Passwords do not match."
        : ""
    );
  }

  passwordInput.addEventListener("input", validatePasswordMatch);
  confirmInput.addEventListener("input", validatePasswordMatch);

  signupForm.addEventListener("submit", (event) => {
    event.preventDefault();
    validatePasswordMatch();
    if (!signupForm.reportValidity()) return;

    const fullName = document.querySelector("#fullName").value.trim();
    const email = document.querySelector("#signupEmail").value.trim().toLowerCase();
    const accounts = readAccounts();

    if (!fullName) {
      showFeedback("Please enter your full name.");
      return;
    }
    if (accounts.some((account) => account.email === email)) {
      showFeedback("An account with this email already exists.");
      return;
    }

    accounts.push({ uid: makeUid(), fullName, email });
    localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(accounts));
    sessionStorage.setItem("chatly.notice", "Account created. You can now log in.");
    window.location.href = "index.html";
  });
}
