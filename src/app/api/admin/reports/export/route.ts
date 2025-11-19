import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

type ExportRow = {
  NumeroAtendimento: string
  Cliente: string | null
  Servico: string
  Produtos: string
  Valores: number
  FormaPagamento: string
  Horario: string
  Observacao: string
  Data: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const format = (searchParams.get('format') || 'xlsx').toLowerCase()
    const startDate =
      searchParams.get('startDate') ||
      new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
    const endDate =
      searchParams.get('endDate') || new Date().toISOString().split('T')[0]
    const status = searchParams.get('status') || undefined
    const client = searchParams.get('client') || undefined
    const barberId = searchParams.get('barberId') || undefined
    const serviceId = searchParams.get('serviceId') || undefined

    const where: Prisma.AppointmentWhereInput = {
      date: { gte: startDate, lte: endDate },
      ...(status ? { status } : {}),
      ...(barberId ? { barberId } : {}),
      ...(serviceId ? { serviceId } : {}),
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        service: { select: { name: true, price: true, duration: true } },
        barber: { select: { name: true } },
        client: { select: { name: true, email: true } },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    })

    const filtered = client
      ? appointments.filter(
          (a) =>
            (a.clientName || '')
              .toLowerCase()
              .includes(client.toLowerCase()) ||
            (a.client?.email || '')
              .toLowerCase()
              .includes(client.toLowerCase()),
        )
      : appointments

    // Novo layout de relatório:
    // 1. Número de Atendimento (ID)
    // 2. Cliente (Nome)
    // 3. Serviço
    // 4. Produtos
    // 5. Valores
    // 6. Forma de Pagamento
    // 7. Horário
    // 8. Observação
    // 9. Data
    const tableRows = filtered.map((a) => ({
      id: a.id,
      clientName: a.clientName,
      date: a.date,
      startTime: a.startTime,
      status: a.status,
      service: {
        id: a.serviceId,
        name: a.service?.name || '',
      },
    }))

    const exportRows: ExportRow[] = filtered.map((a) => ({
      NumeroAtendimento: a.id,
      Cliente: a.clientName,
      Servico: a.service?.name || '',
      Produtos: '',
      Valores: a.service?.price ?? 0,
      FormaPagamento: a.paymentMethod || '',
      Horario: `${a.startTime || ''}${a.endTime ? ` - ${a.endTime}` : ''}`,
      Observacao: a.notes || '',
      Data: a.date,
    }))

    if (format === 'json') {
      return NextResponse.json({ rows: tableRows })
    }

    if (format === 'csv') {
      const header = Object.keys(
        exportRows[0] || {
          NumeroAtendimento: '',
          Cliente: '',
          Servico: '',
          Produtos: '',
          Valores: '',
          FormaPagamento: '',
          Horario: '',
          Observacao: '',
          Data: '',
        },
      ) as Array<keyof ExportRow>
      const csv = [header.join(';')]
        .concat(
          exportRows.map((r) =>
            header
              .map((h) =>
                sanitizeCsv(String(r[h] ?? '')),
              )
              .join(';'),
          ),
        )
        .join('\n')
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="atendimentos_${startDate}_${endDate}.csv"`,
        },
      })
    }

    // XLSX
    const ExcelJS = await import('exceljs')
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Atendimentos')

    const columns = [
      {
        header: 'Número de Atendimento',
        key: 'NumeroAtendimento',
        width: 22,
      },
      { header: 'Cliente', key: 'Cliente', width: 24 },
      { header: 'Serviço', key: 'Servico', width: 24 },
      { header: 'Produtos', key: 'Produtos', width: 24 },
      { header: 'Valores', key: 'Valores', width: 12 },
      {
        header: 'Forma de Pagamento',
        key: 'FormaPagamento',
        width: 18,
      },
      { header: 'Horário', key: 'Horario', width: 18 },
      {
        header: 'Observação',
        key: 'Observacao',
        width: 32,
      },
      { header: 'Data', key: 'Data', width: 14 },
    ] as const

    ws.columns = columns as unknown as typeof ws.columns
    ws.addRows(exportRows)

    ws.getRow(1).font = { bold: true }

    const buffer = await wb.xlsx.writeBuffer()
    return new NextResponse(Buffer.from(buffer), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="atendimentos_${startDate}_${endDate}.xlsx"`,
      },
    })
  } catch (error) {
    console.error('Erro ao exportar relatório:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 },
    )
  }
}

function sanitizeCsv(value: string) {
  let v = value.replace(/"/g, '""')
  if (/[;\n\r]/.test(v)) v = `"${v}"`
  return v
}
