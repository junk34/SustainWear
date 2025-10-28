const signupForm = document.getElementById('signupForm');
if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = {
      name: document.getElementById('name').value,
      email: document.getElementById('email').value,
      password: document.getElementById('password').value,
      role: document.getElementById('role').value
    };

    const res = await fetch('/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await res.json();
    document.getElementById('signupMessage').textContent = result.message;
  });
}



const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = {
      email: document.getElementById('email').value,
      password: document.getElementById('password').value
    };

    const res = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await res.json();

    if (result.role === 'donor' && result.status === 'approved') {
      window.location.href = 'donor.html';
    } else if (result.role === 'staff') {
      document.getElementById('loginMessage').textContent =
        'Charity staff not et done';
    } else {
      document.getElementById('loginMessage').textContent = result.message;
    }
  });
}
