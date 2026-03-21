(() => {
  window.scUtils = {
    r2BaseUrl: "https://pub-431a1eccf270455a99eab6163255ef53.r2.dev",
    placeholderImage: "https://pub-431a1eccf270455a99eab6163255ef53.r2.dev/empty-product.svg",

    formatCurrency: (value, currency = "PHP") => {
      const number = Number(value);
      if (!Number.isFinite(number)) return `${currency} 0.00`;
      return `${currency} ${number.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    },

    getScUser: () => {
      try {
        return JSON.parse(localStorage.getItem("scUser") || "null");
      } catch {
        return null;
      }
    }
  };
})();