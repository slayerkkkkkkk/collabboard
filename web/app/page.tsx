"use client";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";

type Card = {
  id: number;
  x: number;
  y: number;
  text: string;
};

type Cursor = {
  id: string;
  x: number;
  y: number;
};

const socket = io("http://localhost:4000");

export default function Home() {
  const [cards, setCards] = useState<Card[]>([]);
  const [dragId, setDragId] = useState<number | null>(null);

  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 });
  const [panning, setPanning] = useState(false);

  const [cursors, setCursors] = useState<Record<string, Cursor>>({});

  // Realtime listeners
  useEffect(() => {
    socket.on("init", (serverCards: Card[]) => {
      setCards(serverCards);
    });

    socket.on("move", (updated: Card) => {
      setCards((prev) =>
        prev.map((c) =>
          c.id === updated.id ? { ...c, ...updated } : c
        )
      );
    });

    socket.on("add", (card: Card) => {
      setCards((prev) => [...prev, card]);
    });

    socket.on("cursor", (cursor: Cursor) => {
      setCursors((prev) => ({
        ...prev,
        [cursor.id]: cursor,
      }));
    });

    socket.on("leave", (id: string) => {
      setCursors((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    });

    return () => {
      socket.off("init");
      socket.off("move");
      socket.off("add");
      socket.off("cursor");
      socket.off("leave");
    };
  }, []);

  return (
    <main
      className="w-screen h-screen overflow-hidden bg-neutral-950 text-white"
      onMouseMove={(e) => {
        // Emit cursor
        socket.emit("cursor", {
          x: e.clientX,
          y: e.clientY,
        });

        // Drag card
        if (dragId !== null) {
          const updated = {
            id: dragId,
            x: (e.clientX - camera.x) / camera.scale - 80,
            y: (e.clientY - camera.y) / camera.scale - 40,
            text: "",
          };

          setCards((prev) =>
            prev.map((c) =>
              c.id === dragId ? { ...c, ...updated } : c
            )
          );

          socket.emit("move", updated);
        }
        // Pan
        else if (panning) {
          setCamera((cam) => ({
            ...cam,
            x: cam.x + e.movementX,
            y: cam.y + e.movementY,
          }));
        }
      }}
      onMouseUp={() => {
        setDragId(null);
        setPanning(false);
      }}
      onWheel={(e) => {
        const delta = -e.deltaY * 0.001;
        setCamera((cam) => ({
          ...cam,
          scale: Math.min(2, Math.max(0.5, cam.scale + delta)),
        }));
      }}
    >
      {/* Subtitle */}
      <div className="absolute top-6 left-6 text-white/60 text-sm">
        Realtime collaborative canvas with live cursors
      </div>

      {/* Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(circle,#ffffff0f_1px,transparent_1px)] [background-size:24px_24px]" />

      {/* Canvas */}
      <div
        className="relative w-full h-full cursor-grab"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) setPanning(true);
        }}
      >
        <div
          style={{
            transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`,
            transformOrigin: "0 0",
          }}
        >
          {cards.map((card) => (
            <div
              key={card.id}
              onMouseDown={() => setDragId(card.id)}
              className="absolute p-4 w-40 rounded-xl border border-white/10 bg-white/5 backdrop-blur cursor-move select-none hover:bg-white/10 transition"
              style={{ left: card.x, top: card.y }}
            >
              {card.text || "Note"}
            </div>
          ))}
        </div>
      </div>

      {/* Other user cursors */}
      {Object.values(cursors).map((c) => (
        <div
          key={c.id}
          className="pointer-events-none absolute"
          style={{ left: c.x, top: c.y }}
        >
          <div className="w-3 h-3 bg-green-400 rounded-full shadow-lg" />
        </div>
      ))}

      {/* Toolbar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 px-4 py-2 rounded-xl border border-white/10 bg-white/5 backdrop-blur">
        <button
          onClick={() => {
            const newCard = {
              id: Date.now(),
              x: 300,
              y: 200,
              text: "New note",
            };

            setCards((c) => [...c, newCard]);
            socket.emit("add", newCard);
          }}
          className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition"
        >
          + Card
        </button>

        <div className="text-white/60 text-sm">
          CollabBoard — Realtime Infinite Canvas
        </div>
      </div>

      {/* Demo hint */}
      <div className="absolute bottom-6 right-6 text-white/50 text-xs">
        Open in two tabs to see realtime collaboration
      </div>
    </main>
  );
}