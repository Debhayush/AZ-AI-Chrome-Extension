document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("open-maang");

  if (btn) {
    btn.addEventListener("click", () => {
      chrome.tabs.create({ url: "https://maang.in" });
    });
  }
});
