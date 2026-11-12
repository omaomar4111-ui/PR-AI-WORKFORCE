"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Plus,
  Trash2,
  ExternalLink,
  Building2,
  Mail,
  Phone,
  UserCheck,
  AlertCircle,
  X,
  Check,
} from "lucide-react";

import AppShell from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import {
  Client,
  User,
  fetchClients,
  createClient,
  deleteClient,
  fetchUsers,
  getStoredUser,
} from "@/lib/api";

const PRESET_COLORS = [
  "#8b5cf6", // Purple
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#ec4899", // Pink
  "#06b6d4", // Cyan
];

export default function ClientsPage() {
  const { t, isAr } = useI18n();
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("PR & Communications");
  const [brandColor, setBrandColor] = useState("#8b5cf6");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [assignedTo, setAssignedTo] = useState("");

  const currentUser = getStoredUser();
  const isOwner = currentUser?.role === "owner";

  const loadData = async (query?: string) => {
    try {
      setLoading(true);
      setError(null);
      const [clientsData, usersData] = await Promise.all([
        fetchClients(query),
        fetchUsers().catch(() => []),
      ]);
      setClients(clientsData);
      setUsers(usersData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load clients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(search);
  }, [search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setActionLoading(true);
      await createClient({
        name: name.trim(),
        industry: industry.trim(),
        brand_color: brandColor,
        contact_name: contactName.trim() || undefined,
        contact_email: contactEmail.trim() || undefined,
        contact_phone: contactPhone.trim() || undefined,
        assigned_to: assignedTo || undefined,
      });

      // Reset and close
      setName("");
      setIndustry("PR & Communications");
      setBrandColor("#8b5cf6");
      setContactName("");
      setContactEmail("");
      setContactPhone("");
      setAssignedTo("");
      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Error creating client");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (clientId: string, clientName: string) => {
    if (!confirm(`${t("clients.delete_confirm")} (${clientName})`)) return;

    try {
      await deleteClient(clientId);
      await loadData(search);
    } catch (err: any) {
      alert(err.message || "Failed to delete client");
    }
  };

  return (
    <AppShell>
      {/* Page Title & Actions */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            {t("clients.title")}
          </h1>
          <p className="mt-1 text-xs text-gray-400">{t("clients.subtitle")}</p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#8b5cf6] px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-[#8b5cf6]/20 transition hover:bg-[#7c3aed]"
        >
          <Plus className="h-4 w-4" />
          <span>{t("clients.new_button")}</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6 flex items-center rounded-xl border border-gray-800 bg-[#13151f] px-3.5 py-2">
        <Search className="h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t("clients.search")}
          className="ml-2 w-full bg-transparent text-xs text-white placeholder-gray-500 focus:outline-none"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="text-gray-500 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Clients Table */}
      <div className="overflow-hidden rounded-xl border border-gray-800 bg-[#13151f] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-gray-800 bg-[#161824] text-[11px] uppercase tracking-wider text-gray-400">
              <tr>
                <th className="px-5 py-3.5">{t("clients.col_client")}</th>
                <th className="px-5 py-3.5">{t("clients.col_industry")}</th>
                <th className="px-5 py-3.5">{t("clients.col_contact")}</th>
                <th className="px-5 py-3.5">{t("clients.col_assigned")}</th>
                <th className="px-5 py-3.5 text-right">
                  {t("clients.col_actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-5 py-4">
                      <div className="h-4 w-32 bg-gray-800 rounded mb-1.5" />
                      <div className="h-3 w-20 bg-gray-800/60 rounded" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-4 w-24 bg-gray-800 rounded" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-4 w-28 bg-gray-800 rounded" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-4 w-20 bg-gray-800 rounded" />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="h-4 w-12 bg-gray-800 rounded ml-auto" />
                    </td>
                  </tr>
                ))
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <Building2 className="mx-auto h-8 w-8 text-gray-600 mb-2" />
                    <p className="text-xs text-gray-400">
                      {search ? t("clients.empty") : t("clients.empty_create")}
                    </p>
                  </td>
                </tr>
              ) : (
                clients.map(client => (
                  <tr key={client.id} className="transition hover:bg-[#181a26]">
                    {/* Name + Brand Color */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-3 w-3 shrink-0 rounded-full shadow"
                          style={{
                            backgroundColor: client.brand_color || "#8b5cf6",
                          }}
                        />
                        <div>
                          <Link
                            href={`/clients/${client.id}`}
                            className="font-bold text-white hover:text-[#a78bfa] transition"
                          >
                            {client.name}
                          </Link>
                          <p className="text-[10px] text-gray-500 font-mono">
                            {new Date(client.created_at).toLocaleDateString(
                              isAr ? "ar-EG" : "en-US"
                            )}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Industry */}
                    <td className="px-5 py-3.5">
                      <span className="rounded-md border border-gray-800 bg-[#1a1c27] px-2 py-0.5 text-[10px] font-medium text-gray-300">
                        {client.industry}
                      </span>
                    </td>

                    {/* Contact */}
                    <td className="px-5 py-3.5">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-gray-200">
                          {client.contact_name || "—"}
                        </p>
                        {client.contact_email && (
                          <p className="text-[10px] text-gray-400 flex items-center gap-1">
                            <Mail className="h-2.5 w-2.5 text-gray-500" />
                            <span>{client.contact_email}</span>
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Assigned User */}
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 rounded bg-[#8b5cf6]/10 px-2 py-0.5 text-[10px] font-semibold text-[#c4b5fd]">
                        <UserCheck className="h-3 w-3" />
                        <span>
                          {client.assigned_user_name ||
                            (isOwner ? "All Team" : "Assigned")}
                        </span>
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/clients/${client.id}`}
                          className="rounded-lg border border-gray-800 bg-[#1a1c27] px-2.5 py-1 text-[11px] font-semibold text-gray-300 hover:border-[#8b5cf6] hover:text-white"
                        >
                          {t("clients.view")}
                        </Link>
                        <button
                          onClick={() => handleDelete(client.id, client.name)}
                          className="rounded-lg border border-red-500/30 bg-red-500/10 p-1 text-red-400 hover:bg-red-500/20"
                          title={t("clients.delete")}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Client Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl border border-gray-800 bg-[#13151f] p-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-800">
              <h3 className="text-base font-bold text-white">
                {t("client_modal.title_new")}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  {t("client_modal.name")} *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Nile Media Group"
                  className="w-full rounded-lg border border-gray-800 bg-[#181a26] px-3 py-2 text-xs text-white placeholder-gray-500 focus:border-[#8b5cf6] focus:outline-none"
                />
              </div>

              {/* Industry & Brand Color */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    {t("client_modal.industry")}
                  </label>
                  <input
                    type="text"
                    value={industry}
                    onChange={e => setIndustry(e.target.value)}
                    placeholder="e.g. Telecom / FMCG"
                    className="w-full rounded-lg border border-gray-800 bg-[#181a26] px-3 py-2 text-xs text-white placeholder-gray-500 focus:border-[#8b5cf6] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    {t("client_modal.brand_color")}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={brandColor}
                      onChange={e => setBrandColor(e.target.value)}
                      className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent"
                    />
                    <div className="flex items-center gap-1">
                      {PRESET_COLORS.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setBrandColor(c)}
                          className="h-4 w-4 rounded-full border border-gray-700 transition hover:scale-110"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    {t("client_modal.contact_name")}
                  </label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={e => setContactName(e.target.value)}
                    placeholder="e.g. Tarek Omar"
                    className="w-full rounded-lg border border-gray-800 bg-[#181a26] px-3 py-2 text-xs text-white placeholder-gray-500 focus:border-[#8b5cf6] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    {t("client_modal.contact_email")}
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={e => setContactEmail(e.target.value)}
                    placeholder="tarek@nile.eg"
                    className="w-full rounded-lg border border-gray-800 bg-[#181a26] px-3 py-2 text-xs text-white placeholder-gray-500 focus:border-[#8b5cf6] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    {t("client_modal.contact_phone")}
                  </label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={e => setContactPhone(e.target.value)}
                    placeholder="+201..."
                    className="w-full rounded-lg border border-gray-800 bg-[#181a26] px-3 py-2 text-xs text-white placeholder-gray-500 focus:border-[#8b5cf6] focus:outline-none"
                  />
                </div>
              </div>

              {/* Assign To (for Owners) */}
              {isOwner && (
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    {t("client_modal.assigned_to")}
                  </label>
                  <select
                    value={assignedTo}
                    onChange={e => setAssignedTo(e.target.value)}
                    className="w-full rounded-lg border border-gray-800 bg-[#181a26] px-3 py-2 text-xs text-white focus:border-[#8b5cf6] focus:outline-none"
                  >
                    <option value="">{t("client_modal.unassigned")}</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.full_name || u.email} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-gray-800 bg-[#181a26] px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-[#202333]"
                >
                  {t("client_modal.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-lg bg-[#8b5cf6] px-4 py-2 text-xs font-bold text-white shadow-lg shadow-[#8b5cf6]/20 hover:bg-[#7c3aed] disabled:opacity-50"
                >
                  {actionLoading
                    ? t("client_modal.saving")
                    : t("client_modal.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
