import { createChat } from "./chat.js";
import { initializePageMotion } from "./motion.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js";
import { auth } from "./firebase.js";

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

  document.querySelector("#logoutButton").addEventListener("click", async () => {
    try {
      await signOut(auth);
      window.location.href = "index.html";
    } catch (error) {
      window.alert(`Could not log out: ${error.message}`);
    }
  });
});
