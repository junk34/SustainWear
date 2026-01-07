const {request} = require("express");

const SIM_KEY = "sustainwear_sim_state";
let simState = { handover: {}, tracking: {}, completed: {}, confirmed: {} };
function loadSim() {
  try {
    const raw = localStorage.getItem(SIM_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    simState.handover = parsed.handover || {};
    simState.tracking = parsed.tracking || {};
    simState.completed = parsed.completed || {};
    simState.confirmed = parsed.confirmed || {};
  } catch {}
}
function saveSim() {
  localStorage.setItem(SIM_KEY, JSON.stringify(simState));
}
function safeText(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function showSection(name) {
  const pending = document.getElementById("pending-section");
  const approved = document.getElementById("approved-section");
  const inventory = document.getElementById("inventory-section");
  if (pending) pending.style.display = name === "pending" ? "block" : "none";
  if (approved) approved.style.display = name === "approved" ? "block" : "none";
  if (inventory) inventory.style.display = name === "inventory" ? "block" : "none";
  const items = document.querySelectorAll(".sidebar li");
  items.forEach(li => li.classList.remove("active"));
  const idx = name === "pending" ? 0 : name === "approved" ? 1 : 2;
  if (items[idx]) items[idx].classList.add("active");
}
// --- API ---
async function fetchAllDonations() {
  const res = await fetch("/api/staff/all-donations");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}



//approved 
async function loadApprovedDonations() {
  const container = document.getElementById("approved-container");
  if (!container) return;

  container.innerHTML = "<p>Loading approved donations...</p>";

  try {
    const all = await fetchAllDonations();
    loadSim(); // refresh localStorage state

    const list = all.filter(d => {
      const id = String(request.id);
      return (
        String(d.status).toLowerCase() === "approved" &&
        !!simState.confirmed?.[id] &&
        !!simState.handover?.[id] &&
        !simState.completed?.[id]
      );
    });

    container.innerHTML = "";

    if (!list.length) {
      container.innerHTML = "<p>No approved donations with confirmed handover yet.</p>";
      return;
    }

    list.forEach(d => {
      const id = String(d.id);
      const handover = simState.handover[id] || {};
      const tracking = simState.tracking?.[id] || { status: "Waiting" };

      const card = document.createElement("div");
      card.className = "request-card";
      card.innerHTML = `
        <h3>Donor: ${safeText(d.donor_name)}</h3>
        <p><strong>Item:</strong> ${safeText(d.category)} → ${safeText(d.subcategory)}</p>
        <p><strong>Handover:</strong> ${safeText(handover.method || "Not set")}</p>
        ${handover.method === "dropoff" && handover.code ? `<p><strong>QR:</strong> ${safeText(handover.code)}</p>` : ""}
        ${handover.method === "collection" && handover.date ? `<p><strong>Date:</strong> ${safeText(handover.date)}</p>` : ""}
        <p><strong>Current status:</strong> ${safeText(tracking.status || "Waiting")}</p>

        <label>Update tracking status:</label>
        <select class="tracking-select">
          <option value="Waiting">Waiting</option>
          <option value="In Transit">In Transit</option>
          <option value="Processing">Processing</option>
          <option value="Delivered">Delivered</option>
        </select>

        <button class="submit-btn update-btn" data-id="${id}" style="margin-top:12px;">
          Save status
        </button>
      `;

      card.querySelector(".tracking-select").value = tracking.status || "Waiting";

      card.querySelector(".update-btn").addEventListener("click", () => {
        const newStatus = card.querySelector(".tracking-select").value;

        if (!simState.tracking) simState.tracking = {};
        if (!simState.completed) simState.completed = {};

        simState.tracking[id] = { ...(simState.tracking[id] || {}), status: newStatus };
        
        if (newStatus === "Delivered") simState.completed[id] = true;

        saveSim();

        loadApprovedDonations();
        loadInventory();
      });

      container.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    container.innerHTML = "<p>Error loading approved donations.</p>";
  }
}

// pending
async function loadPendingDonations() {
  const container = document.getElementById("requests-container");
  if (!container) return;

  container.innerHTML = "<p>Loading pending donation requests...</p>";

  try {
    const res = await fetch("/api/donation-requests");
    const requests = await res.json();

    container.innerHTML = "";

    if (!requests || requests.length === 0) {
      container.innerHTML = "<p>No pending donation requests.</p>";
      return;
    }

    requests.forEach(r => {
      const card = document.createElement("div");
      card.className = "request-card";

      card.innerHTML = `
        <h3>Donor: ${safeText(r.donor_name)}</h3>
        <p><strong>Item:</strong> ${safeText(r.category)} → ${safeText(r.subcategory)}</p>
        <p><strong>Size:</strong> ${safeText(r.size)} | <strong>Condition:</strong> ${safeText(r.condition)}</p>
        <p><strong>Notes:</strong> ${safeText(r.description || "None")}</p>

        <div style="margin-top:12px;">
          <button class="submit-btn approve-btn" data-id="${r.id}">Approve</button>
          <button class="submit-btn reject-btn" data-id="${r.id}" style="margin-left:10px;">Reject</button>
        </div>
      `;

      container.appendChild(card);
    });

    container.querySelectorAll(".approve-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        await fetch("/api/approve-donation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: btn.dataset.id })
        });
        loadPendingDonations();
      });
    });

    container.querySelectorAll(".reject-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        await fetch("/api/reject-donation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: btn.dataset.id })
        });
        loadPendingDonations();
      });
    });
  } catch (err) {
    console.error(err);
    container.innerHTML = "<p>Error loading donation requests.</p>";
  }
}
//inventory
async function loadInventory() {
  const container = document.getElementById("inventory-container");
  if (!container) return;

  container.innerHTML = "<p>Loading inventory...</p>";

  try {
    const all = await fetchAllDonations();
    loadSim();

    const list = all.filter(d => !!simState.completed?.[String(d.id)]);

    container.innerHTML = "";

    if (!list.length) {
      container.innerHTML = "<p>No completed donations yet.</p>";
      return;
    }

    list.forEach(d => {
      const id = String(d.id);
      const tracking = simState.tracking?.[id] || { status: "Delivered" };

      const card = document.createElement("div");
      card.className = "request-card";
      card.innerHTML = `
        <h3>Delivered</h3>
        <p><strong>Donor:</strong> ${safeText(d.donor_name)}</p>
        <p><strong>Item:</strong> ${safeText(d.category)} → ${safeText(d.subcategory)}</p>
        <p><strong>Status:</strong> ${safeText(tracking.status)}</p>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    container.innerHTML = "<p>Error loading inventory.</p>";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadSim();

  const items = document.querySelectorAll(".sidebar li");
  items.forEach((li, idx) => {
    li.addEventListener("click", () => {
      if (idx === 0) { showSection("pending"); loadPendingDonations(); }
      if (idx === 1) { showSection("approved"); loadApprovedDonations(); }
      if (idx === 2) { showSection("inventory"); loadInventory(); }
    });
  });

  showSection("pending");
  loadPendingDonations();
});
