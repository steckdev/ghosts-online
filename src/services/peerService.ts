import Peer, { type DataConnection } from 'peerjs';
import type { NetworkMessage } from '../types/game';

// Prefix to avoid collisions on free PeerJS public broker
const PEER_PREFIX = 'ghosts80s-';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

export class PeerService {
  private peer: Peer | null = null;
  private connection: DataConnection | null = null;
  private pendingQueue: NetworkMessage[] = [];
  public roomCode: string = '';
  public isHost: boolean = false;

  public onConnected?: (code: string) => void;
  public onPeerJoined?: () => void;
  public onMessage?: (msg: NetworkMessage) => void;
  public onDisconnected?: () => void;
  public onError?: (err: Error) => void;

  public static generateRoomCode(): string {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Initialize as Host (Player 1)
  public createRoom(requestedCode?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.disconnect();
      this.isHost = true;
      const roomCode = (requestedCode || PeerService.generateRoomCode()).toUpperCase();
      this.roomCode = roomCode;
      const peerId = `${PEER_PREFIX}${roomCode}`;

      try {
        const peer = new Peer(peerId, {
          debug: 1,
          config: {
            iceServers: ICE_SERVERS,
          },
        });
        this.peer = peer;

        let opened = false;

        peer.on('open', (id) => {
          opened = true;
          const cleanCode = id.replace(PEER_PREFIX, '');
          this.roomCode = cleanCode;
          this.onConnected?.(cleanCode);
          resolve(cleanCode);
        });

        peer.on('connection', (conn) => {
          this.connection = conn;
          this.setupConnectionHandlers(conn);

          if (conn.open) {
            this.flushQueue();
            this.onPeerJoined?.();
          } else {
            conn.on('open', () => {
              this.flushQueue();
              this.onPeerJoined?.();
            });
          }
        });

        peer.on('error', (err) => {
          console.error('[PeerJS Host Error]', err);
          if ((err as { type?: string }).type === 'unavailable-id') {
            const nextCode = PeerService.generateRoomCode();
            this.createRoom(nextCode).then(resolve).catch(reject);
            return;
          }
          this.onError?.(err);
          if (!opened) {
            reject(err);
          }
        });

        peer.on('disconnected', () => {
          this.onDisconnected?.();
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  // Initialize as Guest (Player 2)
  public joinRoom(roomCode: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.disconnect();
      this.isHost = false;
      const cleanCode = roomCode.trim().toUpperCase();
      this.roomCode = cleanCode;

      try {
        const guestId = `${PEER_PREFIX}guest-${Math.random().toString(36).substring(2, 9)}`;
        const peer = new Peer(guestId, {
          debug: 1,
          config: {
            iceServers: ICE_SERVERS,
          },
        });
        this.peer = peer;

        let joined = false;

        peer.on('open', () => {
          const targetPeerId = `${PEER_PREFIX}${cleanCode}`;
          const conn = peer.connect(targetPeerId, {
            reliable: true,
          });

          this.connection = conn;
          this.setupConnectionHandlers(conn);

          conn.on('open', () => {
            joined = true;
            this.flushQueue();
            this.onPeerJoined?.();
            resolve();
          });

          setTimeout(() => {
            if (!joined && (!this.connection || !this.connection.open)) {
              reject(new Error('Connection timed out. Host room code might be incorrect or offline.'));
            }
          }, 12000);
        });

        peer.on('error', (err) => {
          console.error('[PeerJS Join Error]', err);
          this.onError?.(err);
          reject(err);
        });

        peer.on('disconnected', () => {
          this.onDisconnected?.();
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  private setupConnectionHandlers(conn: DataConnection) {
    conn.on('data', (data) => {
      try {
        const msg = data as NetworkMessage;
        this.onMessage?.(msg);
      } catch (err) {
        console.error('Failed to parse network message', err);
      }
    });

    conn.on('close', () => {
      this.onDisconnected?.();
    });

    conn.on('error', (err) => {
      this.onError?.(err);
    });
  }

  private flushQueue() {
    if (this.connection && this.connection.open && this.pendingQueue.length > 0) {
      while (this.pendingQueue.length > 0) {
        const msg = this.pendingQueue.shift();
        if (msg) {
          try {
            this.connection.send(msg);
          } catch (e) {
            console.error('Failed to send queued message', e);
          }
        }
      }
    }
  }

  public sendMessage(msg: NetworkMessage) {
    if (this.connection && this.connection.open) {
      try {
        this.connection.send(msg);
      } catch (e) {
        console.error('Error sending message, queuing:', e);
        this.pendingQueue.push(msg);
      }
    } else {
      // Queue message to be sent as soon as DataChannel finishes opening!
      this.pendingQueue.push(msg);
    }
  }

  public isConnected(): boolean {
    return !!(this.connection && this.connection.open);
  }

  public disconnect() {
    this.pendingQueue = [];
    if (this.connection) {
      try {
        this.connection.close();
      } catch {
        // ignore
      }
      this.connection = null;
    }
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {
        // ignore
      }
      this.peer = null;
    }
  }
}

export const peerService = new PeerService();
