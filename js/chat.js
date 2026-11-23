import {
  onDisconnect,
  onValue,
  push,
  ref,
  remove,
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
  let editingMessageId = null;

  const usersPanel = document.querySelector("#usersPanel");
  const chatPanel = document.querySelector("#chatPanel");
  const userList = document.querySelector("#userList");
  const userSearch = document.querySelector("#userSearch");
  const messageArea = document.querySelector("#messageArea");
  const messageList = document.querySelector("#messageList");
  const messageInput = document.querySelector("#messageInput");
  const sendButton = document.querySelector("#sendButton");
  const cancelEditButton = document.querySelector("#cancelEditButton");
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

  async function copyMessage(text) {
    try {
      await navigator.clipboard.writeText(text);
      showFeedback("Message copied.", "success");
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.className = "position-fixed opacity-0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
      showFeedback("Message copied.", "success");
    }
  }

  function startEditing(message) {
    editingMessageId = message.id;
    messageInput.value = message.text;
    messageInput.disabled = false;
    messageInput.focus();
    sendButton.disabled = false;
    sendButton.innerHTML = '<i class="bi bi-check-lg"></i><span class="d-none d-sm-inline ms-1">Save</span>';
    cancelEditButton.classList.remove("d-none");
  }

  function cancelEditing() {
    editingMessageId = null;
    messageInput.value = "";
    sendButton.disabled = !activeUserId || !messageInput.value.trim();
    sendButton.innerHTML = '<i class="bi bi-send-fill"></i><span class="d-none d-sm-inline ms-1">Send</span>';
    cancelEditButton.classList.add("d-none");
  }

  async function editMessage(messageId, text) {
    if (!activeUserId || !editingMessageId) return;
    const restoreButton = setButtonLoading(sendButton, "Saving...");
    isSending = true;
    try {
      await update(ref(database, `${conversationPath(activeUserId)}/${messageId}`), {
        text: text.trim(),
        editedAt: serverTimestamp()
      });
      cancelEditing();
      clearFeedback();
    } catch (error) {
      showFeedback(`Could not edit message: ${error.message}`);
    } finally {
      restoreButton();
      isSending = false;
      if (!editingMessageId) {
        sendButton.innerHTML = '<i class="bi bi-send-fill"></i><span class="d-none d-sm-inline ms-1">Send</span>';
      }
      sendButton.disabled = isSending || !activeUserId || !messageInput.value.trim();
    }
  }

  async function deleteMessage(messageId) {
    if (!activeUserId || !messageId) return;
    if (!window.confirm("Delete this message?")) return;
    try {
      await remove(ref(database, `${conversationPath(activeUserId)}/${messageId}`));
      if (editingMessageId === messageId) cancelEditing();
      clearFeedback();
    } catch (error) {
      showFeedback(`Could not delete message: ${error.message}`);
    }
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
      topLine.appendChild(name);
      topLine.appendChild(status);

      const conversation = conversationFor(user.uid);
      const lastMessage = conversation[conversation.length - 1];
      const preview = document.createElement("small");
      preview.className = "d-block text-secondary text-truncate mt-1";
      preview.textContent = lastMessage
        ? `${lastMessage.senderId === currentUser.uid ? "You: " : ""}${lastMessage.text}`
        : "Start a conversation";

      details.appendChild(topLine);
      details.appendChild(preview);
      button.appendChild(avatar);
      button.appendChild(details);
      button.addEventListener("click", () => selectUser(user.uid, true));
      userList.appendChild(button);
    });

    if (!visibleUsers.length) {
      const empty = document.createElement("p");
      empty.className = "text-secondary small text-center mt-3";
      empty.textContent = users.length ? "No users found." : "No other registered users yet.";
      userList.appendChild(empty);
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
      messageHeader.appendChild(sender);

      const actions = document.createElement("details");
      actions.className = "position-relative";
      actions.style.zIndex = "2";

      const menuButton = document.createElement("summary");
      menuButton.className = "btn btn-sm border-0 p-1 text-light opacity-75";
      menuButton.title = "Message actions";
      menuButton.setAttribute("aria-label", "Message actions");
      menuButton.style.listStyle = "none";
      menuButton.style.cursor = "pointer";
      menuButton.innerHTML = '<i class="bi bi-three-dots-vertical"></i>';

      const menu = document.createElement("div");
      menu.className = "position-absolute end-0 mt-1 rounded-2 border border-secondary bg-dark shadow p-1";
      menu.style.minWidth = "130px";

      const copyButton = document.createElement("button");
      copyButton.type = "button";
      copyButton.className = "btn btn-sm btn-dark border-0 w-100 text-start";
      copyButton.innerHTML = '<i class="bi bi-copy me-2"></i>Copy';
      copyButton.addEventListener("click", () => {
        actions.open = false;
        void copyMessage(message.text);
      });
      menu.appendChild(copyButton);

      if (sent) {
        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "btn btn-sm btn-dark border-0 w-100 text-start";
        editButton.innerHTML = '<i class="bi bi-pencil me-2"></i>Edit';
        editButton.addEventListener("click", () => {
          actions.open = false;
          startEditing(message);
        });
        menu.appendChild(editButton);

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "btn btn-sm btn-dark border-0 w-100 text-start text-danger";
        deleteButton.innerHTML = '<i class="bi bi-trash me-2"></i>Delete';
        deleteButton.addEventListener("click", () => {
          actions.open = false;
          void deleteMessage(message.id);
        });
        menu.appendChild(deleteButton);
      }

      actions.appendChild(menuButton);
      actions.appendChild(menu);

      messageHeader.appendChild(actions);

      const text = document.createElement("div");
      text.className = "text-break";
      text.textContent = message.text;

      const time = document.createElement("small");
      time.className = `d-block text-end mt-2 ${sent ? "text-white-50" : "text-light opacity-75"}`;
      time.textContent = `${formatTime(message.timestamp)}${message.editedAt ? " (edited)" : ""}`;

      bubble.appendChild(messageHeader);
      bubble.appendChild(text);
      bubble.appendChild(time);
      row.appendChild(bubble);
      messageList.appendChild(row);
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
    if (editingMessageId) cancelEditing();
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

    if (editingMessageId) {
      await editMessage(editingMessageId, trimmed);
      return;
    }

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

  cancelEditButton.addEventListener("click", cancelEditing);

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
