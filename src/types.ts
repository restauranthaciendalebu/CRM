export enum Role {
  ADMIN = "ADMIN",
  WAITER = "WAITER",
  KITCHEN = "KITCHEN",
}

export enum TableStatus {
  FREE = "FREE",
  OCCUPIED = "OCCUPIED",
  BILL_REQUESTED = "BILL_REQUESTED",
  RESERVED = "RESERVED",
}

export enum OrderStatus {
  PENDING_APPROVAL = "PENDING_APPROVAL", // When a customer orders via QR
  PENDING_KITCHEN = "PENDING_KITCHEN",   // Sent to kitchen but not preparing yet
  PREPARING = "PREPARING",
  READY = "READY",                       // Ready to be served by waiter
  DELIVERED = "DELIVERED",               // Served to customer
  CLOSED = "CLOSED",                     // Fully paid
}

export enum OrderItemStatus {
  PENDING = "PENDING",
  PREPARING = "PREPARING",
  READY = "READY",
  DELIVERED = "DELIVERED",
}

export enum LoyaltyTxType {
  EARNED = "EARNED",
  REDEEMED = "REDEEMED",
}

export enum PromoType {
  DISCOUNT = "DISCOUNT",                 // percentage discount
  TWO_FOR_ONE = "TWO_FOR_ONE",
  POINTS_MULTIPLIER = "POINTS_MULTIPLIER",
}

export enum PaymentMethod {
  CASH = "CASH",
  DEBIT = "DEBIT",
  CREDIT = "CREDIT",
  TRANSFER = "TRANSFER",
}

export enum ReservationStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  CANCELLED = "CANCELLED",
  ARRIVED = "ARRIVED",
}

export enum ShiftStatus {
  OPEN = "OPEN",
  CLOSED = "CLOSED",
}

export interface User {
  id: string;
  pin: string;
  name: string;
  role: Role;
  permissions?: string[];
}

export interface Table {
  id: string;
  number: number;
  seats: number;
  status: TableStatus;
  zone: string; // e.g. "Salón Principal", "Terraza", "VIP"
  x: number;    // positional coordinate for visual map
  y: number;    // positional coordinate for visual map
}

export interface Category {
  id: string;
  name: string;
  icon: string; // Lucide icon name
}

export interface RecipeItem {
  ingredientId: string;
  quantity: number; // e.g., 150 grams
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  categoryId: string;
  allergens: string[]; // e.g. ["Gluten", "Lácteos"]
  isAvailable: boolean;
  recipe: RecipeItem[]; // list of ingredients required to make this
  requiresKitchen?: boolean; // false = served directly (e.g. bottled wine, water). Default: true
}

export interface Ingredient {
  id: string;
  name: string;
  stock: number;
  unit: string; // e.g. "g", "ml", "unidades"
  minStock: number;
}

export interface SelectedItemModifier {
  modifierId: string;
  optionId: string;
  name: string;
  extraPrice: number;
}

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  notes?: string;
  status: OrderItemStatus;
  selectedModifiers: SelectedItemModifier[];
  tanda?: number; // e.g., 1 for starters, 2 for main courses
}

export interface Order {
  id: string;
  tableId: string;
  waiterId?: string;
  status: OrderStatus;
  customerCount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  customerPhone?: string; // linked customer if registered/found
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  birthDate?: string; // YYYY-MM-DD
  allergies: string[];
  points: number;
  notes?: string;
}

export interface CustomerLoyaltyTx {
  id: string;
  customerId: string;
  points: number;
  type: LoyaltyTxType;
  description: string;
  createdAt: string;
}

export interface Promotion {
  id: string;
  name: string;
  code: string;
  type: PromoType;
  value: number; // e.g., 15 for 15% discount
  active: boolean;
  conditions?: string;
}

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  method: PaymentMethod;
  tip: number;
  discount: number;
  createdAt: string;
}

export interface Reservation {
  id: string;
  customerName: string;
  customerPhone: string;
  customerCount: number;
  dateTime: string;
  tableId?: string;
  notes?: string;
  status: ReservationStatus;
}

export interface Shift {
  id: string;
  userId: string;
  openedAt: string;
  closedAt?: string;
  initialCash: number;
  finalCash?: number;
  status: ShiftStatus;
}

export interface Notification {
  id: string;
  tableNumber: number;
  type: "CALL_WAITER" | "REQUEST_BILL" | "NEW_ORDER";
  createdAt: string;
  resolved: boolean;
  notes?: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  userName?: string;
  action: string;
  details?: string;
  createdAt: string;
}

export interface InventoryTransaction {
  id: string;
  ingredientId: string;
  ingredientName: string;
  change: number; // e.g. -150 or +1000
  type: "ORDER_DEDUCTION" | "MANUAL_ADDITION" | "MANUAL_SUBTRACTION" | "VOID_RESTORE";
  referenceId?: string; // orderId, etc.
  createdAt: string;
}

export interface RestaurantState {
  users: User[];
  tables: Table[];
  categories: Category[];
  products: Product[];
  ingredients: Ingredient[];
  orders: Order[];
  customers: Customer[];
  loyaltyTxs: CustomerLoyaltyTx[];
  promotions: Promotion[];
  payments: Payment[];
  reservations: Reservation[];
  shifts: Shift[];
  notifications: Notification[];
  auditLogs?: AuditLog[];
  inventoryTransactions?: InventoryTransaction[];
  onlyViewMenuQr?: boolean;
}
