import { getItemPrice, menu } from "../data/menu";
export type CartLine = { key: string; id: string; options: Record<string, string>; spice?: string; instructions: string; quantity: number };
export type CartAction = { type: "add"; line: CartLine } | { type: "quantity"; key: string; quantity: number } | { type: "remove"; key: string } | { type: "edit"; key: string; line: CartLine } | { type: "restore"; lines: CartLine[] } | { type: "clear" };
export function cartReducer(cart: CartLine[], action: CartAction): CartLine[] {
  switch (action.type) {
    case "add": {
      const existing = cart.find((line) => line.id === action.line.id && JSON.stringify(line.options) === JSON.stringify(action.line.options) && line.spice === action.line.spice && line.instructions === action.line.instructions);
      return existing ? cart.map((line) => line.key === existing.key ? { ...line, quantity: Math.min(20, line.quantity + action.line.quantity) } : line) : [...cart, action.line];
    }
    case "quantity": return action.quantity <= 0 ? cart.filter((line) => line.key !== action.key) : cart.map((line) => line.key === action.key ? { ...line, quantity: Math.min(20, action.quantity) } : line);
    case "remove": return cart.filter((line) => line.key !== action.key);
    case "edit": return cart.map((line) => line.key === action.key ? action.line : line);
    case "restore": return action.lines;
    case "clear": return [];
  }
}
export function cartTotal(cart: CartLine[]): number { return cart.reduce((sum, line) => { const item = menu.find((item) => item.id === line.id)!; return sum + getItemPrice(item, line.options) * line.quantity; }, 0); }
export function restoreCart(raw: string): CartLine[] {
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value) || value.length > 50) return [];
    return value.filter((line): line is CartLine => {
      const item = menu.find((entry) => entry.id === line?.id);
      if (!item || typeof line.key !== "string" || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 20 || typeof line.instructions !== "string" || line.instructions.length > 300 || !line.options || typeof line.options !== "object") return false;
      try { getItemPrice(item, line.options); return true; } catch { return false; }
    });
  } catch { return []; }
}
