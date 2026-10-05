let products = [];                   // 商品一覧
let selectedCategory = "すべて";      // 選択中のカテゴリ

/**
 * localStorage から配列を読み込んで返す。
 * データがない・壊れている・配列でない場合は空の配列を返す
 * @param {string} key 保存したときのキー名
 * @returns {Array} 読み込んだ配列
 */
function loadArray(key) {
    try {
        const saved = JSON.parse(localStorage.getItem(key));
        return Array.isArray(saved) ? saved : [];
    } catch (error) {
        console.error(`${key} の読み込みに失敗しました:`, error);
        return [];
    }
}

let cart = loadArray("cart");           // カートの中身。商品idと数量の配列 [{id: 1, quantity: 2}, ...]
let favorites = loadArray("favorites"); // お気に入りの商品idの配列

const productListElement = document.getElementById("product-list");
const favoriteListElement = document.getElementById("favorite-list");
const categoryButtonsElement = document.getElementById("category-buttons");
const cartItemsElement = document.getElementById("cart-items");
const subtotalElement = document.getElementById("subtotal");
const taxElement = document.getElementById("tax");
const totalElement = document.getElementById("total");

/** 商品データを JSON ファイルから読み込む */
async function loadProducts() {
    try {
        const response = await fetch("data/products.json");
        if (!response.ok) {
            throw new Error(`HTTPエラー: ${response.status}`);
        }
        products = await response.json();
        return true;
    } catch (error) {
        console.error("商品データの取得に失敗しました:", error);
        return false;
    }
}

/** カートとお気に入りの商品データを localStorage に保存する */
function saveData() {
    try {
        localStorage.setItem("cart", JSON.stringify(cart));
        localStorage.setItem("favorites", JSON.stringify(favorites));
    } catch (error) {
        console.error("データの保存に失敗しました:", error);
    }
}

/**
 * カートに商品を追加する。すでに入っている場合は数量を増やす
 * @param {number} id 商品ID
 */
function addToCart(id) {
    const item = cart.find(cartItem => cartItem.id === id);

    if (item === undefined) {
        cart.push({ id: id, quantity: 1 });
        saveData();
        render();
    } else {
        changeQuantity(id, 1);
    }
}

/**
 * カート内の商品の数量を変更する
 * @param {number} id 商品ID
 * @param {number} diff 数量の変化量
 */
function changeQuantity(id, diff) {
    const item = cart.find(cartItem => cartItem.id === id);
    const newQuantity = item.quantity + diff;

    if (newQuantity < 1) {
        removeFromCart(id);
        return;
    }
    if (newQuantity > 99) {
        return;
    }

    item.quantity = newQuantity;
    saveData();
    render();
}

/**
 * カートから商品を削除する
 * @param {number} id 商品ID
 */
function removeFromCart(id) {
    cart = cart.filter(cartItem => cartItem.id !== id);
    saveData();
    render();
}

/**
 * お気に入りの商品を追加または削除する
 * @param {number} id 商品ID
 */
function toggleFavorite(id) {
    if (favorites.includes(id)) {
        favorites = favorites.filter(favoriteId => favoriteId !== id);
    } else {
        favorites.push(id);
    }
    saveData();
    render();
}

/** タブの切り替え処理 */
function setupTabs() {
    const tabButtons = document.querySelectorAll(".tab-button");
    const tabPanels = document.querySelectorAll(".tab-panel");

    tabButtons.forEach((button, index) => {
        button.addEventListener("click", () => {
            tabPanels.forEach((panel) => panel.classList.remove("active"));
            tabButtons.forEach((tabButton) => tabButton.classList.remove("active"));

            button.classList.add("active");
            tabPanels[index].classList.add("active");

            //タブが切り替わったら、選択中のカテゴリを「すべて」にリセット
            selectedCategory = "すべて";
            render();
        });
    });
}

/**
 * 小計・消費税額・合計を計算して返す
 * @returns {Object} 小計・消費税額・合計のオブジェクト { subtotal, tax, total }
 */
function calcTotals() {
    let subtotal = 0;

    cart.forEach((item) => {
        const product = products.find((p) => p.id === item.id);
        // 小計 = 商品の税抜価格 × 数量
        subtotal += product.price * item.quantity;
    });

    // 消費税額 = 小計 × 10%（小数点以下切り捨て）
    const tax = Math.floor(subtotal * 0.1);
    // 合計 = 小計 + 消費税額
    const total = subtotal + tax;

    return { subtotal: subtotal, tax: tax, total: total };
}

/**
 * 価格をフォーマットして返す（例： 1000 → 1,000円）
 * @param {number} n 価格
 * @returns {string} フォーマットされた価格
 */
function formatPrice(n) {
    return n.toLocaleString("ja-JP") + "円";
}

/**
 * 商品一覧を画面に表示する
 * @param {Array} items 表示する商品の配列
 * @param {HTMLElement} container 表示するコンテナ
 * @param {string} emptyText 空の場合の表示テキスト
 * @returns {void} 
 */
