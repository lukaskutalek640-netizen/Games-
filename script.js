const yearEl = document.getElementById('year');
const form = document.getElementById('joinForm');
const messageEl = document.getElementById('formMessage');
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
const navLinks = document.querySelectorAll('.nav-link');

yearEl.textContent = new Date().getFullYear();

menuToggle.addEventListener('click', () => {
  sidebar.classList.toggle('open');
});

navLinks.forEach((link) => {
  link.addEventListener('click', () => {
    navLinks.forEach((l) => l.classList.remove('active'));
    link.classList.add('active');
    sidebar.classList.remove('open');
  });
});

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const nick = document.getElementById('nick').value.trim();
  const interest = document.getElementById('interest').value;

  if (!nick || !interest) {
    messageEl.textContent = 'Vyplň prosím všechna pole.';
    return;
  }

  messageEl.textContent = `Díky ${nick}! Připraveno pro sekci: ${interest}.`;
  form.reset();
});
