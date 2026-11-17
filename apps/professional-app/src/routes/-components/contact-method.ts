import { Mail, MessageCircle, MessageSquare, type LucideIcon } from "lucide-react";

export const CONTACT_METHODS: Record<
  "email" | "sms" | "whatsapp",
  { icon: LucideIcon; label: string }
> = {
  email: { icon: Mail, label: "Email" },
  sms: { icon: MessageSquare, label: "SMS" },
  whatsapp: { icon: MessageCircle, label: "WhatsApp" },
};
