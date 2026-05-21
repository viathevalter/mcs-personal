import type { EnrichedTitulo, DashboardMetrics, FilterState } from '../types';
import { isSameDay, isDateInRange } from './utils';
import { startOfDay, subDays, addDays } from 'date-fns';

// In a real scenario, this would use the user's timezone. 
// We are assuming the browser is set to the correct TZ or using a library like date-fns-tz
const getToday = () => startOfDay(new Date());

export const filterData = (data: EnrichedTitulo[], filters: FilterState): EnrichedTitulo[] => {
    return data.filter(item => {
        // Empresa Filter
        if (filters.empresa.length > 0 && !filters.empresa.includes(item.Empresa)) {
            return false;
        }

        // Periodo Fat Filter
        if (filters.periodoFat && filters.periodoFat.length > 0 && !filters.periodoFat.includes(item.periodo_fat)) {
            return false;
        }

        // Period Filter
        if (filters.periodo[0] && filters.periodo[1] && item.Dt_venc) {
            if (!isDateInRange(item.Dt_venc, filters.periodo[0], filters.periodo[1])) {
                return false;
            }
        }

        // Status Filter
        if (filters.status && filters.status !== 'Todos') {
            if (item.Status !== filters.status) {
                return false;
            }
        }

        // Banco Filter
        if (filters.banco && item.Banco !== filters.banco) return false;

        // Cliente Filter
        if (filters.cliente) {
            const search = filters.cliente.toLowerCase();
            const clienteName = item.clienteInfo?.RazonSocial || item.Cliente || '';
            if (!clienteName.toLowerCase().includes(search)) return false;
        }

        return true;
    });
};

export const calculateMetrics = (data: EnrichedTitulo[]): DashboardMetrics => {
    const today = getToday();
    const yesterday = subDays(today, 1);

    // 1. Recebido ontem
    const recebidoOntemStats = data.reduce((acc, item) => {
        if (!item.dt_recebimento) return acc;

        if (isSameDay(item.dt_recebimento, yesterday)) {
            acc.count += 1;
            if (item.Integral_parcial === 'Parcial' && item.Valor_parcial > 0) {
                acc.value += item.Valor_parcial;
            } else {
                acc.value += item.Valot_total;
            }
        }
        return acc;
    }, { value: 0, count: 0 });

    // 2. Recebido no período
    const recebidoPeriodoStats = data.reduce((acc, item) => {
        if (item.Status === 'Pago' || item.Status === 'Parcial') {
            acc.count += 1;
            const paidAmount = (item.Integral_parcial === 'Parcial' && item.Valor_parcial > 0)
                ? item.Valor_parcial
                : (item.Valot_total - item.Saldo_a_pagar);
            acc.value += paidAmount;
        }
        return acc;
    }, { value: 0, count: 0 });

    // 3. Vencido (Saldo)
    const saldoVencidoStats = data.reduce((acc, item) => {
        if (item.Status !== 'Pago' && item.Dt_venc && item.Dt_venc < today) {
            acc.count += 1;
            acc.value += item.Saldo_a_pagar;
        }
        return acc;
    }, { value: 0, count: 0 });

    // 4. A vencer 30 dias
    const day30 = addDays(today, 30);
    const aVencer30dStats = data.reduce((acc, item) => {
        if (item.Status !== 'Pago' && item.Dt_venc && item.Dt_venc >= today && item.Dt_venc <= day30) {
            acc.count += 1;
            acc.value += item.Saldo_a_pagar;
        }
        return acc;
    }, { value: 0, count: 0 });

    // 5. % Vencido / Total
    const totalOpenStats = data.reduce((acc, item) => {
        // To match "Saldo a Pagar" from Titles page, we sum EVERY item's balance.
        // Even if Status is 'Pago', if it has a balance, it counts towards the total debt in the system.
        acc.value += item.Saldo_a_pagar;
        acc.count += 1;
        return acc;
    }, { value: 0, count: 0 });

    const totalOpenBalance = totalOpenStats.value;
    const percentualVencido = totalOpenBalance > 0 ? (saldoVencidoStats.value / totalOpenBalance) * 100 : 0;

    // 6. Clientes em atraso
    const clientesAtrasoSet = new Set<string>();
    let countClientesAtrasoTitulos = 0;

    data.forEach(item => {
        if (item.Status !== 'Pago' && item.Dt_venc && item.Dt_venc < today) {
            const id = item.CodCliente || item.Cliente;
            if (id) clientesAtrasoSet.add(id);
            countClientesAtrasoTitulos += 1;
        }
    });

    return {
        recebidoOntem: recebidoOntemStats.value,
        countRecebidoOntem: recebidoOntemStats.count,
        recebidoPeriodo: recebidoPeriodoStats.value,
        countRecebidoPeriodo: recebidoPeriodoStats.count,
        saldoVencido: saldoVencidoStats.value,
        countSaldoVencido: saldoVencidoStats.count,
        aVencer30d: aVencer30dStats.value,
        countAVencer30d: aVencer30dStats.count,
        percentualVencido,
        clientesAtraso: clientesAtrasoSet.size,
        countClientesAtrasoTitulos,
        totalOpenBalance,
        countTotalOpen: totalOpenStats.count
    };
};

