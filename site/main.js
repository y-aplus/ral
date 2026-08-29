const menuButton = document.querySelector(".menu-button");
const mobileNav = document.querySelector(".mobile-nav");

menuButton?.addEventListener("click", () => {
  const open = menuButton.getAttribute("aria-expanded") === "true";
  menuButton.setAttribute("aria-expanded", String(!open));
  mobileNav.hidden = open;
});

mobileNav?.addEventListener("click", (event) => {
  if (event.target instanceof HTMLAnchorElement) {
    menuButton.setAttribute("aria-expanded", "false");
    mobileNav.hidden = true;
  }
});

const notice = document.querySelector("#notice-text");
const copyButton = document.querySelector("[data-copy-notice]");

copyButton?.addEventListener("click", async () => {
  if (!notice) return;
  try {
    await navigator.clipboard.writeText(notice.textContent.trimEnd() + "\n");
    copyButton.querySelector("span").textContent = "Copied";
    window.setTimeout(() => {
      copyButton.querySelector("span").textContent = "Copy";
    }, 1800);
  } catch {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(notice);
    selection.removeAllRanges();
    selection.addRange(range);
    copyButton.querySelector("span").textContent = "Selected";
  }
});

for (const details of document.querySelectorAll("details")) {
  details.addEventListener("toggle", () => {
    const marker = details.querySelector("summary span");
    if (marker) marker.textContent = details.open ? "−" : "＋";
  });
}
