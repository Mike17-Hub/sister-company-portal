const getScUser = () => {
    try {
        return JSON.parse(localStorage.getItem("scUser") || "null");
    } catch {
        return null;
    }
};

const getActiveStoreId = () => {
    const scUser = getScUser();
    return String(scUser?.store_id || "").trim() || "";
};

const getCartStorageKey = () => {
    const storeId = getActiveStoreId();
    return `scCart:${storeId || "guest"}`;
};

const loadCart = () => {
    try {
        const raw = localStorage.getItem(getCartStorageKey());
        const parsed = raw ? JSON.parse(raw) : null;
        if (!parsed || typeof parsed !== "object") return { items: {} };
        if (!parsed.items || typeof parsed.items !== "object") return { items: {} };
        return parsed;
    } catch {
        return { items: {} };
    }
};

const saveCart = (cart) => {
    localStorage.setItem(getCartStorageKey(), JSON.stringify(cart || { items: {} }));
};

const formatCurrency = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return "₱0.00";
    return `₱${num.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
        return new Date(dateString).toLocaleDateString('en-CA'); // YYYY-MM-DD format
    } catch (e) {
        return dateString;
    }
};

const r2BaseUrl = "https://pub-431a1eccf270455a99eab6163255ef53.r2.dev";
const placeholderImage = `${r2BaseUrl}/empty-product.svg`;

let currentOrderItems = [];

const detailsModal = {
    modal: null,
    closeBtn: null,
    list: null,
    title: null,
    meta: null,
    total: null,
    reorderBtn: null
};

const buildDetailsModal = () => {
    if (detailsModal.modal) return;

    const modal = document.createElement("div");
    modal.className = "sc-order-details-modal";
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML = `
      <div class="sc-order-details-panel" role="dialog" aria-modal="true" aria-label="Order details">
        <div class="sc-order-details-header">
          <div>
            <h3 class="sc-order-details-title">Order details</h3>
            <p class="sc-order-details-meta"></p>
          </div>
          <button type="button" class="sc-order-details-close" aria-label="Close details">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="sc-order-details-list"></div>
        <div class="sc-order-details-total">
          <span>Total</span>
          <strong class="sc-order-details-total-value">PHP 0.00</strong>
        </div>
        <div class="sc-order-details-actions">
          <button type="button" class="sc-order-details-reorder">Reorder Items</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    detailsModal.modal = modal;
    detailsModal.closeBtn = modal.querySelector(".sc-order-details-close");
    detailsModal.list = modal.querySelector(".sc-order-details-list");
    detailsModal.title = modal.querySelector(".sc-order-details-title");
    detailsModal.meta = modal.querySelector(".sc-order-details-meta");
    detailsModal.total = modal.querySelector(".sc-order-details-total-value");
    detailsModal.reorderBtn = modal.querySelector(".sc-order-details-reorder");

    const close = () => closeDetailsModal();
    detailsModal.closeBtn?.addEventListener("click", close);
    modal.addEventListener("click", (event) => {
        if (event.target === modal) closeDetailsModal();
    });

    document.addEventListener("keydown", (event) => {
        if (!detailsModal.modal?.classList.contains("is-visible")) return;
        if (event.key === "Escape") closeDetailsModal();
    });

    detailsModal.reorderBtn?.addEventListener("click", () => {
        reorderItems();
    });
};

const reorderItems = () => {
    if (!currentOrderItems || currentOrderItems.length === 0) {
        alert("No items to reorder.");
        return;
    }

    const cart = loadCart();

    currentOrderItems.forEach(item => {
        const itemCode = String(item.item_code || "").trim();
        if (!itemCode || itemCode === "-") return;

        const qtyToAdd = Math.max(1, Number(item.qty) || 1);

        cart.items[itemCode] = {
            item_code: itemCode,
            item_name: String(item.item_name || "").trim(),
            brand: String(item.brand || "").trim(),
            price: Number(item.unit_price || item.price || 0),
            qty: qtyToAdd,
            added_at: new Date().toISOString(),
        };
    });

    saveCart(cart);
    if (window.scHeader?.updateCartBadge) {
      window.scHeader.updateCartBadge();
    }
    alert("Items from this order have been added to your cart.");
    closeDetailsModal();
    window.location.href = "sc-cart.html";
};

