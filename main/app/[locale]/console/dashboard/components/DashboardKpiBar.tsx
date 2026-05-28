'use client';

/**
 * DashboardKpiBar.tsx
 *
 * Identical DnD structure to UserKpiBar.
 * Key difference: each KPI config has a `collection` field.
 * Values are fetched server-side via POST /api/dashboard/kpi
 * so any collection can be queried, not just nxf_users.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  DragDropContext, Droppable, Draggable, DropResult,
} from '@hello-pangea/dnd';
import {
  Plus, GripVertical, Settings2, Trash2,
  BarChart2, Users, FileText, Cpu, Image, HardDrive,
  UserCheck, Shield, Menu, Activity, ShoppingCart,
  Package, Truck, Star, Heart, Bell, Bookmark,
  Calendar, Clock, DollarSign, TrendingUp, TrendingDown,
  MapPin, Globe, Smartphone, Monitor, Layers, Database,
  Lock, Key, Mail, MessageSquare, Phone, Tag,
  Briefcase, Building, Home, Store, Zap, Award,
  CheckCircle, AlertCircle, BarChart, PieChart, LineChart,
} from 'lucide-react';

import { DashboardCollection, DashboardKpiConfig } from '../../types/dashboard';
import DashboardKpiConfigModal from './DashboardKpiConfigModal';
import { KpiBlock } from '../../kpi/kpi';

// ─── Local type — replaces the broken import ──────────────────

type KpiComputeRequest = {
  user_id:       string;
  collection:    string;
  formula:       string;
  format?:       string;
  field?:        string;
  field_a?:      string;
  field_b?:      string;
  operator?:     string;
  filter_field?: string;
  filter_value?: string;
};

// ─── Icon map ─────────────────────────────────────────────────



const ICON_MAP: Record<string, React.ReactNode> = {
  // Data & analytics
  'bar-chart-2':    <BarChart2 size={16} />,
  'bar-chart':      <BarChart size={16} />,
  'pie-chart':      <PieChart size={16} />,
  'line-chart':     <LineChart size={16} />,
  'trending-up':    <TrendingUp size={16} />,
  'trending-down':  <TrendingDown size={16} />,
  activity:         <Activity size={16} />,
  // People
  users:            <Users size={16} />,
  'user-check':     <UserCheck size={16} />,
  shield:           <Shield size={16} />,
  // Content
  'file-text':      <FileText size={16} />,
  bookmark:         <Bookmark size={16} />,
  tag:              <Tag size={16} />,
  layers:           <Layers size={16} />,
  // Commerce
  'shopping-cart':  <ShoppingCart size={16} />,
  package:          <Package size={16} />,
  truck:            <Truck size={16} />,
  store:            <Store size={16} />,
  'dollar-sign':    <DollarSign size={16} />,
  // Tech
  cpu:              <Cpu size={16} />,
  'hard-drive':     <HardDrive size={16} />,
  database:         <Database size={16} />,
  monitor:          <Monitor size={16} />,
  smartphone:       <Smartphone size={16} />,
  globe:            <Globe size={16} />,
  zap:              <Zap size={16} />,
  // Communication
  mail:             <Mail size={16} />,
  'message-square': <MessageSquare size={16} />,
  phone:            <Phone size={16} />,
  bell:             <Bell size={16} />,
  menu:             <Menu size={16} />,
  // Time & place
  calendar:         <Calendar size={16} />,
  clock:            <Clock size={16} />,
  'map-pin':        <MapPin size={16} />,
  // Status
  'check-circle':   <CheckCircle size={16} />,
  'alert-circle':   <AlertCircle size={16} />,
  award:            <Award size={16} />,
  star:             <Star size={16} />,
  heart:            <Heart size={16} />,
  // Business
  briefcase:        <Briefcase size={16} />,
  building:         <Building size={16} />,
  home:             <Home size={16} />,
  // Security
  lock:             <Lock size={16} />,
  key:              <Key size={16} />,
  // Media
  image:            <Image size={16} />,
};
// ─── Types ────────────────────────────────────────────────────

interface Props {
  blocks:           KpiBlock[];
  isEditMode:       boolean;
  onBlocksChange:   (blocks: KpiBlock[]) => void;
  collections:      DashboardCollection[];
  currentUserId:    string;
  currencySymbol?:  string;
}

// ─── KPI card ─────────────────────────────────────────────────

function KpiCard({
  config,
  value,
  loading,
  isEditMode,
  onEdit,
  onRemove,
}: {
  config:     DashboardKpiConfig;
  value:      string;
  loading:    boolean;
  isEditMode: boolean;
  onEdit:     () => void;
  onRemove:   () => void;
}) {
  const accent    = config.colour      || 'var(--color-primary)';
  const bgColour  = config.block_colour;
  const fontColor = config.font_colour  || 'var(--color-text)';

  return (
    <div
      className="relative group p-4 rounded-xl border border-gray-200 min-w-[160px] flex-1"
      style={{ backgroundColor: bgColour || '#ffffff' }}
    >
      {isEditMode && (
        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="p-1 rounded-md hover:bg-black/10 text-gray-400">
            <Settings2 size={12} />
          </button>
          <button onClick={onRemove} className="p-1 rounded-md hover:bg-red-500/10 text-gray-400 hover:text-red-500">
            <Trash2 size={12} />
          </button>
        </div>
      )}
      <div className="flex items-start gap-3">
        <div
          className="p-2 rounded-lg flex-shrink-0"
          style={{ backgroundColor: `${accent}20`, color: accent }}
        >
          {ICON_MAP[config.icon ?? ''] ?? <BarChart2 size={16} />}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-500 truncate">{config.label}</p>
          {loading ? (
            <div className="h-6 w-16 bg-gray-100 rounded animate-pulse mt-0.5" />
          ) : (
            <p className="text-xl font-bold mt-0.5" style={{ color: fontColor }}>
              {value}
            </p>
          )}
          <p className="text-[10px] text-gray-400 mt-1 truncate">{config.collection}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────

export default function DashboardKpiBar({
  blocks,
  isEditMode,
  onBlocksChange,
  collections,
  currentUserId,
  currencySymbol = 'R',
}: Props) {
  const [values,  setValues]  = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const [editingKpi,    setEditingKpi]    = useState<{ blockId: string; kpi: DashboardKpiConfig } | null>(null);
  const [addingToBlock, setAddingToBlock] = useState<string | null>(null);

  const totalKpis = blocks.reduce((sum, b) => sum + b.kpis.length, 0);
  const canAddKpi = totalKpis < 5;

  // ── Fetch all KPI values ──────────────────────────────────────
  const fetchValues = useCallback(async () => {
    if (!currentUserId) return;
    const allKpis = blocks.flatMap((b) => b.kpis as unknown as DashboardKpiConfig[]);
    for (const kpi of allKpis) {
      if (!kpi.collection) continue;
      setLoading((prev) => ({ ...prev, [kpi.kpi_id]: true }));
      try {
        const payload: KpiComputeRequest = {
          user_id:      currentUserId,
          collection:   kpi.collection,
          formula:      kpi.formula,
          format:       kpi.format,
          field:        kpi.field,
          field_a:      kpi.field_a,
          field_b:      kpi.field_b,
          operator:     kpi.operator,
          filter_field: kpi.filter_field,
          filter_value: kpi.filter_value,
        };
        const res  = await fetch('/api/dashboard/kpi', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload),
        });
        const data = await res.json();
        setValues((prev) => ({ ...prev, [kpi.kpi_id]: data.formatted ?? '—' }));
      } catch {
        setValues((prev) => ({ ...prev, [kpi.kpi_id]: '—' }));
      } finally {
        setLoading((prev) => ({ ...prev, [kpi.kpi_id]: false }));
      }
    }
  }, [blocks, currentUserId]);

  useEffect(() => { fetchValues(); }, [fetchValues]);

  // ── DnD ──────────────────────────────────────────────────────
  function onDragEnd(result: DropResult) {
    const { source, destination, type } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    if (type === 'BLOCK') {
      const next = [...blocks];
      const [moved] = next.splice(source.index, 1);
      next.splice(destination.index, 0, moved);
      onBlocksChange(next);
      return;
    }

    const srcBlock = blocks.find((b) => b.block_id === source.droppableId);
    const dstBlock = blocks.find((b) => b.block_id === destination.droppableId);
    if (!srcBlock || !dstBlock) return;

    const isSameBlock = source.droppableId === destination.droppableId;
    if (!isSameBlock && dstBlock.kpis.length >= 4) return;

    const newBlocks = blocks.map((b) => ({ ...b, kpis: [...b.kpis] }));
    const src = newBlocks.find((b) => b.block_id === source.droppableId)!;
    const dst = newBlocks.find((b) => b.block_id === destination.droppableId)!;
    const [movedKpi] = src.kpis.splice(source.index, 1);
    dst.kpis.splice(destination.index, 0, movedKpi);
    onBlocksChange(newBlocks.filter((b) => b.kpis.length > 0));
  }

  // ── Helpers ───────────────────────────────────────────────────
  function emitChange(newBlocks: KpiBlock[]) { onBlocksChange(newBlocks); }

  function handleAddKpi(blockId: string | null, kpi: DashboardKpiConfig) {
    let newBlocks: KpiBlock[];
    if (blockId && blocks.find((b) => b.block_id === blockId)) {
      newBlocks = blocks.map((b) =>
        b.block_id === blockId ? { ...b, kpis: [...b.kpis, kpi as any] } : b
      );
    } else {
      newBlocks = [
        ...blocks,
        { block_id: crypto.randomUUID(), kpis: [kpi as any], is_wide: false },
      ];
    }
    emitChange(newBlocks);
    setAddingToBlock(null);
    setEditingKpi(null);
  }

  function handleEditKpi(blockId: string, kpi: DashboardKpiConfig) {
    emitChange(
      blocks.map((b) =>
        b.block_id === blockId
          ? { ...b, kpis: b.kpis.map((k: any) => (k.kpi_id === kpi.kpi_id ? kpi : k)) }
          : b
      )
    );
    setEditingKpi(null);
  }

  function handleRemoveKpi(blockId: string, kpiId: string) {
    emitChange(
      blocks
        .map((b) =>
          b.block_id === blockId
            ? { ...b, kpis: b.kpis.filter((k: any) => k.kpi_id !== kpiId) }
            : b
        )
        .filter((b) => b.kpis.length > 0)
    );
  }

  function toggleWide(blockId: string) {
    emitChange(blocks.map((b) => b.block_id === blockId ? { ...b, is_wide: !b.is_wide } : b));
  }

  // ── Empty state ───────────────────────────────────────────────
  if (blocks.length === 0) {
    return (
      <div className="flex items-center gap-3 p-4">
        {isEditMode && (
          <button
            onClick={() => setAddingToBlock('__new__')}
            className="w-48 h-24 rounded-xl border-2 border-dashed border-gray-200
                       flex flex-col items-center justify-center gap-1.5 text-gray-400
                       hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]
                       transition-colors group"
          >
            <div className="w-7 h-7 rounded-full border-2 border-dashed border-current
                            flex items-center justify-center group-hover:border-solid">
              <Plus size={14} />
            </div>
            <span className="text-xs font-medium">Add first KPI</span>
          </button>
        )}
        {addingToBlock && (
          <DashboardKpiConfigModal
            collections={collections}
            onSave={(kpi) => handleAddKpi(null, kpi)}
            onClose={() => setAddingToBlock(null)}
          />
        )}
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="w-full p-4">
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="dashboard-kpi-blocks" direction="horizontal" type="BLOCK">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="flex flex-wrap gap-3 items-start"
            >
              {blocks.map((block, blockIndex) => (
                <Draggable
                  key={block.block_id}
                  draggableId={block.block_id}
                  index={blockIndex}
                  isDragDisabled={!isEditMode}
                >
                  {(dragProvided, dragSnapshot) => (
                    <div
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      className={`flex flex-col gap-2 p-3 rounded-xl border transition-shadow ${
                        dragSnapshot.isDragging
                          ? 'border-[var(--color-primary)] shadow-lg opacity-90'
                          : 'border-gray-200'
                      } ${block.is_wide ? 'w-full' : 'w-auto'}`}
                    >
                      {isEditMode && (
                        <div className="flex items-center justify-between">
                          <div
                            {...dragProvided.dragHandleProps}
                            className="cursor-grab active:cursor-grabbing text-gray-400 p-0.5"
                          >
                            <GripVertical size={14} />
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            {block.kpis.length < 4 && canAddKpi && (
                              <button
                                onClick={() => setAddingToBlock(block.block_id)}
                                className="text-[var(--color-primary)] hover:underline flex items-center gap-0.5"
                              >
                                <Plus size={11} /> Add KPI
                              </button>
                            )}
                            <button
                              onClick={() => toggleWide(block.block_id)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              {block.is_wide ? '↔ Compact' : '↔ Wide'}
                            </button>
                          </div>
                        </div>
                      )}

                      <Droppable droppableId={block.block_id} direction="horizontal" type="KPI">
                        {(kpiProvided, kpiSnapshot) => (
                          <div
                            ref={kpiProvided.innerRef}
                            {...kpiProvided.droppableProps}
                            className={`flex gap-2 min-h-[80px] rounded-lg transition-colors ${
                              kpiSnapshot.isDraggingOver
                                ? 'bg-[var(--color-primary)]/5 ring-2 ring-[var(--color-primary)]/30'
                                : ''
                            }`}
                          >
                            {(block.kpis as unknown as DashboardKpiConfig[]).map((kpi, kpiIndex) => (
                              <Draggable
                                key={kpi.kpi_id}
                                draggableId={kpi.kpi_id}
                                index={kpiIndex}
                                isDragDisabled={!isEditMode}
                              >
                                {(kpiDrag) => (
                                  <div
                                    ref={kpiDrag.innerRef}
                                    {...kpiDrag.draggableProps}
                                    {...kpiDrag.dragHandleProps}
                                  >
                                    <KpiCard
                                      config={kpi}
                                      value={values[kpi.kpi_id] ?? '—'}
                                      loading={loading[kpi.kpi_id] ?? false}
                                      isEditMode={isEditMode}
                                      onEdit={() => setEditingKpi({ blockId: block.block_id, kpi })}
                                      onRemove={() => handleRemoveKpi(block.block_id, kpi.kpi_id)}
                                    />
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {kpiProvided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  )}
                </Draggable>
              ))}

              {provided.placeholder}

              {isEditMode && canAddKpi && (
                <button
                  onClick={() => setAddingToBlock('__new__')}
                  className="w-24 min-h-[80px] rounded-xl border-2 border-dashed border-gray-200
                             flex flex-col items-center justify-center gap-1 text-gray-400
                             hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]
                             transition-colors self-stretch"
                >
                  <Plus size={16} />
                  <span className="text-xs">Block</span>
                </button>
              )}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {(addingToBlock || editingKpi) && (
        <DashboardKpiConfigModal
          initial={editingKpi?.kpi}
          collections={collections}
          onSave={(kpi) => {
            if (editingKpi) {
              handleEditKpi(editingKpi.blockId, kpi);
            } else {
              handleAddKpi(addingToBlock === '__new__' ? null : addingToBlock, kpi);
            }
          }}
          onClose={() => { setEditingKpi(null); setAddingToBlock(null); }}
        />
      )}
    </div>
  );
}