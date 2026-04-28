export interface AsciiOptions {
  fontSize: number;
  brightness: number;
  contrast: number;
  colorMode: 'matrix' | 'bw' | 'color' | 'retro';
  density: 'simple' | 'complex' | 'binary' | 'blocks';
  resolution: number; // Downscaling factor (0.1 - 1.0)
}

export const DENSITY_MAPS = {
  simple: " .,:;-=+*#%@",
  // Perceptually smoother sequence with varied glyph geometry for clearer silhouettes.
  complex: " `.-':_,^=;><+!rc*/z?sLTv)J7(|Fi{C}fI31tlu[neoZ5Yxjya]2ESwqkP6h9d4VpOGbUAKXHm8RD#$Bg0MNWQ%&@",
  binary: " 01",
  blocks: " ░▒▓█",
};
