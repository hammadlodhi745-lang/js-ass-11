const sampleUsers = [
  { uid: "sample-awais", fullName: "Awais", online: true },
  { uid: "sample-ali", fullName: "Ali", online: true },
  { uid: "sample-shahzaib", fullName: "Shahzaib Lodhi", online: false },
  { uid: "sample-farhan", fullName: "Farhan Malik", online: true },
  { uid: "sample-hashir", fullName: "Hashir Lodhi", online: false }
];

function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join("") || "?";
}

function createSampleConversations() {
  return {
    "sample-awais": [
      { senderId: "sample-awais", text: "Assalamu alaikum! Kya haal hain?", time: "10:32 AM" },
      { senderId: "me", text: "Wa alaikum assalam! Alhamdulillah, theek hoon. Aap sunao?", time: "10:34 AM" },
      { senderId: "sample-awais", text: "Alhamdulillah, main bhi theek. Kal milte hain inshaAllah.", time: "10:35 AM" }
    ],
    "sample-ali": [
      { senderId: "sample-ali", text: "Aaj ka assignment complete hua?", time: "9:18 AM" },
      { senderId: "me", text: "Haan, bas final check kar raha hoon.", time: "9:20 AM" }
    ],
    "sample-shahzaib": [
      { senderId: "sample-shahzaib", text: "Kal ka match dekh rahe ho?", time: "Yesterday" },
      { senderId: "me", text: "Bilkul, plan confirm hai.", time: "Yesterday" }
    ],
    "sample-farhan": [
      { senderId: "sample-farhan", text: "Family dinner ka plan 8 baje hai.", time: "Yesterday" },
      { senderId: "me", text: "Theek hai, main time par pohanch jaunga.", time: "Yesterday" }
    ],
    "sample-hashir": [
      { senderId: "sample-hashir", text: "Nayi book kaisi lag rahi hai?", time: "Yesterday" },
      { senderId: "me", text: "Kaafi achi hai, finish karke bataunga.", time: "Yesterday" }
    ]
  };
}

export function createChat(currentUser, registeredUsers = []) {
  const users = [
    ...sampleUsers,
    ...registeredUsers
      .filter((user) => user.uid !== currentUser.uid)
      .map((user) => ({ ...user, online: false }))
  ];
  const storageKey = `chatly.messages.${currentUser.uid}`;
  const savedConversations = localStorage.getItem(storageKey);
  const conversations = savedConversations
    ? JSON.parse(savedConversations)
    : createSampleConversations();
  let activeUserId = null;
  let mobileView = "users";

  if (!savedConversations) {
    localStorage.setItem(storageKey, JSON.stringify(conversations));
  }

  const usersPanel = document.querySelector("#usersPanel");
  const chatPanel = document.querySelector("#chatPanel");
  const userList = document.querySelector("#userList");
  const userSearch = document.querySelector("#userSearch");
  const messageArea = document.querySelector("#messageArea");
  const messageList = document.querySelector("#messageList");
  const messageInput = document.querySelector("#messageInput");
  const sendButton = document.querySelector("#sendButton");

  function conversationFor(userId) {
    if (!conversations[userId]) conversations[userId] = [];
    return conversations[userId];
  }

  function saveConversations() {
    localStorage.setItem(storageKey, JSON.stringify(conversations));
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
        ? `${lastMessage.senderId === "me" ? "You: " : ""}${lastMessage.text}`
        : "Start a conversation";

      details.append(topLine, preview);
      button.append(avatar, details);
      button.addEventListener("click", () => selectUser(user.uid, true));
      userList.append(button);
    });

    if (!visibleUsers.length) {
      const empty = document.createElement("p");
      empty.className = "text-secondary small text-center mt-3";
      empty.textContent = "No users found.";
      userList.append(empty);
    }
  }

  function renderMessages(user) {
    const conversation = conversationFor(user.uid);
    messageList.replaceChildren();
    document.querySelector("#emptyChat").classList.toggle("d-none", conversation.length > 0);

    conversation.forEach((message, index) => {
      const sent = message.senderId === "me";
      const row = document.createElement("div");
      row.className = `d-flex ${sent ? "justify-content-end" : "justify-content-start"} mb-3`;

      const bubble = document.createElement("div");
      bubble.className = `rounded-4 p-3 w-75 ${sent ? "bg-primary text-white" : "bg-body-secondary text-light"}`;

      const sender = document.createElement("small");
      sender.className = `d-block fw-semibold mb-1 ${sent ? "text-white-50" : "text-light"}`;
      sender.textContent = sent ? "You" : user.fullName;

      const text = document.createElement("div");
      text.className = "text-break";
      text.textContent = message.text;

      const time = document.createElement("small");
      time.className = `d-block text-end mt-2 ${sent ? "text-white-50" : "text-light opacity-75"}`;
      time.textContent = message.time;

      bubble.append(sender, text, time);
      row.append(bubble);
      messageList.append(row);
      animateMessage(row, Math.min(index * 30, 120));
    });

    requestAnimationFrame(() => {
      messageArea.scrollTop = messageArea.scrollHeight;
    });
  }

  function selectUser(userId, openOnMobile = false) {
    const user = users.find((item) => item.uid === userId);
    if (!user) return;
    activeUserId = userId;
    renderUsers(userSearch.value);

    document.querySelector("#activeName").textContent = user.fullName;
    document.querySelector("#activeAvatar").textContent = initials(user.fullName);
    document.querySelector("#activeStatus").textContent = user.online ? "Online" : "Offline";
    document.querySelector("#activeStatus").className = `small mb-0 ${user.online ? "text-success" : "text-secondary"}`;
    messageInput.disabled = false;
    sendButton.disabled = !messageInput.value.trim();
    renderMessages(user);

    if (openOnMobile && window.matchMedia("(max-width: 991.98px)").matches) {
      setMobileView("chat");
    }
  }

  function sendMessage(text) {
    const trimmed = text.trim();
    if (!activeUserId || !trimmed) return;
    conversationFor(activeUserId).push({
      senderId: "me",
      text: trimmed,
      time: new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date())
    });
    saveConversations();
    messageInput.value = "";
    sendButton.disabled = true;
    const user = users.find((item) => item.uid === activeUserId);
    if (user) {
      renderMessages(user);
      renderUsers(userSearch.value);
    }
    messageInput.focus();
  }

  document.querySelector("#messageForm").addEventListener("submit", (event) => {
    event.preventDefault();
    sendMessage(messageInput.value);
  });

  messageInput.addEventListener("input", () => {
    sendButton.disabled = !activeUserId || !messageInput.value.trim();
  });

  userSearch.addEventListener("input", () => renderUsers(userSearch.value));
  document.querySelector("#backToUsers").addEventListener("click", () => setMobileView("users"));

  renderUsers();
  if (users.length) selectUser(users[0].uid);

  return {
    syncResponsiveLayout,
    showUsersOnMobile: () => setMobileView("users")
  };
}
