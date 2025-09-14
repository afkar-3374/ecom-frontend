// Define the base URL for your backend server
const BACKEND_URL = 'http://localhost:3000';

// A simple way to check which page we are on
const isStorefront = window.location.pathname.endsWith('index.html') || window.location.pathname === '/';
const isAdminPanel = window.location.pathname.endsWith('admin.html');

// --- COMMON API FUNCTIONS ---
async function fetchProducts() {
    try {
        const response = await fetch(`${BACKEND_URL}/products`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return await response.json();
    } catch (error) {
        console.error("Failed to fetch products:", error);
        return [];
    }
}

async function fetchSettings() {
    try {
        const response = await fetch(`${BACKEND_URL}/settings`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return await response.json();
    } catch (error) {
        console.error("Failed to fetch settings:", error);
        return {};
    }
}

async function updateLogo(logoUrl) {
    await fetch(`${BACKEND_URL}/settings/logo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logoUrl })
    });
}

async function updateShopName(name) {
    await fetch(`${BACKEND_URL}/settings/name`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
    });
}

async function updateCommonElements() {
    const settings = await fetchSettings();
    const logoImg = document.querySelector('.logo-container .logo');
    const shopNameElement = document.querySelector('.shop-name');

    if (logoImg && settings.shopLogo) {
        logoImg.src = settings.shopLogo;
    }

    if (shopNameElement && settings.shopName) {
        shopNameElement.textContent = settings.shopName;
    }
}

// --- STOREFRONT (index.html) LOGIC ---
if (isStorefront) {
    const cartIcon = document.querySelector('.cart-icon');
    const cartModal = document.getElementById('cart-modal');
    const closeBtn = document.getElementById('close-cart-btn');
    const cartItemsContainer = document.querySelector('.cart-items-container');
    const cartTotal = document.getElementById('cart-total');
    const cartCount = document.querySelector('.cart-count');
    const checkoutBtn = document.querySelector('.checkout-btn');
    const productGrid = document.querySelector('.product-grid');
    const searchInput = document.querySelector('.search-box input');
    
    // New Checkout Modal Elements
    const checkoutModal = document.getElementById('checkout-modal');
    const closeCheckoutBtn = document.getElementById('close-checkout-btn');
    const checkoutForm = document.getElementById('checkout-form');
    const paymentMethodSelect = document.getElementById('paymentMethod');
    const upiDetails = document.getElementById('upi-details');
    const upiScreenshotInput = document.getElementById('upiScreenshot');

    let cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];

    // Function to save cart to localStorage for persistence
    function saveCart() {
        localStorage.setItem('cartItems', JSON.stringify(cartItems));
    }

    // Function to update the cart's HTML display
    function updateCart() {
        cartItemsContainer.innerHTML = '';
        let total = 0;

        cartItems.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.classList.add('cart-item');
            itemElement.innerHTML = `
                <p>${item.name}</p>
                <div class="quantity-controls">
                    <button class="quantity-minus-btn" data-id="${item.id}">-</button>
                    <span>${item.quantity}</span>
                    <button class="quantity-plus-btn" data-id="${item.id}">+</button>
                </div>
                <p>₹${(item.price * item.quantity).toFixed(2)}</p>
            `;
            cartItemsContainer.appendChild(itemElement);
            total += parseFloat(item.price) * item.quantity;
        });

        cartTotal.textContent = `₹${total.toFixed(2)}`;
        cartCount.textContent = cartItems.reduce((sum, item) => sum + item.quantity, 0);

        if (cartItems.length === 0) {
            cartItemsContainer.innerHTML = '<p style="text-align:center; color: #888;">Your cart is empty.</p>';
        }
        saveCart();
    }

    // Function to render products on the storefront
    async function renderStorefrontProducts(productsToRender) {
        productGrid.innerHTML = '';
        if (productsToRender.length === 0) {
            productGrid.innerHTML = '<p style="text-align:center; width:100%;">No products available. Try a different search!</p>';
            return;
        }

        productsToRender.forEach(product => {
            const productCard = document.createElement('div');
            productCard.classList.add('product-card');
            productCard.innerHTML = `
                <img src="${product.image}" alt="${product.name}">
                <h3>${product.name}</h3>
                <p class="price">₹${parseFloat(product.price).toFixed(2)}</p>
                <button class="add-to-cart-btn" data-id="${product.id}">Add to Cart</button>
            `;
            productGrid.appendChild(productCard);
        });
    }

    async function filterProducts() {
        const searchTerm = searchInput.value.toLowerCase();
        const allProducts = await fetchProducts();
        
        const filteredProducts = allProducts.filter(product =>
            product.name.toLowerCase().includes(searchTerm) ||
            product.description.toLowerCase().includes(searchTerm)
        );
        
        renderStorefrontProducts(filteredProducts);
    }

    productGrid.addEventListener('click', async (e) => {
        if (e.target.classList.contains('add-to-cart-btn')) {
            const productId = parseInt(e.target.dataset.id);
            const products = await fetchProducts();
            const productToAdd = products.find(p => p.id === productId);
            if (productToAdd) {
                const existingItem = cartItems.find(item => item.id === productToAdd.id);
                if (existingItem) {
                    existingItem.quantity++;
                } else {
                    cartItems.push({ ...productToAdd, quantity: 1 });
                }
                updateCart();
                alert(`${productToAdd.name} added to cart!`);
            }
        }
    });

    cartItemsContainer.addEventListener('click', (event) => {
        const target = event.target;
        const productId = parseInt(target.dataset.id);

        if (target.classList.contains('quantity-plus-btn')) {
            const item = cartItems.find(i => i.id === productId);
            if (item) item.quantity++;
        } else if (target.classList.contains('quantity-minus-btn')) {
            const item = cartItems.find(i => i.id === productId);
            if (item && item.quantity > 1) item.quantity--;
        } else if (target.classList.contains('delete-btn')) {
            cartItems = cartItems.filter(i => i.id !== productId);
        }
        updateCart();
    });

    checkoutBtn.addEventListener('click', () => {
        if (cartItems.length > 0) {
            cartModal.style.display = 'none';
            checkoutModal.style.display = 'flex';
        } else {
            alert('Your cart is empty. Add some products before checking out!');
        }
    });

    checkoutForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const customerName = document.getElementById('customerName').value;
        const phoneNumber = document.getElementById('phoneNumber').value;
        const address = document.getElementById('address').value;
        const paymentMethod = paymentMethodSelect.value;
        
        let upiScreenshot = '';
        if (paymentMethod === 'UPI' && upiScreenshotInput.files[0]) {
            const reader = new FileReader();
            reader.onload = async function(event) {
                upiScreenshot = event.target.result;
                placeOrder(customerName, phoneNumber, address, paymentMethod, upiScreenshot);
            };
            reader.readAsDataURL(upiScreenshotInput.files[0]);
        } else {
            placeOrder(customerName, phoneNumber, address, paymentMethod, upiScreenshot);
        }
    });
    
    async function placeOrder(customerName, phoneNumber, address, paymentMethod, upiScreenshot) {
        const orderProducts = cartItems.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity
        }));
        
        const total = parseFloat(cartTotal.textContent.substring(1)); // get number from '₹123.45'

        const orderDetails = {
            customerName,
            phoneNumber,
            address,
            paymentMethod,
            upiScreenshot,
            products: orderProducts,
            total,
        };

        try {
            const response = await fetch(`${BACKEND_URL}/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderDetails),
            });

            if (response.ok) {
                alert('Order placed successfully! Thank you for your purchase.');
                cartItems = [];
                localStorage.removeItem('cartItems');
                updateCart();
                checkoutModal.style.display = 'none';
                checkoutForm.reset();
            } else {
                alert('Failed to place order. Please try again.');
            }
        } catch (error) {
            console.error('Error placing order:', error);
            alert('An error occurred. Please try again.');
        }
    }

    paymentMethodSelect.addEventListener('change', () => {
        if (paymentMethodSelect.value === 'UPI') {
            upiDetails.style.display = 'block';
        } else {
            upiDetails.style.display = 'none';
        }
    });

    cartIcon.addEventListener('click', () => {
        cartModal.style.display = 'flex';
    });

    closeBtn.addEventListener('click', () => {
        cartModal.style.display = 'none';
    });
    
    closeCheckoutBtn.addEventListener('click', () => {
        checkoutModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === cartModal) {
            cartModal.style.display = 'none';
        }
        if (event.target === checkoutModal) {
            checkoutModal.style.display = 'none';
        }
    });

    searchInput.addEventListener('input', filterProducts);
    
    updateCommonElements();
    fetchProducts().then(products => renderStorefrontProducts(products));
    updateCart();

