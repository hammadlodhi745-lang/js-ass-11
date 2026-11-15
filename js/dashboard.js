import { createChat } from "./chat.js";
import { initializePageMotion } from "./motion.js";

const ACTIVE_USER_KEY = "chatly.activeUser";
const ACCOUNT_STORAGE_KEY = "chatly.accounts.v1";
const savedUser = sessionStorage.getItem(ACTIVE_USER_KEY);

initializePageMotion();

if (!savedUser) {
  window.location.replace("index.html");
} else {
  const currentUser = JSON.parse(savedUser);
  const savedAccounts = localStorage.getItem(ACCOUNT_STORAGE_KEY);
  const accounts = savedAccounts ? JSON.parse(savedAccounts) : [];
  const profileName = document.querySelector("#profileName");
  const profileAvatar = document.querySelector("#profileAvatar");

  profileName.textContent = currentUser.fullName;
  profileAvatar.textContent = currentUser.fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  const chat = createChat(currentUser, accounts);
  window.addEventListener("resize", chat.syncResponsiveLayout);

  document.querySelector("#logoutButton").addEventListener("click", () => {
    sessionStorage.removeItem(ACTIVE_USER_KEY);
    window.location.href = "index.html";
  });
}
