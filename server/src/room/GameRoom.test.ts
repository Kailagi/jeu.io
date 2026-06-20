import assert from 'node:assert';
import { describe, it } from 'node:test';
import { GameRoom } from './GameRoom';
import { WebSocket } from 'ws';

// Mock minimal d'un WebSocket pour éviter d'ouvrir de vraies connexions réseau pendant les tests
class MockWebSocket {
  public sentData: string[] = [];
  public readyState = 1; // WebSocket.OPEN

  public send(data: string): void {
    this.sentData.push(data);
  }
}

describe('GameRoom - Tests Unitaires de la Logique Métier', () => {
  it('Devrait initialiser un joueur avec les propriétés correctes lors du JOIN', () => {
    const room = new GameRoom();
    const mockWs = new MockWebSocket() as unknown as WebSocket;

    room.join('player_123', mockWs, 'PuffPastel');

    // Accès aux propriétés privées pour vérification
    const players = (room as any).players;
    const player = players.get('player_123');

    assert.ok(player, 'Le joueur devrait exister dans la Room');
    assert.strictEqual(player.pseudo, 'PuffPastel');
    assert.strictEqual(player.score, 0);
    assert.strictEqual(player.radius, 25);
    assert.strictEqual(player.x, 500);
    assert.strictEqual(player.y, 500);
  });

  it('Devrait mettre à jour les inputs de souris du joueur via updatePlayerInput', () => {
    const room = new GameRoom();
    const mockWs = new MockWebSocket() as unknown as WebSocket;

    room.join('player_123', mockWs, 'PuffPastel');
    room.updatePlayerInput('player_123', { mouseX: 550, mouseY: 600, score: 30 });

    const player = (room as any).players.get('player_123');
    assert.strictEqual(player.mouseX, 550);
    assert.strictEqual(player.mouseY, 600);
    assert.strictEqual(player.score, 30);
  });

  it('Devrait ajouter un nuage de poussière sous l’arbitrage du serveur', () => {
    const room = new GameRoom();
    const mockWs = new MockWebSocket() as unknown as WebSocket;

    room.join('player_123', mockWs, 'PuffPastel');
    room.addCloud('player_123', 500, 500, 25);

    const clouds = (room as any).clouds;
    assert.strictEqual(clouds.length, 1);
    assert.strictEqual(clouds[0].ownerId, 'player_123');
    assert.strictEqual(clouds[0].x, 500);
    assert.strictEqual(clouds[0].y, 500);
    assert.strictEqual(clouds[0].maxRadius, 155); // 25 + 130
  });

  it('Devrait supprimer les entités d’un joueur lorsqu’il quitte la Room (LEAVE)', () => {
    const room = new GameRoom();
    const mockWs = new MockWebSocket() as unknown as WebSocket;

    room.join('player_123', mockWs, 'PuffPastel');
    room.addCloud('player_123', 500, 500, 25);

    // Départ du joueur
    room.leave('player_123');

    const players = (room as any).players;
    const clouds = (room as any).clouds;

    assert.strictEqual(players.has('player_123'), false, 'Le joueur doit être retiré');
    assert.strictEqual(clouds.length, 0, 'Les nuages du joueur doivent être nettoyés');
  });
});