// --- ADMIN PANEL (admin.html) LOGIC ---
} else if (isAdminPanel) {
    const logoPreview = document.getElementById('logo-preview');
    const logoUpload = document.getElementById('logo-upload');
    const updateLogoBtn = document.getElementById('update-logo-btn');
    const addProductCard = document.querySelector('.add-product-card');
    const addProductIcon = document.querySelector('.add-product-icon');
    const addProductForm = document.querySelector('.add-product-form');
    const productGrid = document.querySelector('.admin-panel .product-grid');
    const submitProductBtn = document.getElementById('submit-product-btn');
    const shopNameInput = document.getElementById('shop-name-input');
    const updateNameBtn = document.getElementById('update-name-btn');
    const ordersSection = document.getElementById('orders-section');
    
    // API Function to fetch orders
    async function fetchOrders() {
        try {
            const response = await fetch(`${BACKEND_URL}/orders`);
            return await response.json();
        } catch (error) {
            console.error('Failed to fetch orders:', error);
            return [];
        }
    }

    // API Function to update order status
    async function updateOrderStatus(orderId, status) {
        await fetch(`${BACKEND_URL}/orders/${orderId}/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
        });
        renderAdminOrders();
    }

    // Function to render orders on the admin panel
    async function renderAdminOrders() {
        const orders = await fetchOrders();
        ordersSection.innerHTML = '';
        
        if (orders.length === 0) {
            ordersSection.innerHTML = '<p style="text-align:center;">No pending orders.</p>';
            return;
        }

        orders.forEach(order => {
            const orderCard = document.createElement('div');
            orderCard.classList.add('order-card');
            orderCard.innerHTML = `
                <h3>Order #${order._id.substring(0, 8)}</h3>
                <p><strong>Status:</strong> <span class="order-status ${order.status.toLowerCase()}">${order.status}</span></p>
                <p><strong>Customer:</strong> ${order.customerName}</p>
                <p><strong>Phone:</strong> ${order.phoneNumber}</p>
                <p><strong>Address:</strong> ${order.address}</p>
                <p><strong>Payment:</strong> ${order.paymentMethod}</p>
                <p><strong>Total:</strong> ₹${order.total.toFixed(2)}</p>
                <h4>Items:</h4>
                <ul>
                    ${order.products.map(item => `<li>${item.name} (x${item.quantity}) - ₹${item.price}</li>`).join('')}
                </ul>
                ${order.paymentMethod === 'UPI' && order.upiScreenshot ? `
                    <h4>UPI Screenshot:</h4>
                    <img src="${order.upiScreenshot}" alt="UPI Screenshot" style="max-width: 100%; height: auto; border: 1px solid #ccc; margin-top: 10px;">
                ` : ''}
                <div class="order-actions">
                    <button class="approve-btn" data-id="${order._id}">Approve</button>
                    <button class="cancel-btn" data-id="${order._id}">Cancel</button>
                </div>
            `;
            ordersSection.appendChild(orderCard);
        });
    }
    
    // Event listener for order actions
    ordersSection.addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('approve-btn')) {
            const orderId = target.dataset.id;
            updateOrderStatus(orderId, 'Approved');
            alert('Order Approved!');
        } else if (target.classList.contains('cancel-btn')) {
            const orderId = target.dataset.id;
            updateOrderStatus(orderId, 'Cancelled');
            alert('Order Cancelled!');
        }
    });

    // Function to render products on the admin panel
    async function renderAdminProducts() {
        const products = await fetchProducts();
        productGrid.innerHTML = '';
        productGrid.appendChild(addProductCard);

        products.forEach(product => {
            const productCard = document.createElement('div');
            productCard.classList.add('product-card');
            productCard.innerHTML = `
                <img src="${product.image}" alt="${product.name}">
                <h3>${product.name}</h3>
                <p class="price">Price: ₹${product.price}</p>
                <button class="delete-btn" data-id="${product.id}">Delete</button>
            `;
            productGrid.appendChild(productCard);
        });
    }

    // Function to add a new product
    async function addProduct() {
        const newProductImageFile = document.getElementById('new-product-image').files[0];
        const newProductName = document.getElementById('new-product-name').value;
        const newProductPrice = document.getElementById('new-product-price').value;
        const newProductDesc = document.getElementById('new-product-description').value;

        if (!newProductImageFile || !newProductName || !newProductPrice) {
            alert("Please fill in all the required fields.");
            return;
        }

        const reader = new FileReader();
        reader.onload = async function(event) {
            const newProduct = {
                image: event.target.result,
                name: newProductName,
                price: parseFloat(newProductPrice).toFixed(2),
                description: newProductDesc
            };
            
            await fetch(`${BACKEND_URL}/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newProduct)
            });

            renderAdminProducts();
            addProductForm.reset();
            addProductIcon.style.display = 'block';
            addProductForm.style.display = 'none';
            updateCommonElements();
            alert("Product added successfully!");
        };
        reader.readAsDataURL(newProductImageFile);
    }

    // Handle logo update
    updateLogoBtn.addEventListener('click', async () => {
        const file = logoUpload.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async function(e) {
                await updateLogo(e.target.result);
                updateCommonElements();
                alert("Shop logo updated!");
            };
            reader.readAsDataURL(file);
        }
    });

    // Handle shop name update
    updateNameBtn.addEventListener('click', async () => {
        const newName = shopNameInput.value.trim();
        if (newName) {
            await updateShopName(newName);
            updateCommonElements();
            alert("Shop name updated!");
            shopNameInput.value = '';
        } else {
            alert("Please enter a new name.");
        }
    });

    addProductCard.addEventListener('click', () => {
        if (addProductForm.style.display === 'none') {
            addProductIcon.style.display = 'none';
            addProductForm.style.display = 'flex';
        }
    });

    submitProductBtn.addEventListener('click', (e) => {
        e.preventDefault();
        addProduct();
    });

    // Handle product deletion
    productGrid.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const productId = e.target.dataset.id;
            await fetch(`${BACKEND_URL}/products/${productId}`, { method: 'DELETE' });
            renderAdminProducts();
            alert("Product deleted!");
        }
    });

    // Initial load for admin panel
    updateCommonElements();
    renderAdminProducts();
    renderAdminOrders();
}