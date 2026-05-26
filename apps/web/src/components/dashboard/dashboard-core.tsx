'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { Activity, AlertCircle, ArrowUpRight, BarChart3, Bell, BrainCircuit, Building2, Clock, Eye, GitBranch, Globe2, KeyRound, Landmark, Loader2, MessageSquare, Minus, PackageCheck, Plug, Plus, Route, ShieldCheck, ShoppingCart, Timer, TrendingUp, UserCheck, Users, WalletCards, Workflow, Zap } from 'lucide-react';
import { ActivityStream, Badge, Button, Card, Input, InsightBanner, IntelligenceCard, MetricCard, ModalFrame, OperationalStatusChip, SearchInput, Skeleton, SlaMeter } from '@kitchenflow/ui';
import type { Channel, InventoryItem, MenuItem, OperationalActivity, OperationsNotification, Order, OrderStatus, PaginatedResponse, Role } from '@kitchenflow/types';
import { formatMoney, percentage, statusCopy, statusTone } from '@kitchenflow/utils';
import { useAuth } from '@/components/auth/auth-provider';
import { dashboardApi, type CreateOrderInput } from '@/lib/dashboard-api';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  useActivity,
  useAnalyticsSummary,
  useAudit,
  useControlCenter,
  useDlq,
  useIntegrations,
  useInventory,
  useMenus,
  useOrders,
  useOperationalIntelligence,
  usePayoutReconciliation,
  useQueueActivity,
  useQueueMetrics,
  useSystemMetrics,
  useWebhooks
} from '@/hooks/use-dashboard-data';
import { useOpsStore } from '@/store/ops-store';

const statusFilters: Array<OrderStatus | 'all'> = ['all', 'pending', 'accepted', 'preparing', 'dispatched', 'delivered', 'cancelled'];
const channelFilters: Array<Channel | 'all'> = ['all', 'deliveroo', 'talabat', 'careem', 'noon_food', 'hungerstation', 'jahez', 'uber_eats'];
const activeQueueStatuses: OrderStatus[] = ['pending', 'accepted', 'preparing', 'dispatched'];
const regionalPerformance = [
  { region: 'Dubai Marina', orders: 286, sla: 96, latency: '18m', tone: 'good' },
  { region: 'Business Bay', orders: 241, sla: 93, latency: '21m', tone: 'good' },
  { region: 'Abu Dhabi Yas', orders: 188, sla: 89, latency: '24m', tone: 'watch' },
  { region: 'Sharjah Majaz', orders: 122, sla: 84, latency: '29m', tone: 'risk' }
];
const peakHourData = [
  { hour: '10', orders: 42, cancellations: 2 },
  { hour: '12', orders: 96, cancellations: 4 },
  { hour: '14', orders: 72, cancellations: 3 },
  { hour: '18', orders: 132, cancellations: 6 },
  { hour: '20', orders: 168, cancellations: 8 },
  { hour: '22', orders: 118, cancellations: 5 }
];
const activityFeed = [
  { time: '16:02', detail: 'Talabat sync recovered for Dubai Marina', tone: 'good' as const },
  { time: '15:57', detail: 'Business Bay prep station nearing SLA threshold', tone: 'warning' as const },
  { time: '15:44', detail: 'Noon Food menu push completed across 8 outlets', tone: 'good' as const },
  { time: '15:31', detail: 'Inventory alert created for Yas Cloud Dining', tone: 'warning' as const }
];
const predictiveSignals = [
  { title: 'Demand spike forecast', detail: 'Peak burger demand expected in Dubai Marina after 7 PM. Prep buffer should increase by 14 portions.', meta: '+18% demand', tone: 'warning' as const },
  { title: 'Cancellation anomaly', detail: 'Careem cancellations are trending 2.1x above baseline at Abu Dhabi Yas during courier handoff.', meta: 'incident', tone: 'critical' as const },
  { title: 'Revenue opportunity', detail: 'High-margin bowls are converting 9% better on direct orders than aggregators in Business Bay.', meta: 'AED 8.4k upside', tone: 'good' as const }
];
const bottleneckFunnel = [
  { stage: 'Placed', value: 100, detail: 'all channels' },
  { stage: 'Accepted', value: 94, detail: '6% manual review' },
  { stage: 'Prepared', value: 88, detail: 'prep pressure' },
  { stage: 'Dispatched', value: 82, detail: 'rider wait' },
  { stage: 'Delivered', value: 78, detail: 'completed' }
];
const automationRules = [
  { name: 'Auto-pause low-stock SKUs', trigger: 'Stock below 12% and demand forecast above baseline', action: 'Pause affected modifiers on Deliveroo, Talabat, and Careem', status: 'active', impact: '18 menu saves' },
  { name: 'SLA breach escalation', trigger: 'Prep or dispatch timer inside final 5 minutes', action: 'Assign outlet manager, notify runner lead, open incident thread', status: 'active', impact: '7 escalations' },
  { name: 'Courier delay routing', trigger: 'Aggregator pickup wait exceeds 9 minutes', action: 'Recommend alternate courier channel and reorder dispatch queue', status: 'draft', impact: 'AED 3.6k protected' },
  { name: 'Cancellation anomaly alert', trigger: 'Channel cancellation rate 2x outlet baseline', action: 'Create risk task and request menu/channel audit', status: 'active', impact: '2 anomalies' }
];
const automationRuns = [
  { time: '16:21', rule: 'SLA breach escalation', outlet: 'Dubai Marina', result: 'Incident opened and manager assigned', tone: 'warning' as const },
  { time: '16:08', rule: 'Auto-pause low-stock SKUs', outlet: 'Business Bay', result: '3 SKUs paused on Talabat', tone: 'good' as const },
  { time: '15:52', rule: 'Courier delay routing', outlet: 'Abu Dhabi Yas', result: 'Dispatch queue recommendation issued', tone: 'warning' as const },
  { time: '15:31', rule: 'Inventory automation', outlet: 'Sharjah Majaz', result: 'Transfer request prepared for approval', tone: 'good' as const }
];
const executiveSignals = [
  { label: 'Expansion readiness', value: '82%', detail: 'Dubai South and JLT score above launch threshold', icon: Building2 },
  { label: 'Enterprise risk', value: 'Medium', detail: 'Courier SLA and VAT settlement variance need watch', icon: ShieldCheck },
  { label: 'Forecast GMV', value: 'AED 1.42M', detail: '+9.8% projected weekly operating run-rate', icon: TrendingUp },
  { label: 'Franchise margin', value: '18.6%', detail: '2.1 pts above GCC benchmark', icon: Landmark }
];
const incidentThreads = [
  { title: 'Dubai Marina SLA breach', owner: 'Reem Al Suwaidi', status: 'escalated', age: '18m', comments: 6, next: 'Runner lead handoff pending' },
  { title: 'Inventory discrepancy', owner: 'Ops finance', status: 'investigating', age: '42m', comments: 4, next: 'Awaiting outlet count confirmation' },
  { title: 'Courier backlog escalation', owner: 'Dispatch desk', status: 'watching', age: '11m', comments: 3, next: 'Talabat capacity refresh at 16:45' }
];
const marketplaceApps = [
  { name: 'Deliveroo', category: 'Aggregator', status: 'connected', health: 94, insight: 'Menu sync healthy, webhook retries normal' },
  { name: 'Talabat', category: 'Aggregator', status: 'connected', health: 97, insight: 'Fastest settlement confirmation today' },
  { name: 'Careem', category: 'Delivery', status: 'degraded', health: 82, insight: 'Courier delay correlation detected in Yas' },
  { name: 'Noon Food', category: 'Aggregator', status: 'connected', health: 93, insight: 'Menu publish queue and payout export healthy' },
  { name: 'HungerStation', category: 'Aggregator', status: 'connected', health: 90, insight: 'Saudi order ingestion stable, commission mapping verified' },
  { name: 'Dynamics 365 Business Central', category: 'Accounting', status: 'degraded', health: 84, insight: 'Payout posting delayed for two settlement batches' }
];
const governanceRows = [
  { unit: 'GCC Holding Co', type: 'Parent org', access: 'Operations council', compliance: 'Green', scope: 'All brands and regions' },
  { unit: 'Dubai Franchise Cluster', type: 'Region', access: 'Regional managers', compliance: 'Watch', scope: 'Dubai Marina, Business Bay, JLT' },
  { unit: 'Abu Dhabi Partners', type: 'Franchisee', access: 'Franchise admins', compliance: 'Green', scope: 'Yas, Reem Island' },
  { unit: 'Cloud Kitchen Brand Lab', type: 'Brand group', access: 'Brand operators', compliance: 'Review', scope: 'Virtual brands and menu tests' }
];
const financeSignals = [
  { title: 'Aggregator settlement variance', value: 'AED 12.4k', detail: 'Careem and Deliveroo commission deltas above tolerance' },
  { title: 'VAT-ready revenue', value: '96.8%', detail: 'Missing invoice metadata on 18 orders' },
  { title: 'Refund exposure', value: '1.7%', detail: 'Below weekly ceiling, Yas courier refunds rising' },
  { title: 'Revenue leakage alerts', value: '5', detail: 'Menu modifier pricing and payout mismatch checks' }
];
const customerSegments = [
  { segment: 'High-value regulars', customers: '4,820', signal: '+12% repeat order lift', action: 'Protect delivery SLA on dinner windows' },
  { segment: 'Aggregator switchers', customers: '2,140', signal: 'Careem to direct migration opportunity', action: 'Trigger WhatsApp loyalty recovery' },
  { segment: 'Churn risk cohort', customers: '680', signal: '2 missed reorder cycles', action: 'Offer outlet-specific winback' },
  { segment: 'Late-night loyalists', customers: '1,260', signal: 'Highest margin after 22:00', action: 'Extend staffing in Marina' }
];
const twinSimulations = [
  { scenario: 'Dubai Marina demand +18%', pressure: 74, confidence: '82-88%', output: 'SLA risk reaches 74% after 19:00 unless one runner is added.' },
  { scenario: 'Prep time -2 minutes', pressure: 38, confidence: '76-84%', output: 'Throughput increases 11.4% and courier wait drops by 3 minutes.' },
  { scenario: 'Talabat courier pool -12%', pressure: 69, confidence: '71-79%', output: 'Dispatch backlog appears in Yas within 42 minutes.' },
  { scenario: 'Chicken base depletion', pressure: 81, confidence: '80-86%', output: 'Inventory stockout likely before 20:30 without inter-outlet transfer.' }
];
const networkRegions = [
  { region: 'Dubai Core', outlets: 18, sla: 94, density: 88, status: 'healthy', corridor: 'Marina - JLT - Business Bay' },
  { region: 'Abu Dhabi', outlets: 9, sla: 87, density: 71, status: 'watch', corridor: 'Yas - Reem - Corniche' },
  { region: 'Sharjah North', outlets: 6, sla: 91, density: 64, status: 'healthy', corridor: 'Majaz - Al Nahda' },
  { region: 'Expansion Bench', outlets: 4, sla: 82, density: 52, status: 'modeling', corridor: 'Dubai South - Silicon Oasis' }
];
const scenarioModels = [
  { name: 'Ramadan dinner surge', input: '+34% demand from 18:45 to 21:15', result: 'Add two prep runners and pre-stage 24kg base stock.', confidence: '86%' },
  { name: 'Aggregator downtime', input: 'Careem webhook outage for 22 minutes', result: 'Shift paid discovery to Talabat and direct WhatsApp recovery.', confidence: '78%' },
  { name: 'Weather corridor stress', input: 'Marina to JLT route latency +19%', result: 'Prioritize nearby courier pools and tighten ETA promises.', confidence: '74%' },
  { name: 'Staffing reduction', input: '-1 runner in Business Bay', result: 'SLA degradation reaches 12% unless menu throttling starts.', confidence: '81%' }
];
const ecosystemExtensions = [
  { name: 'SLA Autopilot Pack', type: 'Automation pack', lifecycle: 'installed', usage: 'Runs 146 times/day', detail: 'Escalates prep, courier, and manager handoffs.' },
  { name: 'GCC VAT Reconciler', type: 'Compliance extension', lifecycle: 'trial', usage: '96.8% coverage', detail: 'Matches orders, payouts, invoices, and tax metadata.' },
  { name: 'Courier Corridor Planner', type: 'Analytics extension', lifecycle: 'available', usage: 'Recommended', detail: 'Models pickup density and route degradation.' },
  { name: 'Developer Webhook Studio', type: 'Developer tool', lifecycle: 'installed', usage: '42 events/min', detail: 'Observability for API latency, replay, and signing.' }
];
const knowledgeTimeline = [
  { period: 'This week', title: 'Recurring Yas courier backlog', signal: '3 incidents share Talabat pickup latency and late runner handoff.', recommendation: 'Move one floating runner to Yas between 19:00 and 20:30.' },
  { period: 'Last 30 days', title: 'Inventory drift pattern', signal: 'Chicken base variance appears after two high-volume promotion windows.', recommendation: 'Add promotion-aware stock count automation.' },
  { period: 'Quarter trend', title: 'Direct channel resilience', signal: 'Direct orders recover 1.7x faster after aggregator degradation.', recommendation: 'Fund WhatsApp loyalty automation for Marina and JLT.' }
];
const boardroomBriefs = [
  { title: 'Quarterly growth projection', value: 'AED 17.8M', detail: 'Base case assumes 9.8% weekly run-rate growth and stable refund exposure.' },
  { title: 'Investment priority', value: 'Courier density', detail: 'Best ROI comes from dinner-window routing and runner coverage in Yas.' },
  { title: 'Expansion readiness', value: 'JLT: 91%', detail: 'SLA, staffing, and direct-channel demand all clear threshold.' },
  { title: 'Strategic risk', value: 'Medium', detail: 'Aggregator contract variance and labor scheduling compliance require monitoring.' }
];
const meshSignals = [
  { system: 'Delivery', dependency: 'Staffing', signal: 'Courier shortage increases runner recommendation by 1.4 FTE', impact: 74, tone: 'warning' as const },
  { system: 'Inventory', dependency: 'Revenue', signal: 'Chicken base depletion lowers dinner revenue confidence by 8%', impact: 81, tone: 'critical' as const },
  { system: 'Finance', dependency: 'SLA', signal: 'Prep-time drift raises refund exposure and payout variance risk', impact: 63, tone: 'warning' as const },
  { system: 'Customer', dependency: 'Automation', signal: 'VIP reorder segment now triggers direct-channel recovery workflow', impact: 52, tone: 'good' as const }
];
const enterpriseState = [
  { label: 'Operational stress', value: 67, detail: 'Dinner-window pressure rising across Dubai Core' },
  { label: 'Network stability', value: 88, detail: 'Core systems healthy, Yas corridor under watch' },
  { label: 'Enterprise confidence', value: 84, detail: 'Forecast confidence remains board-reportable' },
  { label: 'Fulfillment resilience', value: 79, detail: 'Runner and courier buffers adequate with mitigation' }
];
const coordinationPlans = [
  { title: 'Dubai Marina SLA stabilization', state: 'active', plan: 'Reallocate dispatch priority, protect direct orders, and move one floating runner to Marina for 90 minutes.' },
  { title: 'Riyadh Tahlia courier backlog recovery', state: 'recommended', plan: 'Throttle low-margin channels, shift Talabat demand, and open support incident if latency exceeds 31 minutes.' },
  { title: 'Inventory revenue protection', state: 'queued', plan: 'Transfer 18kg base stock before peak and reduce affected menu exposure on Careem.' }
];
const missionEvents = [
  { time: '16:44', event: 'Mesh linked courier strain to staffing pressure in Yas', severity: 'watch' },
  { time: '16:37', event: 'Mitigation plan generated for Dubai Marina SLA exposure', severity: 'active' },
  { time: '16:22', event: 'Inventory depletion reduced revenue confidence forecast', severity: 'risk' },
  { time: '16:10', event: 'Talabat traffic prioritization improved direct-channel resilience', severity: 'stable' }
];
const workforceSignals = [
  { team: 'Dubai Marina dispatch', fatigue: 68, resilience: 82, recommendation: 'Rotate runner lead after 20:30 to reduce late-window fatigue.' },
  { team: 'Business Bay prep', fatigue: 54, resilience: 88, recommendation: 'Add one support runner between 19:00 and 21:00.' },
  { team: 'Abu Dhabi Yas courier desk', fatigue: 76, resilience: 69, recommendation: 'Escalate handoff ownership and reduce manual channel switching.' },
  { team: 'Sharjah inventory ops', fatigue: 47, resilience: 91, recommendation: 'Automate promotion-aware stock count before dinner.' }
];
const ecosystemCoordination = [
  { partner: 'Talabat', score: 91, role: 'Priority demand lane', dependency: 'Strong courier density and settlement reliability' },
  { partner: 'Deliveroo', score: 86, role: 'Stable aggregator lane', dependency: 'Healthy menu sync and low webhook retry load' },
  { partner: 'Careem', score: 72, role: 'Watch lane', dependency: 'Courier delay affects SLA and refund exposure in Yas' },
  { partner: 'WhatsApp', score: 94, role: 'Recovery channel', dependency: 'Best direct customer recovery during aggregator stress' }
];
const fabricPropagations = [
  { source: 'Courier disruption', target: 'Staffing forecast', effect: 'Runner pressure rises 14% and shift coverage confidence falls in Yas.', confidence: 84 },
  { source: 'Inventory stress', target: 'Revenue stability', effect: 'High-margin bowl availability lowers dinner GMV confidence by AED 18.6k.', confidence: 81 },
  { source: 'Aggregator volatility', target: 'Customer churn', effect: 'Careem delay exposure increases churn risk in late-night loyalists.', confidence: 76 },
  { source: 'Workforce fatigue', target: 'Automation priority', effect: 'Handoff automation moves up the queue before manual dispatch saturation.', confidence: 88 }
];
const adaptiveLearning = [
  { strategy: 'Ramadan surge mitigation', before: '71% SLA resilience', after: '85% SLA resilience', learning: 'Escalate staffing before 18:30 instead of reacting at peak.' },
  { strategy: 'Courier lane balancing', before: '31m backlog duration', after: '22m backlog duration', learning: 'Prioritize Talabat during Dubai South pressure and protect direct orders.' },
  { strategy: 'Inventory transfer automation', before: '8% revenue confidence drop', after: '3% confidence drop', learning: 'Trigger transfer when depletion and demand both cross warning thresholds.' }
];
const enterpriseAwareness = [
  { label: 'Enterprise morale', value: 78, detail: 'Operator load is elevated but collaboration response remains healthy.' },
  { label: 'Ecosystem stress', value: 64, detail: 'Partner volatility is manageable with Careem under watch.' },
  { label: 'Operational maturity', value: 87, detail: 'Automation coverage and audit discipline improving quarter over quarter.' },
  { label: 'Strategic confidence', value: 84, detail: 'Expansion decisions remain supportable with corridor safeguards.' },
  { label: 'Regional volatility', value: 58, detail: 'Yas and Riyadh Tahlia remain the primary volatility sources.' },
  { label: 'Operational awareness', value: 91, detail: 'Active dependencies span finance, delivery, and customer systems.' }
];
const temporalIntelligence = [
  { horizon: 'Ramadan cycle', trend: 'Demand surge now begins 22 minutes earlier than last year.', action: 'Move staffing escalation to 18:20 and pre-stage popular SKUs.' },
  { horizon: 'Quarterly resilience', trend: 'Direct-channel recovery has improved from 61% to 79%.', action: 'Increase WhatsApp recovery automation in Marina and JLT.' },
  { horizon: 'Operational drift', trend: 'Menu pricing drift recurs after promotion updates.', action: 'Attach finance validation to promotion deployment workflow.' },
  { horizon: 'Seasonal corridor', trend: 'Rainfall corridor stress repeats on Marina to JLT lane.', action: 'Activate weather-aware courier buffer at 20% route latency increase.' }
];
const collaborationLoops = [
  { workflow: 'Mitigation approval', trust: 86, operator: 'Reem Al Suwaidi accepted staffing escalation', outcome: 'SLA exposure reduced by 9%' },
  { workflow: 'Operator override', trust: 74, operator: 'Dispatch lead delayed Careem throttling', outcome: 'Customer impact stayed below threshold' },
  { workflow: 'Feedback loop', trust: 91, operator: 'Finance confirmed VAT alert quality', outcome: 'Compliance automation retained high confidence' }
];
const worldviewSignals = [
  { market: 'Dubai Core', competitiveness: 92, maturity: 'Scaled', outlook: 'Defend margin through direct-channel and corridor automation.' },
  { market: 'Abu Dhabi', competitiveness: 78, maturity: 'Optimizing', outlook: 'Improve courier reliability before aggressive expansion.' },
  { market: 'Riyadh Tahlia', competitiveness: 71, maturity: 'Watch', outlook: 'Dinner congestion and courier shortage require resilience plan.' },
  { market: 'JLT Expansion', competitiveness: 88, maturity: 'Ready', outlook: 'Launch-ready if inventory transfer automation is enabled.' }
];
const optimizationSignals = [
  { lever: 'Sharjah North delivery radius', outcome: 'Reduce radius by 1.8km to increase enterprise SLA stability by 9%.', roi: 'High', confidence: 86 },
  { lever: 'Riyadh Tahlia inventory resilience', outcome: 'Transfer base stock from Olaya before Q4 surge to improve fulfillment resilience by 12%.', roi: 'Medium', confidence: 79 },
  { lever: 'Yas courier balancing', outcome: 'Prioritize Talabat and direct recovery to lower refund exposure by AED 9.2k.', roi: 'High', confidence: 83 },
  { lever: 'Marina staffing buffer', outcome: 'Add one peak runner to preserve margin while holding SLA above 94%.', roi: 'High', confidence: 88 }
];
const economicSignals = [
  { metric: 'Margin stability forecast', value: '84%', detail: 'Stable if courier balancing and inventory transfer are approved.' },
  { metric: 'Labor efficiency ROI', value: '1.7x', detail: 'Peak runner buffer protects more revenue than it costs.' },
  { metric: 'Ecosystem cost pressure', value: 'AED 18.4k', detail: 'Careem volatility and refund exposure are the largest external cost driver.' },
  { metric: 'Revenue resilience', value: '91%', detail: 'Direct-channel recovery loops improve downside protection.' }
];
const planningRoadmap = [
  { phase: 'Now', plan: 'Stabilize Yas courier lane and Marina staffing buffer before dinner peak.', owner: 'Mission control', confidence: 88 },
  { phase: 'Next 30 days', plan: 'Expand direct-channel recovery and promotion-aware inventory transfer automation.', owner: 'Operations strategy', confidence: 84 },
  { phase: 'Q4', plan: 'Sequence Riyadh Tahlia workforce expansion before expected demand surge.', owner: 'Regional GM', confidence: 78 },
  { phase: 'Expansion', plan: 'Launch JLT after corridor safeguards and POS governance are enabled.', owner: 'Board office', confidence: 86 }
];
const workflowEvolution = [
  { workflow: 'SLA escalation', previous: 'Manual manager ping at breach', current: 'Predictive escalation 8 minutes before risk', delta: '+18% faster stabilization' },
  { workflow: 'Inventory transfer', previous: 'Reactive stock count', current: 'Demand-linked transfer recommendation', delta: '+5 pts revenue confidence' },
  { workflow: 'Courier balancing', previous: 'Channel-level monitoring', current: 'Partner lane prioritization', delta: '-23% backlog duration' }
];
const aiGovernanceSignals = [
  { decision: 'Marina staffing escalation', trust: 91, accountability: 'Accepted by Reem Al Suwaidi', audit: 'Board-reportable decision trail' },
  { decision: 'Careem throttling delay', trust: 74, accountability: 'Operator override logged', audit: 'Customer impact held below threshold' },
  { decision: 'JLT expansion readiness', trust: 86, accountability: 'Requires director approval', audit: 'Scenario pack attached' }
];
const evolutionMilestones = [
  { period: 'Previous Ramadan', lesson: 'Staffing response happened too late for first demand spike.', improvement: 'Current plan escalates before 18:30 and protects SLA by 14%.' },
  { period: 'Last quarter', lesson: 'Courier lane balancing was manual and inconsistent.', improvement: 'Mesh now triggers partner prioritization from live volatility.' },
  { period: 'Current cycle', lesson: 'Inventory stress propagates into revenue confidence.', improvement: 'Optimization engine links transfers to margin preservation.' }
];
const chartGrid = 'rgba(137, 153, 148, .16)';
const chartTick = '#899994';
const chartTooltip = {
  background: '#0a1012',
  border: '1px solid #23302d',
  borderRadius: 12,
  color: '#eef5f1',
  boxShadow: '0 18px 50px rgba(0,0,0,.28)'
};
const orderTransitions: Record<OrderStatus, OrderStatus[]> = {
  pending: ['accepted', 'cancelled'],
  accepted: ['preparing', 'cancelled'],
  preparing: ['dispatched'],
  dispatched: ['delivered'],
  delivered: [],
  cancelled: []
};
const roleLabels: Record<Role, string> = {
  owner: 'Regional Operations Director',
  manager: 'Operations Supervisor',
  kitchen: 'Aggregator Control Desk',
  support: 'Revenue Operations'
};

