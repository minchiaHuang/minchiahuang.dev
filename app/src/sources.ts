export type SourceType = 'gltfModel' | 'texture' | 'audio';

export interface Source {
  name: string;
  type: SourceType;
  path: string;
}

// Every file the outer scene loads, in the order the BIOS screen lists them.
const sources: Source[] = [
  { name: 'computerSetupModel', type: 'gltfModel', path: 'models/computer.glb' },
  { name: 'computerSetupTexture', type: 'texture', path: 'models/computer.webp' },
  { name: 'environmentModel', type: 'gltfModel', path: 'models/environment.glb' },
  { name: 'environmentTexture', type: 'texture', path: 'models/environment.webp' },
  { name: 'decorModel', type: 'gltfModel', path: 'models/decor.glb' },
  { name: 'decorTexture', type: 'texture', path: 'models/decor.webp' },
  { name: 'shellModel', type: 'gltfModel', path: 'models/shell.glb' },
  { name: 'monitorSmudgeTexture', type: 'texture', path: 'textures/monitor/smudges.png' },
  { name: 'mouseDown', type: 'audio', path: 'audio/mouse/mouse_down.mp3' },
  { name: 'mouseUp', type: 'audio', path: 'audio/mouse/mouse_up.mp3' },
  { name: 'keyboardKeydown1', type: 'audio', path: 'audio/keyboard/key_1.mp3' },
  { name: 'keyboardKeydown2', type: 'audio', path: 'audio/keyboard/key_2.mp3' },
  { name: 'keyboardKeydown3', type: 'audio', path: 'audio/keyboard/key_3.mp3' },
  { name: 'keyboardKeydown4', type: 'audio', path: 'audio/keyboard/key_4.mp3' },
  { name: 'keyboardKeydown5', type: 'audio', path: 'audio/keyboard/key_5.mp3' },
  { name: 'keyboardKeydown6', type: 'audio', path: 'audio/keyboard/key_6.mp3' },
  { name: 'startup', type: 'audio', path: 'audio/startup/startup.mp3' },
  { name: 'office', type: 'audio', path: 'audio/atmosphere/office.mp3' },
  { name: 'ccType', type: 'audio', path: 'audio/cc/type.mp3' },
];

export default sources;
