
import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

const API = "http://127.0.0.1:8000/api/";

const menus = [
  { id: "dashboard", label: "Dashboard", icon: "▦" },
  { id: "products", label: "Products", icon: "▤" },
  { id: "customers", label: "Customers", icon: "👤" },
  { id: "create-bill", label: "Create Bill", icon: "＋" },
  { id: "history", label: "Billing History", icon: "◷" },
];

function App() {
  const [page, setPage] = useState("dashboard");
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [bills, setBills] = useState([]);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async (p = page, q = search) => {
    setError("");
    try {
      const [pr, cu, bi] = await Promise.all([
        axios.get(API + "products/", {
          params: p === "products" && q ? { search: q } : {},
        }),
        axios.get(API + "customers/"),
        axios.get(API + "bills/"),
      ]);
      setProducts(Array.isArray(pr.data) ? pr.data : pr.data.results || []);
      setCustomers(Array.isArray(cu.data) ? cu.data : cu.data.results || []);
      setBills(Array.isArray(bi.data) ? bi.data : bi.data.results || []);
    } catch {
      setError("Backend Not connect. Check Django server port 8000 is running.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const clearMessages = () => {
    setMessage("");
    setError("");
  };

  const resetProduct = () => {
    setName("");
    setPrice("");
    setStock("");
    setEditingId(null);
  };

  const resetCustomer = () => {
    setCustomerName("");
    setPhone("");
    setEmail("");
    setEditingId(null);
  };

  const go = (id) => {
    setPage(id);
    setSearch("");
    clearMessages();
    load(id, "");
  };

  const saveProduct = async (e) => {
    e.preventDefault();
    clearMessages();
    if (!name.trim() || price === "" || stock === "") {
      setError("Fill all fields .");
      return;
    }
    if (+price <= 0 || +stock < 0 || !Number.isInteger(+stock)) {
      setError("Price must be in positive num; Stock must be in positive or whole num.");
      return;
    }
    const payload = {
      name: name.trim(),
      price: Number(price).toFixed(2),
      stock: Number(stock),
    };
    try {
      if (editingId !== null) {
        await axios.put(`${API}products/${editingId}/`, payload);
        setMessage("Product updated!");
      } else {
        await axios.post(API + "products/", payload);
        setMessage("Product added!");
      }
      resetProduct();
      await load("products", "");
      setSearch("");
    } catch (err) {
      setError(JSON.stringify(err.response?.data || "Product save failed"));
    }
  };

  const saveCustomer = async (e) => {
    e.preventDefault();
    clearMessages();
    if (!customerName.trim()) {
      setError("Customer name required.");
      return;
    }
    try {
      const payload = {
        name: customerName.trim(),
        phone,
        email,
      };
      if (editingId !== null) {
        await axios.put(`${API}customers/${editingId}/`, payload);
        setMessage("Customer updated!");
      } else {
        await axios.post(API + "customers/", payload);
        setMessage("Customer added!");
      }
      resetCustomer();
      await load("customers", "");
    } catch (err) {
      setError(JSON.stringify(err.response?.data || "Customer save failed"));
    }
  };

  const remove = async (type, id) => {
    if (!window.confirm("Delete this record?")) return;
    clearMessages();
    try {
      await axios.delete(`${API}${type}/${id}/`);
      setMessage("Deleted successfully!");
      await load(page, search);
    } catch (err) {
      setError(JSON.stringify(err.response?.data || "Delete failed"));
    }
  };

  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [billItems, setBillItems] = useState([{ product: "", quantity: 1 }]);
  const [savingBill, setSavingBill] = useState(false);

  const updateBillItem = (index, key, value) => {
    setBillItems((old) =>
      old.map((item, i) => i === index ? { ...item, [key]: value } : item)
    );
  };

  const billSubtotal = billItems.reduce((sum, item) => {
    const product = products.find((p) => String(p.id) === String(item.product));
    return sum + (product ? Number(product.price) * Number(item.quantity || 0) : 0);
  }, 0);

  const createBill = async (e) => {
    e.preventDefault();
    clearMessages();
    if (!selectedCustomer || billItems.some((i) => !i.product || !Number.isInteger(Number(i.quantity)) || Number(i.quantity) < 1)) {
      setError("Customer, product, valid quantity select first.");
      return;
    }
    setSavingBill(true);
    try {
      const response = await axios.post(API + "bills/", {
        customer: Number(selectedCustomer),
        items: billItems.map((i) => ({
          product: Number(i.product),
          quantity: Number(i.quantity),
        })),
      });
      setMessage(`Bill created! Invoice: ${response.data.invoice_number}`);
      setSelectedCustomer("");
      setBillItems([{ product: "", quantity: 1 }]);
      await load("create-bill", "");
    } catch (err) {
      setError(JSON.stringify(err.response?.data || "Bill creation failed"));
    } finally {
      setSavingBill(false);
    }
  };

  const money = (value) =>
    "₹" + Number(value || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const heading = menus.find((m) => m.id === page)?.label || "Dashboard";

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand"><span className="brand-icon">B</span><span>Billing<small>MANAGEMENT SYSTEM</small></span></div>
        {/* <p className="menu-title">WORKSPACE</p> */}
        <nav>
          {menus.map((m) => (
            <button key={m.id} className={`nav-item ${page === m.id ? "active" : ""}`} onClick={() => go(m.id)}>
              <span className="nav-icon">{m.icon}</span>{m.label}
            </button>
          ))}
        </nav>
        {/* <div className="sidebar-bottom"><span className="online-dot" /> System Online</div>/ */}
      </aside>

      <main className="main">
        <header className="topbar">
          <div><span className="breadcrumb"> </span><strong>{heading}</strong></div>
          <div className="admin"><span className="avatar">A</span><span>Administrator<small>Admin Panel</small></span></div>
        </header>

        <div className="content">
          <div className="page-heading">
            <div><h1>{page === "dashboard" ? "Welcome back!" : heading}</h1><p>Billing Management System / {heading}</p></div>
            {page === "products" && <button className="btn primary" onClick={() => { resetProduct(); clearMessages(); document.getElementById("product-form")?.scrollIntoView({ behavior: "smooth" }); }}>+ Add Product</button>}
          </div>

          {message && <div className="notice success">{message}</div>}
          {error && <div className="notice error">{error}</div>}

          {page === "dashboard" && <>
            <div className="stats">
              <div className="stat-card"><span className="stat-icon blue">▤</span><p>Total Products</p><h2>{products.length}</h2><small>Products in inventory</small></div>
              <div className="stat-card"><span className="stat-icon purple">👤</span><p>Total Customers</p><h2>{customers.length}</h2><small>Registered customers</small></div>
              <div className="stat-card"><span className="stat-icon orange">📑</span><p>Total Bills</p><h2>{bills.length}</h2><small>Invoices generated</small></div>
              <div className="stat-card"><span className="stat-icon green">₹</span><p>Total Sales</p><h2 className="sales">{money(bills.reduce((s, b) => s + Number(b.grand_total), 0))}</h2><small>All recorded invoices</small></div>
            </div>
            <section className="panel">
              <div className="panel-head"><div><h2>Recent Invoices</h2><p>Latest billing activity</p></div><button className="btn secondary" onClick={() => go("history")}>View all →</button></div>
              <BillTable bills={bills.slice().reverse().slice(0, 5)} money={money} />
            </section>
          </>}

          {page === "products" && <>
            <section className="panel" id="product-form">
              <h2>{editingId !== null ? "Edit Product" : "Add New Product"}</h2>
              <form className="form-grid" onSubmit={saveProduct}>
                <label>Product Name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter product name" required /></label>
                <label>Price (₹)<input type="number" min="0.01" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" required /></label>
                <label>Stock Quantity<input type="number" min="0" step="1" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="0" required /></label>
                <div className="form-actions"><button className="btn primary">{editingId !== null ? "Update Product" : "Save Product"}</button>{editingId !== null && <button type="button" className="btn secondary" onClick={resetProduct}>Cancel</button>}</div>
              </form>
            </section>
            <section className="panel">
              <div className="panel-head"><div><h2>Product Inventory</h2><p>{products.length} products found</p></div><input className="search" value={search} placeholder="Search products..." onChange={(e) => { setSearch(e.target.value); load("products", e.target.value); }} /></div>
              <div className="table-wrap"><table><thead><tr><th>ID</th><th>Product</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead><tbody>
                {products.map((p) => <tr key={p.id}><td>{p.id}</td><td><strong>{p.name}</strong></td><td>{money(p.price)}</td><td>{p.stock}</td><td><span className={`pill ${Number(p.stock) <= 5 ? "warning" : "good"}`}>{Number(p.stock) <= 5 ? "Low Stock" : "Available"}</span></td><td><button className="table-btn edit" onClick={() => { setEditingId(p.id); setName(p.name); setPrice(p.price); setStock(p.stock); document.getElementById("product-form")?.scrollIntoView({ behavior: "smooth" }); }}>Edit</button> <button className="table-btn delete" onClick={() => remove("products", p.id)}>Delete</button></td></tr>)}
                {!products.length && <tr><td colSpan="6" className="empty">No products found</td></tr>}
              </tbody></table></div>
            </section>
          </>}

          {page === "customers" && <>
            <section className="panel">
              <h2>{editingId !== null ? "Edit Customer" : "Add New Customer"}</h2>
              <form className="form-grid" onSubmit={saveCustomer}>
                <label>Customer Name<input value={customerName} onChange={(e) => setCustomerName(e.target.value)} required placeholder="Full name" /></label>
                <label>Phone Number<input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" /></label>
                <label>Email Address<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" /></label>
                <div className="form-actions"><button className="btn primary">{editingId !== null ? "Update Customer" : "Save Customer"}</button>{editingId !== null && <button type="button" className="btn secondary" onClick={resetCustomer}>Cancel</button>}</div>
              </form>
            </section>
            <section className="panel"><div className="panel-head"><div><h2>Customer Directory</h2><p>{customers.length} customers</p></div></div><div className="table-wrap"><table><thead><tr><th>ID</th><th>Name</th><th>Phone</th><th>Email</th><th>Actions</th></tr></thead><tbody>
              {customers.map((c) => <tr key={c.id}><td>{c.id}</td><td><strong>{c.name}</strong></td><td>{c.phone || "—"}</td><td>{c.email || "—"}</td><td><button className="table-btn edit" onClick={() => { setEditingId(c.id); setCustomerName(c.name); setPhone(c.phone || ""); setEmail(c.email || ""); }}>Edit</button> <button className="table-btn delete" onClick={() => remove("customers", c.id)}>Delete</button></td></tr>)}
              {!customers.length && <tr><td colSpan="5" className="empty">No customers found</td></tr>}
            </tbody></table></div></section>
          </>}

          {page === "create-bill" && <section className="panel bill-panel">
            <h2>Create New Invoice</h2><p className="muted">Select a customer and add products to generate an invoice.</p>
            <form onSubmit={createBill}>
              <label className="field">Customer<select value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)} required><option value="">Select customer</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name} {c.phone ? `— ${c.phone}` : ""}</option>)}</select></label>
              <div className="panel-head"><h2>Invoice Items</h2><button type="button" className="btn secondary" onClick={() => setBillItems([...billItems, { product: "", quantity: 1 }])}>+ Add Item</button></div>
              {billItems.map((item, index) => {
                const product = products.find((p) => String(p.id) === String(item.product));
                return <div className="bill-row" key={index}><label>Product<select value={item.product} onChange={(e) => updateBillItem(index, "product", e.target.value)} required><option value="">Select product</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name} — {money(p.price)} (Stock: {p.stock})</option>)}</select></label><label>Quantity<input type="number" min="1" max={product?.stock ?? undefined} value={item.quantity} onChange={(e) => updateBillItem(index, "quantity", e.target.value)} required /></label><div><span className="muted">Item subtotal</span><strong className="item-total">{money((product?.price || 0) * Number(item.quantity || 0))}</strong></div>{billItems.length > 1 && <button type="button" className="table-btn delete" onClick={() => setBillItems(billItems.filter((_, i) => i !== index))}>Remove</button>}</div>;
              })}
              <div className="totals"><div><span>Subtotal</span><strong>{money(billSubtotal)}</strong></div><div><span>GST (18%)</span><strong>{money(billSubtotal * 0.18)}</strong></div><div className="grand"><span>Grand Total</span><strong>{money(billSubtotal * 1.18)}</strong></div></div>
              <button className="btn primary create-btn" disabled={savingBill}>{savingBill ? "Creating..." : "Generate Invoice"}</button>
            </form>
          </section>}

          {page === "history" && <section className="panel"><div className="panel-head"><div><h2>Billing History</h2><p>All generated invoices</p></div></div><BillTable bills={bills.slice().reverse()} money={money} /></section>}
        </div>
      </main>
    </div>
  );
}

function BillTable({ bills, money }) {
  return <div className="table-wrap"><table><thead><tr><th>Invoice No.</th><th>Customer ID</th><th>Date</th><th>Subtotal</th><th>GST</th><th>Total</th><th>Status</th></tr></thead><tbody>
    {bills.map((b) => <tr key={b.id}><td><strong>{b.invoice_number}</strong></td><td>{b.customer}</td><td>{b.created_at ? new Date(b.created_at).toLocaleDateString("en-IN") : "—"}</td><td>{money(b.subtotal)}</td><td>{money(b.gst)}</td><td><strong>{money(b.grand_total)}</strong></td><td><span className={`pill ${b.payment_status === "Paid" ? "good" : "warning"}`}>{b.payment_status}</span></td></tr>)}
    {!bills.length && <tr><td colSpan="7" className="empty">No invoices yet</td></tr>}
  </tbody></table></div>;
}

export default App;