export function OverviewPage() {
  const summary = useAnalyticsSummary();
  const integrations = useIntegrations();
  const orders = useOrders({ page: 1, limit: 5 });

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Operations desk" title="Live GCC delivery operations" action="Export report" disabledReason="Coming soon" />
      <AsyncState loading={summary.isLoading} error={summary.isError}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summary.data?.kpis.map((kpi, index) => (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}>
              <MetricCard label={kpi.label} value={formatKpiValue(kpi.value, kpi.unit)} detail={`${percentage(kpi.delta)} vs last week`}>
                <span className="grid size-10 place-items-center rounded-xl bg-royal/10 text-royal ring-1 ring-royal/20">
                  <ArrowUpRight className="size-5" />
                </span>
              </MetricCard>
            </motion.div>
          ))}
        </div>
      </AsyncState>
      <AiOpsAssistantPanel />
      <OperationalInsightStrip />
      <div className="grid gap-4 xl:grid-cols-[1.4fr_.8fr]">
        <RevenuePanel />
        <LiveOrderFeed orders={orders.data?.items ?? []} loading={orders.isLoading} error={orders.isError} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_.8fr]">
        <RegionalPerformancePanel />
        <div className="space-y-4">
          <AttentionNeededPanel />
          <SystemActivityPanel />
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <IntegrationsPanel items={integrations.data ?? []} loading={integrations.isLoading} error={integrations.isError} />
        <InventoryRiskPanel />
        <OutletPanel />
      </div>
    </div>
  );
}

