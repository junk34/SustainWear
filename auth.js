// SIGNUP FORM HANDLER
const signupForm = document.getElementById('signupForm');
if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const signupMsgEl = document.getElementById('signupMessage');
    if (signupMsgEl) signupMsgEl.textContent = 'Submitting...';

    const data = {
      name: document.getElementById('name').value,
      email: document.getElementById('email').value,
      password: document.getElementById('password').value,
      role: document.getElementById('role').value
    };

    try {
      const res = await fetch('http://localhost:2000/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await res.json();
      if (signupMsgEl) signupMsgEl.textContent = result.message || 'Signup successful.';
      signupForm.reset();
    } catch (error) {
      console.error(error);
      if (signupMsgEl) signupMsgEl.textContent = 'Signup failed. Please try again.';
    }
  });
}



const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const loginMsgEl = document.getElementById('loginMessage');
    if (loginMsgEl) loginMsgEl.textContent = 'Logging in...';

    const data = {
      email: document.getElementById('email').value,
      password: document.getElementById('password').value
    };

    try {
      const res = await fetch('http://localhost:2000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await res.json();
      console.log("LOGIN RESULT:", result);

   if (result.role === 'donor' && result.status === 'approved') {
        window.location.href = 'donor.html';
      } else if (result.role === 'staff' && result.status === 'approved') {
        window.location.href = 'admin.html';
      } else if (result.role === 'admin' && result.status === 'approved') {
        window.location.href = 'admin.html';
      } else if (result.status === 'pending') {
        if (loginMsgEl) loginMsgEl.textContent = 'Your account is still pending approval.';
      } else if (result.status === 'rejected') {
        if (loginMsgEl) loginMsgEl.textContent = 'Your staff account has been rejected. Contact admin.';
      } else {
        if (loginMsgEl) loginMsgEl.textContent = result.message || 'Login failed.';
      }

      if (result.role === 'donor' && result.status === 'approved') {
        window.location.href = `donor.html?name=${encodeURIComponent(result.name)}`;
        return;
      }

      if (result.role === 'staff' && result.status === 'approved') {
        window.location.href = 'charity staff.html';
        return;
      }

      if (result.role === 'admin' && result.status === 'approved') {
        window.location.href = 'admin.html';
        return;
      }

      if (result.status === 'pending') {
        if (loginMsgEl) loginMsgEl.textContent = 'Your account is still pending approval.';
        return;
      }

      if (result.status === 'rejected') {
        if (loginMsgEl) loginMsgEl.textContent = 'Your staff account has been rejected.';
        return;
      }

      if (loginMsgEl) loginMsgEl.textContent = result.message || 'Login failed.';

    } catch (err) {
      console.error(err);
      if (loginMsgEl) loginMsgEl.textContent = 'Login failed. Please try again.';
    }
  });
}




function refreshStaffList() {
  fetch('http://localhost:2000/admin/pending-staff')
    .then(res => res.json())
    .then(data => {
      const list = document.getElementById('staffRequestList');
      if (!list) return;

      list.innerHTML = '';

      if (data.length === 0) {
        list.innerHTML = '<li>No pending staff requests.</li>';
        return;
      }

      data.forEach(user => {
        const item = document.createElement('li');
        item.innerHTML = `
          <strong>${user.name}</strong> (${user.email})
          <button class="approveStaff" data-user-id="${user.id}">Approve</button>
          <button class="rejectStaff" data-user-id="${user.id}">Reject</button>
        `;
        list.appendChild(item);
      });
    })
    .catch(err => {
      console.error('Error fetching staff requests:', err);
      const list = document.getElementById('staffRequestList');
      if (list) list.innerHTML = '<li>Failed to load staff requests.</li>';
    });
}



document.addEventListener('click', (e) => {
  const target = e.target;

  if (target.matches('.approveStaff')) {
    const id = target.getAttribute('data-user-id');
    if (id) approveStaff(id);
  }

  if (target.matches('.rejectStaff')) {
    const id = target.getAttribute('data-user-id');
    if (id) rejectStaff(id);
  }
});

function approveStaff(id) {
  fetch('http://localhost:2000/admin/approve', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ id })
  })
    .then(r => r.json())
    .then(() => refreshStaffList());
}

function rejectStaff(id) {
  fetch('http://localhost:2000/admin/reject', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ id })
  })
    .then(r => r.json())
    .then(() => refreshStaffList());
}

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.endsWith('admin.html')) {
    refreshStaffList();
  }
});