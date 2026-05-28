import { db, auth } from './firebase-config.js';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const IMGBB_API_KEY = "f72c6622e7d41a3de8103c5b3f2f5d60"; 

// ==========================================
// 1. DATA LOADING FUNCTIONS
// ==========================================
async function loadOrders() {
    const list = document.getElementById('adminOrderList');
    list.innerHTML = '<tr><td colspan="6" style="text-align: center;">Loading orders...</td></tr>';
    try {
        const snapshot = await getDocs(collection(db, "orders"));
        if (snapshot.empty) {
            list.innerHTML = '<tr><td colspan="6" style="text-align: center;">No orders found.</td></tr>';
            return;
        }
        const ordersArray = [];
        snapshot.forEach(doc => ordersArray.push({ id: doc.id, ...doc.data() }));
        ordersArray.sort((a, b) => b.timestamp - a.timestamp); // Sort newest first

        list.innerHTML = '';
        ordersArray.forEach((order) => {
            const date = order.timestamp ? order.timestamp.toDate().toLocaleString() : 'N/A';
            let itemsHtml = order.items ? order.items.map(i => `• ${i.quantity}x ${i.name}`).join('<br>') : 'No items';
            let prescriptionLink = order.prescriptionUrl ? `<br><a href="${order.prescriptionUrl}" target="_blank" style="color:var(--info); font-size:0.8rem;">📎 View Prescription</a>` : '';

            let statusBadge = order.status === 'Completed' 
                ? `<span style="background: var(--primary); color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem;">Completed</span>`
                : `<span style="background: #f59e0b; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem;">Pending</span>`;

            let actionButtons = '';
            if (order.status !== 'Completed') actionButtons += `<button class="action-btn edit-btn" style="background: var(--primary);" onclick="markOrderCompleted('${order.id}')">✔️ Complete</button>`;
            actionButtons += `<button class="action-btn delete-btn" onclick="deleteDocument('orders', '${order.id}')">Delete</button>`;

            list.innerHTML += `<tr><td style="font-size: 0.85rem; color: var(--text-light);">${date}</td><td><strong>${order.customerName}</strong><br>📞 ${order.customerPhone}<br><small>${order.customerAddress}</small>${prescriptionLink}</td><td style="font-size: 0.85rem;">${itemsHtml}</td><td style="font-weight: bold;">₹${order.totalAmount}</td><td>${statusBadge}</td><td>${actionButtons}</td></tr>`;
        });
    } catch (error) { console.error("Error loading orders:", error); }
}

async function loadCategories() {
    const list = document.getElementById('adminCategoryList');
    const selectAdd = document.getElementById('productCategory'); 
    const selectEdit = document.getElementById('editProductCategory'); 
    list.innerHTML = '<tr><td colspan="2">Loading...</td></tr>';
    let optionsHTML = '<option value="">Select Category</option>';
    try {
        const snapshot = await getDocs(collection(db, "categories"));
        list.innerHTML = '';
        snapshot.forEach((document) => {
            const cat = document.data();
            optionsHTML += `<option value="${cat.name}">${cat.name}</option>`;
            list.innerHTML += `<tr><td>${cat.name}</td><td><button class="action-btn edit-btn" onclick="openEditCategory('${document.id}', '${cat.name.replace(/'/g, "\\'")}')">Edit</button><button class="action-btn delete-btn" onclick="deleteDocument('categories', '${document.id}')">Delete</button></td></tr>`;
        });
        selectAdd.innerHTML = optionsHTML;
        selectEdit.innerHTML = optionsHTML;
    } catch (error) { console.error(error); }
}

async function loadBanners() {
    const list = document.getElementById('adminBannerList');
    list.innerHTML = '<tr><td colspan="3">Loading...</td></tr>';
    try {
        const snapshot = await getDocs(collection(db, "banners"));
        list.innerHTML = '';
        snapshot.forEach((document) => {
            const banner = document.data();
            list.innerHTML += `<tr><td><img src="${banner.imageUrl}" style="width:100px; height:auto; border-radius:4px;"></td><td><a href="${banner.targetUrl}" target="_blank">Link</a></td><td><button class="action-btn edit-btn" onclick="openEditBanner('${document.id}', '${banner.targetUrl}')">Edit</button><button class="action-btn delete-btn" onclick="deleteDocument('banners', '${document.id}')">Delete</button></td></tr>`;
        });
    } catch (error) { console.error(error); }
}

