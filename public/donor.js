document.addEventListener("DOMContentLoaded", () => {
  const donationForm = document.getElementById("donationForm");
  const category = document.getElementById("category");
  const subcategory = document.getElementById("subcategory");
  const description = document.getElementById("description");
  const charCount = document.getElementById("charCount");

  const categoryMap = {
    tops: ["T-Shirt", "Blouse", "Hoodie", "Sweater"],
    bottoms: ["Jeans", "Shorts", "Skirt"],
    outerwear: ["Jacket", "Coat"],
    shoes: ["Sneakers", "Boots"],
    accessories: ["Bag", "Belt", "Hat"]
  };

  // --------------------- TOAST MESSAGE ---------------------
  function showToast(msg, type = "success") {
    const div = document.createElement("div");
    div.className = `toast ${type}`;
    div.innerText = msg;

    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
  }

  // --------------------- LOAD NOTIFICATIONS ---------------------
  async function loadNotifications() {
    const list = document.getElementById("notificationList");
    list.innerHTML = "Loading...";

    const res = await fetch("/api/notifications");
    const data = await res.json();

    if (!data.length) {
      list.innerHTML = "<li>No notifications yet.</li>";
      return;
    }

    list.innerHTML = "";
    data.forEach((n) => {
      const li = document.createElement("li");
      li.innerHTML = `<strong>${n.message}</strong><br><small>Donation ID: ${n.donationId}</small>`;
      list.appendChild(li);
    });
  }

  // --------------------- CHARACTER COUNTER ---------------------
  description.addEventListener("input", () => {
    charCount.textContent = `${description.value.length}/120`;
  });

  // --------------------- CATEGORY LOGIC ---------------------
  category.addEventListener("change", () => {
    subcategory.innerHTML = "";

    categoryMap[category.value]?.forEach((type) => {
      const opt = document.createElement("option");
      opt.textContent = type;
      opt.value = type;
      subcategory.appendChild(opt);
    });
  });

  // --------------------- SUBMIT DONATION ---------------------
  donationForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const donationData = {
      donorName: document.getElementById("donorName").value.trim(),
      category: category.value,
      type: subcategory.value,
      size: document.getElementById("size").value,
      condition: document.getElementById("condition").value,
      description: description.value
    };

    const res = await fetch("/api/donate-item", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(donationData)
    });

    const result = await res.json();
    showToast(result.message);

    donationForm.reset();
    charCount.textContent = "0/120";

    loadNotifications();
  });

  // INITIAL LOAD
  loadNotifications();
});