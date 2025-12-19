const categorySelect = document.getElementById("category");
const subcategorySelect = document.getElementById("subcategory");

const itemImageInput = document.getElementById("itemImage");
const previewImg = document.getElementById("preview");

const donationForm = document.getElementById("donationForm");
const donationMessage = document.getElementById("donationMessage");

const donationHistoryList = document.getElementById("donationHistory");
const manageWrap = document.getElementById("manageDonations");
const inventoryWrap = document.getElementById("inventoryList");
const distributionWrap = document.getElementById("distributionList");

const sidebarItems = document.querySelectorAll(".sidebar li");

const donorTop = document.querySelector(".donor-top");
const historySection = document.querySelector(".history-section");
const manageSection = document.querySelector(".manage-section");
const inventorySection = document.querySelector(".inventory-section");
const distributionSection = document.querySelector(".distribution-section");

const SIM_KEY = "sustainwear_sim_state";

const simState = {
  handover: {},
  tracking: {},
  completed: {},
  confirmed: {}
};

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

function donorName() {
  return (localStorage.getItem("loggedInName") || "").trim();
}

function statusClass(s) {
  return (s || "").toLowerCase();
}

function safeText(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function makeQR() {
  return `QR-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function normalizeId(row) {
  return String(row.id ?? row.donation_id ?? row.donationId ?? "");
}

async function fetchHistory() {
  const name = donorName();
  if (!name) return [];
  const res = await fetch(`/donor/history?donor=${encodeURIComponent(name)}`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

if (itemImageInput && previewImg) {
  itemImageInput.addEventListener("change", function () {
    const file = this.files[0];
    if (!file) {
      previewImg.style.display = "none";
      previewImg.src = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      previewImg.src = e.target.result;
      previewImg.style.display = "block";
    };
    reader.readAsDataURL(file);
  });
}

const subcategories = {
  tops: ["t-shirt", "shirt", "blouse", "tank top"],
  outerwear: ["jacket", "coat", "hoodie"],
  bottoms: ["jeans", "trousers", "skirt"],
  shoes: ["sneakers", "boots", "sandals"],
  accessories: ["hat", "belt", "bag"]
};

if (categorySelect && subcategorySelect) {
  categorySelect.addEventListener("change", () => {
    const selected = categorySelect.value;
    subcategorySelect.innerHTML = "<option value=''>Select type</option>";

    if (!subcategories[selected]) return;
    subcategories[selected].forEach(item => {
      const opt = document.createElement("option");
      opt.value = item;
      opt.textContent = item;
      subcategorySelect.appendChild(opt);
    });
  });
}

const sectionGroups = {
  dashboard: [donorTop, historySection],
  manage: [manageSection],
  inventory: [inventorySection],
  distribution: [distributionSection]
};

function showGroup(key) {
  Object.values(sectionGroups).flat().forEach(sec => {
    if (sec) sec.style.display = "none";
  });

  (sectionGroups[key] || []).forEach(sec => {
    if (sec) sec.style.display = "block";
  });

  sidebarItems.forEach(li => li.classList.remove("active"));
  const idx = key === "dashboard" ? 0 : key === "manage" ? 1 : key === "inventory" ? 2 : 3;
  if (sidebarItems[idx]) sidebarItems[idx].classList.add("active");

  if (key === "dashboard") loadDonationHistory();
  if (key === "manage") loadManageDonations();
  if (key === "inventory") loadInventory();
  if (key === "distribution") loadDistribution();
}

async function loadDonationHistory() {
  if (!donationHistoryList) return;

  if (!donorName()) {
    donationHistoryList.innerHTML = "<li>Please log in again.</li>";
    return;
  }

  donationHistoryList.innerHTML = "<li>Loading your donation history...</li>";

  const rows = await fetchHistory();

  if (!rows.length) {
    donationHistoryList.innerHTML = "<li>No donations yet.</li>";
    return;
  }

  donationHistoryList.innerHTML = "";

  rows.forEach(d => {
    const id = normalizeId(d);
    const completed = !!simState.completed[id];

    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${safeText(d.category)} → ${safeText(d.subcategory)}</strong><br>
      Size: ${safeText(d.size)}<br>
      Condition: ${safeText(d.condition)}<br>
      <span class="status ${statusClass(d.status)}">${safeText(d.status)}</span>
      ${completed ? `<div class="subtitle"><b>Archived</b></div>` : ""}
    `;
    donationHistoryList.appendChild(li);
  });
}

