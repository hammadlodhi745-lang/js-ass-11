import {
  onDisconnect,
  onValue,
  push,
  ref,
  serverTimestamp,
  set,
  update
} from "https://www.gstatic.com/firebasejs/13.3.0/firebase-database.js";
import { database } from "./firebase.js";
import { setButtonLoading } from "./ui.js";

function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join("") || "?";
}

function formatTime(timestamp) {
  const date = new Date(Number(timestamp));
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(date);
}

export function createChat(currentUser) {
  let users = [];
  const conversations = new Map();
  let activeUserId = null;
  let mobileView = "users";
  let unsubscribeMessages = null;
  let isSending = false;

  const usersPanel = document.querySelector("#usersPanel");
  const chatPanel = document.querySelector("#chatPanel");
  const userList = document.querySelector("#userList");
  const userSearch = document.querySelector("#userSearch");
  const messageArea = document.querySelector("#messageArea");
  const messageList = document.querySelector("#messageList");
  const messageInput = document.querySelector("#messageInput");
  const sendButton = document.querySelector("#sendButton");
  const chatFeedback = document.querySelector("#chatFeedback");

  function conversationFor(userId) {
    if (!conversations.has(userId)) conversations.set(userId, []);
    return conversations.get(userId);
  }

  function showFeedback(message, type = "danger") {
    chatFeedback.className = `alert alert-${type} mb-3`;
    chatFeedback.textContent = message;
  }

  function clearFeedback() {
    chatFeedback.className = "alert d-none mb-3";
    chatFeedback.textContent = "";
  }

  function conversationPath(userId) {
    const [uidA, uidB] = [currentUser.uid, userId].sort();
    return `conversations/${uidA}/${uidB}/messages`;
  }

  function animateMessage(element, delay = 0) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof element.animate !== "function") return;
    element.animate(
      [
        { opacity: 0, transform: "translateY(8px)" },
        { opacity: 1, transform: "translateY(0)" }
      ],
      { duration: 200, delay, easing: "ease-out" }
    );
  }

  function setMobileView(view) {
    mobileView = view;
    if (window.matchMedia("(min-width: 992px)").matches) {
      usersPanel.classList.remove("d-none");
      chatPanel.classList.remove("d-none");
      return;
    }
    usersPanel.classList.toggle("d-none", view === "chat");
    chatPanel.classList.toggle("d-none", view === "users");
  }

  function syncResponsiveLayout() {
    setMobileView(mobileView);
  }

  function renderUsers(query = "") {
    const searchTerm = query.trim().toLowerCase();
    const visibleUsers = users.filter((user) => user.fullName.toLowerCase().includes(searchTerm));
    document.querySelector("#userCount").textContent = visibleUsers.length;
    userList.replaceChildren();

    visibleUsers.forEach((user) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `list-group-item list-group-item-action d-flex align-items-center gap-3 bg-dark text-light border-secondary rounded-3 mb-2${user.uid === activeUserId ? " active" : ""}`;
      button.setAttribute("aria-label", `Open chat with ${user.fullName}, ${user.online ? "online" : "offline"}`);

      const avatar = document.createElement("span");
      avatar.className = "rounded-circle bg-primary text-white fw-semibold d-inline-flex align-items-center justify-content-center p-2 flex-shrink-0";
      avatar.textContent = initials(user.fullName);

      const details = document.createElement("span");
      details.className = "flex-grow-1 overflow-hidden";
      const topLine = document.createElement("span");
      topLine.className = "d-flex align-items-center justify-content-between gap-2";
      const name = document.createElement("span");
      name.className = "fw-semibold text-truncate";
      name.textContent = user.fullName;
      const status = document.createElement("span");
      status.className = `badge rounded-pill ${user.online ? "text-bg-success" : "bg-body-secondary text-light"}`;
      status.textContent = user.online ? "Online" : "Offline";
      topLine.append(name, status);

      const conversation = conversationFor(user.uid);
      const lastMessage = conversation[conversation.length - 1];
      const preview = document.createElement("small");
      preview.className = "d-block text-secondary text-truncate mt-1";
      preview.textContent = lastMessage
        ? `${lastMessage.senderId === currentUser.uid ? "You: " : ""}${lastMessage.text}`
        : "Start a conversation";

      details.append(topLine, preview);
      button.append(avatar, details);
      button.addEventListener("click", () => selectUser(user.uid, true));
      userList.append(button);
    });

    if (!visibleUsers.length) {
      const empty = document.createElement("p");
      empty.className = "text-secondary small text-center mt-3";
      empty.textContent = users.length ? "No users found." : "No other registered users yet.";
      userList.append(empty);
    }
  }

  function renderMessages(user, forceScroll = false) {
    const conversation = conversationFor(user.uid);
    const wasAtBottom = messageArea.scrollHeight - messageArea.scrollTop - messageArea.clientHeight < 80;
    const shouldScrollToBottom = forceScroll || wasAtBottom;
    messageList.replaceChildren();
    document.querySelector("#emptyChat").classList.toggle("d-none", conversation.length > 0);

    conversation.forEach((message, index) => {
      const sent = message.senderId === currentUser.uid;
      const row = document.createElement("div");
      row.className = `d-flex ${sent ? "justify-content-end" : "justify-content-start"} mb-3`;

      const bubble = document.createElement("div");
      bubble.className = `message-bubble rounded-4 p-3 w-75 ${sent ? "bg-primary text-white" : "bg-body-secondary text-light"}`;

      const sender = document.createElement("small");
      sender.className = `fw-semibold ${sent ? "text-white-50" : "text-light"}`;
      sender.textContent = sent ? "You" : user.fullName;

      const messageHeader = document.createElement("div");
      messageHeader.className = "d-flex align-items-start justify-content-between gap-2 mb-1";
      messageHeader.append(sender);

      const text = document.createElement("div");
      text.className = "text-break";
      text.textContent = message.text;

      const time = document.createElement("small");
      time.className = `d-block text-end mt-2 ${sent ? "text-white-50" : "text-light opacity-75"}`;
      time.textContent = `${formatTime(message.timestamp)}${message.editedAt ? " (edited)" : ""}`;

      bubble.append(messageHeader, text, time);
      row.append(bubble);
      messageList.append(row);
      animateMessage(row, Math.min(index * 30, 120));
    });

    if (shouldScrollToBottom) {
      requestAnimationFrame(() => {
        messageArea.scrollTop = messageArea.scrollHeight;
      });
    }
  }

  function selectUser(userId, openOnMobile = false) {
    const user = users.find((item) => item.uid === userId);
    if (!user) return;
    if (unsubscribeMessages) unsubscribeMessages();
    activeUserId = userId;
    conversations.set(userId, []);
    renderUsers(userSearch.value);

    document.querySelector("#activeName").textContent = user.fullName;
    document.querySelector("#activeAvatar").textContent = initials(user.fullName);
    document.querySelector("#activeStatus").textContent = user.online ? "Online" : "Offline";
    document.querySelector("#activeStatus").className = `small mb-0 ${user.online ? "text-success" : "text-secondary"}`;
    messageInput.disabled = false;
    sendButton.disabled = !messageInput.value.trim();
    renderMessages(user, true);
    clearFeedback();

    const messagesRef = ref(database, conversationPath(userId));
    unsubscribeMessages = onValue(messagesRef, (snapshot) => {
      const records = snapshot.val() || {};
      const conversation = Object.entries(records)
        .filter(([, message]) => (
          message &&
          typeof message.senderId === "string" &&
          typeof message.text === "string" &&
          typeof message.timestamp === "number"
        ))
        .map(([id, message]) => ({ id, ...message }))
        .sort((first, second) => first.timestamp - second.timestamp);
      conversations.set(userId, conversation);

      if (activeUserId === userId) {
        renderMessages(user);
        renderUsers(userSearch.value);
      }
    }, (error) => {
      showFeedback(`Could not load messages: ${error.message}`);
    });

    if (openOnMobile && window.matchMedia("(max-width: 991.98px)").matches) {
      setMobileView("chat");
    }
  }

  async function sendMessage(text) {
    const trimmed = text.trim();
    if (!activeUserId || !trimmed || isSending) return;

    const recipientId = activeUserId;
    const restoreButton = setButtonLoading(sendButton, "Sending...");
    isSending = true;
    try {
      await set(push(ref(database, conversationPath(recipientId))), {
        senderId: currentUser.uid,
        text: trimmed,
        timestamp: serverTimestamp()
      });
      if (activeUserId === recipientId && messageInput.value.trim() === trimmed) {
        messageInput.value = "";
      }
      clearFeedback();
    } catch (error) {
      showFeedback(`Could not send message: ${error.message}`);
    } finally {
      restoreButton();
      isSending = false;
      sendButton.disabled = !activeUserId || !messageInput.value.trim();
    }
    messageInput.focus();
  }

  document.querySelector("#messageForm").addEventListener("submit", (event) => {
    event.preventDefault();
    void sendMessage(messageInput.value);
  });

  messageInput.addEventListener("input", () => {
    sendButton.disabled = isSending || !activeUserId || !messageInput.value.trim();
  });

  userSearch.addEventListener("input", () => renderUsers(userSearch.value));
  document.querySelector("#backToUsers").addEventListener("click", () => setMobileView("users"));

  onValue(ref(database, "users"), (snapshot) => {
    const profiles = snapshot.val() || {};
    users = Object.entries(profiles)
      .filter(([uid, profile]) => (
        uid !== currentUser.uid &&
        profile &&
        typeof profile.fullName === "string" &&
        profile.fullName.trim()
      ))
      .map(([uid, profile]) => ({
        uid,
        fullName: profile.fullName.trim(),
        online: profile.online === true
      }))
      .sort((first, second) => first.fullName.localeCompare(second.fullName));

    if (activeUserId && !users.some((user) => user.uid === activeUserId)) {
      if (unsubscribeMessages) unsubscribeMessages();
      unsubscribeMessages = null;
      activeUserId = null;
      document.querySelector("#activeName").textContent = "Select a conversation";
      document.querySelector("#activeAvatar").textContent = "?";
      document.querySelector("#activeStatus").textContent = "Choose a user to start chatting";
      messageInput.disabled = true;
      sendButton.disabled = true;
      messageList.replaceChildren();
    }
    renderUsers(userSearch.value);
  }, (error) => {
    showFeedback(`Could not load users: ${error.message}`);
  });

  update(ref(database, `users/${currentUser.uid}`), {
    fullName: currentUser.fullName,
    online: false
  }).then(() => {
    onValue(ref(database, ".info/connected"), (snapshot) => {
      if (snapshot.val() !== true) return;

      const onlineRef = ref(database, `users/${currentUser.uid}/online`);
      onDisconnect(onlineRef).set(false)
        .then(() => set(onlineRef, true))
        .catch((error) => showFeedback(`Could not update online status: ${error.message}`));
    }, (error) => {
      showFeedback(`Could not monitor connection: ${error.message}`);
    });
  }).catch((error) => {
    showFeedback(`Could not save your profile: ${error.message}`);
  });

  return {
    syncResponsiveLayout,
    showUsersOnMobile: () => setMobileView("users")
  };
}
