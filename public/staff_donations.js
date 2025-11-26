document.addEventListener("DOMContentLoaded", loadDonationRequests);

// Load donation requests
async function loadDonationRequests() {
  const container = document.getElementById("requests-container");
  if (!container) return;

  container.innerHTML = "<p>Loading...</p>";

  try {
    const res = await fetch("http://localhost:2025/api/donation-requests");
    const data = await res.json();

    container.innerHTML = "";

    if (data.length === 0) {
      container.innerHTML = "<p>No pending donations.</p>";
      return;
    }

    data.forEach(req => {
      const card = document.createElement("div");
      card.classList.add("request-card");

      card.innerHTML = `
        <h3>Donor: ${req.donor_name}</h3>
        <p><strong>Item:</strong> ${req.item}</p>
        <p><strong>Quantity:</strong> ${req.quantity}</p>
        <p><strong>Message:</strong> ${req.message || ""}</p>

        <label>Status:</label>
        <select id="status-${req.id}">
          <option value="">Select</option>
          <option value="accepted">Accept</option>
          <option value="rejected">Reject</option>
        </select>

        <label>Reason (optional):</label>
        <select id="reason-${req.id}">
          <option value="">None</option>
          <option value="not needed">Not Needed</option>
          <option value="quality">Quality Issue</option>
          <option value="duplicate">Duplicate</option>
        </select>

        <label>Message to Donor:</label>
        <textarea id="msg-${req.id}" rows="3"></textarea>

        <button onclick="submitDonationResponse(${req.id})">Submit</button>
      `;

      container.appendChild(card);
    });

  } catch (err) {
    console.error(err);
    container.innerHTML = "<p>Failed to load donation requests.</p>";
  }
}

// submit donation approval / rejection
async function submitDonationResponse(id) {
  const status = document.getElementById(`status-${id}`).value;
  const reason = document.getElementById(`reason-${id}`).value;
  const customMessage = document.getElementById(`msg-${id}`).value;

  if (!status) {
    alert("Please select accept or reject.");
    return;
  }

  const res = await fetch("http://localhost:2025/api/respond", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      donationId: id,
      status,
      reason,
      customMessage
    })
  });

  const data = await res.json();
  alert(data.message);
  loadDonationRequests();
}