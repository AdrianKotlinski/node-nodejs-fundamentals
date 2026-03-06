const parseArgs = () => {
  const argv = process.argv.slice(2);
  const get = (flag) => {
    const idx = argv.indexOf(flag);
    return idx !== -1 ? argv[idx + 1] : undefined;
  };

  return {
    duration: Math.max(1, parseInt(get('--duration') ?? '5000', 10) || 5000),
    interval: Math.max(1, parseInt(get('--interval') ?? '100', 10) || 100),
    length: Math.max(1, parseInt(get('--length') ?? '30', 10) || 30),
    color: get('--color') ?? null,
  };
};

const parseHexColor = (hex) => {
  if (!hex) return null;
  const normalized = hex.startsWith('#') ? hex : `#${hex}`;
  const match = normalized.match(/^#([0-9a-fA-F]{6})$/);
  if (!match) return null;
  const int = parseInt(match[1], 16);
  return {
    r: (int >> 16) & 0xff,
    g: (int >> 8) & 0xff,
    b: int & 0xff,
  };
};

const applyColor = (text, rgb) => {
  if (!rgb) return text;
  return `\x1b[38;2;${rgb.r};${rgb.g};${rgb.b}m${text}\x1b[0m`;
};

const renderBar = (percent, length, rgb) => {
  const filled = Math.round((percent / 100) * length);
  const empty = length - filled;
  const filledStr = applyColor('█'.repeat(filled), rgb);
  const emptyStr = ' '.repeat(empty);
  const paddedPercent = String(Math.floor(percent)).padStart(3, ' ');
  return `\r[${filledStr}${emptyStr}] ${paddedPercent}%`;
};

const progress = () => {
  const { duration, interval, length, color } = parseArgs();
  const rgb = parseHexColor(color);
  const steps = Math.ceil(duration / interval);
  let currentStep = 0;

  const tick = () => {
    currentStep++;
    const percent = Math.min((currentStep / steps) * 100, 100);
    process.stdout.write(renderBar(percent, length, rgb));

    if (percent >= 100) {
      const done = applyColor('Done!', { r: 0, g: 150, b: 0 });
      process.stdout.write(`\n${done}\n`);
      return;
    }

    setTimeout(tick, interval);
  };

  process.stdout.write(renderBar(0, length, rgb));
  setTimeout(tick, interval);
};

progress();
