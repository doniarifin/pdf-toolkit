import React from "react";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import SortablePDFItem from "./SortablePDFItem";

export type PDFItem = { id: string; file: File };

interface Props {
  items: PDFItem[];
  setItems: React.Dispatch<React.SetStateAction<PDFItem[]>>;
}

const PDFMergeList: React.FC<Props> = ({ items, setItems }) => {
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setItems((prev) => {
      const oldIndex = prev.findIndex((i) => i.id === active.id);
      const newIndex = prev.findIndex((i) => i.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const handleDelete = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  if (items.length === 0) return null;

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={items.map((i) => i.id)}
        strategy={rectSortingStrategy}
      >
        <div className="bg-gray-200 p-4 rounded-xl mt-4 flex flex-wrap gap-3 justify-center">
          {items.map((item, index) => (
            <SortablePDFItem
              key={item.id}
              id={item.id}
              file={item.file}
              index={index}
              onDelete={() => handleDelete(item.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default PDFMergeList;