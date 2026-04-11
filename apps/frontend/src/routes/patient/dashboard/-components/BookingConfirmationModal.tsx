import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { RadioGroup } from "@/components/ui/RadioGroup";
import { Button } from "@/components/ui/Button";
import { patientProfileQueryOptions } from "@/api/patient-profile";
import { phoneSchema, nieSchema } from "@fisio-app/validators";

const DAYS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];
const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function formatDate(iso: string): string {
  const date = new Date(iso);
  return `${DAYS[date.getDay()]}, ${date.getDate()} de ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface BookingConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: { startAt: string; endAt: string } | null;
  professionalName: string;
  consultationName: string;
}

export function BookingConfirmationModal({
  open,
  onOpenChange,
  slot,
  professionalName,
  consultationName,
}: BookingConfirmationModalProps) {
  const { data: profile } = useQuery(patientProfileQueryOptions());
  const profileLoaded = useRef(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nie, setNie] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [contactMethod, setContactMethod] = useState("email");
  const [comments, setComments] = useState("");
  const [errors, setErrors] = useState<{ nie?: string; phone?: string }>({});

  const validateField = (field: "nie" | "phone", value: string) => {
    if (field === "nie") {
      if (!value) return setErrors((e) => ({ ...e, nie: undefined }));
      const result = nieSchema.safeParse(value);
      setErrors((e) => ({
        ...e,
        nie: result.success ? undefined : result.error.issues[0]?.message,
      }));
    } else {
      const result = phoneSchema.safeParse(value);
      setErrors((e) => ({
        ...e,
        phone: result.success ? undefined : result.error.issues[0]?.message,
      }));
    }
  };

  useEffect(() => {
    if (profile && !profileLoaded.current) {
      profileLoaded.current = true;
      setFirstName(profile.firstName ?? "");
      setLastName(profile.lastName ?? "");
      setNie(profile.nie ?? "");
      setPhone(profile.phone ?? "");
      setEmail(profile.email ?? "");
      if (profile.contactMethod) {
        setContactMethod(profile.contactMethod);
      }
    }
  }, [profile]);

  const showContactMethod = !profile?.contactMethod;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Confirmar cita"
      subtitle="Revisa los datos de tu cita y completa el formulario"
      className="max-w-lg"
    >
      {!slot ? null : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const nieResult = nie ? nieSchema.safeParse(nie) : { success: true };
            const phoneResult = phoneSchema.safeParse(phone);
            const newErrors = {
              nie: !nieResult.success ? (nieResult as { success: false; error: { issues: { message: string }[] } }).error.issues[0]?.message : undefined,
              phone: !phoneResult.success ? phoneResult.error.issues[0]?.message : undefined,
            };
            setErrors(newErrors);
            if (newErrors.nie || newErrors.phone) return;
          }}
          className="space-y-6"
        >
          {/* Summary Box */}
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium uppercase text-green-600">
                  Fecha
                </p>
                <p className="text-sm font-semibold text-green-800">
                  {formatDate(slot.startAt)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-green-600">
                  Hora
                </p>
                <p className="text-sm font-semibold text-green-800">
                  {formatTime(slot.startAt)} - {formatTime(slot.endAt)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-green-600">
                  Consulta
                </p>
                <p className="text-sm font-semibold text-green-800">
                  {consultationName}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-green-600">
                  Profesional
                </p>
                <p className="text-sm font-semibold text-green-800">
                  {professionalName}
                </p>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Nombre"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <Input
              label="Apellidos"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="DNI/NIE"
              required
              value={nie}
              onChange={(e) => setNie(e.target.value)}
              onBlur={() => validateField("nie", nie)}
              error={errors.nie}
            />
            <Input
              label="Teléfono"
              required
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => validateField("phone", phone)}
              error={errors.phone}
            />
          </div>

          <Input
            label="Email"
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {showContactMethod && (
            <RadioGroup
              label="Método de Contacto Preferido"
              name="contactMethod"
              value={contactMethod}
              onValueChange={setContactMethod}
              options={[
                {
                  value: "email",
                  label: "Email",
                  icon: <Mail className="size-4" />,
                },
                {
                  value: "whatsapp",
                  label: "WhatsApp",
                  icon: <MessageCircle className="size-4" />,
                },
                {
                  value: "sms",
                  label: "Teléfono",
                  icon: <Phone className="size-4" />,
                },
              ]}
            />
          )}

          <Textarea
            label="Comentarios sobre la visita (opcional)"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
          />

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              type="button"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              Siguiente
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
