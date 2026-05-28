import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const cartNavText = document.getElementById('cartLink'); 
let globalProducts = []; // Stores all products for instant searching

// ==========================================
// 1. CART MANAGEMENT & FLOATING BUTTON
// ==========================================
let cart = JSON.parse(localStorage.getItem('pharmacy_cart')) || [];

function updateCartCount() {
    // Calculate total items and total price
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Update top header cart text
    if (cartNavText) cartNavText.innerText = `🛒 Cart (${totalItems})`;

    // Control the Floating Checkout Button
    const floatingBtn = document.getElementById('floatingCheckoutBtn');
    const floatingTotal = document.getElementById('floatingTotal');
    
    if (floatingBtn && floatingTotal) {
        if (totalItems > 0) {
            floatingTotal.innerText = `₹${totalPrice}`;
            floatingBtn.classList.add('visible'); // Show it
        } else {
            floatingBtn.classList.remove('visible'); // Hide it
        }
    }
}

function addToCart(product) {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    
    localStorage.setItem('pharmacy_cart', JSON.stringify(cart));
    updateCartCount(); // Instantly updates the floating button!
    
    // Optional: You can remove this alert if you want the addition to be totally silent now!
    alert(`${product.name} added to cart!`);
}

// ==========================================
// 2. PRODUCT CARD GENERATOR (Reverted to Clean Look)
// ==========================================
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
        <img src="${product.imageUrl}" alt="${product.name}" loading="lazy">
        <div class="product-info">
            <span class="product-category">${product.category || 'Medicine'}</span>
            <h3 class="product-name">${product.name}</h3>
            <p class="product-price">₹${product.price}</p>
            
            <button class="btn add-to-cart-btn">Add to Cart</button>
        </div>
    `;
    
    card.querySelector('.add-to-cart-btn').addEventListener('click', () => {
        addToCart(product);
    });

    return card;
}

// ==========================================
// 3. LOAD DATA & RENDER NORMAL LAYOUT
// ==========================================
async function loadStoreData() {
    try {
        const snapshot = await getDocs(collection(db, "products"));
        globalProducts = [];
        snapshot.forEach(doc => globalProducts.push({ id: doc.id, ...doc.data() }));
        renderNormalLayout();
    } catch (error) {
        console.error("Error loading products:", error);
    }
}

function renderNormalLayout() {
    const recentGrid = document.getElementById('recentProductsGrid');
    recentGrid.innerHTML = '';
    
    const newestProducts = [...globalProducts].reverse().slice(0, 4); 
    if(newestProducts.length > 0) {
        newestProducts.forEach(prod => recentGrid.appendChild(createProductCard(prod)));
    } else {
        recentGrid.innerHTML = '<p>No medicines available yet.</p>';
    }

    const categoryContainer = document.getElementById('categoryWiseContainer');
    categoryContainer.innerHTML = '';
    const groupedData = {};
    
    globalProducts.forEach(prod => {
        const catName = prod.category || 'Uncategorized';
        if (!groupedData[catName]) groupedData[catName] = [];
        groupedData[catName].push(prod);
    });

    for (const [categoryName, products] of Object.entries(groupedData)) {
        const section = document.createElement('div');
        section.className = 'category-section';
        section.innerHTML = `<h2 class="category-title">📂 ${categoryName}</h2>`;
        
        const grid = document.createElement('div');
        grid.className = 'product-grid';
        products.forEach(prod => grid.appendChild(createProductCard(prod)));
        
        section.appendChild(grid);
        categoryContainer.appendChild(section);
    }
}

// ==========================================
// 4. LIVE SEARCH LOGIC
// ==========================================
// Make sure you have <input type="text" id="searchInput"> in your index.html header!
const searchInput = document.getElementById('searchInput');

if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        
        const searchHeader = document.getElementById('searchResultsHeader');
        const searchGrid = document.getElementById('searchResultsGrid');
        const banners = document.getElementById('bannersContainer');
        const recentSection = document.getElementById('recentProductsGrid').previousElementSibling; 
        const recentGrid = document.getElementById('recentProductsGrid');
        const categoryContainer = document.getElementById('categoryWiseContainer');

        if (query.length > 0) {
            // Hide normal layout
            if(banners) banners.style.display = 'none';
            if(recentSection) recentSection.style.display = 'none';
            if(recentGrid) recentGrid.style.display = 'none';
            if(categoryContainer) categoryContainer.style.display = 'none';

            // Show search results
            searchHeader.style.display = 'block';
            searchGrid.style.display = 'grid';
            searchGrid.innerHTML = '';

            const matches = globalProducts.filter(prod => 
                prod.name.toLowerCase().includes(query) || 
                (prod.category && prod.category.toLowerCase().includes(query))
            );

            if (matches.length > 0) {
                matches.forEach(prod => searchGrid.appendChild(createProductCard(prod)));
            } else {
                searchGrid.innerHTML = '<p style="grid-column: 1 / -1; color: var(--text-light); text-align: center; padding: 20px;">No medicines found.</p>';
            }
        } else {
            // User cleared search, show normal layout
            if(banners) banners.style.display = 'flex';
            if(recentSection) recentSection.style.display = 'flex';
            if(recentGrid) recentGrid.style.display = 'grid';
            if(categoryContainer) categoryContainer.style.display = 'block';
            
            searchHeader.style.display = 'none';
            searchGrid.style.display = 'none';
        }
    });
}

// ==========================================
// 5. LOAD BANNERS
// ==========================================
async function loadBanners() {
    const bannerContainer = document.getElementById('bannersContainer');
    if(!bannerContainer) return;

    try {
        const snapshot = await getDocs(collection(db, "banners"));
        if(snapshot.empty) {
            bannerContainer.style.display = 'none';
            return;
        }
        
        bannerContainer.innerHTML = '';
        snapshot.forEach((doc) => {
            const banner = doc.data();
            bannerContainer.innerHTML += `<a href="${banner.targetUrl}" class="banner-slide" target="_blank"><img src="${banner.imageUrl}" alt="Promo"></a>`;
        });
    } catch (error) { console.error("Error loading banners:", error); }
}

// ==========================================
// INITIALIZE
// ==========================================
updateCartCount();
loadBanners();
loadStoreData();