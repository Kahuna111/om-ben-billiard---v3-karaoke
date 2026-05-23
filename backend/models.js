const mongoose = require("mongoose");

// --- SCHEMAS ---

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ["admin", "kasir", "engineer", "tv"],
    default: "kasir",
  },
});

const TableSchema = new mongoose.Schema({
  name: { type: String, required: true },
  hourlyRate: { type: Number, default: 15000 },
  status: {
    type: String,
    enum: ["available", "occupied"],
    default: "available",
  },
  description: { type: String },
});

const RoomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  hourlyRate: { type: Number, default: 50000 },
  status: {
    type: String,
    enum: ["available", "occupied"],
    default: "available",
  },
  description: { type: String },
});

const OrderSchema = new mongoose.Schema({
  itemId: String,
  name: String,
  price: Number,
  quantity: Number,
  subtotal: Number,
  timestamp: { type: Date, default: Date.now },
});

const SessionSchema = new mongoose.Schema({
  tableId: { type: mongoose.Schema.Types.ObjectId, ref: "Table" },
  tableName: String,
  customerName: String,
  type: { type: String, enum: ["open", "duration"] },
  startTime: { type: Date, default: Date.now },
  endTime: Date,
  hourlyRate: Number,
  orders: [OrderSchema],
});

const KaraokeSessionSchema = new mongoose.Schema({
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Room" },
  roomName: String,
  customerName: String,
  type: { type: String, enum: ["open", "duration"] },
  startTime: { type: Date, default: Date.now },
  endTime: Date,
  hourlyRate: Number,
  durationMinutes: Number,
  orders: [OrderSchema],
});

const TransactionSchema = new mongoose.Schema({
  sessionId: String,
  tableId: String,
  roomId: String,
  tableName: String,
  customerName: String,
  startTime: Date,
  endTime: Date,
  durationMinutes: Number,
  tableAmount: Number,
  ordersAmount: Number,
  amount: Number,
  type: { type: String, default: "billiard" }, // 'billiard', 'karaoke', 'pos'
  date: { type: String }, // YYYY-MM-DD
  isArchived: { type: Boolean, default: false },
  orders: [OrderSchema],
});

const EmployeeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: String,
  phone: String,
  createdAt: { type: Date, default: Date.now },
});

const AttendanceSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
  employeeName: String,
  type: { type: String, enum: ["in", "out"] },
  timestamp: { type: Date, default: Date.now },
  date: { type: String },
  isArchived: { type: Boolean, default: false },
});

const MenuSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: String,
  price: Number,
  stock: { type: Number, default: 0 },
});

const MenuCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
});

// --- MODELS ---

module.exports = {
  User: mongoose.model("User", UserSchema),
  Table: mongoose.model("Table", TableSchema),
  Room: mongoose.model("Room", RoomSchema),
  Session: mongoose.model("Session", SessionSchema),
  KaraokeSession: mongoose.model("KaraokeSession", KaraokeSessionSchema),
  Transaction: mongoose.model("Transaction", TransactionSchema),
  Employee: mongoose.model("Employee", EmployeeSchema),
  Attendance: mongoose.model("Attendance", AttendanceSchema),
  Menu: mongoose.model("Menu", MenuSchema),
  MenuCategory: mongoose.model("MenuCategory", MenuCategorySchema),
};
