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

// LOGIN FORM HANDLER
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

   if (result.role === 'donor' && result.status === 'approved') {
        window.location.href = 'donor.html';
      } else if (result.role === 'staff' && result.status === 'approved') {
        window.location.href = 'charity staff.html';
      } else if (result.role === 'admin' && result.status === 'approved') {
        window.location.href = 'admin.html';
      } else if (result.status === 'pending') {
        if (loginMsgEl) loginMsgEl.textContent = 'Your account is still pending approval.';
      } else if (result.status === 'rejected') {
        if (loginMsgEl) loginMsgEl.textContent = 'Your staff account has been rejected. Contact admin.';
      } else {
        if (loginMsgEl) loginMsgEl.textContent = result.message || 'Login failed.';
      }
    } catch (err) {
      console.error(err);
      if (loginMsgEl) loginMsgEl.textContent = 'Login failed. Please try again.';
    }
  });
}

// fetch pending staff requests and display them in the admin dashboard
function refreshStaffList() {}
fetch('http://localhost:2000/admin/pending-staff')
  .then(res => res.json())
  .then(data => {
    const list = document.getElementById('staffRequestList');
    if (!list) return;
    list.innerHTML = '';
    data.forEach(user => {
      const item = document.createElement('li');
      item.innerHTML = `
        <strong>${user.name}</strong> (${user.email})
        <button class="approveStaff" data-user-id="${user_id}">Approve</button>
        <button class="rejectStaff" data-user-id="${user_id}">Reject</button>
      `;
      list.appendChild(item);
    });
  })
  .catch(err => {
    console.error('Error fetching staff requests:', err);
    const list = document.getElementById('staffRequestList');
    if (list) list.innerHTML = '<li>Failed to load staff requests.</li>';
  });

// Event delegation for approve/reject buttons
document.addEventListener('click', (e) => {
  const target = e.target;
  if (target.matches('.approveStaff')) {
    const id = target.getAttribute('data-user-id');
    if (id) approveStaff(id);
  } else if (target.matches('.rejectStaff')) {
    const id = target.getAttribute('data-user-id');
    if (id) rejectStaff(id);
  }
});

// approve staff
function approveStaff(id) {
  fetch('http://localhost:2000/admin/approve', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ id })
  })
    .then(res => res.json())
    .then(result => {
      console.log('Approval result:', result);
      // optionally refresh the list or remove the item from DOM
    })
    .catch(err => console.error('Approval failed:', err));
}

// reject staff
function rejectStaff(id) {
  fetch('http://localhost:2000/admin/reject', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ id })
  })
   .then(() => location.reload())
    .catch(err => console.error('Rejection failed:', err));

}
   