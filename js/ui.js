export function initializePageMotion() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const shell = document.querySelector("#appShell");
  if (shell && typeof shell.animate === "function") {
    shell.animate(
      [
        { backgroundColor: "#121826" },
        { backgroundColor: "#19172c", offset: 0.5 },
        { backgroundColor: "#121826" }
      ],
      { duration: 5000, easing: "ease-in-out", fill: "forwards" }
    );
  }

  document.querySelectorAll("main .card").forEach((card, index) => {
    if (typeof card.animate !== "function") return;
    card.animate(
      [
        { opacity: 0, transform: "translateY(8px)" },
        { opacity: 1, transform: "translateY(0)" }
      ],
      { duration: 400, delay: index * 70, easing: "ease-out" }
    );
  });
}

export function setButtonLoading(button, label) {
  const originalContent = button.innerHTML;
  const spinner = document.createElement("span");
  spinner.className = "spinner-border spinner-border-sm me-2";
  spinner.setAttribute("aria-hidden", "true");

  button.disabled = true;
  button.setAttribute("aria-busy", "true");
  button.replaceChildren(spinner, document.createTextNode(label));

  return () => {
    button.innerHTML = originalContent;
    button.disabled = false;
    button.removeAttribute("aria-busy");
  };
}