const openDetailsModal = ({ orderId, date, status, items, total }) => {
    buildDetailsModal();
    if (!detailsModal.modal || !detailsModal.list) return;

    detailsModal.title.textContent = `Order #${orderId}`;
    detailsModal.meta.textContent = `${date} • ${status}`;
    currentOrderItems = items;

    detailsModal.list.innerHTML = items.map((item) => {
        const code = String(item.item_code || "").trim();
        const safeCode = encodeURIComponent(code);
        const imgSrc = safeCode ? `${r2BaseUrl}/${safeCode}/IMG_0001.png` : placeholderImage;
        const qty = Math.max(1, Number(item.qty) || 1);
        const price = Number(item.unit_price || item.price || 0);
        const subtotal = price * qty;
        return `
          <div class="sc-order-details-row">
            <div class="sc-order-details-image">
              <img src="${imgSrc}" alt="${code} image" loading="lazy" onerror="this.src='${placeholderImage}'">
            </div>
            <div class="sc-order-details-info">
              <p class="sc-order-details-code">${code}</p>
              <p class="sc-order-details-name">${String(item.item_name || "-")}</p>
              <p class="sc-order-details-meta">Qty: ${qty} • Unit: ${formatCurrency(price)}</p>
            </div>
            <div class="sc-order-details-subtotal">${formatCurrency(subtotal)}</div>
          </div>
        `;
    }).join("");

    detailsModal.total.textContent = formatCurrency(total);

    detailsModal.modal.classList.add("is-visible");
    detailsModal.modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("has-order-details-modal");
};

const closeDetailsModal = () => {
    if (!detailsModal.modal) return;
    detailsModal.modal.classList.remove("is-visible");
    detailsModal.modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("has-order-details-modal");
    currentOrderItems = [];
};

const fetchOrderItems = async (orderId) => {
    if (typeof supabaseClient === "undefined") return null;
    const tables = ["sc_order_items", "sc_order_items_vw", "sc_order_items_view", "order_items"];
    const columns = ["order_id", "OrderID", "orderId"];

    for (const table of tables) {
        for (const column of columns) {
            const { data, error } = await supabaseClient
                .from(table)
                .select("*")
                .eq(column, orderId);
            if (error) continue;
            if (Array.isArray(data) && data.length) return data;
        }
    }
    return [];
};

const loadOrders = async () => {
    const user = getScUser();
    if (!user) {
        window.location.href = "index.html";
        return;
    }

    const tableBody = document.getElementById("ordersTableBody");
    if (!tableBody) {
        console.error("Orders table body not found.");
        return;
    }

    if (!user.store_id) {
        tableBody.innerHTML =
            '<tr><td colspan="4" style="text-align:center; padding: 2rem;">Your account is not linked to a store in Supabase. <a href="sc-register.html" style="color:#D4AF37; font-weight:700;">Register your store</a> to view and track orders.</td></tr>';
        return;
    }

    if (typeof supabaseClient === "undefined") {
        tableBody.innerHTML =
            '<tr><td colspan="4" style="text-align:center; padding: 2rem;">Connect Supabase to view orders.</td></tr>';
        return;
    }

    // Show a loading state
    tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 2rem;">Loading orders...</td></tr>';

    const { data: orders, error } = await supabaseClient
        .from("sc_orders")
        .select("id, created_at, order_total, status")
        .eq("store_id", user.store_id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching orders:", error.message);
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 2rem; color: #f87171;">Error loading orders.</td></tr>';
        return;
    }

    tableBody.innerHTML = ""; // Clear loading/error state

    if (!orders || orders.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 2rem;">You have not placed any orders yet.</td></tr>';
        return;
    }

    orders.forEach(order => {
        const row = tableBody.insertRow();
        row.insertCell().textContent = order.id;
        row.insertCell().textContent = formatDate(order.created_at);
        row.insertCell().textContent = formatCurrency(order.order_total);
        row.insertCell().textContent = order.status;

        row.classList.add("sc-order-row");
        row.addEventListener("click", async () => {
            const items = await fetchOrderItems(order.id);
            const safeItems = Array.isArray(items) ? items : [];
            const total = safeItems.reduce((sum, item) => {
                const qty = Math.max(1, Number(item.qty) || 1);
                const price = Number(item.unit_price || item.price || 0);
                return sum + qty * price;
            }, 0);

            openDetailsModal({
                orderId: order.id,
                date: formatDate(order.created_at),
                status: order.status || "Pending",
                items: safeItems.length ? safeItems : [{
                    item_code: "-",
                    item_name: "No item details found for this order.",
                    qty: 1,
                    unit_price: 0
                }],
                total: Number.isFinite(total) && total > 0 ? total : Number(order.order_total) || 0
            });
        });
    });
};

document.addEventListener("DOMContentLoaded", loadOrders);
