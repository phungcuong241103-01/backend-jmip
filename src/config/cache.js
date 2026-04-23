// ═══════════════════════════════════════════════════════════════════════════════
// In-Memory Cache — Lưu tạm kết quả DB vào RAM để trả về nhanh
//
// Cách hoạt động:
//   1. Request đến → kiểm tra cache có dữ liệu chưa?
//   2. Có → trả về ngay (< 1ms), KHÔNG query DB
//   3. Chưa có / hết hạn → query DB → lưu vào cache → trả về
//
// Dùng cho: /stats, /filters, /analytics/* (dữ liệu ít thay đổi)
// KHÔNG dùng cho: /jobs (kết quả phụ thuộc filter của user)
// ═══════════════════════════════════════════════════════════════════════════════

class SimpleCache {
  constructor() {
    this.store = new Map();
  }

  // Lấy dữ liệu từ cache, trả null nếu không có hoặc hết hạn
  get(key) {
    const item = this.store.get(key);
    if (!item) return null;

    // Kiểm tra hết hạn
    if (Date.now() > item.expiry) {
      this.store.delete(key);
      return null;
    }

    return item.value;
  }

  // Lưu dữ liệu vào cache với thời gian sống (TTL)
  set(key, value, ttlSeconds = 300) {
    this.store.set(key, {
      value,
      expiry: Date.now() + ttlSeconds * 1000
    });
  }

  // Xóa 1 key cụ thể
  delete(key) {
    this.store.delete(key);
  }

  // Xóa toàn bộ cache (dùng khi scrape data mới)
  clear() {
    this.store.clear();
    console.log('🗑️  Cache cleared');
  }

  // Xem cache đang lưu bao nhiêu entries
  size() {
    return this.store.size;
  }
}

// Export 1 instance duy nhất (singleton) — dùng chung toàn app
module.exports = new SimpleCache();
