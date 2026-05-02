import { useState, useMemo, useCallback, useEffect, type DragEvent } from 'react';
import { X, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { AdvisorPersona } from '../types';

const DND_TYPE = 'application/x-council-advisor-id';

type Props = {
  advisors: AdvisorPersona[];
  open: boolean;
  onClose: () => void;
  onConfirm: (name: string, memberIds: string[]) => void;
};

export function CreateGroupModal({ advisors, open, onClose, onConfirm }: Props) {
  const [name, setName] = useState('New council');
  /** Order preserved for “In this chat” column */
  const [memberIds, setMemberIds] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setName('New council');
      setMemberIds([]);
    }
  }, [open]);

  const memberSet = useMemo(() => new Set(memberIds), [memberIds]);

  const available = useMemo(
    () => advisors.filter((a) => !memberSet.has(a.id)),
    [advisors, memberSet],
  );

  const inGroup = useMemo(
    () => memberIds.map((id) => advisors.find((a) => a.id === id)).filter(Boolean) as AdvisorPersona[],
    [memberIds, advisors],
  );

  const resetAndClose = useCallback(() => {
    setName('New council');
    setMemberIds([]);
    onClose();
  }, [onClose]);

  const addToGroup = useCallback((id: string) => {
    setMemberIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const removeFromGroup = useCallback((id: string) => {
    setMemberIds((prev) => prev.filter((x) => x !== id));
  }, []);

  const handleDragStart = (e: DragEvent, id: string) => {
    e.dataTransfer.setData(DND_TYPE, id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnGroup = (e: DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData(DND_TYPE);
    if (id) addToGroup(id);
  };

  const handleDropOnAvailable = (e: DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData(DND_TYPE);
    if (id) removeFromGroup(id);
  };

  const handleConfirm = () => {
    const trimmed = name.trim() || 'New council';
    onConfirm(trimmed, [...memberIds]);
    setMemberIds([]);
    setName('New council');
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 border-0 cursor-default"
        aria-label="Close"
        onClick={resetAndClose}
      />
      <div
        role="dialog"
        aria-labelledby="create-group-title"
        className="relative z-10 w-full max-w-[520px] rounded-lg bg-white shadow-xl border border-[#e5e5e5] flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#eee] shrink-0">
          <h2 id="create-group-title" className="text-base font-semibold">
            New council
          </h2>
          <button
            type="button"
            className="p-1 rounded hover:bg-zinc-100 text-zinc-500"
            onClick={resetAndClose}
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-3 space-y-2 shrink-0">
          <label className="text-[11px] uppercase tracking-wide text-[#999] font-semibold">Group name</label>
          <input
            className="w-full border border-[#ddd] rounded-md px-3 py-2 text-sm outline-none focus:border-[#07c160]"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. battle, strategy circle…"
            maxLength={80}
          />
        </div>

        <p className="px-4 text-[12px] text-[#666] leading-snug">
          Drag advisors into <strong>In this chat</strong>, or tap a name. Empty group is ok—you can add members later in ⋯ settings.
        </p>

        <div className="px-4 py-2 flex gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-[12px] h-8"
            onClick={() => setMemberIds(advisors.map((a) => a.id))}
          >
            Add all
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-[12px] h-8"
            onClick={() => setMemberIds([])}
          >
            Clear
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 px-4 pb-4 flex-1 min-h-[220px]">
          <div className="flex flex-col min-h-0 border border-[#e5e5e5] rounded-md bg-[#fafafa] overflow-hidden">
            <div className="text-[11px] uppercase tracking-wide text-[#999] font-semibold px-3 py-2 bg-[#f0f0f0] border-b border-[#e5e5e5]">
              Available
            </div>
            <ScrollArea className="flex-1 h-[220px]">
              <div
                className="p-2 space-y-1 min-h-[180px]"
                onDragOver={handleDragOver}
                onDrop={handleDropOnAvailable}
              >
                {available.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    draggable
                    onDragStart={(e) => handleDragStart(e, a.id)}
                    onClick={() => addToGroup(a.id)}
                    className="w-full flex items-center gap-2 text-left px-2 py-1.5 rounded hover:bg-white border border-transparent hover:border-[#ddd] text-[13px] cursor-grab active:cursor-grabbing"
                  >
                    <GripVertical className="w-4 h-4 text-[#bbb] shrink-0" aria-hidden />
                    <img src={a.avatar} alt="" className="w-8 h-8 rounded object-cover shrink-0 bg-zinc-200" />
                    <span className="truncate font-medium">{a.shortName}</span>
                  </button>
                ))}
                {available.length === 0 && (
                  <p className="text-[12px] text-[#aaa] px-2 py-6 text-center">Everyone is in the chat →</p>
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="flex flex-col min-h-0 border border-[#07c160]/40 rounded-md bg-[#f6fff9] overflow-hidden">
            <div className="text-[11px] uppercase tracking-wide text-[#07c160] font-semibold px-3 py-2 bg-[#ecfdf3] border-b border-[#d1fae5]">
              In this chat
            </div>
            <ScrollArea className="flex-1 h-[220px]">
              <div
                className="p-2 space-y-1 min-h-[180px]"
                onDragOver={handleDragOver}
                onDrop={handleDropOnGroup}
              >
                {inGroup.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    draggable
                    onDragStart={(e) => handleDragStart(e, a.id)}
                    onClick={() => removeFromGroup(a.id)}
                    className="w-full flex items-center gap-2 text-left px-2 py-1.5 rounded hover:bg-white border border-transparent hover:border-[#a7f3d0] text-[13px] cursor-grab active:cursor-grabbing"
                  >
                    <GripVertical className="w-4 h-4 text-[#86efac] shrink-0" aria-hidden />
                    <img src={a.avatar} alt="" className="w-8 h-8 rounded object-cover shrink-0 bg-zinc-200" />
                    <span className="truncate font-medium">{a.shortName}</span>
                  </button>
                ))}
                {inGroup.length === 0 && (
                  <p className="text-[12px] text-[#888] px-2 py-6 text-center border border-dashed border-[#ccc] rounded-md m-1">
                    Drag from Available or tap names below in Available
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-[#eee] shrink-0 bg-[#fafafa] rounded-b-lg">
          <Button type="button" variant="outline" onClick={resetAndClose}>
            Cancel
          </Button>
          <Button type="button" className="bg-[#07c160] hover:bg-[#06ae56] text-white" onClick={handleConfirm}>
            Create group
          </Button>
        </div>
      </div>
    </div>
  );
}
