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
