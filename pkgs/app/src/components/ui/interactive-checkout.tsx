import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CreditCard, Minus, Plus, ShoppingCart, X } from "lucide-react";
import NumberFlow from "@number-flow/react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  color: string;
}

export interface CartItem extends Product {
  quantity: number;
}

interface InteractiveCheckoutProps {
  products?: Product[];
  cart?: CartItem[];
  onCartChange?: (cart: CartItem[]) => void;
}

const defaultProducts: Product[] = [
  {
    id: "1",
    name: "Heirloom Tomatoes (5kg)",
    price: 24.5,
    category: "Fresh produce",
    image:
      "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&w=600&q=80",
    color: "Red / mixed sizes",
  },
  {
    id: "2",
    name: "Seasonal Greens Mix (3kg)",
    price: 18.75,
    category: "Leafy greens",
    image:
      "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80",
    color: "Green / assorted",
  },
  {
    id: "3",
    name: "Free-range Eggs (30ct)",
    price: 14.0,
    category: "Dairy & eggs",
    image:
      "https://images.unsplash.com/photo-1517959105821-eaf2591984c2?auto=format&fit=crop&w=600&q=80",
    color: "Brown shell",
  },
];

function InteractiveCheckout({
  products = defaultProducts,
  cart: controlledCart,
  onCartChange,
}: InteractiveCheckoutProps) {
  const [internalCart, setInternalCart] = useState<CartItem[]>([]);
  const cart = controlledCart ?? internalCart;

  const setCart = useCallback(
    (next: CartItem[] | ((current: CartItem[]) => CartItem[])) => {
      const computed =
        typeof next === "function" ? (next as (c: CartItem[]) => CartItem[])(cart) : next;
      if (onCartChange) onCartChange(computed);
      else setInternalCart(computed);
    },
    [cart, onCartChange]
  );

  const addToCart = (product: Product) => {
    setCart((currentCart) => {
      const existingItem = currentCart.find((item) => item.id === product.id);
      if (existingItem) {
        return currentCart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...currentCart, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((currentCart) =>
      currentCart.filter((item) => item.id !== productId),
    );
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((currentCart) =>
      currentCart.map((item) => {
        if (item.id === productId) {
          const newQuantity = item.quantity + delta;
          return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
        }
        return item;
      }),
    );
  };

  const totalItems = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );
  const totalPrice = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  const handleMockCheckout = () => {
    if (totalItems === 0) {
      window.alert("Your cart is empty. Add some items before checking out.");
      return;
    }
    window.alert(
      "This is a mock checkout flow.\n\nIn a real deployment, this would hand off to a payment provider or purchase order workflow. No real payment is processed.",
    );
  };

  return (
    <div className="w-full">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-3">
          {products.map((product) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "group",
                "p-4 rounded-xl",
                "bg-white",
                "border border-zinc-200",
                "hover:border-zinc-300",
                "transition-all duration-200",
              )}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "relative w-12 h-12 rounded-lg overflow-hidden",
                      "bg-zinc-100",
                      "transition-colors duration-200",
                      "group-hover:bg-zinc-200",
                    )}
                  >
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-zinc-900">
                        {product.name}
                      </h3>
                      <span className="px-2 py-0.5 text-xs rounded-full bg-zinc-100 text-zinc-500">
                        {product.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                      <span>${product.price.toFixed(2)}</span>
                      <span>•</span>
                      <span>{product.color}</span>
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addToCart(product)}
                  className="gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </Button>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className={cn(
            "w-full lg:w-80 flex flex-col",
            "p-4 rounded-xl",
            "bg-white",
            "border border-zinc-200",
            "lg:sticky lg:top-4",
            "max-h-[32rem]",
          )}
        >
          <div className="flex items-center gap-2 mb-3">
            <ShoppingCart className="w-4 h-4 text-zinc-500" />
            <h2 className="text-sm font-medium text-zinc-900">
              Cart ({totalItems})
            </h2>
          </div>

          <motion.div
            className={cn(
              "flex-1 overflow-y-auto",
              "min-h-0",
              "-mx-4 px-4",
              "space-y-3",
            )}
          >
            <AnimatePresence initial={false} mode="popLayout">
              {cart.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{
                    opacity: { duration: 0.2 },
                    layout: { duration: 0.2 },
                  }}
                  className={cn(
                    "flex items-center gap-3",
                    "p-2 rounded-lg",
                    "bg-zinc-50",
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-zinc-900 truncate">
                        {item.name}
                      </span>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => removeFromCart(item.id)}
                        className="p-1 rounded-md hover:bg-zinc-200"
                      >
                        <X className="w-3 h-3 text-zinc-400" />
                      </motion.button>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-1">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => updateQuantity(item.id, -1)}
                          className="p-1 rounded-md hover:bg-zinc-200"
                        >
                          <Minus className="w-3 h-3" />
                        </motion.button>
                        <motion.span
                          layout
                          className="text-xs text-zinc-600 w-4 text-center"
                        >
                          {item.quantity}
                        </motion.span>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => updateQuantity(item.id, 1)}
                          className="p-1 rounded-md hover:bg-zinc-200"
                        >
                          <Plus className="w-3 h-3" />
                        </motion.button>
                      </div>
                      <motion.span
                        layout
                        className="text-xs text-zinc-500"
                      >
                        ${(item.price * item.quantity).toFixed(2)}
                      </motion.span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          <motion.div
            layout
            className={cn(
              "pt-3 mt-3",
              "border-t border-zinc-200",
              "bg-white",
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-zinc-900">Total</span>
              <motion.span
                layout
                className="text-sm font-semibold text-zinc-900"
              >
                <NumberFlow value={Number(totalPrice.toFixed(2))} />
              </motion.span>
            </div>
            <Button
              size="sm"
              className="w-full gap-2"
              type="button"
              onClick={handleMockCheckout}
            >
              <CreditCard className="w-4 h-4" />
              Checkout
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

export { InteractiveCheckout };

