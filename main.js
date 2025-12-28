import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// --- PASTE YOUR FIREBASE CONFIG HERE ---
// In main.js, replace your current firebaseConfig with this:

const firebaseConfig = {
    apiKey: "AIzaSyAe2nyNcHwj2JPNXkQg45tRtXLgnuKP5v0",
    authDomain: "family-food-db.firebaseapp.com",
    // 👇 THIS IS THE FIX. Your screenshot shows this specific URL:
    databaseURL: "https://family-food-db-87ec4-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "family-food-db", // Check your project settings, this might also be "family-food-db-87ec4"
    storageBucket: "family-food-db.appspot.com",
    messagingSenderId: "...",
    appId: "..."
};


// 1. Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let cart = [];

// ADD TO CART
window.addToCart = function(dish, price, qtyId) {
    let qtyInput = document.getElementById(qtyId);
    let quantity = parseInt(qtyInput.value);
    if (quantity < 1) return;

    cart.push({ dish, price, quantity, total: price * quantity });
    renderCart();
    qtyInput.value = 1;
    alert(`Added ${quantity} x ${dish} to cart!`);
}

// RENDER CART
function renderCart() {
    let list = document.getElementById("cart-items");
    let totalEl = document.getElementById("cart-total");
    let checkoutSection = document.getElementById("checkout-section");
    
    list.innerHTML = "";
    let grandTotal = 0;
    
    cart.forEach((item, index) => {
        grandTotal += item.total;
        list.innerHTML += `<div>${item.quantity}x ${item.dish} ($${item.total.toFixed(2)})</div>`;
    });
    
    totalEl.innerText = grandTotal.toFixed(2);
    
    if (cart.length > 0) {
        checkoutSection.style.display = "block";
    } else {
        checkoutSection.style.display = "none";
    }
}

window.checkout = function() {
    if (cart.length === 0) return; // Do nothing if empty

    let time = document.getElementById("pickup-time").value;
    if (time === "") { 
        // Optional: Make the time box red instead of an alert
        document.getElementById("pickup-time").style.border = "2px solid red";
        return; 
    }

    const newOrder = {
        items: cart,
        totalPrice: document.getElementById("cart-total").innerText,
        pickupTime: time,
        status: "New Order",
        createdAt: new Date().toString()
    };

    const ordersRef = ref(db, 'orders');
    const newOrderRef = push(ordersRef);
    set(newOrderRef, newOrder)
        .then(() => {
            // 1. Clear Cart
            cart = [];
            renderCart();
            document.getElementById("checkout-section").style.display = "none";

            // 2. SHOW BEAUTIFUL NOTIFICATION (No more popup!)
            let x = document.getElementById("toast");
            x.style.visibility = "visible";
            setTimeout(function(){ x.style.visibility = "hidden"; }, 3000);
        })
        .catch((error) => {
            console.error(error); // Log errors silently to console
        });
}
