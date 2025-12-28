import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, set, onValue, update, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyAe2nyNcHwj2JPNXkQg45tRtXLgnuKP5v0",
    authDomain: "family-food-db.firebaseapp.com",
    databaseURL: "https://family-food-db-87ec4-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "family-food-db",
    storageBucket: "family-food-db.appspot.com",
    messagingSenderId: "367699933588",
    appId: "1:367699933588:web:75e305609322303c734493"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let cart = [];
let currentStock = {}; // We store the live stock numbers here

// --- 1. SHOP STATUS LISTENER ---
const statusRef = ref(db, 'shopStatus');
onValue(statusRef, (snapshot) => {
    const isOpen = snapshot.val(); 
    const banner = document.getElementById("closed-banner");
    const checkout = document.getElementById("checkout-section");

    if (isOpen === false) {
        // CLOSE SHOP
        banner.style.display = "block";
        checkout.style.display = "none";
        disableAllButtons("⛔ CLOSED");
    } else {
        // OPEN SHOP (But we still need to check stock!)
        banner.style.display = "none";
        // We don't enable buttons here, the Stock Listener below handles that
    }
});

function disableAllButtons(msg) {
    document.querySelectorAll(".add-btn").forEach(btn => {
        btn.disabled = true;
        btn.style.background = "#ccc";
        btn.innerText = msg;
    });
}

// --- 2. STOCK LISTENER (New!) ---
// This runs every time you change stock in Kitchen App
const stockRef = ref(db, 'stock');
onValue(stockRef, (snapshot) => {
    currentStock = snapshot.val() || {};
    
    updateButtonState('vanilla', currentStock.vanilla);
    updateButtonState('bubblegum', currentStock.bubblegum);
    updateButtonState('chocolate', currentStock.chocolate);
});

function updateButtonState(key, qty) {
    const btn = document.getElementById(`btn-${key}`);
    const label = document.getElementById(`stock-${key}`);
    
    // Safety check if shop is closed
    if (document.getElementById("closed-banner").style.display === "block") return;

    if (!qty || qty <= 0) {
        // SOLD OUT
        btn.disabled = true;
        btn.style.background = "#ccc";
        btn.innerText = "SOLD OUT ❌";
        label.innerText = "Out of Stock";
    } else {
        // IN STOCK
        btn.disabled = false;
        btn.style.background = "#007bff";
        btn.innerText = "ADD +";
        
        // Show "Low Stock" warning
        if (qty < 5) {
            label.innerText = `🔥 Only ${qty} left!`;
        } else {
            label.innerText = ""; // Clear text if plenty of stock
        }
    }
}

// --- 3. ADD TO CART ---
window.addToCart = function(dish, price, qtyId, stockKey) {
    let qtyInput = document.getElementById(qtyId);
    let quantity = parseInt(qtyInput.value);
    
    // Check if we have enough stock right now
    if (currentStock[stockKey] < quantity) {
        showToast(`⚠️ Not enough stock! Only ${currentStock[stockKey]} left.`);
        return;
    }

    if (isNaN(quantity) || quantity < 1) return;

    cart.push({ dish, price, quantity, total: price * quantity, stockKey: stockKey });
    renderCart();
    qtyInput.value = 1;
    showToast(`Added ${quantity} x ${dish}`);
}

function renderCart() {
    let list = document.getElementById("cart-items");
    let totalEl = document.getElementById("cart-total");
    let checkoutSection = document.getElementById("checkout-section");
    
    list.innerHTML = "";
    let grandTotal = 0;
    
    cart.forEach((item) => {
        grandTotal += item.total;
        list.innerHTML += `
            <div style="display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px solid #eee;">
                <span>${item.quantity}x ${item.dish}</span>
                <span>$${item.total.toFixed(2)}</span>
            </div>`;
    });
    
    totalEl.innerText = grandTotal.toFixed(2);
    
    if (cart.length > 0) {
        checkoutSection.style.display = "block";
    } else {
        checkoutSection.style.display = "none";
    }
}

// --- 4. CHECKOUT (Deduct Stock) ---
window.checkout = function() {
    if (cart.length === 0) return;

    let time = document.getElementById("pickup-time").value;
    let name = document.getElementById("cx-name").value.trim();

    if (name === "") {
        document.getElementById("cx-name").style.border = "2px solid red";
        showToast("⚠️ Please enter your Name!");
        return;
    }
    if (time === "") { 
        document.getElementById("pickup-time").style.border = "2px solid red";
        showToast("⚠️ Please pick a time!");
        return; 
    }

    // DEDUCT STOCK FROM DATABASE
    // We fetch the latest stock one last time to be sure
    get(stockRef).then((snapshot) => {
        let liveStock = snapshot.val() || {};
        let updates = {};
        let canProceed = true;

        // Calculate new stock levels
        cart.forEach(item => {
            let currentQty = liveStock[item.stockKey] || 0;
            if (currentQty < item.quantity) {
                showToast(`⚠️ Sorry! ${item.dish} just sold out.`);
                canProceed = false;
            }
            // Prepare the deduction
            updates['stock/' + item.stockKey] = currentQty - item.quantity;
        });

        if (!canProceed) return; // Stop if sold out

        // If all good, send order AND update stock
        let total = document.getElementById("cart-total").innerText;
        const newOrder = {
            customerName: name,  
            items: cart,
            totalPrice: total,
            pickupTime: time,
            status: "New Order",
            createdAt: new Date().toString()
        };

        const newOrderRef = push(ref(db, 'orders'));
        
        // This updates both Orders and Stock at the same time
        updates['orders/' + newOrderRef.key] = newOrder;

        update(ref(db), updates)
            .then(() => {
                cart = [];
                renderCart();
                document.getElementById("checkout-section").style.display = "none";
                document.getElementById("cx-name").value = "";
                document.getElementById("pickup-time").value = ""; 
                showToast("Order Sent! 🚀");
            })
            .catch((error) => {
                console.error(error);
                showToast("Error: " + error.message);
            });
    });
}

function showToast(message) {
    let toast = document.getElementById("toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toast";
        toast.style.cssText = "visibility:hidden; min-width: 250px; background-color: #333; color: #fff; text-align: center; border-radius: 50px; padding: 16px; position: fixed; z-index: 1000; left: 50%; bottom: 30px; transform: translateX(-50%); font-size: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); transition: visibility 0.3s, opacity 0.3s;";
        document.body.appendChild(toast);
    }
    toast.innerText = message;
    toast.style.visibility = "visible";
    toast.style.opacity = "1";
    setTimeout(function(){ 
        toast.style.visibility = "hidden"; 
        toast.style.opacity = "0";
    }, 3000);
}
