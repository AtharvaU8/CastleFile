const menu = document.querySelector(".menu-btn i").addEventListener("click", () => {
  document.querySelector(".navbar .menu").classList.toggle("active");
  document.querySelector(".menu-btn i").classList.toggle("active");
  document.querySelector(".navbar .max-width .menu .inaclogo").classList.toggle("aclogo");
});