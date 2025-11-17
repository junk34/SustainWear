const options = {
  outerwear: ["Jacket", "Coat", "Raincoat", "Puffer", "Vest", "Other"],
  tops: ["Hoodie", "Sweater", "T-Shirt", "Blouse", "Tank Top", "Other"],
  bottoms: ["Jeans", "Trousers", "Shorts", "Skirt", "Leggings", "Other"],
  shoes: ["Sneakers", "Boots", "Heels", "Flats", "Sandals", "Other"],
  accessories: ["Jewelry", "Hat", "Scarf", "Belt", "Bag", "Other"]
};

document.getElementById("category").addEventListener("change", function () {
  const cat = this.value;
  const subcat = document.getElementById("subcategory");

  subcat.innerHTML = "<option value=''>Select Type</option>";

  if (!cat || !options[cat]) return;

  options[cat].forEach(item => {
    let opt = document.createElement("option");
    opt.value = item.toLowerCase();
    opt.textContent = item;
    subcat.appendChild(opt);
  });
});

const imageInput = document.getElementById("itemImage");
if (imageInput) {
  imageInput.addEventListener("change", function () {
    const img = document.getElementById("preview");
    if (!img) return;

    img.src = URL.createObjectURL(this.files[0]);
    img.style.display = "block";
  });
}

document.getElementById("description").addEventListener("input", function () {
  document.getElementById("charCount").textContent = `${this.value.length}/120`;
});

document.getElementById("donationForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  // 🔥 FIXED — correct key name from login.js
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
    document.getElementById("donationForm").reset();
    document.getElementById("charCount").textContent = "0/120";
  }
});