export function ControlCenterPage() {
  const control = useControlCenter();
  const queueMetrics = useQueueMetrics();
  const systemMetrics = useSystemMetrics();
  const dlq = useDlq();
  const intelligence = useOperationalIntelligence();
  const orders = useOrders({ page: 1, limit: 8, status: 'all' });
  const socketStatus = useOpsStore((state) => state.socketStatus);
  const lastRealtimeAt = useOpsStore((state) => state.lastRealtimeAt);
  const triggerFailure = useMutation({
    mutationFn: dashboardApi.enqueueTestFailure,
    onSuccess: () => {
      void queueMetrics.refetch();
    }
  });
  const retryDlq = useMutation({
    mutationFn: dashboardApi.retryDlq,
    onSuccess: () => {
      void dlq.refetch();
      void queueMetrics.refetch();
    }
  });

  const stale = !lastRealtimeAt || Date.now() - Date.parse(lastRealtimeAt) > 30_000;
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Control center" title="Operational reliability and SLA control" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Active orders" value={String(control.data?.activeOrders ?? 0)} detail="Live workflow load">
          <ShoppingCart className="size-5 text-royal" />
        </MetricCard>
        <MetricCard label="SLA breaches" value={String(control.data?.slaBreachCount ?? 0)} detail={`${control.data?.delayedDispatchCount ?? 0} delayed dispatches`}>
          <Timer className="size-5 text-royal" />
        </MetricCard>
        <MetricCard label="Queue backlog" value={String(queueMetrics.data?.counts.backlog ?? 0)} detail={`${queueMetrics.data?.counts.failed ?? 0} failed jobs`}>
          <Activity className="size-5 text-royal" />
        </MetricCard>
        <MetricCard label="Realtime" value={socketStatus} detail={stale ? 'Fallback polling active' : `Last event ${lastRealtimeAt ? formatDateTime(lastRealtimeAt) : 'none'}`}>
          <Bell className="size-5 text-royal" />
        </MetricCard>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="API health" value={systemMetrics.isError ? 'degraded' : 'healthy'} detail={`${systemMetrics.data?.requests.averageMs ?? 0}ms avg request`}>
          <Activity className="size-5 text-royal" />
        </MetricCard>
        <MetricCard label="Queue latency" value={`${queueMetrics.data?.averageProcessingMs ?? 0}ms`} detail={`${queueMetrics.data?.counts.backlog ?? 0} jobs waiting`}>
          <Clock className="size-5 text-royal" />
        </MetricCard>
        <MetricCard label="Websocket uptime" value={socketStatus} detail={`${systemMetrics.data?.websocket.activeConnections ?? 0} active connections`}>
          <Bell className="size-5 text-royal" />
        </MetricCard>
        <MetricCard label="Retry spikes" value={String(systemMetrics.data?.queues?.retryCount ?? queueMetrics.data?.retryCount ?? 0)} detail={`${queueMetrics.data?.dlqCount ?? 0} DLQ jobs`}>
          <AlertCircle className="size-5 text-royal" />
        </MetricCard>
        <MetricCard label="Webhook failures" value={String(systemMetrics.data?.webhooks?.failures ?? control.data?.failedWebhookCount ?? 0)} detail="Failed or rejected today">
          <AlertCircle className="size-5 text-royal" />
        </MetricCard>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_.9fr]">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Queue monitoring</h2>
            <Button size="sm" variant="secondary" onClick={() => triggerFailure.mutate()} disabled={triggerFailure.isPending}>
              {triggerFailure.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Test failed job
            </Button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              ['Active', queueMetrics.data?.counts.active ?? 0],
              ['Delayed', queueMetrics.data?.counts.delayed ?? 0],
              ['Completed', queueMetrics.data?.counts.completed ?? 0],
              ['Failed', queueMetrics.data?.counts.failed ?? 0],
              ['Retries', queueMetrics.data?.retryCount ?? 0],
              ['Avg ms', queueMetrics.data?.averageProcessingMs ?? 0]
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-line p-3">
                <p className="text-xs font-bold uppercase text-muted">{label}</p>
                <p className="mt-1 text-2xl font-black">{value}</p>
              </div>
            ))}
          </div>
          <p className={`mt-4 text-sm font-semibold ${queueMetrics.data?.workerOnline ? 'text-emerald-600' : 'text-rose-600'}`}>
            Worker {queueMetrics.data?.workerOnline ? 'online' : 'offline'} · heartbeat {queueMetrics.data?.workerHeartbeatAt ? formatDateTime(queueMetrics.data.workerHeartbeatAt) : 'none'}
          </p>
          <div className="mt-5 divide-y divide-line rounded-xl border border-line">
            <AsyncState loading={dlq.isLoading} error={dlq.isError} empty={!dlq.data?.length}>
              {dlq.data?.slice(0, 4).map((job) => (
                <div key={job.id} className="grid gap-2 p-3 text-sm md:grid-cols-[.8fr_1fr_.7fr]">
                  <div>
                    <p className="font-bold">{job.jobName}</p>
                    <p className="text-xs text-muted">{job.requestId ?? job.originalJobId ?? 'No request id'}</p>
                  </div>
                  <p className="text-muted">{job.failedReason}</p>
                  <Button size="sm" variant="secondary" onClick={() => retryDlq.mutate(job.id)} disabled={retryDlq.isPending || job.dlqRetryCount >= 3}>
                    Retry DLQ
                  </Button>
                </div>
              ))}
            </AsyncState>
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="text-lg font-bold">System health</h2>
          <div className="mt-4 space-y-3">
            <AsyncState loading={control.isLoading} error={control.isError} empty={!control.data?.systemHealth.length}>
              {control.data?.systemHealth.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-lg border border-line p-3 text-sm">
                  <div>
                    <p className="font-bold">{item.label}</p>
                    <p className="text-muted">{item.detail}</p>
                  </div>
                  <Badge className={item.status === 'critical' ? 'bg-rose-50 text-rose-700 ring-rose-200' : item.status === 'warning' ? 'bg-amber-50 text-amber-700 ring-amber-200' : 'bg-emerald-50 text-emerald-700 ring-emerald-200'}>{item.status}</Badge>
                </div>
              ))}
            </AsyncState>
          </div>
        </Card>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card className="p-5">
          <h2 className="text-lg font-bold">Outlet operational status</h2>
          <div className="mt-4 divide-y divide-line rounded-xl border border-line">
            <AsyncState loading={control.isLoading} error={control.isError} empty={!control.data?.outletStatus.length}>
              {control.data?.outletStatus.map((outlet) => (
                <div key={outlet.outletId} className="grid gap-2 p-3 text-sm md:grid-cols-[1fr_.5fr_.5fr_.5fr]">
                  <p className="font-bold">{outlet.outlet}</p>
                  <p>{outlet.activeOrders} active</p>
                  <p>{outlet.slaBreaches} breaches</p>
                  <Badge className="bg-panel-muted text-muted ring-line">{outlet.status}</Badge>
                </div>
              ))}
            </AsyncState>
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="text-lg font-bold">Active order stream</h2>
          <div className="mt-4 space-y-3">
            <AsyncState loading={orders.isLoading} error={orders.isError} empty={!orders.data?.items.length}>
              {orders.data?.items.map((order) => (
                <div key={order.id} className="flex items-center justify-between rounded-lg border border-line p-3 text-sm">
                  <div>
                    <p className="font-bold">{order.publicId}</p>
                    <p className="text-muted">{order.outletName} · {order.channel.replace('_', ' ')}</p>
                  </div>
                  <Badge className={statusTone[order.status]}>{statusCopy[order.status]}</Badge>
                </div>
              ))}
            </AsyncState>
          </div>
        </Card>
      </div>
      <Card className="p-5">
        <h2 className="text-lg font-bold">Operational analytics</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <MetricCard label="Slowest outlet" value={intelligence.data?.slowestFulfillmentOutlet?.outlet ?? 'n/a'} detail={`${intelligence.data?.slowestFulfillmentOutlet?.averageMinutes ?? 0}m average`}>
            <Clock className="size-5 text-royal" />
          </MetricCard>
          <MetricCard label="Busiest window" value={intelligence.data?.busiestTimeWindow?.hour ?? 'n/a'} detail={`${intelligence.data?.busiestTimeWindow?.orders ?? 0} orders`}>
            <BarChart3 className="size-5 text-royal" />
          </MetricCard>
          <MetricCard label="Bottleneck alerts" value={String(intelligence.data?.bottleneckAlerts.length ?? 0)} detail={`${intelligence.data?.cancellationSpikes.length ?? 0} cancellation spikes`}>
            <AlertCircle className="size-5 text-royal" />
          </MetricCard>
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-4">
          {intelligence.data?.outletLoadComparison.map((row) => (
            <div key={row.outlet} className="rounded-lg border border-line p-3">
              <p className="text-sm font-bold">{row.outlet}</p>
              <div className="mt-2 h-2 rounded-full bg-panel-muted">
                <div className="h-full rounded-full bg-royal" style={{ width: `${Math.min(100, row.loadScore)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function OrdersPage() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<OrderStatus | 'all'>('all');
  const [channel, setChannel] = useState<Channel | 'all'>('all');
  const [outletId, setOutletId] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ tone: 'error'; text: string } | null>(null);
  const orders = useOrders({ page, limit: 12, status, channel, outletId, query });
  const menus = useMenus();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const updateStatus = useMutation({
    mutationFn: ({ orderId, nextStatus, expectedUpdatedAt }: { orderId: string; nextStatus: OrderStatus; expectedUpdatedAt?: string }) =>
      dashboardApi.updateOrderStatus(orderId, nextStatus, expectedUpdatedAt),
    onMutate: async ({ orderId, nextStatus }) => {
      setStatusMessage(null);
      await queryClient.cancelQueries({ queryKey: ['orders'] });
      const previousOrders = queryClient.getQueriesData<PaginatedResponse<Order>>({ queryKey: ['orders'] });
      const optimisticUpdatedAt = new Date().toISOString();
      queryClient.setQueriesData<PaginatedResponse<Order>>({ queryKey: ['orders'] }, (existing) =>
        existing
          ? {
              ...existing,
              items: existing.items.map((order) =>
                order.id === orderId
                  ? {
                      ...order,
                      status: nextStatus,
                      updatedAt: optimisticUpdatedAt,
                      ...timestampPatch(nextStatus, optimisticUpdatedAt)
                    }
                  : order
              )
            }
          : existing
      );
      setSelectedOrder((order) =>
        order?.id === orderId
          ? { ...order, status: nextStatus, updatedAt: optimisticUpdatedAt, ...timestampPatch(nextStatus, optimisticUpdatedAt) }
          : order
      );
      return { previousOrders };
    },
    onSuccess: (updatedOrder) => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['analytics-summary'] });
      setSelectedOrder((order) => (order?.id === updatedOrder.id ? updatedOrder : order));
    },
    onError: (error, _variables, context) => {
      context?.previousOrders.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      setStatusMessage({ tone: 'error', text: getMutationErrorMessage(error) });
    }
  });
  const createOrder = useMutation({
    mutationFn: dashboardApi.createOrder,
    onSuccess: (order) => {
      queryClient.setQueriesData<PaginatedResponse<Order>>({ queryKey: ['orders'] }, (existing) =>
        existing ? { ...existing, items: [order, ...existing.items.filter((item) => item.id !== order.id)].slice(0, existing.limit) } : existing
      );
      setCreatingOrder(false);
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['analytics-summary'] });
    },
    onError: (error) => {
      setStatusMessage({ tone: 'error', text: getMutationErrorMessage(error) });
    }
  });

  function updateOrder(order: Order, nextStatus: OrderStatus) {
    updateStatus.mutate({ orderId: order.id, nextStatus, expectedUpdatedAt: order.updatedAt });
  }

  const visibleOrders = orders.data?.items ?? [];
  const selectedOrderView = selectedOrder ? visibleOrders.find((order) => order.id === selectedOrder.id) ?? selectedOrder : null;
  const canManageOrders = Boolean(user && ['owner', 'manager', 'kitchen'].includes(user.role));
  const manualOrderOutlets = useMemo(
    () => (user?.restaurant?.outlets?.length ? user.restaurant.outlets : outletsFromOrders(visibleOrders)),
    [user?.restaurant?.outlets, visibleOrders]
  );
  useEffect(() => {
    if (!selectedOrder) return;
    const updated = visibleOrders.find((order) => order.id === selectedOrder.id);
    if (updated && updated.updatedAt !== selectedOrder.updatedAt) setSelectedOrder(updated);
  }, [selectedOrder, visibleOrders]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Order management"
        title="Live order queue and dispatch tracking"
        action={canManageOrders ? 'Create manual order' : undefined}
        onAction={canManageOrders ? () => setCreatingOrder(true) : undefined}
      />
      {statusMessage ? (
        <div
          className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700"
        >
          <AlertCircle className="size-4" />
          {statusMessage.text}
        </div>
      ) : null}
      <Card className="p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <SearchInput
            value={query}
            onChange={(event) => {
              setPage(1);
              setQuery(event.target.value);
            }}
            placeholder="Search orders or customers"
          />
          <div className="flex flex-wrap gap-2">
            {manualOrderOutlets.length ? (
              <select
                className="h-9 rounded-xl border border-line bg-panel px-3 text-sm font-semibold text-ink"
                value={outletId}
                onChange={(event) => {
                  setPage(1);
                  setOutletId(event.target.value);
                }}
              >
                <option value="all">All outlets</option>
                {manualOrderOutlets.map((outlet) => (
                  <option key={outlet.id} value={outlet.id}>
                    {outlet.name}
                  </option>
                ))}
              </select>
            ) : null}
            {statusFilters.map((filter) => (
              <Button
                key={filter}
                variant={status === filter ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => {
                  setPage(1);
                  setStatus(filter);
                }}
              >
                {filter === 'all' ? 'All' : statusCopy[filter]}
              </Button>
            ))}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Saved views</span>
          {['Dinner rush', 'SLA risk', 'Aggregator exceptions', 'VIP orders'].map((view) => (
            <button
              key={view}
              className="rounded-full border border-line bg-panel-muted/60 px-3 py-1 text-xs font-bold text-muted transition hover:border-royal/40 hover:text-ink"
              type="button"
            >
              {view}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {channelFilters.map((filter) => (
            <Button
              key={filter}
              variant={channel === filter ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => {
                setPage(1);
                setChannel(filter);
              }}
            >
              {filter === 'all' ? 'All channels' : filter.replace('_', ' ')}
            </Button>
          ))}
        </div>
      </Card>
      <OrderCommandStrip />
      <KitchenQueue orders={visibleOrders} loading={orders.isLoading} error={orders.isError} />
      <Card className="overflow-hidden">
        <AsyncTableState loading={orders.isLoading} error={orders.isError} empty={!orders.data?.items.length}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-left text-sm">
              <thead className="sticky top-0 z-10 border-b border-line bg-panel-muted/95 text-xs uppercase tracking-[0.14em] text-muted backdrop-blur-xl">
                <tr>
                  {['Order', 'Channel', 'Customer', 'Outlet', 'SLA', 'Total', 'Status', 'Actions', 'Detail'].map((head) => (
                    <th key={head} className="px-5 py-4 font-bold">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-panel/50">
                {orders.data?.items.map((order) => (
                  <tr key={order.id} className="transition hover:bg-royal/5">
                    <td className="px-5 py-4 font-black text-ink">{order.publicId}</td>
                    <td className="px-5 py-4 capitalize text-muted">{order.channel.replace('_', ' ')}</td>
                    <td className="px-5 py-4">{order.customerName}</td>
                    <td className="px-5 py-4">{order.outletName}</td>
                    <td className="px-5 py-4"><SlaBadge order={order} /></td>
                    <td className="px-5 py-4 font-semibold">{formatMoney(order.total.amount, order.total.currency)}</td>
                    <td className="px-5 py-4">
                      <Badge className={statusTone[order.status]}>{statusCopy[order.status]}</Badge>
                    </td>
                    <td className="px-5 py-4">
                      {canManageOrders ? (
                        <OrderActions order={order} loadingOrderId={updateStatus.variables?.orderId} loading={updateStatus.isPending} onUpdate={updateOrder} />
                      ) : (
                        <span className="text-xs font-semibold text-muted">Observer access</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <Button size="sm" variant="ghost" onClick={() => setSelectedOrder(order)} aria-label={`View ${order.publicId}`}>
                        <Eye className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AsyncTableState>
      </Card>
      <Pagination page={page} totalPages={orders.data?.totalPages ?? 1} onPage={setPage} />
      {selectedOrderView ? (
        <OrderDetailModal
          order={selectedOrderView}
          loadingOrderId={updateStatus.variables?.orderId}
          loading={updateStatus.isPending}
          onUpdate={updateOrder}
          canManageOrders={canManageOrders}
          onClose={() => setSelectedOrder(null)}
        />
      ) : null}
      {creatingOrder && canManageOrders ? (
        <ManualOrderModal
          outlets={manualOrderOutlets}
          menus={menus.data ?? []}
          menusLoading={menus.isLoading}
          menusError={menus.isError}
          loading={createOrder.isPending}
          onClose={() => setCreatingOrder(false)}
          onCreate={(input) => createOrder.mutate(input)}
        />
      ) : null}
    </div>
  );
}

function OrderCommandStrip() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <InsightBanner
        title="Dispatch priority"
        detail="Prioritize Marina and Yas orders with less than 8 minutes remaining. Escalate runner assignment before courier arrival."
        action="Queue rule ready"
      />
      <IntelligenceCard
        title="SLA filter"
        detail="SLA risk view combines pending, accepted, and preparing orders with rider wait exposure."
        meta="saved"
        tone="good"
      />
      <IntelligenceCard
        title="Audit-safe workflow"
        detail="Status changes preserve optimistic timestamps and backend reconciliation."
        meta="tracked"
        tone="neutral"
      />
    </div>
  );
}

function KitchenQueue({ orders, loading, error }: { orders: Order[]; loading: boolean; error: boolean }) {
  return (
    <div className="grid gap-4 xl:grid-cols-4">
      {activeQueueStatuses.map((queueStatus) => {
        const queueOrders = orders.filter((order) => order.status === queueStatus);
        return (
          <Card key={queueStatus} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black uppercase tracking-wide">{statusCopy[queueStatus]}</h2>
                <p className="text-xs font-semibold text-muted">{queueOrders.length} active</p>
              </div>
              <Badge className={statusTone[queueStatus]}>{queueOrders.length}</Badge>
            </div>
            <div className="mt-4 min-h-32 space-y-3">
              <AsyncState loading={loading} error={error} empty={!queueOrders.length}>
                {queueOrders.slice(0, 4).map((order) => (
                  <div key={order.id} className="rounded-lg border border-line bg-panel-muted/55 p-3 transition hover:border-royal/35">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-ink">{order.publicId}</p>
                      <SlaBadge order={order} compact />
                    </div>
                    <p className="mt-1 truncate text-xs font-semibold text-muted">{order.customerName}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <p className="truncate text-xs text-muted">{order.outletName}</p>
                      <OperationalStatusChip label={order.channel.replace('_', ' ')} tone="neutral" />
                    </div>
                  </div>
                ))}
              </AsyncState>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function OrderActions({
  order,
  loadingOrderId,
  loading,
  onUpdate
}: {
  order: Order;
  loadingOrderId?: string;
  loading: boolean;
  onUpdate: (order: Order, nextStatus: OrderStatus) => void;
}) {
  const nextStatuses = orderTransitions[order.status];
  const isThisOrderLoading = loading && loadingOrderId === order.id;
  if (!nextStatuses.length) {
    return <span className="text-xs font-semibold text-muted">No actions</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {nextStatuses.map((nextStatus) => (
        <Button
          key={nextStatus}
          size="sm"
          variant={nextStatus === 'cancelled' ? 'danger' : 'secondary'}
          onClick={() => onUpdate(order, nextStatus)}
          disabled={loading}
        >
          {isThisOrderLoading ? <Loader2 className="size-4 animate-spin" /> : null}
          {actionCopy(nextStatus)}
        </Button>
      ))}
    </div>
  );
}

function OrderDetailModal({
  order,
  loadingOrderId,
  loading,
  onUpdate,
  canManageOrders,
  onClose
}: {
  order: Order;
  loadingOrderId?: string;
  loading: boolean;
  onUpdate: (order: Order, nextStatus: OrderStatus) => void;
  canManageOrders: boolean;
  onClose: () => void;
}) {
  const timeline: Array<{ label: string; value?: string | null }> = [
    { label: 'Placed', value: order.placedAt },
    { label: 'Accepted', value: order.acceptedAt },
    { label: 'Preparing', value: order.preparingAt },
    { label: 'Dispatched', value: order.dispatchedAt },
    { label: 'Delivered', value: order.deliveredAt },
    { label: 'Cancelled', value: order.cancelledAt }
  ];

  return (
    <ModalFrame title={`${order.publicId} details`} onClose={onClose}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-ink">{order.customerName}</p>
            <p className="mt-1 text-xs font-semibold capitalize text-muted">
              {order.channel.replace('_', ' ')} - {order.outletName}
            </p>
          </div>
          <Badge className={statusTone[order.status]}>{statusCopy[order.status]}</Badge>
        </div>
        <div className="grid gap-3 rounded-xl border border-line bg-panel-muted p-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted">Total</p>
            <p className="mt-1 font-black">{formatMoney(order.total.amount, order.total.currency)}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted">SLA</p>
            <p className="mt-1 font-black">{order.etaMinutes} min</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted">Updated</p>
            <p className="mt-1 font-black">{formatDateTime(order.updatedAt)}</p>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-black">Items</h3>
          <div className="mt-3 divide-y divide-line rounded-xl border border-line">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-4 p-3 text-sm">
                <div>
                  <p className="font-bold">{item.quantity}x {item.name}</p>
                  {item.modifiers?.length ? <p className="mt-1 text-xs text-muted">{item.modifiers.join(', ')}</p> : null}
                </div>
                <span className="font-semibold">{formatMoney(item.price.amount, item.price.currency)}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-black">Status timeline</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {timeline.map((step) => (
              <div key={step.label} className="rounded-lg border border-line p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-muted">{step.label}</p>
                <p className="mt-1 text-sm font-semibold">{step.value ? formatDateTime(step.value) : 'Not reached'}</p>
              </div>
            ))}
          </div>
        </div>
        {canManageOrders ? (
          <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
            <OrderActions order={order} loadingOrderId={loadingOrderId} loading={loading} onUpdate={onUpdate} />
          </div>
        ) : null}
      </div>
    </ModalFrame>
  );
}

function ManualOrderModal({
  outlets,
  menus,
  menusLoading,
  menusError,
  loading,
  onCreate,
  onClose
}: {
  outlets: Array<{ id: string; name: string; city: string }>;
  menus: MenuItem[];
  menusLoading: boolean;
  menusError: boolean;
  loading: boolean;
  onCreate: (input: CreateOrderInput) => void;
  onClose: () => void;
}) {
  const defaultOutletId = outlets[0]?.id ?? '';
  const [outletId, setOutletId] = useState(defaultOutletId);
  const [channel, setChannel] = useState<Channel>('direct');
  const [customerName, setCustomerName] = useState('');
  const [etaMinutes, setEtaMinutes] = useState(25);
  const [clientMutationId] = useState(() => `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const selectedOutlet = outlets.find((outlet) => outlet.id === outletId);
  const availableMenus = useMemo(
    () => menus.filter((item) => item.available && (!selectedOutlet || !item.outletScope.length || item.outletScope.includes(selectedOutlet.name))),
    [menus, selectedOutlet]
  );
  const defaultMenuId = availableMenus[0]?.id ?? '';
  const [lines, setLines] = useState<Array<{ menuItemId: string; quantity: number }>>([{ menuItemId: '', quantity: 1 }]);
  useEffect(() => {
    if (!outletId && defaultOutletId) setOutletId(defaultOutletId);
    if (defaultMenuId) {
      setLines((current) => current.map((line) => (line.menuItemId ? line : { ...line, menuItemId: defaultMenuId })));
    }
  }, [defaultMenuId, defaultOutletId, outletId]);

  useEffect(() => {
    setLines((current) =>
      current.map((line) => (availableMenus.some((item) => item.id === line.menuItemId) ? line : { ...line, menuItemId: defaultMenuId }))
    );
  }, [defaultMenuId, outletId, availableMenus]);

  const total = lines.reduce((sum, line) => {
    const item = availableMenus.find((menu) => menu.id === line.menuItemId);
    return sum + (item?.price.amount ?? 0) * line.quantity;
  }, 0);

  function submit() {
    const items = lines.filter((line) => availableMenus.some((item) => item.id === line.menuItemId) && line.quantity > 0);
    if (!outletId || !customerName.trim() || !items.length || total <= 0) return;
    onCreate({ outletId, channel, customerName: customerName.trim(), etaMinutes, items, clientMutationId });
  }

  return (
    <ModalFrame title="Create manual order" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm font-semibold">
            Customer
            <Input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Customer name" />
          </label>
          <label className="space-y-1 text-sm font-semibold">
            ETA minutes
            <Input type="number" min={1} value={etaMinutes} onChange={(event) => setEtaMinutes(Number(event.target.value))} />
          </label>
          <label className="space-y-1 text-sm font-semibold">
            Outlet
            <select className="h-10 w-full rounded-xl border border-line bg-panel px-3 text-sm text-ink" value={outletId} onChange={(event) => setOutletId(event.target.value)}>
              {outlets.map((outlet) => (
                <option key={outlet.id} value={outlet.id}>{outlet.name}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm font-semibold">
            Channel
            <select className="h-10 w-full rounded-xl border border-line bg-panel px-3 text-sm text-ink" value={channel} onChange={(event) => setChannel(event.target.value as Channel)}>
              {['direct', 'deliveroo', 'talabat', 'careem', 'noon_food', 'hungerstation', 'jahez', 'uber_eats'].map((item) => (
                <option key={item} value={item}>{item.replace('_', ' ')}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black">Items</h3>
            <Button size="sm" variant="secondary" disabled={!availableMenus.length} onClick={() => setLines((current) => [...current, { menuItemId: defaultMenuId, quantity: 1 }])}>
              <Plus className="size-4" />
              Add
            </Button>
          </div>
          {menusLoading ? <LoadingRows /> : null}
          {menusError ? <ErrorState /> : null}
          {!menusLoading && !menusError && !availableMenus.length ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-700">
              No available menu items for this outlet.
            </div>
          ) : null}
          {lines.map((line, index) => (
            <div key={`${line.menuItemId}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_88px_40px]">
              <select
                className="h-10 rounded-xl border border-line bg-panel px-3 text-sm text-ink"
                value={line.menuItemId}
                onChange={(event) =>
                  setLines((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, menuItemId: event.target.value } : item)))
                }
              >
                {availableMenus.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
              <Input
                type="number"
                min={1}
                value={line.quantity}
                onChange={(event) =>
                  setLines((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, quantity: Number(event.target.value) } : item)))
                }
              />
              <Button size="sm" variant="ghost" onClick={() => setLines((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label="Remove item">
                <Minus className="size-4" />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between rounded-xl border border-line bg-panel-muted p-3">
          <span className="text-sm font-bold">Total</span>
          <span className="text-lg font-black">{formatMoney(total)}</span>
        </div>
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={loading || menusLoading || menusError || !customerName.trim() || !lines.some((line) => line.menuItemId) || total <= 0}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <ShoppingCart className="size-4" />}
            Create order
          </Button>
        </div>
      </div>
    </ModalFrame>
  );
}

function SlaBadge({ order, compact }: { order: Order; compact?: boolean }) {
  const now = useNow();
  const state = getSlaState(order, now);
  const label = state.remainingMs <= 0 ? `${Math.abs(state.minutes)}m overdue` : `${state.minutes}m left`;
  const liveClass = state.level === 'red' || state.level === 'yellow' ? 'live-pulse' : '';
  const tone =
    state.level === 'red'
      ? 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-800'
      : state.level === 'yellow'
        ? 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-800'
        : 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-800';

  return (
    <Badge className={tone}>
      <span className={`${liveClass} mr-1.5 size-1.5 rounded-full bg-current`} />
      {compact ? null : <Timer className="mr-1 size-3" />}
      {label}
    </Badge>
  );
}

export function MenusPage() {
  const { user } = useAuth();
  const canManageMenus = Boolean(user && ['owner', 'manager'].includes(user.role));
  const menus = useMenus();
  const queryClient = useQueryClient();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const updateAvailability = useMutation({
    mutationFn: ({ id, available }: { id: string; available: boolean }) => dashboardApi.updateMenuAvailability([id], available),
    onSuccess: () => {
      setStatusMessage(null);
      void queryClient.invalidateQueries({ queryKey: ['menus'] });
    },
    onError: (error) => setStatusMessage(getMutationErrorMessage(error))
  });
  const syncMenus = useMutation({
    mutationFn: dashboardApi.syncMenus,
    onSuccess: () => setStatusMessage('Menu sync queued.'),
    onError: (error) => setStatusMessage(getMutationErrorMessage(error))
  });
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Menu management"
        title="Pricing, availability, variants, and outlet scopes"
        action={canManageMenus ? 'Bulk sync' : undefined}
        onAction={canManageMenus ? () => syncMenus.mutate() : undefined}
      />
      {statusMessage ? (
        <div className="rounded-xl border border-line bg-panel-muted p-3 text-sm font-semibold text-muted">{statusMessage}</div>
      ) : null}
      <AsyncState loading={menus.isLoading} error={menus.isError} empty={!menus.data?.length}>
        <div className="grid gap-4 lg:grid-cols-3">
          {menus.data?.map((item) => (
            <Card key={item.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-royal">{item.category}</p>
                  <h3 className="mt-2 text-lg font-bold">{item.name}</h3>
                </div>
                {canManageMenus ? (
                  <button
                    className={`h-6 w-11 rounded-full p-1 transition disabled:opacity-50 ${item.available ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    aria-label="Toggle availability"
                    disabled={updateAvailability.isPending}
                    onClick={() => updateAvailability.mutate({ id: item.id, available: !item.available })}
                  >
                    <span className={`block size-4 rounded-full bg-white transition ${item.available ? 'translate-x-5' : ''}`} />
                  </button>
                ) : (
                  <Badge className={item.available ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-100 text-slate-600 ring-slate-200'}>
                    {item.available ? 'available' : 'paused'}
                  </Badge>
                )}
              </div>
              <p className="mt-4 text-2xl font-black">{formatMoney(item.price.amount, item.price.currency)}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {item.variants.map((variant) => (
                  <Badge key={variant} className="bg-panel-muted text-muted ring-line">{variant}</Badge>
                ))}
              </div>
              <p className="mt-4 text-sm text-muted">{item.outletScope.join(', ')}</p>
            </Card>
          ))}
        </div>
      </AsyncState>
    </div>
  );
}

export function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Analytics" title="Revenue, conversion, heatmaps, and outlet performance" action="Schedule digest" disabledReason="Coming soon" />
      <ExecutiveSummaryStrip />
      <KitchenPerformancePanel />
      <div className="grid gap-4 xl:grid-cols-[1fr_.9fr]">
        <DeliveryPerformancePanel />
        <PeakHourPanel />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_.85fr]">
        <FulfillmentBottleneckPanel />
        <PredictiveBenchmarkPanel />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <RevenuePanel />
        <OutletPanel />
      </div>
      <ChannelPanel />
      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <PayoutReconciliationPanel />
        <OperationalAnalyticsPanel />
      </div>
    </div>
  );
}

export function AutomationPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Workflow automation" title="Rules, triggers, actions, and execution history" action="New rule" disabledReason="Coming soon" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Active automations" value="18" detail="7 touch dispatch and SLA">
          <Workflow className="size-5 text-royal" />
        </MetricCard>
        <MetricCard label="Runs today" value="146" detail="98.6% completed cleanly">
          <Zap className="size-5 text-royal" />
        </MetricCard>
        <MetricCard label="Manual hours saved" value="31h" detail="Projected weekly operations impact">
          <Clock className="size-5 text-royal" />
        </MetricCard>
        <MetricCard label="Rules needing review" value="3" detail="Draft or degraded confidence">
          <AlertCircle className="size-5 text-royal" />
        </MetricCard>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
        <AutomationRuleEnginePanel />
        <AutomationRunHistoryPanel />
      </div>
      <AutomationWorkflowCanvas />
      <AutonomousGovernancePanel />
    </div>
  );
}

export function ExecutivePage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Executive overview" title="Boardroom-ready GCC operations overview" action="Export board pack" disabledReason="Coming soon" />
      <ExecutiveSummaryStrip />
      <div className="grid gap-4 xl:grid-cols-[1fr_.85fr]">
        <RegionalPerformancePanel />
        <EnterpriseRiskPanel />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
        <FranchiseProfitabilityPanel />
        <ForecastBoardPanel />
      </div>
      <BoardroomNarrativePanel />
    </div>
  );
}

export function DigitalTwinPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Outlet model" title="Fulfillment pressure and scenario modeling" action="Run simulation" disabledReason="Coming soon" />
      <EnterpriseStateEnginePanel />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Twin confidence" value="86%" detail="Live model confidence range">
          <BrainCircuit className="size-5 text-royal" />
        </MetricCard>
        <MetricCard label="Fulfillment pressure" value="62%" detail="Predicted dinner peak load">
          <Activity className="size-5 text-royal" />
        </MetricCard>
        <MetricCard label="Courier availability" value="91%" detail="Dubai pool, next 45 minutes">
          <Route className="size-5 text-royal" />
        </MetricCard>
        <MetricCard label="Stockout horizon" value="2h 10m" detail="Chicken base at current drawdown">
          <PackageCheck className="size-5 text-royal" />
        </MetricCard>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
        <DigitalTwinSimulationPanel />
        <TwinOutletModelPanel />
      </div>
      <IntelligenceMeshPanel />
      <TwinForecastOverlayPanel />
    </div>
  );
}

export function NetworkPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Global control network" title="Regional pulse, outlet topology, and logistics corridors" action="Open network view" disabledReason="Coming soon" />
      <div className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
        <EnterpriseNetworkMapPanel />
        <RegionalPulsePanel />
      </div>
      <EcosystemCoordinationPanel />
      <LogisticsCorridorPanel />
    </div>
  );
}

