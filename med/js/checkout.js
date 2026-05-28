import { db } from './firebase-config.js';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 1. Configuration
const IMGBB_API_KEY = "f72c6622e7d41a3de8103c5b3f2f5d60"; 
// Put your shop's WhatsApp number here (Include country code, no + or spaces. e.g., "919876543210")
const SHOP_OWNER_WHATSAPP_NUMBER = "918658851515"; 

// 2. DOM Elements & State
let cart = JSON.parse(localStorage.getItem('pharmacy_cart')) || [];
const orderItemsList = document.getElementById('orderItemsList');
const orderTotalAmount = document.getElementById('orderTotalAmount');
const placeOrderBtn = document.getElementById('placeOrderBtn');

// 3. Render Order Summary & Quantity Controls
function renderSummary() {
    if (cart.length === 0) {
        orderItemsList.innerHTML = '<p class="empty-cart-msg" style="text-align:center; padding: 20px; color: #6b7280;">Your cart is empty!</p>';
        placeOrderBtn.disabled = true;
        placeOrderBtn.innerText = "Cart is Empty";
        orderTotalAmount.innerText = `₹0`;
        return 0;
    }

    // Ensure the button is active if items exist
    placeOrderBtn.disabled = false;
    placeOrderBtn.innerText = "Place Order via WhatsApp";

    let total = 0;
    orderItemsList.innerHTML = '';

    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;

        orderItemsList.innerHTML += `
            <div class="summary-item" style="display: flex; flex-direction: column; gap: 12px; border-bottom: 1px solid var(--border); padding: 15px 0;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 600; color: var(--text-main); font-size: 1.05rem;">${item.name}</span>
                    <span style="font-weight: 600; color: var(--primary); font-size: 1.05rem;">₹${itemTotal}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    
                    <!-- Quantity Controls -->
                    <div style="display: flex; align-items: center; gap: 10px; background: #f3f4f6; padding: 5px; border-radius: 6px;">
                        <button type="button" onclick="updateQuantity('${item.id}', -1)" style="border:none; background:white; width:28px; height:28px; border-radius:4px; cursor:pointer; font-weight:bold; box-shadow:0 1px 2px rgba(0,0,0,0.1);">-</button>
                        <span style="font-weight:600; width: 20px; text-align:center;">${item.quantity}</span>
                        <button type="button" onclick="updateQuantity('${item.id}', 1)" style="border:none; background:white; width:28px; height:28px; border-radius:4px; cursor:pointer; font-weight:bold; box-shadow:0 1px 2px rgba(0,0,0,0.1);">+</button>
                    </div>

                    <!-- Remove Button -->
                    <button type="button" onclick="removeItem('${item.id}')" style="border:none; background:transparent; color: #ef4444; cursor:pointer; font-size: 0.9rem; font-weight: 500;">🗑️ Remove</button>
                </div>
            </div>
        `;
    });

    orderTotalAmount.innerText = `₹${total}`;
    return total;
}

// Global functions so the HTML buttons can trigger them
window.updateQuantity = function(id, change) {
    const item = cart.find(i => i.id === id);
    if (item) {
        item.quantity += change;
        
        // If quantity drops to 0, remove it entirely
        if (item.quantity <= 0) {
            window.removeItem(id);
            return;
        }
        
        // Save to local storage and re-draw the cart
        localStorage.setItem('pharmacy_cart', JSON.stringify(cart));
        renderSummary();
    }
};

window.removeItem = function(id) {
    // Filter out the deleted item
    cart = cart.filter(i => i.id !== id);
    
    // Save to local storage and re-draw the cart
    localStorage.setItem('pharmacy_cart', JSON.stringify(cart));
    renderSummary();
};

// 4. Handle Order Submission
document.getElementById('checkoutForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Grab form values
    const name = document.getElementById('customerName').value;
    const phone = document.getElementById('customerPhone').value;
    const address = document.getElementById('customerAddress').value;
    const prescriptionFile = document.getElementById('prescriptionImage').files[0];

    // Defaults if no prescription is uploaded
    let prescriptionStatus = "Will be sent directly in WhatsApp chat. 📷";
    let prescriptionUrl = ""; 

    try {
        // Lock the button to prevent double-clicks
        placeOrderBtn.innerText = "Processing Order...";
        placeOrderBtn.disabled = true;

        // A. Upload Prescription to ImgBB (If provided)
        if (prescriptionFile) {
            placeOrderBtn.innerText = "Uploading Prescription...";
            const formData = new FormData();
            formData.append("image", prescriptionFile);
            
            const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                method: "POST",
                body: formData
            });
            const result = await response.json();
            
            if (result.success) {
                prescriptionUrl = result.data.url;
                prescriptionStatus = `Uploaded! View here: ${prescriptionUrl}`;
            } else {
                throw new Error("ImgBB upload failed");
            }
        }

        placeOrderBtn.innerText = "Saving to Database...";

        // B. Calculate total and format items list
        const total = renderSummary();
        let productListText = "";
        cart.forEach((item, index) => {
            productListText += `${index + 1}. ${item.name} - Qty: ${item.quantity} (₹${item.price * item.quantity})\n`;
        });

        // C. SAVE TO FIREBASE DATABASE FIRST
        await addDoc(collection(db, "orders"), {
            customerName: name,
            customerPhone: phone,
            customerAddress: address,
            prescriptionUrl: prescriptionUrl, // Empty string if they didn't upload one
            items: cart, // Saves the entire array of products!
            totalAmount: total,
            status: "Pending", // Tells the admin panel this is a new order
            timestamp: new Date()
        });

        placeOrderBtn.innerText = "Opening WhatsApp...";

        // D. Construct the final WhatsApp Message
        const message = `
*New Order from MediQuick!* 💊
---------------------------
*Customer Details:*
Name: ${name}
Phone: ${phone}
Address: ${address}

*Prescription:* ${prescriptionStatus}

*Order Items:*
${productListText}
---------------------------
*Total Amount:* ₹${total}
*Payment Method:* Cash on Delivery

Please confirm my order. Thank you!`;

        // E. Redirect to WhatsApp
        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/${SHOP_OWNER_WHATSAPP_NUMBER}?text=${encodedMessage}`, '_blank');

        // F. Clean up and redirect
        localStorage.removeItem('pharmacy_cart');
        
        // Brief pause to ensure WhatsApp opens before redirecting
        setTimeout(() => {
            alert("Order placed successfully! Redirecting to homepage...");
            window.location.href = "index.html";
        }, 1000);

    } catch (error) {
        console.error("Order error:", error);
        alert("Something went wrong processing your order. Please check your internet connection and try again.");
        
        // Reset button so they can try again
        placeOrderBtn.innerText = "Place Order via WhatsApp";
        placeOrderBtn.disabled = false;
    }
});

// Initialize the page by drawing the cart
renderSummary();