export const getAgingData = (data: EnrichedTitulo[]) => {
    const today = getToday();
    const buckets = {
        '1-30': 0,
        '31-60': 0,
        '61-90': 0,
        '90+': 0
    };

    data.forEach(item => {
        if (item.Status !== 'Pago' && item.Dt_venc && item.Dt_venc < today) {
            const diffTime = Math.abs(today.getTime() - item.Dt_venc.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const balance = item.Saldo_a_pagar;

            if (diffDays <= 30) buckets['1-30'] += balance;
            else if (diffDays <= 60) buckets['31-60'] += balance;
            else if (diffDays <= 90) buckets['61-90'] += balance;
            else buckets['90+'] += balance;
        }
    });

    return [
        { name: '1-30 Dias', value: buckets['1-30'], fill: '#fca5a5' }, // Red-300
        { name: '31-60 Dias', value: buckets['31-60'], fill: '#f87171' }, // Red-400
        { name: '61-90 Dias', value: buckets['61-90'], fill: '#ef4444' }, // Red-500
        { name: '90+ Dias', value: buckets['90+'], fill: '#b91c1c' }, // Red-700
    ];
};

export const getTreemapData = (data: EnrichedTitulo[], dimension: 'Cliente' | 'Empresa' | 'Obra' | 'Banco') => {
    const today = getToday();

    const groups: Record<string, {
        name: string,
        value: number,
        count: number,
        totalDelayDays: number
    }> = {};

    data.forEach(item => {
        if (item.Status === 'Pago' || !item.Dt_venc || item.Dt_venc >= today) return;

        let key = '';
        switch (dimension) {
            case 'Cliente':
                key = item.clienteInfo?.NombreComercial || item.Cliente || 'Indefinido';
                break;
            case 'Empresa':
                key = item.Empresa || 'Indefinida';
                break;
            case 'Obra':
                key = item.Obra || 'Indefinida';
                break;
            case 'Banco':
                key = item.Banco || 'Indefinido';
                break;
        }
        if (!key || !key.trim()) key = 'Indefinido';

        if (!groups[key]) {
            groups[key] = {
                name: key,
                value: 0,
                count: 0,
                totalDelayDays: 0
            };
        }

        const diffTime = today.getTime() - item.Dt_venc.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        groups[key].value += item.Saldo_a_pagar;
        groups[key].count += 1;
        groups[key].totalDelayDays += diffDays;
    });

    const result = Object.values(groups).map(g => {
        const avgDelay = Math.round(g.totalDelayDays / g.count);

        let fillColor = '#FF0000'; // > 180 days (Red)

        if (avgDelay <= 30) fillColor = '#FFFF00';       // 0-30: Yellow
        else if (avgDelay <= 60) fillColor = '#FFD700';  // 31-60: Gold
        else if (avgDelay <= 90) fillColor = '#FFA500';  // 61-90: Orange
        else if (avgDelay <= 120) fillColor = '#FF8C00'; // 91-120: DarkOrange
        else if (avgDelay <= 180) fillColor = '#FF4500'; // 121-180: OrangeRed

        return {
            name: g.name,
            value: g.value,
            qtdTitulos: g.count,
            atrasoMedio: avgDelay,
            fill: fillColor
        };
    });

    result.sort((a, b) => b.value - a.value);

    return result;
};

export const getAnalysisMetrics = (data: EnrichedTitulo[]) => {
    const today = getToday();

    const overdueItems = data.filter(i => i.Status !== 'Pago' && i.Dt_venc && i.Dt_venc < today);
    const totalOverdue = overdueItems.reduce((acc, i) => acc + i.Saldo_a_pagar, 0);

    // 1. Concentração do Risco
    const clientRiskMap: Record<string, number> = {};
    overdueItems.forEach(i => {
        const name = i.clienteInfo?.NombreComercial || i.Cliente || 'Indefinido';
        clientRiskMap[name] = (clientRiskMap[name] || 0) + i.Saldo_a_pagar;
    });

    const sortedClients = Object.entries(clientRiskMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    const top5Val = sortedClients.slice(0, 5).reduce((acc, c) => acc + c.value, 0);
    const top10Val = sortedClients.slice(0, 10).reduce((acc, c) => acc + c.value, 0);

    const concentration = {
        top5Percent: totalOverdue > 0 ? (top5Val / totalOverdue) * 100 : 0,
        top10Percent: totalOverdue > 0 ? (top10Val / totalOverdue) * 100 : 0,
        restPercent: totalOverdue > 0 ? ((totalOverdue - top10Val) / totalOverdue) * 100 : 0,
        top5Clients: sortedClients.slice(0, 5),
        totalOverdue
    };

    // 2. Ranking de Clientes Reincidentes
    const debtorStats: Record<string, { count: number, totalDelay: number, balance: number, empresa: string, clientName: string }> = {};
    overdueItems.forEach(i => {
        const name = i.clienteInfo?.NombreComercial || i.Cliente || 'Indefinido';
        const empresa = i.Empresa || 'N/A';
        const key = `${name}|||${empresa}`;

        if (!debtorStats[key]) {
            debtorStats[key] = {
                count: 0,
                totalDelay: 0,
                balance: 0,
                empresa: empresa,
                clientName: name
            };
        }

        const diffDays = Math.ceil((today.getTime() - (i.Dt_venc?.getTime() || today.getTime())) / (1000 * 60 * 60 * 24));

        debtorStats[key].count += 1;
        debtorStats[key].totalDelay += diffDays;
        debtorStats[key].balance += i.Saldo_a_pagar;
    });

    const recurringDebtors = Object.values(debtorStats).map(stats => ({
        name: stats.clientName,
        empresa: stats.empresa,
        count: stats.count,
        avgDelay: Math.round(stats.totalDelay / stats.count),
        balance: stats.balance
    })).sort((a, b) => b.balance - a.balance);

    // 3. Performance por Empresa
    const companyStats: Record<string, { received: number, overdue: number }> = {};
    data.forEach(i => {
        const comp = i.Empresa || 'N/A';
        if (!companyStats[comp]) companyStats[comp] = { received: 0, overdue: 0 };

        if (i.Status === 'Pago' || i.Status === 'Parcial') {
            const paid = (i.Integral_parcial === 'Parcial' && i.Valor_parcial > 0) ? i.Valor_parcial : (i.Valot_total - i.Saldo_a_pagar);
            companyStats[comp].received += paid;
        }

        if (i.Status !== 'Pago' && i.Dt_venc && i.Dt_venc < today) {
            companyStats[comp].overdue += i.Saldo_a_pagar;
        }
    });

    const performanceByCompany = Object.entries(companyStats).map(([name, stats]) => ({
        name,
        recebido: stats.received,
        vencido: stats.overdue
    })).sort((a, b) => b.vencido - a.vencido);

    return {
        concentration,
        recurringDebtors,
        performanceByCompany
    };
};
