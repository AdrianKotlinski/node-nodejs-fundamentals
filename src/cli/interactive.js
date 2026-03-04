import readline from 'readline';

const COMMANDS = {
  uptime: () => `Uptime: ${process.uptime().toFixed(2)}s`,
  cwd: () => process.cwd(),
  date: () => new Date().toISOString(),
  exit: null,
};

const handleCommand = (input) => {
  const command = input.trim().toLowerCase();

  if (command === 'exit') {
    shutdown();
    return;
  }

  const handler = COMMANDS[command];

  if (handler) {
    console.log(handler());
  } else {
    console.log('Unknown command');
  }
};

const shutdown = () => {
  console.log('Goodbye!');
  process.exit(0);
};

const WELCOME = `
WELCOME in CLI Interactive Mode!
Available commands:
  uptime  — print process uptime in seconds
  cwd     — print current working directory
  date    — print current date and time
  exit    — exit the program
`;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '> ',
  terminal: process.stdout.isTTY,
});

console.log(WELCOME);
rl.prompt();

rl.on('line', (input) => {
  handleCommand(input);
  if (input.trim().toLowerCase() !== 'exit') {
    rl.prompt();
  }
});

rl.on('close', shutdown);
rl.on('SIGINT', shutdown);
