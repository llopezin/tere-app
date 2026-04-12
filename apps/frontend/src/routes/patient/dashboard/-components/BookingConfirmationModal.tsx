import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, MessageCircle, Phone, CheckCircle2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { RadioGroup } from "@/components/ui/RadioGroup";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { patientProfileQueryOptions } from "@/api/patient-profile";
import { useCreateAppointment } from "@/api/appointments";
import { rgpdConsentQueryOptions } from "@/api/rgpd-consent";
import { client } from "@/lib/client";
import { phoneSchema, nieSchema } from "@fisio-app/validators";
import { cn } from "@/lib/cn";

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
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
  appointmentTypeId: string;
  professionalName: string;
  consultationName: string;
}

export function BookingConfirmationModal({
  open,
  onOpenChange,
  slot,
  appointmentTypeId,
  professionalName,
  consultationName,
}: BookingConfirmationModalProps) {
  const { data: profile } = useQuery(patientProfileQueryOptions());
  const { data: rgpdConsent } = useQuery(rgpdConsentQueryOptions());
  const queryClient = useQueryClient();
  const createAppointment = useCreateAppointment();
  const profileLoaded = useRef(false);

  const alreadySigned = rgpdConsent?.signed === true;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nie, setNie] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [contactMethod, setContactMethod] = useState("email");
  const [rgpdAccepted, setRgpdAccepted] = useState(false);
  const [errors, setErrors] = useState<{ nie?: string; phone?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Animation phases
  const [blurring, setBlurring] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

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

  // Reset animation state when modal closes
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setConfirmed(false);
        setBlurring(false);
        setSubmitError(null);
        setIsSubmitting(false);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  const showContactMethod = !profile?.contactMethod;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nieResult = nie ? nieSchema.safeParse(nie) : { success: true };
    const phoneResult = phoneSchema.safeParse(phone);
    const newErrors = {
      nie: !nieResult.success
        ? (
            nieResult as {
              success: false;
              error: { issues: { message: string }[] };
            }
          ).error.issues[0]?.message
        : undefined,
      phone: !phoneResult.success ? phoneResult.error.issues[0]?.message : undefined,
    };
    setErrors(newErrors);
    if (newErrors.nie || newErrors.phone) return;

    if (!alreadySigned && !rgpdAccepted) {
      setSubmitError("Debes aceptar el consentimiento de protección de datos");
      return;
    }

    if (!profile?.id || !slot) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (!alreadySigned) {
        const rgpdRes = await client.patient.me["rgpd-consent"].$post();
        if (!rgpdRes.ok) throw new Error("Error al registrar el consentimiento RGPD");
        await queryClient.invalidateQueries({ queryKey: rgpdConsentQueryOptions().queryKey });
      }

      await createAppointment.mutateAsync({
        patientId: profile.id,
        appointmentTypeId,
        startAt: slot.startAt,
      });

      // Blur out form, then reveal confirmation
      setBlurring(true);
      setTimeout(() => {
        setConfirmed(true);
        setBlurring(false);
      }, 300);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Error al crear la cita");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={confirmed ? "¡Cita confirmada!" : "Confirmar cita"}
      subtitle={
        confirmed ? undefined : slot ? (
          <>
            Revisa los datos de tu cita de {consultationName} con {professionalName} el{" "}
            <strong>{formatDate(slot.startAt)}</strong> a las{" "}
            <strong>{formatTime(slot.startAt)}</strong>
          </>
        ) : undefined
      }
      className="max-w-lg"
    >
      {!slot ? null : confirmed ? (
        // ── Confirmation view ───────────────────────────────────────────────
        <div className="animate-scale-in space-y-6">
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="size-9 text-green-600" strokeWidth={1.5} />
            </div>
            <p className="text-sm text-text-secondary">
              Tu cita ha sido reservada. Te contactaremos para confirmarte los detalles.
            </p>
          </div>

          <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium uppercase text-green-600">Fecha</p>
                <p className="text-sm font-semibold text-green-800">{formatDate(slot.startAt)}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-green-600">Hora</p>
                <p className="text-sm font-semibold text-green-800">
                  {formatTime(slot.startAt)} – {formatTime(slot.endAt)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-green-600">Tipo de cita</p>
                <p className="text-sm font-semibold text-green-800">{consultationName}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-green-600">Profesional</p>
                <p className="text-sm font-semibold text-green-800">{professionalName}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="primary" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </div>
        </div>
      ) : (
        // ── Booking form ─────────────────────────────────────────────────────
        <div
          className={cn(
            "transition-all duration-300 ease-in-out",
            blurring && "scale-95 opacity-0 blur-sm",
          )}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
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

            {/* RGPD consent — only shown if not already signed */}
            {!alreadySigned && (
              <Checkbox checked={rgpdAccepted} onCheckedChange={setRgpdAccepted}>
                He leído y acepto la{" "}
                <a
                  href="/politica-de-privacidad"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  política de privacidad y protección de datos (RGPD)
                </a>
              </Checkbox>
            )}

            {/* API error */}
            {submitError && (
              <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{submitError}</p>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={isSubmitting || (!alreadySigned && !rgpdAccepted)}
              >
                {isSubmitting ? "Confirmando..." : "Confirmar cita"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </Modal>
  );
}