export function IntelligenceMeshPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Dependency map" title="Cross-system impact and enterprise state" action="Recompute map" disabledReason="Coming soon" />
      <EnterpriseStateEnginePanel />
      <div className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
        <IntelligenceMeshPanel />
        <CrossSystemReasoningPanel />
      </div>
      <GlobalOperationsFabricPanel />
      <AutonomousCoordinationPanel />
    </div>
  );
}

export function OperationsFabricPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Operations workflows" title="Dependency propagation and adaptive enterprise flows" action="Propagate state" disabledReason="Coming soon" />
      <EnterpriseAwarenessPulsePanel />
      <GlobalOperationsFabricPanel />
      <StrategicOptimizationPanel />
      <div className="grid gap-4 xl:grid-cols-[1fr_.9fr]">
        <AdaptiveLearningPanel />
        <PredictiveEcosystemIntelligencePanel />
      </div>
    </div>
  );
}

export function MissionControlPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Live wallboard" title="Enterprise wallboard, incidents, and network activity" action="Enter wallboard" disabledReason="Coming soon" />
      <GlobalSynchronizationPanel />
      <MissionControlWallboard />
      <div className="grid gap-4 xl:grid-cols-[1fr_.8fr]">
        <EnterpriseNetworkMapPanel />
        <EnterpriseEventTimelinePanel />
      </div>
      <MultiRegionBalancingPanel />
    </div>
  );
}

export function WorkforcePage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Workforce" title="Staffing resilience, shift load, and workload balancing" action="Balance shifts" disabledReason="Coming soon" />
      <PredictiveWorkforcePanel />
      <div className="grid gap-4 xl:grid-cols-[1fr_.9fr]">
        <AutonomousCoordinationPanel />
        <CrossSystemReasoningPanel />
      </div>
    </div>
  );
}

export function ScenarioCenterPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Scenario simulation" title="Demand, staffing, outage, weather, and Ramadan what-if modeling" action="Create scenario" disabledReason="Coming soon" />
      <ScenarioSimulationPanel />
      <div className="grid gap-4 xl:grid-cols-[1fr_.9fr]">
        <DigitalTwinSimulationPanel />
        <StrategicBrainPanel />
      </div>
    </div>
  );
}

export function KnowledgePage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Operations history" title="Historical incidents and operating playbooks" action="Generate retrospective" disabledReason="Coming soon" />
      <KnowledgeTimelinePanel />
      <TemporalIntelligencePanel />
      <AdaptiveLearningPanel />
      <EnterpriseEvolutionPanel />
      <RecurringPatternPanel />
    </div>
  );
}

export function ConsciousnessPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Enterprise pulse" title="Operating maturity, morale, and strategic pressure" action="Refresh pulse" disabledReason="Coming soon" />
      <EnterpriseAwarenessPulsePanel />
      <StrategicNarrativeEnginePanel />
      <WorldviewModelPanel />
    </div>
  );
}

export function TemporalPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Seasonal planning" title="Seasonal learning, operational drift, and trend evolution" action="Compare cycles" disabledReason="Coming soon" />
      <TemporalIntelligencePanel />
      <div className="grid gap-4 xl:grid-cols-[1fr_.9fr]">
        <KnowledgeTimelinePanel />
        <AdaptiveLearningPanel />
      </div>
    </div>
  );
}

export function CollaborationPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Operator approvals" title="Trust scoring, override loops, and mitigation approvals" action="Review approvals" disabledReason="Coming soon" />
      <HumanAiCollaborationPanel />
      <div className="grid gap-4 xl:grid-cols-[1fr_.9fr]">
        <AutonomousCoordinationPanel />
        <CrossSystemReasoningPanel />
      </div>
    </div>
  );
}

export function BoardroomPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Boardroom" title="Strategic forecasts, investment planning, and market opportunity briefs" action="Export strategy brief" disabledReason="Coming soon" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {boardroomBriefs.map((brief) => (
          <MetricCard key={brief.title} label={brief.title} value={brief.value} detail={brief.detail}>
            <Landmark className="size-5 text-royal" />
          </MetricCard>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_.9fr]">
        <BoardroomNarrativePanel />
        <MarketOpportunityPanel />
      </div>
      <EnterpriseResilienceBriefPanel />
      <WorldviewModelPanel />
      <ExecutiveOptimizationPanel />
    </div>
  );
}

export function OptimizationPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Strategic optimization" title="Enterprise tradeoffs, sequencing, and operating plans" action="Approve plan" disabledReason="Coming soon" />
      <StrategicOptimizationPanel />
      <div className="grid gap-4 xl:grid-cols-[1fr_.9fr]">
        <EnterpriseEconomicPanel />
        <WorkflowEvolutionPanel />
      </div>
    </div>
  );
}

export function EnterprisePlanningPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Enterprise planning" title="Strategic rollout, expansion sequencing, and roadmaps" action="Generate roadmap" disabledReason="Coming soon" />
      <AutonomousPlanningPanel />
      <div className="grid gap-4 xl:grid-cols-[1fr_.9fr]">
        <MultiRegionBalancingPanel />
        <ExecutiveOptimizationPanel />
      </div>
    </div>
  );
}

export function EconomicsPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Enterprise economics" title="Margin stability, ROI, cost pressure, and revenue resilience" action="Run economics model" disabledReason="Coming soon" />
      <EnterpriseEconomicPanel />
      <div className="grid gap-4 xl:grid-cols-[1fr_.9fr]">
        <SettlementComparisonPanel />
        <StrategicOptimizationPanel />
      </div>
    </div>
  );
}

export function IncidentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Incident operations" title="Escalation threads, ownership, and handoff workflows" action="Open incident" disabledReason="Coming soon" />
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Active incidents" value="3" detail="1 escalated, 2 under investigation">
          <AlertCircle className="size-5 text-royal" />
        </MetricCard>
        <MetricCard label="Avg time to assign" value="4m" detail="Supervisor assignment SLA">
          <UserCheck className="size-5 text-royal" />
        </MetricCard>
        <MetricCard label="Audit events" value="72" detail="Comments, handoffs, and actions today">
          <MessageSquare className="size-5 text-royal" />
        </MetricCard>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_.8fr]">
        <IncidentCenterPanel />
        <IncidentAuditPanel />
      </div>
    </div>
  );
}

export function GovernancePage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Enterprise governance" title="Organization hierarchy, franchise controls, and regional permissions" action="Invite admin" disabledReason="Coming soon" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Organizations" value="4" detail="Parent, regions, franchisees, brand groups">
          <Building2 className="size-5 text-royal" />
        </MetricCard>
        <MetricCard label="Permission groups" value="12" detail="Outlet, finance, support, and brand scopes">
          <ShieldCheck className="size-5 text-royal" />
        </MetricCard>
        <MetricCard label="Policy drift" value="2" detail="Review required this week">
          <GitBranch className="size-5 text-royal" />
        </MetricCard>
        <MetricCard label="Audit coverage" value="100%" detail="Every privileged action tracked">
          <KeyRound className="size-5 text-royal" />
        </MetricCard>
      </div>
      <GovernanceHierarchyPanel />
      <ComplianceControlPanel />
      <AutonomousGovernancePanel />
      <StrategicAiGovernancePanel />
    </div>
  );
}

export function FinancePage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Finance operations" title="Payout reconciliation, VAT readiness, refunds, and leakage control" action="Run settlement check" disabledReason="Coming soon" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {financeSignals.map((signal) => (
          <MetricCard key={signal.title} label={signal.title} value={signal.value} detail={signal.detail}>
            <WalletCards className="size-5 text-royal" />
          </MetricCard>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <PayoutReconciliationPanel />
        <SettlementComparisonPanel />
      </div>
      <EnterpriseEconomicPanel />
    </div>
  );
}

export function CustomerIntelligencePage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Customer operations" title="Segmentation, loyalty, churn risk, and satisfaction signals" action="Create segment" disabledReason="Coming soon" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Repeat order rate" value="42.8%" detail="+3.1 pts vs last week">
          <Users className="size-5 text-royal" />
        </MetricCard>
        <MetricCard label="Churn risk" value="680" detail="Customers with missed reorder cycles">
          <AlertCircle className="size-5 text-royal" />
        </MetricCard>
        <MetricCard label="High-value customers" value="4.8k" detail="AED 180+ average monthly spend">
          <TrendingUp className="size-5 text-royal" />
        </MetricCard>
        <MetricCard label="Satisfaction" value="4.62" detail="Weighted by channel and outlet SLA">
          <MessageSquare className="size-5 text-royal" />
        </MetricCard>
      </div>
      <CustomerSegmentationPanel />
      <CustomerCopilotPanel />
    </div>
  );
}

export function AiCopilotPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Operations advisor" title="Contextual recommendations and anomaly explanations" action="Tune advisors" disabledReason="Coming soon" />
      <div className="grid gap-4 md:grid-cols-3">
        <IntelligenceCard
          title="SLA and revenue explanation"
          detail="Sales dip is likely tied to courier SLA degradation in Abu Dhabi Yas, not demand weakness. Refund exposure rose in the same 90-minute window."
          meta="high confidence"
          tone="warning"
        />
        <IntelligenceCard
          title="Staffing recommendation"
          detail="Business Bay may require one extra prep runner between 19:00 and 21:00 based on order mix and bowl assembly time."
          meta="+6% SLA"
          tone="good"
        />
        <IntelligenceCard
          title="Revenue opportunity"
          detail="Direct-channel regulars are converting 9% better on high-margin bowls than aggregators. Promote dinner bundles through WhatsApp."
          meta="AED 8.4k upside"
          tone="good"
        />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_.9fr]">
        <PeakHourPanel />
        <ForecastBoardPanel />
      </div>
      <StrategicBrainPanel />
      <CrossSystemReasoningPanel />
      <AutomationRunHistoryPanel />
    </div>
  );
}

export function IntegrationsPage() {
  const { user } = useAuth();
  const integrations = useIntegrations();
  const webhooks = useWebhooks();
  const queueClient = useQueryClient();
  const simulate = useMutation({
    mutationFn: () => dashboardApi.simulateAggregator(4),
    onSuccess: () => {
      void queueClient.invalidateQueries({ queryKey: ['orders'] });
      void queueClient.invalidateQueries({ queryKey: ['webhooks'] });
      void queueClient.invalidateQueries({ queryKey: ['queue-activity'] });
    }
  });
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Integration control"
        title="Aggregator, POS, accounting, and webhook health"
        action={user && ['owner', 'manager'].includes(user.role) ? 'Simulate orders' : undefined}
        onAction={user && ['owner', 'manager'].includes(user.role) ? () => simulate.mutate() : undefined}
      />
      {simulate.data ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
          Created {simulate.data.created} simulated orders. Failed retries: {simulate.data.failed}.
        </div>
      ) : null}
      <IntegrationEcosystemPanel />
      <ExtensionMarketplacePanel />
      <EcosystemCoordinationPanel />
      <PredictiveEcosystemIntelligencePanel />
      <AsyncState loading={integrations.isLoading} error={integrations.isError} empty={!integrations.data?.length}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {integrations.data?.map((integration) => (
            <Card key={integration.id} className="p-5">
              <div className="flex items-center justify-between">
                <div className="grid size-12 place-items-center rounded-xl bg-ink text-sm font-black text-white">
                  {integration.label.slice(0, 2).toUpperCase()}
                </div>
                <Badge className={integration.status === 'connected' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-amber-50 text-amber-700 ring-amber-200'}>
                  {integration.status}
                </Badge>
              </div>
              <h3 className="mt-5 text-xl font-black">{integration.label}</h3>
              <p className="mt-2 text-sm text-muted">Last sync {integration.lastSync}. Webhook delivery health at {integration.webhookHealth}%.</p>
              <div className="mt-5 h-2 rounded-full bg-panel-muted">
                <div className="h-full rounded-full bg-royal" style={{ width: `${integration.webhookHealth}%` }} />
              </div>
            </Card>
          ))}
        </div>
      </AsyncState>
      <WebhookEventPanel loading={webhooks.isLoading} error={webhooks.isError} rows={webhooks.data ?? []} />
    </div>
  );
}

