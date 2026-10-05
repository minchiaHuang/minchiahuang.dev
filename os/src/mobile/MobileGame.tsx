import { useState } from 'react';
import DosGame from '../components/DosGame';
import VirtualKeys from './VirtualKeys';
import { LAYOUTS, type GameId, type SendKey } from './keyLayouts';

// A DOS game on a phone: the game and its on-screen keys. The keys stay disabled until DosGame reports the emulator
// running. Opening another app unmounts this, which stops the emulator and its sound (as minimising does on the iMac).
export default function MobileGame({ id }: { id: GameId }) {
  const [send, setSend] = useState<SendKey | null>(null);
  return (
    <div className={`m-game${LAYOUTS[id].dpad ? ' has-dpad' : ''}${LAYOUTS[id].sticks ? ' has-sticks' : ''}`}>
      <div className="m-game-screen">
        {/* setSend(() => fn): a function passed straight to setSend would be called as an updater. */}
        <DosGame id={id} onReady={(fn) => setSend(() => fn)} />
      </div>
      <VirtualKeys game={id} send={send} />
    </div>
  );
}
