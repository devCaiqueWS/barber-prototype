"use client";

import { useEffect, useState } from "react";
import { Scissors } from "lucide-react";

type Service = {
  id: string
  name: string
  price: number
  duration: number
  createdAt?: string
}

export default function ServicesList() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await fetch('/api/admin/services')
        const data = await res.json()
        const list = Array.isArray(data) ? data : (Array.isArray(data?.services) ? data.services : [])
        setServices(list as Service[])
      } catch (e) {
        console.error('Erro ao carregar serviços:', e)
        setServices([])
      } finally {
        setLoading(false)
      }
    }
    fetchServices()
  }, [])

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  return (
    <div className="space-y-4">
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <colgroup>
              <col className="w-1/2" />
              <col className="w-1/4" />
              <col className="w-1/4" />
            </colgroup>
            <thead className="bg-slate-700">
              <tr>
                <th className="text-left py-3 px-4 text-slate-300">Serviço</th>
                <th className="text-left py-3 px-4 text-slate-300">Preço</th>
                <th className="text-left py-3 px-4 text-slate-300">Duração</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              {loading ? (
                <tr><td colSpan={3} className="py-6 text-center">Carregando serviços...</td></tr>
              ) : services.length === 0 ? (
                <tr><td colSpan={3} className="py-6 text-center">Nenhum serviço cadastrado</td></tr>
              ) : (
                services.map(s => (
                  <tr key={s.id} className="border-t border-slate-700">
                    <td className="py-3 px-4 table-cell align-middle">
                      <Scissors className="h-4 w-4 text-amber-500" />
                      <span>{s.name}</span>
                    </td>
                    <td className="py-3 px-4 table-cell align-middle whitespace-nowrap">
                      {formatCurrency(s.price)}
                    </td>
                    <td className="py-3 px-4 table-cell align-middle whitespace-nowrap">
                      {s.duration} min
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
