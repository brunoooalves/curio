"use client";

import { useState, useTransition } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { reorderBatchItems } from "@/app/actions/batchActions";
import type { BatchItem } from "@/lib/domain/batch/types";

interface ItemView extends BatchItem {
  recipeTitle: string;
}

const MEAL_LABEL: Record<BatchItem["mealType"], string> = {
  cafe: "Cafe da manha",
  almoco: "Almoco",
  jantar: "Jantar",
  lanche: "Lanche",
};

export function BatchReorder({
  batchId,
  initialItems,
  onClose,
}: {
  batchId: string;
  initialItems: ItemView[];
  onClose: () => void;
}) {
  const [items, setItems] = useState<ItemView[]>(initialItems);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems((current) => {
      const oldIndex = current.findIndex((i) => i.id === active.id);
      const newIndex = current.findIndex((i) => i.id === over.id);
      return arrayMove(current, oldIndex, newIndex);
    });
  }

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        await reorderBatchItems(
          batchId,
          items.map((i) => i.id),
        );
        onClose();
      } catch (err) {
        setError((err as Error).message ?? "Erro ao salvar ordem.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Arraste para reordenar. Cozinhe na ordem que preferir.
      </p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <ul className="flex flex-col gap-3">
            {items.map((item, index) => (
              <SortableItem key={item.id} item={item} order={index + 1} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" onClick={save} disabled={pending}>
          {pending ? "Salvando..." : "Salvar ordem"}
        </Button>
        <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

function SortableItem({ item, order }: { item: ItemView; order: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <li ref={setNodeRef} style={style}>
      <Card {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Badge variant="outline">#{order}</Badge>
            <span className="font-medium">{item.recipeTitle}</span>
          </div>
          <span className="text-xs text-muted-foreground">{MEAL_LABEL[item.mealType]}</span>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          Arraste para mover
        </CardContent>
      </Card>
    </li>
  );
}
