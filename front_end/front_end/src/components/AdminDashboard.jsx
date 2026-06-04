/* eslint-disable react/prop-types */
import { useMemo, useState } from "react";
import {
  AlertCircle,
  Car,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  CreditCard,
  ExternalLink,
  FileCheck2,
  FileText,
  Link,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminDrivers } from "@/hooks/useAdminDrivers";
import { useAdminDocuments } from "@/hooks/useAdminDocuments";
import { useAdminPayments } from "@/hooks/useAdminPayments";
import { useAdminVehicles } from "@/hooks/useAdminVehicles";

const NAV_ITEMS = [
  { key: "drivers", label: "Drivers", icon: Users },
  { key: "vehicles", label: "Vehicles", icon: Car },
  { key: "payments", label: "Payments", icon: CreditCard },
  { key: "documents", label: "Documents", icon: FileCheck2 },
];

const MODULE_META = {
  drivers: {
    title: "Driver Management",
    desc: "Onboarding, access control, and driver registry",
  },
  vehicles: {
    title: "Fleet Management",
    desc: "Vehicle units, assignments, and fleet status",
  },
  payments: {
    title: "Financial Oversight",
    desc: "Contracts, invoices, and payment tracking",
  },
  documents: {
    title: "Document Operations",
    desc: "Office uploads, verification, and expiry tracking",
  },
};

const statusClassNames = {
  VERIFIED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  PENDING: "border-amber-200 bg-amber-50 text-amber-700",
  REJECTED: "border-rose-200 bg-rose-50 text-rose-700",
  AV: "border-sky-200 bg-sky-50 text-sky-700",
  FI: "border-emerald-200 bg-emerald-50 text-emerald-700",
  OS: "border-zinc-200 bg-zinc-50 text-zinc-700",
  IM: "border-rose-200 bg-rose-50 text-rose-700",
  DR: "border-zinc-200 bg-zinc-50 text-zinc-700",
  AC: "border-emerald-200 bg-emerald-50 text-emerald-700",
  CM: "border-sky-200 bg-sky-50 text-sky-700",
  DF: "border-rose-200 bg-rose-50 text-rose-700",
  UNPAID: "border-amber-200 bg-amber-50 text-amber-700",
  PAID: "border-emerald-200 bg-emerald-50 text-emerald-700",
  PARTIAL: "border-sky-200 bg-sky-50 text-sky-700",
  OVERPAID: "border-violet-200 bg-violet-50 text-violet-700",
  SUCCESS: "border-emerald-200 bg-emerald-50 text-emerald-700",
  FAILED: "border-rose-200 bg-rose-50 text-rose-700",
  PN: "border-amber-200 bg-amber-50 text-amber-700",
  VR: "border-emerald-200 bg-emerald-50 text-emerald-700",
  RJ: "border-rose-200 bg-rose-50 text-rose-700",
  EX: "border-zinc-300 bg-zinc-100 text-zinc-700",
};

const DOCUMENT_TYPES = [
  ["IF", "ID Front"],
  ["IB", "ID Back"],
  ["DL", "Driving License"],
  ["KR", "KRA PIN"],
  ["LB", "Logbook"],
  ["IN", "Insurance"],
  ["PB", "PSV Badge"],
  ["IP", "Inspection Report"],
];

const EXPIRING_DOCUMENT_TYPES = new Set(["DL", "LB", "IN", "PB", "IP"]);

