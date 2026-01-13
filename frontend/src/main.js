const app = document.getElementById('app');
app.textContent = 'Frontend running — checking backend...';

fetch('/api/health')
  .then((r) => r.json())
  .then((data) => {
    app.textContent = `Backend: ${data.message}`;
  })
  .catch(() => {
    app.textContent = 'Backend unreachable';
  });
