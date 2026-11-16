import { initializePageMotion } from "./motion.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from "https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js";
import { auth } from "./firebase.js";

initializePageMotion();

function showFeedback(message, type = "danger") {
  const feedback = document.querySelector("#authFeedback");
  if (!feedback) return;
  feedback.className = `alert alert-${type}`;
  feedback.textContent = message;
}

const loginForm = document.querySelector("#loginForm");
if (loginForm) {
  const notice = sessionStorage.getItem("chatly.notice");
  if (notice) {
    showFeedback(notice, "success");
    sessionStorage.removeItem("chatly.notice");
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!loginForm.reportValidity()) return;

    const email = document.querySelector("#loginEmail").value.trim().toLowerCase();
    const password = document.querySelector("#loginPassword").value;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = "dashboard.html";
    } catch (error) {
      showFeedback(error.message);
    }
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

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    validatePasswordMatch();
    if (!signupForm.reportValidity()) return;

    const fullName = document.querySelector("#fullName").value.trim();
    const email = document.querySelector("#signupEmail").value.trim().toLowerCase();

    if (!fullName) {
      showFeedback("Please enter your full name.");
      return;
    }

    try {
      const { user } = await createUserWithEmailAndPassword(
        auth,
        email,
        passwordInput.value
      );
      await updateProfile(user, { displayName: fullName });
      window.location.href = "dashboard.html";
    } catch (error) {
      showFeedback(error.message);
    }
  });
}
