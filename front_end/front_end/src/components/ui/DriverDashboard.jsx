/**
 * DriverDashboard.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * PURE UI FILE — all logic/data is injected via props.
 * Wire up your API calls, auth, and state management in a separate logic file,
 * then pass everything down through the props interface defined at the bottom.
 *
 * PROP INTERFACE (see PropTypes block at the end for full docs):
 *   driver          — profile info (name, nickname, avatarUrl, joinDate)
 *   vehicle         — car details (regNo, make, model, yom, imageUrl, color)
 *   loan            — financing summary (weeksPaid, totalWeeks, weeklyAmount, currency)
 *   invoices        — array of past invoice objects
 *   upcomingInvoice — next invoice object (from backend, generated 2 days ahead)
 *   documents       — array of document objects with expiry info
 *   onPayInvoice    — (invoiceId) => void   — called when driver taps Pay
 *   onUploadDoc     — (docType) => void     — called when driver taps Upload
 *   onViewInvoice   — (invoiceId) => void   — called when driver taps view icon
 *
 * SHADCN COMPONENTS USED (ensure these are in your project):
 *   Badge, Button, Card, CardContent, CardHeader, CardTitle,
 *   Progress, Separator, Avatar, AvatarImage, AvatarFallback,
 *   Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
 *   Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
 *
 * LUCIDE ICONS USED:
 *   Bell, Car, FileText, Upload, Eye, CheckCircle2, AlertTriangle,
 *   Clock, CreditCard, ChevronRight, Fuel, Calendar, ShieldCheck,
 *   User, Wallet
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  Bell,
  Car,
  FileText,
  Upload,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Clock,
  CreditCard,
  ChevronRight,
  Calendar,
  ShieldCheck,
  User,
  Wallet,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ─── Design tokens ────────────────────────────────────────────────────────────
const ACCENT = "#064e3b";
const ACCENT_LIGHT = "#d1fae5";
const ACCENT_MID = "#059669";
const WARN = "#b45309";
const WARN_LIGHT = "#fef3c7";
const DANGER = "#dc2626";
const DANGER_LIGHT = "#fee2e2";

// ─── Tiny helpers ─────────────────────────────────────────────────────────────

/** Derives initials from a full name for the avatar fallback */
function initials(name = "") {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/** Returns greeting based on local hour */
function timeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/** Formats a currency amount */
function fmt(amount, currency = "KES") {
  return `${currency} ${Number(amount).toLocaleString()}`;
}

/** Returns a doc's status config */
function docStatus(doc) {
  if (!doc.expiryDate) return { label: "No expiry", color: "secondary", expired: false };
  const daysLeft = Math.ceil(
    (new Date(doc.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)
  );
  if (daysLeft < 0) return { label: "Expired", color: "destructive", expired: true, daysLeft };
  if (daysLeft <= 14) return { label: `${daysLeft}d left`, color: "warning", expired: false, daysLeft };
  return { label: "Valid", color: "success", expired: false, daysLeft };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/**
 * SECTION: Profile Header
 * Shows driver avatar, greeting, display name (prefers nickname), and join info.
 * The "signed in as" line uses the full legal name regardless of nickname.
 */
function ProfileHeader({ driver }) {
  const displayName = driver.nickname || driver.name.split(" ")[0];

  return (
    <div
      className="flex items-center justify-between px-6 py-5 md:px-8 md:py-6 rounded-2xl"
      style={{ background: ACCENT, color: "#fff" }}
    >
      {/* Left: greeting + name */}
      <div className="flex flex-col gap-0.5">
        <p className="text-xs font-medium tracking-widest uppercase opacity-70">
          {timeGreeting()}
        </p>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{displayName} 👋</h1>
        {driver.nickname && (
          <p className="text-xs opacity-60 mt-0.5">
            Signed in as{" "}
            <span className="font-semibold opacity-90">{driver.name}</span>
          </p>
        )}
        {driver.joinDate && (
          <p className="text-xs opacity-50 mt-1">
            Member since {new Date(driver.joinDate).toLocaleDateString("en-KE", { month: "long", year: "numeric" })}
          </p>
        )}
      </div>

      {/* Right: avatar — slightly larger on desktop */}
      <Avatar className="h-14 w-14 md:h-16 md:w-16 ring-2 ring-white/40 shrink-0">
        <AvatarImage src={driver.avatarUrl} alt={driver.name} />
        <AvatarFallback
          style={{ background: ACCENT_MID, color: "#fff", fontWeight: 700 }}
        >
          {initials(driver.name)}
        </AvatarFallback>
      </Avatar>
    </div>
  );
}

/**
 * SECTION: Upcoming Invoice Notification
 * Rendered only when an upcomingInvoice is provided by the backend.
 * The backend generates invoices 2 days in advance — this surface just displays it.
 */
function UpcomingInvoiceNotification({ invoice, onPayInvoice }) {
  if (!invoice) return null;

  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-xl border"
      style={{ background: ACCENT_LIGHT, borderColor: ACCENT_MID }}
    >
      <Bell size={18} style={{ color: ACCENT, marginTop: 2 }} className="shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: ACCENT }}>
          Upcoming payment — {fmt(invoice.amount, invoice.currency)}
        </p>
        <p className="text-xs text-gray-600 mt-0.5">
          Invoice{" "}
          <span className="font-mono font-semibold">#{invoice.invoiceNumber}</span>
          {" "}due on{" "}
          <span className="font-medium">
            {new Date(invoice.dueDate).toLocaleDateString("en-KE", {
              weekday: "short", day: "numeric", month: "short",
            })}
          </span>
        </p>
      </div>
      {/* Quick-pay shortcut straight from the notification */}
      <Button
        size="sm"
        className="shrink-0 text-white text-xs px-3"
        style={{ background: ACCENT }}
        onClick={() => onPayInvoice(invoice.id)}
      >
        Pay now
      </Button>
    </div>
  );
}

/**
 * SECTION: Payment Card
 * Shows the current/latest outstanding invoice and the primary Pay button.
 * onPayInvoice is passed down from parent — plug your payment API there.
 */
function PaymentCard({ invoice, onPayInvoice }) {
  if (!invoice) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10 gap-2 text-gray-400">
          <CheckCircle2 size={32} style={{ color: ACCENT_MID }} />
          <p className="text-sm font-medium">No outstanding invoices</p>
          <p className="text-xs">You're all caught up!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="h-1 w-full" style={{ background: ACCENT }} />
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard size={16} style={{ color: ACCENT }} />
            Current Payment Due
          </CardTitle>
          <Badge
            variant="outline"
            className="text-xs font-mono"
            style={{ borderColor: ACCENT, color: ACCENT }}
          >
            #{invoice.invoiceNumber}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Amount */}
        <div className="flex items-end gap-1">
          <span className="text-3xl font-bold tracking-tight" style={{ color: ACCENT }}>
            {fmt(invoice.amount, invoice.currency)}
          </span>
          <span className="text-sm text-gray-400 mb-1">/ week</span>
        </div>

        {/* Due date */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock size={14} />
          Due{" "}
          <span className="font-medium text-gray-700">
            {new Date(invoice.dueDate).toLocaleDateString("en-KE", {
              weekday: "long", day: "numeric", month: "long",
            })}
          </span>
        </div>

        <Separator />

        {/* Pay button — attach your API handler via onPayInvoice prop */}
        <Button
          className="w-full font-semibold tracking-wide text-white"
          style={{ background: ACCENT }}
          onClick={() => onPayInvoice(invoice.id)}
        >
          Pay {fmt(invoice.amount, invoice.currency)}
        </Button>

        <p className="text-xs text-center text-gray-400">
          Secure payment · Reference: {invoice.invoiceNumber}
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * SECTION: Loan Progress Meter (tucked / compact)
 * Shows weeks paid vs total contract weeks.
 * Kept intentionally compact — supplementary info, not primary.
 */
function LoanProgressMeter({ loan }) {
  const pct = loan.totalWeeks > 0
    ? Math.round((loan.weeksPaid / loan.totalWeeks) * 100)
    : 0;
  const weeksLeft = loan.totalWeeks - loan.weeksPaid;

  return (
    <Card>
      <CardContent className="pt-4 pb-4 px-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Wallet size={14} style={{ color: ACCENT }} />
            Financing progress
          </div>
          <span className="text-xs font-semibold" style={{ color: ACCENT }}>
            {pct}%
          </span>
        </div>

        {/* Shadcn Progress bar */}
        <Progress
          value={pct}
          className="h-2"
          // Override the indicator color via a wrapper trick
          style={{ "--progress-color": ACCENT }}
        />

        <div className="flex justify-between mt-2 text-xs text-gray-400">
          <span>
            <span className="font-semibold text-gray-600">{loan.weeksPaid}</span> weeks paid
          </span>
          <span>
            <span className="font-semibold text-gray-600">{weeksLeft}</span> remaining of{" "}
            <span className="font-semibold text-gray-600">{loan.totalWeeks}</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * SECTION: Payment History Table
 * Displays past invoices passed in as the `invoices` prop array.
 * onViewInvoice fires when the driver wants to view a full invoice PDF/detail.
 *
 * Expected invoice shape: { id, invoiceNumber, amount, currency, date, status }
 * status: "paid" | "overdue" | "pending"
 */
function PaymentHistory({ invoices = [], onViewInvoice }) {
  const statusConfig = {
    paid:    { label: "Paid",    bg: ACCENT_LIGHT,  text: ACCENT      },
    overdue: { label: "Overdue", bg: DANGER_LIGHT,  text: DANGER      },
    pending: { label: "Pending", bg: WARN_LIGHT,    text: WARN        },
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText size={16} style={{ color: ACCENT }} />
          Payment History
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {invoices.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No payments recorded yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="text-xs text-gray-400 uppercase tracking-wider">
                <TableHead>Invoice</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">View</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => {
                const cfg = statusConfig[inv.status] || statusConfig.pending;
                return (
                  <TableRow key={inv.id} className="text-sm">
                    <TableCell className="font-mono font-semibold text-gray-700">
                      #{inv.invoiceNumber}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {new Date(inv.date).toLocaleDateString("en-KE", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="font-medium">
                      {fmt(inv.amount, inv.currency)}
                    </TableCell>
                    <TableCell>
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{ background: cfg.bg, color: cfg.text }}
                      >
                        {cfg.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => onViewInvoice(inv.id)}
                            >
                              <Eye size={14} style={{ color: ACCENT }} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>View invoice</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * SECTION: Vehicle Details Card
 * Shows reg number, make/model, year of manufacture, color, and vehicle image.
 * Image is pulled from the backend and passed via the vehicle prop.
 */
function VehicleCard({ vehicle }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Car size={16} style={{ color: ACCENT }} />
          Your Vehicle
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Vehicle image — falls back to a styled placeholder */}
        <div
          className="w-full h-36 rounded-xl overflow-hidden flex items-center justify-center"
          style={{ background: "#f1f5f9" }}
        >
          {vehicle.imageUrl ? (
            <img
              src={vehicle.imageUrl}
              alt={`${vehicle.make} ${vehicle.model}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <Car size={48} style={{ color: "#cbd5e1" }} />
          )}
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Reg No.</p>
            <p className="font-bold font-mono tracking-widest text-gray-800">
              {vehicle.regNo || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Year</p>
            <p className="font-semibold text-gray-800">{vehicle.yom || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Make</p>
            <p className="font-semibold text-gray-800">{vehicle.make || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Model</p>
            <p className="font-semibold text-gray-800">{vehicle.model || "—"}</p>
          </div>
          {vehicle.color && (
            <div className="col-span-2">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Colour</p>
              <div className="flex items-center gap-2 mt-0.5">
                {/* Small swatch — backend should provide a hex or CSS color string */}
                <span
                  className="inline-block w-4 h-4 rounded-full border border-gray-200"
                  style={{ background: vehicle.colorHex || "#aaa" }}
                />
                <p className="font-semibold text-gray-800 capitalize">{vehicle.color}</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * SECTION: Documents
 * View-only when valid. Upload button activates only when a document is expired.
 * onUploadDoc(docType) is the handler prop — wire to your file-upload logic.
 *
 * Expected document shape:
 * { id, type, label, expiryDate, fileUrl }
 * type examples: "insurance" | "ntsa_inspection" | "psv_license" | "driving_license"
 */
function DocumentsCard({ documents = [], onUploadDoc }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck size={16} style={{ color: ACCENT }} />
          Documents
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {documents.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">No documents on file.</p>
        )}
        {documents.map((doc) => {
          const status = docStatus(doc);

          return (
            <div
              key={doc.id}
              className="flex items-center justify-between px-3 py-2.5 rounded-lg border"
              style={{
                borderColor: status.expired
                  ? "#fca5a5"
                  : status.daysLeft <= 14
                  ? "#fcd34d"
                  : "#e2e8f0",
                background: status.expired
                  ? DANGER_LIGHT
                  : status.daysLeft <= 14
                  ? WARN_LIGHT
                  : "#fafafa",
              }}
            >
              {/* Doc name + expiry */}
              <div className="flex flex-col gap-0.5 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {doc.label}
                </p>
                <div className="flex items-center gap-1.5">
                  {status.expired ? (
                    <AlertTriangle size={11} style={{ color: DANGER }} />
                  ) : status.daysLeft <= 14 ? (
                    <Clock size={11} style={{ color: WARN }} />
                  ) : (
                    <CheckCircle2 size={11} style={{ color: ACCENT_MID }} />
                  )}
                  <span
                    className="text-xs font-medium"
                    style={{
                      color: status.expired
                        ? DANGER
                        : status.daysLeft <= 14
                        ? WARN
                        : ACCENT_MID,
                    }}
                  >
                    {status.label}
                    {doc.expiryDate && !status.expired && (
                      <span className="text-gray-400 font-normal">
                        {" "}· exp{" "}
                        {new Date(doc.expiryDate).toLocaleDateString("en-KE", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </span>
                    )}
                    {status.expired && doc.expiryDate && (
                      <span className="text-gray-400 font-normal">
                        {" "}· {new Date(doc.expiryDate).toLocaleDateString("en-KE", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Action: view OR upload */}
              {status.expired ? (
                // Expired → show Upload button
                <Button
                  size="sm"
                  className="shrink-0 text-white text-xs gap-1.5"
                  style={{ background: DANGER }}
                  onClick={() => onUploadDoc(doc.type)}
                >
                  <Upload size={12} />
                  Upload
                </Button>
              ) : (
                // Valid → view only
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8">
                        <Eye size={14} style={{ color: ACCENT }} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>View document</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

/**
 * SECTION: Weeks Summary Card
 * Compact at-a-glance card that sits beside Documents on wide screens.
 * Shows weekly amount, weeks remaining, and a projected payoff month.
 */
function WeeksSummaryCard({ loan }) {
  const weeksLeft = loan.totalWeeks - loan.weeksPaid;
  const pct = loan.totalWeeks > 0
    ? Math.round((loan.weeksPaid / loan.totalWeeks) * 100)
    : 0;

  const payoffDate = new Date();
  payoffDate.setDate(payoffDate.getDate() + weeksLeft * 7);
  const payoffStr = payoffDate.toLocaleDateString("en-KE", { month: "long", year: "numeric" });

  const totalRemaining = weeksLeft * (loan.weeklyAmount || 0);

  const stats = [
    { label: "Weekly installment", value: fmt(loan.weeklyAmount, loan.currency) },
    { label: "Weeks remaining",    value: `${weeksLeft} wks` },
    { label: "Amount remaining",   value: fmt(totalRemaining, loan.currency) },
    { label: "Est. payoff",        value: payoffStr },
  ];

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar size={16} style={{ color: ACCENT }} />
          Financing Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {/* Mini SVG ring progress */}
        <div
          className="flex items-center gap-4 px-3 py-3 rounded-xl"
          style={{ background: ACCENT_LIGHT }}
        >
          <svg width="52" height="52" viewBox="0 0 52 52" className="shrink-0">
            <circle cx="26" cy="26" r="22" fill="none" stroke="#d1fae5" strokeWidth="5" />
            <circle
              cx="26" cy="26" r="22"
              fill="none"
              stroke={ACCENT}
              strokeWidth="5"
              strokeDasharray={`${2 * Math.PI * 22}`}
              strokeDashoffset={`${2 * Math.PI * 22 * (1 - pct / 100)}`}
              strokeLinecap="round"
              transform="rotate(-90 26 26)"
            />
            <text x="26" y="30" textAnchor="middle" fontSize="11" fontWeight="700" fill={ACCENT}>
              {pct}%
            </text>
          </svg>
          <div>
            <p className="text-xs text-gray-500">Financing complete</p>
            <p className="text-sm font-semibold" style={{ color: ACCENT }}>
              {loan.weeksPaid} of {loan.totalWeeks} weeks
            </p>
          </div>
        </div>

        {/* Stats rows */}
        <div className="flex flex-col divide-y divide-gray-100">
          {stats.map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center py-2 text-sm">
              <span className="text-gray-400">{label}</span>
              <span className="font-semibold text-gray-800">{value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

/**
 * DriverDashboard
 *
 * Root component. Compose this in your page/route and pass all props from
 * your data/logic layer. See the PROP INTERFACE block at the top for full docs.
 */
export default function DriverDashboard({
  driver = {},
  vehicle = {},
  loan = { weeksPaid: 0, totalWeeks: 1, weeklyAmount: 0, currency: "KES" },
  invoices = [],
  upcomingInvoice = null,
  documents = [],
  onPayInvoice = () => {},
  onUploadDoc = () => {},
  onViewInvoice = () => {},
}) {
  const payableInvoice = upcomingInvoice;

  return (
    <TooltipProvider>
      {/*
       * LAYOUT SYSTEM
       * ─────────────────────────────────────────────────────────────────────
       * Mobile  (<md):  single column, full width — natural card stack
       * Tablet  (md):   two columns — left: payment + progress | right: vehicle + docs
       * Desktop (lg+):  two columns, wider max-width, payment history spans full width
       *
       * Full-width rows: header, notification, payment history (they need the space)
       * Two-column rows: payment card + loan meter  ||  vehicle + documents
       * ─────────────────────────────────────────────────────────────────────
       */}
      <div
        className="min-h-screen py-6 px-4 md:px-8 lg:px-12"
        style={{ background: "#f8fafc", fontFamily: "'DM Sans', 'Outfit', sans-serif" }}
      >
        <div className="mx-auto max-w-5xl flex flex-col gap-4">

          {/* ── ROW 1: Profile header — always full width ─── */}
          <ProfileHeader driver={driver} />

          {/* ── ROW 2: Notification banner — full width ──── */}
          <UpcomingInvoiceNotification
            invoice={upcomingInvoice}
            onPayInvoice={onPayInvoice}
          />

          {/* ── ROWS 3+4: Two-column grid — left and right stack independently ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">

            {/* LEFT column: payment → loan bar → documents, stacked */}
            <div className="flex flex-col gap-4">
              <PaymentCard invoice={payableInvoice} onPayInvoice={onPayInvoice} />
              <LoanProgressMeter loan={loan} />
              <DocumentsCard documents={documents} onUploadDoc={onUploadDoc} />
            </div>

            {/* RIGHT column: financing summary → vehicle, stacked
                Financing summary top aligns with PaymentCard on the left */}
            <div className="flex flex-col gap-4">
              <WeeksSummaryCard loan={loan} />
              {vehicle && Object.keys(vehicle).length > 0 && (
                <VehicleCard vehicle={vehicle} />
              )}
            </div>
          </div>

          {/* ── ROW 5: Payment history — always full width (table needs space) ── */}
          <PaymentHistory invoices={invoices} onViewInvoice={onViewInvoice} />

          <div className="h-4" />
        </div>
      </div>
    </TooltipProvider>
  );
}


// ─── PropTypes (optional — remove if not using prop-types package) ────────────
/*
import PropTypes from "prop-types";

DriverDashboard.propTypes = {
  driver: PropTypes.shape({
    name:      PropTypes.string.isRequired,   // Full legal name
    nickname:  PropTypes.string,              // Optional display nickname
    avatarUrl: PropTypes.string,              // Profile photo URL from backend
    joinDate:  PropTypes.string,              // ISO date string
  }),

  vehicle: PropTypes.shape({
    regNo:    PropTypes.string,
    make:     PropTypes.string,
    model:    PropTypes.string,
    yom:      PropTypes.number,               // Year of manufacture
    color:    PropTypes.string,               // Human-readable colour name
    colorHex: PropTypes.string,               // Hex for the colour swatch
    imageUrl: PropTypes.string,               // Car photo URL
  }),

  loan: PropTypes.shape({
    weeksPaid:     PropTypes.number.isRequired,
    totalWeeks:    PropTypes.number.isRequired,
    weeklyAmount:  PropTypes.number,
    currency:      PropTypes.string,          // e.g. "KES"
  }),

  // Array of past invoices for the history table
  invoices: PropTypes.arrayOf(PropTypes.shape({
    id:            PropTypes.string.isRequired,
    invoiceNumber: PropTypes.string.isRequired,
    amount:        PropTypes.number.isRequired,
    currency:      PropTypes.string,
    date:          PropTypes.string,          // ISO date of payment/issue
    status:        PropTypes.oneOf(["paid", "overdue", "pending"]),
  })),

  // The upcoming invoice generated by backend 2 days in advance
  upcomingInvoice: PropTypes.shape({
    id:            PropTypes.string.isRequired,
    invoiceNumber: PropTypes.string.isRequired,
    amount:        PropTypes.number.isRequired,
    currency:      PropTypes.string,
    dueDate:       PropTypes.string.isRequired, // ISO date
  }),

  // Driver documents
  documents: PropTypes.arrayOf(PropTypes.shape({
    id:         PropTypes.string.isRequired,
    type:       PropTypes.string.isRequired,  // e.g. "insurance"
    label:      PropTypes.string.isRequired,  // Display name
    expiryDate: PropTypes.string,             // ISO date — null if no expiry
    fileUrl:    PropTypes.string,             // URL to view the doc
  })),

  onPayInvoice:  PropTypes.func,  // (invoiceId: string) => void
  onUploadDoc:   PropTypes.func,  // (docType: string) => void
  onViewInvoice: PropTypes.func,  // (invoiceId: string) => void
};
*/