import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const format = (searchParams.get('format') || 'xlsx').toLowerCase()
    const startDate = searchParams.get('startDate') || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0]
    const status = searchParams.get('status') || undefined
    const client = searchParams.get('client') || undefined
    const barberId = searchParams.get('barberId') || undefined
    const serviceId = searchParams.get('serviceId') || undefined

    const where: any = {
      date: { gte: startDate, lte: endDate },
      ...(status ? { status } : {}),
      ...(barberId ? { barberId } : {}),
      ...(serviceId ? { serviceId } : {})
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        service: { select: { name: true, price: true, duration: true } },
        barber: { select: { name: true } },
        client: { select: { name: true, email: true } }
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }]
    })

    const filtered = client
      ? appointments.filter(a => (a.clientName || '').toLowerCase().includes(client.toLowerCase()) || (a.client?.email || '').toLowerCase().includes(client.toLowerCase()))
      : appointments

    const rows = filtered.map(a => ({
      Data: a.date,
      Inicio: a.startTime,
      Fim: a.endTime,
      Barbeiro: a.barber?.name || '',
      Cliente: a.clientName,
      Email: a.clientEmail,
      Servico: a.service?.name || '',
      DuracaoMin: a.service?.duration ?? '',
      Preco: a.service?.price ?? 0,
      Status: a.status,
      Origem: (a as any).source || 'online',
      Pagamento: a.paymentMethod,
      Observacoes: a.notes || ''
    }))

    if (format === 'csv') {
      const header = Object.keys(rows[0] || { Data: '', Inicio: '', Fim: '', Barbeiro: '', Cliente: '', Email: '', Servico: '', DuracaoMin: '', Preco: '', Status: '', Origem: '', Pagamento: '', Observacoes: '' })
      const csv = [header.join(';')].concat(rows.map(r => header.map(h => sanitizeCsv(String((r as any)[h] ?? ''))).join(';'))).join('\n')
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="atendimentos_${startDate}_${endDate}.csv"`
        }
      })
    }

    // XLSX
    // Dynamic import to avoid bundler issues
    const ExcelJS = await import('exceljs')
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Atendimentos')

    const columns = [
      { header: 'Data', key: 'Data', width: 12 },
      { header: 'Início', key: 'Inicio', width: 10 },
      { header: 'Fim', key: 'Fim', width: 10 },
      { header: 'Barbeiro', key: 'Barbeiro', width: 22 },
      { header: 'Cliente', key: 'Cliente', width: 22 },
      { header: 'Email', key: 'Email', width: 28 },
      { header: 'Serviço', key: 'Servico', width: 24 },
      { header: 'Duração (min)', key: 'DuracaoMin', width: 14 },
      { header: 'Preço (R$)', key: 'Preco', width: 12 },
      { header: 'Status', key: 'Status', width: 14 },
      { header: 'Origem', key: 'Origem', width: 12 },
      { header: 'Pagamento', key: 'Pagamento', width: 14 },
      { header: 'Observações', key: 'Observacoes', width: 32 }
    ] as const

    // @ts-ignore exceljs types
    ws.columns = columns as any
    ws.addRows(rows)

    // Bold header
    ws.getRow(1).font = { bold: true }

    const buffer = await wb.xlsx.writeBuffer()
    return new NextResponse(Buffer.from(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="atendimentos_${startDate}_${endDate}.xlsx"`
      }
    })
  } catch (error) {
    console.error('Erro ao exportar relatório:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

function sanitizeCsv(value: string) {
  // Escape quotes and wrap fields containing separators/newlines
  let v = value.replace(/"/g, '""')
  if (/[;\n\r]/.test(v)) v = `"${v}"`
  return v
}