if (donationForm) {
  donationForm.addEventListener("submit", async e => {
    e.preventDefault();

    if (!donorName()) {
      donationMessage.textContent = "Please log in again.";
      return;
    }

    const sizeEl = document.getElementById("size");
    const conditionEl = document.getElementById("condition");
    const descriptionEl = document.getElementById("description");

    const payload = {
      donor_name: donorName(),
      category: categorySelect.value,
      subcategory: subcategorySelect.value,
      size: sizeEl.value,
      condition: conditionEl.value,
      description: descriptionEl.value
    };

    if (!payload.category || !payload.subcategory || !payload.size || !payload.condition) {
      donationMessage.textContent = "Please complete all required fields.";
      return;
    }

    donationMessage.textContent = "Submitting...";

    try {
      const res = await fetch("/donate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await res.json().catch(() => ({ message: "Donation submitted." }));
      donationMessage.textContent = result.message || "Donation submitted.";

      if ((result.message || "").toLowerCase().includes("submitted")) {
        donationForm.reset();
        if (previewImg) previewImg.style.display = "none";
        showGroup("dashboard");
        await loadDonationHistory();
        await loadManageDonations();
        await loadInventory();
      }
    } catch {
      donationMessage.textContent = "Submit failed. Please try again.";
    }
  });
}

async function loadManageDonations() {
  if (!manageWrap) return;

  manageWrap.innerHTML = "<p>Loading approved donations...</p>";

  const rows = await fetchHistory();
  const approved = rows.filter
  (d => { const id = normalizeId(d);
  return (
String(d.status).toLowerCase() === "approved" && 
  !simState.confirmed[normalizeId(d)]);
  });
  if (!approved.length) {
    manageWrap.innerHTML = "<p>No approved donations yet.</p>";
    return;
  }

  manageWrap.innerHTML = "";

  approved.forEach(d => {
    const id = normalizeId(d);
    const current = simState.handover[id];

    const card = document.createElement("div");
    card.className = "donation-card";

    card.innerHTML = `
      <h3>${safeText(d.category)} → ${safeText(d.subcategory)}</h3>
      <p><strong>Size:</strong> ${safeText(d.size)} | <strong>Condition:</strong> ${safeText(d.condition)}</p>

      <label>Handover option</label>
      <select class="handover">
        <option value="">Choose option</option>
        <option value="dropoff">Drop off (QR code)</option>
        <option value="collection">Collection</option>
      </select>

      <div class="handover-extra"></div>

      <div class="row" style="margin-top:10px;">
        <button class="submit-btn confirm-handover" type="button">Confirm choice</button>
      </div>
    `;

    const select = card.querySelector(".handover");
    const extra = card.querySelector(".handover-extra");
    const completeBtn = card.querySelector(".confirm-handover");

    if (current?.method) select.value = current.method;
    renderHandoverExtra(id, extra, current);

    select.addEventListener("change", () => {
      const val = select.value;

      if (!val) {
        delete simState.handover[id];
        saveSim();
        renderHandoverExtra(id, extra, null);
        return;
      }

      if (val === "dropoff") {
        simState.handover[id] = { method: "dropoff", code: makeQR(), date: "", notes: "" };
        simState.tracking[id] = simState.tracking[id] || { status: "Waiting" };
      }

      if (val === "collection") {
        simState.handover[id] = { method: "collection", code: "", date: "", notes: "" };
        simState.tracking[id] = simState.tracking[id] || { status: "Waiting" };
      }

      saveSim();
      renderHandoverExtra(id, extra, simState.handover[id]);
    });

    completeBtn.addEventListener("click", () => {
if (!simState.handover[id]){
  alert ("Please select an option first before continuing");
  return;
}
      simState.tracking[id] = { status: "Waiting" };
      saveSim();
      loadManageDonations();
      loadDistribution();
      loadDonationHistory();
    });

    manageWrap.appendChild(card);
  });
}

function renderHandoverExtra(id, extraEl, handover) {
  if (!extraEl) return;

  if (!handover) {
    extraEl.innerHTML = `<p class="subtitle">No handover selected yet.</p>`;
    return;
  }

  if (handover.method === "dropoff") {
    extraEl.innerHTML = `
      <p><strong>QR Code:</strong></p>
      <div style="padding:12px;background:#eee;border-radius:6px;text-align:center;">
        ${safeText(handover.code)}
      </div>
      <p class="subtitle">Show this at the drop-off point (demo).</p>
    `;
    return;
  }

  if (handover.method === "collection") {
    extraEl.innerHTML = `
      <label>Collection date</label>
      <input type="date" class="collect-date" value="${safeText(handover.date || "")}">

      <label>Notes</label>
      <textarea class="collect-notes" placeholder="Leave at front door, neighbour, etc.">${safeText(handover.notes || "")}</textarea>

      <p class="subtitle">Collection details are simulated.</p>
    `;

    const dateEl = extraEl.querySelector(".collect-date");
    const notesEl = extraEl.querySelector(".collect-notes");

    dateEl.addEventListener("change", () => {
      simState.handover[id].date = dateEl.value;
      saveSim();
    });

    notesEl.addEventListener("input", () => {
      simState.handover[id].notes = notesEl.value;
      saveSim();
    });
  }
}

async function loadDistribution() {
  if (!distributionWrap) return;

  const rows = await fetchHistory();
  const active = rows.filter(d => {
    const id = normalizeId(d);
    return !simState.confirmed[id] && !!simState.handover[id];
  });

  if (!active.length) {
    distributionWrap.innerHTML = `<p>No items currently in distribution.</p>`;
    return;
  }

  distributionWrap.innerHTML = "";

  active.forEach(d => {
    const id = normalizeId(d);
    const track = simState.tracking[id] || { status: "Waiting" };
    simState.tracking[id] = track;
    saveSim();

    const box = document.createElement("div");
    box.className = "donation-card";
    box.innerHTML = `
      <h3>${safeText(d.category)} → ${safeText(d.subcategory)}</h3>
      <p class="subtitle">Current status: <strong>${safeText(track.status || "waiting")}</strong></p>

      <div 
      </div>
    `;

    box.querySelectorAll(".step").forEach(btn => {
      btn.addEventListener("click", () => {
        simState.tracking[id] = { status: btn.dataset.step };
        if (btn.dataset.step === "Delivered") {
          simState.completed[id] = true;
        }
        saveSim();
        loadDistribution();
        loadInventory();
        loadDonationHistory();
        loadManageDonations();
      });
    });

    distributionWrap.appendChild(box);
  });
}

async function loadInventory() {
  if (!inventoryWrap) return;

  const rows = await fetchHistory();
  const completedRows = rows.filter(d => simState.completed[normalizeId(d)]);

  if (!completedRows.length) {
    inventoryWrap.innerHTML = "<p>No completed donations yet.</p>";
    return;
  }

  inventoryWrap.innerHTML = "";

  completedRows.forEach(d => {
    const id = normalizeId(d);
    const handover = simState.handover[id];
    const tracking = simState.tracking[id];

    const box = document.createElement("div");
    box.className = "donation-box";
    box.innerHTML = `
      <strong>${safeText(d.category)} → ${safeText(d.subcategory)}</strong><br>
      <span class="subtitle">Archived / Completed (demo)</span><br>
      <span class="subtitle">Handover: ${handover ? safeText(handover.method) : "—"}</span><br>
      <span class="subtitle">Final status: ${tracking ? safeText(tracking.status) : "—"}</span>
    `;
    inventoryWrap.appendChild(box);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadSim();

  if (!donorName()) {
    if (donationHistoryList) donationHistoryList.innerHTML = "<li>Please log in again.</li>";
    if (manageWrap) manageWrap.innerHTML = "<p>Please log in again.</p>";
    if (inventoryWrap) inventoryWrap.innerHTML = "<p>Please log in again.</p>";
    if (distributionWrap) distributionWrap.innerHTML = "<p>Please log in again.</p>";
    return;
  }

  sidebarItems.forEach((item, index) => {
    item.addEventListener("click", () => {
      const key =
        index === 0 ? "dashboard" :
        index === 1 ? "manage" :
        index === 2 ? "inventory" :
        "distribution";
      showGroup(key);
    });
  });

  showGroup("dashboard");
  loadManageDonations();
  loadDistribution();
  loadInventory();
});
