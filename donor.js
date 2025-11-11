const options = {
  outerwear: ["Jacket", "Coat", "Raincoat", "Puffer", "Vest", "Other"],
  tops: ["Hoodie", "Sweater", "T-Shirt", "Blouse", "Tank Top", "Other"],
  bottoms: ["Jeans", "Trousers", "Shorts", "Skirt", "Leggings", "Other"],
  shoes: ["Sneakers", "Boots", "Heels", "Flats", "Sandals", "Other"],
  accessories: ["Jewelry", "Hat", "Scarf", "Belt", "Bag", "Other"]
};

document.getElementById("category").addEventListener("change", function() {
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

document.getElementById("donationImage").addEventListener("change", function() {
  const img = document.getElementById("preview");
  img.src = URL.createObjectURL(this.files[0]);
  img.style.display = "block";
});

document.getElementById("description").addEventListener("input", function() {
  document.getElementById("charCount").textContent = `${this.value.length}/200`;
});

document.getElementById("donationForm").addEventListener("submit", function(e) {
  e.preventDefault();
  document.getElementById("donationMsg").innerText = "✅ Donation Submitted (Database logic coming next)";
});
