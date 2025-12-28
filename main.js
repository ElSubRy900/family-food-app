import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, set, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

// --- SHOP STATUS LISTENER (NEW) ---
const statusRef = ref(db, 'shopStatus');
onValue(statusRef, (snapshot) => {
    const isOpen = snapshot.val(); 
    const banner = document.getElementById("closed-banner");
    const buttons = document.querySelectorAll(".add-btn"); // All "ADD +" buttons

    if (isOpen === true) {
        // SHOP IS OPEN
        banner.style.display = "none";
        buttons.forEach(btn => {
            btn.disabled = false;
            btn.style.background = "#007bff"; // Blue
            btn.innerText = "ADD +";
        });
    } else {
        // SHOP IS CLOSED
        banner.style.display = "block";
        buttons.forEach(btn => {
            btn.disabled = true; // Cannot click
            btn.style.background = "#ccc"; // Grey
            btn.innerText = "CLOSED";
        });
        
        // Also hide checkout if open
        document.getElementById("checkout-section").style.display = "none";
    }
});
// ----------------------------------

window.addToCart = function(dish, price, qtyId) {
    let qtyInput = document.getElementById(qtyId);
    let quantity = parseInt(qtyInput.value);
    
    if (isNaN(quantity) || quantity < 1) return;

    cart.push({ dish, price, quantity, total: price * quantity });
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

window.checkout = function() {
    if (cart.length === 0) return;

    // 1. GET DATA (New: Name & Unit)
    let time = document.getElementById("pickup-time").value;
    let name = document.getElementById("cx-name").value.trim();
    let unit = document.getElementById("cx-unit").value.trim();

    // 2. VALIDATION (Make sure they typed it!)
    if (name === "") {
        document.getElementById("cx-name").style.border = "2px solid red";
        showToast("⚠️ Please enter your Name!");
        return;
    }
    if (unit === "") {
        document.getElementById("cx-unit").style.border = "2px solid red";
        showToast("⚠️ Please enter Unit Number!");
        return;
    }
    if (time === "") { 
        document.getElementById("pickup-time").style.border = "2px solid red";
        showToast("⚠️ Please pick a time!");
        return; 
    }

    let total = document.getElementById("cart-total").innerText;
    
    // 3. CREATE ORDER OBJECT
    const newOrder = {
        customerName: name,  
        customerUnit: unit, 
        items: cart,
        totalPrice: total,
        pickupTime: time,
        status: "New Order",
        createdAt: new Date().toString()
    };

    // 4. SEND TO FIREBASE
    const ordersRef = ref(db, 'orders');
    const newOrderRef = push(ordersRef);
    set(newOrderRef, newOrder)
        .then(() => {
            cart = [];
            renderCart();
            document.getElementById("checkout-section").style.display = "none";
            
            // Clear inputs for next time
            document.getElementById("cx-name").value = "";
            document.getElementById("cx-unit").value = "";
            document.getElementById("pickup-time").value = ""; 
            
            showToast("Order Sent to Kitchen! 🚀");
        })
        .catch((error) => {
            console.error(error);
            showToast("Error: " + error.message);
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
