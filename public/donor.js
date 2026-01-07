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
loadSim()

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
   updateImpactBanner();
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
loadSim();
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
     if (!id) return;
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
        simState.handover[id] = { 
          donor: donorName(),
          method: "dropoff", 
          code: makeQR(), 
          date: "", 
          notes: "" };
        simState.tracking[id] = simState.tracking[id] || { status: "Waiting" };
      }

      if (val === "collection") {
        simState.handover[id] = { donor: donorName(), method: "collection", code: "", date: "", notes: "" };
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
      simState.confirmed[id] = true;
      simState.tracking[id] = { status: "Waiting" };
      saveSim();

      alert("Handover confirmed");
      loadManageDonations();
      loadDistribution();
      loadDonationHistory();
       updateImpactBanner();
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
    return (simState.confirmed[id] && 
    !!simState.handover[id] && 
    !simState.completed[id]
  );
});

  if (!active.length) {
    distributionWrap.innerHTML = `<p>No items currently in distribution.</p>`;
    return;
  }

  distributionWrap.innerHTML = "";

  active.forEach(d => {
    const id = normalizeId(d);
     if (!id) return;
    const track = simState.tracking[id] || { status: "Waiting" };
    simState.tracking[id] = track;
    saveSim();

    const box = document.createElement("div");
    box.className = "donation-card";
    box.innerHTML = `
      <h3>${safeText(d.category)} → ${safeText(d.subcategory)}</h3>
      <p class="subtitle">HANDOVER <strong>${safeText(simState.handover[id]?.method)}</strong></p>
    <p class="subtitle">
    Status: <strong>${safeText(track.status)}</strong>
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
         updateImpactBanner();
      });
    });

    distributionWrap.appendChild(box);
    
  });
}

async function loadInventory() {
  if (!inventoryWrap) return;
loadSim();
  const rows = await fetchHistory();
  const completedRows = rows.filter(d => simState.completed[normalizeId(d)]);

  if (!completedRows.length) {
    inventoryWrap.innerHTML = "<p>No completed donations yet.</p>";
    return;
  }

  inventoryWrap.innerHTML = "";
  let totalCO2 = 0;

  completedRows.forEach(d => {
    const id = normalizeId(d);
    const handover = simState.handover[id];
    const tracking = simState.tracking[id];
    const co2Savings = Number(calcCO2SavedKg(d.category, d.subcategory) || 0);

    totalCO2 += co2Savings;
    const box = document.createElement("div");
    box.className = "donation-box";
    box.innerHTML = `
      <strong>${safeText(d.category)} → ${safeText(d.subcategory)}</strong><br>
      <span class="subtitle">Archived / Completed (demo)</span><br>
      <span class="subtitle">CO₂ saved: <b>${co2Savings.toFixed(1)} kg</b></span><br>
      <span class="subtitle">Handover: ${handover ? safeText(handover.method) : "—"}</span><br>
      <span class="subtitle">Final status: ${tracking ? safeText(tracking.status) : "—"}</span>
    `;
    inventoryWrap.appendChild(box);
  });
   updateImpactBanner();
}


function getItemWeightGrams(category, subcategory) {
  const weightMap = {
    tops: { "t-shirt": 150, shirt: 200, blouse: 120, "tank top": 80, default: 150 },
    outerwear: { jacket: 450, coat: 500, hoodie: 350, default: 400 },
    bottoms: { jeans: 500, trousers: 300, skirt: 180, shorts: 200, default: 300 },
    shoes: { sneakers: 800, boots: 1200, sandals: 500, flats: 600, default: 800 }, // pair weights
    accessories: { hat: 80, belt: 120, bag: 300, scarf: 100, gloves: 60, default: 150 }
  };

  const cat = weightMap[String(category || "").toLowerCase()];
  if (!cat) return 200;
  return cat[String(subcategory || "").toLowerCase()] || cat.default || 200;
}

function calcCO2SavedKg(category, subcategory) {
  console.log(`calcCO2SavedKg called with:`, { category, subcategory });
  
  // Clothing weights in GRAMS - REALISTIC VALUES
  const weightMap = {
    'tops': {
      't-shirt': 150,      // 0.15kg
      'shirt': 200,        // 0.2kg
      'blouse': 120,       // 0.12kg
      'tank top': 80,      // 0.08kg
      'default': 150
    },
    'outerwear': {
      'jacket': 450,       // 0.45kg
      'coat': 500,         // 0.5kg
      'hoodie': 350,       // 0.35kg
      'default': 400
    },
    'bottoms': {
      'jeans': 500,        // 0.5kg
      'trousers': 300,     // 0.3kg
      'skirt': 180,        // 0.18kg
      'default': 300
    },
    'shoes': {
      'sneakers': 800,     // 0.8kg pair
      'boots': 1200,       // 1.2kg pair
      'sandals': 500,      // 0.5kg pair
      'default': 800
    },
    'accessories': {
      'hat': 80,           // 0.08kg
      'belt': 120,         // 0.12kg
      'bag': 300,          // 0.3kg
      'default': 150
    }
  };
  
  const CO2_PER_KG_TEXTILE = 12;
  const categoryData = weightMap[category];
  
  console.log(`Category data for ${category}:`, categoryData);
  
  if (!categoryData) {
    console.log(`Category ${category} not found, using default`);
    return parseFloat((0.2 * CO2_PER_KG_TEXTILE).toFixed(1));
  }
  
  const weightGrams = categoryData[subcategory] || categoryData.default || 200;
  const weightKg = weightGrams / 1000;
  const co2Savings = weightKg * CO2_PER_KG_TEXTILE;
  const result = parseFloat(co2Savings.toFixed(1));
  
  console.log(`Calculation: ${weightGrams}g = ${weightKg}kg × ${CO2_PER_KG_TEXTILE} = ${result} kg CO₂`);
  
  return result;
}

async function updateImpactBanner() {
  console.log("=== updateImpactBanner() START ===");
  
  // Get ALL the elements from your HTML
  const co2El = document.getElementById("impactCO2");
  const treesEl = document.getElementById("impactTrees");
  const percentEl = document.getElementById("impactPercent");
  const progressTextEl = document.getElementById("impactProgressText");
  const barFillEl = document.getElementById("impactBarFill");
  const ringEl = document.getElementById("impactRing");
  
  console.log("Elements found:", { 
    co2El: !!co2El, 
    treesEl: !!treesEl,
    percentEl: !!percentEl,
    progressTextEl: !!progressTextEl,
    barFillEl: !!barFillEl,
    ringEl: !!ringEl
  });

  // Get donation history
  console.log("Fetching donation history...");
  const rows = await fetchHistory();
  console.log("Total donations from server:", rows.length);
  
  let totalCO2 = 0;
  let deliveredCount = 0;

  // Calculate totals
  rows.forEach(d => {
    const id = normalizeId(d);
    // Check if donation is completed
    if (simState.completed && simState.completed[id]) {
      deliveredCount++;
      const co2 = calcCO2SavedKg(d.category, d.subcategory);
      console.log(`Completed donation ${id}:`, {
        category: d.category,
        subcategory: d.subcategory,
        co2: co2
      });
      totalCO2 += co2;
    }
  });

  console.log("Calculated totals:", {
    deliveredCount,
    totalCO2,
    simStateCompletedKeys: Object.keys(simState.completed || {})
  });

  // Calculate tree equivalent and progress
  const treeEquiv = (totalCO2 / 21.77).toFixed(1);
  const goal = 50; // 50kg goal from your HTML
  const percent = Math.min((totalCO2 / goal) * 100, 100);
  
  console.log("Updating UI with:", {
    totalCO2: totalCO2.toFixed(1),
    treeEquiv,
    percent: percent.toFixed(1) + "%"
  });
  
  // Update ALL the elements - FIXED: No .totalCO2 property access!
  if (co2El) co2El.textContent = totalCO2.toFixed(1); // FIXED LINE
  if (treesEl) treesEl.textContent = treeEquiv;
  if (percentEl) percentEl.textContent = `${percent.toFixed(0)}%`;
  if (progressTextEl) progressTextEl.textContent = `${totalCO2.toFixed(1)} / ${goal}`; // FIXED LINE
  
  // Update progress bar
  if (barFillEl) barFillEl.style.width = `${percent}%`;
  
  // Update the circular ring (using CSS custom property)
  if (ringEl) ringEl.style.setProperty("--p", percent.toFixed(0));
  
  console.log("=== updateImpactBanner() END ===");
  console.log("Impact banner updated:", { 
    totalCO2: totalCO2.toFixed(1), 
    deliveredCount,
    treeEquiv,
    percent: percent.toFixed(1) + "%"
  });
}


function debugSimStateCompleted() {
  console.log("=== DEBUG simState.completed ===");
  console.log("simState.completed:", simState.completed);
  console.log("Keys in simState.completed:", Object.keys(simState.completed || {}));
  console.log("Values:", Object.entries(simState.completed || {}));
  
  // Check localStorage directly
  const raw = localStorage.getItem(SIM_KEY);
  console.log("Raw localStorage:", raw);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      console.log("Parsed completed from localStorage:", parsed.completed);
    } catch (e) {
      console.error("Error parsing localStorage:", e);
    }
  }
  console.log("=== END DEBUG ===");
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
  updateImpactBanner();
   window.addEventListener("storage", (e) => {
    if (e.key !== SIM_KEY) return;

    loadSim(); // re-read localStorage that staff just updated

    updateImpactBanner();

    loadDonationHistory();
    loadManageDonations();
    loadDistribution();
    loadInventory();
   });
});
