let ticks = 0;
const timer = setInterval(() => {
  process.stdout.write("tick\n");
  ticks += 1;
  if (ticks === 20) {
    clearInterval(timer);
    process.exit(0);
  }
}, 150);
