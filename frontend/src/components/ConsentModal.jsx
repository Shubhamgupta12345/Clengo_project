import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

export default function ConsentModal({ open, onOpenChange, onAgree }) {
  const [checked, setChecked] = useState(false);

  const handleAgree = () => {
    if (!checked) return;
    onAgree();
    onOpenChange(false);
    setChecked(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="consent-modal">
        <DialogHeader>
          <DialogTitle>Before you sign in</DialogTitle>
          <DialogDescription>
            To create your account and process your orders, Clengo stores
            information such as your name, email address, profile picture,
            and order/booking details. We use this only to operate the
            service (order management, support, and communication) and do
            not sell your data to third parties.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-3 py-2">
          <Checkbox
            id="consent-checkbox"
            checked={checked}
            onCheckedChange={(v) => setChecked(Boolean(v))}
            data-testid="consent-checkbox"
          />
          <label
            htmlFor="consent-checkbox"
            className="text-sm leading-snug cursor-pointer select-none"
          >
            I understand and agree that Clengo will store my information as
            described above.
          </label>
        </div>

        <DialogFooter>
          <button
            onClick={handleAgree}
            disabled={!checked}
            data-testid="consent-continue-btn"
            className="w-full sm:w-auto px-5 py-2.5 bg-[#111111] text-white rounded-full text-sm font-semibold hover:bg-[#D4A017] hover:text-black transition-colors duration-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#111111] disabled:hover:text-white"
          >
            Agree & Continue with Google
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}