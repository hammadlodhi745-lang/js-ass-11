import { createChat } from "./chat.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js";
import { auth } from "./firebase.js";
import { initializePageMotion, setButtonLoading } from "./ui.js";

initializePageMotion();

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.replace("index.html");
    return;
  }

  const fullName = user.displayName || user.email?.split("@")[0] || "Chatly User";
  const currentUser = { uid: user.uid, fullName, email: user.email };
  const profileName = document.querySelector("#profileName");
  const profileAvatar = document.querySelector("#profileAvatar");

  profileName.textContent = fullName;
  profileAvatar.textContent = fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  const chat = createChat(currentUser);
  window.addEventListener("resize", chat.syncResponsiveLayout);

  const logoutButton = document.querySelector("#logoutButton");
  let isLoggingOut = false;

  logoutButton.addEventListener("click", async () => {
    if (isLoggingOut) return;
    isLoggingOut = true;
    const restoreButton = setButtonLoading(logoutButton, "Logging out...");

    try {
      await signOut(auth);
      window.location.href = "index.html";
    } catch (error) {
      restoreButton();
      isLoggingOut = false;
      window.alert(`Could not log out: ${error.message}`);
    }
  });
});
