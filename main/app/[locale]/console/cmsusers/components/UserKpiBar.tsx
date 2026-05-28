// ============================================================
// FILE: app/[locale]/console/users/components/UserKpiBar.tsx
// — Only KpiCard changes to support font_colour.
//   Full file printed for completeness.
// ============================================================

'use client';

import { useState } from 'react';
import {
  DragDropContext, Droppable, Draggable, DropResult,
} from '@hello-pangea/dnd';
import {
  Plus, GripVertical, Settings2, Trash2,
  Users, UserCheck, UserX, Shield, Activity,
  BarChart2, TrendingUp, TrendingDown, Clock, Calendar,
} from 'lucide-react';

import KpiConfigModal, { KpiConfigExtended } from './KpiConfigModal';
import { KpiResult, KpiPageConfig, KpiBlock } from '../../kpi/kpi';

const ICON_MAP: Record<string, React.ReactNode> = {
  'bar-chart-2':   <BarChart2 size={16} />,
  users:           <Users size={16} />,
  'user-check':    <UserCheck size={16} />,
  'user-x':        <UserX size={16} />,
  shield:          <Shield size={16} />,
  activity:        <Activity size={16} />,
  'trending-up':   <TrendingUp size={16} />,
  'trending-down': <TrendingDown size={16} />,
  clock:           <Clock size={16} />,
  calendar:        <Calendar size={16} />,
};

function KpiIcon({ name }: { name?: string }) {
  return <span>{name && ICON_MAP[name] ? ICON_MAP[name] : <BarChart2 size={16} />}</span>;
}

// ── KPI card ───────────────────────────────────────────────
function KpiCard({
  config,
  result,
  onEdit,
  onRemove,
  isEditMode,
}: {
  config: KpiConfigExtended;
  result?: KpiResult;
  onEdit: () => void;
  onRemove: () => void;
  isEditMode: boolean;
}) {
  const accentColour = config.colour    || 'var(--color-primary)';
  const bgColour     = config.block_colour;
  const valueColour  = config.font_colour || 'var(--color-text)';

  return (
    <div
      className="relative group p-4 rounded-xl border border-gray-200 min-w-[160px] flex-1"
      style={{ backgroundColor: bgColour || '#ffffff' }}
    >
      {isEditMode && (
        <div className="absolute top-2 right-2 flex items-center gap-1
                        opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="p-1 rounded-md hover:bg-black/10 text-gray-400"
          >
            <Settings2 size={12} />
          </button>
          <button
            onClick={onRemove}
            className="p-1 rounded-md hover:bg-red-500/10 text-gray-400 hover:text-red-500"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}

      <div className="flex items-start gap-3">
        <div
          className="p-2 rounded-lg flex-shrink-0"
          style={{ backgroundColor: `${accentColour}20`, color: accentColour }}
        >
          <KpiIcon name={config.icon} />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-500 truncate">{config.label}</p>
          {/* font_colour applied directly to the value */}
          <p
            className="text-xl font-bold mt-0.5"
            style={{ color: valueColour }}
          >
            {result?.formatted ?? '—'}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────
interface UserKpiBarProps {
  config: KpiPageConfig | null;
  results: KpiResult[];
  availableFields: { value: string; label: string }[];
  isEditMode: boolean;
  onConfigChange: (config: KpiPageConfig) => void;
  projectId: string;
  tenantId: string;
}

export default function UserKpiBar({
  config,
  results,
  availableFields,
  isEditMode,
  onConfigChange,
  projectId,
  tenantId,
}: UserKpiBarProps) {
  const [editingKpi,    setEditingKpi]    = useState<{ blockId: string; kpi: KpiConfigExtended } | null>(null);
  const [addingToBlock, setAddingToBlock] = useState<string | null>(null);

  const blocks    = config?.blocks ?? [];
  const totalKpis = blocks.reduce((sum, b) => sum + b.kpis.length, 0);
  const canAddKpi = totalKpis < 5;

  function resultFor(kpiId: string) {
    return results.find((r) => r.kpi_id === kpiId);
  }

  function emitChange(newBlocks: KpiBlock[]) {
    const base = config ?? {
      config_id:  crypto.randomUUID(),
      page:       'users',
      project_id: projectId,
      tenant_id:  tenantId,
      updated_at: new Date().toISOString(),
    };
    onConfigChange({ ...base, blocks: newBlocks, updated_at: new Date().toISOString() });
  }

  function onDragEnd(result: DropResult) {
    const { source, destination, type } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    if (type === 'BLOCK') {
      const reordered = Array.from(blocks);
      const [moved] = reordered.splice(source.index, 1);
      reordered.splice(destination.index, 0, moved);
      emitChange(reordered);
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

    emitChange(newBlocks.filter((b) => b.kpis.length > 0));
  }

  function handleAddKpi(blockId: string | null, kpi: KpiConfigExtended) {
    let newBlocks: KpiBlock[];
    if (blockId && blocks.find((b) => b.block_id === blockId)) {
      newBlocks = blocks.map((b) =>
        b.block_id === blockId ? { ...b, kpis: [...b.kpis, kpi] } : b
      );
    } else {
      newBlocks = [...blocks, { block_id: crypto.randomUUID(), kpis: [kpi], is_wide: false }];
    }
    emitChange(newBlocks);
    setAddingToBlock(null);
    setEditingKpi(null);
  }

  function handleEditKpi(blockId: string, kpi: KpiConfigExtended) {
    emitChange(
      blocks.map((b) =>
        b.block_id === blockId
          ? { ...b, kpis: b.kpis.map((k) => (k.kpi_id === kpi.kpi_id ? kpi : k)) }
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
            ? { ...b, kpis: b.kpis.filter((k) => k.kpi_id !== kpiId) }
            : b
        )
        .filter((b) => b.kpis.length > 0)
    );
  }

  function toggleWide(blockId: string) {
    emitChange(blocks.map((b) => b.block_id === blockId ? { ...b, is_wide: !b.is_wide } : b));
  }

  // ── Empty state ────────────────────────────────────────
  if (blocks.length === 0) {
    return (
      <div className="flex items-center gap-3">
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

        {addingToBlock && (
          <KpiConfigModal
            availableFields={availableFields}
            onSave={(kpi) => handleAddKpi(null, kpi as KpiConfigExtended)}
            onClose={() => setAddingToBlock(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="w-full">
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="kpi-blocks" direction="horizontal" type="BLOCK">
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
                      {/* Block toolbar */}
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

                      {/* KPI droppable */}
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
                            {block.kpis.map((kpi, kpiIndex) => (
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
                                      config={kpi as KpiConfigExtended}
                                      result={resultFor(kpi.kpi_id)}
                                      isEditMode={isEditMode}
                                      onEdit={() => setEditingKpi({ blockId: block.block_id, kpi: kpi as KpiConfigExtended })}
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
        <KpiConfigModal
          initial={editingKpi?.kpi}
          availableFields={availableFields}
          onSave={(kpi) => {
            if (editingKpi) {
              handleEditKpi(editingKpi.blockId, kpi as KpiConfigExtended);
            } else {
              handleAddKpi(addingToBlock === '__new__' ? null : addingToBlock, kpi as KpiConfigExtended);
            }
          }}
          onClose={() => { setEditingKpi(null); setAddingToBlock(null); }}
        />
      )}
    </div>
  );
}