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
