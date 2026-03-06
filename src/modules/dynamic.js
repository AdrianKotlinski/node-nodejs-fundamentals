import { fileURLToPath } from 'url';
import { join } from 'path';

const PARENT_PATH = fileURLToPath(new URL('.', import.meta.url));
const PLUGINS_DIR = join(PARENT_PATH, 'plugins');

const parsePluginName = () => process.argv[2] ?? null;

const dynamic = async () => {
  const pluginName = parsePluginName();

  if (!pluginName) {
    console.error('Plugin not found');
    process.exit(1);
  }

  const pluginPath = join(PLUGINS_DIR, `${pluginName}.js`);

  try {
    const plugin = await import(pluginPath);
    const result = plugin.run();
    console.log(result);
  } catch {
    console.error('Plugin not found');
    process.exit(1);
  }
};

await dynamic();
