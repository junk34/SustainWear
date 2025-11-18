const categorySelect = document.getElementById("category");
const subcategorySelect = document.getElementById("subcategory");

const subcategories = {
  tops: ["t-shirt", "shirt", "blouse", "crop top", "tank top"],
  outerwear: ["jacket", "coat", "hoodie", "blazer"],
  bottoms: ["jeans", "shorts", "trousers", "skirt", "joggers"],
  shoes: ["sneakers", "boots", "heels", "sandals"],
  accessories: ["hat", "belt", "bag", "scarf", "gloves"]
};

categorySelect.addEventListener("change", () => {
  const selected = categorySelect.value;

  subcategorySelect.innerHTML = "<option value=''>Select Type</option>";

  if (!selected || !subcategories[selected]) return;

  subcategories[selected].forEach(item => {
    const option = document.createElement("option");
    option.value = item;
    option.textContent = item;
    subcategorySelect.appendChild(option);
  });
});


document.addEventListener("DOMContentLoaded", loadDonationHistory);

function loadDonationHistory() {
  const donorName = localStorage.getItem("loggedInName");

  console.log("DONOR FOUND:", donorName);

  const list = document.getElementById("donationHistory");
  if (!list) return;

  if (!donorName) {
    list.innerHTML = "<li>Error: No donor name found. Log in again.</li>";
    return;
  }

  list.innerHTML = "<li>Loading your donation history...</li>";

  fetch(`http://localhost:2000/donor/history?donor=${encodeURIComponent(donorName)}`)
    .then(res => res.json())
    .then(data => {
      console.log("HISTORY RESULT:", data);

      if (!data || data.length === 0) {
        list.innerHTML = "<li>You have not made any donations yet.</li>";
        return;
      }

      list.innerHTML = ""; 

      data.forEach(item => {
        const li = document.createElement("li");
        li.classList.add("history-item");
        li.innerHTML = `
          <strong>${item.category} → ${item.subcategory}</strong><br>
          Size: ${item.size}<br>
          Condition: ${item.condition}<br>
          Notes: ${item.description || "None"}<br>
          <span class="status">Status: ${item.status}</span>
        `;
        list.appendChild(li);
      });
    })
    .catch(err => {
      console.error("HISTORY ERROR:", err);
      list.innerHTML = "<li>Unable to load history.</li>";
    });
}



// ===================================
// DONATION FORM SUBMISSION
// ===================================

document.getElementById("donationForm").addEventListener("submit", async function(e) {
  e.preventDefault();

  const donor_name = localStorage.getItem("loggedInName");
  if (!donor_name) {
    alert("Error: No donor name found. Please log in again.");
    return;
  }

  const category = document.getElementById("category").value;
  const subcategory = document.getElementById("subcategory").value;
  const size = document.getElementById("size").value;
  const condition = document.getElementById("condition").value;
  const description = document.getElementById("description").value;

  const response = await fetch("http://localhost:2000/donate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      donor_name,
      category,
      subcategory,
      size,
      condition,
      description
    })
  });

  const result = await response.json();
  document.getElementById("donationMessage").innerText = result.message;

  if (result.message === "Donation submitted!") {
    this.reset();
    document.getElementById("charCount").textContent = "0/200";

    loadDonationHistory();
  }
});
