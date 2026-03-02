import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

let cards = [
  { id: 1, x: 200, y: 150, text: "Drag me" },
];

io.on("connection", (socket) => {
  console.log("user connected", socket.id);

  // Send current board
  socket.emit("init", cards);

  // Move card
  socket.on("move", (updated) => {
    cards = cards.map((c) =>
      c.id === updated.id ? { ...c, ...updated } : c
    );
    socket.broadcast.emit("move", updated);
  });

  // Add card
  socket.on("add", (card) => {
    cards.push(card);
    socket.broadcast.emit("add", card);
  });

  // 👇 LIVE CURSOR
  socket.on("cursor", (cursor) => {
    socket.broadcast.emit("cursor", {
      id: socket.id,
      ...cursor,
    });
  });

  // User left
  socket.on("disconnect", () => {
    socket.broadcast.emit("leave", socket.id);
  });
});

server.listen(4000, () => {
  console.log("socket server on 4000");
});