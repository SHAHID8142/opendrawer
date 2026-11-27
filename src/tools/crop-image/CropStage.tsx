// SPDX-License-Identifier: AGPL-3.0-or-later
// Draggable crop box over the loaded image. Drag the box to move; drag the corner to resize.
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { clampRect, type CropRect } from './engine';

interface Props {
  url: string;
  width: number;
  height: number;
  rect: CropRect;
  onRect: (rect: CropRect) => void;
}

interface DragState {
  mode: 'move' | 'resize';
  startX: number;
  startY: number;
  start: CropRect;
  scale: number;
}

export function CropStage({ url, width, height, rect, onRect }: Props) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    box.style.left = `${(rect.x / width) * 100}%`;
    box.style.top = `${(rect.y / height) * 100}%`;
    box.style.width = `${(rect.width / width) * 100}%`;
    box.style.height = `${(rect.height / height) * 100}%`;
  }, [rect, width, height]);

  useEffect(() => {
    if (!drag) return;
    function move(event: PointerEvent) {
      if (!drag) return;
      const dx = (event.clientX - drag.startX) * drag.scale;
      const dy = (event.clientY - drag.startY) * drag.scale;
      const next =
        drag.mode === 'move'
          ? { ...drag.start, x: drag.start.x + dx, y: drag.start.y + dy }
          : { ...drag.start, width: drag.start.width + dx, height: drag.start.height + dy };
      onRect(clampRect(next, width, height));
    }
    function up() {
      setDrag(null);
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [drag, width, height, onRect]);

  function begin(event: PointerEvent, mode: 'move' | 'resize') {
    event.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const scale = width / stage.getBoundingClientRect().width;
    setDrag({ mode, startX: event.clientX, startY: event.clientY, start: { ...rect }, scale });
  }

  return (
    <div className="crop-stage" ref={stageRef}>
      <img src={url} alt="Image to crop" draggable={false} />
      <div ref={boxRef} className="crop-box" onPointerDown={(event) => begin(event, 'move')}>
        <span
          className="crop-handle"
          aria-hidden="true"
          onPointerDown={(event) => {
            event.stopPropagation();
            begin(event, 'resize');
          }}
        />
      </div>
    </div>
  );
}
