import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    PieChart, Pie, Cell, Legend, AreaChart, Area 
} from 'recharts';


const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#60a5fa', '#3b82f6'];

import { formatCurrency } from '../../utils/formatUtils';

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="p-3 rounded-4 shadow-2xl border bg-white border-slate-200" style={{ backdropFilter: 'blur(20px)' }}>
                <p className="small fw-black text-uppercase tracking-widest mb-1 text-slate-500">{label}</p>
                <p className="h5 fw-black text-primary m-0">{formatCurrency(payload[0].value)}</p>
            </div>
        );
    }
    return null;
};

export const RevenueChart = ({ data }) => {
    const tickColor = 'rgba(15, 23, 42, 0.5)';
    const gridColor = 'rgba(15, 23, 42, 0.05)';

    return (
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height={300} minWidth={0} minHeight={0}>
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                    <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: tickColor, fontWeight: 'bold' }} 
                    />
                    <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: tickColor, fontWeight: 'bold' }} 
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#6366f1" 
                        strokeWidth={4} 
                        fillOpacity={1} 
                        fill="url(#colorRev)" 
                        animationDuration={1500}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export const TicketDistributionChart = ({ data, title }) => {
    const textColor = '#0f172a';

    return (
        <div className="h-100 d-flex flex-column">
            <h5 className="fw-black small text-uppercase tracking-widest mb-4" style={{ color: textColor }}>{title}</h5>
            <div className="flex-grow-1" style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer width="100%" height={300} minWidth={0} minHeight={0}>
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={100}
                            paddingAngle={8}
                            dataKey="value"
                            stroke="none"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip 
                            contentStyle={{ 
                                backgroundColor: '#fff', 
                                borderRadius: '15px', 
                                border: '1px solid #e2e8f0',
                                backdropFilter: 'blur(10px)'
                            }} 
                            itemStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                        />
                        <Legend 
                            verticalAlign="bottom" 
                            height={36} 
                            iconType="circle" 
                            formatter={(value) => <span className="small fw-bold text-uppercase tracking-tighter" style={{ color: 'rgba(15, 23, 42, 0.6)' }}>{value}</span>}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export const CategoryPerformanceChart = ({ data }) => {
    const tickColor = 'rgba(15, 23, 42, 0.5)';
    const gridColor = 'rgba(15, 23, 42, 0.05)';
    const textColor = '#0f172a';

    return (
        <div style={{ width: '100%', height: 300 }}>
            <h5 className="fw-black small text-uppercase tracking-widest mb-4" style={{ color: textColor }}>Node Saturation by Category</h5>
            <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height={260} minWidth={0} minHeight={0}>
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                        <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fill: tickColor, fontWeight: 'bold' }} 
                        />
                        <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fill: tickColor, fontWeight: 'bold' }} 
                        />
                        <Tooltip 
                            cursor={{ fill: 'rgba(15, 23, 42, 0.03)' }} 
                            contentStyle={{ 
                                backgroundColor: '#fff', 
                                borderRadius: '15px', 
                                border: '1px solid #e2e8f0',
                                backdropFilter: 'blur(10px)'
                            }}
                            itemStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                        />
                        <Bar 
                            dataKey="sales" 
                            fill="url(#colorRev)" 
                            radius={[8, 8, 0, 0]} 
                            barSize={40}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={index === 0 ? '#6366f1' : 'rgba(99, 102, 241, 0.3)'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
