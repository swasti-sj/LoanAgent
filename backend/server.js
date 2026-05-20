import dotenv from "dotenv";
dotenv.config();

import express from "express";
import WebSocket, { WebSocketServer } from "ws";
import http from "http";
import cors from "cors";

import { handleWebSocketConnection } from "./websocket.js";

const app = express();
const server = http.createServer(app);

const wss = new WebSocketServer({ server });

// Middleware
app.use(
cors({
origin: process.env.FRONTEND_URL,
methods: ["GET", "POST", "OPTIONS"],
})
);

app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
res.json({
status: "ok",
timestamp: new Date().toISOString(),
});
});

// WebSocket connection handler
wss.on("connection", (ws, req) => {
console.log("✅ Client connected");
handleWebSocketConnection(ws, req);
});

wss.on("error", (error) => {
console.error("❌ WebSocket Error:", error);
});

// Server startup
const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
console.log(`🚀 Server running on ws://localhost:${PORT}`);
console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
console.log("Shutting down gracefully...");
server.close();
});
