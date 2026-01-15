"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatDateBR, formatDateKey } from "@/lib/date";

type AppointmentRow = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  clientName: string;
  clientEmail: string;
  barber?: { name: string } | null;
  service?: { name: string; price: number; duration: number } | null;
  paymentMethod?: string | null;
  notes?: string | null;
};

export default function AppointmentsReportTable() {
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    return {
      startDate: formatDateKey(new Date(now.getFullYear(), now.getMonth(), 1)),
      endDate: formatDateKey(now),
    };
  });
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "confirmed" | "completed" | "cancelled"
  >("all");
  const [clientFilter, setClientFilter] = useState("");

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        type: "appointments",
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
      const res = await fetch(`/api/admin/reports?${params}`);
      const data = await res.json();
      const rows = Array.isArray(data?.data)
        ? (data.data as AppointmentRow[])
        : [];
      setAppointments(rows);
    } catch (e) {
      console.error("Erro ao carregar atendimentos:", e);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange.startDate, dateRange.endDate]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  const formatDate = (dateString: string) => formatDateBR(dateString);

  const filteredAppointments = appointments.filter((a) => {
    const statusOk = statusFilter === "all" || a.status === statusFilter;
    const clientOk =
      clientFilter.trim().length === 0 ||
      a.clientName
        ?.toLowerCase()
        .includes(clientFilter.toLowerCase()) ||
      a.clientEmail
        ?.toLowerCase()
        .includes(clientFilter.toLowerCase());
    return statusOk && clientOk;
  });

  const exportAppointments = async (format: "xlsx" | "csv") => {
    try {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        format,
      });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (clientFilter.trim())
        params.set("client", clientFilter.trim());
      const response = await fetch(
        `/api/admin/reports/export?${params.toString()}`
      );
      if (!response.ok) throw new Error("Falha ao exportar");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `atendimentos_${dateRange.startDate}_${dateRange.endDate}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erro ao exportar atendimentos:", error);
      alert("Erro ao exportar atendimentos");
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 mt-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full md:w-auto">
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Data Inicial
            </label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) =>
                setDateRange((prev) => ({
                  ...prev,
                  startDate: e.target.value,
                }))
              }
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Data Final
            </label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) =>
                setDateRange((prev) => ({
                  ...prev,
                  endDate: e.target.value,
                }))
              }
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Status
            </label>
              <select
	              value={statusFilter}
	              onChange={(e) =>
	                setStatusFilter(
	                  e.target.value as
	                    | "all"
	                    | "pending"
	                    | "confirmed"
	                    | "completed"
	                    | "cancelled",
	                )
	              }
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">Todos</option>
              <option value="pending">Pendentes</option>
              <option value="confirmed">Confirmados</option>
              <option value="completed">Concluídos</option>
              <option value="cancelled">Cancelados</option>
            </select>
          </div>
        </div>

        <div className="flex-1 md:flex-none grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Cliente
            </label>
            <input
              type="text"
              placeholder="Nome ou email"
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div className="flex items-end gap-2">
            <Button
              onClick={fetchAppointments}
              className="bg-slate-600 hover:bg-slate-500"
            >
              Aplicar
            </Button>
            <Button
              onClick={() => exportAppointments("xlsx")}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Exportar XLSX
            </Button>
            <Button
              variant="outline"
              onClick={() => exportAppointments("csv")}
              className="border-slate-600 text-white hover:bg-slate-700"
            >
              CSV
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-slate-300">
              <th className="py-2 px-3 border-b border-slate-700">
                Nº Atendimento
              </th>
              <th className="py-2 px-3 border-b border-slate-700">
                Cliente
              </th>
              <th className="py-2 px-3 border-b border-slate-700">
                Serviço
              </th>
              <th className="py-2 px-3 border-b border-slate-700">
                Produtos
              </th>
              <th className="py-2 px-3 border-b border-slate-700">
                Valores
              </th>
              <th className="py-2 px-3 border-b border-slate-700">
                Forma de Pagamento
              </th>
              <th className="py-2 px-3 border-b border-slate-700">
                Horário
              </th>
              <th className="py-2 px-3 border-b border-slate-700">
                Observação
              </th>
              <th className="py-2 px-3 border-b border-slate-700">
                Data
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={9}
                  className="py-6 text-center text-slate-400"
                >
                  Carregando atendimentos...
                </td>
              </tr>
            ) : filteredAppointments.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="py-6 text-center text-slate-400"
                >
                  Sem registros no período
                </td>
              </tr>
            ) : (
              filteredAppointments.map((a) => (
                <tr key={a.id} className="text-slate-200">
                  <td className="py-2 px-3 border-b border-slate-800">
                    {a.id}
                  </td>
                  <td className="py-2 px-3 border-b border-slate-800">
                    {a.clientName}
                  </td>
                  <td className="py-2 px-3 border-b border-slate-800">
                    {a.service?.name || "-"}
                  </td>
                  <td className="py-2 px-3 border-b border-slate-800">
                    -
                  </td>
                  <td className="py-2 px-3 border-b border-slate-800">
                    {a.service
                      ? formatCurrency(a.service.price)
                      : "-"}
                  </td>
                  <td className="py-2 px-3 border-b border-slate-800">
                    {a.paymentMethod || "-"}
                  </td>
                  <td className="py-2 px-3 border-b border-slate-800">
                    {a.startTime}
                    {a.endTime ? ` - ${a.endTime}` : ""}
                  </td>
                  <td className="py-2 px-3 border-b border-slate-800">
                    {a.notes || "-"}
                  </td>
                  <td className="py-2 px-3 border-b border-slate-800">
                    {formatDate(a.date)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