function renderProductList(items, container, emptyText) {
    container.innerHTML = "";

    if (items.length === 0) {
        container.innerHTML = `<p class="empty-message">${emptyText}</p>`;
        return;
    }

    items.forEach((product) => {
        const isFavorite = favorites.includes(product.id);
        const favoriteClass = isFavorite ? "active" : "";
        const favoriteIcon = isFavorite ? "❤️" : "♡";

        const isInCart = cart.some((item) => item.id === product.id);
        const cartButtonClass = isInCart ? "remove-cart-button" : "add-button";
        const cartButtonText = isInCart ? "カートから外す" : "カートに入れる";

        container.innerHTML += `
      <div class="product-card">
        <div class="product-image" style="background-color: ${product.image};"></div>
        <p class="product-name">${product.name}</p>
        <p class="product-category">${product.category}</p>
        <p><strong>${formatPrice(product.price)}</strong><span class="sub-text">（税抜）</span></p>
        <div class="product-actions">
          <button class="${cartButtonClass}" data-id="${product.id}">${cartButtonText}</button>
          <button class="favorite-button ${favoriteClass}" data-id="${product.id}">${favoriteIcon}</button>
        </div>
      </div>
    `;
    });
}

/** カテゴリボタンを表示する */
function renderCategoryButtons() {
    const categories = ["すべて"];
    products.forEach((product) => {
        if (!categories.includes(product.category)) {
            categories.push(product.category);
        }
    });

    categoryButtonsElement.innerHTML = "";
    categories.forEach((category) => {
        let activeClass = "";
        if (category === selectedCategory) {
            activeClass = "active";
        }
        categoryButtonsElement.innerHTML += `
      <button class="category-button ${activeClass}" data-category="${category}">${category}</button>
    `;
    });
}

/** カートの中身を画面に表示する */
function renderCart() {
    cartItemsElement.innerHTML = "";

    if (cart.length === 0) {
        cartItemsElement.innerHTML = `<p class="empty-message">カートは空です</p>`;
    }

    cart.forEach((item) => {
        const product = products.find((p) => p.id === item.id);

        cartItemsElement.innerHTML += `
      <div class="cart-item">
        <span>${product.name}<br><span class="sub-text">${formatPrice(product.price)} × ${item.quantity}</span></span>
        <span class="cart-item-controls">
          <button class="minus-button" data-id="${item.id}">−</button>
          <span>${item.quantity}</span>
          <button class="plus-button" data-id="${item.id}">＋</button>
          <button class="remove-button" data-id="${item.id}">✕</button>
        </span>
      </div>
    `;
    });

    // 金額を表示する
    const totals = calcTotals();
    subtotalElement.textContent = formatPrice(totals.subtotal);
    taxElement.textContent = formatPrice(totals.tax);
    totalElement.textContent = formatPrice(totals.total);
}

/**
 * 画面全体を描き直す。
 * データを変えた後は必ずこの関数を呼ぶ。
 */
function render() {
    renderCategoryButtons();

    // 選択中のカテゴリで商品を絞り込む
    let filteredProducts = products;
    if (selectedCategory !== "すべて") {
        filteredProducts = products.filter((product) => product.category === selectedCategory);
    }
    renderProductList(filteredProducts, productListElement, "該当する商品はありません");

    // お気に入りに入っている商品だけを表示する
    const favoriteProducts = filteredProducts.filter((product) => favorites.includes(product.id));
    renderProductList(favoriteProducts, favoriteListElement, "該当するお気に入り商品はありません");

    renderCart();
}

// ボタンのクリック処理
document.addEventListener("click", (event) => {
    const button = event.target;

    if (button.classList.contains("category-button")) {
        selectedCategory = button.dataset.category;
        render();
        return;
    }

    const id = Number(button.dataset.id);

    if (button.classList.contains("add-button")) {
        addToCart(id);
    } else if (button.classList.contains("remove-cart-button")) {
        removeFromCart(id);
    } else if (button.classList.contains("favorite-button")) {
        toggleFavorite(id);
    } else if (button.classList.contains("minus-button")) {
        changeQuantity(id, -1);
    } else if (button.classList.contains("plus-button")) {
        changeQuantity(id, 1);
    } else if (button.classList.contains("remove-button")) {
        removeFromCart(id);
    }
});

// 読み込み完了後の処理
document.addEventListener("DOMContentLoaded", async () => {
    setupTabs();
    const isLoaded = await loadProducts();
    if (!isLoaded) {
        // 商品データが読み込めなかったら読み込めなかったことをユーザーに伝える
        const errorHtml = `<p class="empty-message">商品データを読み込めませんでした。しばらくしてからページを再読み込みしてください。</p>`;
        productListElement.innerHTML = errorHtml;
        favoriteListElement.innerHTML = errorHtml;
        cartItemsElement.innerHTML = errorHtml;
        return;
    }

    // products.jsonにない商品がカートに残っていたら取り除く
    cart = cart.filter((item) => products.some((p) => p.id === item.id));

    render();
});