export function InventoryPage() {
  const { user } = useAuth();
  const canAdjustInventory = Boolean(user && ['owner', 'manager'].includes(user.role));
  const outlets = user?.restaurant?.outlets ?? [];
  const [outletId, setOutletId] = useState(outlets[0]?.id);
  const inventory = useInventory(outletId);
  const queryClient = useQueryClient();
  const adjustInventory = useMutation({
    mutationFn: ({ item, delta, reason }: { item: InventoryItem; delta: number; reason: string }) =>
      dashboardApi.adjustInventory(item.outletId, item.id, delta, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inventory'] });
      void queryClient.invalidateQueries({ queryKey: ['analytics-summary'] });
    }
  });
  useEffect(() => {
    if (!outletId && outlets[0]?.id) setOutletId(outlets[0].id);
  }, [outletId, outlets]);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Inventory" title="Stock control and outlet replenishment" action={canAdjustInventory ? 'Sync stock' : undefined} disabledReason={canAdjustInventory ? 'Coming soon' : undefined} />
      <Card className="p-4">
        <div className="flex flex-wrap gap-2">
          {outlets.map((outlet) => (
            <Button key={outlet.id} variant={outletId === outlet.id ? 'primary' : 'secondary'} size="sm" onClick={() => setOutletId(outlet.id)}>
              {outlet.name}
            </Button>
          ))}
        </div>
      </Card>
      <AsyncState loading={inventory.isLoading} error={inventory.isError} empty={!inventory.data?.items.length}>
        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {inventory.data?.items.map((item) => (
              <Card key={item.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-royal">{item.sku}</p>
                    <h3 className="mt-2 text-lg font-bold">{item.name}</h3>
                  </div>
                  <Badge className={inventoryTone(item.risk)}>{item.risk}</Badge>
                </div>
                <p className="mt-4 text-2xl font-black">{item.quantity} {item.unit}</p>
                <p className="mt-1 text-sm text-muted">Reorder at {item.reorderAt} {item.unit}</p>
                <div className="mt-5 h-2 rounded-full bg-panel-muted">
                  <div className={`h-full rounded-full ${item.risk === 'critical' ? 'bg-rose-500' : item.risk === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${item.stockPercent}%` }} />
                </div>
                {canAdjustInventory ? (
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => adjustInventory.mutate({ item, delta: 5, reason: 'Manual restock' })} disabled={adjustInventory.isPending}>
                      <Plus className="size-4" />
                      Restock
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => adjustInventory.mutate({ item, delta: -1, reason: 'Stock deduction simulation' })} disabled={adjustInventory.isPending || item.quantity <= 0}>
                      <Minus className="size-4" />
                      Deduct
                    </Button>
                  </div>
                ) : null}
              </Card>
            ))}
          </div>
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Inventory activity</h2>
              <PackageCheck className="size-5 text-royal" />
            </div>
            <div className="mt-4 space-y-3">
              <AsyncState loading={inventory.isLoading} error={inventory.isError} empty={!inventory.data?.activity.length}>
                {inventory.data?.activity.map((item) => (
                  <div key={item.id} className="rounded-lg border border-line bg-panel-muted p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold">{item.name}</p>
                      <span className={`text-sm font-black ${item.delta < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {item.delta > 0 ? '+' : ''}{item.delta}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted">{item.reason} - now {item.quantityAfter}</p>
                  </div>
                ))}
              </AsyncState>
            </div>
          </Card>
        </div>
      </AsyncState>
    </div>
  );
}

export function SimpleOpsPage({ title, eyebrow }: { title: string; eyebrow: string }) {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow={eyebrow} title={title} action="Configure" disabledReason="Coming soon" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {['Operational policy', 'Automation rules', 'Audit timeline', 'Approval queue', 'SLA monitors', 'Team ownership'].map((item) => (
          <Card key={item} className="p-5">
            <Activity className="size-5 text-royal" />
            <h3 className="mt-4 font-bold">{item}</h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              Enterprise controls with outlet-specific permissions, live telemetry, and change history for franchise scale.
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function NotificationsPage() {
  const notifications = useOpsStore((state) => state.notifications);
  const clearNotifications = useOpsStore((state) => state.clearNotifications);
  const markAllRead = useOpsStore((state) => state.markAllRead);
  const clearDismissed = useOpsStore((state) => state.clearDismissed);
  const activity = useActivity();
  const queueActivity = useQueueActivity();
  const activityNotifications = (activity.data ?? []).map(activityToNotification);
  const rows = [...notifications].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Notifications" title="Operational alerts and incident routing" action="Clear" onAction={clearNotifications} />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={markAllRead}>Mark all as read</Button>
        <Button size="sm" variant="secondary" onClick={clearDismissed}>Clear dismissed</Button>
      </div>
      <Card className="overflow-hidden">
        <AsyncTableState loading={false} error={false} empty={!rows.length}>
          <div className="divide-y divide-line">
            {rows.map((notification) => (
              <NotificationRow key={notification.id} notification={notification} />
            ))}
          </div>
        </AsyncTableState>
      </Card>
      <Card className="overflow-hidden">
        <div className="border-b border-line p-4">
          <h2 className="text-lg font-bold">Durable activity history</h2>
        </div>
        <AsyncTableState loading={activity.isLoading} error={activity.isError} empty={!activityNotifications.length}>
          <div className="divide-y divide-line">
            {activityNotifications.map((notification) => (
              <NotificationRow key={notification.id} notification={notification} />
            ))}
          </div>
        </AsyncTableState>
      </Card>
      <QueueActivityPanel loading={queueActivity.isLoading} error={queueActivity.isError} rows={queueActivity.data ?? []} />
    </div>
  );
}

export function AuditPage() {
  const [query, setQuery] = useState('');
  const [action, setAction] = useState('all');
  const [severity, setSeverity] = useState('all');
  const [actorRole, setActorRole] = useState('all');
  const [operationType, setOperationType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const audit = useAudit({ page, limit: 20, query, action, severity, actorRole, operationType, dateFrom, dateTo });

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Audit" title="Operational audit timeline" />
      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <SearchInput
            value={query}
            onChange={(event) => {
              setPage(1);
              setQuery(event.target.value);
            }}
            placeholder="Search action, entity, outlet"
          />
          <select
            className="h-10 rounded-xl border border-line bg-panel px-3 text-sm font-semibold text-ink"
            value={action}
            onChange={(event) => {
              setPage(1);
              setAction(event.target.value);
            }}
          >
            <option value="all">All actions</option>
            {['auth.login', 'auth.logout', 'auth.failed', 'order.created', 'order.status_changed', 'inventory.adjusted', 'inventory.low_stock'].map((item) => (
              <option key={item} value={item}>
                {item.replace('.', ' ')}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-xl border border-line bg-panel px-3 text-sm font-semibold text-ink"
            value={severity}
            onChange={(event) => {
              setPage(1);
              setSeverity(event.target.value);
            }}
          >
            <option value="all">All severities</option>
            {['info', 'warning', 'error', 'critical'].map((item) => (
              <option key={item} value={item}>
                {roleLabels[item as Role]}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-xl border border-line bg-panel px-3 text-sm font-semibold text-ink"
            value={actorRole}
            onChange={(event) => {
              setPage(1);
              setActorRole(event.target.value);
            }}
          >
            <option value="all">All actors</option>
            {['owner', 'manager', 'kitchen', 'support'].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <Input
            value={operationType}
            onChange={(event) => {
              setPage(1);
              setOperationType(event.target.value);
            }}
            placeholder="Operation type"
          />
          <Input
            type="date"
            value={dateFrom}
            onChange={(event) => {
              setPage(1);
              setDateFrom(event.target.value);
            }}
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(event) => {
              setPage(1);
              setDateTo(event.target.value);
            }}
          />
        </div>
      </Card>
      <Card className="overflow-hidden">
        <AsyncTableState loading={audit.isLoading} error={audit.isError} empty={!audit.data?.items.length}>
          <div className="divide-y divide-line">
            {audit.data?.items.map((item) => (
              <div key={item.id} className="grid gap-3 p-4 text-sm lg:grid-cols-[1.2fr_.9fr_.8fr_.8fr]">
                <div>
                  <p className="font-bold">{item.action.replace('.', ' ')}</p>
                  <p className="mt-1 text-xs text-muted">{item.entityType}{item.entityId ? ` - ${item.entityId}` : ''}</p>
                  <Badge className={item.severity === 'warning' ? 'mt-2 bg-amber-50 text-amber-700 ring-amber-200' : 'mt-2 bg-panel-muted text-muted ring-line'}>{item.severity ?? 'info'}</Badge>
                </div>
                <div>
                  <p className="font-semibold">{item.actorRole ?? 'system'}</p>
                  <p className="mt-1 text-xs text-muted">{item.actorUserId ?? 'No actor'}</p>
                </div>
                <div>
                  <p className="font-semibold">{item.outletName ?? 'All outlets'}</p>
                  <p className="mt-1 text-xs text-muted">{item.correlationId ?? 'No correlation id'}</p>
                </div>
                <p className="font-semibold text-muted">{formatDateTime(item.createdAt)}</p>
              </div>
            ))}
          </div>
        </AsyncTableState>
      </Card>
      <Pagination page={page} totalPages={audit.data?.totalPages ?? 1} onPage={setPage} />
    </div>
  );
}

function activityToNotification(activity: OperationalActivity): OperationsNotification {
  return {
    id: `activity:${activity.id}`,
    type: 'activity',
    title: activity.title,
    detail: activity.outletName ? `${activity.detail} - ${activity.outletName}` : activity.detail,
    createdAt: activity.occurredAt,
    tone: activity.tone
  };
}

function NotificationRow({ notification }: { notification: OperationsNotification }) {
  return (
    <div className="flex items-start gap-3 p-4">
      <span className={`mt-1 grid size-9 shrink-0 place-items-center rounded-full ${notificationTone(notification.tone)}`}>
        <Bell className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="font-bold">{notification.title}</p>
        <p className="mt-1 text-sm text-muted">{notification.detail}</p>
        <p className="mt-2 text-xs font-semibold text-muted">{formatDateTime(notification.createdAt)}</p>
      </div>
    </div>
  );
}

function AutomationRuleEnginePanel() {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Rule engine</p>
          <h2 className="mt-1 text-xl font-black">Trigger and action workflows</h2>
        </div>
        <Workflow className="size-5 text-royal" />
      </div>
      <div className="mt-5 space-y-3">
        {automationRules.map((rule) => (
          <div key={rule.name} className="rounded-xl border border-line bg-panel-muted/45 p-4 transition hover:border-royal/40">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-black">{rule.name}</p>
                <p className="mt-2 text-sm leading-6 text-muted">When {rule.trigger}</p>
                <p className="mt-1 text-sm leading-6 text-muted">Then {rule.action}</p>
              </div>
              <Badge className={rule.status === 'active' ? 'bg-royal/10 text-royal ring-royal/25' : 'bg-amber-400/10 text-amber-200 ring-amber-400/25'}>
                {rule.status}
              </Badge>
            </div>
            <p className="mt-3 text-xs font-bold uppercase tracking-wide text-royal">{rule.impact}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function AutomationRunHistoryPanel() {
  return (
    <Card className="p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Execution logs</p>
      <h2 className="mt-1 text-xl font-black">Automation history</h2>
      <div className="mt-5">
        <ActivityStream items={automationRuns.map((run) => ({ time: run.time, detail: `${run.rule} - ${run.outlet}: ${run.result}`, tone: run.tone }))} />
      </div>
    </Card>
  );
}

function AutomationWorkflowCanvas() {
  return (
    <Card className="p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Workflow builder</p>
      <h2 className="mt-1 text-xl font-black">SLA breach automation path</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-4">
        {[
          ['Trigger', 'Order SLA under 5 minutes'],
          ['Condition', 'Outlet load above 80% or courier wait above 9 minutes'],
          ['Actions', 'Notify manager, assign runner, create incident thread'],
          ['Governance', 'Write audit log and require handoff close note']
        ].map(([label, detail]) => (
          <div key={label} className="rounded-xl border border-line bg-panel-muted/45 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">{label}</p>
            <p className="mt-2 text-sm font-semibold leading-6">{detail}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ExecutiveSummaryStrip() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {executiveSignals.map((signal) => (
        <MetricCard key={signal.label} label={signal.label} value={signal.value} detail={signal.detail}>
          <signal.icon className="size-5 text-royal" />
        </MetricCard>
      ))}
    </div>
  );
}

function EnterpriseRiskPanel() {
  return (
    <Card className="p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Enterprise risk center</p>
      <h2 className="mt-1 text-xl font-black">Board-level operating risks</h2>
      <div className="mt-5 space-y-3">
        {[
          ['Courier capacity', 'Yas and Marina delivery wait times are degrading during dinner peak.', 'Mitigate'],
          ['VAT metadata', '18 orders need invoice metadata before month-end close.', 'Review'],
          ['Franchise policy drift', 'Dubai cluster has two overrides pending director approval.', 'Approve']
        ].map(([title, detail, action]) => (
          <div key={title} className="rounded-xl border border-line bg-panel-muted/45 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black">{title}</p>
                <p className="mt-1 text-sm leading-6 text-muted">{detail}</p>
              </div>
              <Badge className="shrink-0 bg-amber-400/10 text-amber-200 ring-amber-400/25">{action}</Badge>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function FranchiseProfitabilityPanel() {
  return (
    <Card className="p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Franchise profitability</p>
      <h2 className="mt-1 text-xl font-black">Region and brand margin board</h2>
      <div className="mt-5 space-y-4">
        {[
          ['Dubai Marina', 21, 'Direct orders and lower refund leakage'],
          ['Business Bay', 18, 'Healthy channel mix, rising staffing cost'],
          ['Abu Dhabi Yas', 14, 'Courier refunds compressing contribution'],
          ['Sharjah Majaz', 16, 'Inventory variance under review']
        ].map(([region, margin, detail]) => (
          <div key={region}>
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold">{region}</span>
              <span className="font-black">{margin}% margin</span>
            </div>
            <p className="mt-1 text-xs text-muted">{detail}</p>
            <div className="mt-2 h-2 rounded-full bg-panel-muted">
              <div className="h-full rounded-full bg-gradient-to-r from-royal to-cyan" style={{ width: `${Number(margin) * 4}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ForecastBoardPanel() {
  return (
    <Card className="p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Operational forecast</p>
      <h2 className="mt-1 text-xl font-black">Weekly executive summary</h2>
      <div className="mt-4">
        <InsightBanner
          title="Executive summary"
          detail="Growth remains healthy, but courier SLA degradation is now the largest controllable risk to weekly margin. Expansion readiness is strongest in JLT and Dubai South."
          action="Board pack signal"
        />
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {['Top region: Dubai Marina', 'Underperformer: Abu Dhabi Yas', 'Benchmark: +2.1 pts margin', 'Expansion: JLT ready'].map((item) => (
          <div key={item} className="rounded-xl border border-line bg-panel-muted/45 p-4 text-sm font-bold">
            {item}
          </div>
        ))}
      </div>
    </Card>
  );
}

function IncidentCenterPanel() {
  return (
    <Card className="p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Escalation threads</p>
      <h2 className="mt-1 text-xl font-black">Incident center</h2>
      <div className="mt-5 space-y-3">
        {incidentThreads.map((incident) => (
          <div key={incident.title} className="rounded-xl border border-line bg-panel-muted/45 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-black">{incident.title}</p>
                <p className="mt-1 text-sm text-muted">{incident.next}</p>
              </div>
              <Badge className={incident.status === 'escalated' ? 'bg-rose-400/10 text-rose-200 ring-rose-400/25' : 'bg-panel text-muted ring-line'}>
                {incident.status}
              </Badge>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-muted">
              <span>Lead: {incident.owner}</span>
              <span>{incident.age} open</span>
              <span>{incident.comments} comments</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function IncidentAuditPanel() {
  return (
    <Card className="p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Action log</p>
      <h2 className="mt-1 text-xl font-black">Handoffs and comments</h2>
      <div className="mt-5 space-y-3">
        {[
          ['16:23', 'Aisha assigned Dubai Marina breach to dispatch lead.'],
          ['16:18', 'Automation attached courier SLA evidence to thread.'],
          ['16:04', 'Ops finance requested inventory variance count.'],
          ['15:57', 'Support added customer impact note to backlog escalation.']
        ].map(([time, detail]) => (
          <div key={`${time}-${detail}`} className="rounded-xl border border-line bg-panel-muted/45 p-3 text-sm">
            <p className="font-black text-royal">{time}</p>
            <p className="mt-1 text-muted">{detail}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function IntegrationEcosystemPanel() {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Integration orchestration</p>
          <h2 className="mt-1 text-xl font-black">API, webhook, POS, and finance sync health</h2>
        </div>
        <Globe2 className="size-5 text-royal" />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        {[
          ['Webhook retries', '14', '3 need replay'],
          ['Entity maps', '98.6%', 'menu and tax codes'],
          ['BC posting queue', '2 batches', 'awaiting retry'],
          ['SLA ingest lag', '41s', 'within tolerance']
        ].map(([label, value, detail]) => (
          <div key={label} className="rounded-lg border border-line bg-panel/70 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">{label}</p>
            <p className="mt-1 text-lg font-black">{value}</p>
            <p className="mt-1 text-xs text-muted">{detail}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {marketplaceApps.map((app) => (
          <div key={app.name} className="rounded-xl border border-line bg-panel-muted/45 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black">{app.name}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-muted">{app.category}</p>
              </div>
              <Badge className={app.status === 'degraded' ? 'bg-amber-400/10 text-amber-200 ring-amber-400/25' : 'bg-royal/10 text-royal ring-royal/25'}>
                {app.status}
              </Badge>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted">{app.insight}</p>
            <div className="mt-4 h-2 rounded-full bg-panel">
              <div className="h-full rounded-full bg-royal" style={{ width: `${app.health}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function GovernanceHierarchyPanel() {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-line p-5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Organization switcher</p>
        <h2 className="mt-1 text-xl font-black">Multi-tenant hierarchy</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-line bg-panel-muted/80 text-xs uppercase tracking-[0.14em] text-muted">
            <tr>{['Unit', 'Type', 'Access', 'Compliance', 'Scope'].map((head) => <th key={head} className="px-5 py-4 font-bold">{head}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line">
            {governanceRows.map((row) => (
              <tr key={row.unit} className="transition hover:bg-royal/5">
                <td className="px-5 py-4 font-black">{row.unit}</td>
                <td className="px-5 py-4 text-muted">{row.type}</td>
                <td className="px-5 py-4">{row.access}</td>
                <td className="px-5 py-4"><Badge className="bg-panel-muted text-muted ring-line">{row.compliance}</Badge></td>
                <td className="px-5 py-4 text-muted">{row.scope}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ComplianceControlPanel() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {['Regional permission review', 'Franchise override approvals', 'Audit and compliance exports'].map((item) => (
        <Card key={item} className="p-5">
          <ShieldCheck className="size-5 text-royal" />
          <h3 className="mt-4 font-black">{item}</h3>
          <p className="mt-2 text-sm leading-6 text-muted">Governed controls with director approval, outlet scoping, and durable audit history.</p>
        </Card>
      ))}
    </div>
  );
}

function SettlementComparisonPanel() {
  return (
    <Card className="p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Settlement intelligence</p>
      <h2 className="mt-1 text-xl font-black">Aggregator comparison</h2>
      <div className="mt-5 space-y-3">
        {[
          ['Deliveroo', 'AED 284k', '+0.4%', 'Healthy'],
          ['Talabat', 'AED 318k', '+0.1%', 'Healthy'],
          ['Careem', 'AED 146k', '-1.8%', 'Variance'],
          ['Direct', 'AED 226k', '+2.4%', 'Best margin']
        ].map(([channel, payout, variance, status]) => (
          <div key={channel} className="grid gap-2 rounded-xl border border-line bg-panel-muted/45 p-4 text-sm sm:grid-cols-[1fr_.8fr_.6fr_.7fr]">
            <p className="font-black">{channel}</p>
            <p className="text-muted">{payout}</p>
            <p className={String(variance).startsWith('-') ? 'font-bold text-rose-300' : 'font-bold text-royal'}>{variance}</p>
            <Badge className="bg-panel text-muted ring-line">{status}</Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}

function CustomerSegmentationPanel() {
  return (
    <Card className="p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Segments</p>
      <h2 className="mt-1 text-xl font-black">Customer operations board</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {customerSegments.map((segment) => (
          <div key={segment.segment} className="rounded-xl border border-line bg-panel-muted/45 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black">{segment.segment}</p>
                <p className="mt-1 text-sm text-muted">{segment.customers} customers - {segment.signal}</p>
              </div>
              <Badge className="bg-royal/10 text-royal ring-royal/25">live</Badge>
            </div>
            <p className="mt-3 text-xs font-bold uppercase tracking-wide text-royal">{segment.action}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function CustomerCopilotPanel() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {[
        ['Churn explanation', 'Drop-off is concentrated in users affected by two late deliveries from Yas last week.'],
        ['Revenue opportunity', 'High-value Marina regulars respond best to direct-order dinner bundles.'],
        ['Staffing recommendation', 'Late-night loyalists justify one additional runner from 22:00 to 23:30.']
      ].map(([title, detail]) => (
        <IntelligenceCard key={title} title={title} detail={detail} meta="copilot" tone="good" />
      ))}
    </div>
  );
}

function DigitalTwinSimulationPanel() {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Simulation layer</p>
          <h2 className="mt-1 text-xl font-black">Live outlet operating model</h2>
        </div>
        <BrainCircuit className="size-5 text-royal" />
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {twinSimulations.map((model) => (
          <div key={model.scenario} className="rounded-xl border border-line bg-panel-muted/45 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black">{model.scenario}</p>
                <p className="mt-2 text-sm leading-6 text-muted">{model.output}</p>
              </div>
              <Badge className={model.pressure > 70 ? 'bg-rose-400/10 text-rose-200 ring-rose-400/25' : 'bg-royal/10 text-royal ring-royal/25'}>
                {model.pressure}% risk
              </Badge>
            </div>
            <div className="mt-4 h-2 rounded-full bg-panel">
              <div className="h-full rounded-full bg-gradient-to-r from-royal to-cyan" style={{ width: `${model.pressure}%` }} />
            </div>
            <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted">Forecast confidence {model.confidence}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function TwinOutletModelPanel() {
  return (
    <Card className="p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Outlet behavior</p>
      <h2 className="mt-1 text-xl font-black">Predictive pressure model</h2>
      <div className="mt-5 space-y-4">
        <SlaMeter label="Dubai Marina throughput" value={88} detail="11.4% upside if prep drops by 2m" tone="good" />
        <SlaMeter label="Abu Dhabi Yas courier exposure" value={69} detail="Shortage could impact SLA within 42m" tone="warning" />
        <SlaMeter label="Business Bay staffing elasticity" value={76} detail="1 runner protects peak prep queue" tone="warning" />
        <SlaMeter label="Sharjah inventory depletion" value={81} detail="Transfer before 18:30 prevents stockout" tone="warning" />
      </div>
    </Card>
  );
}

function TwinForecastOverlayPanel() {
  return (
    <Card className="p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Predictive overlays</p>
      <h2 className="mt-1 text-xl font-black">Fulfillment pressure timeline</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-5">
        {['17:00', '18:00', '19:00', '20:00', '21:00'].map((time, index) => {
          const pressure = [42, 55, 74, 68, 51][index];
          return (
            <div key={time} className="rounded-xl border border-line bg-panel-muted/45 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">{time} GST</p>
              <p className="mt-2 text-2xl font-black">{pressure}%</p>
              <p className="mt-1 text-xs text-muted">network pressure</p>
              <div className="mt-3 h-20 rounded-lg bg-panel">
                <div className="mt-auto h-full rounded-lg bg-gradient-to-t from-royal/70 to-cyan/20" style={{ clipPath: `inset(${100 - pressure}% 0 0 0)` }} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function EnterpriseNetworkMapPanel() {
  return (
    <Card className="p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Network topology</p>
      <h2 className="mt-1 text-xl font-black">GCC operations control tower</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {networkRegions.map((region) => (
          <div key={region.region} className="rounded-xl border border-line bg-panel-muted/45 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black">{region.region}</p>
                <p className="mt-1 text-sm text-muted">{region.outlets} outlets - {region.corridor}</p>
              </div>
              <Badge className={region.status === 'watch' ? 'bg-amber-400/10 text-amber-200 ring-amber-400/25' : 'bg-royal/10 text-royal ring-royal/25'}>
                {region.status}
              </Badge>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-line bg-panel p-3">
                <p className="text-xs font-bold uppercase text-muted">SLA</p>
                <p className="mt-1 text-lg font-black">{region.sla}%</p>
              </div>
              <div className="rounded-lg border border-line bg-panel p-3">
                <p className="text-xs font-bold uppercase text-muted">Density</p>
                <p className="mt-1 text-lg font-black">{region.density}%</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function RegionalPulsePanel() {
  return (
    <Card className="p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Regional pulse</p>
      <h2 className="mt-1 text-xl font-black">System health and density</h2>
      <div className="mt-5 space-y-3">
        {networkRegions.map((region) => (
          <SlaMeter
            key={region.region}
            label={region.region}
            value={region.sla}
            detail={`${region.density}% fulfillment density - ${region.outlets} outlets`}
            tone={region.status === 'watch' ? 'warning' : 'good'}
          />
        ))}
      </div>
    </Card>
  );
}

function LogisticsCorridorPanel() {
  return (
    <Card className="p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Logistics corridors</p>
      <h2 className="mt-1 text-xl font-black">Dependency indicators</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-4">
        {['Marina to JLT', 'Business Bay to DIFC', 'Yas to Reem', 'Majaz to Al Nahda'].map((corridor, index) => (
          <div key={corridor} className="rounded-xl border border-line bg-panel-muted/45 p-4">
            <Route className="size-5 text-royal" />
            <p className="mt-4 font-black">{corridor}</p>
            <p className="mt-1 text-sm text-muted">{[18, 22, 31, 24][index]}m modeled handoff window</p>
            <Badge className="mt-3 bg-panel text-muted ring-line">{index === 2 ? 'stress' : 'stable'}</Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ScenarioSimulationPanel() {
  return (
    <Card className="p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">What-if center</p>
      <h2 className="mt-1 text-xl font-black">Enterprise scenario simulations</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {scenarioModels.map((scenario) => (
          <div key={scenario.name} className="rounded-xl border border-line bg-panel-muted/45 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black">{scenario.name}</p>
                <p className="mt-1 text-sm text-muted">{scenario.input}</p>
              </div>
              <Badge className="bg-royal/10 text-royal ring-royal/25">{scenario.confidence}</Badge>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted">{scenario.result}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function StrategicBrainPanel() {
  return (
    <Card className="p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Strategic operations desk</p>
      <h2 className="mt-1 text-xl font-black">Tradeoff analysis and execution plan</h2>
      <div className="mt-4">
        <InsightBanner
          title="Recommended operating posture"
          detail="Prioritize Talabat traffic during the Dubai South dinner surge, protect direct-channel loyalists, and route floating runner capacity to Yas until courier density recovers."
          action="Execution plan"
        />
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {[
          ['Profitability vs SLA', 'Accept 1.2 pts lower aggregator margin to prevent 8% SLA degradation.'],
          ['Staffing optimization', 'Add one runner in Yas, shift one prep lead from Majaz after 19:30.'],
          ['Risk balancing', 'Throttle low-margin modifiers only if pressure exceeds 72%.']
        ].map(([title, detail]) => (
          <div key={title} className="rounded-xl border border-line bg-panel-muted/45 p-4">
            <p className="font-black">{title}</p>
            <p className="mt-2 text-sm leading-6 text-muted">{detail}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ExtensionMarketplacePanel() {
  return (
    <Card className="p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Enterprise extensions</p>
      <h2 className="mt-1 text-xl font-black">Marketplace, plugins, and API observability</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {ecosystemExtensions.map((extension) => (
          <div key={extension.name} className="rounded-xl border border-line bg-panel-muted/45 p-4">
            <Plug className="size-5 text-royal" />
            <p className="mt-4 font-black">{extension.name}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-muted">{extension.type}</p>
            <p className="mt-3 text-sm leading-6 text-muted">{extension.detail}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge className="bg-royal/10 text-royal ring-royal/25">{extension.lifecycle}</Badge>
              <Badge className="bg-panel text-muted ring-line">{extension.usage}</Badge>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function KnowledgeTimelinePanel() {
  return (
    <Card className="p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Operational learning</p>
      <h2 className="mt-1 text-xl font-black">Organizational intelligence timeline</h2>
      <div className="mt-5 space-y-3">
        {knowledgeTimeline.map((item) => (
          <div key={item.title} className="rounded-xl border border-line bg-panel-muted/45 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-royal">{item.period}</p>
            <p className="mt-2 font-black">{item.title}</p>
            <p className="mt-1 text-sm leading-6 text-muted">{item.signal}</p>
            <p className="mt-3 text-sm font-bold">{item.recommendation}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function RecurringPatternPanel() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {[
        ['Recurring SLA pattern', 'Yas courier backlog repeats when Talabat pickup density falls below 72%.'],
        ['Operational drift', 'Menu modifier pricing drift appears after promotion updates.'],
        ['Retrospective summary', 'Last week incidents resolved 18% faster when automation opened the first handoff.']
      ].map(([title, detail]) => (
        <IntelligenceCard key={title} title={title} detail={detail} meta="memory" tone="good" />
      ))}
    </div>
  );
}

function AutonomousGovernancePanel() {
  return (
    <Card className="p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Governance controls</p>
      <h2 className="mt-1 text-xl font-black">Policy automation and compliance controls</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-4">
        {[
          ['GCC VAT overlay', 'Invoice metadata coverage at 96.8%.'],
          ['Labor ops compliance', 'Runner scheduling within policy for all regions.'],
          ['Aggregator contracts', 'Careem variance above tolerance, monitor clause 4.2.'],
          ['Policy drift', 'Two regional overrides require director approval.']
        ].map(([title, detail]) => (
          <div key={title} className="rounded-xl border border-line bg-panel-muted/45 p-4">
            <ShieldCheck className="size-5 text-royal" />
            <p className="mt-4 font-black">{title}</p>
            <p className="mt-2 text-sm leading-6 text-muted">{detail}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function BoardroomNarrativePanel() {
  return (
    <Card className="p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Executive narrative</p>
      <h2 className="mt-1 text-xl font-black">Strategic briefing</h2>
      <div className="mt-4">
        <InsightBanner
          title="Weekly decision summary"
          detail="KitchenFlow is tracking above growth plan, but courier density is becoming the constraint on margin expansion. Invest in dinner-window routing automation before adding new cloud kitchen capacity."
          action="Boardroom ready"
        />
      </div>
      <div className="mt-5 space-y-3">
        {[
          'Dubai Marina remains the top-performing region with strongest direct-channel resilience.',
          'Abu Dhabi Yas is the primary operational risk because courier latency drives refunds and SLA drift.',
          'JLT expansion is recommended if staffing and inventory transfer automation are enabled before launch.'
        ].map((item) => (
          <div key={item} className="rounded-xl border border-line bg-panel-muted/45 p-4 text-sm font-semibold leading-6 text-muted">
            {item}
          </div>
        ))}
      </div>
    </Card>
  );
}

function MarketOpportunityPanel() {
  return (
    <Card className="p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Market opportunity</p>
      <h2 className="mt-1 text-xl font-black">Expansion and investment planning</h2>
      <div className="mt-5 space-y-3">
        <SlaMeter label="JLT expansion score" value={91} detail="Strong demand, courier density, and staffing availability" tone="good" />
        <SlaMeter label="Dubai South score" value={84} detail="Promising demand, inventory transfer setup required" tone="warning" />
        <SlaMeter label="Riyadh Tahlia signal watch" value={67} detail="Projected courier shortage may impact SLA within 42 minutes" tone="warning" />
      </div>
    </Card>
  );
}

function EnterpriseStateEnginePanel() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {enterpriseState.map((state) => (
        <MetricCard key={state.label} label={state.label} value={`${state.value}%`} detail={state.detail}>
          <Activity className="size-5 text-royal" />
        </MetricCard>
      ))}
    </div>
  );
}

function IntelligenceMeshPanel() {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Operational dependency map</p>
          <h2 className="mt-1 text-xl font-black">Interconnected system signals</h2>
        </div>
        <Workflow className="size-5 text-royal" />
      </div>
      <div className="mt-5 space-y-3">
        {meshSignals.map((signal) => (
          <div key={`${signal.system}-${signal.dependency}`} className="rounded-xl border border-line bg-panel-muted/45 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-black">{signal.system} influences {signal.dependency}</p>
                <p className="mt-1 text-sm leading-6 text-muted">{signal.signal}</p>
              </div>
              <Badge className={signal.tone === 'critical' ? 'bg-rose-400/10 text-rose-200 ring-rose-400/25' : signal.tone === 'warning' ? 'bg-amber-400/10 text-amber-200 ring-amber-400/25' : 'bg-royal/10 text-royal ring-royal/25'}>
                {signal.impact}% impact
              </Badge>
            </div>
            <div className="mt-4 h-2 rounded-full bg-panel">
              <div className="h-full rounded-full bg-gradient-to-r from-royal to-cyan" style={{ width: `${signal.impact}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function CrossSystemReasoningPanel() {
  return (
    <Card className="p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Cross-system reasoning</p>
      <h2 className="mt-1 text-xl font-black">Causality and chain reactions</h2>
      <div className="mt-4">
        <InsightBanner
          title="Emerging risk correlation"
          detail="Prep-time drift is now affecting SLA forecast, refund exposure, and payout confidence. Stabilizing runner coverage improves all three downstream systems."
          action="Causal model"
        />
      </div>
      <div className="mt-5 space-y-3">
        {[
          ['Dinner corridor congestion', 'Projected traffic may increase courier latency and cancellation exposure in Riyadh Tahlia within 42 minutes.'],
          ['Inventory revenue confidence', 'Depletion in high-margin bowl base reduces projected revenue confidence before customer demand weakens.'],
          ['Automation recovery', 'Similar Ramadan cycle mitigation reduced backlog duration by 23% when applied before peak.']
        ].map(([title, detail]) => (
          <div key={title} className="rounded-xl border border-line bg-panel-muted/45 p-4">
            <p className="font-black">{title}</p>
            <p className="mt-2 text-sm leading-6 text-muted">{detail}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function AutonomousCoordinationPanel() {
  return (
    <Card className="p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Operations coordination</p>
      <h2 className="mt-1 text-xl font-black">Coordinated recovery plans</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {coordinationPlans.map((plan) => (
          <div key={plan.title} className="rounded-xl border border-line bg-panel-muted/45 p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="font-black">{plan.title}</p>
              <Badge className={plan.state === 'active' ? 'bg-royal/10 text-royal ring-royal/25' : 'bg-panel text-muted ring-line'}>{plan.state}</Badge>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted">{plan.plan}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function MissionControlWallboard() {
  return (
    <Card className="overflow-hidden p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Mission control mode</p>
          <h2 className="mt-1 text-2xl font-black">Enterprise pulse wallboard</h2>
        </div>
        <OperationalStatusChip label="live map" tone="good" pulse />
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
        <div className="min-h-[360px] rounded-xl border border-line bg-panel-muted/45 p-4">
          <div className="grid h-full gap-3 md:grid-cols-2">
            {networkRegions.map((region, index) => (
              <div key={region.region} className="relative overflow-hidden rounded-xl border border-line bg-panel p-4">
                <span className={`absolute right-4 top-4 size-3 rounded-full ${region.status === 'watch' ? 'bg-amber-300' : 'bg-royal'} shadow-soft`} />
                <p className="font-black">{region.region}</p>
                <p className="mt-1 text-sm text-muted">{region.corridor}</p>
                <p className="mt-6 text-3xl font-black">{region.sla}%</p>
                <p className="text-xs font-bold uppercase tracking-wide text-muted">SLA cluster {index + 1}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          {enterpriseState.map((state) => (
            <SlaMeter key={state.label} label={state.label} value={state.value} detail={state.detail} tone={state.value < 75 ? 'warning' : 'good'} />
          ))}
        </div>
      </div>
    </Card>
  );
}

function EnterpriseEventTimelinePanel() {
  return (
    <Card className="p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Enterprise event timeline</p>
      <h2 className="mt-1 text-xl font-black">Live dependency activity</h2>
      <div className="mt-5 space-y-3">
        {missionEvents.map((event) => (
          <div key={`${event.time}-${event.event}`} className="rounded-xl border border-line bg-panel-muted/45 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black text-royal">{event.time}</p>
                <p className="mt-1 text-sm leading-6 text-muted">{event.event}</p>
              </div>
              <Badge className={event.severity === 'risk' ? 'bg-rose-400/10 text-rose-200 ring-rose-400/25' : event.severity === 'active' ? 'bg-royal/10 text-royal ring-royal/25' : 'bg-panel text-muted ring-line'}>
                {event.severity}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function PredictiveWorkforcePanel() {
  return (
    <Card className="p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Predictive human operations</p>
      <h2 className="mt-1 text-xl font-black">Fatigue, resilience, and workload balancing</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {workforceSignals.map((team) => (
          <div key={team.team} className="rounded-xl border border-line bg-panel-muted/45 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black">{team.team}</p>
                <p className="mt-2 text-sm leading-6 text-muted">{team.recommendation}</p>
              </div>
              <Badge className={team.fatigue > 70 ? 'bg-amber-400/10 text-amber-200 ring-amber-400/25' : 'bg-royal/10 text-royal ring-royal/25'}>
                {team.fatigue}% fatigue
              </Badge>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <SlaMeter label="Fatigue" value={team.fatigue} detail="predicted pressure" tone={team.fatigue > 70 ? 'warning' : 'good'} />
              <SlaMeter label="Resilience" value={team.resilience} detail="shift stability" tone={team.resilience < 75 ? 'warning' : 'good'} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function EcosystemCoordinationPanel() {
  return (
    <Card className="p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Ecosystem coordination</p>
      <h2 className="mt-1 text-xl font-black">Partner dependency and resilience scoring</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {ecosystemCoordination.map((partner) => (
          <div key={partner.partner} className="rounded-xl border border-line bg-panel-muted/45 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black">{partner.partner}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-muted">{partner.role}</p>
              </div>
              <Badge className={partner.score < 80 ? 'bg-amber-400/10 text-amber-200 ring-amber-400/25' : 'bg-royal/10 text-royal ring-royal/25'}>
                {partner.score}
              </Badge>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted">{partner.dependency}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function EnterpriseResilienceBriefPanel() {
  return (
    <Card className="p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Enterprise resilience summary</p>
      <h2 className="mt-1 text-xl font-black">Strategic intelligence outlook</h2>
      <div className="mt-4">
        <InsightBanner
          title="Executive confidence report"
          detail="Enterprise confidence remains strong at 84%, but resilience depends on proactive courier balancing, fatigue-aware staffing, and inventory-to-revenue protection before dinner peak."
          action="Strategy timeline"
        />
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {['Protect Yas corridor resilience', 'Fund staffing automation', 'Expand direct-channel recovery loops'].map((item) => (
          <div key={item} className="rounded-xl border border-line bg-panel-muted/45 p-4 text-sm font-bold">
            {item}
          </div>
        ))}
      </div>
    </Card>
  );
}

function GlobalOperationsFabricPanel() {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Global operations workflows</p>
          <h2 className="mt-1 text-xl font-black">Live dependency propagation</h2>
        </div>
        <Workflow className="size-5 text-royal" />
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {fabricPropagations.map((flow) => (
          <div key={`${flow.source}-${flow.target}`} className="rounded-xl border border-line bg-panel-muted/45 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-black">{flow.source} to {flow.target}</p>
                <p className="mt-2 text-sm leading-6 text-muted">{flow.effect}</p>
              </div>
              <Badge className="bg-royal/10 text-royal ring-royal/25">{flow.confidence}%</Badge>
            </div>
            <div className="mt-4 h-2 rounded-full bg-panel">
              <div className="h-full rounded-full bg-gradient-to-r from-royal to-cyan" style={{ width: `${flow.confidence}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function AdaptiveLearningPanel() {
  return (
    <Card className="p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Adaptive intelligence</p>
      <h2 className="mt-1 text-xl font-black">Mitigation effectiveness learning</h2>
      <div className="mt-5 space-y-3">
        {adaptiveLearning.map((item) => (
          <div key={item.strategy} className="rounded-xl border border-line bg-panel-muted/45 p-4">
            <p className="font-black">{item.strategy}</p>
            <p className="mt-1 text-sm text-muted">{item.learning}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-line bg-panel p-3">
                <p className="text-xs font-bold uppercase text-muted">Before</p>
                <p className="mt-1 font-black">{item.before}</p>
              </div>
              <div className="rounded-lg border border-line bg-panel p-3">
                <p className="text-xs font-bold uppercase text-muted">After</p>
                <p className="mt-1 font-black text-royal">{item.after}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function EnterpriseAwarenessPulsePanel() {
  return (
    <Card className="p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Enterprise pulse layer</p>
      <h2 className="mt-1 text-xl font-black">Adaptive enterprise awareness</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {enterpriseAwareness.map((metric) => (
          <div key={metric.label} className="rounded-xl border border-line bg-panel-muted/45 p-4">
            <div className="flex items-center justify-between">
              <p className="font-black">{metric.label}</p>
              <span className="text-xl font-black text-royal">{metric.value}%</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted">{metric.detail}</p>
            <div className="mt-4 h-2 rounded-full bg-panel">
              <div className="h-full rounded-full bg-gradient-to-r from-royal to-cyan" style={{ width: `${metric.value}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function StrategicNarrativeEnginePanel() {
  return (
    <Card className="p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Strategic narrative desk</p>
      <h2 className="mt-1 text-xl font-black">Risk evolution and regional outlook</h2>
      <div className="mt-4">
        <InsightBanner
          title="Enterprise confidence summary"
          detail="The operating network is resilient, but strategic pressure is shifting from demand generation to network reliability. Courier volatility and human fatigue are now the key constraints on expansion confidence."
          action="Narrative generated"
        />
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {[
          ['Risk evolution', 'Yas moved from isolated SLA risk to ecosystem stress due to repeated courier variance.'],
          ['Regional outlook', 'Dubai Core remains expansion-ready while Riyadh Tahlia requires dinner-window mitigation.'],
          ['Strategic trend', 'Direct-channel recovery is becoming the strongest resilience lever.']
        ].map(([title, detail]) => (
          <div key={title} className="rounded-xl border border-line bg-panel-muted/45 p-4">
            <p className="font-black">{title}</p>
            <p className="mt-2 text-sm leading-6 text-muted">{detail}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function GlobalSynchronizationPanel() {
  return (
    <Card className="p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Global mission coordination</p>
      <h2 className="mt-1 text-xl font-black">Regional synchronization matrix</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-4">
        {['Dubai Core', 'Abu Dhabi', 'Sharjah North', 'Riyadh Watch'].map((region, index) => {
          const score = [92, 78, 86, 69][index];
          return (
            <div key={region} className="rounded-xl border border-line bg-panel-muted/45 p-4">
              <p className="font-black">{region}</p>
              <p className="mt-2 text-sm text-muted">{score}% synchronized across staffing, delivery, inventory, and finance.</p>
              <Badge className={score < 75 ? 'mt-4 bg-amber-400/10 text-amber-200 ring-amber-400/25' : 'mt-4 bg-royal/10 text-royal ring-royal/25'}>
                {score < 75 ? 'stabilize' : 'coordinated'}
              </Badge>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function PredictiveEcosystemIntelligencePanel() {
  return (
    <Card className="p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Predictive ecosystem intelligence</p>
      <h2 className="mt-1 text-xl font-black">External dependency forecast</h2>
      <div className="mt-5 space-y-3">
        {[
          ['Careem volatility', 72, 'API and courier delay risk forecast to remain elevated through dinner peak.'],
          ['Talabat reliability', 91, 'Recommended priority lane for Dubai South and Marina surge.'],
          ['Vendor health', 84, 'POS sync stable, payment gateway latency within operating tolerance.'],
          ['Courier ecosystem confidence', 79, 'Capacity adequate if Yas stabilization plan is accepted.']
        ].map(([title, score, detail]) => (
          <div key={String(title)} className="rounded-xl border border-line bg-panel-muted/45 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black">{title}</p>
                <p className="mt-1 text-sm leading-6 text-muted">{detail}</p>
              </div>
              <Badge className={Number(score) < 80 ? 'bg-amber-400/10 text-amber-200 ring-amber-400/25' : 'bg-royal/10 text-royal ring-royal/25'}>
                {score}%
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function TemporalIntelligencePanel() {
  return (
    <Card className="p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Enterprise temporal intelligence</p>
      <h2 className="mt-1 text-xl font-black">Seasonal drift and historical progression</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {temporalIntelligence.map((item) => (
          <div key={item.horizon} className="rounded-xl border border-line bg-panel-muted/45 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-royal">{item.horizon}</p>
            <p className="mt-2 font-black">{item.trend}</p>
            <p className="mt-2 text-sm leading-6 text-muted">{item.action}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function HumanAiCollaborationPanel() {
  return (
    <Card className="p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Operator collaboration</p>
      <h2 className="mt-1 text-xl font-black">Trust, overrides, and approval loops</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {collaborationLoops.map((loop) => (
          <div key={loop.workflow} className="rounded-xl border border-line bg-panel-muted/45 p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="font-black">{loop.workflow}</p>
              <Badge className="bg-royal/10 text-royal ring-royal/25">{loop.trust}% trust</Badge>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted">{loop.operator}</p>
            <p className="mt-3 text-xs font-bold uppercase tracking-wide text-royal">{loop.outcome}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function WorldviewModelPanel() {
  return (
    <Card className="p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Executive worldview</p>
      <h2 className="mt-1 text-xl font-black">Market maturity and operational positioning</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {worldviewSignals.map((signal) => (
          <div key={signal.market} className="rounded-xl border border-line bg-panel-muted/45 p-4">
            <p className="font-black">{signal.market}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-muted">{signal.maturity}</p>
            <p className="mt-3 text-2xl font-black text-royal">{signal.competitiveness}</p>
            <p className="mt-2 text-sm leading-6 text-muted">{signal.outlook}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function StrategicOptimizationPanel() {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Strategic optimization engine</p>
          <h2 className="mt-1 text-xl font-black">Enterprise tradeoff recommendations</h2>
        </div>
        <BrainCircuit className="size-5 text-royal" />
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {optimizationSignals.map((signal) => (
          <div key={signal.lever} className="rounded-xl border border-line bg-panel-muted/45 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black">{signal.lever}</p>
                <p className="mt-2 text-sm leading-6 text-muted">{signal.outcome}</p>
              </div>
              <Badge className="bg-royal/10 text-royal ring-royal/25">{signal.roi} ROI</Badge>
            </div>
            <div className="mt-4 h-2 rounded-full bg-panel">
              <div className="h-full rounded-full bg-gradient-to-r from-royal to-cyan" style={{ width: `${signal.confidence}%` }} />
            </div>
            <p className="mt-2 text-xs font-bold uppercase tracking-wide text-muted">{signal.confidence}% confidence</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function EnterpriseEconomicPanel() {
  return (
    <Card className="p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Enterprise economic intelligence</p>
      <h2 className="mt-1 text-xl font-black">Margin, ROI, and cost pressure propagation</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {economicSignals.map((signal) => (
          <div key={signal.metric} className="rounded-xl border border-line bg-panel-muted/45 p-4">
            <WalletCards className="size-5 text-royal" />
            <p className="mt-4 text-sm font-bold text-muted">{signal.metric}</p>
            <p className="mt-2 text-2xl font-black">{signal.value}</p>
            <p className="mt-2 text-sm leading-6 text-muted">{signal.detail}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function AutonomousPlanningPanel() {
  return (
    <Card className="p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Enterprise planning</p>
      <h2 className="mt-1 text-xl font-black">Adaptive execution roadmap</h2>
      <div className="mt-5 space-y-3">
        {planningRoadmap.map((item) => (
          <div key={item.phase} className="rounded-xl border border-line bg-panel-muted/45 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-royal">{item.phase}</p>
                <p className="mt-2 font-black">{item.plan}</p>
                <p className="mt-1 text-sm text-muted">Lead: {item.owner}</p>
              </div>
              <Badge className="bg-royal/10 text-royal ring-royal/25">{item.confidence}%</Badge>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function WorkflowEvolutionPanel() {
  return (
    <Card className="p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Self-optimizing workflows</p>
      <h2 className="mt-1 text-xl font-black">Mitigation evolution history</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {workflowEvolution.map((workflow) => (
          <div key={workflow.workflow} className="rounded-xl border border-line bg-panel-muted/45 p-4">
            <p className="font-black">{workflow.workflow}</p>
            <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted">Previous</p>
            <p className="mt-1 text-sm leading-6 text-muted">{workflow.previous}</p>
            <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted">Current</p>
            <p className="mt-1 text-sm leading-6 text-muted">{workflow.current}</p>
            <Badge className="mt-4 bg-royal/10 text-royal ring-royal/25">{workflow.delta}</Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}

function StrategicAiGovernancePanel() {
  return (
    <Card className="p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Strategic governance</p>
      <h2 className="mt-1 text-xl font-black">Decision auditability and override chains</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {aiGovernanceSignals.map((signal) => (
          <div key={signal.decision} className="rounded-xl border border-line bg-panel-muted/45 p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="font-black">{signal.decision}</p>
              <Badge className="bg-royal/10 text-royal ring-royal/25">{signal.trust}% trust</Badge>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted">{signal.accountability}</p>
            <p className="mt-3 text-xs font-bold uppercase tracking-wide text-royal">{signal.audit}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function MultiRegionBalancingPanel() {
  return (
    <Card className="p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Multi-region strategic coordination</p>
      <h2 className="mt-1 text-xl font-black">Network-wide optimization map</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-4">
        {[
          ['Dubai Core', 'Protect direct-channel margin and keep SLA above 94%.', 92],
          ['Abu Dhabi', 'Stabilize courier lane before expansion spend.', 78],
          ['Sharjah North', 'Reduce delivery radius to improve enterprise stability.', 86],
          ['Riyadh Tahlia', 'Expand workforce before Q4 demand surge.', 73]
        ].map(([region, plan, score]) => (
          <div key={String(region)} className="rounded-xl border border-line bg-panel-muted/45 p-4">
            <p className="font-black">{region}</p>
            <p className="mt-2 text-sm leading-6 text-muted">{plan}</p>
            <Badge className={Number(score) < 80 ? 'mt-4 bg-amber-400/10 text-amber-200 ring-amber-400/25' : 'mt-4 bg-royal/10 text-royal ring-royal/25'}>
              {score}% balanced
            </Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ExecutiveOptimizationPanel() {
  return (
    <Card className="p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Executive controls</p>
      <h2 className="mt-1 text-xl font-black">Growth scenarios and investment priority</h2>
      <div className="mt-4">
        <InsightBanner
          title="Executive optimization summary"
          detail="Prioritize courier reliability and workforce expansion before opening new regions. The optimization engine ranks JLT launch readiness above Abu Dhabi acceleration unless Yas courier volatility improves."
          action="Board-level recommendation"
        />
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {[
          ['Invest first', 'Courier density and direct-channel resilience'],
          ['Expand next', 'JLT after transfer automation is enabled'],
          ['Delay', 'Aggressive Abu Dhabi expansion until SLA volatility improves']
        ].map(([title, detail]) => (
          <div key={title} className="rounded-xl border border-line bg-panel-muted/45 p-4">
            <p className="font-black">{title}</p>
            <p className="mt-2 text-sm leading-6 text-muted">{detail}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function EnterpriseEvolutionPanel() {
  return (
    <Card className="p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Enterprise evolution layer</p>
      <h2 className="mt-1 text-xl font-black">Operational maturity progression</h2>
      <div className="mt-5 space-y-3">
        {evolutionMilestones.map((item) => (
          <div key={item.period} className="rounded-xl border border-line bg-panel-muted/45 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-royal">{item.period}</p>
            <p className="mt-2 text-sm leading-6 text-muted">{item.lesson}</p>
            <p className="mt-3 font-black">{item.improvement}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function PageHeader({
  eyebrow,
  title,
  action,
  onAction,
  disabledReason
}: {
  eyebrow: string;
  title: string;
  action?: string;
  onAction?: () => void;
  disabledReason?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-line bg-panel/80 p-4 shadow-soft md:p-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-royal">{eyebrow}</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight md:text-3xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm font-medium text-muted">GCC delivery operations with aggregator sync, SLA controls, payout visibility, and outlet-level accountability.</p>
      </div>
      {action ? (
        <Button onClick={onAction} disabled={Boolean(disabledReason) || !onAction} title={disabledReason}>
          {action}
        </Button>
      ) : null}
      </div>
    </div>
  );
}

function OperationalInsightStrip() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {predictiveSignals.map((signal) => (
        <IntelligenceCard key={signal.title} title={signal.title} detail={signal.detail} meta={signal.meta} tone={signal.tone} />
      ))}
    </div>
  );
}

function AiOpsAssistantPanel() {
  return (
    <Card className="overflow-hidden p-5">
      <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
        <div>
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-royal text-slate-950 shadow-soft">
              <BrainCircuit className="size-5" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Operations advisor</p>
              <h2 className="mt-1 text-xl font-black">Executive operations summary</h2>
            </div>
          </div>
          <p className="mt-5 text-sm leading-7 text-muted">
            KitchenFlow is detecting dinner-window pressure across Dubai Marina and Abu Dhabi Yas. Prioritize dispatch coverage,
            pre-stage high-velocity SKUs, and monitor Careem cancellation drift before 19:00 GST.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <OperationalStatusChip label="Forecast" tone="good" pulse />
            <OperationalStatusChip label="3 recommendations" tone="warning" />
            <OperationalStatusChip label="Finance-safe" tone="neutral" />
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <SlaMeter label="Dispatch confidence" value={91} detail="vs 88% target" tone="good" />
          <SlaMeter label="Rider wait impact" value={73} detail="Marina watchlist" tone="warning" />
          <SlaMeter label="Stock coverage" value={82} detail="2 SKUs at risk" tone="warning" />
        </div>
      </div>
    </Card>
  );
}

function AttentionNeededPanel() {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Attention needed</p>
          <h2 className="mt-1 text-xl font-black">Operational incidents</h2>
        </div>
        <Badge className="bg-amber-400/10 text-amber-200 ring-amber-400/25">3 active</Badge>
      </div>
      <div className="mt-5 space-y-3">
        {[
          ['Dispatch SLA', 'Yas outlet has 4 orders inside the final 5-minute SLA window.', 'Escalate runner'],
          ['Stock exposure', 'Chicken tikka base will fall below par before dinner peak.', 'Create transfer'],
          ['Aggregator drift', 'Careem payout estimate is 1.8% below expected settlement.', 'Review finance']
        ].map(([title, detail, action]) => (
          <div key={title} className="rounded-xl border border-line bg-panel-muted/45 p-4 transition hover:border-amber-400/35">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black">{title}</p>
                <p className="mt-1 text-sm leading-6 text-muted">{detail}</p>
              </div>
              <span className="live-pulse mt-2 size-2 shrink-0 rounded-full bg-amber-300 text-amber-300" />
            </div>
            <p className="mt-3 text-xs font-bold uppercase tracking-wide text-royal">{action}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function SystemActivityPanel() {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Operational inbox</p>
          <h2 className="mt-1 text-xl font-black">System activity</h2>
        </div>
        <OperationalStatusChip label="live" tone="good" pulse />
      </div>
      <div className="mt-5">
        <ActivityStream items={activityFeed} />
      </div>
    </Card>
  );
}

function RegionalPerformancePanel() {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Regional command</p>
          <h2 className="mt-1 text-xl font-black">GCC outlet performance</h2>
        </div>
        <Badge className="bg-royal/10 text-royal ring-royal/25">multi-outlet</Badge>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {regionalPerformance.map((region) => (
          <div key={region.region} className="rounded-xl border border-line bg-panel-muted/45 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-black">{region.region}</p>
                <p className="mt-1 text-xs font-semibold text-muted">{region.orders} orders - avg dispatch {region.latency}</p>
              </div>
              <Badge className={region.tone === 'risk' ? 'bg-rose-400/10 text-rose-200 ring-rose-400/25' : region.tone === 'watch' ? 'bg-amber-400/10 text-amber-200 ring-amber-400/25' : 'bg-royal/10 text-royal ring-royal/25'}>
                {region.sla}% SLA
              </Badge>
            </div>
            <div className="mt-4 h-2 rounded-full bg-panel">
              <div className="h-full rounded-full bg-gradient-to-r from-royal to-cyan" style={{ width: `${region.sla}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function RevenuePanel() {
  const summary = useAnalyticsSummary();
  return (
    <Card className="overflow-hidden p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Revenue desk</p>
          <h2 className="mt-1 text-xl font-black">Revenue and order trend</h2>
          <p className="text-sm text-muted">Live GMV across aggregators and direct channels</p>
        </div>
        <Badge className="bg-royal/10 text-royal ring-royal/25">realtime</Badge>
      </div>
      <div className="mt-5 h-80">
        <AsyncChartState loading={summary.isLoading} error={summary.isError} empty={!summary.data?.revenueSeries.length}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={summary.data?.revenueSeries ?? []}>
              <defs>
                <linearGradient id="revenueGlow" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#27e8a6" stopOpacity={0.32} />
                  <stop offset="100%" stopColor="#27e8a6" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="ordersGlow" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#5ff1d9" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="#5ff1d9" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} vertical={false} />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: chartTick, fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: chartTick, fontSize: 12 }} />
              <Tooltip contentStyle={chartTooltip} />
              <Area dataKey="revenue" stroke="#27e8a6" fill="url(#revenueGlow)" strokeWidth={3} />
              <Area dataKey="orders" stroke="#5ff1d9" fill="url(#ordersGlow)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </AsyncChartState>
      </div>
    </Card>
  );
}

function LiveOrderFeed({ orders, loading, error }: { orders: Order[]; loading: boolean; error: boolean }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Live queue</p>
          <h2 className="mt-1 text-xl font-black">Order feed</h2>
        </div>
        <span className="grid size-10 place-items-center rounded-xl bg-royal/10 text-royal ring-1 ring-royal/20">
          <Clock className="size-5" />
        </span>
      </div>
      <div className="mt-5 space-y-3">
        <AsyncState loading={loading} error={error} empty={!orders.length}>
          {orders.map((order) => (
            <motion.div layout key={order.id} className="rounded-xl border border-line bg-panel-muted/45 p-4 transition hover:border-royal/40 hover:bg-panel-muted">
              <div className="flex items-center justify-between">
                <p className="font-bold">{order.publicId}</p>
                <Badge className={statusTone[order.status]}>{statusCopy[order.status]}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted">
                {order.customerName} - {order.outletName}
              </p>
              <p className="mt-2 text-sm font-black text-royal">{formatMoney(order.total.amount, order.total.currency)}</p>
            </motion.div>
          ))}
        </AsyncState>
      </div>
    </Card>
  );
}

function IntegrationsPanel({ items, loading, error }: { items: Array<{ id: string; label: string; status: string }>; loading: boolean; error: boolean }) {
  return (
    <Card className="p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Aggregator health</p>
      <h2 className="mt-1 text-xl font-black">Sync states</h2>
      <div className="mt-4 space-y-3">
        <AsyncState loading={loading} error={error} empty={!items.length}>
          {items.slice(0, 4).map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-xl border border-line bg-panel-muted/45 p-3">
              <span className="font-semibold">{item.label}</span>
              <Badge className={item.status === 'connected' ? 'bg-royal/10 text-royal ring-royal/25' : 'bg-amber-400/10 text-amber-200 ring-amber-400/25'}>{item.status}</Badge>
            </div>
          ))}
        </AsyncState>
      </div>
    </Card>
  );
}

function InventoryRiskPanel() {
  const summary = useAnalyticsSummary();
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Stock intelligence</p>
          <h2 className="mt-1 text-xl font-black">Inventory risk</h2>
        </div>
        <PackageCheck className="size-5 text-royal" />
      </div>
      <div className="mt-5 space-y-4">
        <AsyncState loading={summary.isLoading} error={summary.isError} empty={!summary.data?.inventoryWarnings.length}>
          {summary.data?.inventoryWarnings.slice(0, 4).map((item) => (
            <div key={item.id}>
              <div className="flex justify-between text-sm font-semibold">
                <span>{item.name}</span>
                <span>{item.stockPercent}%</span>
              </div>
              <p className="mt-1 text-xs text-muted">{item.outletName}</p>
              <div className="mt-2 h-2 rounded-full bg-panel-muted">
                <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-royal" style={{ width: `${item.stockPercent}%` }} />
              </div>
            </div>
          ))}
        </AsyncState>
      </div>
    </Card>
  );
}

function KitchenPerformancePanel() {
  const summary = useAnalyticsSummary();
  const activeLoad = summary.data
    ? summary.data.operational.activeKitchenLoad
    : 0;
  const throughput = summary.data?.totals.ordersToday ?? 0;
  const cancellationRate = summary.data?.totals.cancellationRate ?? 0;
  const queueLatency = summary.data?.operational.averageQueueLatencyMinutes ?? 0;
  const slaBreaches = summary.data?.operational.slaBreaches ?? 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Active fulfillment load" value={String(activeLoad)} detail="Orders in live workflow">
        <Activity className="size-5 text-royal" />
      </MetricCard>
      <MetricCard label="Queue latency" value={`${queueLatency}m`} detail={`${slaBreaches} SLA breaches today`}>
        <Clock className="size-5 text-royal" />
      </MetricCard>
      <MetricCard label="Throughput" value={String(throughput)} detail="Orders completed today">
        <PackageCheck className="size-5 text-royal" />
      </MetricCard>
      <MetricCard label="Cancellation" value={`${cancellationRate}%`} detail="Current day rate">
        <AlertCircle className="size-5 text-royal" />
      </MetricCard>
    </div>
  );
}

function DeliveryPerformancePanel() {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Delivery performance</p>
          <h2 className="mt-1 text-xl font-black">Throughput and cancellations</h2>
        </div>
        <Badge className="bg-royal/10 text-royal ring-royal/25">last 24h</Badge>
      </div>
      <div className="mt-5 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={peakHourData}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} vertical={false} />
            <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: chartTick, fontSize: 12 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: chartTick, fontSize: 12 }} />
            <Tooltip contentStyle={chartTooltip} labelFormatter={(label) => `${label}:00 GST`} />
            <Bar dataKey="orders" name="Orders" fill="#27e8a6" radius={[8, 8, 0, 0]} />
            <Bar dataKey="cancellations" name="Cancellations" fill="#fb7185" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function PeakHourPanel() {
  return (
    <Card className="p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Peak-hour intelligence</p>
      <h2 className="mt-1 text-xl font-black">Operational recommendations</h2>
      <div className="mt-4">
        <InsightBanner
          title="Forecast summary"
          detail="Demand is likely to peak between 19:30 and 21:15 GST. Dispatch coverage is the main controllable risk."
          action="Prepare dinner-window playbook"
        />
      </div>
      <div className="mt-5 space-y-3">
        {[
          ['Prep capacity', 'Add one runner between 19:30 and 21:00 for Dubai Marina.', '+6% SLA upside'],
          ['Menu throttling', 'Pause low-margin modifiers on Careem during dinner surge.', 'Margin protect'],
          ['Stock routing', 'Move 18kg chicken base from Business Bay to Yas before 17:00.', 'Avoid stockout']
        ].map(([title, detail, tag]) => (
          <div key={title} className="rounded-xl border border-line bg-panel-muted/45 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black">{title}</p>
                <p className="mt-1 text-sm leading-6 text-muted">{detail}</p>
              </div>
              <Badge className="shrink-0 bg-panel text-muted ring-line">{tag}</Badge>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function FulfillmentBottleneckPanel() {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Failure funnel</p>
          <h2 className="mt-1 text-xl font-black">Order fulfillment bottlenecks</h2>
        </div>
        <Route className="size-5 text-royal" />
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-5">
        {bottleneckFunnel.map((stage) => (
          <div key={stage.stage} className="rounded-xl border border-line bg-panel-muted/45 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">{stage.stage}</p>
            <p className="mt-2 text-2xl font-black">{stage.value}%</p>
            <p className="mt-1 text-xs font-semibold text-muted">{stage.detail}</p>
            <div className="mt-3 h-2 rounded-full bg-panel">
              <div className="h-full rounded-full bg-gradient-to-r from-royal to-cyan" style={{ width: `${stage.value}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function PredictiveBenchmarkPanel() {
  return (
    <Card className="p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Benchmark overlays</p>
      <h2 className="mt-1 text-xl font-black">Targets and forecast</h2>
      <div className="mt-5 space-y-3">
        <SlaMeter label="Fulfillment efficiency" value={87} detail="target 90% - forecast 92%" tone="warning" />
        <SlaMeter label="Courier handoff" value={79} detail="target 84% - rider wait rising" tone="warning" />
        <SlaMeter label="Cancellation control" value={94} detail="target 92% - healthy" tone="good" />
      </div>
    </Card>
  );
}

function OutletPanel() {
  const summary = useAnalyticsSummary();
  return (
    <Card className="p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Outlet health</p>
      <h2 className="mt-1 text-xl font-black">Outlet comparison</h2>
      <div className="mt-5 h-64">
        <AsyncChartState loading={summary.isLoading} error={summary.isError} empty={!summary.data?.outletPerformance.length}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={summary.data?.outletPerformance ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} vertical={false} />
              <XAxis dataKey="outlet" axisLine={false} tickLine={false} tick={{ fill: chartTick, fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: chartTick, fontSize: 12 }} />
              <Tooltip contentStyle={chartTooltip} />
              <Bar dataKey="revenue" fill="#27e8a6" radius={[8, 8, 0, 0]} />
              <Bar dataKey="orders" fill="#5ff1d9" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </AsyncChartState>
      </div>
    </Card>
  );
}

function ChannelPanel() {
  const summary = useAnalyticsSummary();
  return (
    <Card className="p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Delivery mix</p>
      <h2 className="mt-1 text-xl font-black">Channel breakdown</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <AsyncState loading={summary.isLoading} error={summary.isError} empty={!summary.data?.channelBreakdown.length}>
          {summary.data?.channelBreakdown.map((channel) => (
            <div key={channel.channel} className="rounded-xl border border-line bg-panel-muted/45 p-4 transition hover:border-royal/40">
              <p className="text-sm font-bold capitalize">{channel.channel.replace('_', ' ')}</p>
              <p className="mt-2 text-2xl font-black">{formatMoney(channel.revenue)}</p>
              <p className="text-sm text-muted">{channel.orders} orders</p>
            </div>
          ))}
        </AsyncState>
      </div>
    </Card>
  );
}

function OperationalAnalyticsPanel() {
  const summary = useAnalyticsSummary();
  const data = summary.data;
  return (
    <Card className="p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">SLA intelligence</p>
      <h2 className="mt-1 text-xl font-black">Operational analytics</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <MetricCard label="SLA breach rate" value={`${data?.slaMetrics.breachRate ?? 0}%`} detail={`${data?.slaMetrics.breachesToday ?? 0} breaches today`}>
          <Timer className="size-5 text-royal" />
        </MetricCard>
        <MetricCard label="Queue latency" value={`${data?.slaMetrics.averageLatencyMinutes ?? 0}m`} detail="Average active order age">
          <Clock className="size-5 text-royal" />
        </MetricCard>
        <MetricCard label="Consumption SKUs" value={String(data?.inventoryConsumptionTrends.length ?? 0)} detail="Inventory drawdown tracked">
          <PackageCheck className="size-5 text-royal" />
        </MetricCard>
      </div>
      <div className="mt-5 space-y-3">
        <AsyncState loading={summary.isLoading} error={summary.isError} empty={!data?.channelProfitability.length}>
          {data?.channelProfitability.map((row) => (
            <div key={row.channel} className="flex items-center justify-between rounded-lg border border-line bg-panel-muted/40 p-3 text-sm">
              <span className="font-bold capitalize">{String(row.channel).replace('_', ' ')}</span>
              <span className="text-muted">{formatMoney(row.expectedPayout)} expected payout</span>
              <Badge className="bg-panel-muted text-muted ring-line">{row.marginPercent}% fees</Badge>
            </div>
          ))}
        </AsyncState>
      </div>
    </Card>
  );
}

function PayoutReconciliationPanel() {
  const queryClient = useQueryClient();
  const payouts = usePayoutReconciliation();
  const reconcile = useMutation({
    mutationFn: dashboardApi.reconcilePayouts,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['payout-reconciliation'] });
      void queryClient.invalidateQueries({ queryKey: ['analytics-summary'] });
    }
  });

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal">Settlement desk</p>
          <h2 className="mt-1 text-lg font-black">Payout reconciliation</h2>
          <p className="mt-1 text-sm text-muted">Expected payout, variance, commission, and Business Central posting queue.</p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => reconcile.mutate()} disabled={reconcile.isPending}>
          {reconcile.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Reconcile
        </Button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <MetricCard label="Expected" value={formatMoney(payouts.data?.totals.expected ?? 0)} detail={`${payouts.data?.totals.pending ?? 0} pending`}>
          <Activity className="size-5 text-royal" />
        </MetricCard>
        <MetricCard label="Actual" value={formatMoney(payouts.data?.totals.actual ?? 0)} detail="Settled payouts">
          <PackageCheck className="size-5 text-royal" />
        </MetricCard>
        <MetricCard label="Variance" value={formatMoney(payouts.data?.totals.variance ?? 0)} detail={`${payouts.data?.totals.variances ?? 0} exceptions`}>
          <AlertCircle className="size-5 text-royal" />
        </MetricCard>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-4">
        {[
          ['Commission audit', '7 exceptions'],
          ['VAT invoice match', '96.8%'],
          ['Dispute queue', '5 open'],
          ['BC export state', '2 pending']
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-line bg-panel-muted/45 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">{label}</p>
            <p className="mt-1 font-black">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 divide-y divide-line rounded-xl border border-line">
        <AsyncState loading={payouts.isLoading} error={payouts.isError} empty={!payouts.data?.rows.length}>
          {payouts.data?.rows.slice(0, 6).map((row) => (
            <div key={row.id} className="grid gap-2 p-3 text-sm md:grid-cols-[1fr_.8fr_.8fr]">
              <div>
                <p className="font-bold">{row.publicId}</p>
                <p className="text-xs text-muted">{row.outletName ?? 'Outlet'} - {row.channel.replace('_', ' ')}</p>
              </div>
              <p className="font-semibold">{formatMoney(row.expectedPayout)}</p>
              <Badge className={row.status === 'variance' ? 'bg-rose-50 text-rose-700 ring-rose-200' : 'bg-panel-muted text-muted ring-line'}>
                {row.status}
              </Badge>
            </div>
          ))}
        </AsyncState>
      </div>
    </Card>
  );
}

function WebhookEventPanel({ rows, loading, error }: { rows: Array<{ id: string; provider: string; eventType: string; status: string; createdAt: string; retryCount?: number; replayCount?: number; error?: string | null }>; loading: boolean; error: boolean }) {
  const queryClient = useQueryClient();
  const retry = useMutation({
    mutationFn: dashboardApi.retryWebhook,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });
  const replay = useMutation({
    mutationFn: dashboardApi.replayWebhook,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });
  const addNotification = useOpsStore((state) => state.addNotification);
  useEffect(() => {
    rows
      .filter((row) => row.status === 'failed' || row.status === 'rejected')
      .slice(0, 3)
      .forEach((row) =>
        addNotification({
          id: `webhook_recovery:${row.id}`,
          type: 'activity',
          title: 'Webhook recovery needed',
          detail: `${row.provider} ${row.eventType} is ${row.status}`,
          tone: row.status === 'rejected' ? 'critical' : 'warning',
          severity: row.status === 'rejected' ? 'critical' : 'error',
          actionLabel: 'Review webhook',
          actionUrl: '/dashboard/integrations'
        })
      );
  }, [addNotification, rows]);
  return (
    <Card className="p-5">
      <h2 className="text-lg font-bold">Webhook event logs</h2>
      <div className="mt-4 max-h-[520px] divide-y divide-line overflow-auto rounded-xl border border-line">
        <AsyncState loading={loading} error={error} empty={!rows.length}>
          {rows.slice(0, 8).map((row) => (
            <div key={row.id} className="grid gap-2 p-3 text-sm transition hover:bg-royal/5 md:grid-cols-[.8fr_1fr_.7fr_.8fr_.9fr]">
              <p className="font-bold capitalize">{row.provider.replace('_', ' ')}</p>
              <p className="text-muted">{row.eventType}</p>
              <Badge className={row.status === 'failed' || row.status === 'rejected' ? 'bg-rose-50 text-rose-700 ring-rose-200' : 'bg-panel-muted text-muted ring-line'}>
                {row.status}
              </Badge>
              <p className="text-muted">R{row.retryCount ?? 0} / P{row.replayCount ?? 0}</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" disabled={retry.isPending || row.status === 'processed'} onClick={() => retry.mutate(row.id)}>Retry</Button>
                <Button size="sm" variant="ghost" disabled={replay.isPending} onClick={() => replay.mutate(row.id)}>Replay</Button>
              </div>
              <p className="text-muted">{formatDateTime(row.createdAt)}</p>
            </div>
          ))}
        </AsyncState>
      </div>
    </Card>
  );
}

function QueueActivityPanel({ rows, loading, error }: { rows: Array<{ id: string; queue: string; jobName: string; status: string; detail: string; createdAt: string }>; loading: boolean; error: boolean }) {
  return (
    <Card className="p-5">
      <h2 className="text-lg font-bold">Queue and job activity</h2>
      <div className="mt-4 max-h-[520px] divide-y divide-line overflow-auto rounded-xl border border-line">
        <AsyncState loading={loading} error={error} empty={!rows.length}>
          {rows.slice(0, 10).map((row) => (
            <div key={row.id} className="grid gap-2 p-3 text-sm transition hover:bg-royal/5 md:grid-cols-[.8fr_.8fr_1.3fr_.7fr]">
              <p className="font-bold">{row.jobName}</p>
              <Badge className={row.status === 'failed' ? 'bg-rose-50 text-rose-700 ring-rose-200' : 'bg-panel-muted text-muted ring-line'}>
                {row.status}
              </Badge>
              <p className="text-muted">{row.detail}</p>
              <p className="text-muted">{formatDateTime(row.createdAt)}</p>
            </div>
          ))}
        </AsyncState>
      </div>
    </Card>
  );
}

function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (page: number) => void }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Previous
      </Button>
      <span className="text-sm font-semibold text-muted">Page {page} of {totalPages}</span>
      <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
        Next
      </Button>
    </div>
  );
}

function AsyncState({ loading, error, empty, children }: { loading: boolean; error: boolean; empty?: boolean; children: React.ReactNode }) {
  if (loading) return <LoadingRows />;
  if (error) return <ErrorState />;
  if (empty) return <EmptyState />;
  return <>{children}</>;
}

function AsyncTableState({ loading, error, empty, children }: { loading: boolean; error: boolean; empty?: boolean; children: React.ReactNode }) {
  if (loading) return <div className="p-5"><LoadingRows /></div>;
  if (error) return <div className="p-5"><ErrorState /></div>;
  if (empty) return <div className="p-5"><EmptyState /></div>;
  return <>{children}</>;
}

function AsyncChartState({ loading, error, empty, children }: { loading: boolean; error: boolean; empty?: boolean; children: React.ReactNode }) {
  if (loading) return <Skeleton className="h-full w-full" />;
  if (error) return <ErrorState />;
  if (empty) return <EmptyState />;
  return <>{children}</>;
}

function LoadingRows() {
  return (
    <div className="space-y-3">
      <Skeleton className="activity-shimmer h-14 w-full" />
      <Skeleton className="activity-shimmer h-14 w-full" />
      <Skeleton className="activity-shimmer h-14 w-3/4" />
    </div>
  );
}

function ErrorState() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
      <span className="flex items-center gap-2">
        <AlertCircle className="size-4" />
        Could not load live data.
      </span>
      <Button size="sm" variant="secondary" onClick={() => window.location.reload()}>
        Retry
      </Button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-line bg-panel-muted/70 p-5 text-sm font-semibold text-muted">
      <p className="font-black text-ink">No operational data in this view.</p>
      <p className="mt-1 text-xs leading-5 text-muted">Live signals will appear here as outlets, channels, and workflows produce events.</p>
    </div>
  );
}

function formatKpiValue(value: number, unit: string) {
  if (unit === 'currency') return formatMoney(value);
  if (unit === 'minutes') return `${value}m`;
  if (unit === 'percent') return `${value}%`;
  return new Intl.NumberFormat('en-AE').format(value);
}

function actionCopy(status: OrderStatus) {
  if (status === 'accepted') return 'Accept';
  if (status === 'preparing') return 'Start prep';
  if (status === 'dispatched') return 'Dispatch';
  if (status === 'delivered') return 'Deliver';
  if (status === 'cancelled') return 'Cancel';
  return statusCopy[status];
}

function timestampPatch(status: OrderStatus, value: string): Partial<Order> {
  if (status === 'accepted') return { acceptedAt: value };
  if (status === 'preparing') return { preparingAt: value };
  if (status === 'dispatched') return { dispatchedAt: value };
  if (status === 'delivered') return { deliveredAt: value };
  if (status === 'cancelled') return { cancelledAt: value };
  return {};
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-AE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function getMutationErrorMessage(error: unknown) {
  return getApiErrorMessage(error);
}

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

function getSlaState(order: Order, now: number) {
  if (order.status === 'delivered' || order.status === 'cancelled') {
    return { level: 'green' as const, remainingMs: 0, minutes: 0 };
  }

  const placedAt = Date.parse(order.placedAt);
  if (Number.isNaN(placedAt)) {
    return { level: 'green' as const, remainingMs: order.etaMinutes * 60_000, minutes: order.etaMinutes };
  }

  const dueAt = placedAt + order.etaMinutes * 60_000;
  const remainingMs = dueAt - now;
  const minutes = Math.ceil(Math.abs(remainingMs) / 60_000);
  const remainingRatio = remainingMs / Math.max(order.etaMinutes * 60_000, 1);
  const level = remainingMs <= 0 ? 'red' : remainingRatio <= 0.25 ? 'yellow' : 'green';
  return { level, remainingMs, minutes };
}

function inventoryTone(risk: InventoryItem['risk']) {
  if (risk === 'critical') return 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-800';
  if (risk === 'warning') return 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-800';
  return 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-800';
}

function notificationTone(tone: OperationsNotification['tone']) {
  if (tone === 'critical') return 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200';
  if (tone === 'warning') return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200';
  if (tone === 'success') return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200';
  return 'bg-panel-muted text-muted';
}

function outletsFromOrders(orders: Order[]) {
  return Array.from(
    new Map(
      orders.map((order) => [
        order.outletId,
        {
          id: order.outletId,
          name: order.outletName,
          city: order.outletCity
        }
      ])
    ).values()
  );
}
