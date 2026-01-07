// AUTH CHECK FUNCTION
async function checkAuth() {
  try {
    const res = await fetch('http://localhost:2025/api/me', {
      credentials: 'include'
    });
    const data = await res.json();
    return data.loggedIn ? data : false;
  } catch (err) {
    console.error('Auth check failed:', err);
    return false;
  }
}

// SIGNUP FORM HANDLER
const signupForm = document.getElementById('signupForm');
if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const signupMsgEl = document.getElementById('signupMessage');
    if (signupMsgEl) {
      signupMsgEl.textContent = 'Submitting...';
      signupMsgEl.className = '';
    }

    const data = {
      name: document.getElementById('name').value.trim(),
      email: document.getElementById('email').value.trim(),
      password: document.getElementById('password').value,
      role: document.getElementById('role').value
    };

    if (!data.name || !data.email || !data.password || !data.role) {
      if (signupMsgEl) {
        signupMsgEl.textContent = 'All fields are required';
        signupMsgEl.className = 'error';
      }
      return;
    }

    try {
      const res = await fetch('http://localhost:2025/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await res.json();
      
      if (signupMsgEl) {
        if (res.ok) {
          signupMsgEl.textContent = `Signup successful! ${result.status === 'pending' ? 'Your staff account is pending approval.' : 'You can now login.'}`;
          signupMsgEl.className = 'success';
          signupForm.reset();
          
          setTimeout(() => {
            if (result.status === 'approved' || data.role === 'donor') {
              window.location.href = '/login.html';
            }
          }, 2000);
        } else {
          signupMsgEl.textContent = result.message || 'Signup failed';
          signupMsgEl.className = 'error';
        }
      }
    } catch (error) {
      console.error(error);
      if (signupMsgEl) {
        signupMsgEl.textContent = 'Signup failed. Please try again.';
        signupMsgEl.className = 'error';
      }
    }
  });
}

// LOGIN FORM HANDLER
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const loginMsgEl = document.getElementById('loginMessage');
    if (loginMsgEl) {
      loginMsgEl.textContent = 'Logging in...';
      loginMsgEl.className = '';
    }

    const data = {
      email: document.getElementById('email').value.trim(),
      password: document.getElementById('password').value
    };

    try {
      const res = await fetch('http://localhost:2025/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
      });

      const result = await res.json();
      console.log('LOGIN RESPONSE:', result);

      if (loginMsgEl) {
        if (result.success) {
          loginMsgEl.textContent = 'Login successful! Redirecting...';
          loginMsgEl.className = 'success';
          
          localStorage.setItem('user', JSON.stringify(result));
          localStorage.setItem('loggedInName', result.name);
          
          setTimeout(() => {
            window.location.href = `/${result.role}`;
          }, 1000);
          
        } else if (result.status === 'pending') {
          loginMsgEl.textContent = result.message || 'Your staff account is pending approval.';
          loginMsgEl.className = 'warning';
          
        } else if (result.status === 'rejected') {
          loginMsgEl.textContent = result.message || 'Your staff account has been rejected. Contact admin.';
          loginMsgEl.className = 'error';
          
        } else {
          loginMsgEl.textContent = result.message || 'Login failed';
          loginMsgEl.className = 'error';
        }
      }
    } catch (err) {
      console.error(err);
      if (loginMsgEl) {
        loginMsgEl.textContent = 'Login failed. Please try again.';
        loginMsgEl.className = 'error';
      }
    }
  });
}

// LOGOUT FUNCTION
function logout() {
  fetch('http://localhost:2025/logout', {
    method: 'POST',
    credentials: 'include'
  })
  .then(res => res.json())
  .then(data => {
    localStorage.clear();
    window.location.href = '/login.html';
  })
  .catch(err => {
    console.error('Logout failed:', err);
    localStorage.clear();
    window.location.href = '/login.html';
  });
}

// STAFF APPROVAL FUNCTIONS (ADMIN ONLY)
function refreshStaffList() {
  fetch('http://localhost:2025/admin/pending-staff', {
    credentials: 'include'
  })
    .then(res => {
      if (!res.ok) {
        if (res.status === 403 || res.status === 401) {
          window.location.href = '/login.html';
        }
        throw new Error('Failed to fetch staff requests');
      }
      return res.json();
    })
    .then(data => {
      const list = document.getElementById('staffRequestList');
      if (!list) return;

      list.innerHTML = '';

      if (data.length === 0) {
        list.innerHTML = '<li class="no-requests">No pending staff requests.</li>';
        return;
      }

      data.forEach(user => {
        const item = document.createElement('li');
        item.className = 'staff-request-item';
        item.innerHTML = `
          <div class="staff-info">
            <strong>${user.name}</strong>
            <span>${user.email}</span>
          </div>
          <div class="staff-actions">
            <button class="approveStaff" data-user-id="${user.id}">✓ Approve</button>
            <button class="rejectStaff" data-user-id="${user.id}">✗ Reject</button>
          </div>
        `;
        list.appendChild(item);
      });
    })
    .catch(err => {
      console.error('Error fetching staff requests:', err);
      const list = document.getElementById('staffRequestList');
      if (list) list.innerHTML = '<li class="error">Failed to load staff requests.</li>';
    });
}

// Event delegation for staff approval buttons
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
  if (!confirm('Approve this staff member?')) return;
  
  fetch('http://localhost:2025/admin/approve', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ id }),
    credentials: 'include'
  })
    .then(res => {
      if (!res.ok) {
        if (res.status === 403) {
          alert('You do not have permission to approve staff.');
        }
        throw new Error('Approval failed');
      }
      return res.json();
    })
    .then(() => {
      refreshStaffList();
    })
    .catch(err => {
      console.error('Approval error:', err);
      alert('Failed to approve staff member');
    });
}

function rejectStaff(id) {
  if (!confirm('Reject this staff application?')) return;
  
  fetch('http://localhost:2025/admin/reject', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ id }),
    credentials: 'include'
  })
    .then(res => {
      if (!res.ok) {
        if (res.status === 403) {
          alert('You do not have permission to reject staff.');
        }
        throw new Error('Rejection failed');
      }
      return res.json();
    })
    .then(() => {
      refreshStaffList();
    })
    .catch(err => {
      console.error('Rejection error:', err);
      alert('Failed to reject staff member');
    });
}

document.addEventListener('DOMContentLoaded', () => {
  const protectedPages = ['admin.html', 'charity_staff.html', 'donor.html'];
  const currentPage = window.location.pathname.split('/').pop();
  
  if (protectedPages.includes(currentPage)) {
    checkAuth().then(user => {
      if (!user) {
        window.location.href = '/login.html';
        return;
      }
      if (currentPage === 'admin.html' && user.role !== 'admin') {
        window.location.href = `/${user.role}`;
      } else if (currentPage === 'charity_staff.html' && user.role !== 'staff') {
        window.location.href = `/${user.role}`;
      } else if (currentPage === 'donor.html' && user.role !== 'donor') {
        window.location.href = `/${user.role}`;
      }
      
      const userDisplay = document.getElementById('userDisplay');
      if (userDisplay) {
        userDisplay.textContent = `Welcome, ${user.name} (${user.role})`;
      }
      const logoutBtn = document.getElementById('logoutBtn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
      }
      
      if (currentPage === 'admin.html' && user.role === 'admin') {
        refreshStaffList();
      }
    });
  }
});