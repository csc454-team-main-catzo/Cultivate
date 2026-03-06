import { CreditCard, MapPin, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface CheckoutItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface CheckoutFormProps {
  totalAmount: number;
  items: CheckoutItem[];
  onPlaceOrder: () => void;
  onCancel?: () => void;
}

export function CheckoutForm({
  totalAmount,
  items,
  onPlaceOrder,
  onCancel,
}: CheckoutFormProps) {
  const formattedTotal = `$${totalAmount.toFixed(2)}`;

  return (
    <div className="w-full">
      <Card className="w-full shadow-xl border rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base font-semibold tracking-tight">
            Order summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Delivery */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-4 w-4 text-zinc-400" />
              <span className="text-xs font-medium text-zinc-900">
                Delivery address
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              742 Evergreen Terrace
            </p>
            <p className="text-xs text-zinc-500">Springfield, USA</p>
          </div>

          {items.length > 0 && (
            <>
              <Separator />
              {/* Items */}
              <div>
                <span className="text-xs font-medium text-zinc-900">
                  Items in this order
                </span>
                <ul className="mt-2 space-y-1.5">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between text-xs text-zinc-600"
                    >
                      <span className="truncate max-w-[180px]">
                        {item.name}
                        <span className="text-zinc-400"> × {item.quantity}</span>
                      </span>
                      <span className="font-medium text-zinc-900">
                        ${ (item.price * item.quantity).toFixed(2) }
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          <Separator />

          {/* Billing */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="h-4 w-4 text-zinc-400" />
              <span className="text-xs font-medium text-zinc-900">
                Billing method
              </span>
            </div>
            <p className="text-xs text-zinc-500">Mock payment method</p>
            <p className="text-xs text-zinc-500">**** **** **** 1234</p>
          </div>

          <Separator />

          {/* Discount */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Tag className="h-4 w-4 text-zinc-400" />
              <span className="text-xs font-medium text-zinc-900">
                Apply discount code
              </span>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Enter discount code"
                className="flex-1 h-9 text-xs"
              />
              <Button variant="secondary" size="sm">
                Redeem
              </Button>
            </div>
          </div>

          <Separator />

          {/* Summary */}
          <div>
            <span className="text-xs font-medium text-zinc-900">
              Order total
            </span>
            <div className="grid grid-cols-2 gap-y-1 text-xs mt-2">
              <span className="text-zinc-500">Item total:</span>
              <span className="text-right font-medium">
                {formattedTotal}
              </span>
              <span className="text-zinc-500">Delivery fee:</span>
              <span className="text-right font-medium">$0.00</span>
              <span className="text-zinc-500">Taxes:</span>
              <span className="text-right font-medium">$0.00</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3 bg-white shadow-lg">
        <span className="text-base font-semibold text-zinc-900">
          {formattedTotal}
        </span>
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs text-zinc-600"
              onClick={onCancel}
            >
              Back
            </Button>
          )}
          <Button
            className="px-5"
            size="sm"
            type="button"
            onClick={onPlaceOrder}
          >
            Place order
          </Button>
        </div>
      </div>
    </div>
  );
}