const formatCurrency = (amount) => Number(amount || 0).toLocaleString("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

const initials = (name) => (
  name?.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?"
);

function StatusBadge({ value, label }) {
  return (
    <Badge variant="outline" className={statusClassNames[value] || "border-zinc-200 bg-zinc-50 text-zinc-700"}>
      {label || value || "Unknown"}
    </Badge>
  );
}

function StatCard({ label, value, meta, icon: Icon, tone = "emerald" }) {
  const toneClass = {
    emerald: {
      surface: "border-emerald-100 bg-emerald-50/70 hover:border-emerald-200",
      icon: "bg-emerald-100 text-emerald-800",
    },
    amber: {
      surface: "border-amber-100 bg-amber-50/70 hover:border-amber-200",
      icon: "bg-amber-100 text-amber-800",
    },
    rose: {
      surface: "border-rose-100 bg-rose-50/70 hover:border-rose-200",
      icon: "bg-rose-100 text-rose-800",
    },
    sky: {
      surface: "border-sky-100 bg-sky-50/70 hover:border-sky-200",
      icon: "bg-sky-100 text-sky-800",
    },
  }[tone];

  return (
    <Card data-size="sm" className={`rounded-lg border shadow-sm ring-0 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${toneClass.surface}`}>
      <CardContent className="flex items-center justify-between gap-4 py-1">
        <div>
          <p className="text-xs font-semibold uppercase text-zinc-600">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-950">{value}</p>
          {meta && <p className="mt-1 text-xs text-zinc-500">{meta}</p>}
        </div>
        {Icon && (
          <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${toneClass.icon}`}>
            <Icon className="size-5" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Field({ label, children }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</span>
      {children}
    </label>
  );
}

function Select({ value, onChange, children, required = false, disabled = false }) {
  return (
    <div className="relative">
      <select
        required={required}
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{ colorScheme: "light" }}
        className="h-9 w-full appearance-none rounded-md border border-zinc-200 bg-white px-2.5 py-1 pr-9 text-sm text-zinc-950 shadow-xs outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500 [&>option]:bg-white [&>option]:text-zinc-950"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
    </div>
  );
}

function Modal({ title, subtitle, children, footer, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 p-4 backdrop-blur-sm"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-xl">
        <div className="border-b border-zinc-200 px-5 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
        </div>
        <div className="grid gap-4 px-5 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-zinc-200 px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}

function EmptyRow({ colSpan, children }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="h-24 text-center text-sm text-zinc-500">
        {children}
      </TableCell>
    </TableRow>
  );
}

function SearchAndFilter({ search, onSearch, filter, onFilter, filters, placeholder }) {
  return (
    <div className="flex flex-col gap-3 border-b border-zinc-200 p-4 lg:flex-row lg:items-center">
      <Input value={search} onChange={(event) => onSearch(event.target.value)} placeholder={placeholder} className="max-w-sm bg-white" />
      <div className="flex flex-wrap gap-2">
        {filters.map((item) => (
          <Button
            key={item.value}
            type="button"
            size="sm"
            variant={filter === item.value ? "default" : "outline"}
            onClick={() => onFilter(item.value)}
          >
            {item.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function DriversModule({ driversHook }) {
  const { allDrivers, drivers, accessRequests, createDriver, approveDriver, rejectDriver, isLoading } = driversHook;
  const [view, setView] = useState("list");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    national_id: "",
    kra_pin: "",
    dl_number: "",
  });

  const filteredDrivers = allDrivers.filter((driver) => {
    const status = driver.driver_profile?.verification_status;
    const matchesSearch = `${driver.full_name} ${driver.username} ${driver.email} ${driver.national_id}`.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || status === filter;
    return matchesSearch && matchesFilter;
  });

  async function handleCreate(event) {
    event.preventDefault();
    await createDriver(form);
    setForm({ username: "", first_name: "", last_name: "", email: "", password: "", national_id: "", kra_pin: "", dl_number: "" });
    setView("list");
  }

  return (
    <div className="grid gap-6">
      {view === "create" && (
        <Modal
          title="Onboard New Driver"
          subtitle="Create the driver's login and office profile."
          onClose={() => setView("list")}
          footer={(
            <>
              <Button type="button" variant="outline" onClick={() => setView("list")}>Cancel</Button>
              <Button type="submit" form="driver-form" disabled={isLoading}><Check /> Save Driver</Button>
            </>
          )}
        >
          <form id="driver-form" className="grid gap-4" onSubmit={handleCreate}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="First Name">
                <Input required autoComplete="given-name" value={form.first_name} onChange={(event) => setForm((current) => ({ ...current, first_name: event.target.value }))} />
              </Field>
              <Field label="Last Name">
                <Input required autoComplete="family-name" value={form.last_name} onChange={(event) => setForm((current) => ({ ...current, last_name: event.target.value }))} />
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Username">
                <Input required autoComplete="username" value={form.username} onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))} />
              </Field>
              <Field label="Email">
                <Input required type="email" autoComplete="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
              </Field>
            </div>
            <Field label="Temporary Password">
              <Input required type="password" autoComplete="new-password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
            </Field>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="National ID">
                <Input required value={form.national_id} onChange={(event) => setForm((current) => ({ ...current, national_id: event.target.value }))} />
              </Field>
              <Field label="KRA PIN">
                <Input required value={form.kra_pin} onChange={(event) => setForm((current) => ({ ...current, kra_pin: event.target.value }))} />
              </Field>
              <Field label="Driving License">
                <Input required value={form.dl_number} onChange={(event) => setForm((current) => ({ ...current, dl_number: event.target.value }))} />
              </Field>
            </div>
          </form>
        </Modal>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Verified Drivers" value={drivers.length} meta="Approved profiles" icon={Users} />
        <StatCard label="Access Requests" value={accessRequests.length} meta="Awaiting review" icon={ShieldCheck} tone="amber" />
        <StatCard label="Rejected" value={allDrivers.filter((driver) => driver.driver_profile?.verification_status === "REJECTED").length} meta="Denied profiles" icon={X} tone="rose" />
        <StatCard label="Total Profiles" value={allDrivers.length} meta="All returned drivers" icon={FileText} tone="sky" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Driver Registry</h2>
          <p className="text-sm text-zinc-500">Create drivers, review requests, and approve access.</p>
        </div>
        <Button onClick={() => setView("create")}><Plus /> New Driver</Button>
      </div>

      <Card className="rounded-lg border-zinc-200 shadow-sm ring-0">
        <SearchAndFilter
          search={search}
          onSearch={setSearch}
          filter={filter}
          onFilter={setFilter}
          placeholder="Search drivers..."
          filters={[
            { value: "all", label: "All" },
            { value: "VERIFIED", label: "Verified" },
            { value: "PENDING", label: "Pending" },
            { value: "REJECTED", label: "Rejected" },
          ]}
        />
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Driver</TableHead>
                <TableHead>National ID</TableHead>
                <TableHead>KRA PIN</TableHead>
                <TableHead>License</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDrivers.length === 0 ? (
                <EmptyRow colSpan={6}>No drivers match the current filters.</EmptyRow>
              ) : filteredDrivers.map((driver) => {
                const status = driver.driver_profile?.verification_status;
                return (
                  <TableRow key={driver.id} className={status === "PENDING" ? "bg-amber-50/40" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-100 text-xs font-semibold text-emerald-800">
                          {initials(driver.full_name)}
                        </div>
                        <div>
                          <p className="font-medium">{driver.full_name}</p>
                          <p className="text-xs text-zinc-500">@{driver.username} · {driver.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{driver.national_id || "N/A"}</TableCell>
                    <TableCell>{driver.driver_profile?.kra_pin || "N/A"}</TableCell>
                    <TableCell>{driver.driver_profile?.dl_number || "N/A"}</TableCell>
                    <TableCell><StatusBadge value={status} /></TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        {status === "PENDING" && (
                          <>
                            <Button title="Verify driver" size="icon-sm" variant="outline" onClick={() => approveDriver(driver.id)} disabled={isLoading} aria-label={`Approve ${driver.full_name}`}><Check /></Button>
                            <Button title="Reject driver" size="icon-sm" variant="destructive" onClick={() => rejectDriver(driver.id)} disabled={isLoading} aria-label={`Reject ${driver.full_name}`}><X /></Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function VehiclesModule({ vehiclesHook, driversHook }) {
  const {
    vehicles,
    vehicleMakes,
    vehicleModels,
    availableVehicles,
    financedVehicles,
    createVehicle,
    createVehicleMake,
    createVehicleModel,
    updateVehicle,
    deleteVehicle,
    isLoading,
  } = vehiclesHook;
  const { drivers } = driversHook;
  const [showCreate, setShowCreate] = useState(false);
  const [showCreateMake, setShowCreateMake] = useState(false);
  const [showCreateModel, setShowCreateModel] = useState(false);
  const [assignTarget, setAssignTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [makeName, setMakeName] = useState("");
  const [modelForm, setModelForm] = useState({ make: "", name: "" });
  const [form, setForm] = useState({
    plate_number: "",
    model: "",
    yom: "",
    chasis_number: "",
    engine_number: "",
    color: "",
    valuation: "",
    status: "AV",
  });

  const availableDrivers = drivers.filter((driver) => driver.driver_profile?.id);
  const filteredVehicles = vehicles.filter((vehicle) => {
    const matchesSearch = `${vehicle.full_name} ${vehicle.plate_number} ${vehicle.color}`.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || vehicle.status === filter;
    return matchesSearch && matchesFilter;
  });

  async function handleCreate(event) {
    event.preventDefault();
    await createVehicle(form);
    setForm({ plate_number: "", model: "", yom: "", chasis_number: "", engine_number: "", color: "", valuation: "", status: "AV" });
    setShowCreate(false);
  }

  async function handleCreateMake(event) {
    event.preventDefault();
    const created = await createVehicleMake(makeName.trim());
    if (!created) return;

    setMakeName("");
    setShowCreateMake(false);
  }

  async function handleCreateModel(event) {
    event.preventDefault();
    const created = await createVehicleModel(modelForm);
    if (!created) return;

    setModelForm({ make: "", name: "" });
    setShowCreateModel(false);
  }

  async function handleAssign() {
    if (!assignTarget || !selectedDriverId) return;
    await updateVehicle(assignTarget.id, { driver: selectedDriverId, status: "FI" });
    setAssignTarget(null);
    setSelectedDriverId("");
  }

  return (
    <div className="grid gap-6">
      {showCreate && (
        <Modal
          title="Register New Vehicle"
          subtitle="Add a vehicle unit to the fleet ledger."
          onClose={() => setShowCreate(false)}
          footer={(
            <>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" form="vehicle-form" disabled={isLoading}><Plus /> Register Vehicle</Button>
            </>
          )}
        >
          <form id="vehicle-form" className="grid gap-4" onSubmit={handleCreate}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Plate Number">
                <Input required value={form.plate_number} onChange={(event) => setForm((current) => ({ ...current, plate_number: event.target.value }))} />
              </Field>
              <Field label="Vehicle Model">
                <Select required value={form.model} onChange={(value) => setForm((current) => ({ ...current, model: value }))}>
                  <option value="">Choose model</option>
                  {vehicleModels.map((model) => (
                    <option key={model.id} value={model.id}>{model.make_details?.make} {model.name}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Year">
                <Input required min="1975" max={new Date().getFullYear()} type="number" value={form.yom} onChange={(event) => setForm((current) => ({ ...current, yom: event.target.value }))} />
              </Field>
              <Field label="Initial Status">
                <Select value={form.status} onChange={(value) => setForm((current) => ({ ...current, status: value }))}>
                  <option value="AV">Available</option>
                  <option value="OS">Out of Service</option>
                </Select>
              </Field>
              <Field label="Color">
                <Input required value={form.color} onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))} />
              </Field>
              <Field label="Valuation">
                <Input required min="0" step="0.01" type="number" value={form.valuation} onChange={(event) => setForm((current) => ({ ...current, valuation: event.target.value }))} />
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Chassis Number">
                <Input required value={form.chasis_number} onChange={(event) => setForm((current) => ({ ...current, chasis_number: event.target.value }))} />
              </Field>
              <Field label="Engine Number">
                <Input required value={form.engine_number} onChange={(event) => setForm((current) => ({ ...current, engine_number: event.target.value }))} />
              </Field>
            </div>
          </form>
        </Modal>
      )}

      {showCreateMake && (
        <Modal
          title="Add Vehicle Make"
          subtitle="Add a manufacturer to the vehicle catalog."
          onClose={() => setShowCreateMake(false)}
          footer={(
            <>
              <Button variant="outline" onClick={() => setShowCreateMake(false)}>Cancel</Button>
              <Button type="submit" form="make-form" disabled={isLoading}><Plus /> Add Make</Button>
            </>
          )}
        >
          <form id="make-form" onSubmit={handleCreateMake}>
            <Field label="Make">
              <Input required placeholder="Toyota" value={makeName} onChange={(event) => setMakeName(event.target.value)} />
            </Field>
          </form>
        </Modal>
      )}

      {showCreateModel && (
        <Modal
          title="Add Vehicle Model"
          subtitle="Attach a model to an existing manufacturer."
          onClose={() => setShowCreateModel(false)}
          footer={(
            <>
              <Button variant="outline" onClick={() => setShowCreateModel(false)}>Cancel</Button>
              <Button type="submit" form="model-form" disabled={isLoading}><Plus /> Add Model</Button>
            </>
          )}
        >
          <form id="model-form" className="grid gap-4" onSubmit={handleCreateModel}>
            <Field label="Make">
              <Select required value={modelForm.make} onChange={(value) => setModelForm((current) => ({ ...current, make: value }))}>
                <option value="">Choose make</option>
                {vehicleMakes.map((make) => <option key={make.id} value={make.id}>{make.make}</option>)}
              </Select>
            </Field>
            <Field label="Model">
              <Input required placeholder="Probox" value={modelForm.name} onChange={(event) => setModelForm((current) => ({ ...current, name: event.target.value }))} />
            </Field>
          </form>
        </Modal>
      )}

      {assignTarget && (
        <Modal
          title="Assign Driver"
          subtitle={`Link a verified driver to ${assignTarget.plate_number}.`}
          onClose={() => setAssignTarget(null)}
          footer={(
            <>
              <Button variant="outline" onClick={() => setAssignTarget(null)}>Cancel</Button>
              <Button onClick={handleAssign} disabled={!selectedDriverId || isLoading}><Link /> Assign Driver</Button>
            </>
          )}
        >
          <Field label="Driver">
            <Select value={selectedDriverId} onChange={setSelectedDriverId}>
              <option value="">Choose driver</option>
              {availableDrivers.map((driver) => (
                <option key={driver.id} value={driver.driver_profile.id}>{driver.full_name}</option>
              ))}
            </Select>
          </Field>
        </Modal>
      )}

      {deleteTarget && (
        <Modal
          title="Remove Vehicle"
          subtitle={`${deleteTarget.plate_number} will be deleted from the fleet.`}
          onClose={() => setDeleteTarget(null)}
          footer={(
            <>
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="destructive" onClick={async () => { await deleteVehicle(deleteTarget.id); setDeleteTarget(null); }} disabled={isLoading}><Trash2 /> Remove</Button>
            </>
          )}
        >
          <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            This cannot be undone. Contracts linked to this vehicle may prevent deletion in Django.
          </div>
        </Modal>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Fleet" value={vehicles.length} meta="Registered vehicles" icon={Car} />
        <StatCard label="Available" value={availableVehicles.length} meta="Ready to assign" icon={ShieldCheck} tone="sky" />
        <StatCard label="Financed" value={financedVehicles.length} meta="Assigned to contracts" icon={Link} tone="emerald" />
        <StatCard label="Out of Service" value={vehicles.filter((vehicle) => vehicle.status === "OS" || vehicle.status === "IM").length} meta="Needs attention" icon={AlertCircle} tone="rose" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Fleet Ledger</h2>
          <p className="text-sm text-zinc-500">Add vehicles, assign drivers, and manage fleet status.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setShowCreateMake(true)}><Plus /> Add Make</Button>
          <Button variant="outline" onClick={() => setShowCreateModel(true)} disabled={vehicleMakes.length === 0}><Plus /> Add Model</Button>
          <Button onClick={() => setShowCreate(true)} disabled={vehicleModels.length === 0}><Car /> Register Vehicle</Button>
        </div>
      </div>

      <Card>
        <SearchAndFilter
          search={search}
          onSearch={setSearch}
          filter={filter}
          onFilter={setFilter}
          placeholder="Search fleet..."
          filters={[
            { value: "all", label: "All" },
            { value: "AV", label: "Available" },
            { value: "FI", label: "Financed" },
            { value: "OS", label: "Out of Service" },
            { value: "IM", label: "Immobilized" },
          ]}
        />
        <CardContent className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredVehicles.length === 0 ? (
            <div className="col-span-full py-10 text-center text-sm text-zinc-500">No vehicles found.</div>
          ) : filteredVehicles.map((vehicle) => (
            <div key={vehicle.id} className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{vehicle.plate_number}</p>
                  <p className="text-sm text-zinc-500">{vehicle.full_name || `${vehicle.make} ${vehicle.model_name}`} - {vehicle.yom}</p>
                </div>
                <StatusBadge value={vehicle.status} label={vehicle.status_display} />
              </div>
              <div className="mt-4 grid gap-2 border-t border-zinc-100 pt-4 text-sm">
                <div className="flex justify-between"><span className="text-zinc-500">Color</span><span>{vehicle.color || "N/A"}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">Valuation</span><span>{formatCurrency(vehicle.valuation)}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">Driver profile</span><span>{vehicle.driver || "Unassigned"}</span></div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setAssignTarget(vehicle)}><Link /> Assign</Button>
                <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(vehicle)}><Trash2 /></Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function PaymentsModule({ paymentsHook, driversHook, vehiclesHook }) {
  const { contracts, invoices, payments, mpesaRequests, paymentStats, createContract, createInvoice, createPayment, isLoading } = paymentsHook;
  const { drivers } = driversHook;
  const { vehicles } = vehiclesHook;
  const [tab, setTab] = useState("invoices");
  const [showContractModal, setShowContractModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [contractForm, setContractForm] = useState({
    driver: "",
    vehicle: "",
    vehicle_valuation: "",
    interest_rate: "",
    total_repayment: "",
    weekly_installment: "",
    total_weeks: "",
    status: "AC",
    billing_day: "MON",
  });
  const [invoiceForm, setInvoiceForm] = useState({ contract: "", amount_due: "", due_date: "" });
  const [paymentForm, setPaymentForm] = useState({ invoice: "", amount: "", mpesa_receipt: "" });

  const activeContracts = contracts.filter((contract) => contract.status === "AC");
  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === contractForm.vehicle);

  async function handleCreateContract(event) {
    event.preventDefault();
    await createContract(contractForm);
    setShowContractModal(false);
  }

  async function handleCreateInvoice(event) {
    event.preventDefault();
    await createInvoice(invoiceForm);
    setShowInvoiceModal(false);
  }

  async function handleCreatePayment(event) {
    event.preventDefault();
    await createPayment(paymentForm);
    setShowPaymentModal(false);
  }

  return (
    <div className="grid gap-6">
      {showContractModal && (
        <Modal
          title="Create Contract"
          subtitle="Bind a verified driver to a vehicle financing agreement."
          onClose={() => setShowContractModal(false)}
          footer={(
            <>
              <Button variant="outline" onClick={() => setShowContractModal(false)}>Cancel</Button>
              <Button type="submit" form="contract-form" disabled={isLoading}><FileText /> Create Contract</Button>
            </>
          )}
        >
          <form id="contract-form" className="grid gap-4" onSubmit={handleCreateContract}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Driver">
                <Select required value={contractForm.driver} onChange={(value) => setContractForm((current) => ({ ...current, driver: value }))}>
                  <option value="">Choose driver</option>
                  {drivers.filter((driver) => driver.driver_profile?.id).map((driver) => (
                    <option key={driver.id} value={driver.driver_profile.id}>{driver.full_name}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Vehicle">
                <Select required value={contractForm.vehicle} onChange={(value) => {
                  const vehicle = vehicles.find((item) => item.id === value);
                  setContractForm((current) => ({ ...current, vehicle: value, vehicle_valuation: vehicle?.valuation || current.vehicle_valuation }));
                }}>
                  <option value="">Choose vehicle</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>{vehicle.plate_number} - {vehicle.full_name}</option>
                  ))}
                </Select>
              </Field>
            </div>
            {selectedVehicle && <p className="text-xs text-zinc-500">Selected valuation: {formatCurrency(selectedVehicle.valuation)}</p>}
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Vehicle Valuation">
                <Input required type="number" value={contractForm.vehicle_valuation} onChange={(event) => setContractForm((current) => ({ ...current, vehicle_valuation: event.target.value }))} />
              </Field>
              <Field label="Interest Rate">
                <Input required type="number" step="0.01" value={contractForm.interest_rate} onChange={(event) => setContractForm((current) => ({ ...current, interest_rate: event.target.value }))} />
              </Field>
              <Field label="Total Repayment">
                <Input required type="number" value={contractForm.total_repayment} onChange={(event) => setContractForm((current) => ({ ...current, total_repayment: event.target.value }))} />
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Weekly Installment">
                <Input required type="number" value={contractForm.weekly_installment} onChange={(event) => setContractForm((current) => ({ ...current, weekly_installment: event.target.value }))} />
              </Field>
              <Field label="Total Weeks">
                <Input required type="number" value={contractForm.total_weeks} onChange={(event) => setContractForm((current) => ({ ...current, total_weeks: event.target.value }))} />
              </Field>
              <Field label="Billing Day">
                <Select value={contractForm.billing_day} onChange={(value) => setContractForm((current) => ({ ...current, billing_day: value }))}>
                  {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((day) => <option key={day} value={day}>{day}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Contract Status">
              <Select value={contractForm.status} onChange={(value) => setContractForm((current) => ({ ...current, status: value }))}>
                <option value="DR">Draft</option>
                <option value="AC">Active</option>
              </Select>
            </Field>
          </form>
        </Modal>
      )}

      {showInvoiceModal && (
        <Modal
          title="Issue Invoice"
          subtitle="Attach an invoice to an active financing contract."
          onClose={() => setShowInvoiceModal(false)}
          footer={(
            <>
              <Button variant="outline" onClick={() => setShowInvoiceModal(false)}>Cancel</Button>
              <Button type="submit" form="invoice-form" disabled={isLoading}><FileText /> Issue Invoice</Button>
            </>
          )}
        >
          <form id="invoice-form" className="grid gap-4" onSubmit={handleCreateInvoice}>
            <Field label="Contract">
              <Select required value={invoiceForm.contract} onChange={(value) => setInvoiceForm((current) => ({ ...current, contract: value }))}>
                <option value="">Choose contract</option>
                {activeContracts.map((contract) => (
                  <option key={contract.id} value={contract.id}>{contract.id.slice(0, 8)} - {formatCurrency(contract.weekly_installment)}</option>
                ))}
              </Select>
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Amount Due">
                <Input required type="number" value={invoiceForm.amount_due} onChange={(event) => setInvoiceForm((current) => ({ ...current, amount_due: event.target.value }))} />
              </Field>
              <Field label="Due Date">
                <Input required type="date" value={invoiceForm.due_date} onChange={(event) => setInvoiceForm((current) => ({ ...current, due_date: event.target.value }))} />
              </Field>
            </div>
          </form>
        </Modal>
      )}

      {showPaymentModal && (
        <Modal
          title="Log Payment"
          subtitle="Record an office-confirmed payment against an invoice."
          onClose={() => setShowPaymentModal(false)}
          footer={(
            <>
              <Button variant="outline" onClick={() => setShowPaymentModal(false)}>Cancel</Button>
              <Button type="submit" form="payment-form" disabled={isLoading}><Check /> Record Payment</Button>
            </>
          )}
        >
          <form id="payment-form" className="grid gap-4" onSubmit={handleCreatePayment}>
            <Field label="Invoice">
              <Select required value={paymentForm.invoice} onChange={(value) => setPaymentForm((current) => ({ ...current, invoice: value }))}>
                <option value="">Choose invoice</option>
                {invoices.filter((invoice) => invoice.status !== "PAID").map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>{invoice.id.slice(0, 8)} - balance {formatCurrency(invoice.balance)}</option>
                ))}
              </Select>
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Amount">
                <Input required type="number" value={paymentForm.amount} onChange={(event) => setPaymentForm((current) => ({ ...current, amount: event.target.value }))} />
              </Field>
              <Field label="M-Pesa Receipt">
                <Input required value={paymentForm.mpesa_receipt} onChange={(event) => setPaymentForm((current) => ({ ...current, mpesa_receipt: event.target.value }))} />
              </Field>
            </div>
          </form>
        </Modal>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Outstanding" value={formatCurrency(paymentStats.outstandingBalance)} meta="Across invoices" icon={FileText} tone="amber" />
        <StatCard label="Collected" value={formatCurrency(paymentStats.totalCollected)} meta="Recorded payments" icon={CircleDollarSign} />
        <StatCard label="Open Invoices" value={paymentStats.unpaidInvoices.length + paymentStats.partialInvoices.length} meta="Unpaid and partial" icon={AlertCircle} tone="rose" />
        <StatCard label="Active Contracts" value={paymentStats.activeContracts.length} meta="Running agreements" icon={CreditCard} tone="sky" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {[
            ["invoices", "Invoices"],
            ["contracts", "Contracts"],
            ["payments", "Payment History"],
            ["mpesa", "M-Pesa Requests"],
          ].map(([value, label]) => (
            <Button key={value} variant={tab === value ? "default" : "outline"} onClick={() => setTab(value)}>{label}</Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setShowInvoiceModal(true)}><FileText /> Issue Invoice</Button>
          <Button variant="outline" onClick={() => setShowContractModal(true)}><Plus /> New Contract</Button>
          <Button onClick={() => setShowPaymentModal(true)}><CreditCard /> Log Payment</Button>
        </div>
      </div>

      {tab === "invoices" && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Amount Due</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.length === 0 ? <EmptyRow colSpan={7}>No invoices found.</EmptyRow> : invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.id.slice(0, 8)}</TableCell>
                    <TableCell>{formatCurrency(invoice.amount_due)}</TableCell>
                    <TableCell>{formatCurrency(invoice.amount_paid)}</TableCell>
                    <TableCell>{formatCurrency(invoice.balance)}</TableCell>
                    <TableCell>{invoice.due_date}</TableCell>
                    <TableCell><StatusBadge value={invoice.status} label={invoice.status_display} /></TableCell>
                    <TableCell className="text-right">
                      {invoice.status !== "PAID" && (
                        <Button size="sm" variant="outline" onClick={() => { setPaymentForm((current) => ({ ...current, invoice: invoice.id })); setShowPaymentModal(true); }}>
                          Pay
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === "contracts" && (
        <div className="grid gap-4 lg:grid-cols-2">
          {contracts.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-sm text-zinc-500">No contracts found.</CardContent></Card>
          ) : contracts.map((contract) => (
            <Card key={contract.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{contract.id.slice(0, 8)}</CardTitle>
                    <p className="text-sm text-zinc-500">{contract.weeks_paid}/{contract.total_weeks} weeks paid</p>
                  </div>
                  <StatusBadge value={contract.status} label={contract.status_display} />
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                  <div className="h-full bg-emerald-700" style={{ width: `${contract.progress_percent}%` }} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-zinc-500">Weekly</p><p className="font-medium">{formatCurrency(contract.weekly_installment)}</p></div>
                  <div><p className="text-zinc-500">Repayment</p><p className="font-medium">{formatCurrency(contract.total_repayment)}</p></div>
                  <div><p className="text-zinc-500">Billing</p><p className="font-medium">{contract.billing_day_display || contract.billing_day}</p></div>
                  <div><p className="text-zinc-500">Prepayment</p><p className="font-medium">{formatCurrency(contract.prepayment_balance)}</p></div>
                </div>
                <Button variant="outline" onClick={() => { setInvoiceForm((current) => ({ ...current, contract: contract.id, amount_due: contract.weekly_installment })); setShowInvoiceModal(true); }}>
                  <FileText /> Issue Invoice
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {tab === "payments" && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? <EmptyRow colSpan={4}>No payments recorded yet.</EmptyRow> : payments.map((payment) => (
                  <TableRow key={payment.payment_id}>
                    <TableCell className="font-medium">{payment.mpesa_receipt}</TableCell>
                    <TableCell>{payment.invoice?.slice(0, 8)}</TableCell>
                    <TableCell>{formatCurrency(payment.amount)}</TableCell>
                    <TableCell>{payment.created_at ? new Date(payment.created_at).toLocaleDateString("en-KE") : "N/A"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === "mpesa" && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Receipt / Result</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mpesaRequests.length === 0 ? <EmptyRow colSpan={6}>No M-Pesa requests recorded yet.</EmptyRow> : mpesaRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.invoice?.slice(0, 8)}</TableCell>
                    <TableCell>{request.phone_number}</TableCell>
                    <TableCell>{formatCurrency(request.amount)}</TableCell>
                    <TableCell><StatusBadge value={request.status} label={request.status_display} /></TableCell>
                    <TableCell className="max-w-xs truncate">{request.mpesa_receipt || request.result_description || "Waiting for callback"}</TableCell>
                    <TableCell>{request.created_at ? new Date(request.created_at).toLocaleString("en-KE") : "N/A"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DocumentsModule({ documentsHook, driversHook, vehiclesHook }) {
  const { documents, uploadDocument, reviewDocument, isLoading, notice, clearNotice } = documentsHook;
  const { allDrivers } = driversHook;
  const { vehicles } = vehiclesHook;
  const [form, setForm] = useState({
    targetType: "driver",
    targetId: "",
    docType: "IF",
    expiryDate: "",
    file: null,
  });
  const [fileInputKey, setFileInputKey] = useState(0);

  const needsExpiry = EXPIRING_DOCUMENT_TYPES.has(form.docType);
  const targetOptions = form.targetType === "driver" ? allDrivers : vehicles;
  const pendingCount = documents.filter((document) => document.status === "PN").length;
  const expiringSoonCount = documents.filter((document) => {
    if (!document.expiry_date || document.status !== "VR") return false;
    const days = Math.ceil((new Date(document.expiry_date) - new Date()) / 86400000);
    return days >= 0 && days <= 7;
  }).length;

  async function handleUpload(event) {
    event.preventDefault();
    const uploaded = await uploadDocument({
      ...form,
      targetId: form.targetId,
      docType: form.docType,
      expiryDate: form.expiryDate,
    });
    if (!uploaded) return;

    setForm((current) => ({ ...current, expiryDate: "", file: null }));
    setFileInputKey((current) => current + 1);
  }

  return (
    <div className="grid gap-6">
      {notice && (
        <div className="flex items-start justify-between gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <div className="flex items-center gap-2"><Check className="size-4" /><p>{notice}</p></div>
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Dismiss message" onClick={clearNotice}><X /></Button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="All Documents" value={documents.length} meta="Uploaded records" icon={FileText} />
        <StatCard label="Pending Review" value={pendingCount} meta="Awaiting admin action" icon={Clock3} tone="amber" />
        <StatCard label="Verified" value={documents.filter((document) => document.status === "VR").length} meta="Approved documents" icon={ShieldCheck} tone="sky" />
        <StatCard label="Expiring Soon" value={expiringSoonCount} meta="Within seven days" icon={AlertCircle} tone="rose" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Upload className="size-4" /> Upload Document</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 lg:grid-cols-5 lg:items-end" onSubmit={handleUpload}>
            <Field label="Target Type">
              <Select
                value={form.targetType}
                onChange={(value) => setForm((current) => ({ ...current, targetType: value, targetId: "" }))}
              >
                <option value="driver">Driver</option>
                <option value="vehicle">Vehicle</option>
              </Select>
            </Field>
            <Field label={form.targetType === "driver" ? "Driver" : "Vehicle"}>
              <Select
                required
                value={form.targetId}
                onChange={(value) => setForm((current) => ({ ...current, targetId: value }))}
              >
                <option value="">Choose {form.targetType}</option>
                {targetOptions.map((target) => (
                  <option key={target.id} value={target.id}>
                    {form.targetType === "driver" ? target.full_name : `${target.plate_number} - ${target.full_name}`}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Document Type">
              <Select
                required
                value={form.docType}
                onChange={(value) => setForm((current) => ({
                  ...current,
                  docType: value,
                  expiryDate: EXPIRING_DOCUMENT_TYPES.has(value) ? current.expiryDate : "",
                }))}
              >
                {DOCUMENT_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </Select>
            </Field>
            {needsExpiry ? (
              <Field label="Expiry Date">
                <Input
                  required
                  type="date"
                  value={form.expiryDate}
                  onChange={(event) => setForm((current) => ({ ...current, expiryDate: event.target.value }))}
                />
              </Field>
            ) : <div />}
            <Field label="File">
              <Input
                key={fileInputKey}
                required
                type="file"
                onChange={(event) => setForm((current) => ({ ...current, file: event.target.files?.[0] || null }))}
              />
            </Field>
            <Button type="submit" disabled={isLoading || !form.file || !form.targetId}>
              <Upload /> {isLoading ? "Uploading" : "Upload"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>File</TableHead>
                <TableHead className="text-right">Review</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.length === 0 ? <EmptyRow colSpan={6}>No documents uploaded yet.</EmptyRow> : documents.map((document) => (
                <TableRow key={document.id}>
                  <TableCell className="font-medium">{document.doc_type_display}</TableCell>
                  <TableCell>
                    <p>{document.target_name}</p>
                    <p className="text-xs capitalize text-zinc-500">{document.target_type}</p>
                  </TableCell>
                  <TableCell><StatusBadge value={document.status} label={document.status_display} /></TableCell>
                  <TableCell>{document.expiry_date || "Not required"}</TableCell>
                  <TableCell>
                    <Button asChild size="sm" variant="outline">
                      <a href={document.file} target="_blank" rel="noreferrer"><ExternalLink /> Open</a>
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      {document.status !== "VR" && (
                        <Button size="icon-sm" variant="outline" disabled={isLoading} aria-label={`Verify ${document.doc_type_display}`} onClick={() => reviewDocument(document.id, "VR")}><Check /></Button>
                      )}
                      {document.status !== "RJ" && (
                        <Button size="icon-sm" variant="destructive" disabled={isLoading} aria-label={`Reject ${document.doc_type_display}`} onClick={() => reviewDocument(document.id, "RJ")}><X /></Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Sidebar({ activeModule, setActiveModule, requestCount }) {
  return (
    <aside className="border-b border-emerald-800 bg-emerald-700 px-4 py-4 text-white lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-emerald-100">Vehicle Finance</p>
        <h2 className="mt-1 text-lg font-semibold">Admin Console</h2>
      </div>
      <nav className="mt-6 flex gap-2 overflow-x-auto pb-1 text-sm lg:flex-col lg:overflow-visible lg:pb-0">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeModule === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveModule(item.key)}
              className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-left font-medium transition ${
                active ? "bg-white text-emerald-800" : "text-emerald-50 hover:bg-emerald-600 hover:text-white"
              }`}
            >
              <Icon className="size-4" />
              <span>{item.label}</span>
              {item.key === "drivers" && requestCount > 0 && (
                <span className={`ml-auto rounded-full px-2 py-0.5 text-xs ${active ? "bg-emerald-100 text-emerald-800" : "bg-emerald-900 text-white"}`}>
                  {requestCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

export default function AdminDashboard() {
  const [activeModule, setActiveModule] = useState("drivers");
  const driversHook = useAdminDrivers();
  const vehiclesHook = useAdminVehicles();
  const paymentsHook = useAdminPayments();
  const documentsHook = useAdminDocuments();
  const meta = MODULE_META[activeModule];

  const combinedError = driversHook.error || vehiclesHook.error || paymentsHook.error || documentsHook.error;
  const isLoading = driversHook.isLoading || vehiclesHook.isLoading || paymentsHook.isLoading || documentsHook.isLoading;

  const module = useMemo(() => {
    if (activeModule === "drivers") return <DriversModule driversHook={driversHook} />;
    if (activeModule === "vehicles") return <VehiclesModule vehiclesHook={vehiclesHook} driversHook={driversHook} />;
    if (activeModule === "payments") return <PaymentsModule paymentsHook={paymentsHook} driversHook={driversHook} vehiclesHook={vehiclesHook} />;
    return <DocumentsModule documentsHook={documentsHook} driversHook={driversHook} vehiclesHook={vehiclesHook} />;
  }, [activeModule, documentsHook, driversHook, vehiclesHook, paymentsHook]);

  function refreshAll() {
    driversHook.refreshDrivers();
    vehiclesHook.refreshVehicles();
    paymentsHook.refreshPayments();
    documentsHook.refreshDocuments();
  }

  return (
    <main className="min-h-screen bg-white text-zinc-950">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <Sidebar activeModule={activeModule} setActiveModule={setActiveModule} requestCount={driversHook.accessRequests.length} />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex flex-col gap-3 border-b border-zinc-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-8">
            <div>
              <h1 className="text-xl font-semibold">{meta.title}</h1>
              <p className="text-sm text-zinc-500">{meta.desc}</p>
            </div>
            <Button variant="outline" onClick={refreshAll} disabled={isLoading}>
              <RefreshCw className={isLoading ? "animate-spin" : ""} />
              Refresh
            </Button>
          </header>

          <div className="grid gap-6 px-4 py-6 lg:px-8">
            {combinedError && (
              <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <p>{combinedError}</p>
              </div>
            )}
            {module}
          </div>
        </div>
      </div>
    </main>
  );
}