async function loadProducts() {
    const list = document.getElementById('adminProductList');
    list.innerHTML = '<tr><td colspan="5">Loading...</td></tr>';
    try {
        const snapshot = await getDocs(collection(db, "products"));
        list.innerHTML = '';
        snapshot.forEach((document) => {
            const prod = document.data();
            const safeName = prod.name.replace(/'/g, "\\'"); 
            
            // UPDATED: Handle MRP display in the table
            const mrp = prod.mrp || prod.price; // Fallback if MRP doesn't exist yet
            
            list.innerHTML += `<tr>
                <td><img src="${prod.imageUrl}"></td>
                <td>${prod.name}</td>
                <td>${prod.category}</td>
                <td>
                    <span style="color:var(--primary); font-weight:bold;">₹${prod.price}</span><br>
                    <small style="text-decoration:line-through; color: #94a3b8;">₹${mrp}</small>
                </td>
                <td>
                    <button class="action-btn edit-btn" onclick="openEditProduct('${document.id}', '${safeName}', '${prod.category}', ${prod.price}, ${mrp})">Edit</button>
                    <button class="action-btn delete-btn" onclick="deleteDocument('products', '${document.id}')">Delete</button>
                </td>
            </tr>`;
        });
    } catch (error) { console.error(error); }
}

// ==========================================
// 2. EXPOSE FUNCTIONS TO HTML BUTTONS
// ==========================================
window.loadOrders = loadOrders;

window.markOrderCompleted = async function(docId) {
    if(confirm("Mark this order as completed?")) {
        try { await updateDoc(doc(db, "orders", docId), { status: 'Completed' }); loadOrders(); } 
        catch (error) { alert("Failed to update order status."); }
    }
};

window.deleteDocument = async function(collectionName, docId) {
    if(confirm("Are you sure you want to delete this?")) {
        try {
            await deleteDoc(doc(db, collectionName, docId));
            if (collectionName === 'orders') loadOrders();
            if (collectionName === 'categories') loadCategories();
            if (collectionName === 'products') loadProducts();
            if (collectionName === 'banners') loadBanners();
        } catch (error) { alert("Failed to delete."); }
    }
};

// UPDATED: Function now accepts and sets MRP
window.openEditProduct = function(id, name, category, price, mrp) {
    document.getElementById('editProductId').value = id;
    document.getElementById('editProductName').value = name;
    document.getElementById('editProductCategory').value = category;
    document.getElementById('editProductPrice').value = price;
    document.getElementById('editProductMrp').value = mrp || price; // Set MRP field
    document.getElementById('editProductModal').style.display = 'flex';
};

window.openEditCategory = function(id, name) {
    document.getElementById('editCategoryId').value = id;
    document.getElementById('editCategoryName').value = name;
    document.getElementById('editCategoryModal').style.display = 'flex';
};
window.openEditBanner = function(id, url) {
    document.getElementById('editBannerId').value = id;
    document.getElementById('editBannerUrl').value = url;
    document.getElementById('editBannerModal').style.display = 'flex';
};

// ==========================================
// 3. FORM SUBMISSION LISTENERS
// ==========================================
document.getElementById('addCategoryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitCategoryBtn');
    try {
        btn.innerText = "Adding..."; btn.disabled = true;
        await addDoc(collection(db, "categories"), { name: document.getElementById('categoryName').value });
        document.getElementById('addCategoryForm').reset();
        loadCategories(); 
    } catch (error) { alert("Error adding category."); } finally { btn.innerText = "Add Category"; btn.disabled = false; }
});

document.getElementById('addBannerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitBannerBtn');
    try {
        btn.innerText = "Uploading..."; btn.disabled = true;
        const formData = new FormData(); formData.append("image", document.getElementById('bannerImage').files[0]);
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: formData });
        const result = await response.json();
        await addDoc(collection(db, "banners"), { targetUrl: document.getElementById('bannerUrl').value, imageUrl: result.data.url });
        document.getElementById('addBannerForm').reset(); loadBanners();
    } catch (error) { alert("Error adding banner."); } finally { btn.innerText = "Upload Banner"; btn.disabled = false; }
});

document.getElementById('addProductForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    
    // UPDATED: Grab Selling Price and MRP
    const price = parseFloat(document.getElementById('productPrice').value);
    const mrpInput = document.getElementById('productMrp').value;
    const mrp = mrpInput ? parseFloat(mrpInput) : price; // Fallback to price if MRP is left blank

    try {
        btn.innerText = "Uploading..."; btn.disabled = true;
        const formData = new FormData(); formData.append("image", document.getElementById('productImage').files[0]);
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: formData });
        const result = await response.json();
        await addDoc(collection(db, "products"), {
            name: document.getElementById('productName').value,
            category: document.getElementById('productCategory').value,
            price: price,
            mrp: mrp, // Save MRP to Firebase
            imageUrl: result.data.url
        });
        document.getElementById('addProductForm').reset(); loadProducts();
    } catch (error) { alert("Error adding product."); } finally { btn.innerText = "Add Product"; btn.disabled = false; }
});

document.getElementById('editProductForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    // UPDATED: Update MRP field in Firebase
    await updateDoc(doc(db, "products", document.getElementById('editProductId').value), {
        name: document.getElementById('editProductName').value,
        category: document.getElementById('editProductCategory').value,
        price: parseFloat(document.getElementById('editProductPrice').value),
        mrp: parseFloat(document.getElementById('editProductMrp').value) // Save edited MRP
    });
    document.getElementById('editProductModal').style.display = 'none'; loadProducts();
});

document.getElementById('editCategoryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await updateDoc(doc(db, "categories", document.getElementById('editCategoryId').value), { name: document.getElementById('editCategoryName').value });
    document.getElementById('editCategoryModal').style.display = 'none'; loadCategories();
});

document.getElementById('editBannerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await updateDoc(doc(db, "banners", document.getElementById('editBannerId').value), { targetUrl: document.getElementById('editBannerUrl').value });
    document.getElementById('editBannerModal').style.display = 'none'; loadBanners();
});

// ==========================================
// 4. SECURITY & INITIALIZATION
// ==========================================
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Logged in! Load data safely.
        loadOrders();
        loadCategories();
        loadProducts();
        loadBanners();
    } else {
        // Not logged in! Kick to login page.
        window.location.href = "login.html";
    }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = "login.html";
});