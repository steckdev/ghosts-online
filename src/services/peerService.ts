import Peer, { type DataConnection } from 'peerjs';
import type { NetworkMessage } from '../types/game';

// Prefix to avoid collisions on free PeerJS public broker
const PEER_PREFIX = 'ghosts-80s-';

export class PeerService {
  private peer: Peer | null = null;
  private connection: DataConnection | null = null;
  public roomCode: string = '';
  public isHost: boolean = false;

  public onConnected?: (code: string) => void;
  public onPeerJoined?: () => void;
  public onMessage?: (msg: NetworkMessage) => void;
  public onDisconnected?: () => void;
  public onError?: (err: Error) => void;

  // Generates 4-character uppercase alphanumeric room code like 'A7K9'
  public static generateRoomCode(): string {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // omit ambiguous 0/O, 1/I
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Initialize as Host (Player 1)
  public createRoom(code?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.disconnect();
      this.isHost = true;
      const roomCode = (code || PeerService.generateRoomCode()).toUpperCase();
      this.roomCode = roomCode;
      const peerId = `${PEER_PREFIX}${roomCode}`;

      try {
        this.peer = new Peer(peerId, {
          debug: 1,
        });

        this.peer.on('open', (id) => {
          const cleanCode = id.replace(PEER_PREFIX, '');
          this.roomCode = cleanCode;
          this.onConnected?.(cleanCode);
          resolve(cleanCode);
        });

        this.peer.on('connection', (conn) => {
          this.connection = conn;
          this.setupConnectionHandlers(conn);
          this.onPeerJoined?.();
        });

        this.peer.on('error', (err) => {
          console.error('[PeerJS Error]', err);
          this.onError?.(err);
          reject(err);
        });

        this.peer.on('disconnected', () => {
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
        // Random guest peer ID
        const guestId = `${PEER_PREFIX}guest-${Math.random().toString(36).substring(2, 8)}`;
        this.peer = new Peer(guestId, {
          debug: 1,
        });

        this.peer.on('open', () => {
          const targetPeerId = `${PEER_PREFIX}${cleanCode}`;
          const conn = this.peer!.connect(targetPeerId, {
            reliable: true,
          });

          this.connection = conn;
          this.setupConnectionHandlers(conn);

          conn.on('open', () => {
            this.onPeerJoined?.();
            resolve();
          });
        });

        this.peer.on('error', (err) => {
          console.error('[PeerJS Join Error]', err);
          this.onError?.(err);
          reject(err);
        });

        this.peer.on('disconnected', () => {
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

  public sendMessage(msg: NetworkMessage) {
    if (this.connection && this.connection.open) {
      this.connection.send(msg);
    } else {
      console.warn('Cannot send message, connection is not open');
    }
  }

  public isConnected(): boolean {
    return !!(this.connection && this.connection.open);
  }

  public disconnect() {
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
